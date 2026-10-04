import path from "path";
import fs from "fs/promises";
import { spawn } from "child_process";
import { UPLOAD_LIMITS, MAGIC_BYTES } from "@shared/constants";

export interface ValidationSuccess {
  valid: true;
  format: 'JPEG' | 'PNG' | 'WEBP' | 'BMP' | 'TIFF';
  mimeType: string;
  width: number;
  height: number;
}

export interface ValidationFailure {
  valid: false;
  code: 
    | 'FILE_TOO_LARGE'
    | 'UNSUPPORTED_FORMAT'
    | 'INVALID_SIGNATURE'
    | 'INVALID_IMAGE'
    | 'IMAGE_TOO_LARGE'
    | 'INVALID_REQUEST';
  message: string;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

/**
 * Sanitizes original filename for metadata storage only.
 * Strips path traversal sequences (../, ..\, /etc/, C:\) and control characters.
 * The filename is NEVER used to construct a disk path.
 */
export function sanitizeOriginalFilename(rawName?: string): string {
  if (!rawName || typeof rawName !== 'string') {
    return 'unnamed_image';
  }
  // Strip control characters and null bytes
  let clean = rawName.replace(/[\x00-\x1f\x7f]/g, '');
  // Normalize Windows/POSIX separators and extract purely the base name
  clean = path.basename(clean.replace(/\\/g, '/'));
  // Remove non-alphanumeric chars except dots, underscores, dashes
  clean = clean.replace(/[^a-zA-Z0-9._-]/g, '_');
  // Avoid empty or all-dot names
  if (!clean || clean.replace(/\./g, '').length === 0) {
    clean = 'unnamed_image';
  }
  return clean.slice(0, 255);
}

/**
 * Validates file size against centralized constant (15 MB).
 */
export function validateFileSize(sizeInBytes: number): { valid: boolean; code?: ValidationFailure['code']; message?: string } {
  if (typeof sizeInBytes !== 'number' || sizeInBytes <= 0) {
    return {
      valid: false,
      code: 'INVALID_REQUEST',
      message: 'Uploaded file is empty or corrupted.',
    };
  }

  if (sizeInBytes > UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      code: 'FILE_TOO_LARGE',
      message: 'File exceeds the 15 MB upload limit.',
    };
  }

  return { valid: true };
}

/**
 * Validates actual magic bytes against centralized MAGIC_BYTES definition.
 */
export function validateMagicBytes(buffer: Buffer): { 
  valid: boolean; 
  format?: 'JPEG' | 'PNG' | 'WEBP' | 'BMP' | 'TIFF'; 
  mimeType?: string; 
  code?: ValidationFailure['code']; 
  message?: string;
} {
  if (!buffer || buffer.length < 12) {
    return {
      valid: false,
      code: 'INVALID_SIGNATURE',
      message: 'File is too small to contain a valid image header.',
    };
  }

  // 1. JPEG: 0xFF, 0xD8, 0xFF
  if (
    buffer[0] === MAGIC_BYTES.JPEG[0] &&
    buffer[1] === MAGIC_BYTES.JPEG[1] &&
    buffer[2] === MAGIC_BYTES.JPEG[2]
  ) {
    return { valid: true, format: 'JPEG', mimeType: 'image/jpeg' };
  }

  // 2. PNG: 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
  const pngSig = MAGIC_BYTES.PNG;
  if (pngSig.every((byte, idx) => buffer[idx] === byte)) {
    return { valid: true, format: 'PNG', mimeType: 'image/png' };
  }

  // 3. WEBP: 'RIFF' at 0..3 and 'WEBP' at 8..11
  const isRiff = MAGIC_BYTES.WEBP_RIFF.every((byte, idx) => buffer[idx] === byte);
  const isWebp =
    buffer[8] === 0x57 && // 'W'
    buffer[9] === 0x45 && // 'E'
    buffer[10] === 0x42 && // 'B'
    buffer[11] === 0x50; // 'P'
  if (isRiff && isWebp) {
    return { valid: true, format: 'WEBP', mimeType: 'image/webp' };
  }

  // 4. BMP: 'BM' (0x42, 0x4D)
  if (buffer[0] === MAGIC_BYTES.BMP[0] && buffer[1] === MAGIC_BYTES.BMP[1]) {
    return { valid: true, format: 'BMP', mimeType: 'image/bmp' };
  }

  // 5. TIFF: Little Endian (II*\0) or Big Endian (MM\0*)
  const isTiffLE = MAGIC_BYTES.TIFF_LE.every((b, idx) => buffer[idx] === b);
  const isTiffBE = MAGIC_BYTES.TIFF_BE.every((b, idx) => buffer[idx] === b);
  if (isTiffLE || isTiffBE) {
    return { valid: true, format: 'TIFF', mimeType: 'image/tiff' };
  }

  // Check common unsupported formats for specific messages
  if (buffer[0] === MAGIC_BYTES.GIF[0] && buffer[1] === MAGIC_BYTES.GIF[1] && buffer[2] === MAGIC_BYTES.GIF[2]) {
    return {
      valid: false,
      code: 'UNSUPPORTED_FORMAT',
      message: 'Supported formats: JPEG, PNG, WEBP, BMP, TIFF.',
    };
  }

  // Check ZIP archive signature (PK\x03\x04)
  if (buffer[0] === 0x50 && buffer[1] === 0x4B) {
    return {
      valid: false,
      code: 'UNSUPPORTED_FORMAT',
      message: 'Supported formats: JPEG, PNG, WEBP, BMP, TIFF.',
    };
  }

  return {
    valid: false,
    code: 'INVALID_SIGNATURE',
    message: 'File signature does not match any supported image format.',
  };
}

