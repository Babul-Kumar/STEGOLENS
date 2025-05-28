import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address").notNull().unique(),
  nickname: text("nickname"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const scanReports = pgTable("scan_reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  imageHash: text("image_hash").notNull(),
  ipfsHash: text("ipfs_hash").notNull(),
  filename: text("filename").notNull(),
  fileSize: integer("file_size").notNull(),
  threatDetected: boolean("threat_detected").notNull(),
  lsbAnalysis: text("lsb_analysis"), // JSON string
  metadata: text("metadata"), // JSON string
  heatmapUrl: text("heatmap_url"),
  blockchainTxHash: text("blockchain_tx_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertScanReportSchema = createInsertSchema(scanReports).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertScanReport = z.infer<typeof insertScanReportSchema>;
export type ScanReport = typeof scanReports.$inferSelect;
