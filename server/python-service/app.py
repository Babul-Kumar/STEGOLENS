#!/usr/bin/env python3

import sys
import json
import hashlib
import base64
from PIL import Image, ExifTags
import numpy as np
import cv2
import exifread
import os
from io import BytesIO

def extract_lsb_data(image_path, num_bits=8000):
    """Extract LSB data from image."""
    try:
        img = Image.open(image_path)
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        img_array = np.array(img)
        height, width, channels = img_array.shape
        
        # Extract LSBs from each channel
        lsb_data = []
        bit_count = 0
        
        for y in range(height):
            for x in range(width):
                for c in range(channels):
                    if bit_count >= num_bits:
                        break
                    lsb_data.append(img_array[y, x, c] & 1)
                    bit_count += 1
                if bit_count >= num_bits:
                    break
            if bit_count >= num_bits:
                break
        
        # Convert bits to bytes and try to decode as text
        byte_data = []
        for i in range(0, len(lsb_data), 8):
            if i + 7 < len(lsb_data):
                byte_val = 0
                for j in range(8):
                    byte_val |= (lsb_data[i + j] << j)
                byte_data.append(byte_val)
        
        # Try to decode first 1000 characters
        try:
            decoded_text = bytes(byte_data[:1000]).decode('utf-8', errors='ignore')
            # Check if decoded text contains readable content
            printable_ratio = sum(1 for c in decoded_text if c.isprintable()) / len(decoded_text)
        except:
            decoded_text = ""
            printable_ratio = 0
        
        # Calculate entropy to detect hidden data
        if byte_data:
            entropy = calculate_entropy(byte_data[:1000])
        else:
            entropy = 0
        
        # Detect anomalies in bit distribution
        bit_distribution = analyze_bit_distribution(lsb_data)
        
        return {
            'hidden_data_found': printable_ratio > 0.1 or entropy > 7.0,
            'entropy_score': round(entropy, 2),
            'pattern_anomalies': len([x for x in bit_distribution if abs(x - 0.5) > 0.1]),
            'decoded_preview': decoded_text[:200] if decoded_text else None,
            'printable_ratio': round(printable_ratio, 3)
        }
    except Exception as e:
        return {'error': str(e)}

def calculate_entropy(data):
    """Calculate Shannon entropy of data."""
    if not data:
        return 0
    
    # Count frequency of each byte value
    freq = {}
    for byte_val in data:
        freq[byte_val] = freq.get(byte_val, 0) + 1
    
    # Calculate entropy
    entropy = 0
    data_len = len(data)
    for count in freq.values():
        p = count / data_len
        if p > 0:
            entropy -= p * np.log2(p)
    
    return entropy

def analyze_bit_distribution(bits):
    """Analyze distribution of bits in chunks."""
    chunk_size = 100
    distributions = []
    
    for i in range(0, len(bits), chunk_size):
        chunk = bits[i:i+chunk_size]
        if len(chunk) >= chunk_size:
            ones = sum(chunk)
            ratio = ones / len(chunk)
            distributions.append(ratio)
    
    return distributions

def extract_metadata(image_path):
    """Extract comprehensive metadata from image."""
    metadata = {}
    
    try:
        # EXIF data using exifread
        with open(image_path, 'rb') as f:
            tags = exifread.process_file(f)
            for tag in tags.keys():
                if tag not in ('JPEGThumbnail', 'TIFFThumbnail', 'Filename', 'EXIF MakerNote'):
                    metadata[tag] = str(tags[tag])
        
        # Additional metadata using PIL
        img = Image.open(image_path)
        if hasattr(img, '_getexif') and img._getexif():
            exif = img._getexif()
            for tag_id, value in exif.items():
                tag = ExifTags.TAGS.get(tag_id, tag_id)
                metadata[f'PIL_{tag}'] = str(value)
        
        # File metadata
        stat = os.stat(image_path)
        metadata['file_size'] = stat.st_size
        metadata['modification_time'] = stat.st_mtime
        
    except Exception as e:
        metadata['extraction_error'] = str(e)
    
    return metadata

def generate_heatmap(image_path):
    """Generate heatmap showing suspicious regions."""
    try:
        img = cv2.imread(image_path)
        if img is None:
            return None
        
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Calculate local entropy to find suspicious regions
        height, width = gray.shape
        heatmap = np.zeros((height, width), dtype=np.uint8)
        
        window_size = 8
        for y in range(0, height - window_size, window_size):
            for x in range(0, width - window_size, window_size):
                window = gray[y:y+window_size, x:x+window_size]
                entropy = calculate_entropy(window.flatten())
                # Normalize entropy to 0-255 range
                heat_value = min(255, int(entropy * 32))
                heatmap[y:y+window_size, x:x+window_size] = heat_value
        
        # Apply colormap
        heatmap_colored = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
        
        # Save heatmap
        heatmap_path = image_path.replace('.', '_heatmap.')
        cv2.imwrite(heatmap_path, heatmap_colored)
        
        return heatmap_path
    except Exception as e:
        return None

def analyze_image(image_path):
    """Main analysis function."""
    try:
        # Perform LSB analysis
        lsb_analysis = extract_lsb_data(image_path)
        
        # Extract metadata
        metadata = extract_metadata(image_path)
        
        # Generate heatmap
        heatmap_url = generate_heatmap(image_path)
        
        # Determine if threat is detected
        threat_detected = False
        if 'hidden_data_found' in lsb_analysis:
            threat_detected = bool(lsb_analysis['hidden_data_found'])
        
        # Check for suspicious metadata
        suspicious_metadata = check_suspicious_metadata(metadata)
        if suspicious_metadata:
            threat_detected = True
        
        return {
            'threatDetected': threat_detected,
            'lsbAnalysis': lsb_analysis,
            'metadata': metadata,
            'heatmapUrl': heatmap_url,
            'suspiciousMetadata': suspicious_metadata
        }
    except Exception as e:
        return {
            'error': str(e),
            'threatDetected': False,
            'lsbAnalysis': {},
            'metadata': {},
            'heatmapUrl': None
        }

def check_suspicious_metadata(metadata):
    """Check for suspicious patterns in metadata."""
    suspicious_indicators = []
    
    # Check for known steganography software signatures
    stego_software = ['steghide', 'outguess', 'jsteg', 'f5', 'photoshop']
    for key, value in metadata.items():
        value_lower = str(value).lower()
        for software in stego_software:
            if software in value_lower:
                suspicious_indicators.append(f'Potential steganography software: {software}')
    
    # Check for unusual modification patterns
    if 'DateTime' in metadata and 'DateTimeOriginal' in metadata:
        # This would require more sophisticated datetime parsing
        pass
    
    return suspicious_indicators

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(json.dumps({'error': 'Usage: python app.py <image_path>'}))
        sys.exit(1)
    
    image_path = sys.argv[1]
    
    if not os.path.exists(image_path):
        print(json.dumps({'error': 'Image file not found'}))
        sys.exit(1)
    
    result = analyze_image(image_path)
    print(json.dumps(result))
