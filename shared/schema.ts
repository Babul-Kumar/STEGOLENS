import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { type SuspicionLevel, type MLStatus, SUSPICION_LEVELS, ML_STATUS } from "./constants";
export type { SuspicionLevel, MLStatus };

// Users table (Standard Auth + optional API key)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique(),
  email: text("email").unique(),
  passwordHash: text("password_hash"),
  nickname: text("nickname"),
  walletAddress: text("wallet_address"), // Preserved for backwards compatibility
  role: text("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Analyses table (Matches Phase 6 & Phase 20)
export const analyses = pgTable("analyses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  filename: text("filename").notNull(),
  fileHash: text("file_hash").notNull(), // SHA-256
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  width: integer("width"),
  height: integer("height"),
  status: text("status").default("pending").notNull(), // pending | completed | failed
  suspicionScore: integer("suspicion_score").default(0).notNull(), // 0 - 100
  riskLevel: text("risk_level").default(SUSPICION_LEVELS.LOW).notNull(),
  mlStatus: text("ml_status").default(ML_STATUS.NOT_CONNECTED).notNull(),
  mlPrediction: text("ml_prediction"),
  mlProbability: text("ml_probability"),
  mlConfidence: text("ml_confidence"),
  modelVersion: text("model_version"),
  resultJson: text("result_json"), // Full canonical JSON string
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Analysis findings table
export const analysisFindings = pgTable("analysis_findings", {
  id: serial("id").primaryKey(),
  analysisId: integer("analysis_id").references(() => analyses.id).notNull(),
  category: text("category").notNull(), // metadata | lsb | entropy | structure | payload | ml
  severity: text("severity").notNull(), // normal | suspicious | warning | error | info
  title: text("title").notNull(),
  message: text("message").notNull(),
  evidence: text("evidence"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Legacy scanReports table alias for backward compatibility with existing SQLite db
export const scanReports = pgTable("scan_reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  imageHash: text("image_hash").notNull(),
  ipfsHash: text("ipfs_hash"),
  filename: text("filename").notNull(),
  fileSize: integer("file_size").notNull(),
  threatDetected: boolean("threat_detected").default(false).notNull(),
  lsbAnalysis: text("lsb_analysis"),
  metadata: text("metadata"),
  heatmapUrl: text("heatmap_url"),
  blockchainTxHash: text("blockchain_tx_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const loginSchema = z.object({
  usernameOrEmail: z.string().min(1, "Username or email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(30),
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  nickname: z.string().optional(),
});

export const insertAnalysisSchema = createInsertSchema(analyses).omit({
  id: true,
  createdAt: true,
});

export const insertScanReportSchema = createInsertSchema(scanReports).omit({
  id: true,
  createdAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Analysis = typeof analyses.$inferSelect;
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type ScanReport = typeof scanReports.$inferSelect;
export type InsertScanReport = z.infer<typeof insertScanReportSchema>;

// ==========================================
// CANONICAL FORENSIC RESULT INTERFACE (PHASE 6)
// ==========================================

export interface ChannelStats {
  mean: number;
  variance: number;
  standardDeviation: number;
  min: number;
  max: number;
  uniqueValuesCount: number;
}

export interface LsbChannelDetail {
  channel: 'red' | 'green' | 'blue';
  onesRatio: number; // 0.0 to 1.0 (0.5 is expected for uniform random or noisy data)
  entropy: number; // Shannon entropy of LSB stream
  status: 'normal' | 'suspicious';
  chiSquarePValue?: number; // p-value for PoV (Pairs of Values) chi-square test
  indicatorScore: number; // 0 to 100 suspicion score
}

export interface LsbOverallAnalysis {
  status: 'normal' | 'suspicious';
  suspicionScore: number; // 0 to 100
  potentialPayloadDetected: boolean;
  printableRatio: number;
  decodedPreview: string | null;
  patternAnomaliesCount: number;
}

export interface FileStructureAnalysis {
  valid: boolean;
  format: string; // JPEG | PNG | WEBP | BMP | TIFF | UNKNOWN
  markersOrChunks: Array<{
    name: string;
    offset: number;
    size?: number;
    description?: string;
  }>;
  hasUnexpectedTrailingBytes: boolean;
  trailingBytesCount: number;
  trailingBytesPreview?: string;
  anomalies: string[];
}

export interface PayloadDetectionFinding {
  type: string; // ZIP, PDF, GZIP, RAR, 7Z, EXE, etc.
  offset: number;
  offsets?: number[];
  count?: number;
  description: string;
  severity: 'low' | 'medium' | 'high';
  confidence?: 'low' | 'medium' | 'high';
  location?: 'SIGNATURE_IN_TRAILING_DATA' | 'SIGNATURE_IN_IMAGE_STREAM';
}

export interface PayloadDetectionResult {
  detected: boolean;
  findings: PayloadDetectionFinding[];
}

export interface HistogramBin {
  intensity: number; // 0 - 255
  red: number;
  green: number;
  blue: number;
  grayscale?: number;
}

export interface AnalysisFindingItem {
  category: 'metadata' | 'lsb' | 'entropy' | 'structure' | 'payload' | 'ml';
  status: 'normal' | 'suspicious' | 'error' | 'not_available';
  title: string;
  message: string;
  evidence?: string;
  severity?: 'low' | 'medium' | 'high' | 'info';
  confidence?: 'low' | 'medium' | 'high' | 'info';
  count?: number;
  offsets?: number[];
}

export interface MLInferenceResult {
  status: MLStatus;
  prediction: 'stego' | 'cover' | 'suspicious' | 'clean' | null;
  probability: number | null; // e.g. 0.914
  confidence: 'high' | 'medium' | 'low' | null;
  modelVersion: string | null;
  disclaimer?: string;
  threshold?: number;
  description?: string;
  metrics?: {
    test_roc_auc?: number;
    val_roc_auc?: number;
    weighted_auc?: number;
  };
}

export interface AnalysisResult {
  id: number | string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;

  file: {
    name: string;
    format: string;
    mimeType: string;
    size: number;
    width: number;
    height: number;
    channels: number;
    sha256: string;
  };

  metadata: Record<string, string | number | boolean>;

  statistics: {
    entropy: number; // Pixel Intensity Entropy (0 to 8)
    mean: number;
    variance: number;
    standardDeviation: number;
  };

  channels: {
    red: ChannelStats;
    green: ChannelStats;
    blue: ChannelStats;
  };

  lsb: {
    red: LsbChannelDetail;
    green: LsbChannelDetail;
    blue: LsbChannelDetail;
    overall: LsbOverallAnalysis;
  };

  fileStructure: FileStructureAnalysis;

  payloadDetection: PayloadDetectionResult;

  visualizations: {
    histogram: HistogramBin[];
    bitPlanes?: Record<string, string>; // e.g. "red_0", "red_7", etc. (Base64 data URLs)
    heatmapUrl?: string | null;
    entropyMapUrl?: string | null;
  };

  ml: MLInferenceResult;

  risk: {
    score: number; // 0 - 100
    level: SuspicionLevel; // LOW, MODERATE, HIGH, VERY_HIGH
    findings: AnalysisFindingItem[];
    overallAssessment?: string;
    forensicScore?: number;
    mlScore?: number;
  };

  rawFindings?: string[];
}
