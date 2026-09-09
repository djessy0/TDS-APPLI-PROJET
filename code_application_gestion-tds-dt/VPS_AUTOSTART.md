## Démarrage automatique sur VPS

Pour que l'application se lance automatiquement au démarrage de votre serveur, deux solutions sont recommandées :

### 1. Utilisation de PM2 (Recommandé)
PM2 est un gestionnaire de processus pour Node.js. Il permet de relancer l'application en cas de crash et de la démarrer au boot.

**Important :** Si vous obtenez une "page blanche" ou une erreur de port, nettoyez d'abord les anciens processus :
```bash
npx pm2 stop all
npx pm2 delete all
```

**Installation et Démarrage :**
1. Générez les fichiers de production :
```bash
npm run build
```

2. Lancez l'application avec PM2 :
```bash
npx pm2 start ecosystem.config.cjs
npx pm2 save
npx pm2 startup
```
(Suivez les instructions affichées par la commande `npx pm2 startup` pour activer le service système).

**Vérification et Maintenance :**
```bash
npx pm2 status
npx pm2 logs tds-dt
npx pm2 restart tds-dt
```

### 2. Service Systemd (Alternative classique)
Si vous ne souhaitez pas utiliser PM2, vous pouvez créer un service systemd.

Créez le fichier `/etc/systemd/system/tds-dt.service` avec le contenu du fichier `tds-dt.service` fourni dans ce projet.

Puis activez-le :
```bash
sudo systemctl daemon-reload
sudo systemctl enable tds-dt.service
sudo systemctl start tds-dt.service
```
