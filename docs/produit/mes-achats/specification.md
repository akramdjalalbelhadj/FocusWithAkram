# « Mes achats » — spécification fonctionnelle

Version **1.0 du 1 novembre 2026 — validée** (décisions D1 à D6 ci-dessous), **révisée le 5 novembre 2026** pour le lot 13 « Mes achats simplifié » (décisions D7 à D12 : compte unique, prêts en catégorie, épargne du mois, feuille du mois, navigation et aide). Ce document traduit le besoin en règles précises avant toute implémentation. Les points **[À trancher]** attendent une décision du propriétaire ; les points **[Par défaut]** s'appliquent sauf avis contraire. Une fois validé, il devient la référence des lots 4 à 8 et 13 (voir le [suivi](../../suivi/refonte-v2.md)). L'organisation de l'interface, le modèle et le contrat d'API de la feuille du mois sont fixés dans la [feuille du mois](feuille-du-mois.md).

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
| Compte unique | Le seul compte du module : il représente **tout l'argent** (banque, épargne, espèces) (D7). |
| Solde réel | Somme signée des opérations **réalisées** du compte unique datées au plus tard aujourd'hui (solde initial et corrections compris). |
| Solde disponible | Solde réel du compte unique. Depuis le lot 13, il n'existe plus de compte d'épargne compté à part. |
| Argent réservé | Total des montants réservés sur les objectifs d'achat non clos. Il reste sur le compte mais n'est plus « libre ». |
| Disponible libre | Solde disponible − argent réservé − réserve de sécurité. |
| Solde prévisionnel (à une date) | Solde disponible + entrées prévues − sorties prévues jusqu'à cette date (§ 6). |
| Revenu attendu / reçu | Occurrence d'un revenu planifié (prévue) / revenu réalisé, avec montant et date réels. Un revenu prévu se saisit une fois pour un mois ou pour une période. |
| Prévu / réel / écart | Montant attendu pour le mois / montant réellement reçu ou payé / réel − prévu. Le prévu est conservé quand le réel est saisi. |
| Dépense prévue / payée / annulée | Statuts d'une dépense ; seule la payée compte dans le réel. |
| Dépense indispensable | Dépense marquée « indispensable », opération par opération ou par échéancier ; une catégorie n'est jamais indispensable en bloc. |
| Dépense fixe | Échéancier mensuel de dépense indispensable (loyer, téléphone, abonnement de transport) : la feuille de chaque mois en est déjà remplie. |
| Dépense variable | Toute dépense non indispensable. |
| Dépense variable plafonnée (« enveloppe ») | Catégorie de dépenses variables dotée d'un plafond mensuel (ex. courses 300 €), suivie chaque mois : dépensé, reste, commentaire de dépassement (§ 4.5). |
| Dépense exceptionnelle | Dépense marquée « exceptionnelle » (imprévue) ; indispensable ou variable selon son propre marquage. |
| Montant « à partir d'un mois » | Nouveau montant d'un revenu, d'une dépense fixe ou d'un plafond, valable à partir d'un mois et jusqu'au changement suivant ; les mois précédents gardent leur montant. |
| Montant « ce mois seulement » | Ajustement d'une seule échéance, sans effet sur les autres mois. |
| Plafond variable | Montant maximal de dépenses variables du mois : **somme des plafonds des enveloppes** actives ce mois-là ; sans enveloppe, plafond fixé pour le mois ou par défaut. |
| Épargne prévue du mois | Revenus prévus − dépenses prévues (dépenses fixes + plafond variable). Remplace l'« épargne théorique ». |
| Épargne réelle du mois | Revenus reçus − dépenses payées du mois (nettes des remboursements d'achats). L'épargne n'est pas un compte : c'est **ce qui reste du mois** (D9). Remplace l'« épargne mise de côté » et l'« argent non dépensé ». |
| Objectif d'épargne | Montant mensuel visé, comparé chaque mois à l'épargne réelle (atteint ou manqué) et protégé dans les prévisions. |
| Réserve de sécurité | Solde disponible minimal à ne jamais entamer dans les prévisions. |
| Prêts | Une **catégorie**, plus une entité : un prêt accordé ou un remboursement versé est une dépense « Prêts », un emprunt reçu ou un remboursement reçu un revenu « Prêts » (D8, § 4.9). |

## 4. Entités

### 4.1 Compte unique
Nom et solde. **Un seul compte** représente tout l'argent : compte en banque, épargne et espèces (D7). Au premier usage, l'assistant demande le **total disponible** aujourd'hui et crée le compte avec son **solde initial** (opération `SOLDE_INITIAL` datée du jour de démarrage). Un second compte est refusé (code `SINGLE_ACCOUNT`) ; l'interface permet seulement de **renommer** le compte et de **corriger son solde** (⚙ Réglages).

Fusion des comptes existants (migration V8, au premier démarrage de la version du lot 13) :

- le compte conservé est le compte courant actif le plus ancien (à défaut, le premier compte) ;
- le solde initial de chaque autre compte devient une correction datée « Solde de départ — <nom du compte> » ; si le compte conservé n'avait pas de solde initial, la plus ancienne de ces corrections le devient ;
- les virements entre comptes, devenus internes, sont supprimés ;
- opérations et échéanciers passent sur le compte conservé, les autres comptes sont supprimés : le **solde total est inchangé**.

Une sauvegarde ancienne à plusieurs comptes est fusionnée de la même façon à l'import : tous ses comptes se rattachent au compte unique (créé au besoin), le solde initial d'un compte supplémentaire devient une correction et les virements sont ignorés.

### 4.2 Catégorie
Deux niveaux : catégorie, puis sous-catégorie facultative. Plus de niveaux n'apporterait rien aux analyses demandées. Nom, icône, couleur, ordre, archivée. Le jeu initial reprend le tableau du besoin (Logement, Courses, Abonnements, Restaurants, Santé, Produits numériques, Dons, Vêtements, Soins personnels, Transports ponctuels, Loisirs, Autres). Une catégorie utilisée ne peut pas être supprimée : elle s'archive (masquée à la saisie, conservée dans l'historique). Une catégorie inutilisée se supprime. Renommer ou déplacer une sous-catégorie n'altère pas les opérations : elles référencent la catégorie par identifiant. Les revenus ont leurs propres types : salaire, prime, cadeau, activité ponctuelle, autre ; depuis le lot 13, un revenu peut **en plus** porter une catégorie, facultative (par exemple « Prêts » pour un remboursement reçu).

### 4.3 Opération
Compte (unique), type, montant, date, libellé, description facultative, statut (`PREVUE`, `REALISEE`, `ANNULEE`). Selon le type : catégorie et sous-catégorie, indicateurs « indispensable » et « exceptionnelle », lien vers un échéancier (avec la date d'échéance) ou un objectif d'achat.

| Type | Effet sur le compte | Compté comme |
| --- | --- | --- |
| `REVENU` | + | Revenu (salaire, prime, cadeau, activité, autre), catégorie facultative |
| `DEPENSE` | − | Dépense de sa catégorie |
| `REMBOURSEMENT_ACHAT` | + | Diminution des dépenses de la catégorie d'origine (retour produit, remboursement d'un achat) **[Par défaut]** — pas un revenu |
| `SOLDE_INITIAL`, `CORRECTION` | ± | Ni revenu ni dépense ; visibles dans l'historique |

Retirés au lot 13 : `VIREMENT` (avec un seul compte, un virement serait interne ; les virements existants sont supprimés par la migration V8 et ignorés à l'import) et les mouvements de prêt `PRET_ACCORDE`, `REMBOURSEMENT_RECU`, `EMPRUNT_RECU`, `REMBOURSEMENT_VERSE` (convertis en `DEPENSE` ou `REVENU` de la catégorie « Prêts », § 4.9).

Un revenu planifié conserve son **montant prévu** quand il est reçu : « prévu 2 200 €, reçu 2 150 €, écart −50 € ». Le commentaire facultatif saisi avec un réel est conservé dans la description de l'opération.

### 4.4 Échéancier
Modèle commun au salaire, aux revenus prévus, aux abonnements et aux dépenses fixes : libellé, sens (revenu ou dépense), montant habituel, catégorie (facultative pour un revenu), périodicité (mensuelle, annuelle, tous les N mois, hebdomadaire), jour d'échéance, date de début, date de fin facultative (ce qui couvre les paiements en plusieurs fois), indispensable, statut (`ACTIF`, `SUSPENDU`, `RESILIE`). Toutes les échéances portent sur le compte unique.

- Un **revenu prévu pour un seul mois** est un échéancier mensuel dont la première et la dernière échéance sont dans ce mois ; un revenu prévu **pour une période** (ex. 2 290 € le 28, de novembre 2026 à février 2027) est un échéancier mensuel avec date de fin. Une **dépense fixe** est un échéancier mensuel indispensable, avec une catégorie.
- Les occurrences futures sont **calculées**, pas stockées. Une occurrence n'est enregistrée que lorsqu'elle est **personnalisée** (montant différent ce mois-ci, ou sautée : mois sans salaire, abonnement non renouvelé), **réalisée** (paiement ou versement confirmé) ou **annulée**.
- Unicité (échéancier, date d'échéance) : une échéance ne peut être payée deux fois. La prévision ne recompte pas une échéance déjà réalisée.
- **Montants datés** (lot 13) : le montant change **à partir d'un mois** par une version (mois de départ, montant). Le montant d'une échéance est celui de la version la plus récente dont le mois de départ est au plus tard le mois de l'échéance ; sans version, le montant habituel. Les échéances déjà enregistrées (réalisées, sautées, ajustées) gardent leur montant. Passer le loyer de 350 € à 400 € à partir de janvier 2027 laisse novembre et décembre 2026 à 350 €.
- **Ce mois seulement** : ajustement d'une seule échéance (autre montant ou autre date pour cette fois).
- **Réel** : la réalisation d'une échéance enregistre montant, date et commentaire facultatif ; le prévu est conservé et l'écart affiché. Confirmer de nouveau une échéance déjà réalisée met à jour le réel en gardant le prévu ; annuler son enregistrement la rend de nouveau prévue.
- Suspendre ou résilier arrête les occurrences à venir ; l'historique reste.
- Une dépense saisie librement peut être rattachée à une échéance existante (« c'est le paiement de Claude de novembre ») ; l'interface le propose quand libellé, montant et date sont proches, pour éviter les doublons.

### 4.5 Dépense variable plafonnée (« enveloppe »)
Nouvelle entité du lot 13 : catégorie (une enveloppe par catégorie), libellé (par défaut le nom de la catégorie), ordre d'affichage, premier mois, dernier mois facultatif, **plafonds datés** (à partir d'un mois, comme les échéanciers) et, pour chaque mois, un commentaire et l'opération de total éventuelle.

- **Dépensé du mois** = dépenses réalisées de la catégorie (et de ses sous-catégories pour une catégorie racine), nettes des remboursements d'achats, hors échéances d'échéancier et hors achats d'objectifs (D4).
- **Reste** = plafond − dépensé ; négatif en cas de dépassement.
- **Dépassement** : jamais bloquant ; la feuille demande un **commentaire** qui l'explique tant qu'il manque, et l'alerte `ENVELOPE_OVER` le signale.
- **Saisir le total du mois** : crée ou met à jour **une** opération de total pour que le dépensé égale le montant saisi ; les autres dépenses de la catégorie restent comptées. Refusé pour un mois futur, ou si les autres dépenses dépassent déjà le montant saisi.
- **Terminer** une enveloppe : plus de plafond après le dernier mois choisi. La **supprimer** conserve les opérations.

Le détail du modèle (`fin_envelope`, `fin_envelope_amount`, `fin_envelope_month`) et des codes d'erreur est dans la [feuille du mois](feuille-du-mois.md) § 2 et § 3.

### 4.6 Budget mensuel
Mois, plafond variable, objectif d'épargne. À défaut de budget saisi, les valeurs par défaut des préférences financières s'appliquent. Quand des enveloppes sont actives ce mois-là, le **plafond variable du mois est la somme de leurs plafonds** (budget, prévision, alertes) ; sans enveloppe, le plafond du mois ou par défaut s'applique comme avant. Les dépenses indispensables du mois sont celles des échéanciers et opérations marquées indispensables : il n'y a rien à ressaisir chaque mois, seulement à ajuster.

### 4.7 Préférences financières
Réserve de sécurité, objectif d'épargne mensuel par défaut, plafond variable par défaut, seuils d'alerte budgétaire **[Par défaut] 80 % et 100 %**, visite guidée terminée ou passée (`tutorialDone`, lot 13). Le plancher d'épargne (D3) et le compte par défaut ne sont plus proposés : il n'y a plus de compte d'épargne ni d'achat financé par l'épargne (D9).

### 4.8 Objectif d'achat
Nom, catégorie, description, prix estimé, montant maximal acceptable, date cible, **important** et **urgent** (le quadrant en dérive, comme pour les tâches : urgence et importance restent deux critères indépendants), statut, montant réservé, notes, opération d'achat liée une fois l'achat fait. Le marquage « financé par l'épargne » est retiré au lot 13 (D9) ; la migration V8 le désactive sur les objectifs existants. L'interface présente les objectifs sous le nom **Projets d'achat**.

### 4.9 Prêts : une catégorie
L'entité Prêt (personne, sens, reste dû, régularisation) est **supprimée** au lot 13 (D8). Un prêt se saisit comme une opération ordinaire de la catégorie « Prêts » :

| Situation | Saisie |
| --- | --- |
| J'ai prêté de l'argent | Dépense, catégorie « Prêts » |
| Je rembourse un emprunt | Dépense, catégorie « Prêts » |
| On m'a prêté de l'argent | Revenu, catégorie « Prêts » |
| On me rembourse | Revenu, catégorie « Prêts » |

Ces opérations comptent dans les dépenses et revenus du mois, donc dans l'épargne réelle. Il n'y a plus de reste dû, de régularisation ni d'alerte de retard. La migration V8 convertit les mouvements de prêt existants de cette façon (catégorie racine « Prêts » réutilisée, ou créée), puis supprime la table des prêts : seuls les mouvements d'argent sont conservés. Une sauvegarde qui contient des prêts est convertie de la même façon à l'import.

## 5. Budget du mois

| Indicateur | Calcul |
| --- | --- |
| Revenus prévus / reçus | Occurrences de revenus du mois, prévues / réalisées |
| Dépenses indispensables prévues / payées | Échéances et opérations indispensables du mois (dont les dépenses fixes) |
| Dépenses variables payées | Dépenses non indispensables réalisées du mois, moins leurs remboursements, **hors achats d'objectifs** (D4). Les dépenses exceptionnelles non indispensables y entrent. |
| Plafond variable | Somme des plafonds des enveloppes actives ; sans enveloppe, plafond du mois ou par défaut (§ 4.6) |
| Plafond consommé | Dépenses variables payées ÷ plafond |
| Reste variable | Plafond − dépenses variables payées (négatif = dépassement) |
| État | Vert sous 80 %, orange de 80 % à 100 %, rouge au-delà, avec avertissement explicite. L'enregistrement d'une dépense réelle n'est **jamais** bloqué. |
| Enveloppes | Pour chacune : plafond, dépensé, reste ; dépassement signalé, commentaire demandé (§ 4.5) |
| Épargne prévue / réelle | § 3 ; comparée à l'objectif d'épargne du mois |

Les dépenses exceptionnelles sont signalées à part dans le bilan du mois ; elles comptent dans l'indispensable ou le variable selon leur propre marquage. La **feuille du mois** présente ce budget section par section (revenus, dépenses fixes, dépenses variables, autres dépenses) avec prévu, réel et écart ; le calcul de ses totaux est fixé dans la [feuille du mois](feuille-du-mois.md) § 3.

## 6. Prévision de trésorerie

Calcul jour par jour, d'aujourd'hui à l'horizon, sur le **solde disponible** :

1. **Point de départ** : solde réel du compte unique aujourd'hui.
2. **Entrées prévues** : occurrences de revenus aux dates d'échéance, au montant daté de leur mois. Un salaire attendu dont la date est passée sans réception est « en retard » : il reste compté (au lendemain) mais rend « risqué » tout verdict qui en dépend (D5). Les prêts n'étant plus suivis (D8), un remboursement attendu n'entre dans la prévision que s'il a été saisi comme revenu prévu.
3. **Sorties prévues** : échéances indispensables et abonnements actifs, au montant daté de leur mois ; dépenses prévues saisies.
4. **Dépenses variables anticipées** : le reste du plafond variable du mois en cours, puis le plafond complet des mois suivants (somme des enveloppes quand il y en a), **réparti uniformément sur les jours** du mois.
5. **Épargne** : l'objectif d'épargne du mois est retiré du disponible à la date du salaire (« se payer en premier ») ; il est protégé.
6. **Réserve de sécurité** : le disponible prévu ne doit jamais descendre sous ce seuil.
7. **Objectifs d'achat** : retirés à leur date d'achat retenue, dans l'ordre de priorité (§ 7.4).

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
| **Risqué** | Condition remplie de justesse (marge < 10 %), ou seulement grâce à un salaire en retard. |
| **Non réalisable** | Condition non remplie. L'application calcule la **première date réaliste** (premier jour où la condition est remplie), généralement juste après un salaire, ou indique qu'aucune date ne convient dans l'horizon de 24 mois. |
| **Indéterminé** | Données insuffisantes : solde de départ non saisi, ou aucun revenu prévu. |

Le détail affiché : montant nécessaire, déjà réservé, reste à financer, disponible prévu à la date, point le plus bas après l'achat, date de faisabilité, entrées incertaines prises en compte. Exemple attendu : « Ton achat de 400 € n'est pas compatible avec ton budget prévisionnel au 1er janvier 2027. Selon tes revenus et dépenses prévus, une date plus réaliste serait le 31 janvier 2027. »

### 7.3 Financement par l'épargne — retiré au lot 13
Supprimé le 5 novembre 2026 (D9). L'épargne n'étant plus un compte séparé, tout l'argent du compte unique entre dans le disponible et seule la réserve de sécurité le protège : il n'y a plus d'objectif « financé par l'épargne » ni de plancher d'épargne. La migration V8 retire ce marquage des objectifs existants.

### 7.4 Plusieurs objectifs
Les objectifs ouverts sont traités l'un après l'autre par priorité **[Par défaut : quadrant Q1, Q2, Q3, Q4, puis date cible, puis date de création]**. Chaque objectif retenu retire son montant de la prévision à sa date d'achat retenue (date cible si réalisable, sinon première date réaliste) avant d'évaluer le suivant : les mêmes fonds ne sont jamais promis deux fois.

### 7.5 Enregistrer malgré l'avertissement
Un objectif non réalisable s'enregistre quand même. L'interface propose de garder la date (avec avertissement), de reporter à la date réaliste, de réduire le budget, d'ajouter un effort d'épargne mensuel, ou de changer la priorité. Chaque option est recalculée avant confirmation.

### 7.6 Recalcul
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
| Salaire plus bas un mois (absence) | Saisir le réel de ce mois ; le prévu reste affiché avec l'écart ; les autres mois ne changent pas. |
| Mois sans salaire | Occurrence « sautée » ; la prévision n'attend aucun salaire ce mois-là. |
| Plusieurs revenus dans le mois | Tous comptés ; un échéancier par source régulière. |
| Montant fixe qui augmente | Nouveau montant **à partir du mois** concerné ; les mois précédents gardent l'ancien. |
| Facture exceptionnelle | Montant modifié **ce mois seulement**. |
| Réel saisi par erreur | Confirmer de nouveau avec le bon montant (le prévu est conservé) ou annuler l'enregistrement (l'échéance redevient prévue). |
| Plafond d'une dépense variable dépassé | Jamais bloquant ; commentaire demandé sur la feuille ; alerte `ENVELOPE_OVER`. |
| Total du mois saisi d'un coup | Une opération de total complète les dépenses déjà saisies de la catégorie ; refus si elles dépassent déjà ce total ou si le mois est futur. |
| Dépense annulée | Statut annulé : plus aucun effet ; conservée dans l'historique. |
| Abonnement suspendu | Plus d'échéance jusqu'à la reprise. |
| Prêt accordé ou reçu, remboursement | Dépense ou revenu de la catégorie « Prêts » (§ 4.9) ; ni reste dû ni alerte. |
| Achat plus cher ou moins cher | Le prix réel fait foi ; l'écart est conservé. |
| Doublon probable | Même type et même montant à trois jours près : l'interface le signale avant d'enregistrer, sans bloquer. |
| Solde négatif | Permis et signalé (découvert) ; la prévision l'affiche en rouge. |
| Catégorie modifiée ou archivée | Les opérations restent rattachées et lisibles. |
| Correction du solde | Opération `CORRECTION` de l'écart, visible et datée. |
| Sauvegarde ancienne à plusieurs comptes ou avec des prêts | Fusionnée et convertie à l'import (§ 4.1, § 4.9). |

## 10. Alertes (calculées, non stockées)

Plafond variable à 80 % puis dépassé ; plafond d'une dépense variable plafonnée dépassé (`ENVELOPE_OVER`, lot 13) ; échéance importante dans les 7 jours ; solde prévisionnel sous la réserve dans les 60 jours ; objectif devenu risqué ou non réalisable ; revenu attendu non reçu. Les alertes de prêt ou d'emprunt en retard sont supprimées au lot 13 (D8).

## 11. Données, sécurité, sauvegarde

- Usage local mono-utilisateur, comme le reste de l'application : pas d'authentification ajoutée. Les montants ne sont jamais journalisés.
- Toutes les entités financières entrent dans la sauvegarde JSON et dans l'aperçu d'import. Depuis le lot 13, format **v5** : montants datés des échéanciers, enveloppes (plafonds datés), commentaires et totaux du mois ; plus de section des prêts. Les sauvegardes antérieures restent importables ; leurs comptes multiples et leurs prêts sont convertis (§ 4.1, § 4.9).
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
| Feuille du mois, montants datés, dépenses variables plafonnées | Haute (suivi mensuel simple) | Moyenne | Lot 13 |
| Visite guidée et bulles d'aide | Haute (prise en main) | Faible | Lot 13 |
| Multi-devise, rapprochement bancaire, import de relevés | Faible pour l'usage actuel | Élevée | Hors v1 |

## 13. Organisation de l'interface

Une seule entrée **« Mes achats »** dans la navigation (D6). Depuis le lot 13 (D11), quatre onglets : **Mon mois** (la feuille du mois, par défaut) · **Opérations** (historique ; vue « Revenus et charges récurrents ») · **Projets d'achat** (liste, matrice, prévision, « Et si… ? ») · **Analyses** (statistiques, calendrier) ; l'icône ⚙ **Réglages** (compte unique, préférences, catégories) et le bouton **?** (visite guidée). Des bulles d'aide accompagnent chaque section et les notions (prévu, réel, plafond, épargne, « à partir de », « ce mois seulement »). Un bouton « Dépense » accessible partout, ainsi qu'un raccourci clavier (E), ouvrent la saisie rapide. Adresses, redirections des anciennes adresses et repères de la visite : [feuille du mois § 4](feuille-du-mois.md#4-interface).

## 14. Décisions

| # | Sujet | État |
| --- | --- | --- |
| D1 | Plusieurs comptes simples (courant, épargne, espèces) ; épargne = virement ; réservations virtuelles | **Validé** le 1 novembre 2026 ; comptes multiples et épargne par virement **remplacés** le 5 novembre 2026 (D7, D9) ; réservations virtuelles conservées |
| D2 | Euro uniquement ; mois civil ; correction par opération ; seuils 80/100 % ; ordre de priorité des objectifs | Par défaut (sans objection) |
| D3 | L'épargne existante finance un achat seulement pour un objectif marqué « financé par l'épargne », au-dessus d'un plancher | **Validé** le 1 novembre 2026 ; **retiré** le 5 novembre 2026 (D9) |
| D4 | Les achats d'objectifs ne consomment pas le plafond variable ; les dépenses exceptionnelles non indispensables, si | **Validé** le 1 novembre 2026 |
| D5 | Faisabilité : salaires prévus comptés (en retard → « risqué ») ; remboursements de prêts attendus non comptés | **Validé** le 1 novembre 2026 ; partie prêts sans objet depuis D8 |
| D6 | Une entrée « Mes achats » avec onglets ; bouton de saisie rapide accessible partout | **Validé** le 1 novembre 2026 ; onglets réorganisés par D11 |
| D7 | Un seul compte représente tout l'argent (banque, épargne, espèces) ; plus d'ajout de compte ; comptes existants fusionnés par la migration V8 (soldes de départ des autres comptes → corrections « Solde de départ — <nom> », virements internes supprimés) ; sauvegarde ancienne fusionnée de même à l'import | **Validé** le 5 novembre 2026 |
| D8 | Plus de suivi des prêts : prêt accordé ou remboursement versé = dépense « Prêts » ; emprunt reçu ou remboursement reçu = revenu « Prêts » (catégorie facultative pour un revenu) ; onglet Prêts, régularisation et alertes de prêt supprimés | **Validé** le 5 novembre 2026 |
| D9 | L'épargne n'est pas un compte : c'est ce qui reste du mois (revenus reçus − dépenses payées), suivi chaque mois face à un objectif ; statistiques mois par mois (épargne, objectif atteint ou manqué, plafond variable tenu ou dépassé) ; plus de financement par l'épargne ni de plancher | **Validé** le 5 novembre 2026 |
| D10 | Feuille du mois : revenus saisis une fois pour un mois ou une période, réel à confirmer ; dépenses fixes pré-remplies ; montants « à partir d'un mois » ou « ce mois seulement » ; dépenses variables plafonnées (dépensé, reste, total du mois, commentaire en cas de dépassement) ; autres dépenses ; épargne prévue / réelle | **Validé** le 5 novembre 2026 ; [feuille du mois](feuille-du-mois.md) |
| D11 | Quatre onglets (Mon mois, Opérations, Projets d'achat, Analyses) et ⚙ Réglages ; visite guidée (première visite, passable, relançable) et bulles d'aide ; anciennes adresses redirigées | **Validé** le 5 novembre 2026 |
| D12 | Sauvegarde v5 (montants datés, enveloppes, commentaires), versions antérieures importables et converties ; priorité inchangée : Angular d'abord, React et mobile après la version stable | **Validé** le 5 novembre 2026 |
