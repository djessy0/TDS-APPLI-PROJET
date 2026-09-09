
import fs from 'fs';
import path from 'path';

function checkFiles() {
  const dbPath = path.resolve(process.cwd(), "tds_dt.db");
  const backupDir = path.resolve(process.cwd(), "backups");
  
  if (fs.existsSync(dbPath)) {
    const stats = fs.statSync(dbPath);
    console.log(`dbPath: ${dbPath}, size: ${stats.size} bytes`);
  } else {
    console.log(`dbPath: ${dbPath} DOES NOT EXIST`);
  }

  if (fs.existsSync(backupDir)) {
    const files = fs.readdirSync(backupDir);
    console.log(`Backups in ${backupDir}:`, files);
    files.forEach(f => {
      const s = fs.statSync(path.join(backupDir, f));
      console.log(`  - ${f}: ${s.size} bytes`);
    });
  } else {
    console.log(`backupDir: ${backupDir} DOES NOT EXIST`);
  }
}

checkFiles();
