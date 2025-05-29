import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { users, scanReports, type User, type InsertUser, type ScanReport, type InsertScanReport } from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByWalletAddress(walletAddress: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Scan report operations
  getScanReport(id: number): Promise<ScanReport | undefined>;
  getScanReportsByUser(userId: number): Promise<ScanReport[]>;
  getScanReportByImageHash(imageHash: string): Promise<ScanReport | undefined>;
  createScanReport(report: InsertScanReport): Promise<ScanReport>;
  updateScanReport(id: number, updates: Partial<ScanReport>): Promise<ScanReport | undefined>;
}

export class SqliteStorage implements IStorage {
  private db!: Database<sqlite3.Database, sqlite3.Statement>;

  constructor() {}

  async init() {
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
    await this.db.exec("CREATE TABLE IF NOT EXISTS users (\
      id INTEGER PRIMARY KEY AUTOINCREMENT,\
      walletAddress TEXT UNIQUE NOT NULL,\
      nickname TEXT,\
      createdAt TEXT NOT NULL\
    );");

    await this.db.exec("CREATE TABLE IF NOT EXISTS scanReports (\
      id INTEGER PRIMARY KEY AUTOINCREMENT,\
      userId INTEGER NOT NULL,\
      imageHash TEXT NOT NULL,\
      ipfsHash TEXT,\
      filename TEXT,\
      fileSize INTEGER,\
      threatDetected INTEGER,\
      lsbAnalysis TEXT,\
      metadata TEXT,\
      heatmapUrl TEXT,\
      blockchainTxHash TEXT,\
      createdAt TEXT NOT NULL,\
      FOREIGN KEY(userId) REFERENCES users(id)\
    );");
  }

  async getUser(id: number): Promise<User | undefined> {
    const row = await this.db.get("SELECT * FROM users WHERE id = ?", id);
    if (!row) return undefined;
    return {
      id: row.id,
      walletAddress: row.walletAddress,
      nickname: row.nickname,
      createdAt: new Date(row.createdAt)
    };
  }

  async getUserByWalletAddress(walletAddress: string): Promise<User | undefined> {
    const row = await this.db.get("SELECT * FROM users WHERE LOWER(walletAddress) = LOWER(?)", walletAddress);
    if (!row) return undefined;
    return {
      id: row.id,
      walletAddress: row.walletAddress,
      nickname: row.nickname,
      createdAt: new Date(row.createdAt)
    };
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const now = new Date().toISOString();
    const result = await this.db.run(
      "INSERT INTO users (walletAddress, nickname, createdAt) VALUES (?, ?, ?)",
      insertUser.walletAddress,
      insertUser.nickname || null,
      now
    );
    return {
      id: result.lastID!,
      walletAddress: insertUser.walletAddress,
      nickname: insertUser.nickname || null,
      createdAt: new Date(now)
    };
  }

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
      userId: insertReport.userId,
      imageHash: insertReport.imageHash,
      ipfsHash: insertReport.ipfsHash,
      filename: insertReport.filename,
      fileSize: insertReport.fileSize,
      threatDetected: insertReport.threatDetected,
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
}

// Export an instance and initialize it
export const storage = new SqliteStorage();
storage.init();
