# SportPulse

**Tous les scores. Toutes les stats. Vos prédictions.**

## Situation actuelle — LOT 1 (code publié, déploiement Cloudflare encore nécessaire)
- Site statique public : interface réactive et démonstration fictive clairement étiquetée.
- Frontend **résultats réels** distinct, sans confusion avec la démonstration.
- Worker Cloudflare : récupération périodique de matchs réels via football-data.org v4, normalisation, cache KV, traitement des erreurs et affichage de la fraîcheur.
- Clé API exclusivement dans un secret Cloudflare ; **aucune clé dans ce dépôt ni dans le navigateur**.
- Collecte programmée toutes les 30 minutes et lecture cache sans appel upstream par visiteur.
- Pas de score réellement live garanti : formule gratuite et cadence de collecte impliquent des délais.

## Mise en service (opérations manuelles sur tes comptes)
1. Créer une clé API sur https://www.football-data.org/ puis vérifier les conditions de redistribution/attribution avant publication.
2. Dans Cloudflare, créer un namespace Workers KV, copier son ID dans `worker/wrangler.toml` en remplaçant `REPLACE_WITH_YOUR_KV_NAMESPACE_ID`.
3. À partir du répertoire `worker/` sur une machine avec Node.js : `npm install`, puis `npx wrangler login`.
4. Enregistrer le secret **sans le committer** : `npx wrangler secret put FOOTBALL_DATA_TOKEN` (coller la clé seulement dans l'invite sécurisée).
5. Déployer : `npm run deploy`. Le Cron déclenchera la première collecte (il peut y avoir un délai). Pour vérifier : ouvrir `https://<nom-worker>.workers.dev/health`, puis `/api/matches` après une collecte.
6. Dans `config.js`, renseigner l'URL HTTPS du Worker **sans secret**, puis déployer le site avec GitHub Pages ou Cloudflare Pages.
7. Vérifier l'attribution « Data provided by football-data.org », les heures de mise à jour et les conditions de réutilisation. Le Worker ne contourne aucun accès soumis à licence.

Le site fonctionne en mode démonstration tant que l'URL du Worker n'a pas été configurée. Il ne faut pas qualifier cette version de site en direct.

## Vérification automatique
Dans `worker/`, lancer `npm test` (Node.js récent). Tests unitaires de normalisation des scores et validation de configuration. Les tests ne valident pas la disponibilité réelle du fournisseur.

## Prédictions sportives
- V0 : démonstration 1/N/2 **purement fictive**, heuristique non calibrée.
- V2 : statistiques sur matchs réels, séparation temporelle entraînement/test, score de Brier, calibration et traçabilité.
- V3 : participation gratuite des internautes, prédictions horodatées avant match, comparaison modèle/public, consentement et modération.
- **Aucun pari en argent réel.**

## Architecture
`index.html` + `script.js` = démonstration ; `live.js` + `config.js` = scores réels ; `worker/src/index.js` = collecte sécurisée et endpoint en lecture seule. La branche `main` contient les sources.

## Confidentialité et licences
Une page de confidentialité et une explication méthodologique sont présentes. Compléter les mentions légales avant la publication de production. Les éventuelles images et logos doivent être autorisés. Aucune licence open source n'est encore attribuée à ce dépôt.
