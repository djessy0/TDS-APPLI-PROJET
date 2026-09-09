#!/bin/bash

# SCRIPT DE REPRISE EN CAS DE PLANTE OU CORRUPTION - TDS DT
# Ce script supprime tout, restaure la dernière archive saine et relance le serveur.

set -e

echo "========================================================="
echo "   SYSTÈME DE REPRISE APRÈS PLANTE (DISASTER RECOVERY)   "
echo "========================================================="

# 1. Aller dans le dossier de l'application
cd "$(dirname "$0")"
echo "Répertoire de travail : $(pwd)"

# 2. Vérifier s'il y a des sauvegardes de reprise
if [ ! -d "REPRISE" ] || [ -z "$(ls -A REPRISE/*.zip 2>/dev/null)" ]; then
    echo "ERREUR : Aucun fichier de sauvegarde trouvé dans le dossier 'REPRISE'."
    exit 1
fi

# 3. Identifier la dernière archive la plus récente
LATEST_ZIP=$(ls -t REPRISE/*.zip | head -n 1)
echo "Dernière sauvegarde saine identifiée : $LATEST_ZIP"

# 4. Copier cette archive vers un lieu temporaire hors du répertoire courant
TEMP_BACKUP_PATH="/tmp/reprise_temp_$(date +%s).zip"
cp "$LATEST_ZIP" "$TEMP_BACKUP_PATH"
echo "Fichier de sauvegarde sécurisé temporairement dans : $TEMP_BACKUP_PATH"

# 5. Suppression de TOUS les fichiers du répertoire courant pour éliminer les fichiers corrompus
echo "Nettoyage complet du répertoire de l'application..."
# On garde juste le script de reprise en cours d'exécution par sécurité
find . -mindepth 1 -maxdepth 1 ! -name 'reprise.sh' -exec rm -rf {} + 2>/dev/null || true
echo "Répertoire nettoyé."

# 6. Extraction de la sauvegarde saine
echo "Restauration des fichiers sains à partir de l'archive..."
unzip -o "$TEMP_BACKUP_PATH" -d .
echo "Fichiers restaurés avec succès !"

# 7. Nettoyage de l'archive temporaire
rm -f "$TEMP_BACKUP_PATH"

# 8. Réinstallation et relance propre de l'application
echo "Installation des dépendances d'origine..."
npm install --no-audit --no-fund || { echo "Avertissement : npm install a échoué."; }

echo "Recompilation de l'application (build)..."
npm run build || { echo "Avertissement : le build de l'application a échoué."; }

# 9. Relancement du serveur sur le port 3000
echo "Relancement du service de production..."
PORT=3000
export NODE_ENV=production

# On détecte si PM2 est configuré
if command -v pm2 &> /dev/null; then
    echo "PM2 détecté. Relancement avec PM2..."
    pm2 delete tds-dt 2>/dev/null || true
    pm2 delete tds_dt 2>/dev/null || true
    pm2 start dist/server.js --name "tds-dt" || pm2 start server.ts --name "tds-dt"
    echo "Application relancée avec succès avec PM2 !"
else
    echo "Relancement manuel (arrière-plan avec nohup)..."
    # Tuer tout processus sur le port 3000
    if command -v fuser &> /dev/null; then
        fuser -k $PORT/tcp 2>/dev/null || true
    elif command -v lsof &> /dev/null; then
        lsof -t -i:$PORT | xargs -r kill -9 2>/dev/null || true
    fi
    
    if [ -f "dist/server.js" ]; then
        nohup node dist/server.js > server.log 2>&1 &
    else
        nohup npx tsx server.ts > server.log 2>&1 &
    fi
    echo "Application relancée en arrière-plan !"
fi

echo "========================================================="
echo "   REPRISE DE L'APPLICATION ACHEVÉE AVEC SUCCÈS !      "
echo "========================================================="
