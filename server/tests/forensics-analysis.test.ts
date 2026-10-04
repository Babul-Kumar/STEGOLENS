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
import { detectPayloadSignatures } from "../forensics/payload-signatures";
import { aggregateEvidence } from "../forensics/evidence-aggregator";
import type { AnalysisFindingItem, MLInferenceResult } from "@shared/schema";

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
    // Part 4: Forensic Precision, Grouping, & Objective Assessment
    // -------------------------------------------------------------
    console.log("\n--- Part 4: Forensic Precision, Grouping & Objective Assessment ---");

    // 1. Three identical MZ signatures inside image stream -> 1 grouped finding, count=3, LOW confidence
    const streamBuf = Buffer.alloc(500, 0xAA);
    streamBuf[100] = 0x4D; streamBuf[101] = 0x5A; // MZ 1
    streamBuf[200] = 0x4D; streamBuf[201] = 0x5A; // MZ 2
    streamBuf[300] = 0x4D; streamBuf[301] = 0x5A; // MZ 3
    const resStreamMz = detectPayloadSignatures(streamBuf, undefined);
    const mzStreamFindings = resStreamMz.findings.filter((f) => f.type === "EXECUTABLE_MZ");
    assert(
      mzStreamFindings.length === 1,
      "Test 11a: Three identical MZ signatures in image stream grouped into exactly 1 finding"
    );
    assert(
      mzStreamFindings[0]?.count === 3,
      "Test 11b: Grouped MZ finding has occurrence count = 3",
      `Count: ${mzStreamFindings[0]?.count}`
    );
    assert(
      mzStreamFindings[0]?.confidence === "low",
      "Test 11c: Grouped MZ finding in image stream is assigned LOW confidence",
      `Confidence: ${mzStreamFindings[0]?.confidence}`
    );
    assert(
      mzStreamFindings[0]?.location === "SIGNATURE_IN_IMAGE_STREAM",
      "Test 11d: Location correctly identified as SIGNATURE_IN_IMAGE_STREAM"
    );

    // 2. ZIP signature after JPEG EOI -> trailing payload finding, HIGH confidence
    const trailingZipBuf = Buffer.alloc(300, 0x00);
    // Boundary at offset 200, ZIP header at offset 200
    trailingZipBuf[200] = 0x50; trailingZipBuf[201] = 0x4B; trailingZipBuf[202] = 0x03; trailingZipBuf[203] = 0x04;
    const resTrailingZip = detectPayloadSignatures(trailingZipBuf, 200);
    const zipTrailingFindings = resTrailingZip.findings.filter((f) => f.type === "ZIP");
    assert(
      zipTrailingFindings.length === 1 && zipTrailingFindings[0].location === "SIGNATURE_IN_TRAILING_DATA",
      "Test 12a: ZIP signature after JPEG EOI boundary classified as trailing payload finding"
    );
    assert(
      zipTrailingFindings[0]?.confidence === "high",
      "Test 12b: Trailing ZIP payload finding assigned HIGH confidence",
      `Confidence: ${zipTrailingFindings[0]?.confidence}`
    );
    assert(
      zipTrailingFindings[0]?.severity === "high",
      "Test 12c: Trailing ZIP payload finding assigned HIGH severity"
    );

    // 3. Single random MZ byte sequence -> not confirmed executable
    const singleMzBuf = Buffer.alloc(100, 0x00);
    singleMzBuf[50] = 0x4D; singleMzBuf[51] = 0x5A; // MZ
    const resSingleMz = detectPayloadSignatures(singleMzBuf, undefined);
    const singleMzFinding = resSingleMz.findings[0];
    assert(
      singleMzFinding !== undefined &&
      !singleMzFinding.description.toLowerCase().includes("confirmed executable") &&
      !singleMzFinding.description.toLowerCase().includes("malware detected") &&
      singleMzFinding.confidence === "low",
      "Test 13: Single random MZ byte sequence in stream is not claimed as confirmed executable"
    );

    // 4. ML probability 42.3% -> wording must not claim confirmed manipulation
    const mlTest42: MLInferenceResult = {
      status: "ready",
      prediction: "cover",
      probability: 0.423,
      confidence: "medium",
      modelVersion: "ALASKA2 EfficientNet-B0 (v1.0)",
      threshold: 0.5,
      description: "ML analysis produced a 42.3% steganalysis probability, which is below the configured decision threshold (50.0%).",
    };
    const agg42 = aggregateEvidence(20, [], mlTest42);
    const desc42 = (mlTest42.description || "").toLowerCase();
    const assess42 = agg42.overallAssessment.toLowerCase();
    assert(
      !desc42.includes("detected statistical manipulation") &&
      !desc42.includes("confirmed manipulation") &&
      !assess42.includes("manipulation confirmed") &&
      !assess42.includes("steganography confirmed") &&
      (desc42.includes("42.3%") || desc42.includes("below the configured decision threshold")),
      "Test 14: ML probability 42.3% wording is conservative and does not claim confirmed manipulation"
    );

    // 5. Overall score 47 -> MODERATE
    const level47 = calculateSuspicionLevel(47);
    assert(
      level47 === SUSPICION_LEVELS.MODERATE,
      "Test 15: Overall suspicion score 47 is classified as MODERATE",
      `Level: ${level47}`
    );

    // 6. No trailing payload -> assessment must not claim payload detected
    const findingsNoTrailing: AnalysisFindingItem[] = [
      {
        category: "lsb",
        status: "suspicious",
        severity: "medium",
        confidence: "medium",
        title: "LSB Statistical Anomaly (PoV Chi-Square)",
        message: "Pairs-of-Values chi-square test indicates statistical irregularities in bit distributions.",
      },
      {
        category: "payload",
        status: "normal",
        severity: "low",
        confidence: "low",
        count: 3,
        offsets: [100, 200, 300],
        title: "Potential EXECUTABLE_MZ Signature Pattern in Image Stream",
        message: "Potential EXECUTABLE_MZ byte sequence observed inside legitimate image stream (3 occurrence(s)).",
      },
    ];
    const aggNoTrailing = aggregateEvidence(47, findingsNoTrailing, {
      status: "ready",
      prediction: "cover",
      probability: 0.423,
      confidence: "medium",
      modelVersion: "ALASKA2 EfficientNet-B0 (v1.0)",
      threshold: 0.5,
    });
    const assessTextNoTrailing = aggNoTrailing.overallAssessment.toLowerCase();
    assert(
      !assessTextNoTrailing.includes("hidden data confirmed") &&
      !assessTextNoTrailing.includes("executable confirmed") &&
      !assessTextNoTrailing.includes("malware detected") &&
      !assessTextNoTrailing.includes("steganography confirmed") &&
      assessTextNoTrailing.includes("does not establish that hidden payload data is present"),
      "Test 16: No trailing payload assessment explicitly states evidence does not establish hidden payload data"
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
