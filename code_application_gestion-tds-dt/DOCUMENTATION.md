# Documentation Technique et Guide d'Administration : TDS-DT

---

## 📖 1. Présentation de l'Application
L'application **TDS-DT** (Tableau de Service - Division Technique) est un outil de gestion web conçu pour la DAC-NC. Elle permet de :
- Gérer les agents de la division.
- Planifier les services et les astreintes.
- Visualiser les congés et absences.
- Générer des rapports de service au format PDF.
- Suivre les cycles de travail spécifiques à l'aviation civile.

---

## 🛠️ 2. Choix des Solutions Techniques
Nous avons privilégié des technologies **légères, robustes et sans installation lourde** pour faciliter la maintenance sur un serveur interne :

- **Backend (Serveur) : Node.js & Express**
    - *Pourquoi ?* Rapidité de développement, gestion asynchrone des requêtes et facilité de déploiement en tant que service léger.
- **Frontend (Interface) : React 19 & Tailwind CSS**
    - *Pourquoi ?* Interface réactive (SPA), design moderne et responsive. Tailwind permet de modifier le style sans créer de fichiers CSS complexes.
- **Base de Données : SQLite**
    - *Pourquoi ?* Contrairement à MySQL ou PostgreSQL, SQLite ne nécessite pas de serveur de base de données séparé. Les données sont stockées dans un **simple fichier** (`tds_dt.db`). C'est la solution idéale pour une application interne de cette taille.
- **Proxy Inverse : Nginx**
    - *Pourquoi ?* Gère la sécurité, le nom de domaine DNS (`dt.dac-nc.aviation`) et redirige le flux vers l'application sur le port 3000.

---

## 🏗️ 3. Architecture Logicielle
L'application suit une architecture **Client-Serveur (Full-Stack)** :

1.  **Le Client (Navigateur)** : L'utilisateur charge l'interface React. Les interactions sont fluides et instantanées.
2.  **L'API (Serveur)** : Le serveur Express reçoit les requêtes du client (ex: "Enregistrer une absence") et interagit avec la base de données.
3.  **La Persistance** : Le moteur SQLite écrit les changements dans le fichier binaire local.

---

## 📂 4. Rôle des Fichiers et Dossiers Principaux

