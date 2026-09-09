
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function checkHiddenChars() {
  const dbPath = process.env.DATABASE_PATH || "./tds_dt.db";
  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  
  const users = await db.all("SELECT id, trigram FROM users");
  users.forEach(u => {
    if (u.trigram.trim() !== u.trigram) {
      console.log(`User ID ${u.id} has trigram with spaces: '${u.trigram}'`);
    }
    if (/[^A-Z]/.test(u.trigram)) {
      console.log(`User ID ${u.id} has non-AZ trigram: '${u.trigram}'`);
    }
  });
  
  console.log("Check complete.");
  await db.close();
}
checkHiddenChars();
