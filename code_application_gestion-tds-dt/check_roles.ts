
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function checkRoles() {
  const dbPath = process.env.DATABASE_PATH || "./tds_dt.db";
  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  
  console.log("Role distribution:");
  const roles = await db.all("SELECT role, COUNT(*) as count FROM users GROUP BY role");
  console.log(roles);
  
  await db.close();
}
checkRoles();