| Fichier / Dossier | Rôle |
| :--- | :--- |
| `/dist/` | **INDISPENSABLE**. Contient le code compilé prêt pour la production (index.html, server.js, assets). |
| `/scripts/` | Contient les scripts serveurs, notamment `update-prod.sh` pour la mise à jour automatique. |
| `server.ts` | Code source du serveur (logique métier, routes API, authentification). |
| `src/App.tsx` | Cœur de l'interface utilisateur (React). |
| `src/main.tsx` | Point d'entrée technique du frontend. |
| `public/` | Stockage des assets (logo `logo.png`, fond d'écran `background.jpg`). |
| `tds_dt.db` | **LA BASE DE DONNÉES**. Contient absolument toutes les données saisies. |
| `package.json` | Liste les dépendances et les scripts de démarrage. |
| `DOCUMENTATION.md`| Ce guide d'administration. |

---

## 📝 5. Guide de Mise à Jour (Cycle Simplifié)

Une procédure automatisée a été mise en place pour réduire les erreurs de manipulation sur le serveur réel (VPS).

### A. Procédure Automatisée (Recommandée)
1. **Dans AI Studio** : Modifiez votre code.
2. **Génération du livrable** : Lancez `npm run build:all` dans le terminal AI Studio.
3. **Transfert** : Copiez le contenu du dossier `/dist/` vers le dossier cible de votre serveur (ex: `/var/www/tds-dt/`).
4. **Activation** : 
   - Connectez-vous à l'application avec un compte **ADMINISTRATEUR**.
   - Allez dans l'onglet **Administration** > **Système**.
   - Cliquez sur le bouton **"Mettre à jour le serveur réel"**.
   - L'application exécutera le script, fera une sauvegarde de la base de données, et redémarrera le serveur.

### C. Synchronisation GitHub (Nouveauté)
L'application peut désormais vérifier si une mise à jour est disponible sur votre dépôt GitHub.
1. Configurez la variable `GITHUB_REPO` dans votre fichier `.env` sur le serveur (ex: `demba-ndiaye/gestion-tds-dt`).
2. Lorsqu'une version supérieure est détectée dans le `package.json` de votre GitHub, un badge **"MISE À JOUR DISPONIBLE"** apparaîtra dans votre panneau d'administration.
3. Cliquez sur le badge pour accéder au dépôt et préparer votre transfert.

### B. Procédure Manuelle (via PuTTY)
Si l'interface web est inaccessible, exécutez ces commandes dans le terminal du serveur :
```bash
# SI ERREUR "PERMISSION DENIED", lancez d'abord :
sudo chown -R $USER /var/www/tds-dt

cd /var/www/tds-dt
# Lance le script de mise à jour sécurisé (avec backup DB)
bash scripts/update-prod.sh
```

---

## 💾 6. Sauvegardes, Sécurité et Reprise sur Panne (Disaster Recovery)

L'application intègre des mécanismes robustes pour survivre aux pannes de serveur, corruptions de fichiers ou erreurs après une mauvaise mise à jour.

### A. Sauvegarde Automatique de la Base de Données
Le script `update-prod.sh` crée automatiquement une copie de la base de données `tds_dt.db` avec l'horodatage actuel (ex: `tds_dt_backup_20260503_111000.db`) dans le dossier `backups/` à chaque mise à jour. Les sauvegardes de plus de 30 jours sont automatiquement nettoyées.

### B. Sauvegarde Complète de l'App (Mécanisme de Reprise - Dossier `REPRISE/`)
Avant toute mise à jour sur le serveur de production, le script de déploiement effectue une image complète (ZIP) de l'ensemble du répertoire de l'application (incluant la base de données SQLite actuelle `tds_dt.db`, les codes sources compilés, les configurations `.env` et les scripts systèmes) dans le dossier **`REPRISE/`**.
- Nom du fichier généré : `REPRISE/reprise_backup_YYYYMMDD_HHMMSS.zip`
- Seuls les **10 derniers états** de reprise complets sont conservés pour éviter la saturation du disque.

### C. Procédure de Reprise Globale après Panne Majeure (`reprise.sh`)
Si le serveur plante suite à une mise à jour, si l'application ne répond plus ou si des fichiers système sont corrompus, vous pouvez restaurer instantanément la dernière version opérationnelle connue avec l'historique de vos données intact.

Exécutez la commande suivante depuis le répertoire racine du projet :
```bash
# Rendre le script exécutable (si ce n'est pas déjà fait)
chmod +x reprise.sh

# Lancer la reprise automatique
bash reprise.sh
```

**Ce que fait automatiquement le script `reprise.sh` :**
1. Identifie l'archive ZIP la plus récente dans le dossier `REPRISE/`.
2. Copie temporairement cette sauvegarde sécurisée en dehors de l'espace courant (dans `/tmp/`).
3. **Nettoie entièrement le répertoire actuel** de l'application (supprime tous les fichiers potentiellement corrompus).
4. Décompresse l'archive saine en conservant la configuration intacte ainsi que le fichier de données historique (`tds_dt.db`).
5. Installe automatiquement les dépendances stables d'origine via `npm install`.
6. Compile l'application (`npm run build`).
7. Relance le serveur propre (soit sous PM2 ou en tâche de fond nohup) sur le port de production `3000`.

### D. Sauvegarde Manuelle (Export direct)
1. **Depuis l'interface d'administration** : Sous l'onglet **Administration** > **Système**, vous pouvez télécharger instantanément le fichier de base de données à l'aide du bouton **"EXPORTER LA BASE (POUR TRANSFERT)"**.
2. **Via SFTP / FileZilla** : Téléchargez le fichier `/var/www/tds-dt/tds_dt.db` ou l'un des fichiers ZIP du dossier `/var/www/tds-dt/REPRISE/` vers un stockage externe.
*Fréquence recommandée : Hebdomadaire.*

### E. Restorations Individuelles (Base de Données Seule)
Si seule la base de données est corrompue et que le reste de l'application fonctionne :
1.  Arrêtez l'application (`sudo lsof -t -i:3000 | xargs sudo kill -9`).
2.  Supprimez le fichier `tds_dt.db` corrompu.
3.  Sélectionnez un fichier disponible s'apparentant à `backups/tds_dt_backup_XXXXXXXX_XXXXXX.db`.
4.  Copiez-le à la racine sous le nom exact : `tds_dt.db`.
5.  Relancez l'application.

---

## 🛠️ 7. Dépannage et Debugging (Administrateur)

### Accès Rapide
- **Lien DNS** : `http://dt.dac-nc.aviation/`
- **Lien IP Direct** : `http://172.23.32.57:3000/`

### Commandes utiles en PuTTY
- **Voir les erreurs en direct** : `tail -f app.log`
- **Vérifier si le serveur tourne** : `ps aux | grep node`
- **Vérifier Nginx** : `sudo nginx -t`
- **Vider le port bloqué** : `sudo lsof -t -i:3000 | xargs -r sudo kill -9` (ou `sudo fuser -k 3000/tcp`)

### Configuration Nginx (`/etc/nginx/sites-available/default`)
```nginx
server {
    listen 80;
    server_name dt.dac-nc.aviation 172.23.32.57;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}
```

---

## 🔐 8. VARIABLES D'ENVIRONNEMENT (Fichier .env)
Le fichier `.env` contient vos accès sensibles (Gmail, Resend, etc.).

### Particularité sous Linux (SFTP / PuTTY)
Sur votre serveur, les fichiers commençant par un point sont **cachés**.
- **Si vous le créez/renommez** : Il peut sembler disparaître de votre logiciel SFTP ou de la commande `ls`.
- **Pour le voir** : Dans le terminal, utilisez `ls -a`.
- **Pour l'éditer** : Tapez `nano .env` directement sur le serveur.

### Configuration recommandée (Interne)
```env
DISK_PATH=.
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=demba.ndiaye@gmail.com
SMTP_PASS=Bismi123
EMAIL_DEBUG_RECIPIENT=demba.ndiaye@aviation-civile.gouv.fr
```

---

## 📧 9. TEST DES EMAILS (MODE DÉVELOPPEUR)
Pour tester les notifications sans envoyer de messages réels aux agents, vous pouvez activer le **redirection automatique**.

### Procédure de redirection
1.  Ouvrez votre fichier de configuration d'environnement (ou configurez-le sur votre plateforme d'hébergement).
2.  Ajoutez ou modifiez la variable suivante :
    ```env
    EMAIL_DEBUG_RECIPIENT=demba.ndiaye@aviation-civile.gouv.fr
    ```
3.  **Test rapide sans déconnexion** : 
    Accédez à cette URL dans votre navigateur : `http://172.23.32.57:3000/api/admin/test-email-trigger`
    (Ou via PuTTY : `curl http://localhost:3000/api/admin/test-email-trigger`)
4.  **Résultat** : Toutes les demandes de congés ou récupérations de mot de passe seront envoyées à votre adresse. 
5.  **Désactivation** : Laissez la variable vide pour reprendre l'envoi normal aux agents.

---
*Dernière mise à jour : 03 Mai 2026 - Division Technique DAC-NC*
