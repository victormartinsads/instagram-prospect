import { execSql, closeDb } from "@/db/connection";
import fs from "fs";
import path from "path";

const BACKUP_DIR = path.join(process.cwd(), "backups");

export async function createBackup(): Promise<string> {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFilename = `prospector-${timestamp}.db`;
  const backupPath = path.join(BACKUP_DIR, backupFilename);

  // Use VACUUM INTO for atomic backup of SQLite DB
  await execSql(`VACUUM INTO '${backupPath}'`);

  return backupFilename;
}

export function listBackups(): string[] {
  if (!fs.existsSync(BACKUP_DIR)) {
    return [];
  }

  const files = fs.readdirSync(BACKUP_DIR);
  return files
    .filter((f) => f.startsWith("prospector-") && f.endsWith(".db"))
    .sort()
    .reverse(); // Newest first
}

export function restoreBackup(filename: string): void {
  const backupPath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found: ${filename}`);
  }

  const dbPath = process.env.DATABASE_URL || "./data/prospector.db";

  // Close the active connection
  closeDb();

  // Copy backup file over the active DB
  fs.copyFileSync(backupPath, dbPath);

  // WAL and SHM files should be removed to avoid corruption
  const walPath = `${dbPath}-wal`;
  const shmPath = `${dbPath}-shm`;
  if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
  if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
}

export function cleanOldBackups(keepCount: number): void {
  const backups = listBackups();
  if (backups.length <= keepCount) {
    return;
  }

  const toDelete = backups.slice(keepCount);
  for (const filename of toDelete) {
    const filePath = path.join(BACKUP_DIR, filename);
    fs.unlinkSync(filePath);
  }
}
