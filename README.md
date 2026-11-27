# AZ LIVRAISON — Portail Web Relié (Connexion, Client, Administrateur)

## Fichiers inclus
- `index.html` : Portail de connexion et d'inscription avec contrôle d'accès.
- `Client.html` : Espace client avec identifiant unique (`AZ-CLT-XXXX`), envoi de bons de commande/colis et notifications de validation/refus.
- `Administrateur.html` : Espace administrateur avec réception des commandes clients, validation/refus, panneau exclusif `randrianantenainasedera96@gmail.com` pour valider les inscriptions et ajouter des administrateurs via code de validation, et sauvegarde complète sur PC (`az-livraison-sauvegarde-pc.json`).
- `az-sync.js` : Logique de liaison, sessions, notifications, identifiants uniques et sauvegarde locale PC.

## Mise en ligne gratuite sur GitHub Pages
1. Créez un dépôt public sur GitHub (ex. `az-livraison`).
2. Téléversez les 4 fichiers (`index.html`, `Client.html`, `Administrateur.html`, `az-sync.js`) à la racine du dépôt.
3. Ouvrez **Settings > Pages**, choisissez **Deploy from a branch**, sélectionnez `main` et `/ (root)`, puis cliquez sur **Save**.
4. Votre site est accessible en ligne à l'adresse : `https://<votre-identifiant>.github.io/az-livraison/`.
