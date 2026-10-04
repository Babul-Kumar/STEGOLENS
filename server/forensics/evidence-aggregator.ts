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
  // Deterministic structural evidence (trailing data, recognized signatures) dominates
  let combinedScore = clampedForensic;
  const hasStrongForensicEvidence = findings.some(
    (f) => f.category === "payload" && f.status === "suspicious"
  ) || findings.some(
    (f) => f.category === "structure" && f.title.includes("Trailing Bytes")
  );

  if (mlResult.status === "ready" && typeof mlResult.probability === "number") {
    if (hasStrongForensicEvidence) {
      // Strong forensic evidence remains primary; ML corroboration boosts confidence
      combinedScore = Math.min(100, Math.round(clampedForensic * 0.8 + mlScore * 0.2));
    } else {
      // Balanced weighting: 60% deterministic forensic + 40% ML neural classification
      combinedScore = Math.min(100, Math.round(clampedForensic * 0.6 + mlScore * 0.4));
    }
  }

  const level = calculateSuspicionLevel(combinedScore);

  // Generate explainable overall assessment
  let overallAssessment = "";

  const suspiciousFindings = findings.filter((f) => f.status === "suspicious");
  const findingSummaries = suspiciousFindings.map((f) => f.title);

  if (mlResult.status === "ready" && mlResult.probability !== null) {
    const isMlElevated = mlResult.probability >= (mlResult.threshold || 0.22);
    
    if (suspiciousFindings.length > 0 && isMlElevated) {
      overallAssessment = 
        `Concordant forensic and neural steganalysis signals detected. Deterministic inspection identified ` +
        `${findingSummaries.join(", ")}, while the EfficientNet-B0 classifier reported elevated probability ` +
        `(${(mlResult.probability * 100).toFixed(1)}%). Multiple independent indicators exhibit characteristics ` +
        `consistent with possible steganographic manipulation. Secondary payload verification recommended.`;
    } else if (suspiciousFindings.length > 0 && !isMlElevated) {
      overallAssessment = 
        `Structural forensic anomalies detected (${findingSummaries.join(", ")}), although ML feature probability ` +
        `remains moderate (${(mlResult.probability * 100).toFixed(1)}%). In forensic examination, deterministic ` +
        `container anomalies and bit-plane patterns take precedence over neural classification confidence.`;
    } else if (suspiciousFindings.length === 0 && isMlElevated) {
      overallAssessment = 
        `Neural steganalysis model indicates elevated probability (${(mlResult.probability * 100).toFixed(1)}%) ` +
        `without overt container or bit-plane structural anomalies. This pattern can occur with transform-domain ` +
        `algorithms (e.g. JMiPOD, JUNIWARD) or high-frequency natural sensor noise. Further targeted DCT analysis warranted.`;
    } else {
      overallAssessment = 
        `No significant structural, statistical, or neural steganalysis anomalies detected. Container markers ` +
        `terminate cleanly, bit distributions match natural optical noise, and ML probability remains low ` +
        `(${(mlResult.probability * 100).toFixed(1)}%). The carrier image shows characteristics consistent with an unmodified file.`;
    }
  } else {
    // ML offline or failed: strictly deterministic evaluation
    if (suspiciousFindings.length > 0) {
      overallAssessment = 
        `Evaluation based entirely on deterministic forensic analysis (ML engine offline). Anomalies identified: ` +
        `${findingSummaries.join(", ")}. Suspicion level: ${level}.`;
    } else {
      overallAssessment = 
        `Evaluation based entirely on deterministic forensic analysis (ML engine offline). Container integrity and ` +
        `pixel statistics are consistent with a normal, unaltered image.`;
    }
  }

  return {
    forensicScore: clampedForensic,
    mlScore,
    combinedScore,
    level,
    overallAssessment,
  };
}
