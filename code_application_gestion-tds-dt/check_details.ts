
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function checkDetails() {
  const dbPath = process.env.DATABASE_PATH || "./tds_dt.db";
  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  
  console.log("Checking TDS entries...");
  const entries = await db.all("SELECT * FROM tds_entries LIMIT 10");
  console.log(entries);
  
  const today = new Date().toISOString().split('T')[0];
  console.log("Entries for 'today' or similar:", today);
  const todays = await db.all("SELECT * FROM tds_entries WHERE date LIKE ?", [`%${today.split('-')[0]}-${today.split('-')[1]}%`]);
  console.log("Count for current month:", todays.length);
  
  await db.close();
}
checkDetails();
