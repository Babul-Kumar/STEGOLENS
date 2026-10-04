import path from "path";
import { spawn } from "child_process";
import type { MLInferenceResult } from "@shared/schema";
import { ML_STATUS } from "@shared/constants";

/**
 * Executes ML inference via child process on the validated image.
 * Uses EfficientNet-B0 trained on ALASKA2 dataset.
 * Gracefully falls back to error state if ML runtime fails (forensics never blocked).
 */
export async function runMlInference(imagePath: string): Promise<MLInferenceResult> {
  return new Promise((resolve) => {
    const pythonScript = path.join(process.cwd(), "server", "python-service", "ml_engine.py");
    const pythonBin = process.env.PYTHON_BIN || (process.platform === "win32" ? "python" : "python3");

    const proc = spawn(pythonBin, [pythonScript, imagePath]);

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    proc.on("error", (err) => {
      resolve({
        status: ML_STATUS.ERROR,
        prediction: null,
        probability: null,
        confidence: null,
        modelVersion: "ALASKA2 EfficientNet-B0",
        disclaimer: `ML inference engine failed to start: ${err.message}`,
      });
    });

    proc.on("close", (code) => {
      if (code !== 0 && !stdout.trim()) {
        return resolve({
          status: ML_STATUS.ERROR,
          prediction: null,
          probability: null,
          confidence: null,
          modelVersion: "ALASKA2 EfficientNet-B0",
          disclaimer: `ML engine exited with code ${code}: ${stderr.slice(0, 200)}`,
        });
      }

      try {
        const parsed = JSON.parse(stdout.trim());
        if (parsed.status === "error" || parsed.error) {
          return resolve({
            status: ML_STATUS.ERROR,
            prediction: null,
            probability: null,
            confidence: null,
            modelVersion: "ALASKA2 EfficientNet-B0",
            disclaimer: parsed.error || "Unknown ML engine error",
          });
        }

        resolve({
          status: ML_STATUS.READY,
          prediction: parsed.prediction,
          probability: parsed.probability,
          confidence: parsed.confidence,
          modelVersion: parsed.modelVersion || "ALASKA2 EfficientNet-B0 (v1.0)",
          threshold: parsed.threshold,
          description: parsed.description,
          metrics: parsed.metrics,
          disclaimer: "ML prediction based on ALASKA2 EfficientNet-B0. Evaluates subtle feature distributions consistent with embedding algorithms.",
        });
      } catch (e: any) {
        resolve({
          status: ML_STATUS.ERROR,
          prediction: null,
          probability: null,
          confidence: null,
          modelVersion: "ALASKA2 EfficientNet-B0",
          disclaimer: `Failed to parse ML output: ${e.message}`,
        });
      }
    });
  });
}

/**
 * Performs startup/health self-test of the ML model.
 */
export async function checkMlHealth(): Promise<{ status: string; available: boolean; model?: string; error?: string }> {
  return new Promise((resolve) => {
    const pythonScript = path.join(process.cwd(), "server", "python-service", "ml_engine.py");
    const pythonBin = process.env.PYTHON_BIN || (process.platform === "win32" ? "python" : "python3");

    const proc = spawn(pythonBin, [pythonScript, "--health"]);

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    proc.on("error", (err) => {
      resolve({ status: "error", available: false, error: err.message });
    });

    proc.on("close", (code) => {
      try {
        const parsed = JSON.parse(stdout.trim());
        resolve(parsed);
      } catch (e: any) {
        resolve({ status: "error", available: false, error: stderr || e.message });
      }
    });
  });
}
