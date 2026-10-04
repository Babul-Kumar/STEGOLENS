#!/usr/bin/env python3
"""
StegoLens Forensic Extraction Engine (Phase E)
Extracts deterministic image statistics, RGB channel distributions,
histograms, LSB metrics, chi-square PoV tests, bit-planes, and EXIF metadata.
No ML inference or trained weights are used.
"""

import sys
import json
import math
import base64
import io
import os
import numpy as np
from PIL import Image, ExifTags

def calc_entropy(data_1d):
    """Calculate Shannon entropy of pixel intensities: H(X) = -sum p(x) * log2(p(x))."""
    if data_1d.size == 0:
        return 0.0
    counts = np.bincount(data_1d.ravel(), minlength=256)
    p = counts[counts > 0] / data_1d.size
    return float(round(-np.sum(p * np.log2(p)), 4))

def calc_bit_entropy(ones_ratio):
    """Calculate Shannon entropy of binary bit sequence."""
    if ones_ratio <= 0.0 or ones_ratio >= 1.0:
        return 0.0
    p0 = 1.0 - ones_ratio
    p1 = ones_ratio
    return float(round(-(p0 * math.log2(p0) + p1 * math.log2(p1)), 4))

def pov_chi_square(channel_1d):
    """
    Pairs-of-Values (PoV) Chi-Square Test (Westfeld & Pfitzmann).
    Evaluates symmetry between adjacent even/odd values (2k, 2k+1) in pixel histograms.
    Returns: (chi_square_stat, p_value)
    """
    counts = np.bincount(channel_1d.ravel(), minlength=256)
    c2k = counts[0::2]
    c2k1 = counts[1::2]
    total_pairs = c2k + c2k1
    valid = total_pairs > 0
    if not np.any(valid):
        return 0.0, 1.0

    diffs = (c2k[valid].astype(float) - c2k1[valid].astype(float))
    chi2_stat = float(np.sum((diffs ** 2) / (2.0 * total_pairs[valid])))
    k = float(np.sum(valid)) # degrees of freedom

    if k > 0 and chi2_stat > 0:
        # Wilson-Hilferty transformation approximation for chi-square survival function
        z = ((chi2_stat / k) ** (1.0 / 3.0) - (1.0 - 2.0 / (9.0 * k))) / math.sqrt(2.0 / (9.0 * k))
        p_val = float(0.5 * math.erfc(z / math.sqrt(2.0)))
    else:
        p_val = 1.0

    return float(round(chi2_stat, 2)), float(round(p_val, 4))

def generate_plane_thumbnail(plane_binary_2d):
    """Generate compact base64 PNG data URL thumbnail of a binary bit-plane."""
    try:
        scaled = (plane_binary_2d * 255).astype(np.uint8)
        img = Image.fromarray(scaled, mode='L')
        img.thumbnail((160, 160), Image.Resampling.NEAREST)
        buf = io.BytesIO()
        img.save(buf, format='PNG', optimize=True)
        return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode('ascii')
    except Exception:
        return None

def extract_exif_metadata(image_path, img):
    """Extract real EXIF metadata from image file without third-party dependencies."""
    metadata = {}
    try:
        exif_raw = img.getexif()
        if exif_raw:
            for tag_id, value in exif_raw.items():
                tag_name = ExifTags.TAGS.get(tag_id, str(tag_id))
                # Only serialize readable standard types
                if isinstance(value, (str, int, float, bool)):
                    metadata[tag_name] = value
                elif isinstance(value, bytes):
                    try:
                        metadata[tag_name] = value.decode('utf-8', errors='ignore')[:100]
                    except:
                        metadata[tag_name] = f"<binary {len(value)} bytes>"

        # Standard properties
        metadata['Format'] = img.format or 'Unknown'
        metadata['ColorMode'] = img.mode
        metadata['Width'] = img.width
        metadata['Height'] = img.height
        if hasattr(img, 'info'):
            for k in ['dpi', 'software', 'comment', 'description', 'copyright']:
                if k in img.info and k not in metadata:
                    v = img.info[k]
                    if isinstance(v, (str, int, float, bool)):
                        metadata[k.capitalize()] = v
    except Exception as e:
        metadata['ExtractionNote'] = 'Limited metadata available'

    return metadata

