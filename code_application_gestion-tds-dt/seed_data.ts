
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Détermination du chemin de la base de données (identique à server.ts)
let dbPath = path.resolve(__dirname, "tds_dt.db");
if (process.env.DISK_PATH) {
  dbPath = path.join(process.env.DISK_PATH, "tds_dt.db");
}

async function seed() {
  console.log(`Utilisation de la base de données : ${dbPath}`);
  
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  console.log("Nettoyage des entrées existantes...");
  await db.run("DELETE FROM tds_entries");
  await db.run("DELETE FROM leave_requests");

  console.log("Récupération des utilisateurs...");
  const users = await db.all("SELECT id, trigram, entity FROM users");
  console.log(`Nombre d'utilisateurs trouvés : ${users.length}`);

  if (users.length === 0) {
    console.error("Erreur : Aucun utilisateur trouvé. Lancez d'abord le serveur pour initialiser les comptes par défaut.");
    await db.close();
    return;
  }

  const startDate = new Date(2026, 3, 1); // 1er Avril 2026
  const endDate = new Date(2026, 4, 31);   // 31 Mai 2026

  console.log(`Génération des données du ${startDate.toISOString().split('T')[0]} au ${endDate.toISOString().split('T')[0]}...`);

  await db.exec("BEGIN TRANSACTION");

  for (const user of users) {
    let d = new Date(startDate);
    while (d <= endDate) {
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      let status = '';

      if (user.entity === 'MR-TTA') {
        if (isWeekend) {
          status = Math.random() > 0.9 ? 'W' : 'OFF';
        } else {
          const rand = Math.random();
          if (rand < 0.7) status = 'SEC';
          else if (rand < 0.85) status = 'TLT';
          else if (rand < 0.9) status = 'FOR';
          else if (rand < 0.95) status = 'MIS';
          else status = 'CA';
        }
      } else if (user.entity === 'MR-MGA') {
        if (isWeekend) {
          status = Math.random() > 0.95 ? 'AST' : 'OFF';
        } else {
          const rand = Math.random();
          if (rand < 0.7) status = 'TRV';
          else if (rand < 0.85) status = 'TLT';
          else if (rand < 0.9) status = 'AST';
          else if (rand < 0.95) status = 'MIS';
          else status = 'ABS_V';
        }
      } else { // Siège
        if (isWeekend) {
          status = 'OFF';
        } else {
          const rand = Math.random();
          if (rand < 0.7) status = 'PRE';
          else if (rand < 0.9) status = 'TLT';
          else if (rand < 0.95) status = 'MIS';
          else status = 'RTT';
        }
      }

      await db.run(`
        INSERT INTO tds_entries (user_id, date, status, is_sandbox)
        VALUES (?, ?, ?, 0)
      `, [user.id, dateStr, status]);

      if (['CA', 'RTT', 'REC', 'ABS_V'].includes(status)) {
        await db.run(`
          INSERT INTO leave_requests (user_id, start_date, end_date, type, status)
          VALUES (?, ?, ?, ?, ?)
        `, [user.id, dateStr, dateStr, status, 'approved_dt']);
      }

      d.setDate(d.getDate() + 1);
    }
  }

  await db.exec("COMMIT");
  console.log("Données générées avec succès.");
  
  const count = await db.get("SELECT COUNT(*) as count FROM tds_entries");
  console.log(`Total des entrées créées : ${count.count}`);

  await db.close();
}

seed().catch(console.error);
