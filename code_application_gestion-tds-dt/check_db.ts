
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

async function checkDb() {
    const dbPath = process.env.DATABASE_PATH || path.resolve(process.cwd(), "tds_dt.db");
    console.log("Checking DB at:", dbPath);
  
  try {
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
    console.log("Tables:", tables.map(t => t.name));

    const usersCount = await db.get("SELECT COUNT(*) as count FROM users");
    console.log("Users count:", usersCount.count);

    if (usersCount.count > 0) {
      const sampleUsers = await db.all("SELECT id, trigram, firstname, lastname, role FROM users LIMIT 5");
      console.log("Sample Users:", sampleUsers);
    }

    const tdsCount = await db.get("SELECT COUNT(*) as count FROM tds_entries");
    console.log("TDS Entries count:", tdsCount.count);

    if (tdsCount.count > 0) {
      const orphans = await db.get("SELECT COUNT(*) as count FROM tds_entries WHERE user_id NOT IN (SELECT id FROM users)");
      console.log("Orphaned TDS entries:", orphans.count);
    }

    await db.close();
  } catch (e) {
    console.error("Error checking DB:", e);
  }
}

checkDb();
