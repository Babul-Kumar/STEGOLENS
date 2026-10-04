import type { FileStructureAnalysis } from "@shared/schema";

/**
 * Deterministic container structure and marker/chunk analyzer.
 * Checks for legitimate container segments, structural anomalies, and trailing bytes.
 */
export function analyzeContainerStructure(
  buffer: Buffer,
  detectedFormat: string
): FileStructureAnalysis {
  const anomalies: string[] = [];
  const markersOrChunks: Array<{
    name: string;
    offset: number;
    size?: number;
    description?: string;
  }> = [];

  let legitimateEndOffset = buffer.length;

  if (detectedFormat === "JPEG") {
    // -------------------------------------------------------------
    // JPEG Container Parser
    // -------------------------------------------------------------
    if (buffer.length < 2 || buffer[0] !== 0xFF || buffer[1] !== 0xD8) {
      anomalies.push("Missing standard JPEG Start of Image (SOI) marker.");
    } else {
      markersOrChunks.push({
        name: "SOI",
        offset: 0,
        size: 2,
        description: "Start of Image",
      });

      let pos = 2;
      let inScan = false;
      let eoiFound = false;

      while (pos < buffer.length - 1) {
        if (!inScan) {
          if (buffer[pos] === 0xFF) {
            const marker = buffer[pos + 1];

            // Fill bytes (0xFF 0xFF)
            if (marker === 0xFF || marker === 0x00) {
              pos++;
              continue;
            }

            // Standalone markers
            if (marker === 0xD9) {
              // EOI (End of Image)
              markersOrChunks.push({
                name: "EOI",
                offset: pos,
                size: 2,
                description: "End of Image Marker",
              });
              legitimateEndOffset = pos + 2;
              eoiFound = true;
              break;
            }

            if (marker === 0xD8) {
              pos += 2;
              continue;
            }

            // Segment with length
            if (pos + 3 < buffer.length) {
              const segLength = buffer.readUInt16BE(pos + 2);
              const markerName = getJpegMarkerName(marker);

              markersOrChunks.push({
                name: markerName,
                offset: pos,
                size: segLength + 2,
                description: getJpegMarkerDescription(marker),
              });

              if (marker === 0xDA) {
                // SOS (Start of Scan) - scan data begins after SOS segment
                inScan = true;
                pos += segLength + 2;
                continue;
              }

              pos += segLength + 2;
            } else {
              break;
            }
          } else {
            pos++;
          }
        } else {
          // Inside scan data: look for markers (0xFF followed by non-0x00 and non-RST)
          if (buffer[pos] === 0xFF && buffer[pos + 1] !== 0x00 && (buffer[pos + 1] < 0xD0 || buffer[pos + 1] > 0xD7)) {
            inScan = false;
            continue;
          }
          pos++;
        }
      }

      if (!eoiFound) {
        anomalies.push("JPEG stream ended prematurely without an End of Image (EOI) marker.");
      }
    }

  } else if (detectedFormat === "PNG") {
    // -------------------------------------------------------------
    // PNG Container Parser
    // -------------------------------------------------------------
    if (buffer.length < 8) {
      anomalies.push("PNG file smaller than 8-byte signature header.");
    } else {
      markersOrChunks.push({
        name: "PNG_HEADER",
        offset: 0,
        size: 8,
        description: "Standard 8-byte PNG File Signature",
      });

      let pos = 8;
      let iendFound = false;

      while (pos + 8 <= buffer.length) {
        const chunkLen = buffer.readUInt32BE(pos);
        const chunkType = buffer.subarray(pos + 4, pos + 8).toString("ascii");
        const totalChunkSize = chunkLen + 12; // Length(4) + Type(4) + Data(N) + CRC(4)

        markersOrChunks.push({
          name: chunkType,
          offset: pos,
          size: totalChunkSize,
          description: getPngChunkDescription(chunkType),
        });

        if (chunkType === "IEND") {
          legitimateEndOffset = pos + 12;
          iendFound = true;
          break;
        }

        pos += totalChunkSize;
      }

      if (!iendFound) {
        anomalies.push("PNG image stream missing mandatory IEND trailer chunk.");
      }
    }

  } else if (detectedFormat === "WEBP") {
    // -------------------------------------------------------------
    // WEBP Container Parser
    // -------------------------------------------------------------
    if (buffer.length >= 12) {
      const riffSize = buffer.readUInt32LE(4);
      legitimateEndOffset = Math.min(buffer.length, riffSize + 8);

      markersOrChunks.push({
        name: "RIFF_HEADER",
        offset: 0,
        size: 12,
        description: `RIFF WebP Container Header (Declared size: ${riffSize} bytes)`,
      });

      let pos = 12;
      while (pos + 8 <= legitimateEndOffset) {
        const chunkType = buffer.subarray(pos, pos + 4).toString("ascii");
        const chunkLen = buffer.readUInt32LE(pos + 4);
        const paddedLen = chunkLen + (chunkLen % 2); // RIFF chunks are 2-byte aligned

        markersOrChunks.push({
          name: chunkType.trim(),
          offset: pos,
          size: 8 + paddedLen,
          description: `WebP Subchunk ${chunkType}`,
        });

        pos += 8 + paddedLen;
      }
    }

  } else if (detectedFormat === "BMP") {
    // -------------------------------------------------------------
    // BMP Container Parser
    // -------------------------------------------------------------
    if (buffer.length >= 14) {
      const declaredSize = buffer.readUInt32LE(2);
      if (declaredSize > 0 && declaredSize <= buffer.length) {
        legitimateEndOffset = declaredSize;
      }

      markersOrChunks.push({
        name: "BITMAPFILEHEADER",
        offset: 0,
        size: 14,
        description: `BMP File Header (Declared file size: ${declaredSize} bytes)`,
      });
    }

  } else if (detectedFormat === "TIFF") {
    // -------------------------------------------------------------
    // TIFF Container Parser
    // -------------------------------------------------------------
    if (buffer.length >= 8) {
      markersOrChunks.push({
        name: "TIFF_HEADER",
        offset: 0,
        size: 8,
        description: "TIFF Header & IFD Pointer",
      });
    }
  }

  // Trailing bytes detection
  const hasUnexpectedTrailingBytes = buffer.length > legitimateEndOffset;
  const trailingBytesCount = hasUnexpectedTrailingBytes ? buffer.length - legitimateEndOffset : 0;
  let trailingBytesPreview: string | undefined = undefined;

  if (hasUnexpectedTrailingBytes && trailingBytesCount > 0) {
    const trailingSlice = buffer.subarray(legitimateEndOffset, legitimateEndOffset + Math.min(32, trailingBytesCount));
    trailingBytesPreview = trailingSlice.toString("hex").toUpperCase();
    anomalies.push(`Detected ${trailingBytesCount} trailing byte(s) beyond legitimate container termination.`);
  }

  return {
    valid: anomalies.length === 0,
    format: detectedFormat,
    markersOrChunks,
    hasUnexpectedTrailingBytes,
    trailingBytesCount,
    trailingBytesPreview,
    anomalies,
  };
}

