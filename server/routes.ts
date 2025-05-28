import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertScanReportSchema } from "@shared/schema";
import multer from "multer";
import crypto from "crypto";
import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, and WEBP images are allowed.'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // User authentication routes
  app.post("/api/auth/connect", async (req, res) => {
    try {
      const { walletAddress, nickname } = insertUserSchema.parse(req.body);
      
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

  // Image upload and analysis routes
  app.post("/api/upload", upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const { walletAddress } = req.body;
      if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address required" });
      }

      let user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) {
        // Create user if they don't exist
        user = await storage.createUser({ walletAddress, nickname: null });
      }

      // Generate image hash
      const fileBuffer = await fs.readFile(req.file.path);
      const imageHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      // Check if image was already analyzed
      const existingReport = await storage.getScanReportByImageHash(imageHash);
      if (existingReport) {
        return res.json({ 
          reportId: existingReport.id,
          imageHash,
          message: "Image already analyzed"
        });
      }

      // Create initial scan report
      const scanReport = await storage.createScanReport({
        userId: user.id,
        imageHash,
        ipfsHash: '', // Will be updated after analysis
        filename: req.file.originalname || 'unknown',
        fileSize: req.file.size,
        threatDetected: false,
        lsbAnalysis: null,
        metadata: null,
        heatmapUrl: null,
        blockchainTxHash: null,
      });

      res.json({ 
        reportId: scanReport.id,
        imageHash,
        message: "Upload successful, starting analysis"
      });

      // Start background analysis
      analyzeImageAsync(scanReport.id, req.file.path);

    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: "Upload failed" });
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
    
    const pythonProcess = spawn('python3', [pythonServicePath, imagePath]);
    
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
        
        // Upload to IPFS (mock)
        const ipfsHash = `Qm${crypto.randomBytes(32).toString('hex').substring(0, 44)}`;
        
        // Update scan report with results
        await storage.updateScanReport(reportId, {
          threatDetected: analysisResult.threatDetected,
          lsbAnalysis: JSON.stringify(analysisResult.lsbAnalysis),
          metadata: JSON.stringify(analysisResult.metadata),
          heatmapUrl: analysisResult.heatmapUrl,
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
