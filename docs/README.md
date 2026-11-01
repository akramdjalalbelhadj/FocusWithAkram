# FocusWithAkram — documentation

Révision du **1 novembre 2026**, sur la branche `main`. Documentation relue contre les sources du backend, des deux frontends et les résultats de validation disponibles. Cette révision documentaire ne constitue pas une nouvelle exécution des tests.

## Lire selon son besoin

| Document                                            | Question traitée                                          | Public                          |
| --------------------------------------------------- | --------------------------------------------------------- | ------------------------------- |
| [Cahier des charges](cahier-des-charges.md)         | Quel produit construit-on et selon quelles règles ?       | Produit, développement, recette |
| [Avancement fonctionnel](avancement-fonctionnel.md) | Quelles fonctions sont livrées, partielles ou absentes ?  | Produit, recette                |
| [Avancement technique](avancement-technique.md)     | Comment fonctionnent le backend, Angular et React ?       | Développement                   |
| [Checklist](checklist.md)                           | Que faut-il vérifier avant de valider une livraison ?     | Développement, recette          |
| [Guide d’utilisation](guide-utilisation.md)         | Comment accomplir les tâches courantes ?                  | Utilisateur                     |
| [Exploitation](exploitation.md)                     | Comment installer, lancer, sauvegarder et diagnostiquer ? | Développement, exploitation     |
| [Design détaillé](design.md)                        | Comment composer et faire évoluer les interfaces ?        | Design, frontend, recette       |

Les identifiants `FWA-Fxxx`, `FWA-Nxxx` et `FWA-Txxx` servent à relier les exigences, les états d’avancement et les contrôles. « Implémenté » décrit le code ; « vérifié » nécessite une preuve identifiée. Une capture historique ne prouve pas l’état de chaque écran après une modification ultérieure.

## Documents complémentaires

- [Architecture du backend](../backend/README.md) : packages, DTO, PATCH, exceptions et transactions.
- [Architecture des frontends](frontend-architecture.md) : dossiers de pages, composants, hooks et styles.
- [Lancement et recette des deux interfaces](how-to-run-frontends.md) : commandes détaillées et base E2E isolée.
- [Parité Angular / React](frontend-feature-parity.md) et [comparaison](frontend-comparison.md) : différences observées pendant la refonte.
- [Régression visuelle](frontend-visual-regression.md), [références graphiques](references/INDEX_DESIGN.md). Les captures historiques sont absentes de la copie locale et doivent être régénérées.
- [Inventaire des preuves de cette révision](test-results/documentation-audit.json).

## Convention de maintenance

1. Modifier le cahier des charges lorsqu’une exigence change ; conserver son identifiant.
2. Mettre à jour l’avancement et la checklist au même moment que le code.
3. Reporter toute modification visuelle dans `design.md`, avec les écarts entre frameworks.
4. Modifier le guide si un parcours ou un libellé visible change ; modifier l’exploitation si une commande, un port ou un chemin change.
5. Dater les validations, indiquer leur périmètre et conserver les limites connues.

La structure s’inspire des dossiers `english-ielts`, `fitness`, `islam` et `menstrual-cycle` de `D:\Projet\docs\modules`. Leurs contenus métier ne sont pas repris dans FocusWithAkram.
