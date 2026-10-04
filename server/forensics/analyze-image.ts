import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import type { 
  AnalysisResult, 
  AnalysisFindingItem,
  ChannelStats,
  LsbChannelDetail,
  LsbOverallAnalysis
} from "@shared/schema";
import { 
  SUSPICION_LEVELS, 
  ML_STATUS, 
  FORENSIC_WEIGHTS, 
  calculateSuspicionLevel 
} from "@shared/constants";
import { analyzeContainerStructure } from "./container-analysis";
import { detectPayloadSignatures } from "./payload-signatures";
import { runMlInference } from "./ml-service";
import { aggregateEvidence } from "./evidence-aggregator";

interface PythonForensicsOutput {
  file: {
    format: string;
    width: number;
    height: number;
    channels: number;
  };
  metadata: Record<string, string | number | boolean>;
  statistics: {
    entropy: number;
    mean: number;
    variance: number;
    standardDeviation: number;
  };
  channels: {
    red: ChannelStats;
    green: ChannelStats;
    blue: ChannelStats;
  };
  histogram: Array<{
    intensity: number;
    red: number;
    green: number;
    blue: number;
    grayscale?: number;
  }>;
  lsb: {
    red: LsbChannelDetail;
    green: LsbChannelDetail;
    blue: LsbChannelDetail;
    overall: LsbOverallAnalysis;
  };
  visualizations: {
    bitPlanes?: Record<string, string>;
  };
  error?: string;
}

/**
 * Runs Python forensics extractor via child process.
 */