def analyze_forensics(image_path):
    # Enforce decompression bomb safety
    Image.MAX_IMAGE_PIXELS = 50000000

    with Image.open(image_path) as img:
        img_format = img.format or 'UNKNOWN'
        raw_width, raw_height = img.size
        orig_mode = img.mode

        metadata = extract_exif_metadata(image_path, img)

        # Convert to RGB or L (grayscale)
        is_grayscale = orig_mode in ('L', '1')
        if is_grayscale:
            proc_img = img.convert('L')
            arr = np.array(proc_img)
            channels_count = 1
            r = g = b = arr
        else:
            proc_img = img.convert('RGB')
            arr = np.array(proc_img)
            channels_count = 3
            r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]

    # 1. Pixel Statistics (Overall & Per Channel)
    overall_entropy = calc_entropy(arr)
    overall_mean = float(round(np.mean(arr), 2))
    overall_var = float(round(np.var(arr), 2))
    overall_std = float(round(np.std(arr), 2))

    def make_channel_stats(ch):
        return {
            'mean': float(round(np.mean(ch), 2)),
            'variance': float(round(np.var(ch), 2)),
            'standardDeviation': float(round(np.std(ch), 2)),
            'min': int(np.min(ch)),
            'max': int(np.max(ch)),
            'uniqueValuesCount': int(len(np.unique(ch))),
        }

    channels_data = {
        'red': make_channel_stats(r),
        'green': make_channel_stats(g),
        'blue': make_channel_stats(b),
    }

    # 2. Histograms (256 bins for Red, Green, Blue, Grayscale)
    hist_r = np.bincount(r.ravel(), minlength=256)
    hist_g = np.bincount(g.ravel(), minlength=256)
    hist_b = np.bincount(b.ravel(), minlength=256)
    hist_gray = np.bincount(arr.ravel(), minlength=256)

    histogram_bins = []
    for i in range(256):
        histogram_bins.append({
            'intensity': i,
            'red': int(hist_r[i]),
            'green': int(hist_g[i]),
            'blue': int(hist_b[i]),
            'grayscale': int(hist_gray[i]),
        })

    # 3. LSB Analysis (Per Channel & Overall)
    def analyze_channel_lsb(ch_name, ch_data):
        lsb = ch_data & 1
        ones = int(np.sum(lsb))
        total = lsb.size
        ones_ratio = float(round(ones / total, 4))
        entropy = calc_bit_entropy(ones_ratio)
        chi_stat, p_val = pov_chi_square(ch_data)

        # Statistical indicator score:
        # Near 50/50 balance alone is NOT suspicious, but combination of high p-value in Chi-Square
        # and high bit entropy indicates potential pseudorandom LSB substitution
        imbalance = abs(ones_ratio - 0.5)
        indicator = 0
        if imbalance > 0.15:
            indicator += 20
        if p_val < 0.01:
            # Significant deviation from expected PoV distribution
            indicator += 30

        return {
            'channel': ch_name,
            'onesRatio': ones_ratio,
            'entropy': entropy,
            'status': 'suspicious' if indicator >= 35 else 'normal',
            'chiSquarePValue': p_val,
            'indicatorScore': min(100, indicator),
        }

    lsb_r = analyze_channel_lsb('red', r)
    lsb_g = analyze_channel_lsb('green', g)
    lsb_b = analyze_channel_lsb('blue', b)

    # Overall LSB bitstream sampling & printable test
    r_lsb = (r & 1).ravel()
    g_lsb = (g & 1).ravel()
    b_lsb = (b & 1).ravel()

    # Interleave sample of bits
    sample_len = min(16000, r_lsb.size)
    interleaved_sample = np.empty(sample_len * 3, dtype=np.uint8)
    interleaved_sample[0::3] = r_lsb[:sample_len]
    interleaved_sample[1::3] = g_lsb[:sample_len]
    interleaved_sample[2::3] = b_lsb[:sample_len]

    byte_len = len(interleaved_sample) // 8
    printable_ratio = 0.0
    decoded_preview = None

    if byte_len > 0:
        packed_bytes = np.packbits(interleaved_sample[:byte_len * 8])
        printable_count = sum(1 for b_val in packed_bytes if 32 <= b_val <= 126 or b_val in (9, 10, 13))
        printable_ratio = float(round(printable_count / byte_len, 3))
        if printable_ratio > 0.40:
            preview_chars = [chr(b_val) if (32 <= b_val <= 126) else '.' for b_val in packed_bytes[:80]]
            decoded_preview = "".join(preview_chars)

    lsb_overall_suspicion = max(lsb_r['indicatorScore'], lsb_g['indicatorScore'], lsb_b['indicatorScore'])
    if printable_ratio > 0.65:
        lsb_overall_suspicion = min(100, lsb_overall_suspicion + 40)

    overall_lsb = {
        'status': 'suspicious' if lsb_overall_suspicion >= 40 else 'normal',
        'suspicionScore': lsb_overall_suspicion,
        'potentialPayloadDetected': printable_ratio > 0.65,
        'printableRatio': printable_ratio,
        'decodedPreview': decoded_preview,
        'patternAnomaliesCount': 1 if (abs(lsb_r['onesRatio'] - 0.5) > 0.15) else 0,
    }

    # 4. Bit-Plane Decomposition (Planes 0 to 7)
    bit_planes = {}
    gray_2d = r if is_grayscale else (0.299 * r + 0.587 * g + 0.114 * b).astype(np.uint8)

    # Generate Plane 0 (LSB) and Plane 7 (MSB) thumbnails
    p0 = (gray_2d & 1).astype(np.uint8)
    p7 = ((gray_2d >> 7) & 1).astype(np.uint8)
    t0 = generate_plane_thumbnail(p0)
    t7 = generate_plane_thumbnail(p7)
    if t0:
        bit_planes['plane_0_lsb'] = t0
    if t7:
        bit_planes['plane_7_msb'] = t7

    return {
        'file': {
            'format': img_format,
            'width': raw_width,
            'height': raw_height,
            'channels': channels_count,
        },
        'metadata': metadata,
        'statistics': {
            'entropy': overall_entropy,
            'mean': overall_mean,
            'variance': overall_var,
            'standardDeviation': overall_std,
        },
        'channels': channels_data,
        'histogram': histogram_bins,
        'lsb': {
            'red': lsb_r,
            'green': lsb_g,
            'blue': lsb_b,
            'overall': overall_lsb,
        },
        'visualizations': {
            'bitPlanes': bit_planes,
        },
    }

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Missing file path'}))
        sys.exit(1)

    try:
        result = analyze_forensics(sys.argv[1])
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)
