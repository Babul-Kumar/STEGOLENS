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
  if (!buffer || buffer.length === 0) {
    return { detected: false, findings: [] };
  }

  const hasTrailing = typeof trailingOffset === "number" && trailingOffset >= 0 && trailingOffset < buffer.length;

  interface RawMatch {
    type: string;
    sig: KnownSignature;
    location: 'SIGNATURE_IN_TRAILING_DATA' | 'SIGNATURE_IN_IMAGE_STREAM';
    offsets: number[];
  }

  const matchMap = new Map<string, RawMatch>();

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

        const key = `${sig.type}::${location}`;
        const existing = matchMap.get(key);
        if (existing) {
          existing.offsets.push(i);
        } else {
          matchMap.set(key, {
            type: sig.type,
            sig,
            location,
            offsets: [i],
          });
        }
      }
    }
  }

  const findings: PayloadDetectionFinding[] = [];

  for (const match of Array.from(matchMap.values())) {
    const count = match.offsets.length;
    const isTrailing = match.location === 'SIGNATURE_IN_TRAILING_DATA';
    const offsetsHex = match.offsets
      .slice(0, 5)
      .map((o: number) => `0x${o.toString(16).toUpperCase()}`)
      .join(", ") + (count > 5 ? ` (+${count - 5} more)` : "");

    const severity: 'low' | 'medium' | 'high' = isTrailing
      ? 'high'
      : 'low';

    const confidence: 'low' | 'medium' | 'high' = isTrailing
      ? 'high'
      : 'low';

    const description = isTrailing
      ? `Recognizable ${match.type} format signature identified in unexpected trailing container data (${count} occurrence(s) at offset(s) ${offsetsHex}). High confidence of appended archive or executable payload.`
      : `Potential ${match.type} byte sequence pattern observed inside legitimate image stream (${count} occurrence(s) at offset(s) ${offsetsHex}). Low confidence (arbitrary compressed or high-entropy pixel data can match short byte sequences by coincidence; does not establish hidden payload).`;

    findings.push({
      type: match.type,
      offset: match.offsets[0],
      offsets: match.offsets,
      count,
      description,
      severity,
      confidence,
      location: match.location,
    });
  }

  // Sort findings: high confidence / trailing first
  findings.sort((a, b) => {
    if (a.location === 'SIGNATURE_IN_TRAILING_DATA' && b.location !== 'SIGNATURE_IN_TRAILING_DATA') return -1;
    if (b.location === 'SIGNATURE_IN_TRAILING_DATA' && a.location !== 'SIGNATURE_IN_TRAILING_DATA') return 1;
    return 0;
  });

  return {
    detected: findings.length > 0,
    findings,
  };
}