/**
 * Validates consistency between filename extension, client-supplied MIME, and detected format.
 */
export function validateMimeAndExtension(
  filename: string,
  suppliedMime: string | undefined,
  detectedFormat: 'JPEG' | 'PNG' | 'WEBP' | 'BMP' | 'TIFF'
): { valid: boolean; code?: ValidationFailure['code']; message?: string } {
  const ext = path.extname(filename).toLowerCase();
  
  const formatExtensions: Record<string, string[]> = {
    JPEG: ['.jpg', '.jpeg'],
    PNG: ['.png'],
    WEBP: ['.webp'],
    BMP: ['.bmp'],
    TIFF: ['.tiff', '.tif'],
  };

  const allowedForFormat = formatExtensions[detectedFormat] || [];
  if (!allowedForFormat.includes(ext)) {
    return {
      valid: false,
      code: 'UNSUPPORTED_FORMAT',
      message: `File extension '${ext}' does not match the detected ${detectedFormat} format. Supported formats: JPEG, PNG, WEBP, BMP, TIFF.`,
    };
  }

  // Validate supplied MIME if client provided one
  if (suppliedMime && suppliedMime !== 'application/octet-stream') {
    const validMimesForFormat: Record<string, string[]> = {
      JPEG: ['image/jpeg', 'image/jpg', 'image/pjpeg'],
      PNG: ['image/png'],
      WEBP: ['image/webp'],
      BMP: ['image/bmp', 'image/x-ms-bmp'],
      TIFF: ['image/tiff', 'image/x-tiff'],
    };

    const allowedMimes = validMimesForFormat[detectedFormat] || [];
    if (!allowedMimes.includes(suppliedMime.toLowerCase())) {
      return {
        valid: false,
        code: 'UNSUPPORTED_FORMAT',
        message: 'Supplied MIME type is inconsistent with actual image content.',
      };
    }
  }

  return { valid: true };
}

/**
 * Decodes the image via Python Pillow to verify:
 * - Structural integrity and pixel decoding (detects corrupted images)
 * - Dimension bounds (max 8192px width and height)
 * - Decompression bomb protection (max 50,000,000 pixels)
 */
export async function validateImageDimensionsAndIntegrity(
  filePath: string
): Promise<{
  valid: boolean;
  width?: number;
  height?: number;
  format?: string;
  code?: ValidationFailure['code'];
  message?: string;
}> {
  return new Promise((resolve) => {
    const pythonScript = path.join(process.cwd(), 'server', 'python-service', 'verify_image.py');
    const pythonBin = process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3');

    const proc = spawn(pythonBin, [pythonScript, filePath]);

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.on('error', (err) => {
      console.error('Python verification process error:', err.message);
      resolve({
        valid: false,
        code: 'INVALID_IMAGE',
        message: 'Invalid or corrupted image.',
      });
    });

    proc.on('close', (code) => {
      try {
        const parsed = JSON.parse(stdout.trim());
        if (parsed.valid) {
          resolve({
            valid: true,
            width: parsed.width,
            height: parsed.height,
            format: parsed.format,
          });
        } else {
          resolve({
            valid: false,
            code: parsed.code || 'INVALID_IMAGE',
            message: parsed.message || 'Invalid or corrupted image.',
          });
        }
      } catch (err) {
        // Fallback: do not expose internal error traces
        resolve({
          valid: false,
          code: 'INVALID_IMAGE',
          message: 'Invalid or corrupted image.',
        });
      }
    });
  });
}

/**
 * Full security validation pipeline for an uploaded file.
 */
export async function validateUploadedFile(
  filePath: string,
  originalFilename: string,
  fileSize: number,
  suppliedMime?: string
): Promise<ValidationResult> {
  // 1. Validate file size
  const sizeCheck = validateFileSize(fileSize);
  if (!sizeCheck.valid) {
    return { valid: false, code: sizeCheck.code!, message: sizeCheck.message! };
  }

  // 2. Read first 4KB to validate magic bytes without loading entire file
  let headerBuffer: Buffer;
  try {
    const handle = await fs.open(filePath, 'r');
    headerBuffer = Buffer.alloc(4096);
    const { bytesRead } = await handle.read(headerBuffer, 0, 4096, 0);
    await handle.close();
    headerBuffer = headerBuffer.subarray(0, bytesRead);
  } catch {
    return { valid: false, code: 'INVALID_REQUEST', message: 'Unable to read uploaded file.' };
  }

  // 3. Validate magic bytes
  const magicCheck = validateMagicBytes(headerBuffer);
  if (!magicCheck.valid) {
    return { valid: false, code: magicCheck.code!, message: magicCheck.message! };
  }

  const detectedFormat = magicCheck.format!;
  const detectedMime = magicCheck.mimeType!;

  // 4. Validate extension and MIME consistency
  const mimeCheck = validateMimeAndExtension(originalFilename, suppliedMime, detectedFormat);
  if (!mimeCheck.valid) {
    return { valid: false, code: mimeCheck.code!, message: mimeCheck.message! };
  }

  // 5. Decode image and verify dimensions & decompression-bomb safety
  const decodeCheck = await validateImageDimensionsAndIntegrity(filePath);
  if (!decodeCheck.valid) {
    return { valid: false, code: decodeCheck.code!, message: decodeCheck.message! };
  }

  return {
    valid: true,
    format: detectedFormat,
    mimeType: detectedMime,
    width: decodeCheck.width!,
    height: decodeCheck.height!,
  };
}