function getJpegMarkerName(marker: number): string {
  if (marker >= 0xE0 && marker <= 0xEF) return `APP${marker - 0xE0}`;
  switch (marker) {
    case 0xC0: return "SOF0";
    case 0xC2: return "SOF2";
    case 0xC4: return "DHT";
    case 0xDB: return "DQT";
    case 0xDA: return "SOS";
    case 0xFE: return "COM";
    default: return `0xFF${marker.toString(16).toUpperCase()}`;
  }
}

function getJpegMarkerDescription(marker: number): string {
  if (marker === 0xE0) return "JFIF Application Segment";
  if (marker === 0xE1) return "EXIF / XMP Metadata Segment";
  if (marker >= 0xE2 && marker <= 0xEF) return `Application Segment APP${marker - 0xE0}`;
  switch (marker) {
    case 0xC0: return "Start of Frame (Baseline DCT)";
    case 0xC2: return "Start of Frame (Progressive DCT)";
    case 0xC4: return "Define Huffman Table (DHT)";
    case 0xDB: return "Define Quantization Table (DQT)";
    case 0xDA: return "Start of Scan (SOS)";
    case 0xFE: return "Comment Segment (COM)";
    default: return "JPEG Structural Marker";
  }
}

function getPngChunkDescription(chunkType: string): string {
  switch (chunkType) {
    case "IHDR": return "Image Header (dimensions, bit depth, color type)";
    case "PLTE": return "Palette Table";
    case "IDAT": return "Image Data (Compressed Deflate Stream)";
    case "IEND": return "Image Trailer (End of PNG Stream)";
    case "tEXt": return "Textual Data (Uncompressed key-value)";
    case "zTXt": return "Compressed Textual Data";
    case "iTXt": return "International Textual Data";
    case "pHYs": return "Physical Pixel Dimensions";
    case "tIME": return "Image Last-Modification Time";
    case "eXIf": return "EXIF Metadata Block";
    default: return `PNG Chunk ${chunkType}`;
  }
}
