import PDFDocument from "pdfkit";
import type { AnalysisResult } from "@shared/schema";

/**
 * Generates a publication-grade digital forensics PDF report from an AnalysisResult.
 * Formats evidence systematically using objective scientific terminology.
 */
export async function generateForensicPdfReport(analysis: AnalysisResult): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 40,
      info: {
        Title: `StegoLens Forensic Report - ${analysis.file.name}`,
        Author: "StegoLens Forensic Engine",
        Subject: "Digital Image Steganalysis & Forensics Examination",
        Keywords: "steganography, steganalysis, forensics, lsb, alaska2",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err) => reject(err));

    const primaryColor = "#0f172a"; // Dark slate
    const accentColor = "#2563eb"; // Blue
    const mutedColor = "#64748b"; // Muted gray
    const dangerColor = "#dc2626"; // Red
    const warningColor = "#d97706"; // Amber
    const successColor = "#16a34a"; // Green

    // --- Header ---
    doc.rect(40, 40, 515, 65).fill("#f8fafc");
    doc.rect(40, 40, 6, 65).fill(accentColor);

    doc.fillColor(primaryColor).fontSize(18).font("Helvetica-Bold")
      .text("STEGOLENS FORENSIC EXAMINATION REPORT", 55, 50);
    
    doc.fillColor(mutedColor).fontSize(9).font("Helvetica")
      .text("Digital Image Steganalysis & Technical Artifact Inspection", 55, 72)
      .text(`Report Generated: ${new Date().toUTCString()} | Engine v2.0`, 55, 84);

    let y = 120;

    // --- 1. Evidence Case Summary ---
    doc.fillColor(accentColor).fontSize(11).font("Helvetica-Bold")
      .text("1. EVIDENCE CUSTODY & INTEGRITY FINGERPRINT", 40, y);
    y += 18;

    const riskColor = 
      analysis.risk.level === "VERY_HIGH" ? dangerColor :
      analysis.risk.level === "HIGH" ? "#ea580c" :
      analysis.risk.level === "MODERATE" ? warningColor : successColor;

    doc.rect(40, y, 515, 75).stroke("#e2e8f0");
    doc.fontSize(8.5).font("Helvetica");

    const col1 = 50;
    const col2 = 300;

    doc.fillColor(primaryColor)
      .text(`Analysis ID:`, col1, y + 8, { continued: true })
      .fillColor(mutedColor).text(`  ${analysis.id}`)
      .fillColor(primaryColor)
      .text(`Target File:`, col1, y + 22, { continued: true })
      .fillColor(mutedColor).text(`  ${analysis.file.name}`)
      .fillColor(primaryColor)
      .text(`Format & MIME:`, col1, y + 36, { continued: true })
      .fillColor(mutedColor).text(`  ${analysis.file.format} (${analysis.file.mimeType})`)
      .fillColor(primaryColor)
      .text(`Dimensions:`, col1, y + 50, { continued: true })
      .fillColor(mutedColor).text(`  ${analysis.file.width} x ${analysis.file.height} px (${(analysis.file.size / 1024).toFixed(1)} KB)`);

    doc.fillColor(primaryColor)
      .text(`SHA-256 Hash:`, col2, y + 8)
      .font("Courier").fontSize(7.5).fillColor(mutedColor)
      .text(`${analysis.file.sha256}`, col2, y + 20, { width: 245 })
      .font("Helvetica").fontSize(8.5).fillColor(primaryColor)
      .text(`Suspicion Score:`, col2, y + 38, { continued: true })
      .font("Helvetica-Bold").fillColor(riskColor).text(`  ${analysis.risk.score} / 100 (${analysis.risk.level})`)
      .font("Helvetica").fillColor(primaryColor)
      .text(`ML Prediction:`, col2, y + 52, { continued: true })
      .font("Helvetica-Bold")
      .fillColor(analysis.ml.prediction === "stego" ? dangerColor : successColor)
      .text(`  ${analysis.ml.prediction ? analysis.ml.prediction.toUpperCase() : "N/A"} (${analysis.ml.probability !== null ? (analysis.ml.probability * 100).toFixed(1) + "%" : "Not connected"})`);

    y += 90;

    // --- 2. Deterministic Forensic Extraction Findings ---
    doc.fillColor(accentColor).fontSize(11).font("Helvetica-Bold")
      .text("2. DETERMINISTIC FORENSIC & STRUCTURAL INSPECTION", 40, y);
    y += 18;

    // Pixel Intensity Entropy and Moments
    doc.rect(40, y, 515, 45).stroke("#e2e8f0");
    doc.fontSize(8.5).font("Helvetica").fillColor(primaryColor)
      .text(`Pixel Intensity Entropy:  ${analysis.statistics.entropy.toFixed(4)} (Shannon 0.0 - 8.0)`, 50, y + 8)
      .text(`Intensity Mean:  ${analysis.statistics.mean.toFixed(2)} / 255`, 50, y + 24)
      .text(`Standard Deviation:  ${analysis.statistics.standardDeviation.toFixed(2)}`, 300, y + 8)
      .text(`Variance:  ${analysis.statistics.variance.toFixed(1)}`, 300, y + 24);

    y += 55;

    // LSB & Chi-Square Analysis
    doc.rect(40, y, 515, 60).stroke("#e2e8f0");
    doc.fontSize(8.5).font("Helvetica-Bold").fillColor(primaryColor)
      .text("LSB & Pairs-of-Values (PoV) Chi-Square Evaluation:", 50, y + 8);
    
    doc.font("Helvetica").fontSize(8).fillColor(mutedColor)
      .text(`Red Channel:    1s-Ratio: ${(analysis.lsb.red.onesRatio * 100).toFixed(1)}% | Bit Entropy: ${analysis.lsb.red.entropy.toFixed(3)} | PoV Chi-Square p-value: ${analysis.lsb.red.chiSquarePValue ?? "N/A"}`, 50, y + 22)
      .text(`Green Channel:  1s-Ratio: ${(analysis.lsb.green.onesRatio * 100).toFixed(1)}% | Bit Entropy: ${analysis.lsb.green.entropy.toFixed(3)} | PoV Chi-Square p-value: ${analysis.lsb.green.chiSquarePValue ?? "N/A"}`, 50, y + 34)
      .text(`Blue Channel:   1s-Ratio: ${(analysis.lsb.blue.onesRatio * 100).toFixed(1)}% | Bit Entropy: ${analysis.lsb.blue.entropy.toFixed(3)} | PoV Chi-Square p-value: ${analysis.lsb.blue.chiSquarePValue ?? "N/A"}`, 50, y + 46);

    y += 70;

    // Container & Trailing Data
    doc.rect(40, y, 515, 45).stroke("#e2e8f0");
    doc.fontSize(8.5).font("Helvetica").fillColor(primaryColor)
      .text(`Container Structure:  ${analysis.fileStructure.format} (${analysis.fileStructure.markersOrChunks.length} markers/chunks parsed)`, 50, y + 8)
      .text(`Trailing Bytes:  ${analysis.fileStructure.hasUnexpectedTrailingBytes ? `${analysis.fileStructure.trailingBytesCount} bytes detected past EOF` : "None (Clean container termination)"}`, 50, y + 22)
      .text(`Payload Signatures:  ${analysis.payloadDetection.detected ? `${analysis.payloadDetection.findings.length} signature(s) detected` : "None identified"}`, 300, y + 8);

    y += 55;

    // --- 3. Machine Learning Steganalysis ---
    doc.fillColor(accentColor).fontSize(11).font("Helvetica-Bold")
      .text("3. MACHINE LEARNING STEGANALYSIS (ALASKA2 EfficientNet-B0)", 40, y);
    y += 18;

    doc.rect(40, y, 515, 60).stroke("#e2e8f0");
    doc.fontSize(8.5).font("Helvetica").fillColor(primaryColor)
      .text(`Model Architecture:  ${analysis.ml.modelVersion || "ALASKA2 EfficientNet-B0"}`, 50, y + 8)
      .text(`Engine Status:  ${analysis.ml.status.toUpperCase()}`, 50, y + 22)
      .text(`Prediction:  ${analysis.ml.prediction ? analysis.ml.prediction.toUpperCase() : "N/A"}`, 50, y + 36)
      .text(`Steganalysis Probability:  ${analysis.ml.probability !== null ? (analysis.ml.probability * 100).toFixed(2) + "%" : "N/A"} (Threshold: ${analysis.ml.threshold ?? 0.22})`, 280, y + 8)
      .text(`Model Confidence:  ${analysis.ml.confidence ? analysis.ml.confidence.toUpperCase() : "N/A"}`, 280, y + 22)
      .text(`Benchmark AUC:  ROC-AUC: ${analysis.ml.metrics?.test_roc_auc?.toFixed(3) ?? 0.685} | Weighted: ${analysis.ml.metrics?.weighted_auc?.toFixed(3) ?? 0.767}`, 280, y + 36);

    y += 72;

    // Check page space for Overall Assessment
    if (y > 620) {
      doc.addPage();
      y = 40;
    }

    // --- 4. Synthesized Overall Assessment ---
    doc.fillColor(accentColor).fontSize(11).font("Helvetica-Bold")
      .text("4. FORENSIC SYNTHESIS & OVERALL ASSESSMENT", 40, y);
    y += 18;

    const assessmentText = analysis.risk.overallAssessment ||
      "Forensic evaluation completed across deterministic markers and neural classification models.";

    doc.rect(40, y, 515, 65).fill("#f1f5f9");
    doc.fillColor(primaryColor).fontSize(8.5).font("Helvetica")
      .text(assessmentText, 50, y + 10, { width: 495, lineGap: 3 });

    y += 80;

    // --- 5. Identified Findings & Evidence ---
    if (analysis.risk.findings && analysis.risk.findings.length > 0) {
      doc.fillColor(accentColor).fontSize(11).font("Helvetica-Bold")
        .text("5. ITEMIZED FINDINGS & EVIDENCE", 40, y);
      y += 18;

      for (const f of analysis.risk.findings.slice(0, 4)) {
        if (y > 720) {
          doc.addPage();
          y = 40;
        }
        const bulletColor = f.status === "suspicious" ? dangerColor : successColor;
        doc.circle(46, y + 4, 3).fill(bulletColor);
        doc.fillColor(primaryColor).fontSize(8.5).font("Helvetica-Bold")
          .text(`[${f.category.toUpperCase()}] ${f.title}`, 55, y);
        doc.fillColor(mutedColor).fontSize(8).font("Helvetica")
          .text(`${f.message}${f.evidence ? ` (Evidence: ${f.evidence})` : ""}`, 55, y + 11, { width: 490 });
        y += 26;
      }
    }

    // --- Footer / Disclaimer ---
    const footerY = 760;
    doc.rect(40, footerY, 515, 45).fill("#f8fafc");
    doc.fillColor(mutedColor).fontSize(7).font("Helvetica")
      .text("SCIENTIFIC DISCLAIMER & NOTICE: This report presents statistical steganalysis and container structure observations. " +
            "Unless an explicit payload has been extracted, integrity and probability indicators do not constitute absolute proof of malicious steganography. " +
            "Designed for verified forensic workflows, academic demonstration, and defensive cybersecurity auditing.", 45, footerY + 8, { width: 505, align: "center", lineGap: 2 });

    doc.end();
  });
}
