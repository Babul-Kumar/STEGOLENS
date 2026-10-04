import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertScanReportSchema } from "@shared/schema";
import multer from "multer";
import crypto from "crypto";
import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";

// Extend Express Request type to include 'file' and 'files' for multer
declare global {
  namespace Express {
    interface Request {
      file?: Express.Multer.File;
      files?: { [fieldname: string]: Express.Multer.File[] } | Express.Multer.File[];
    }
  }
}


import fsSync from "fs";
import { uploadRateLimiter } from "./security";
import { sanitizeOriginalFilename, validateUploadedFile } from "./upload-validator";
import { UPLOAD_LIMITS, ML_STATUS } from "@shared/constants";
import type { AnalysisResult } from "@shared/schema";
import { analyzeImage } from "./forensics/analyze-image";
import { generateForensicPdfReport } from "./forensics/pdf-report-generator";
import { checkMlHealth } from "./forensics/ml-service";

// Ensure uploads directory exists
const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fsSync.existsSync(uploadsDir)) {
  fsSync.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer with safe disk storage using random UUIDs
const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, _file, cb) => {
    // Safe server-side filename - never use user-supplied filename
    cb(null, `${crypto.randomUUID()}.tmp`);
  },
});

const upload = multer({
  storage: diskStorage,
  limits: {
    fileSize: UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES, // 15 MB centralized constant
    files: 1,
  },
});

