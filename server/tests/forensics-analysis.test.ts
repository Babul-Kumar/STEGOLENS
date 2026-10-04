import express from "express";
import http from "http";
import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import os from "os";
import { execSync } from "child_process";
import { registerRoutes } from "../routes";
import { securityHeadersMiddleware, corsMiddleware } from "../security";
import { SUSPICION_LEVELS, ML_STATUS, calculateSuspicionLevel } from "../../shared/constants";

// Helper to generate genuine images using Python Pillow
function generateTestImage(format: string, width = 64, height = 64, isGray = false, exifMeta?: Record<string, string>): Buffer {
  const tempPath = path.join(os.tmpdir(), `stego_fe_${Date.now()}_${Math.random().toString(36).slice(2)}.${format.toLowerCase()}`);
  const pythonBin = process.env.PYTHON_BIN || (process.platform === "win32" ? "python" : "python3");

  let pyCode = "";
  if (isGray) {
    pyCode = `from PIL import Image; img = Image.new('L', (${width}, ${height}), color=128); img.save(r'${tempPath}', format='${format}')`;
  } else if (exifMeta) {
    // Generate image with metadata in info dictionary
    pyCode = `from PIL import Image; img = Image.new('RGB', (${width}, ${height}), color=(100, 150, 200)); img.save(r'${tempPath}', format='${format}', comment='StegoLens Forensic Test Image')`;
  } else {
    pyCode = `from PIL import Image; img = Image.new('RGB', (${width}, ${height}), color=(70, 130, 180)); img.save(r'${tempPath}', format='${format}')`;
  }

  execSync(`"${pythonBin}" -c "${pyCode}"`);
  const buf = fsSync.readFileSync(tempPath);
  try { fsSync.unlinkSync(tempPath); } catch {}
  return buf;
}

// Helper to append trailing bytes to a valid image
function appendTrailingBytes(originalBuffer: Buffer, trailing: Buffer): Buffer {
  return Buffer.concat([originalBuffer, trailing]);
}

// Multipart builder
function buildMultipart(filename: string, fileBuffer: Buffer, mimeType = "image/png") {
  const boundary = `----StegoLensFETest${Date.now()}`;
  const crlf = "\r\n";

  const header =
    `--${boundary}${crlf}` +
    `Content-Disposition: form-data; name="image"; filename="${filename}"${crlf}` +
    `Content-Type: ${mimeType}${crlf}${crlf}`;

  const footer = `${crlf}--${boundary}--${crlf}`;

  return {
    contentType: `multipart/form-data; boundary=${boundary}`,
    body: Buffer.concat([
      Buffer.from(header, "utf-8"),
      fileBuffer,
      Buffer.from(footer, "utf-8"),
    ]),
  };
}

