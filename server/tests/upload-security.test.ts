import express from "express";
import http from "http";
import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import { execSync } from "child_process";
import { registerRoutes } from "../routes";
import { securityHeadersMiddleware, corsMiddleware } from "../security";
import { 
  sanitizeOriginalFilename, 
  validateFileSize, 
  validateMagicBytes, 
  validateMimeAndExtension 
} from "../upload-validator";
import os from "os";
import { UPLOAD_LIMITS, MAGIC_BYTES } from "../../shared/constants";

// Helper to generate real image bytes via Python PIL using temp files
function generateImage(format: string, width = 64, height = 64): Buffer {
  const tempPath = path.join(os.tmpdir(), `stego_test_${Date.now()}_${Math.random().toString(36).slice(2)}.${format.toLowerCase()}`);
  const pythonBin = process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3');
  execSync(`"${pythonBin}" -c "from PIL import Image; img = Image.new('RGB', (${width}, ${height}), color='blue'); img.save(r'${tempPath}', format='${format}')"`);
  const buf = fsSync.readFileSync(tempPath);
  try { fsSync.unlinkSync(tempPath); } catch {}
  return buf;
}

// Helper to generate oversized dimension image header (8193 width PNG)
function generateOversizedPng(): Buffer {
  const tempPath = path.join(os.tmpdir(), `stego_oversized_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
  const pythonBin = process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3');
  execSync(`"${pythonBin}" -c "from PIL import Image; img = Image.new('RGB', (8193, 1), color='red'); img.save(r'${tempPath}', format='PNG')"`);
  const buf = fsSync.readFileSync(tempPath);
  try { fsSync.unlinkSync(tempPath); } catch {}
  return buf;
}

// Helper to generate corrupted PNG (valid signature but corrupted chunk)
function generateCorruptedPng(): Buffer {
  const valid = generateImage('PNG', 32, 32);
  const corrupted = Buffer.from(valid);
  // Overwrite IDAT bytes in the middle with null bytes
  for (let i = 40; i < 70 && i < corrupted.length; i++) {
    corrupted[i] = 0x00;
  }
  return corrupted;
}

// Multipart form-data builder using native Node Buffers
function buildMultipartPayload(filename: string, fileBuffer: Buffer, fieldName = 'image', mimeType = 'image/png') {
  const boundary = `----StegoLensTestBoundary${Date.now()}`;
  const crlf = '\r\n';

  const header = 
    `--${boundary}${crlf}` +
    `Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"${crlf}` +
    `Content-Type: ${mimeType}${crlf}${crlf}`;

  const footer = `${crlf}--${boundary}--${crlf}`;

  const body = Buffer.concat([
    Buffer.from(header, 'utf-8'),
    fileBuffer,
    Buffer.from(footer, 'utf-8')
  ]);

  return {
    boundary,
    contentType: `multipart/form-data; boundary=${boundary}`,
    body
  };
}

async function runTests() {
  console.log("==================================================");
  console.log("STEGOLENS PHASE D: SECURE FILE UPLOAD TEST SUITE");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      const detailStr = detail ? (typeof detail === 'object' ? JSON.stringify(detail) : detail) : '';
      console.error(`[FAIL] ${testName}${detailStr ? ` -> ${detailStr}` : ''}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // UNIT TESTS: Sanitization & Direct Validators
  // -------------------------------------------------------------
  console.log("\n--- Part 1: Filename Sanitization & Traversal Defense ---");
  
  assert(sanitizeOriginalFilename("../../evil.jpg") === "evil.jpg", "Strips POSIX ../ path traversal");
  assert(sanitizeOriginalFilename("..\\..\\evil.jpg") === "evil.jpg", "Strips Windows ..\\ path traversal");
  assert(sanitizeOriginalFilename("/etc/passwd") === "passwd", "Strips absolute root path /etc/passwd");
  assert(sanitizeOriginalFilename("C:\\Windows\\System32\\cmd.exe") === "cmd.exe", "Strips Windows drive path");
  // <script>alert(1)</script>.jpg -> basename strips everything before / -> script_.jpg
  assert(sanitizeOriginalFilename("<script>alert(1)</script>.jpg") === "script_.jpg", "Sanitizes XSS / dangerous script characters");
  assert(sanitizeOriginalFilename("") === "unnamed_image", "Handles empty filename safely");
  assert(sanitizeOriginalFilename("...///...") === "unnamed_image", "Handles dot-only traversal pattern");

  console.log("\n--- Part 2: Magic Byte & Size Validation Unit Tests ---");

  const jpegBuf = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01]);
  const pngBuf = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]);
  const webpBuf = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
  const bmpBuf = Buffer.from([0x42, 0x4D, 0x36, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x36, 0x00]);
  const tiffBuf = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  const zipBuf = Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00]);
  const gifBuf = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00]);

  assert(validateMagicBytes(jpegBuf).format === 'JPEG', "Detects JPEG magic bytes");
  assert(validateMagicBytes(pngBuf).format === 'PNG', "Detects PNG magic bytes");
  assert(validateMagicBytes(webpBuf).format === 'WEBP', "Detects WEBP magic bytes");
  assert(validateMagicBytes(bmpBuf).format === 'BMP', "Detects BMP magic bytes");
  assert(validateMagicBytes(tiffBuf).format === 'TIFF', "Detects TIFF magic bytes");
  assert(validateMagicBytes(zipBuf).code === 'UNSUPPORTED_FORMAT', "Rejects ZIP archive signature");
  assert(validateMagicBytes(gifBuf).code === 'UNSUPPORTED_FORMAT', "Rejects GIF format with unsupported notice");
  assert(validateMagicBytes(Buffer.from("random text here")).code === 'INVALID_SIGNATURE', "Rejects random text / unknown bytes");

  assert(validateFileSize(0).valid === false, "Rejects 0-byte file");
  assert(validateFileSize(15 * 1024 * 1024).valid === true, "Accepts exact 15 MB file");
  assert(validateFileSize(15 * 1024 * 1024 + 1).code === 'FILE_TOO_LARGE', "Rejects file exceeding 15 MB");

  // Extension consistency
  assert(validateMimeAndExtension("photo.jpg", "image/jpeg", "JPEG").valid === true, "Allows valid JPEG extension");
  assert(validateMimeAndExtension("photo.exe", "image/jpeg", "JPEG").code === 'UNSUPPORTED_FORMAT', "Rejects .exe named JPEG");
  assert(validateMimeAndExtension("photo.jpg", "text/plain", "JPEG").code === 'UNSUPPORTED_FORMAT', "Rejects JPEG with text/plain MIME");

  // -------------------------------------------------------------
  // INTEGRATION TESTS: HTTP API ENDPOINT WITH REAL TEST IMAGES
  // -------------------------------------------------------------
  console.log("\n--- Part 3: Live HTTP API Upload Security Tests ---");

  const app = express();
  app.use(securityHeadersMiddleware);
  app.use(corsMiddleware);
  app.use(express.json());
  await registerRoutes(app);

  const server = http.createServer(app);
  const TEST_PORT = 54321;

  await new Promise<void>((resolve) => {
    server.listen(TEST_PORT, () => resolve());
  });

  const baseUrl = `http://127.0.0.1:${TEST_PORT}`;
  const uploadsDir = path.resolve(process.cwd(), 'uploads');

  try {
    // Test 1: Valid JPEG
    const jpegData = generateImage('JPEG', 80, 80);
    const jpegPayload = buildMultipartPayload('test_photo.jpg', jpegData, 'image', 'image/jpeg');
    const resJpeg = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': jpegPayload.contentType },
      body: jpegPayload.body
    });
    const jsonJpeg = await resJpeg.json();
    assert(resJpeg.status === 200 && jsonJpeg.success && jsonJpeg.file.format === 'JPEG', 'Test 1: Valid JPEG accepted', { status: resJpeg.status, body: jsonJpeg });

    // Test 2: Valid PNG
    const pngData = generateImage('PNG', 64, 64);
    const pngPayload = buildMultipartPayload('graphic.png', pngData, 'image', 'image/png');
    const resPng = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': pngPayload.contentType },
      body: pngPayload.body
    });
    const jsonPng = await resPng.json();
    assert(resPng.status === 200 && jsonPng.success && jsonPng.file.format === 'PNG', 'Test 2: Valid PNG accepted', { status: resPng.status, body: jsonPng });

    // Test 3: Valid WEBP
    const webpData = generateImage('WEBP', 50, 50);
    const webpPayload = buildMultipartPayload('image.webp', webpData, 'image', 'image/webp');
    const resWebp = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': webpPayload.contentType },
      body: webpPayload.body
    });
    const jsonWebp = await resWebp.json();
    assert(resWebp.status === 200 && jsonWebp.success && jsonWebp.file.format === 'WEBP', 'Test 3: Valid WEBP accepted', { status: resWebp.status, body: jsonWebp });

    // Test 4: Valid BMP
    const bmpData = generateImage('BMP', 32, 32);
    const bmpPayload = buildMultipartPayload('bitmap.bmp', bmpData, 'image', 'image/bmp');
    const resBmp = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': bmpPayload.contentType },
      body: bmpPayload.body
    });
    const jsonBmp = await resBmp.json();
    assert(resBmp.status === 200 && jsonBmp.success && jsonBmp.file.format === 'BMP', 'Test 4: Valid BMP accepted', { status: resBmp.status, body: jsonBmp });

    // Test 5: Valid TIFF
    const tiffData = generateImage('TIFF', 40, 40);
    const tiffPayload = buildMultipartPayload('scan.tiff', tiffData, 'image', 'image/tiff');
    const resTiff = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': tiffPayload.contentType },
      body: tiffPayload.body
    });
    const jsonTiff = await resTiff.json();
    assert(resTiff.status === 200 && jsonTiff.success && jsonTiff.file.format === 'TIFF', 'Test 5: Valid TIFF accepted', { status: resTiff.status, body: jsonTiff });

    // Test 6: Random binary file disguised as image (malware.jpg)
    const randomBytes = Buffer.from("0123456789abcdefRandomNonImageBytesPayloadGoesHere998877");
    const payload6 = buildMultipartPayload('malware.jpg', randomBytes, 'image', 'image/jpeg');
    const res6 = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': payload6.contentType },
      body: payload6.body
    });
    const json6 = await res6.json();
    assert(res6.status === 400 && json6.error.code === 'INVALID_SIGNATURE', 'Test 6: Random binary file rejected (INVALID_SIGNATURE)', { status: res6.status, body: json6 });

    // Test 7: Renamed text file (readme.png)
    const textBytes = Buffer.from("This is a plain text file pretending to be a PNG image.\nLine 2.");
    const payload7 = buildMultipartPayload('readme.png', textBytes, 'image', 'image/png');
    const res7 = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': payload7.contentType },
      body: payload7.body
    });
    const json7 = await res7.json();
    assert(res7.status === 400 && json7.error.code === 'INVALID_SIGNATURE', 'Test 7: Renamed text file rejected (INVALID_SIGNATURE)', { status: res7.status, body: json7 });

    // Test 8: Renamed ZIP file (archive.jpg)
    const zipPayloadBytes = Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    const payload8 = buildMultipartPayload('archive.jpg', zipPayloadBytes, 'image', 'image/jpeg');
    const res8 = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': payload8.contentType },
      body: payload8.body
    });
    const json8 = await res8.json();
    assert(res8.status === 415 && json8.error.code === 'UNSUPPORTED_FORMAT', 'Test 8: Renamed ZIP file rejected (UNSUPPORTED_FORMAT)', { status: res8.status, body: json8 });

    // Test 9: Corrupted image stream (broken IDAT chunk)
    const corruptBytes = generateCorruptedPng();
    const payload9 = buildMultipartPayload('corrupted.png', corruptBytes, 'image', 'image/png');
    const res9 = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': payload9.contentType },
      body: payload9.body
    });
    const json9 = await res9.json();
    assert(res9.status === 400 && json9.error.code === 'INVALID_IMAGE', 'Test 9: Corrupted image rejected (INVALID_IMAGE)', { status: res9.status, body: json9 });

    // Test 10: Oversized file (> 15 MB)
    const oversizedBuffer = Buffer.alloc(15 * 1024 * 1024 + 1024); // 15MB + 1KB
    const payload10 = buildMultipartPayload('giant.jpg', oversizedBuffer, 'image', 'image/jpeg');
    const res10 = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': payload10.contentType },
      body: payload10.body
    });
    const json10 = await res10.json();
    assert(res10.status === 413 && json10.error.code === 'FILE_TOO_LARGE', 'Test 10: Oversized file (>15MB) rejected (FILE_TOO_LARGE)', { status: res10.status, body: json10 });

    // Test 11: Oversized dimensions (> 8192px width)
    const oversizedDimPng = generateOversizedPng();
    const payload11 = buildMultipartPayload('wide_panorama.png', oversizedDimPng, 'image', 'image/png');
    const res11 = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': payload11.contentType },
      body: payload11.body
    });
    const json11 = await res11.json();
    assert(res11.status === 422 && json11.error.code === 'IMAGE_TOO_LARGE', 'Test 11: Oversized dimensions (>8192px) rejected (IMAGE_TOO_LARGE)', { status: res11.status, body: json11 });

    // Test 12: Empty file (0 bytes)
    const emptyPayload = buildMultipartPayload('empty.png', Buffer.alloc(0), 'image', 'image/png');
    const res12 = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': emptyPayload.contentType },
      body: emptyPayload.body
    });
    const json12 = await res12.json();
    assert(res12.status === 400 && json12.error.code === 'INVALID_REQUEST', 'Test 12: Empty file rejected (INVALID_REQUEST)');

    // Test 13: Path traversal filename
    const traversalPayload = buildMultipartPayload('../../etc/shadow.png', pngData, 'image', 'image/png');
    const res13 = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': traversalPayload.contentType },
      body: traversalPayload.body
    });
    const json13 = await res13.json();
    assert(
      res13.status === 200 && json13.file.originalFilename === 'shadow.png',
      'Test 13: Path traversal filename sanitized to base filename (shadow.png)'
    );

    // Test 14: Unsupported format (GIF)
    const gifBytes = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0x00]);
    const payload14 = buildMultipartPayload('animation.gif', gifBytes, 'image', 'image/gif');
    const res14 = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': payload14.contentType },
      body: payload14.body
    });
    const json14 = await res14.json();
    assert(res14.status === 415 && json14.error.code === 'UNSUPPORTED_FORMAT', 'Test 14: Unsupported format GIF rejected (UNSUPPORTED_FORMAT)');

    // Test 15: Security Headers
    assert(resJpeg.headers.get('x-content-type-options') === 'nosniff', 'Test 15a: Header X-Content-Type-Options: nosniff present');
    assert(resJpeg.headers.get('x-frame-options') === 'SAMEORIGIN', 'Test 15b: Header X-Frame-Options: SAMEORIGIN present');
    assert(resJpeg.headers.get('referrer-policy') === 'strict-origin-when-cross-origin', 'Test 15c: Header Referrer-Policy present');

    // Test 16: Ephemeral Storage Cleanup (no orphaned files)
    const filesInUploads = await fs.readdir(uploadsDir);
    const nonGitKeepFiles = filesInUploads.filter(f => f !== '.gitkeep');
    assert(
      nonGitKeepFiles.length === 0,
      'Test 16: Zero orphaned files in uploads/ directory after all operations',
      `Found: ${nonGitKeepFiles.join(', ')}`
    );

    // Test 17: CORS headers
    const corsRes = await fetch(`${baseUrl}/api/upload`, {
      method: 'OPTIONS',
      headers: { 'Origin': 'http://localhost:5000' }
    });
    assert(
      corsRes.headers.get('access-control-allow-origin') === 'http://localhost:5000',
      'Test 17a: CORS allows configured localhost origin'
    );
    assert(
      corsRes.headers.get('access-control-allow-origin') !== '*',
      'Test 17b: CORS never uses wildcard *'
    );

    // Test 18: Rate Limiting
    console.log("\n--- Part 4: Rate Limiting Verification ---");
    process.env.UPLOAD_RATE_LIMIT_MAX = "5";
    process.env.UPLOAD_RATE_LIMIT_WINDOW_MS = "3000";

    const rateLimitApp = express();
    const { uploadRateLimiter: testLimiter } = await import("../security");
    rateLimitApp.post('/test-limit', testLimiter, (_req, res) => res.json({ ok: true }));
    const rateLimitServer = http.createServer(rateLimitApp);
    const RATE_PORT = 54322;
    await new Promise<void>((res) => rateLimitServer.listen(RATE_PORT, () => res()));

    try {
      let hit429 = false;
      let lastStatus = 0;
      let lastJson: any = null;
      let retryAfter: string | null = null;

      for (let i = 0; i < 7; i++) {
        const r = await fetch(`http://127.0.0.1:${RATE_PORT}/test-limit`, { method: 'POST' });
        lastStatus = r.status;
        lastJson = await r.json();
        if (r.status === 429) {
          hit429 = true;
          retryAfter = r.headers.get('retry-after');
          break;
        }
      }

      assert(hit429 && lastStatus === 429, 'Test 18a: Rate limiter triggers HTTP 429 when threshold exceeded');
      assert(lastJson?.error?.code === 'RATE_LIMIT_EXCEEDED', 'Test 18b: Error code is RATE_LIMIT_EXCEEDED');
      assert(retryAfter !== null && parseInt(retryAfter, 10) > 0, 'Test 18c: Rate limiter sets Retry-After header');
    } finally {
      rateLimitServer.close();
    }

  } finally {
    server.close();
  }

  console.log("\n==================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution threw error:", err);
  process.exit(1);
});