// Middleware wrapper to handle multer errors cleanly with standardized JSON error codes
function handleUploadMiddleware(req: any, res: any, next: any) {
  upload.single('image')(req, res, (err: any) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'File exceeds the 15 MB upload limit.',
          },
        });
      }
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: err.message || 'Invalid upload request.',
        },
      });
    }
    next();
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // User authentication routes
  app.post("/api/auth/connect", async (req, res) => {
    try {
      const { walletAddress, nickname } = req.body;
      if (!walletAddress || typeof walletAddress !== 'string') {
        return res.status(400).json({ error: "Invalid wallet address" });
      }
      
      let user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) {
        user = await storage.createUser({ walletAddress, nickname });
      }
      
      res.json({ user });
    } catch (error) {
      res.status(400).json({ error: "Invalid wallet address or data" });
    }
  });

  app.get("/api/auth/user/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const user = await storage.getUserByWalletAddress(walletAddress);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Secure Image Upload & Inspection Endpoint (Phase D)
  app.post("/api/upload", uploadRateLimiter, handleUploadMiddleware, async (req, res) => {
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "No image file provided in upload request.",
        },
      });
    }

    const tempFilePath = file.path;
    const originalName = file.originalname || 'unknown';
    const sanitizedName = sanitizeOriginalFilename(originalName);

    try {
      // 1. Read file to compute SHA-256 fingerprint
      const fileBuffer = await fs.readFile(tempFilePath);
      const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      // 2. Execute full validation pipeline (size, magic bytes, MIME, decoding, dimensions, decompression safety)
      const validation = await validateUploadedFile(
        tempFilePath,
        originalName,
        file.size,
        file.mimetype
      );

      if (!validation.valid) {
        const statusCode = 
          validation.code === 'FILE_TOO_LARGE' ? 413 :
          validation.code === 'UNSUPPORTED_FORMAT' ? 415 :
          validation.code === 'IMAGE_TOO_LARGE' ? 422 : 400;

        return res.status(statusCode).json({
          error: {
            code: validation.code,
            message: validation.message,
          },
        });
      }

      // 3. Return sanitized file metadata on successful validation
      return res.json({
        success: true,
        file: {
          id: crypto.randomUUID(),
          originalFilename: sanitizedName,
          format: validation.format,
          mimeType: validation.mimeType,
          size: file.size,
          width: validation.width,
          height: validation.height,
          sha256,
          uploadedAt: new Date().toISOString(),
        },
        message: "File successfully verified against all security and integrity standards.",
      });

    } catch (err: any) {
      console.error('Upload processing error:', err.message);
      return res.status(500).json({
        error: {
          code: "ANALYSIS_FAILED",
          message: "An unexpected error occurred while validating the uploaded file.",
        },
      });
    } finally {
      // Ephemeral cleanup: NEVER leave temporary files on disk
      if (tempFilePath) {
        await fs.unlink(tempFilePath).catch(() => {});
      }
    }
  });

  // Forensic Extraction & Analysis Pipeline Endpoint (Phase E)
  app.post("/api/analyze", uploadRateLimiter, handleUploadMiddleware, async (req, res) => {
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "No image file provided in analysis request.",
        },
      });
    }

    const tempFilePath = file.path;
    const originalName = file.originalname || "unknown";
    const sanitizedName = sanitizeOriginalFilename(originalName);

    try {
      // 1. Enforce Phase D secure validation
      const validation = await validateUploadedFile(
        tempFilePath,
        originalName,
        file.size,
        file.mimetype
      );

      if (!validation.valid) {
        const statusCode = 
          validation.code === 'FILE_TOO_LARGE' ? 413 :
          validation.code === 'UNSUPPORTED_FORMAT' ? 415 :
          validation.code === 'IMAGE_TOO_LARGE' ? 422 : 400;

        return res.status(statusCode).json({
          error: {
            code: validation.code,
            message: validation.message,
          },
        });
      }

      // 2. Execute deterministic Phase E forensic extraction pipeline
      const analysisResult = await analyzeImage(
        tempFilePath,
        sanitizedName,
        file.size,
        validation.mimeType,
        validation.format
      );

      // 3. Persist analysis result in database
      const saved = await storage.createAnalysis({
        userId: null,
        filename: sanitizedName,
        fileHash: analysisResult.file.sha256,
        fileSize: file.size,
        mimeType: validation.mimeType,
        width: analysisResult.file.width,
        height: analysisResult.file.height,
        status: "completed",
        suspicionScore: analysisResult.risk.score,
        riskLevel: analysisResult.risk.level,
        mlStatus: analysisResult.ml.status,
        mlPrediction: analysisResult.ml.prediction,
        mlProbability: analysisResult.ml.probability !== null ? analysisResult.ml.probability.toString() : null,
        mlConfidence: analysisResult.ml.confidence,
        modelVersion: analysisResult.ml.modelVersion,
        resultJson: JSON.stringify(analysisResult),
        errorMessage: null,
      });

      analysisResult.id = saved.id;

      return res.json({
        success: true,
        analysis: analysisResult,
      });

    } catch (err: any) {
      console.error("Forensic analysis error:", err.message);
      return res.status(500).json({
        error: {
          code: "ANALYSIS_FAILED",
          message: "An unexpected error occurred during forensic extraction.",
        },
      });
    } finally {
      // Ephemeral cleanup: guaranteed unlinking of temporary file
      if (tempFilePath) {
        await fs.unlink(tempFilePath).catch(() => {});
      }
    }
  });

  // List recent analyses (with pagination)
  app.get("/api/analyses", async (req, res) => {
    try {
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
      const offset = Math.max(0, parseInt(req.query.offset as string, 10) || 0);
      const records = await storage.getAnalyses(limit, offset);
      return res.json({
        analyses: records,
        limit,
        offset,
        count: records.length,
      });
    } catch (err: any) {
      return res.status(500).json({
        error: { code: "SERVER_ERROR", message: "Failed to list analyses." },
      });
    }
  });

  // Get canonical analysis by ID
  app.get("/api/analyses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: { code: "INVALID_REQUEST", message: "Invalid analysis ID." } });
      }

      const record = await storage.getAnalysis(id);
      if (!record) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Analysis report not found." } });
      }

      if (record.resultJson) {
        const fullResult = JSON.parse(record.resultJson);
        return res.json({ analysis: fullResult });
      }

      return res.json({ analysis: record });
    } catch (err: any) {
      return res.status(500).json({ error: { code: "SERVER_ERROR", message: "Failed to retrieve analysis." } });
    }
  });

  // Delete analysis by ID
  app.delete("/api/analyses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: { code: "INVALID_REQUEST", message: "Invalid analysis ID." } });
      }

      const deleted = await storage.deleteAnalysis(id);
      if (!deleted) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Analysis record not found." } });
      }

      return res.json({ success: true, message: `Analysis ${id} deleted successfully.` });
    } catch (err: any) {
      return res.status(500).json({ error: { code: "SERVER_ERROR", message: "Failed to delete analysis." } });
    }
  });

  // Export forensic report (PDF or JSON)
  app.get("/api/analyses/:id/report", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: { code: "INVALID_REQUEST", message: "Invalid analysis ID." } });
      }

      const record = await storage.getAnalysis(id);
      if (!record || !record.resultJson) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Analysis record not found." } });
      }

      const analysis: AnalysisResult = JSON.parse(record.resultJson);
      const format = (req.query.format as string) || "pdf";

      if (format === "json") {
        res.setHeader("Content-Disposition", `attachment; filename="stegolens-report-${analysis.file.name}.json"`);
        res.setHeader("Content-Type", "application/json");
        return res.send(record.resultJson);
      }

      const pdfBuffer = await generateForensicPdfReport(analysis);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="stegolens-report-${analysis.file.name}.pdf"`);
      return res.send(pdfBuffer);
    } catch (err: any) {
      console.error("Report generation error:", err);
      return res.status(500).json({ error: { code: "REPORT_FAILED", message: "Failed to generate forensic report." } });
    }
  });

  // Health Check Endpoint (Application, Database, Forensics, and ML)
  app.get("/api/health", async (_req, res) => {
    try {
      const mlHealth = await checkMlHealth();
      return res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        version: "2.0.0",
        services: {
          database: {
            type: "sqlite",
            status: "connected",
          },
          forensics: {
            status: "ready",
            capabilities: ["exif", "shannon_entropy", "histogram", "lsb_pov_chisquare", "container_markers", "signatures"],
          },
          ml: mlHealth,
        },
      });
    } catch (err: any) {
      return res.status(500).json({
        status: "degraded",
        error: err.message,
      });
    }
  });

  // Get analysis results
  app.get("/api/analysis/:reportId", async (req, res) => {
    try {
      const reportId = parseInt(req.params.reportId);
      const report = await storage.getScanReport(reportId);
      
      if (!report) {
        return res.status(404).json({ error: "Analysis report not found" });
      }
      
      res.json({ report });
    } catch (error) {
      res.status(500).json({ error: "Failed to get analysis results" });
    }
  });

  // Get user scan history
  app.get("/api/history/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const user = await storage.getUserByWalletAddress(walletAddress);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const reports = await storage.getScanReportsByUser(user.id);
      res.json({ reports });
    } catch (error) {
      res.status(500).json({ error: "Failed to get scan history" });
    }
  });

  // Get dashboard stats
  app.get("/api/stats/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const user = await storage.getUserByWalletAddress(walletAddress);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const reports = await storage.getScanReportsByUser(user.id);
      const totalScans = reports.length;
      const threatsDetected = reports.filter(r => r.threatDetected).length;
      const cleanImages = totalScans - threatsDetected;
      
      res.json({
        totalScans,
        threatsDetected,
        cleanImages,
        avgScanTime: "2.3s" // Mock for now
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get stats" });
    }
  });

  // IPFS upload simulation
  app.post("/api/ipfs/upload", async (req, res) => {
    try {
      const { reportData } = req.body;
      
      // Mock IPFS hash generation
      const ipfsHash = `Qm${crypto.randomBytes(32).toString('hex').substring(0, 44)}`;
      
      res.json({ ipfsHash });
    } catch (error) {
      res.status(500).json({ error: "IPFS upload failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

async function analyzeImageAsync(reportId: number, imagePath: string) {
  try {
    // Call Python analysis service
    const pythonServicePath = path.join(process.cwd(), 'server', 'python-service', 'app.py');
    const pythonBin = process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3');
    
    const pythonProcess = spawn(pythonBin, [pythonServicePath, imagePath]);
    
    let result = '';
    let error = '';
    
    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    pythonProcess.on('close', async (code) => {
      try {
        if (code !== 0) {
          console.error('Python analysis failed:', error);
          return;
        }
        
        const analysisResult = JSON.parse(result);

        // Upload heatmap image to IPFS (mock)
        let heatmapIpfsHash = null;
        if (analysisResult.heatmapUrl) {
          // In real scenario, upload heatmap image file to IPFS here
          heatmapIpfsHash = `Qm${crypto.randomBytes(32).toString('hex').substring(0, 44)}`;
        }
        
        // Upload main report to IPFS (mock)
        const ipfsHash = `Qm${crypto.randomBytes(32).toString('hex').substring(0, 44)}`;
        
        // Update scan report with results and heatmap IPFS URL
        await storage.updateScanReport(reportId, {
          threatDetected: analysisResult.threatDetected,
          lsbAnalysis: JSON.stringify(analysisResult.lsbAnalysis),
          metadata: JSON.stringify(analysisResult.metadata),
          heatmapUrl: heatmapIpfsHash ? `https://ipfs.io/ipfs/${heatmapIpfsHash}` : null,
          ipfsHash,
          blockchainTxHash: `0x${crypto.randomBytes(32).toString('hex')}`,
        });
        
        // Clean up uploaded file
        await fs.unlink(imagePath).catch(() => {});
        
      } catch (parseError) {
        console.error('Failed to parse analysis result:', parseError);
      }
    });
    
  } catch (error) {
    console.error('Analysis failed:', error);
  }
}
