#!/bin/bash

# SCRIPT DE MISE À JOUR AUTOMATIQUE - TDS DT
# Ce script doit être exécuté sur le serveur de production

set -e # Arrête le script en cas d'erreur
echo "--- Démarrage de la mise à jour ---"

# 1. Aller dans le dossier de l'application
# On suppose que le script est dans /var/www/tds-dt/scripts/
cd "$(dirname "$0")/.."
echo "Répertoire de travail : $(pwd)"

# 2. Sauvegarde de la base de données (sécurité)
if [ -f "tds_dt.db" ]; then
    mkdir -p backups
    
    # On déplace les anciens backups de la racine vers le dossier backups s'ils existent
    find . -maxdepth 1 -name "tds_dt_backup_*.db" -exec mv {} backups/ \; 2>/dev/null || true
    
    # Nouvelle sauvegarde
    cp tds_dt.db "backups/tds_dt_backup_$(date +%Y%m%d_%H%M%S).db"
    echo "Sauvegarde effectuée dans le dossier 'backups'."
    
    # Nettoyage des sauvegardes de plus de 30 jours
    find backups/ -name "*.db" -type f -mtime +30 -delete
fi

# 2.5 Sauvegarde complète de l'application (Dossier REPRISE)
mkdir -p REPRISE
echo "Création d'une sauvegarde de reprise complète avant mise à jour..."
REPRISE_FILE="REPRISE/reprise_backup_$(date +%Y%m%d_%H%M%S).zip"

