# SportPulse

**Tous les scores. Toutes les stats. Vos prédictions.**

Portail sportif gratuit et indépendant. Version **V0 de démonstration** : toutes les rencontres, équipes et statistiques sont fictives, sans scores en direct.

## Fonctionnalités V0
- Interface responsive accessible sur mobile et ordinateur
- Filtres par sport et état de rencontre
- Exemple de probabilités 1/N/2 basé sur la forme fictive des équipes
- Méthodologie explicitée et confidentialité
- Préparation de futurs pronostics communautaires gratuits

## Feuille de route
1. **V0** : interface et exemples clairement fictifs
2. **V1** : collecte de résultats réels sous licence autorisée avec provenance et date de mise à jour; Workers/Cloudflare KV, clés API exclusivement côté serveur
3. **V2** : prédictions statistiques fiables, évaluation chronologique hors échantillon, scores de Brier, calibration et historique public des performances
4. **V3** : pronostics des internautes (1/N/2), comptes pseudonymes facultatifs, consentement, anti-abus, modération, classements, comparaison public/modèle

Aucun pari en argent réel.

## Développement
Site statique sans dépendance ni compilation. Ouvrir `index.html` dans un navigateur. Pour publier, configurer GitHub Pages (branche main, dossier racine) ou Cloudflare Pages.

## Limites
Les probabilités de la démo sont une **heuristique non entraînée et non calibrée**. Les données sportives réelles et la partie communautaire ne sont pas encore intégrées. Les conditions d'utilisation des API et droits sur les logos doivent être vérifiées.

## Licence
Aucune licence de réutilisation accordée pour l'instant; à déterminer par le propriétaire avant ouverture des contributions.
