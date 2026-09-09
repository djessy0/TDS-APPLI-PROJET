import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

async function main() {
  const dbPath = process.env.DATABASE_PATH || path.resolve(process.cwd(), "tds_dt.db");
  console.log("================================================================================");
  console.log("             CORRECTION DU DÉCALAGE DE DATES TDS (MR-TTA Active)                 ");
  console.log("================================================================================");
  console.log("Base de données cible :", dbPath);
  
  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  
  // Démarrer une transaction sécurisée
  await db.exec("BEGIN TRANSACTION");
  try {
    // Compter le nombre de lignes à modifier
    const queryToModifyCount = await db.get(`
      SELECT COUNT(*) as count 
      FROM tds_entries 
      WHERE is_sandbox = 0 
      AND date >= '2026-01-01'
      AND user_id IN (SELECT id FROM users WHERE entity = 'MR-TTA')
    `);
    
    console.log(`Nombre d'entrées actives trouvées pour MR-TTA : ${queryToModifyCount.count}`);
    
    if (queryToModifyCount.count === 0) {
      console.log("Aucune entrée correspondante à corriger.");
      await db.exec("ROLLBACK");
      return;
    }
    
    // Mettre à jour en avançant d'un jour
    const result = await db.run(`
      UPDATE tds_entries 
      SET date = date(date, '+1 day') 
      WHERE is_sandbox = 0 
      AND date >= '2026-01-01'
      AND user_id IN (SELECT id FROM users WHERE entity = 'MR-TTA')
    `);
    
    await db.exec("COMMIT");
    console.log("--------------------------------------------------------------------------------");
    console.log("SUCCÈS: Décalage de 1 jour corrigé avec succès !");
    console.log(`Nombre d'entrées SQL modifiées : ${result.changes}`);
    console.log("================================================================================");
  } catch (err: any) {
    await db.exec("ROLLBACK");
    console.error("ERREUR CRITIQUE lors de la correction :", err);
    process.exit(1);
  } finally {
    await db.close();
  }
}

main().catch(console.error);
