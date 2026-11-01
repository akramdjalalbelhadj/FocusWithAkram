# FocusWithAkram — documentation

Index de la documentation. Le code source reste la source de vérité : un document qui le contredit est à corriger.

## Organisation

```
docs/
  produit/      ce que fait l'application et pour qui
  technique/    comment elle est construite, lancée et exploitée
  suivi/        où en est le développement et comment le vérifier
  historique/   rapports de lot datés, figés (ne décrivent plus l'état courant)
  maquettes/    références graphiques canoniques (PNG)
```

## Lire selon son besoin

| Document | Question traitée | Public |
| --- | --- | --- |
| [Cahier des charges](produit/cahier-des-charges.md) | Quel produit construit-on et selon quelles règles ? | Produit, développement, recette |
| [Guide d'utilisation](produit/guide-utilisation.md) | Comment accomplir les tâches courantes ? | Utilisateur |
| [« Mes achats » — spécification](produit/mes-achats/specification.md) | Quelles règles financières le module applique-t-il ? | Produit, développement, recette |
| [Architecture backend](technique/architecture-backend.md) | Comment le serveur est-il organisé (packages, DTO, erreurs, transactions) ? | Développement |
| [Architecture frontend](technique/architecture-frontend.md) | Comment les interfaces Angular et React sont-elles organisées ? | Développement |
| [Design détaillé](technique/design.md) | Comment composer et faire évoluer les interfaces ? | Design, frontend, recette |
| [Exploitation](technique/exploitation.md) | Comment installer, lancer, tester, sauvegarder et diagnostiquer ? | Développement, exploitation |
| [Avancement fonctionnel](suivi/avancement-fonctionnel.md) | Quelles fonctions sont livrées, partielles ou absentes ? | Produit, recette |
| [Avancement technique](suivi/avancement-technique.md) | Quel est l'état technique, la dette et les décisions ? | Développement |
| [Checklist](suivi/checklist.md) | Que faut-il vérifier avant de valider une livraison ? | Développement, recette |
| [Refonte v2](suivi/refonte-v2.md) | Quelles décisions, quels lots et quelles adaptations React pour la phase en cours ? | Produit, développement |
| [Historique](historique/README.md) | Que s'est-il passé lors des lots précédents ? | Référence |
| [Maquettes](maquettes/README.md) | À quoi les écrans doivent-ils ressembler ? | Design, frontend |

Les identifiants `FWA-Fxxx`, `FWA-Nxxx` et `FWA-Txxx` relient les exigences, les états d'avancement et les contrôles. « Implémenté » décrit le code ; « vérifié » nécessite une preuve identifiée.

## Convention de maintenance

1. Modifier le cahier des charges lorsqu'une exigence change ; conserver son identifiant.
2. Mettre à jour l'avancement et la checklist **dans le même commit** que le code.
3. Reporter toute modification visuelle dans `technique/design.md`.
4. Modifier le guide si un parcours ou un libellé visible change ; modifier l'exploitation si une commande, un port ou un chemin change.
5. Dater les validations, indiquer leur périmètre et conserver les limites connues.
6. Un rapport ponctuel (audit, recette, comparaison) va dans `historique/<aaaa-mm-sujet>/` et n'est plus modifié ensuite ; les informations durables sont reportées dans les documents courants.
7. Les sorties générées (`docs/test-results/`, `docs/screenshots/`, produites par la suite E2E) ne sont pas versionnées.
