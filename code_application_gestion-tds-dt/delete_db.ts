
import fs from 'fs';
import path from 'path';

const dbPath = path.resolve(process.cwd(), "tds_dt.db");
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log("Deleted 0-byte database file.");
} else {
  console.log("File already gone.");
}
