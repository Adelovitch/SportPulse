# SportPulse

**Tous les scores. Toutes les stats. Vos prédictions.**

## Site
https://sportpulse-bg1.pages.dev/

## Architecture active : GitHub Actions + Cloudflare Pages
- `scripts/collect_extras.py` collecte F1 et basket via des API publiques indépendantes ; indisponibilité partielle signalée.\n- `scripts/collect_openligadb.py` lit l'API publique OpenLigaDB, sans clé privée.
- `.github/workflows/sports-collection.yml` lance une collecte complète toutes les 6 heures et **à la demande**. Lorsqu'une rencontre football ou basket non terminée est prévue entre H-30 min et H+3 h, une deuxième programmation déclenche des collectes jusqu'à toutes les **20 minutes**. En dehors de ces fenêtres, les passages de contrôle sont légers et ne déclenchent pas d'appels API. GitHub Actions peut retarder les déclenchements planifiés.
- `data/matches.json` et `data/extras.json` sont générés et committé automatiquement ; Cloudflare Pages déploie ensuite la nouvelle version.
- `live.js` affiche le JSON, identifie la source et la date réelle de collecte. Le navigateur reconsulte les fichiers statiques toutes les 5 minutes lorsqu'il est visible, sans recharger la page entière ; cela ne garantit aucun score en temps réel.
- Compétitions initiales : Bundesliga et 2. Bundesliga ; calendrier F1 par Jolpica-F1 ; matchs NBA exploratoires par TheSportsDB (offre gratuite limitée).
- Fenêtre d'affichage : J-14 à J+14, maximum 160 matchs ; cela **n'est pas du direct**.
- Si une API échoue, l'Action échoue sans remplacer le dernier fichier validé.

## Lancer la première collecte
Ouvrir **GitHub → Adelovitch/SportPulse → Actions → Collecte résultats sportifs → Run workflow → main → Run workflow**.
La collecte complète programmée démarrera ensuite toutes les 6 heures (horaire UTC approximatif ; GitHub peut retarder les cron).
L'Action a besoin des permissions **Read and write permissions** pour le `GITHUB_TOKEN` dans **Settings → Actions → General → Workflow permissions**.
Si les règles du dépôt bloquent les modifications de `main`, un autre mode de publication devra être configuré.

## Tests
`python -m unittest discover -s tests -p 'test_collect.py'`.
Ces tests valident la normalisation, mais pas la disponibilité du fournisseur.

## Lot statistiques (nouveau)
- `scripts/collect_analytics.py` calcule, à partir des **matchs terminés de toute la saison**, le classement simplifié, les buts pour/contre, les points et les cinq derniers résultats par équipe.
- `data/analytics.json` est généré par GitHub Actions et lu par `standings.js`.
- Classements **indicatifs et non officiels** : certains départages, sanctions ou retraits de points peuvent différer des classements officiels.
- Si l’API de statistiques échoue, la collecte des scores conserve son fonctionnement ; aucune statistique inventée n’est affichée.

## Football international — option football-data.org
- Le connecteur `scripts/collect_football_data.py` tente FL1, PL, PD, SA, CL, DED et PPL, **uniquement si le plan autorise les ressources**. Un refus HTTP 403 est ignoré, un HTTP 429 arrête la collecte, et chaque requête est espacée d’au moins 7 secondes.
- Ressources : matchs de saison (résultats et calendrier sur une fenêtre J-14 à J+21), classement TOTAL lorsque disponible ; sortie `data/football_data.json`.
- Pour activer : GitHub → Settings → Secrets and variables → Actions → New repository secret, nom exact `FOOTBALL_DATA_TOKEN`, valeur **la clé privée personnelle**. Ne jamais la saisir dans `config.js`, un commit ou le navigateur.
- Le collecteur est facultatif : sans secret ou si le fournisseur est inaccessible, les sources existantes continuent de fonctionner.
- La formule gratuite n’autorise pas les données enrichies payantes (composition, statistiques détaillées, longues archives). Attribution du fournisseur à conserver de manière visible conformément à ses conditions.
- La liste des compétitions tentées ne garantit pas leur accès : vérifier le JSON après la première exécution.

## Historique cumulatif des rencontres (nouveau)
- `scripts/collect_history.py` conserve dans `data/history.json` les rencontres **de football terminées avec un score numérique validé** provenant des snapshots OpenLigaDB et football-data.org.
- Déduplication par identifiant de source ; les corrections de score mettent à jour l'entrée sans la dupliquer. Un match disparu d'une fenêtre de collecte **reste dans l'archive**.
- L'archive a été initialisée à partir des matchs déjà connus (178 résultats au démarrage), puis s'enrichit automatiquement après les collectes. Cela **ne reconstitue pas rétroactivement toute la saison ni toutes les saisons précédentes**.
- Les fiches d'équipes et le comparateur exploitent ce fichier lorsqu'il est disponible ; l'absence du fichier ne bloque pas l'affichage des résultats récents.
- Aucun résultat programmé, incomplet ou sans score validé n'est conservé dans l'historique. La source d'origine reste traçable via l'identifiant du match.

## Prochaines versions
- Ajouter d'autres compétitions/sports **après vérification des conditions de réutilisation** et de la qualité des données.
- Construire des prédictions 1/N/2 sur résultats historiques réels, avec séparation chronologique, calibration et évaluation hors échantillon.
- Participation volontaire et gratuite des internautes : pronostics horodatés avant match, scores de fiabilité, consentement, modération et comparaisons modèle/communauté. Aucun pari en argent réel.
- Les anciennes rencontres fictives et leur script de démonstration ne sont plus affichés sur le site public.

## Ancien prototype (inactif)
Le dossier `worker/` reste archivé pour une éventuelle phase ultérieure Cloudflare Workers + football-data.org. **Il n'est pas utilisé par l'interface active.** Ne pas transmettre de secrets dans le dépôt.

## Transparence
Sources : https://www.openligadb.de/, https://github.com/jolpica/jolpica-f1 et https://www.thesportsdb.com/. Accès gratuit ne signifie pas absence de conditions de réutilisation ; vérifier droits et attribution pour un usage public durable. Logos d'équipes non intégrés. Pages juridiques à compléter avant lancement officiel.
