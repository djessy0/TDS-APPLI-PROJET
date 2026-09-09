
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function checkEntities() {
  const dbPath = process.env.DATABASE_PATH || "./tds_dt.db";
  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  
  console.log("Distinct entities in users table:");
  const entities = await db.all("SELECT DISTINCT entity FROM users");
  console.log(entities);
  
  await db.close();
}
checkEntities();
