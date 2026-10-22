# SportPulse — Mise en service Cloudflare

Le site **Pages** est déjà déployé à `https://sportpulse-bg1.pages.dev`. Ne pas le supprimer.

## 1. Le Worker (séparé du site Pages)

Créer un **nouveau Worker** relié au dépôt GitHub `Adelovitch/SportPulse`.
- Worker : `sportpulse-api`
- Branche : `main`
- Répertoire racine : `worker` (si l'interface l'offre)
- Commande de build : vide
- Commande de déploiement : `npx wrangler deploy`
- Si Cloudflare propose uniquement la racine du dépôt : commande `cd worker && npx wrangler deploy`, à adapter selon les champs de l'interface.

### Stockage KV : nécessaire avant de lancer le déploiement

Créer le namespace `SPORTPULSE_CACHE` dans **Workers & Pages → KV**.
Copier son identifiant non secret dans `worker/wrangler.toml`, à la place de `REPLACE_WITH_YOUR_KV_NAMESPACE_ID`, puis committer cette unique modification GitHub.
Le binding Workers associé s'appelle **`SPORT_CACHE`**.

### Clé API : uniquement dans Cloudflare

Dans les paramètres du Worker, choisir **Variables and Secrets → Add → Secret** :
- Nom : `FOOTBALL_DATA_TOKEN`
- Valeur : ta clé football-data.org (masquée dans l'interface)
- Ne pas coller la valeur dans GitHub, les captures d'écran ou le chat.

Selon l'interface Cloudflare, créer le secret après le premier déploiement, puis vérifier qu'il est associé à l'environnement de production.

### Vérification

Une fois le Worker déployé, tester `https://<adresse-du-worker>/health` : réponse JSON `{"ok":true,"service":"sportpulse-api"}`.
La tâche planifiée (cron) collecte au plus une fois toutes les 30 minutes. Avant le premier passage, `/api/matches` peut répondre **503 No data collected yet**. Une source injoignable ou non autorisée conserve l'ancien cache et le marque comme périmé.

## 2. Lier le Worker au site

Dans `config.js`, saisir l'adresse **publique** `https://...workers.dev` de ce Worker, sans slash final. Cette adresse n'est pas une clé secrète.
La page Pages se redéploiera automatiquement depuis GitHub ; le module « Résultats réels » pourra alors afficher les données du fournisseur.

## 3. Contrôles nécessaires

- Vérifier les droits de publication/attribution des données obtenues auprès de football-data.org.
- Les matchs montrés dans la section démonstration sont fictifs et ne doivent jamais être présentés comme réels.
- Aucun score n'est garanti en temps réel. Les données de la formule gratuite peuvent être différées.
- Aucun pronostic utilisateur ni pari monétaire dans cette version.
