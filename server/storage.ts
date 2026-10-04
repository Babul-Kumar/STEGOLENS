import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { 
  type User, 
  type InsertUser, 
  type ScanReport, 
  type InsertScanReport,
  type Analysis,
  type InsertAnalysis
} from "@shared/schema";
import { SUSPICION_LEVELS, ML_STATUS } from "@shared/constants";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByWalletAddress(walletAddress: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Legacy scan report operations (kept for backward compatibility)
  getScanReport(id: number): Promise<ScanReport | undefined>;
  getScanReportsByUser(userId: number): Promise<ScanReport[]>;
  getScanReportByImageHash(imageHash: string): Promise<ScanReport | undefined>;
  createScanReport(report: InsertScanReport): Promise<ScanReport>;
  updateScanReport(id: number, updates: Partial<ScanReport>): Promise<ScanReport | undefined>;

  // StegoLens Analysis operations (Canonical)
  getAnalysis(id: number): Promise<Analysis | undefined>;
  getAnalyses(limit?: number, offset?: number): Promise<Analysis[]>;
  getAnalysesByUser(userId: number, limit?: number, offset?: number): Promise<Analysis[]>;
  getAnalysisByFileHash(fileHash: string): Promise<Analysis | undefined>;
  createAnalysis(analysis: InsertAnalysis): Promise<Analysis>;
  updateAnalysis(id: number, updates: Partial<Analysis>): Promise<Analysis | undefined>;
  deleteAnalysis(id: number, userId?: number): Promise<boolean>;
}

export class SqliteStorage implements IStorage {
  private db!: Database<sqlite3.Database, sqlite3.Statement>;
  private isInitialized = false;

  constructor() {}

