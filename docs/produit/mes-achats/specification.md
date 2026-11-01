# « Mes achats » — spécification fonctionnelle

Version **0.1 du 1 novembre 2026 — proposition à valider**. Ce document traduit le besoin en règles précises avant toute implémentation. Les points **[À trancher]** attendent une décision du propriétaire ; les points **[Par défaut]** s'appliquent sauf avis contraire. Une fois validé, il devient la référence des lots 4 à 8 (voir le [suivi](../../suivi/refonte-v2.md)).

## 1. Principes

1. **Argent réel et argent prévu ne se mélangent jamais.** Chaque opération a un statut ; seules les opérations **réalisées** modifient le solde réel. Une prévision n'est jamais comptée comme un paiement.
2. **Rien de calculable n'est stocké.** Solde, budget restant, épargne, faisabilité et prévisions sont recalculés à chaque lecture à partir des opérations : aucune désynchronisation possible, recalcul automatique quand la situation change.
3. **Chaque euro n'est compté qu'une fois.** Les fonds réservés ou alloués à un objectif ne sont plus disponibles pour un autre ; une échéance d'abonnement payée remplace sa prévision ; un achat réalisé remplace son objectif.
4. **Traçabilité.** Une correction est une opération visible, jamais un écrasement. Une opération réalisée se corrige ou s'annule ; sa suppression est réservée aux erreurs de saisie, avec confirmation.
5. **Explicable.** Chaque indicateur affiche sa formule et ses composantes ; chaque verdict de faisabilité détaille son calcul.

## 2. Politique monétaire et temporelle

| Sujet | Règle |
| --- | --- |
| Devise | **[Par défaut]** euro uniquement ; pas de conversion. |
| Représentation | Décimal exact (`BigDecimal` / `NUMERIC(12,2)`), deux décimales, jamais de flottant. Montant toujours positif ; le sens découle du type d'opération. |
| Arrondi | Aucun arrondi sur les sommes (valeurs déjà au centime). Les équivalents mensuels (abonnement annuel ÷ 12) et les répartitions sont arrondis au centime, demi vers le haut, et ne servent qu'aux prévisions : les paiements réels gardent leur montant exact. Les pourcentages sont calculés exactement et affichés arrondis à l'unité. |
| Dates | Une opération porte une **date locale** (jour, sans heure), interprétée dans le fuseau des préférences existantes. |
| Mois budgétaire | **[Par défaut]** mois civil (du 1er au dernier jour). |
| Horizon de prévision | Jusqu'à 24 mois. |

## 3. Glossaire — concepts distincts

| Concept | Définition |
| --- | --- |
| Solde réel d'un compte | Somme signée des opérations **réalisées** du compte datées au plus tard aujourd'hui (solde initial et corrections compris). |
| Solde disponible | Somme des soldes réels des comptes **courants et espèces** (hors épargne). |
| Argent réservé | Total des montants réservés sur les objectifs d'achat non clos. Il reste sur les comptes mais n'est plus « libre ». |
| Disponible libre | Solde disponible − argent réservé − réserve de sécurité. |
| Solde prévisionnel (à une date) | Solde disponible + entrées prévues − sorties prévues jusqu'à cette date (§ 6). |
| Revenu attendu / reçu | Occurrence d'un revenu planifié (prévue) / revenu réalisé, avec montant et date réels. |
| Dépense prévue / payée / annulée | Statuts d'une dépense ; seule la payée compte dans le réel. |
| Dépense indispensable | Dépense marquée « indispensable », opération par opération ou par échéancier ; une catégorie n'est jamais indispensable en bloc. |
| Dépense variable | Toute dépense non indispensable. |
| Dépense exceptionnelle | Dépense marquée « exceptionnelle » (imprévue) ; indispensable ou variable selon son propre marquage. |
| Plafond variable | Montant maximal de dépenses variables du mois, fixé dans le budget. |
| Épargne théorique du mois | Revenus prévus − dépenses indispensables prévues − plafond variable. |
| Épargne mise de côté | Virements nets du mois vers les comptes d'épargne. |
| Argent non dépensé | Revenus reçus − dépenses payées du mois − épargne mise de côté. |
| Objectif d'épargne | Montant mensuel visé, protégé dans les prévisions. |
| Réserve de sécurité | Solde disponible minimal à ne jamais entamer dans les prévisions. |
| Créance / dette | Reste à recevoir d'un prêt accordé / reste à rembourser d'un emprunt. |

