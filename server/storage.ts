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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private scanReports: Map<number, ScanReport>;
  private currentUserId: number;
  private currentReportId: number;

  constructor() {
    this.users = new Map();
    this.scanReports = new Map();
    this.currentUserId = 1;
    this.currentReportId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByWalletAddress(walletAddress: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.walletAddress.toLowerCase() === walletAddress.toLowerCase(),
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      id,
      walletAddress: insertUser.walletAddress,
      nickname: insertUser.nickname || null,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async getScanReport(id: number): Promise<ScanReport | undefined> {
    return this.scanReports.get(id);
  }

  async getScanReportsByUser(userId: number): Promise<ScanReport[]> {
    return Array.from(this.scanReports.values())
      .filter(report => report.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getScanReportByImageHash(imageHash: string): Promise<ScanReport | undefined> {
    return Array.from(this.scanReports.values()).find(
      (report) => report.imageHash === imageHash,
    );
  }

  async createScanReport(insertReport: InsertScanReport): Promise<ScanReport> {
    const id = this.currentReportId++;
    const report: ScanReport = { 
      id,
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
      createdAt: new Date()
    };
    this.scanReports.set(id, report);
    return report;
  }

  async updateScanReport(id: number, updates: Partial<ScanReport>): Promise<ScanReport | undefined> {
    const report = this.scanReports.get(id);
    if (!report) return undefined;
    
    const updatedReport = { ...report, ...updates };
    this.scanReports.set(id, updatedReport);
    return updatedReport;
  }
}

export const storage = new MemStorage();