  async init() {
    if (this.isInitialized) return;

    // Ensure data directory exists
    const fs = await import('fs/promises');
    const path = await import('path');
    const dataDir = path.join(process.cwd(), 'data');
    try {
      await fs.mkdir(dataDir, { recursive: true });
    } catch (err) {
      console.error('Failed to create data directory:', err);
      throw err;
    }

    this.db = await open({
      filename: path.join(dataDir, 'stegoguard.db'),
      driver: sqlite3.Database
    });

    // Create tables if not exist
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        email TEXT UNIQUE,
        passwordHash TEXT,
        walletAddress TEXT UNIQUE,
        nickname TEXT,
        role TEXT DEFAULT 'user' NOT NULL,
        createdAt TEXT NOT NULL
      );
    `);

    // Safely add missing columns to users table if upgrading from legacy
    const userColumns = ['username', 'email', 'passwordHash', 'role'];
    for (const col of userColumns) {
      try {
        await this.db.exec(`ALTER TABLE users ADD COLUMN ${col} TEXT;`);
      } catch {
        // Column already exists, safe to ignore
      }
    }

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS scanReports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        imageHash TEXT NOT NULL,
        ipfsHash TEXT,
        filename TEXT,
        fileSize INTEGER,
        threatDetected INTEGER,
        lsbAnalysis TEXT,
        metadata TEXT,
        heatmapUrl TEXT,
        blockchainTxHash TEXT,
        createdAt TEXT NOT NULL,
        FOREIGN KEY(userId) REFERENCES users(id)
      );
    `);

    // Canonical StegoLens analyses table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS analyses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        filename TEXT NOT NULL,
        fileHash TEXT NOT NULL,
        fileSize INTEGER NOT NULL,
        mimeType TEXT NOT NULL,
        width INTEGER,
        height INTEGER,
        status TEXT DEFAULT 'pending' NOT NULL,
        suspicionScore INTEGER DEFAULT 0 NOT NULL,
        riskLevel TEXT DEFAULT 'LOW' NOT NULL,
        mlStatus TEXT DEFAULT 'not_connected' NOT NULL,
        mlPrediction TEXT,
        mlProbability TEXT,
        mlConfidence TEXT,
        modelVersion TEXT,
        resultJson TEXT,
        errorMessage TEXT,
        createdAt TEXT NOT NULL,
        FOREIGN KEY(userId) REFERENCES users(id)
      );
    `);

    // Index on fileHash and userId for fast querying
    try {
      await this.db.exec(`CREATE INDEX IF NOT EXISTS idx_analyses_file_hash ON analyses(fileHash);`);
      await this.db.exec(`CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(userId);`);
    } catch {
      // Index creation safe fallback
    }

    this.isInitialized = true;
  }

  async getUser(id: number): Promise<User | undefined> {
    const row = await this.db.get("SELECT * FROM users WHERE id = ?", id);
    if (!row) return undefined;
    return this.rowToUser(row);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const row = await this.db.get("SELECT * FROM users WHERE LOWER(username) = LOWER(?)", username);
    if (!row) return undefined;
    return this.rowToUser(row);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const row = await this.db.get("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", email);
    if (!row) return undefined;
    return this.rowToUser(row);
  }

  async getUserByWalletAddress(walletAddress: string): Promise<User | undefined> {
    const row = await this.db.get("SELECT * FROM users WHERE LOWER(walletAddress) = LOWER(?)", walletAddress);
    if (!row) return undefined;
    return this.rowToUser(row);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const now = new Date().toISOString();
    const result = await this.db.run(
      `INSERT INTO users (username, email, passwordHash, walletAddress, nickname, role, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      insertUser.username || null,
      insertUser.email || null,
      insertUser.passwordHash || null,
      insertUser.walletAddress || null,
      insertUser.nickname || null,
      insertUser.role || 'user',
      now
    );
    return {
      id: result.lastID!,
      username: insertUser.username || null,
      email: insertUser.email || null,
      passwordHash: insertUser.passwordHash || null,
      walletAddress: insertUser.walletAddress || null,
      nickname: insertUser.nickname || null,
      role: insertUser.role || 'user',
      createdAt: new Date(now)
    };
  }

  // ==========================================
  // CANONICAL STEGOLENS ANALYSIS METHODS
  // ==========================================

  async getAnalysis(id: number): Promise<Analysis | undefined> {
    const row = await this.db.get("SELECT * FROM analyses WHERE id = ?", id);
    if (!row) return undefined;
    return this.rowToAnalysis(row);
  }

  async getAnalyses(limit = 50, offset = 0): Promise<Analysis[]> {
    const rows = await this.db.all(
      "SELECT * FROM analyses ORDER BY datetime(createdAt) DESC LIMIT ? OFFSET ?",
      limit,
      offset
    );
    return rows.map(this.rowToAnalysis);
  }

  async getAnalysesByUser(userId: number, limit = 50, offset = 0): Promise<Analysis[]> {
    const rows = await this.db.all(
      "SELECT * FROM analyses WHERE userId = ? ORDER BY datetime(createdAt) DESC LIMIT ? OFFSET ?",
      userId,
      limit,
      offset
    );
    return rows.map(this.rowToAnalysis);
  }

  async getAnalysisByFileHash(fileHash: string): Promise<Analysis | undefined> {
    const row = await this.db.get(
      "SELECT * FROM analyses WHERE fileHash = ? ORDER BY datetime(createdAt) DESC LIMIT 1",
      fileHash
    );
    if (!row) return undefined;
    return this.rowToAnalysis(row);
  }

  async createAnalysis(data: InsertAnalysis): Promise<Analysis> {
    const now = new Date().toISOString();
    const result = await this.db.run(
      `INSERT INTO analyses (
        userId, filename, fileHash, fileSize, mimeType, width, height, status,
        suspicionScore, riskLevel, mlStatus, mlPrediction, mlProbability, mlConfidence,
        modelVersion, resultJson, errorMessage, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      data.userId ?? null,
      data.filename,
      data.fileHash,
      data.fileSize,
      data.mimeType,
      data.width ?? null,
      data.height ?? null,
      data.status ?? 'pending',
      data.suspicionScore ?? 0,
      data.riskLevel ?? SUSPICION_LEVELS.LOW,
      data.mlStatus ?? ML_STATUS.NOT_CONNECTED,
      data.mlPrediction ?? null,
      data.mlProbability ?? null,
      data.mlConfidence ?? null,
      data.modelVersion ?? null,
      data.resultJson ?? null,
      data.errorMessage ?? null,
      now
    );

    return {
      id: result.lastID!,
      userId: data.userId ?? null,
      filename: data.filename,
      fileHash: data.fileHash,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      width: data.width ?? null,
      height: data.height ?? null,
      status: data.status ?? 'pending',
      suspicionScore: data.suspicionScore ?? 0,
      riskLevel: data.riskLevel ?? SUSPICION_LEVELS.LOW,
      mlStatus: data.mlStatus ?? ML_STATUS.NOT_CONNECTED,
      mlPrediction: data.mlPrediction ?? null,
      mlProbability: data.mlProbability ?? null,
      mlConfidence: data.mlConfidence ?? null,
      modelVersion: data.modelVersion ?? null,
      resultJson: data.resultJson ?? null,
      errorMessage: data.errorMessage ?? null,
      createdAt: new Date(now)
    };
  }

  async updateAnalysis(id: number, updates: Partial<Analysis>): Promise<Analysis | undefined> {
    const existing = await this.getAnalysis(id);
    if (!existing) return undefined;

    const merged = { ...existing, ...updates };
    await this.db.run(
      `UPDATE analyses SET 
        userId = ?, filename = ?, fileHash = ?, fileSize = ?, mimeType = ?, width = ?, height = ?, status = ?,
        suspicionScore = ?, riskLevel = ?, mlStatus = ?, mlPrediction = ?, mlProbability = ?, mlConfidence = ?,
        modelVersion = ?, resultJson = ?, errorMessage = ?
      WHERE id = ?`,
      merged.userId,
      merged.filename,
      merged.fileHash,
      merged.fileSize,
      merged.mimeType,
      merged.width,
      merged.height,
      merged.status,
      merged.suspicionScore,
      merged.riskLevel,
      merged.mlStatus,
      merged.mlPrediction,
      merged.mlProbability,
      merged.mlConfidence,
      merged.modelVersion,
      merged.resultJson,
      merged.errorMessage,
      id
    );

    return this.getAnalysis(id);
  }

  async deleteAnalysis(id: number, userId?: number): Promise<boolean> {
    let result;
    if (userId !== undefined) {
      result = await this.db.run("DELETE FROM analyses WHERE id = ? AND userId = ?", id, userId);
    } else {
      result = await this.db.run("DELETE FROM analyses WHERE id = ?", id);
    }
    return (result.changes ?? 0) > 0;
  }

  // ==========================================
  // LEGACY SCAN REPORTS (BACKWARD COMPATIBILITY)
  // ==========================================

  async getScanReport(id: number): Promise<ScanReport | undefined> {
    const row = await this.db.get("SELECT * FROM scanReports WHERE id = ?", id);
    if (!row) return undefined;
    return this.rowToScanReport(row);
  }

  async getScanReportsByUser(userId: number): Promise<ScanReport[]> {
    const rows = await this.db.all("SELECT * FROM scanReports WHERE userId = ? ORDER BY datetime(createdAt) DESC", userId);
    return rows.map(this.rowToScanReport);
  }

  async getScanReportByImageHash(imageHash: string): Promise<ScanReport | undefined> {
    const row = await this.db.get("SELECT * FROM scanReports WHERE imageHash = ?", imageHash);
    if (!row) return undefined;
    return this.rowToScanReport(row);
  }

  async createScanReport(insertReport: InsertScanReport): Promise<ScanReport> {
    const now = new Date().toISOString();
    const result = await this.db.run(
      "INSERT INTO scanReports (userId, imageHash, ipfsHash, filename, fileSize, threatDetected, lsbAnalysis, metadata, heatmapUrl, blockchainTxHash, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      insertReport.userId,
      insertReport.imageHash,
      insertReport.ipfsHash,
      insertReport.filename,
      insertReport.fileSize,
      insertReport.threatDetected ? 1 : 0,
      insertReport.lsbAnalysis || null,
      insertReport.metadata || null,
      insertReport.heatmapUrl || null,
      insertReport.blockchainTxHash || null,
      now
    );
    return {
      id: result.lastID!,
      userId: insertReport.userId ?? null,
      imageHash: insertReport.imageHash,
      ipfsHash: insertReport.ipfsHash || null,
      filename: insertReport.filename,
      fileSize: insertReport.fileSize,
      threatDetected: Boolean(insertReport.threatDetected),
      lsbAnalysis: insertReport.lsbAnalysis || null,
      metadata: insertReport.metadata || null,
      heatmapUrl: insertReport.heatmapUrl || null,
      blockchainTxHash: insertReport.blockchainTxHash || null,
      createdAt: new Date(now)
    };
  }

  async updateScanReport(id: number, updates: Partial<ScanReport>): Promise<ScanReport | undefined> {
    const existing = await this.getScanReport(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates };
    await this.db.run(
      "UPDATE scanReports SET userId = ?, imageHash = ?, ipfsHash = ?, filename = ?, fileSize = ?, threatDetected = ?, lsbAnalysis = ?, metadata = ?, heatmapUrl = ?, blockchainTxHash = ?, createdAt = ? WHERE id = ?",
      updated.userId,
      updated.imageHash,
      updated.ipfsHash,
      updated.filename,
      updated.fileSize,
      updated.threatDetected ? 1 : 0,
      updated.lsbAnalysis,
      updated.metadata,
      updated.heatmapUrl,
      updated.blockchainTxHash,
      updated.createdAt.toISOString(),
      id
    );
    return this.getScanReport(id);
  }

  private rowToUser(row: any): User {
    return {
      id: row.id,
      username: row.username || null,
      email: row.email || null,
      passwordHash: row.passwordHash || null,
      walletAddress: row.walletAddress || null,
      nickname: row.nickname || null,
      role: row.role || 'user',
      createdAt: new Date(row.createdAt)
    };
  }

  private rowToScanReport(row: any): ScanReport {
    return {
      id: row.id,
      userId: row.userId,
      imageHash: row.imageHash,
      ipfsHash: row.ipfsHash,
      filename: row.filename,
      fileSize: row.fileSize,
      threatDetected: !!row.threatDetected,
      lsbAnalysis: row.lsbAnalysis,
      metadata: row.metadata,
      heatmapUrl: row.heatmapUrl,
      blockchainTxHash: row.blockchainTxHash,
      createdAt: new Date(row.createdAt)
    };
  }

  private rowToAnalysis(row: any): Analysis {
    return {
      id: row.id,
      userId: row.userId ?? null,
      filename: row.filename,
      fileHash: row.fileHash,
      fileSize: row.fileSize,
      mimeType: row.mimeType,
      width: row.width ?? null,
      height: row.height ?? null,
      status: row.status,
      suspicionScore: row.suspicionScore,
      riskLevel: row.riskLevel,
      mlStatus: row.mlStatus,
      mlPrediction: row.mlPrediction ?? null,
      mlProbability: row.mlProbability ?? null,
      mlConfidence: row.mlConfidence ?? null,
      modelVersion: row.modelVersion ?? null,
      resultJson: row.resultJson ?? null,
      errorMessage: row.errorMessage ?? null,
      createdAt: new Date(row.createdAt)
    };
  }
}

// Export a singleton instance and initialize it
export const storage = new SqliteStorage();
storage.init();