async function runForensicsTests() {
  console.log("==================================================");
  console.log("STEGOLENS PHASE E: FORENSIC EXTRACTION TEST SUITE");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      const detailStr = detail ? (typeof detail === "object" ? JSON.stringify(detail) : detail) : "";
      console.error(`[FAIL] ${testName}${detailStr ? ` -> ${detailStr}` : ""}`);
      failed++;
    }
  }

  const app = express();
  app.use(securityHeadersMiddleware);
  app.use(corsMiddleware);
  app.use(express.json());
  await registerRoutes(app);

  const server = http.createServer(app);
  const TEST_PORT = 54323;

  await new Promise<void>((resolve) => {
    server.listen(TEST_PORT, () => resolve());
  });

  const baseUrl = `http://127.0.0.1:${TEST_PORT}`;
  const uploadsDir = path.resolve(process.cwd(), "uploads");

  try {
    // -------------------------------------------------------------
    // Part 0: Suspicion Thresholds Boundary Verification (Phase E.1)
    // -------------------------------------------------------------
    console.log("\n--- Part 0: Suspicion Thresholds Boundary Verification (Phase E.1) ---");
    assert(calculateSuspicionLevel(0) === SUSPICION_LEVELS.LOW, "Score 0 -> LOW");
    assert(calculateSuspicionLevel(24) === SUSPICION_LEVELS.LOW, "Score 24 -> LOW (boundary)");
    assert(calculateSuspicionLevel(25) === SUSPICION_LEVELS.MODERATE, "Score 25 -> MODERATE (boundary)");
    assert(calculateSuspicionLevel(49) === SUSPICION_LEVELS.MODERATE, "Score 49 -> MODERATE (boundary)");
    assert(calculateSuspicionLevel(50) === SUSPICION_LEVELS.HIGH, "Score 50 -> HIGH (boundary)");
    assert(calculateSuspicionLevel(74) === SUSPICION_LEVELS.HIGH, "Score 74 -> HIGH (boundary)");
    assert(calculateSuspicionLevel(75) === SUSPICION_LEVELS.VERY_HIGH, "Score 75 -> VERY_HIGH (boundary)");
    assert(calculateSuspicionLevel(100) === SUSPICION_LEVELS.VERY_HIGH, "Score 100 -> VERY_HIGH (boundary)");
    // -------------------------------------------------------------
    // Test 1: Full Forensic Extraction on Valid JPEG
    // -------------------------------------------------------------
    console.log("\n--- Part 1: Format Extractions (JPEG, PNG, WEBP, BMP, TIFF) ---");
    const jpegBuf = generateTestImage("JPEG", 120, 100);
    const jpegMp = buildMultipart("sample.jpg", jpegBuf, "image/jpeg");
    const resJpeg = await fetch(`${baseUrl}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": jpegMp.contentType },
      body: jpegMp.body,
    });
    const jsonJpeg = await resJpeg.json();

    assert(resJpeg.status === 200 && jsonJpeg.success, "Test 1: JPEG analysis endpoint returns 200 OK", jsonJpeg);
    const aJpeg = jsonJpeg.analysis;
    assert(aJpeg && aJpeg.file.sha256.length === 64, "Test 1a: Valid SHA-256 fingerprint generated");
    assert(aJpeg.file.width === 120 && aJpeg.file.height === 100, "Test 1b: Image dimensions extracted correctly (120x100)");
    assert(aJpeg.statistics.entropy > 0, "Test 1c: Shannon entropy calculated (> 0)");
    assert(aJpeg.visualizations.histogram && aJpeg.visualizations.histogram.length === 256, "Test 1d: Histogram contains 256 bins");
    assert(aJpeg.channels.red && aJpeg.channels.green && aJpeg.channels.blue, "Test 1e: RGB channels statistics exist");
    assert(aJpeg.lsb.red && aJpeg.lsb.red.onesRatio >= 0 && aJpeg.lsb.red.onesRatio <= 1, "Test 1f: LSB channel ratios calculated");
    assert(aJpeg.ml.status === ML_STATUS.READY, "Test 1h: ML model is active and READY (ALASKA2 EfficientNet-B0)");
    assert(
      typeof aJpeg.ml.probability === "number" && aJpeg.ml.probability >= 0 && aJpeg.ml.probability <= 1,
      "Test 1i: ML probability is valid float in range [0, 1]"
    );
    assert(
      aJpeg.ml.prediction === "stego" || aJpeg.ml.prediction === "cover",
      "Test 1j: ML prediction matches binary steganalysis classes"
    );
    assert(
      typeof aJpeg.risk.overallAssessment === "string" && aJpeg.risk.overallAssessment.length > 0,
      "Test 1k: Forensic + ML evidence synthesis overall assessment generated"
    );
    assert(aJpeg.risk.score >= 0 && aJpeg.risk.score <= 100, "Test 1l: Suspicion score within bounds (0-100)");

    // -------------------------------------------------------------
    // Test 2: Full Forensic Extraction on Valid PNG
    // -------------------------------------------------------------
    const pngBuf = generateTestImage("PNG", 80, 80);
    const pngMp = buildMultipart("sample.png", pngBuf, "image/png");
    const resPng = await fetch(`${baseUrl}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": pngMp.contentType },
      body: pngMp.body,
    });
    const jsonPng = await resPng.json();
    assert(resPng.status === 200 && jsonPng.success, "Test 2: PNG analysis returns 200 OK");
    const aPng = jsonPng.analysis;
    assert(aPng.fileStructure.markersOrChunks.some((m: any) => m.name === "IHDR"), "Test 2a: PNG IHDR chunk identified");
    assert(aPng.fileStructure.markersOrChunks.some((m: any) => m.name === "IEND"), "Test 2b: PNG IEND chunk identified");
    assert(aPng.visualizations.bitPlanes?.plane_0_lsb?.startsWith("data:image/png;base64,"), "Test 2c: Bit-plane 0 (LSB) base64 thumbnail generated");

    // -------------------------------------------------------------
    // Test 3: WEBP Analysis
    // -------------------------------------------------------------
    const webpBuf = generateTestImage("WEBP", 64, 64);
    const webpMp = buildMultipart("sample.webp", webpBuf, "image/webp");
    const resWebp = await fetch(`${baseUrl}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": webpMp.contentType },
      body: webpMp.body,
    });
    const jsonWebp = await resWebp.json();
    assert(resWebp.status === 200 && jsonWebp.success, "Test 3: WEBP analysis returns 200 OK");
    assert(jsonWebp.analysis.fileStructure.markersOrChunks.some((m: any) => m.name === "RIFF_HEADER"), "Test 3a: WEBP RIFF header parsed");

    // -------------------------------------------------------------
    // Test 4: BMP Analysis
    // -------------------------------------------------------------
    const bmpBuf = generateTestImage("BMP", 50, 50);
    const bmpMp = buildMultipart("sample.bmp", bmpBuf, "image/bmp");
    const resBmp = await fetch(`${baseUrl}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": bmpMp.contentType },
      body: bmpMp.body,
    });
    const jsonBmp = await resBmp.json();
    assert(resBmp.status === 200 && jsonBmp.success, "Test 4: BMP analysis returns 200 OK");
    assert(jsonBmp.analysis.file.format === "BMP", "Test 4a: BMP format confirmed");

    // -------------------------------------------------------------
    // Test 5: TIFF Analysis
    // -------------------------------------------------------------
    const tiffBuf = generateTestImage("TIFF", 45, 45);
    const tiffMp = buildMultipart("sample.tiff", tiffBuf, "image/tiff");
    const resTiff = await fetch(`${baseUrl}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": tiffMp.contentType },
      body: tiffMp.body,
    });
    const jsonTiff = await resTiff.json();
    assert(resTiff.status === 200 && jsonTiff.success, "Test 5: TIFF analysis returns 200 OK");
    assert(jsonTiff.analysis.file.format === "TIFF", "Test 5a: TIFF format confirmed");

    // -------------------------------------------------------------
    // Test 6: Grayscale Image Handling
    // -------------------------------------------------------------
    console.log("\n--- Part 2: Edge Cases & Structural Forensic Detections ---");
    const grayBuf = generateTestImage("PNG", 60, 60, true);
    const grayMp = buildMultipart("grayscale.png", grayBuf, "image/png");
    const resGray = await fetch(`${baseUrl}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": grayMp.contentType },
      body: grayMp.body,
    });
    const jsonGray = await resGray.json();
    assert(resGray.status === 200 && jsonGray.analysis.file.channels === 1, "Test 6: Grayscale single-channel handled correctly");

    // -------------------------------------------------------------
    // Test 7: Trailing Bytes Detection
    // -------------------------------------------------------------
    const trailingExtra = Buffer.from("SECRET_TRAILING_DATA_PAYLOAD_HERE_12345");
    const pngWithTrailing = appendTrailingBytes(pngBuf, trailingExtra);
    const trailingMp = buildMultipart("trailing.png", pngWithTrailing, "image/png");
    const resTrailing = await fetch(`${baseUrl}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": trailingMp.contentType },
      body: trailingMp.body,
    });
    const jsonTrailing = await resTrailing.json();
    assert(
      resTrailing.status === 200 && jsonTrailing.analysis.fileStructure.hasUnexpectedTrailingBytes === true,
      "Test 7a: Trailing bytes detected beyond container end"
    );
    assert(
      jsonTrailing.analysis.fileStructure.trailingBytesCount === trailingExtra.length,
      `Test 7b: Exact trailing bytes count (${trailingExtra.length}) recorded`
    );
    assert(
      jsonTrailing.analysis.risk.findings.some((f: any) => f.category === "structure" && f.status === "suspicious"),
      "Test 7c: Trailing bytes flagged as structured finding"
    );

    // -------------------------------------------------------------
    // Test 8: Embedded ZIP Payload Signature Detection
    // -------------------------------------------------------------
    // Append a mock ZIP header to an image
    const zipHeader = Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x08, 0x00, 0x54, 0x65, 0x73, 0x74]);
    const imageWithZip = appendTrailingBytes(jpegBuf, zipHeader);
    const zipMp = buildMultipart("stego_archive.jpg", imageWithZip, "image/jpeg");
    const resZip = await fetch(`${baseUrl}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": zipMp.contentType },
      body: zipMp.body,
    });
    const jsonZip = await resZip.json();
    assert(
      resZip.status === 200 && jsonZip.analysis.payloadDetection.detected === true,
      "Test 8a: Embedded ZIP signature detected in trailing bytes"
    );
    assert(
      jsonZip.analysis.payloadDetection.findings.some((f: any) => f.type === "ZIP"),
      "Test 8b: Finding identifies ZIP archive type"
    );
    assert(
      jsonZip.analysis.risk.score >= 40,
      `Test 8c: Suspicion score elevated appropriately for payload signature (Score: ${jsonZip.analysis.risk.score}/100)`
    );

    // -------------------------------------------------------------
    // Test 9: Database Persistence & Retrieval
    // -------------------------------------------------------------
    console.log("\n--- Part 3: Database Storage & Ephemeral Lifecycle ---");
    const savedId = jsonPng.analysis.id;
    assert(savedId !== undefined, "Test 9a: Analysis ID assigned from database");
    const resGet = await fetch(`${baseUrl}/api/analyses/${savedId}`);
    const jsonGet = await resGet.json();
    assert(
      resGet.status === 200 && jsonGet.analysis && jsonGet.analysis.file.sha256 === aPng.file.sha256,
      "Test 9b: Retrieved analysis matches persisted record by ID"
    );

    // Test 9c: List analyses via GET /api/analyses
    const resList = await fetch(`${baseUrl}/api/analyses?limit=10`);
    const jsonList = await resList.json();
    assert(
      resList.status === 200 && Array.isArray(jsonList.analyses) && jsonList.analyses.length > 0,
      "Test 9c: GET /api/analyses returns persisted records list"
    );

    // Test 9d: Generate PDF Forensic Report via GET /api/analyses/:id/report?format=pdf
    const resPdf = await fetch(`${baseUrl}/api/analyses/${savedId}/report?format=pdf`);
    const pdfBuf = Buffer.from(await resPdf.arrayBuffer());
    assert(
      resPdf.status === 200 &&
      resPdf.headers.get("content-type")?.includes("application/pdf") &&
      pdfBuf.slice(0, 4).toString("utf-8") === "%PDF",
      "Test 9d: GET /api/analyses/:id/report generates valid PDF report with %PDF header"
    );

    // Test 9e: Export JSON Forensic Report via GET /api/analyses/:id/report?format=json
    const resJsonReport = await fetch(`${baseUrl}/api/analyses/${savedId}/report?format=json`);
    const jsonReport = await resJsonReport.json();
    assert(
      resJsonReport.status === 200 && jsonReport.file && jsonReport.file.sha256 === aPng.file.sha256,
      "Test 9e: GET /api/analyses/:id/report exports structured JSON report"
    );

    // Test 9f: Health Check Endpoint GET /api/health
    const resHealth = await fetch(`${baseUrl}/api/health`);
    const jsonHealth = await resHealth.json();
    assert(
      resHealth.status === 200 &&
      jsonHealth.status === "healthy" &&
      jsonHealth.services.database.status === "connected" &&
      jsonHealth.services.ml.status === "ready",
      "Test 9f: GET /api/health reports system healthy with active database, forensics, and ML engine"
    );

    // Test 9g: Delete Analysis Record via DELETE /api/analyses/:id
    const resDel = await fetch(`${baseUrl}/api/analyses/${savedId}`, { method: "DELETE" });
    const jsonDel = await resDel.json();
    const resGetAfterDel = await fetch(`${baseUrl}/api/analyses/${savedId}`);
    assert(
      resDel.status === 200 && jsonDel.success && resGetAfterDel.status === 404,
      "Test 9g: DELETE /api/analyses/:id removes analysis from SQLite database"
    );

    // -------------------------------------------------------------
    // Test 10: Ephemeral Cleanup (Zero orphaned files)
    // -------------------------------------------------------------
    const filesInUploads = await fs.readdir(uploadsDir);
    const nonGitKeep = filesInUploads.filter((f) => f !== ".gitkeep");
    assert(
      nonGitKeep.length === 0,
      "Test 10: Zero temporary files left in uploads/ after all forensic analyses",
      `Found: ${nonGitKeep.join(", ")}`
    );

  } finally {
    server.close();
  }

  console.log("\n==================================================");
  console.log(`PHASE E TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runForensicsTests().catch((err) => {
  console.error("Forensic test execution error:", err);
  process.exit(1);
});
