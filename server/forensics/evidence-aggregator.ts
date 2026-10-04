import type { AnalysisFindingItem, MLInferenceResult } from "@shared/schema";
import { SUSPICION_LEVELS, calculateSuspicionLevel, type SuspicionLevel } from "@shared/constants";

export interface AggregationResult {
  forensicScore: number;
  mlScore: number;
  combinedScore: number;
  level: SuspicionLevel;
  overallAssessment: string;
}

/**
 * Synthesizes deterministic forensic signals and ML inference probabilities
 * into an explainable, conceptually separate overall assessment.
 * Avoids false certainty; uses scientifically objective forensic language.
 */
export function aggregateEvidence(
  forensicScore: number,
  findings: AnalysisFindingItem[],
  mlResult: MLInferenceResult
): AggregationResult {
  const clampedForensic = Math.min(100, Math.max(0, forensicScore));
  
  // Calculate ML Score (0 to 100) based on model probability
  const mlScore = typeof mlResult.probability === "number"
    ? Math.round(mlResult.probability * 100)
    : 0;

  // Determine combined score
  let combinedScore = clampedForensic;
  const hasConfirmedTrailingPayload = findings.some(
    (f) => f.category === "payload" && f.severity === "high" && f.title.includes("Trailing Data")
  );
  const hasTrailingBytes = findings.some(
    (f) => f.category === "structure" && f.title.includes("Trailing Bytes")
  );

  if (mlResult.status === "ready" && typeof mlResult.probability === "number") {
    if (hasConfirmedTrailingPayload) {
      combinedScore = Math.min(100, Math.round(clampedForensic * 0.8 + mlScore * 0.2));
    } else {
      // Balanced weighting: 60% deterministic forensic + 40% ML neural classification
      combinedScore = Math.min(100, Math.round(clampedForensic * 0.6 + mlScore * 0.4));
    }
  }

  const level = calculateSuspicionLevel(combinedScore);

  // Generate explainable, scientifically conservative overall assessment
  let overallAssessment = "";

  const suspiciousFindings = findings.filter((f) => f.status === "suspicious");
  const findingSummaries = suspiciousFindings.map((f) => f.title);
  const hasStreamSignatures = findings.some((f) => f.category === "payload" && f.severity === "low");

  const threshold = mlResult.threshold || 0.22;
  const isMlElevated = mlResult.status === "ready" && mlResult.probability !== null && mlResult.probability >= threshold;
  const probPct = mlResult.probability !== null ? (mlResult.probability * 100).toFixed(1) : "0.0";
  const threshPct = (threshold * 100).toFixed(1);

  if (hasConfirmedTrailingPayload) {
    overallAssessment =
      "Strong evidence: Valid payload signature identified in trailing container bytes beyond legitimate container termination. Appended archive or binary data confirmed in trailing segment.";
  } else if (suspiciousFindings.length > 0 || isMlElevated || hasStreamSignatures) {
    // Statistically or structurally notable, but NO confirmed trailing payload
    const signals: string[] = [];
    if (findingSummaries.length > 0) {
      signals.push(findingSummaries.join(", "));
    }
    if (hasStreamSignatures) {
      signals.push("low-confidence byte sequence pattern(s) in image stream");
    }
    if (isMlElevated) {
      signals.push(`elevated ML steganalysis signal (${probPct}%, threshold: ${threshPct}%)`);
    } else if (mlResult.status === "ready" && mlResult.probability !== null) {
      signals.push(`ML signal (${probPct}%) within baseline (< ${threshPct}%)`);
    }

    overallAssessment =
      "Multiple statistical indicators warrant further inspection, but the current evidence does not establish that hidden payload data is present.";
    if (signals.length > 0) {
      overallAssessment += ` Observed characteristics: ${signals.join("; ")}.`;
    }
  } else {
    overallAssessment =
      `No significant structural, statistical, or neural steganalysis anomalies detected. Container markers ` +
      `terminate cleanly, bit distributions match natural optical noise, and ML probability remains low ` +
      `(${probPct}%). The carrier image shows characteristics consistent with an unmodified file.`;
  }

  return {
    forensicScore: clampedForensic,
    mlScore,
    combinedScore,
    level,
    overallAssessment,
  };
}
