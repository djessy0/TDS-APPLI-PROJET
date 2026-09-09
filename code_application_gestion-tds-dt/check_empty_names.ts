
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function checkEmptyNames() {
  const dbPath = process.env.DATABASE_PATH || "./tds_dt.db";
  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  
  const badUsers = await db.all("SELECT id, trigram, firstname, lastname FROM users WHERE firstname = '' OR lastname = '' OR firstname IS NULL OR lastname IS NULL");
  console.log("Users with missing names:", badUsers.length);
  if (badUsers.length > 0) console.log(badUsers);
  
  await db.close();
}
checkEmptyNames();