async function runPythonForensics(filePath: string): Promise<PythonForensicsOutput> {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(process.cwd(), "server", "python-service", "forensics_engine.py");
    const pythonBin = process.env.PYTHON_BIN || (process.platform === "win32" ? "python" : "python3");

    const proc = spawn(pythonBin, [pythonScript, filePath]);

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to start forensics extractor: ${err.message}`));
    });

    proc.on("close", (code) => {
      if (code !== 0 && !stdout.trim()) {
        return reject(new Error(`Forensic extraction failed (code ${code}): ${stderr}`));
      }

      try {
        const parsed = JSON.parse(stdout.trim());
        if (parsed.error) {
          return reject(new Error(parsed.error));
        }
        resolve(parsed);
      } catch (e: any) {
        reject(new Error(`Invalid JSON from forensics engine: ${e.message}`));
      }
    });
  });
}

/**
 * Main Phase E forensic analysis pipeline.
 * Extracts deterministic metrics, performs statistical steganalysis,
 * inspects container structures, detects payload signatures, and produces canonical AnalysisResult.
 */
export async function analyzeImage(
  filePath: string,
  originalFilename: string,
  fileSize: number,
  mimeType: string,
  detectedFormat: string
): Promise<AnalysisResult> {
  // 1. Read file bytes and calculate SHA-256 fingerprint
  const fileBuffer = await fs.readFile(filePath);
  const sha256 = crypto.createHash("sha256").update(fileBuffer).digest("hex");

  // 2. Perform container structure & trailing bytes analysis
  const fileStructure = analyzeContainerStructure(fileBuffer, detectedFormat);
  const trailingOffset = fileStructure.hasUnexpectedTrailingBytes 
    ? fileBuffer.length - fileStructure.trailingBytesCount 
    : undefined;

  // 3. Scan for embedded/trailing payload signatures with location classification
  const payloadDetection = detectPayloadSignatures(fileBuffer, trailingOffset);

  // 4. Run Python forensic extraction for pixel statistics, LSB, histograms, and bit planes
  const pyResults = await runPythonForensics(filePath);

  // 5. Synthesize findings and calculate heuristic suspicion score
  const findings: AnalysisFindingItem[] = [];
  let suspicionScore = 0;

  // Evaluate payload signatures: distinguish trailing payload from incidental stream signature
  if (payloadDetection.detected && payloadDetection.findings.length > 0) {
    for (const f of payloadDetection.findings) {
      if (f.location === "SIGNATURE_IN_TRAILING_DATA") {
        suspicionScore += FORENSIC_WEIGHTS.PAYLOAD_SIGNATURE_FOUND; // 40 pts
        findings.push({
          category: "payload",
          status: "suspicious",
          title: "Recognizable Payload Signature in Trailing Data",
          message: `Embedded ${f.type} signature identified in unexpected container trailing data at offset 0x${f.offset.toString(16).toUpperCase()}.`,
          evidence: f.description,
        });
      } else {
        suspicionScore += 10; // incidental signature in image stream
        findings.push({
          category: "payload",
          status: "normal",
          title: "Byte Sequence Pattern in Image Stream",
          message: `Byte pattern matching ${f.type} observed at offset 0x${f.offset.toString(16).toUpperCase()} inside image stream (consistent with possible incidental compression entropy).`,
          evidence: f.description,
        });
      }
    }
  }

  // Evaluate trailing bytes
  if (fileStructure.hasUnexpectedTrailingBytes) {
    suspicionScore += FORENSIC_WEIGHTS.UNEXPECTED_TRAILING_BYTES;
    findings.push({
      category: "structure",
      status: "suspicious",
      title: "Unexpected Container Trailing Bytes",
      message: `File contains ${fileStructure.trailingBytesCount} unexpected trailing byte(s) after legitimate end of container.`,
      evidence: fileStructure.trailingBytesPreview ? `Preview: ${fileStructure.trailingBytesPreview}` : undefined,
    });
  }

  // Evaluate container structure anomalies
  if (fileStructure.anomalies.length > 0) {
    for (const anomaly of fileStructure.anomalies) {
      // Don't duplicate trailing bytes finding
      if (!anomaly.includes("trailing byte")) {
        suspicionScore += FORENSIC_WEIGHTS.CONTAINER_STRUCTURE_ANOMALY;
        findings.push({
          category: "structure",
          status: "suspicious",
          title: "Container Structural Anomaly",
          message: anomaly,
          evidence: `Container: ${detectedFormat}`,
        });
      }
    }
  }

  // Evaluate LSB statistics
  const channels = ["red", "green", "blue"] as const;
  let hasChiSquareAnomaly = false;
  let hasLsbImbalance = false;

  for (const ch of channels) {
    const lsbCh = pyResults.lsb[ch];
    if (lsbCh) {
      if (lsbCh.chiSquarePValue !== undefined && lsbCh.chiSquarePValue < 0.01) {
        hasChiSquareAnomaly = true;
      }
      if (Math.abs(lsbCh.onesRatio - 0.5) > 0.12) {
        hasLsbImbalance = true;
      }
    }
  }

  if (hasChiSquareAnomaly) {
    suspicionScore += FORENSIC_WEIGHTS.LSB_CHI_SQUARE_ANOMALY;
    findings.push({
      category: "lsb",
      status: "suspicious",
      title: "LSB Statistical Anomaly (PoV Chi-Square)",
      message: "Pairs-of-Values chi-square test indicates statistical irregularities in bit distributions.",
      evidence: `Red p-val: ${pyResults.lsb.red.chiSquarePValue}, Green: ${pyResults.lsb.green.chiSquarePValue}, Blue: ${pyResults.lsb.blue.chiSquarePValue}`,
    });
  }

  if (hasLsbImbalance) {
    suspicionScore += FORENSIC_WEIGHTS.LSB_SIGNIFICANT_IMBALANCE;
    findings.push({
      category: "lsb",
      status: "suspicious",
      title: "LSB Bit-Ratio Imbalance",
      message: "Channel least-significant bit ratios deviate from natural image distributions.",
      evidence: `R: ${(pyResults.lsb.red.onesRatio * 100).toFixed(1)}%, G: ${(pyResults.lsb.green.onesRatio * 100).toFixed(1)}%, B: ${(pyResults.lsb.blue.onesRatio * 100).toFixed(1)}%`,
    });
  }

  if (pyResults.lsb.overall.potentialPayloadDetected) {
    suspicionScore += 15;
    findings.push({
      category: "lsb",
      status: "suspicious",
      title: "Sequential Printable Characters in LSB Stream",
      message: "High density of printable ASCII characters detected in extracted LSB stream.",
      evidence: pyResults.lsb.overall.decodedPreview ? `Preview: ${pyResults.lsb.overall.decodedPreview.slice(0, 40)}` : undefined,
    });
  }

  // Check metadata for known stego software indicators
  const knownStegoKeywords = ["steghide", "outguess", "openstego", "jphide", "f5", "spammimic", "stegspy"];
  const metadataString = JSON.stringify(pyResults.metadata).toLowerCase();
  for (const kw of knownStegoKeywords) {
    if (metadataString.includes(kw)) {
      suspicionScore += FORENSIC_WEIGHTS.KNOWN_STEGO_SOFTWARE_METADATA;
      findings.push({
        category: "metadata",
        status: "suspicious",
        title: "Steganography Tool Signature in Metadata",
        message: `Metadata contains signature characteristic of steganography software: '${kw}'.`,
        evidence: `Keyword match: ${kw}`,
      });
      break;
    }
  }

  // Normal / informational findings when clean
  if (findings.length === 0) {
    findings.push({
      category: "structure",
      status: "normal",
      title: "Container Integrity Verified",
      message: "No trailing bytes or container structural deviations detected.",
    });
    findings.push({
      category: "lsb",
      status: "normal",
      title: "LSB Channel Distributions Normal",
      message: "Bit ratios and chi-square distributions are consistent with natural image characteristics.",
    });
  }

  // 6. Run ML inference on the validated image
  const ml = await runMlInference(filePath);

  // 7. Aggregate deterministic forensic signals and ML inference into explainable assessment
  const aggregation = aggregateEvidence(suspicionScore, findings, ml);

  // Construct canonical AnalysisResult
  const result: AnalysisResult = {
    id: crypto.randomUUID(),
    status: "completed",
    createdAt: new Date().toISOString(),

    file: {
      name: originalFilename,
      format: pyResults.file.format || detectedFormat,
      mimeType,
      size: fileSize,
      width: pyResults.file.width,
      height: pyResults.file.height,
      channels: pyResults.file.channels,
      sha256,
    },

    metadata: pyResults.metadata,

    statistics: pyResults.statistics,

    channels: pyResults.channels,

    lsb: pyResults.lsb,

    fileStructure,

    payloadDetection,

    visualizations: {
      histogram: pyResults.histogram,
      bitPlanes: pyResults.visualizations.bitPlanes || {},
      heatmapUrl: null,
      entropyMapUrl: null,
    },

    ml,

    risk: {
      score: aggregation.combinedScore,
      level: aggregation.level,
      findings,
      forensicScore: aggregation.forensicScore,
      mlScore: aggregation.mlScore,
      overallAssessment: aggregation.overallAssessment,
    },
  };

  return result;
}
