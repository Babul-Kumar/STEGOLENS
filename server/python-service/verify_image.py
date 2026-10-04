#!/usr/bin/env python3
"""
StegoLens Image Verification & Decompression Bomb Guard.
Phase D: Validates dimensions, decompression limits, and decoding integrity.
"""
import sys
import json
from PIL import Image

def verify_image(image_path):
    try:
        # Prevent decompression bombs: max 50 million pixels
        Image.MAX_IMAGE_PIXELS = 50000000

        with Image.open(image_path) as img:
            width, height = img.size
            if width > 8192 or height > 8192:
                return {
                    "valid": False,
                    "code": "IMAGE_TOO_LARGE",
                    "message": f"Image dimensions ({width}x{height}) exceed maximum allowed 8192x8192 pixels."
                }
            if (width * height) > 50000000:
                return {
                    "valid": False,
                    "code": "IMAGE_TOO_LARGE",
                    "message": "Image exceeds the 50 megapixel decompression limit."
                }
            # Structural header check
            img.verify()

        # Full pixel decode test to catch corrupted or malformed bitstreams
        with Image.open(image_path) as img:
            img.load()
            return {
                "valid": True,
                "format": img.format,
                "width": width,
                "height": height
            }
    except Image.DecompressionBombError:
        return {
            "valid": False,
            "code": "IMAGE_TOO_LARGE",
            "message": "Image exceeds decompression bomb safety threshold."
        }
    except Exception:
        # Requirement 4: "Invalid or corrupted image." Do not expose internal decoder errors.
        return {
            "valid": False,
            "code": "INVALID_IMAGE",
            "message": "Invalid or corrupted image."
        }

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({"valid": False, "code": "INVALID_REQUEST", "message": "Missing file path."}))
        sys.exit(1)
    
    result = verify_image(sys.argv[1])
    print(json.dumps(result))