if command -v zip &> /dev/null; then
    # On archive tous les fichiers importants en excluant les dossiers lourds et les logs
    zip -r "$REPRISE_FILE" . -x "node_modules/*" "dist/*" ".git/*" "REPRISE/*" "backups/*" "LIVRABLE_PRODUCTION/*" "*.zip" "*.log" || echo "Note: avertissement non bloquant lors de la compression zip."
    echo "Sauvegarde complète de reprise enregistrée sous : $REPRISE_FILE"
    
    # Conserver uniquement les 10 dernières sauvegardes de reprise pour ne pas saturer le disque
    ls -t REPRISE/*.zip 2>/dev/null | tail -n +11 | xargs -r rm -f || true
else
    echo "Avertissement : l'outil 'zip' n'est pas installé, impossible de créer l'archive de reprise complète."
fi

# 3. Récupération des nouveaux fichiers depuis GitHub
# Chargement des variables .env pour GitHub et Proxy
if [ -f .env ]; then
    echo "Chargement du fichier .env..."
    # On exporte les variables proprement sans xargs pour gérer les espaces
    while IFS= read -r line || [ -n "$line" ]; do
        # On ignore les lignes vides et les commentaires
        if [[ ! "$line" =~ ^# ]] && [[ -n "$line" ]]; then
            # On ignore les erreurs de 'export' sur les lignes mal formées
            export "$line" 2>/dev/null || true
        fi
    done < .env
fi

# On s'assure que Git ne demande jamais de mot de passe interactif
export GIT_TERMINAL_PROMPT=0

if [ -n "$HTTPS_PROXY" ]; then
    # Nettoyer l'URL du proxy pour extraire l'hôte et le port
    PROXY_URL="${HTTPS_PROXY#http://}"
    PROXY_URL="${PROXY_URL#https://}"
    PROXY_HOST="${PROXY_URL%%:*}"
    PROXY_PORT="${PROXY_URL##*:}"
    PROXY_PORT="${PROXY_PORT%%/*}"
    
    echo "Vérification de la connectivité au proxy ${PROXY_HOST}:${PROXY_PORT}..."
    if timeout 2 bash -c "true &>/dev/null </dev/tcp/${PROXY_HOST}/${PROXY_PORT}" 2>/dev/null; then
        echo "Proxy joignable. Configuration du proxy appliquée."
        export http_proxy="$HTTPS_PROXY"
        export https_proxy="$HTTPS_PROXY"
        export HTTP_PROXY="$HTTPS_PROXY"
        export HTTPS_PROXY="$HTTPS_PROXY"
        
        # On configure Git localement pour ce dépôt
        if [ -d ".git" ]; then
            git config http.proxy "$HTTPS_PROXY"
            git config https.proxy "$HTTPS_PROXY"
            # On désactive la vérification SSL si le proxy est un proxy entreprise qui intercepte SSL
            # git config http.sslVerify false 
        fi
        
        # Config NPM
        npm config set proxy "$HTTPS_PROXY"
        npm config set https-proxy "$HTTPS_PROXY"
    else
        echo "Avertissement : Le proxy ${PROXY_HOST}:${PROXY_PORT} n'est pas joignable. Continuer en direct (sans proxy)."
        unset http_proxy
        unset https_proxy
        unset HTTP_PROXY
        unset HTTPS_PROXY
        if [ -d ".git" ]; then
            git config --unset http.proxy 2>/dev/null || true
            git config --unset https.proxy 2>/dev/null || true
        fi
        npm config delete proxy 2>/dev/null || true
        npm config delete https-proxy 2>/dev/null || true
    fi
fi

# Si le dossier n'est pas un dépôt Git, on l'initialise
if [ ! -d ".git" ]; then
    if [ -n "$GITHUB_REPO" ] && [ -n "$GITHUB_TOKEN" ]; then
        echo "Initialisation du dépôt Git pour $GITHUB_REPO..."
        git init
        # URL avec Token intégrée
        AUTH_URL="https://${GITHUB_TOKEN}@github.com/${GITHUB_REPO}.git"
        git remote add origin "$AUTH_URL"
        
        echo "Tentative de récupération initiale..."
        # On désactive l'interactivité pour Git
        export GIT_TERMINAL_PROMPT=0
        if git fetch origin main; then
            git checkout -f main
            echo "Dépôt initialisé avec succès."
        else
            echo "ERREUR : Échec de l'initialisation Git. Vérifiez votre TOKEN et Proxy."
            exit 1
        fi
    else
        echo "Note: GITHUB_REPO ou TOKEN manquant dans le .env."
    fi
fi

if [ -d ".git" ]; then
    echo "Configuration de l'URL d'authentification Git..."
    if [ -n "$GITHUB_TOKEN" ] && [ -n "$GITHUB_REPO" ]; then
        AUTH_URL="https://${GITHUB_TOKEN}@github.com/${GITHUB_REPO}.git"
        git remote set-url origin "$AUTH_URL"
    fi

    echo "Récupération des modifications GitHub (Force Reset)..."
    export GIT_TERMINAL_PROMPT=0
    
    if git fetch origin main 2>&1; then
        git reset --hard origin/main
        echo "Modifications GitHub récupérées."
        echo "Version package.json : $(grep '"version"' package.json | head -1 | cut -d'"' -f4)"
    else
        echo "--- ÉCHEC GIT FETCH ---"
        echo "Détails de la configuration :"
        echo "  REPO : $GITHUB_REPO"
        echo "  PROXY : ${HTTPS_PROXY:-Aucun}"
        echo "---"
        echo "ERREUR : Échec de la récupération des fichiers. Vérifiez le TOKEN."
        exit 1
    fi
fi

# 4. Installation des dépendances
echo "--- ÉTAPE 4 : Installation des dépendances ---"
echo "Installation des dépendances npm..."
npm install --no-audit --no-fund || { echo "ERREUR : Échec de l'installation des dépendances."; exit 1; }

# 5. Build de l'interface et du serveur
echo "--- ÉTAPE 5 : Build de l'interface et du serveur ---"
echo "Lancement du build de l'application (Vite + Server)..."
# On limite l'usage mémoire si possible pour éviter d'être "Killed" sur petit VPS
export NODE_OPTIONS="--max-old-space-size=1024"

# On s'assure que dist et LIVRABLE_PRODUCTION sont propres
rm -rf dist LIVRABLE_PRODUCTION

if npm run build:all; then
    echo "Build réussi."
    # Si le build a produit LIVRABLE_PRODUCTION au lieu de dist, on le renomme
    if [ -d "LIVRABLE_PRODUCTION" ] && [ ! -d "dist" ]; then
        echo "Détection de LIVRABLE_PRODUCTION, renommage en dist..."
        mv LIVRABLE_PRODUCTION dist
    elif [ -d "LIVRABLE_PRODUCTION" ] && [ -d "dist" ]; then
        echo "Fusion de LIVRABLE_PRODUCTION dans dist..."
        cp -r LIVRABLE_PRODUCTION/* dist/
    fi
else
    EXIT_CODE=$?
    echo "ERREUR : Le build a échoué (Code: $EXIT_CODE)."
    exit $EXIT_CODE
fi

# 6. Vérification du build
if [ ! -f "dist/server.js" ]; then
    echo "ERREUR : Le fichier 'dist/server.js' n'a pas été généré."
    ls -R dist || echo "Dossier dist introuvable."
    exit 1
fi

# 7. Redémarrage propre
PORT=3000
SERVER_CMD="dist/server.js"

if [ ! -f "$SERVER_CMD" ]; then
    echo "Avertissement : dist/server.js introuvable, tentative avec server.ts..."
    SERVER_CMD="server.ts"
fi

echo "Redémarrage du serveur en MODE PRODUCTION..."
export NODE_ENV=production

# On utilise un sous-processus détaché
(
    echo "Attente de 3 secondes avant le redémarrage..."
    sleep 3
    
    # On tente de nettoyer PM2 et les ports de manière AGRESSIVE
    echo "Nettoyage des anciens processus (port $PORT et noms PM2)..."
    
    # 1. Tuer tout ce qui écoute sur le port 3000 (le plus fiable)
    if command -v fuser &> /dev/null; then
        fuser -k $PORT/tcp 2>/dev/null || true
    elif command -v lsof &> /dev/null; then
        lsof -t -i:$PORT | xargs -r kill -9 2>/dev/null || true
    fi
    
    # 2. Nettoyer PM2
    if npx pm2 --version &> /dev/null; then
        npx pm2 delete tds-dt 2>/dev/null || true
        npx pm2 delete tds-dt-app 2>/dev/null || true
        npx pm2 delete tds_dt 2>/dev/null || true
    fi
    
    sleep 2
    
    echo "Lancement du nouveau serveur..."
    if npx pm2 --version &> /dev/null; then
        if [[ "$SERVER_CMD" == *.ts ]]; then
            npx pm2 start "npx tsx $SERVER_CMD" --name "tds-dt"
        else
            npx pm2 start "$SERVER_CMD" --name "tds-dt"
        fi
        echo "Serveur relancé avec PM2."
    else
        echo "Lancement via nohup..."
        if [[ "$SERVER_CMD" == *.ts ]]; then
            nohup npx tsx "$SERVER_CMD" > server.log 2>&1 &
        else
            nohup node "$SERVER_CMD" > server.log 2>&1 &
        fi
        echo "Serveur relancé en arrière-plan."
    fi

    # Check de santé
    sleep 5
    if curl -s http://localhost:$PORT/api/health > /dev/null; then
        echo "SUCCÈS : Le serveur est opérationnel."
    else
        echo "ATTENTION : Le serveur ne répond pas sur l'API health."
    fi
) &

echo "--- Mise à jour terminée (redémarrage en cours) ---"
exit 0
