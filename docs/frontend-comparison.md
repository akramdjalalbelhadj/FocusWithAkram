# Comparaison Angular / React — 1 novembre 2026

Les deux applications sont exécutables et reliées au même backend. La parité des parcours testés est démontrée ; ni la parité exhaustive de tous les menus, ni une reproduction au pixel près des 14 images ne sont déclarées acquises. Voir la matrice fonctionnelle et les 28 lignes de recette visuelle.

## Mesures reproductibles

Même machine Windows, Node 24.22.2, Chromium, locale fr-FR, fuseau Europe/Paris, 1440×900, backend PostgreSQL isolé 18080. Angular est servi par Angular CLI en configuration production ; React par Vite preview après build. Les serveurs de fichiers diffèrent : ce n’est pas un benchmark pur des moteurs de rendu.

| Mesure | Angular | React |
|---|---:|---:|
| JS + CSS initiaux, octets réels | 588 823 | 499 880 |
| Somme gzip niveau 9, octets réels | 166 999 | 153 295 |
| Tests unitaires/composants | 12 réussis | 12 réussis |
| Parcours E2E métier | 6 réussis | 6 réussis |
| Navigation/captures/responsive | 1 scénario réussi | 1 scénario réussi |
| Audits axe des sept pages × deux thèmes | 14 sans violation détectée | 14 sans violation détectée |
| Matrice avec 120 tâches supplémentaires : médiane DOMContentLoaded | 141 ms | 87 ms |
| Calendrier avec ces mêmes tâches : médiane DOMContentLoaded | 92 ms | 31 ms |
| Matrice : médiane jusqu’à networkidle | 979 ms | 837 ms |
| Calendrier : médiane jusqu’à networkidle | 837 ms | 705 ms |

Sources : `test-results/bundles.json`, `volume-performance.json`, `e2e-business.json`, `e2e.json`, `axe-*-light.json`, `axe-*-dark.json`. Gzip calculé fichier par fichier avec Python, niveau 9, hors HTML et polices. Angular possède des routes lazy et un chunk ECharts supplémentaire de 667,60 kB brut ; la page dashboard/statistiques le charge. React livre actuellement toutes ses pages dans son bundle principal. Les tailles initiales ne représentent donc pas tout le coût d’une route Angular avec graphique.

Trois navigations consécutives par route/framework, sans throttling. DOMContentLoaded ne mesure pas la disponibilité des données API. `networkidle` inclut volontairement 500 ms d’inactivité, le réseau local et le backend ; ce n’est ni un LCP ni un temps d’interaction. La série commence avec un contexte neuf puis profite du cache navigateur. L’écart et la dispersion ne permettent pas de conclure à une supériorité générale.

Les builds de production ont réussi : dernière sortie Angular 9,140 s (compilation comprise), Vite 0,910 s (hors `tsc --noEmit`, exécuté séparément et réussi). Ces durées ne sont pas directement comparables. FPS, Lighthouse, INP et latence de glisser-déposer : **non mesurés** ; les tests prouvent la persistance des déplacements, pas leur cadence d’animation. Aucune mesure inventée.

## Visuel et usage

Matrice : les deux reprennent les quatre quadrants, le violet de navigation, les couleurs Q1–Q4 et les listes compactes ; sans panneau latéral ni timer. Les filtres métier ajoutent une barre par rapport au PNG. Calendrier : mois à sept colonnes, détails du jour et non-planifiées à droite ; novembre 2026 nécessite six lignes. Les vues semaine/jour restent fidèles aux échéances réellement stockées.

Les deux variantes ont un historique Focus sous le minuteur et des aperçus de tâches réels sur les projets. React suit plus directement les introductions des références. Angular conserve davantage de dispositions existantes, notamment les graphiques ECharts et les contrôles de formulaire. Les deux gardent les fonctionnalités au-delà des images. Les différences de densité et de composition sont détaillées dans `frontend-visual-regression.md` et restent visibles dans les captures.

Accessibilité : focus visible, dialogues avec Échap et restitution du focus, navigation clavier, contraste corrigé, alternatives textuelles des graphiques, réduction des animations. Les 28 audits automatisés passent, mais aucun audit manuel complet avec lecteur d’écran n’a été réalisé.

## Structure et coût de maintenance

| Critère | Angular | React |
|---|---|---|
| Socle | Application existante préservée ; standalone, OnPush, signals, RxJS | Nouveau projet Vite TypeScript, Router, TanStack Query |
| Interactions | CDK déjà intégré (dialogues, menus, drag/drop) | dnd-kit, dialogues HTML natifs, état de formulaires local |
| Visualisation | ECharts existant, plus riche mais plus lourd | SVG/CSS et tableaux accessibles, moins de code tiers de graphiques |
| Organisation | Services métier et pages séparés existants | Modules de domaines planning/productivity/management et composants partagés |
| Données communes | DTO, dates et tokens dans shared | Même socle partagé ; pas de duplication du backend métier |
| Migration | Aucun changement de framework | Deuxième UI nouvelle à éprouver sur les scénarios moins fréquents |

La seule modification serveur concerne les origines CORS locales 4200/5173. Aucun schéma ni règle métier modifié. Les tests backend existants (70) passent. Les suppressions/déplacements de documentation présents avant le travail ont été laissés tels quels.

## Recommandation

**Conserver Angular comme frontend principal à ce stade**, garder React disponible pour comparaison. Le dépôt possède déjà les services et interactions Angular éprouvés, et les tests ne montrent aucun gain React assez décisif pour justifier immédiatement une migration. React est une vraie variante connectée, plus proche de certaines compositions des maquettes, mais ses modules de pages sont encore larges et sa couverture des opérations rares doit être approfondie avant remplacement définitif.

Le prochain critère de décision utile est une recette utilisateur sur import/export, correction des dates, restauration de cycles, Top 3, sons et sessions multi-onglets, puis un choix explicite sur les différences de composition. Les variantes restent indépendantes et aucune n’a été supprimée.
