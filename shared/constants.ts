// StegoLens Centralized Constants & Forensic Thresholds

export const SUSPICION_LEVELS = {
  LOW: 'LOW',
  MODERATE: 'MODERATE',
  HIGH: 'HIGH',
  VERY_HIGH: 'VERY_HIGH',
} as const;

export type SuspicionLevel = typeof SUSPICION_LEVELS[keyof typeof SUSPICION_LEVELS];

export const SUSPICION_THRESHOLDS = {
  LOW_MAX: 24,
  MODERATE_MAX: 49,
  HIGH_MAX: 74,
} as const;

export function calculateSuspicionLevel(score: number): SuspicionLevel {
  if (score <= SUSPICION_THRESHOLDS.LOW_MAX) return SUSPICION_LEVELS.LOW;
  if (score <= SUSPICION_THRESHOLDS.MODERATE_MAX) return SUSPICION_LEVELS.MODERATE;
  if (score <= SUSPICION_THRESHOLDS.HIGH_MAX) return SUSPICION_LEVELS.HIGH;
  return SUSPICION_LEVELS.VERY_HIGH;
}

export const ML_STATUS = {
  NOT_CONNECTED: 'not_connected',
  LOADING: 'loading',
  READY: 'ready',
  ERROR: 'error',
} as const;

export type MLStatus = typeof ML_STATUS[keyof typeof ML_STATUS];

export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE_BYTES: 15 * 1024 * 1024, // 15 MB
  MAX_PIXEL_DIMENSION: 8192, // 8K max width or height to prevent decompression bombs
  MAX_TOTAL_PIXELS: 50_000_000,
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/bmp',
    'image/tiff',
  ],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff', '.tif'],
} as const;

export const MAGIC_BYTES = {
  JPEG: [0xFF, 0xD8, 0xFF],
  PNG: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
  GIF: [0x47, 0x49, 0x46],
  BMP: [0x42, 0x4D],
  TIFF_LE: [0x49, 0x49, 0x2A, 0x00],
  TIFF_BE: [0x4D, 0x4D, 0x00, 0x2A],
  WEBP_RIFF: [0x52, 0x49, 0x46, 0x46], // then WEBP at offset 8
} as const;

export const FORENSIC_WEIGHTS = {
  PAYLOAD_SIGNATURE_FOUND: 40,
  UNEXPECTED_TRAILING_BYTES: 25,
  LSB_CHI_SQUARE_ANOMALY: 20,
  LSB_SIGNIFICANT_IMBALANCE: 15,
  KNOWN_STEGO_SOFTWARE_METADATA: 20,
  SUSPICIOUS_METADATA_ANOMALY: 10,
  HIGH_ENTROPY_ANOMALY: 15,
  CONTAINER_STRUCTURE_ANOMALY: 15,
} as const;

