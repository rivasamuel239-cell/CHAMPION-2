# Plateforme du championnat de Lubumbashi - étape 2

Contenu : socle Next.js sécurisé, connexion administrateur, paramètres (nom provisoire), clubs (limite de 16, logo PNG validé), groupes, pages publiques (accueil, équipes).

## Mise en ligne sur Vercel (sans terminal)
1. **Base de données** : créez un compte sur neon.tech, un projet, puis copiez la chaîne de connexion « Direct connection » (sans « pooler »). Elle commence par `postgresql://`.
2. **GitHub** : créez un dépôt et envoyez TOUT le contenu du dossier (ordinateur conseillé : le glisser-déposer du dossier fonctionne sur la page « Upload files »).
3. **Vercel** : Add New > Project > importez le dépôt. Avant « Deploy », ouvrez « Environment Variables » et ajoutez :
   - `DATABASE_URL` : la chaîne Neon
   - `AUTH_SECRET` : une suite aléatoire d'au moins 40 caractères
   - `SEED_ADMIN_EMAIL` : votre e-mail d'administrateur
   - `SEED_ADMIN_PASSWORD` : un mot de passe fort (12 caractères minimum)
4. Cliquez sur Deploy. Le build crée les tables, le compte super administrateur et l'édition (nom provisoire).
5. Après la première connexion réussie : **supprimez `SEED_ADMIN_PASSWORD`** dans Vercel (Settings > Environment Variables).

Note : `prisma db push` dans le build est un raccourci de démarrage. Il sera remplacé par des migrations avant la production définitive.

## Sécurité en place
- Mots de passe hachés (argon2), session 8 h, verrouillage 15 min après 5 échecs, message d'erreur identique (pas d'énumération de comptes).
- Droits par rôle vérifiés côté serveur à chaque action ; le rôle et l'état du compte sont relus en base.
- Toutes les saisies validées (zod) ; limite de 16 clubs appliquée dans une transaction sérialisable.
- Logo : octets vérifiés (vrai PNG, transparent, 64 à 2000 px, 1 Mo), servi avec en-têtes restrictifs ; un logo non validé n'est visible que par le personnel autorisé.
- En-têtes de sécurité : CSP, HSTS, anti-iframe, nosniff, referrer, permissions.
- Journal d'audit sur chaque action sensible.

## Pas encore fait (étapes suivantes)
Modification détaillée d'un club et historique, joueurs, staff, cartes QR, arbitres, matchs, classement, sanctions, actualités, documents, sponsors, gestion des utilisateurs, limitation de débit par IP à la connexion.

## Tests
`npm install` puis `npm test` (permissions et validation des logos).
