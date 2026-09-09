
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function checkPassword() {
  const dbPath = process.env.DATABASE_PATH || "./tds_dt.db";
  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  
  const users = await db.all("SELECT trigram, firstname, lastname, password, role, entity, profil FROM users");
  console.log("ALL USERS:", JSON.stringify(users, null, 2));
  
  await db.close();
}
checkPassword();