## 4. Entités

### 4.1 Compte
Nom, type (`COURANT`, `EPARGNE`, `ESPECES`), archivé. Au premier usage, l'assistant crée un compte courant et son **solde initial** (opération `SOLDE_INITIAL` datée du jour de démarrage). Un compte archivé reste dans l'historique ; il ne peut être supprimé que s'il n'a aucune opération.

### 4.2 Catégorie
Deux niveaux : catégorie, puis sous-catégorie facultative. Plus de niveaux n'apporterait rien aux analyses demandées. Nom, icône, couleur, ordre, archivée. Le jeu initial reprend le tableau du besoin (Logement, Courses, Abonnements, Restaurants, Santé, Produits numériques, Dons, Vêtements, Soins personnels, Transports ponctuels, Loisirs, Autres). Une catégorie utilisée ne peut pas être supprimée : elle s'archive (masquée à la saisie, conservée dans l'historique). Une catégorie inutilisée se supprime. Renommer ou déplacer une sous-catégorie n'altère pas les opérations : elles référencent la catégorie par identifiant. Les revenus ont leurs propres types : salaire, prime, cadeau, activité ponctuelle, autre.

### 4.3 Opération
Compte, type, montant, date, libellé, description facultative, statut (`PREVUE`, `REALISEE`, `ANNULEE`). Selon le type : catégorie et sous-catégorie, indicateurs « indispensable » et « exceptionnelle », lien vers un échéancier (avec la date d'échéance), un objectif d'achat ou un prêt.

| Type | Effet sur le compte | Compté comme |
| --- | --- | --- |
| `REVENU` | + | Revenu (salaire, prime, cadeau, activité, autre) |
| `DEPENSE` | − | Dépense de sa catégorie |
| `REMBOURSEMENT_ACHAT` | + | Diminution des dépenses de la catégorie d'origine (retour produit, remboursement d'un achat) **[Par défaut]** — pas un revenu |
| `VIREMENT` | − compte source / + compte cible | Ni revenu ni dépense ; vers l'épargne = épargne mise de côté |
| `PRET_ACCORDE` / `REMBOURSEMENT_RECU` | − / + | Mouvement de créance, ni dépense ni revenu |
| `EMPRUNT_RECU` / `REMBOURSEMENT_VERSE` | + / − | Mouvement de dette, ni revenu ni dépense |
| `SOLDE_INITIAL`, `CORRECTION` | ± | Ni revenu ni dépense ; visibles dans l'historique |

Un revenu planifié conserve son **montant prévu** quand il est reçu : « prévu 2 200 €, reçu 2 150 €, écart −50 € ».

### 4.4 Échéancier
Modèle commun au salaire, aux abonnements et aux charges récurrentes : libellé, sens (revenu ou dépense), montant habituel, catégorie, compte, périodicité (mensuelle, annuelle, tous les N mois, hebdomadaire), jour d'échéance, date de début, date de fin facultative (ce qui couvre les paiements en plusieurs fois), indispensable, statut (`ACTIF`, `SUSPENDU`, `RESILIE`).

- Les occurrences futures sont **calculées**, pas stockées. Une occurrence n'est enregistrée que lorsqu'elle est **personnalisée** (montant différent ce mois-ci, ou sautée : mois sans salaire, abonnement non renouvelé), **réalisée** (paiement ou versement confirmé) ou **annulée**.
- Unicité (échéancier, date d'échéance) : une échéance ne peut être payée deux fois. La prévision ne recompte pas une échéance déjà réalisée.
- Modifier le montant habituel n'affecte que les occurrences non réalisées. Suspendre ou résilier arrête les occurrences à venir ; l'historique reste.
- Une dépense saisie librement peut être rattachée à une échéance existante (« c'est le paiement de Claude de novembre ») ; l'interface le propose quand libellé, montant et date sont proches, pour éviter les doublons.

### 4.5 Budget mensuel
Mois, plafond variable, objectif d'épargne. À défaut de budget saisi, les valeurs par défaut des préférences financières s'appliquent. Les dépenses indispensables du mois sont celles des échéanciers et opérations marquées indispensables : il n'y a rien à ressaisir chaque mois, seulement à ajuster.

### 4.6 Préférences financières
Réserve de sécurité, objectif d'épargne mensuel par défaut, plafond variable par défaut, seuils d'alerte budgétaire **[Par défaut] 80 % et 100 %**, compte par défaut.

### 4.7 Objectif d'achat
Nom, catégorie, description, prix estimé, montant maximal acceptable, date cible, **important** et **urgent** (le quadrant en dérive, comme pour les tâches : urgence et importance restent deux critères indépendants), statut, montant réservé, notes, opération d'achat liée une fois l'achat fait.

### 4.8 Prêt
Personne, sens (`ACCORDE` ou `EMPRUNTE`), montant, date, échéance prévue, notes, statut. Le versement initial et chaque remboursement sont des opérations liées (§ 4.3). Reste dû = montant − remboursements − montant régularisé. Statuts : `EN_COURS`, `SOLDE`, `REGULARISE` (reste abandonné explicitement, avec date et motif), `ANNULE` (saisie erronée). La régularisation ne déplace pas d'argent : elle clôt le prêt et apparaît comme « créance abandonnée » dans les analyses, hors dépenses de consommation.

## 5. Budget du mois

| Indicateur | Calcul |
| --- | --- |
| Revenus prévus / reçus | Occurrences de revenus du mois, prévues / réalisées |
| Dépenses indispensables prévues / payées | Échéances et opérations indispensables du mois |
| Dépenses variables payées | Dépenses non indispensables réalisées du mois, moins leurs remboursements **[À trancher : achats d'objectifs inclus ou non]** |
| Plafond consommé | Dépenses variables payées ÷ plafond |
| Reste variable | Plafond − dépenses variables payées (négatif = dépassement) |
| État | Vert sous 80 %, orange de 80 % à 100 %, rouge au-delà, avec avertissement explicite. L'enregistrement d'une dépense réelle n'est **jamais** bloqué. |
| Épargne théorique / mise de côté / non dépensé | § 3 |

Les dépenses exceptionnelles sont signalées à part dans le bilan du mois ; elles comptent dans l'indispensable ou le variable selon leur propre marquage.

## 6. Prévision de trésorerie

Calcul jour par jour, d'aujourd'hui à l'horizon, sur le **solde disponible** :

1. **Point de départ** : solde disponible réel d'aujourd'hui.
2. **Entrées prévues** : occurrences de revenus aux dates d'échéance. Un revenu attendu dont la date est passée sans réception est « en retard » **[À trancher : compté ou non]**. Remboursements de prêts attendus à leur échéance **[À trancher : comptés ou non]**.
3. **Sorties prévues** : échéances indispensables et abonnements actifs ; dépenses prévues saisies ; remboursements d'emprunts à leur échéance.
4. **Dépenses variables anticipées** : le reste du plafond variable du mois en cours, puis le plafond complet des mois suivants, **réparti uniformément sur les jours** du mois.
5. **Épargne** : l'objectif d'épargne du mois est retiré du disponible à la date du salaire (« se payer en premier ») ; il est protégé.
6. **Réserve de sécurité** : le disponible prévu ne doit jamais descendre sous ce seuil.
7. **Objectifs d'achat** : retirés à leur date d'achat retenue, dans l'ordre de priorité (§ 7.3).

Une **simulation** applique des hypothèses (salaire −200 €, achat supplémentaire, report, réduction d'une catégorie) au même calcul, sans rien écrire.

## 7. Faisabilité d'un achat

### 7.1 Calcul
Pour un objectif de montant `A` (prix estimé, moins la part déjà réservée pour lui) à la date `T` :

> L'achat est réalisable si, après avoir retiré `A` à partir de `T`, le disponible prévu reste au-dessus de la réserve de sécurité **à toutes les dates de `T` jusqu'à l'horizon de contrôle** (`T` + 3 mois, pour couvrir les grosses échéances qui suivent l'achat).

On contrôle le minimum après `T`, et pas seulement le solde au jour `T` : un achat payé juste avant le loyer peut être « possible » le jour même et mettre en défaut une semaine plus tard.

### 7.2 Verdict
| Verdict | Condition |
| --- | --- |
| **Réalisable** | Condition remplie, avec une marge d'au moins 10 % du prix. |
| **Risqué** | Condition remplie de justesse (marge < 10 %), ou seulement grâce à une entrée incertaine (revenu en retard, remboursement attendu). |
| **Non réalisable** | Condition non remplie. L'application calcule la **première date réaliste** (premier jour où la condition est remplie), généralement juste après un salaire, ou indique qu'aucune date ne convient dans l'horizon de 24 mois. |
| **Indéterminé** | Données insuffisantes : aucun compte, aucun solde initial, ou aucun revenu prévu. |

Le détail affiché : montant nécessaire, déjà réservé, reste à financer, disponible prévu à la date, point le plus bas après l'achat, date de faisabilité, entrées incertaines prises en compte. Exemple attendu : « Ton achat de 400 € n'est pas compatible avec ton budget prévisionnel au 1er janvier 2027. Selon tes revenus et dépenses prévus, une date plus réaliste serait le 31 janvier 2027. »

### 7.3 Plusieurs objectifs
Les objectifs ouverts sont traités l'un après l'autre par priorité **[Par défaut : quadrant Q1, Q2, Q3, Q4, puis date cible, puis date de création]**. Chaque objectif retenu retire son montant de la prévision à sa date d'achat retenue (date cible si réalisable, sinon première date réaliste) avant d'évaluer le suivant : les mêmes fonds ne sont jamais promis deux fois.

### 7.4 Enregistrer malgré l'avertissement
Un objectif non réalisable s'enregistre quand même. L'interface propose de garder la date (avec avertissement), de reporter à la date réaliste, de réduire le budget, d'ajouter un effort d'épargne mensuel, ou de changer la priorité. Chaque option est recalculée avant confirmation.

### 7.5 Recalcul
Rien n'est mémorisé : chaque lecture recalcule. Un salaire reçu, une facture modifiée, une dépense, un autre achat, un changement d'objectif d'épargne ou de date cible se répercutent immédiatement.

## 8. Cycle de vie d'un achat

Statuts saisis : `ENVISAGE`, `PLANIFIE`, `REPORTE`, `ACHETE`, `ABANDONNE`. « En cours de financement » (montant réservé > 0) et « finançable » (verdict réalisable) sont **calculés**, pas saisis : ils ne peuvent donc pas devenir faux.

- **Planifier** ne crée aucune opération.
- **Réserver** affecte une part du disponible libre à l'objectif (refusé si le disponible libre est insuffisant).
- **Acheter** crée une dépense réalisée avec le prix et la date réels, liée à l'objectif ; la réservation est libérée. L'écart entre prix estimé et prix réel alimente les statistiques.
- **Abandonner** ou **reporter** libère ou conserve la réservation, au choix.

## 9. Cas particuliers

| Cas | Traitement |
| --- | --- |
| Saisie rétroactive | Acceptée ; soldes et prévisions recalculés (rien n'est mis en cache). |
| Salaire reçu en retard ou différent | Le revenu prévu devient réalisé avec la date et le montant réels ; l'écart est affiché. |
| Mois sans salaire | Occurrence « sautée » ; la prévision n'attend aucun salaire ce mois-là. |
| Plusieurs revenus dans le mois | Tous comptés ; un échéancier par source régulière. |
| Dépense annulée | Statut annulé : plus aucun effet ; conservée dans l'historique. |
| Abonnement suspendu | Plus d'échéance jusqu'à la reprise. |
| Remboursement partiel d'un prêt | Reste dû mis à jour ; prêt soldé à zéro. |
| Prêt jamais remboursé | Échéance dépassée : alerte ; régularisation explicite possible. |
| Achat plus cher ou moins cher | Le prix réel fait foi ; l'écart est conservé. |
| Doublon probable | Même compte, montant, date et libellé proche : l'interface le signale avant d'enregistrer, sans bloquer. |
| Solde négatif | Permis et signalé (découvert) ; la prévision l'affiche en rouge. |
| Catégorie modifiée ou archivée | Les opérations restent rattachées et lisibles. |
| Correction du solde | Opération `CORRECTION` de l'écart, visible et datée. |

## 10. Alertes (calculées, non stockées)

Plafond à 80 % puis dépassé ; échéance importante dans les 7 jours ; solde prévisionnel sous la réserve dans les 60 jours ; objectif devenu risqué ou non réalisable ; prêt ou emprunt en retard ; revenu attendu non reçu.

## 11. Données, sécurité, sauvegarde

- Usage local mono-utilisateur, comme le reste de l'application : pas d'authentification ajoutée. Les montants ne sont jamais journalisés.
- Toutes les entités financières entrent dans la sauvegarde JSON (format v3) et dans l'aperçu d'import.
- Contraintes SQL : montants positifs, statuts valides, unicité des échéances, clés étrangères sans suppression en cascade sur l'historique.
- Volumétrie : quelques milliers d'opérations par an. Pagination de l'historique et agrégations côté base suffisent ; aucun cache n'est nécessaire.

## 12. Fonctions complémentaires — priorisation proposée

| Fonction | Valeur | Complexité | Proposition |
| --- | --- | --- | --- |
| Saisie rapide d'une dépense | Haute | Faible | Lot 4 |
| Sauvegarde, export, import | Haute (données personnelles) | Faible | Dès le lot 4, puis à chaque lot |
| Retours et remboursements d'achats | Moyenne | Faible | Lot 4 |
| Dépenses récurrentes et abonnements | Haute | Moyenne | Lot 5 |
| Réserve de sécurité | Haute | Faible | Lot 5 |
| Prévision de trésorerie | Haute | Moyenne (moteur nécessaire à la faisabilité) | Lot 6 |
| Paiements en plusieurs fois | Moyenne | Faible via un échéancier à date de fin | Lot 5 |
| Alertes | Haute | Faible (dérivées des calculs) | Lot 8 |
| Simulations | Moyenne | Moyenne (même moteur, hypothèses non enregistrées) | Lot 8 |
| Calendrier financier | Moyenne | Moyenne | Lot 8, vue propre au module ; intégration au calendrier des tâches reportée |
| Multi-devise, rapprochement bancaire, import de relevés | Faible pour l'usage actuel | Élevée | Hors v1 |

## 13. Organisation de l'interface (proposition)

Une seule entrée **« Mes achats »** dans la navigation, avec des onglets : Vue d'ensemble, Opérations, Budget, Abonnements, Achats (liste et matrice), Prêts, Statistiques, Réglages. Un bouton « + Dépense » accessible partout, ainsi qu'un raccourci clavier, ouvrent la saisie rapide.

## 14. Décisions

| # | Sujet | État |
| --- | --- | --- |
| D1 | Plusieurs comptes simples (courant, épargne, espèces) ; épargne = virement ; réservations virtuelles | **Validé** le 1 novembre 2026 |
| D2 | Euro uniquement ; mois civil ; correction par opération ; seuils 80/100 % ; ordre de priorité des objectifs | Par défaut |
| D3 | L'épargne existante peut-elle financer un achat ? | **À trancher** |
| D4 | Les achats d'objectifs consomment-ils le plafond variable ? | **À trancher** |
| D5 | Revenus en retard et remboursements attendus dans la faisabilité | **À trancher** |
| D6 | Organisation de l'interface (§ 13) | **À trancher** |
