
import fs from 'fs';
import path from 'path';

const dbPath = process.env.DATABASE_PATH || "/var/local/tds_dt.db";
try {
  const stats = fs.statSync(dbPath);
  console.log(`Stats for ${dbPath}:`, stats);
  // Try to open it for writing
  const fd = fs.openSync(dbPath, 'r+');
  console.log("Successfully opened for reading/writing.");
  fs.closeSync(fd);
} catch (e) {
  console.error("Permission error:", e);
}
