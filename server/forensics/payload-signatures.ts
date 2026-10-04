import type { PayloadDetectionResult, PayloadDetectionFinding } from "@shared/schema";

interface KnownSignature {
  type: string;
  pattern: number[];
  description: string;
  severity: 'low' | 'medium' | 'high';
}

const KNOWN_SIGNATURES: KnownSignature[] = [
  {
    type: "ZIP",
    pattern: [0x50, 0x4B, 0x03, 0x04],
    description: "ZIP archive local file header detected",
    severity: "high",
  },
  {
    type: "GZIP",
    pattern: [0x1F, 0x8B],
    description: "GZIP compressed data stream detected",
    severity: "high",
  },
  {
    type: "PDF",
    pattern: [0x25, 0x50, 0x44, 0x46], // %PDF
    description: "PDF document header detected",
    severity: "high",
  },
  {
    type: "RAR",
    pattern: [0x52, 0x61, 0x72, 0x21], // Rar!
    description: "RAR archive header detected",
    severity: "high",
  },
  {
    type: "7Z",
    pattern: [0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C],
    description: "7-Zip compressed archive header detected",
    severity: "high",
  },
  {
    type: "EXECUTABLE_MZ",
    pattern: [0x4D, 0x5A], // MZ
    description: "DOS/PE executable binary signature detected",
    severity: "high",
  },
  {
    type: "ELF",
    pattern: [0x7F, 0x45, 0x4C, 0x46], // \x7FELF
    description: "ELF executable binary header detected",
    severity: "high",
  },
];

/**
 * Scans a buffer for recognizable embedded file signatures.
 * Differentiates signatures found in trailing data vs inside the image stream.
 * Uses conservative forensic language (does not claim malware or confirmed payload).
 */
export function detectPayloadSignatures(buffer: Buffer, trailingOffset?: number): PayloadDetectionResult {
  const findings: PayloadDetectionFinding[] = [];
  if (!buffer || buffer.length === 0) {
    return { detected: false, findings: [] };
  }

  const hasTrailing = typeof trailingOffset === "number" && trailingOffset >= 0 && trailingOffset < buffer.length;

  for (const sig of KNOWN_SIGNATURES) {
    const patLen = sig.pattern.length;
    for (let i = 0; i <= buffer.length - patLen; i++) {
      let match = true;
      for (let j = 0; j < patLen; j++) {
        if (buffer[i + j] !== sig.pattern[j]) {
          match = false;
          break;
        }
      }

      if (match) {
        const isTrailing = hasTrailing && i >= (trailingOffset as number);
        const location: 'SIGNATURE_IN_TRAILING_DATA' | 'SIGNATURE_IN_IMAGE_STREAM' = isTrailing
          ? 'SIGNATURE_IN_TRAILING_DATA'
          : 'SIGNATURE_IN_IMAGE_STREAM';

        const severity: 'low' | 'medium' | 'high' = isTrailing
          ? sig.severity
          : sig.pattern.length <= 2 ? 'low' : 'medium';

        const description = isTrailing
          ? `${sig.type} format signature identified in unexpected trailing data at offset 0x${i.toString(16).toUpperCase()}`
          : `Byte pattern matching ${sig.type} signature observed inside image stream at offset 0x${i.toString(16).toUpperCase()} (may represent incidental entropy collision)`;

        findings.push({
          type: sig.type,
          offset: i,
          description,
          severity,
          location,
        });

        // Limit findings per signature type to prevent flood
        if (findings.filter(f => f.type === sig.type).length >= 3) {
          break;
        }
      }
    }
  }

  return {
    detected: findings.length > 0,
    findings,
  };
}
