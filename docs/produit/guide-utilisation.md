# FocusWithAkram — guide d’utilisation

Mis à jour le **5 novembre 2026** pour Angular et React (Mes achats et Notes & idées : Angular seulement ; « Mes achats » décrit la version simplifiée du lot 13). Installation : [exploitation](../technique/exploitation.md). Les interfaces utilisent les mêmes données ; leur présentation et leur mode d’enregistrement peuvent différer.

## 1. Ouvrir l’application

Après lancement, ouvrir Angular sur `http://127.0.0.1:4200` ou React sur `http://127.0.0.1:5173`. Il n’y a pas de compte à créer pour l’usage local actuel.

Sur ordinateur, la barre latérale permet de naviguer et de se replier. Sur mobile, la barre inférieure donne les accès principaux ; **Plus** ouvre les destinations complémentaires. Les pages communes sont Tableau de bord, Matrice d’Eisenhower, Mes tâches, Focus / Pomodoro, Calendrier, Statistiques, Projets, Archives et Paramètres ; Angular ajoute **Mes achats** et **Notes & idées**.

## 2. Première utilisation : préparer sa journée

1. Ouvrir **Paramètres** et choisir le fuseau, le thème et le premier jour de la semaine.
2. Créer quelques tâches avec **Nouvelle tâche**. Donner un titre concret et, si utile, un projet et une échéance.
3. Les répartir dans la matrice : Q1 faire maintenant, Q2 planifier, Q3 limiter/déléguer, Q4 plus tard/éliminer.
4. Choisir les trois priorités du jour depuis le tableau de bord.
5. Ouvrir **Focus / Pomodoro**, configurer le minuteur puis commencer une session.

Les paramètres et le classement sont conservés côté serveur. Une autre interface déjà ouverte peut nécessiter un rechargement pour afficher le même état.

## 3. Créer et modifier une tâche

Le titre est obligatoire. Le formulaire propose description, notes, quadrant, projet, étiquettes, estimation, dates prévues et sous-tâches selon le contexte. Les étiquettes se saisissent en liste dans les formulaires ; les propositions existantes facilitent leur réutilisation.

Les dates affichées utilisent le fuseau configuré. Une date vide reste inconnue ; elle ne signifie pas minuit aujourd’hui. Une estimation est une durée attendue, distincte du temps travaillé par Pomodoro.

Ouvrir le détail d’une tâche pour consulter ses informations, ses sous-tâches, sa chronologie et ses cycles. Les menus d’actions permettent notamment modifier, dupliquer, terminer ou supprimer selon son état.

## 4. Utiliser la matrice et les listes

Sur grand écran, les quatre quadrants sont affichés en grille. Déplacer une carte dans un autre quadrant modifie son importance/urgence et enregistre son nouvel emplacement. Sur petit écran, sélectionner l’onglet Q1, Q2, Q3 ou Q4.

Pour le clavier, placer le focus sur la carte puis utiliser **Alt + 1…4** pour changer de quadrant et **Alt + ↑/↓** pour modifier l’ordre, lorsque cette carte expose les commandes de déplacement. La souris n’est pas obligatoire pour les parcours couverts.

Dans **Mes tâches**, choisir Priorités, Aujourd’hui, Semaine, Toutes, En retard ou Terminées. Les filtres projet, statut, texte et étiquette dépendent de la page. Si une tâche semble absente, commencer par retirer les filtres. Pour retrouver des tâches terminées anciennes, préférer **Archives**.

## 5. Commencer, terminer et restaurer

- **Commencer** renseigne le début réel, puis place la tâche en cours. La pause/remise à faire ne supprime pas ce début.
- **Terminer** renseigne la fin réelle et archive la tâche. Si elle n’a jamais commencé, indiquer son début réel ; l’application ne l’invente pas.
- **Restaurer**, depuis les archives, rouvre la tâche dans un nouveau cycle. Les dates réelles courantes sont réinitialisées et l’ancien historique reste disponible.

Une fin antérieure au début ou une date réelle future incohérente est refusée. Corriger la valeur indiquée dans le message, puis enregistrer de nouveau. En cas de modification concurrente, recharger le détail avant de recommencer.

## 6. Configurer le Pomodoro dans Focus

Ouvrir **Focus / Pomodoro → Configurer**. Le panneau **Minuteur Pomodoro** contient :

| Option                      | Usage                                                                      |
| --------------------------- | -------------------------------------------------------------------------- |
| Travail                     | Durée d’une séance de concentration : 1 à 180 minutes                      |
| Pause courte / longue       | Récupération courte de 1 à 60 min ; longue de 1 à 120 min                  |
| Sessions avant pause longue | Nombre de séances du cycle : 1 à 12                                        |
| Objectif quotidien          | Cible de concentration : 0 à 720 minutes                                   |
| Démarrage des pauses        | Enchaîner automatiquement vers la pause quand les conditions le permettent |
| Session suivante            | Reprendre automatiquement le travail selon le réglage                      |
| Son                         | Activer/désactiver et choisir cloche, carillon ou son doux                 |
| Notifications               | Demander l’autorisation du navigateur et activer les notifications         |

**Angular enregistre automatiquement** au changement d’un champ. **React demande de cliquer sur Enregistrer le minuteur** ; une saisie non enregistrée reste un brouillon. Attendre la confirmation ou la disparition de l’état occupé avant de quitter le formulaire.

Les réglages Pomodoro ne sont plus dans les paramètres généraux. Une session déjà démarrée garde sa durée ; modifier le travail à 40 minutes ne rallonge pas une séance en cours. Angular propose aussi un bouton d’écoute du son ; ne pas supposer sa présence identique dans React.

Si les notifications sont refusées, vérifier l’autorisation du site dans le navigateur puis réactiver l’option. Un navigateur ne prenant pas en charge cette fonction ne pourra pas l’activer. L’application n’est pas un réveil garanti lorsque le navigateur est fermé.

## 7. Travailler avec le minuteur

1. Choisir Concentration, Pause courte ou Pause longue.
2. Associer une tâche si le travail doit l’alimenter.
3. Appuyer sur **Démarrer**.
4. Utiliser **Pause**, **Reprendre**, la fin ou l’interruption selon le besoin. Les commandes visibles dépendent de l’état de la session.
5. Consulter le temps travaillé et l’historique sous le minuteur.

Une seule session peut être active pour le backend partagé. Si Angular a déjà démarré une séance, React ne peut pas en créer une seconde indépendante. Reprendre l’existante ou l’interrompre.

Recharger la page ne remet pas le compteur à zéro : le navigateur resynchronise la séance avec le serveur. Un décalage temporaire peut se corriger au retour au premier plan. En cas de réseau coupé, attendre la resynchronisation avant d’interpréter l’état comme définitivement enregistré.

## 8. Calendrier et projets

Le calendrier propose Mois, Semaine et Jour, la navigation temporelle et les tâches non planifiées. Sélectionner une date pour voir ses tâches. Le déplacement vers une autre date enregistre la replanification ; vérifier les horaires dans le détail si le fuseau a changé.

Dans **Projets**, créer un regroupement avec nom, couleur et informations complémentaires. La progression dépend des tâches réellement associées. Ouvrir l’aperçu d’une tâche pour accéder à son détail. Archiver un projet et le supprimer sont deux opérations différentes ; une suppression conserve les tâches en les détachant du projet.

## 9. Tableau de bord, statistiques et archives

Le dashboard aide à choisir la prochaine action : tâches restantes, réalisées, retard, objectif, Top 3, mini-matrice et session. Les statistiques permettent de changer la période et de comparer le temps planifié, réel écoulé et actif.

Ces temps peuvent être différents sans erreur : une tâche commencée lundi et finie mercredi a une durée écoulée longue, même si elle ne représente que trois séances de travail. Les pauses et interruptions de sessions sont distinguées.

Les archives regroupent les tâches par fin réelle dans le fuseau de l’utilisateur. Consulter le détail pour retrouver les dates et sessions du cycle ; restaurer pour recommencer sans effacer l’ancien travail.

## 10. Exporter et importer

Dans **Paramètres**, exporter les tâches en CSV ou JSON, ou télécharger une **Sauvegarde complète**. Pour une reprise complète des données métier, préférer cette dernière au CSV : elle contient aussi les préférences, le Top 3, « Mes achats » et les **notes et idées** (catégories, idées et lien entre chaque tâche et son idée d’origine). À l’import, l’aperçu indique ce qui sera créé, ignoré (doublons) ou signalé comme invalide ; les préférences du fichier remplacent les préférences courantes.

Pour importer : sélectionner le JSON, lire l’aperçu des créations, réutilisations, doublons et erreurs, puis confirmer l’import. Conserver le fichier d’origine jusqu’à vérification des tâches, projets et historiques.

Depuis le format v2, la sauvegarde complète contient les préférences (thème, fuseau, minuteur, mode d’éditeur des notes) ; l’export CSV ne les contient pas. Un export contient des données personnelles en clair : le conserver à un endroit adapté.

## 11. Mes achats : votre mois, pas à pas

Le module **Mes achats** (menu, ou G puis B ; Angular) suit votre argent réel, mois par mois. Règles complètes : [spécification](mes-achats/specification.md) et [feuille du mois](mes-achats/feuille-du-mois.md).

En bref : **un seul compte** pour tout votre argent, une **feuille par mois** (prévu, réel, écart), et votre **épargne = ce qui reste** à la fin du mois.

### 11.1 Premier accès : votre argent aujourd’hui

1. Ouvrez **Mes achats** et commencez : la fenêtre **Mon argent aujourd’hui** demande votre total.
2. Additionnez tout votre argent : compte en banque, épargne (livret…) et espèces. Saisissez ce **total** (virgule acceptée), gardez ou changez le nom du compte, puis **Commencer**.
3. C’est le point de départ de tous les calculs. Il n’y a qu’un compte : vous n’en ajouterez pas d’autre.

À la première visite, une **visite guidée** présente les écrans (§ 11.9).

### 11.2 Lire « Mon mois »

**Mon mois** est l’onglet par défaut. Choisissez le mois en haut de la feuille ; le résumé reprend les totaux. Chaque ligne montre le **prévu**, le **réel** (ce qui a vraiment été reçu ou payé) et l’**écart** (réel − prévu).

| Section | Vous y voyez | Vous y faites |
| --- | --- | --- |
| Revenus | Salaire et autres revenus prévus du mois | Confirmer le montant reçu (§ 11.3) |
| Dépenses fixes | Loyer, téléphone, transport… déjà remplis | Confirmer « payé » (§ 11.4) |
| Dépenses variables | Courses, restaurants… : plafond, dépensé, reste | Ajouter les dépenses ou le total du mois ; commenter un dépassement (§ 11.5) |
| Autres dépenses | Imprévus, achats réalisés | Bouton **Dépense** ou touche **E** (§ 11.6) |
| En bas | Épargne prévue, épargne réelle, objectif | Vérifier que l’objectif est atteint (§ 11.8) |

Seul le **réel** change votre solde ; le prévu sert à anticiper.

### 11.3 Votre salaire : une saisie pour plusieurs mois

1. Ajoutez un **revenu prévu** (section **Revenus** de Mon mois, ou **Opérations → Revenus et charges récurrents → Revenu prévu**).
2. Indiquez le montant, le jour de versement et la période : un seul mois, ou plusieurs (ex. 2 290 € le 28, de novembre 2026 à février 2027).
3. Le revenu apparaît **prévu** dans chaque mois de la période. Le jour venu, confirmez le montant **réellement reçu** : il peut être plus bas (absence, prime en moins). Le prévu reste affiché avec l’écart ; les autres mois ne changent pas.
4. Erreur de saisie ? Confirmez de nouveau avec le bon montant, ou annulez l’enregistrement : la ligne redevient prévue.

Un revenu ponctuel (cadeau, vente) se saisit dans **Opérations → + Opération**, type Revenu.

### 11.4 Dépenses fixes : une fois pour toutes

1. Déclarez une fois chaque charge fixe (loyer, téléphone, abonnement de transport) : **Opérations → Revenus et charges récurrents → Charge ou abonnement** (montant, jour, catégorie).
2. Chaque mois, la feuille en est **déjà remplie**. Quand c’est payé, confirmez **payé** avec le montant réel.
3. Le montant change ? Deux choix :
   - **À partir de ce mois** : le loyer passe de 350 € à 400 € en janvier 2027 → choisissez janvier 2027 et 400 € ; novembre et décembre 2026 restent à 350 €.
   - **Ce mois seulement** : une facture exceptionnellement plus élevée → seul ce mois change.
4. Pas de paiement ce mois-ci : **sautez** l’échéance. Fin d’un abonnement : résiliez-le dans **Revenus et charges récurrents** ; l’historique reste.

### 11.5 Dépenses variables : un plafond par poste

1. Dans la section **Dépenses variables** de Mon mois, créez une **dépense variable plafonnée** : une catégorie et un plafond mensuel (ex. courses 300 €), à partir d’un mois.
2. Au fil du mois, chaque dépense de cette catégorie (bouton **Dépense**, touche **E**) s’ajoute au **dépensé** ; la feuille affiche le **reste**.
3. Vous ne gardez pas chaque ticket ? **Saisir le total du mois** : indiquez ce que vous avez dépensé en tout ; l’application complète les dépenses déjà saisies. Impossible pour un mois futur ou pour un total plus bas que ce qui est déjà saisi.
4. **Dépassement** : la dépense n’est jamais bloquée, mais la ligne le signale et la feuille vous demande un **commentaire** (« invités pour un anniversaire »). Il reste attaché à ce mois.
5. Changer un plafond : **à partir d’un mois**, comme pour une dépense fixe. Ne plus plafonner un poste : terminez-le après un mois ; ses dépenses restent dans l’historique.

La somme de ces plafonds forme le **plafond variable** du mois. Un achat d’un projet d’achat (§ 11.10) ne l’entame pas.

### 11.6 Autres dépenses et saisie rapide

- Touche **E** (ou bouton **Dépense**, ou la palette) depuis n’importe quel écran : montant (virgule acceptée), libellé, catégorie. Cochez « Indispensable » pour une charge, « Exceptionnelle » pour un imprévu.
- Une dépense d’une catégorie plafonnée rejoint sa ligne ; les autres apparaissent dans **Autres dépenses**.
- **Retour d’un produit** : dans **Opérations**, menu **⋯ → Saisir un remboursement** sur la dépense ; il réduit les dépenses de la catégorie, ce n’est pas un revenu.
- **Doublon** : si une opération semblable existe (même montant, à trois jours près), l’application le signale ; confirmez si ce n’est pas la même.
- **Annuler** garde l’opération dans l’historique sans effet ; **Supprimer** l’efface (erreur de saisie).

### 11.7 Prêts : une simple catégorie

| Vous… | Saisissez |
| --- | --- |
| prêtez de l’argent | une dépense, catégorie « Prêts » |
| remboursez quelqu’un | une dépense, catégorie « Prêts » |
| empruntez de l’argent | un revenu, catégorie « Prêts » |
| êtes remboursé | un revenu, catégorie « Prêts » |

La catégorie d’un revenu est facultative : choisissez « Prêts » dans le formulaire du revenu. Si elle n’existe pas encore, créez-la dans **⚙ Réglages → Catégories**. Il n’y a plus de suivi du reste dû ni d’alerte de retard.

### 11.8 Épargne et objectif

- L’épargne n’est pas un compte : c’est **ce qui reste** du mois. **Épargne prévue** = revenus prévus − dépenses prévues ; **épargne réelle** = revenus reçus − dépenses payées.
- Fixez votre **objectif d’épargne** dans **⚙ Réglages → Préférences financières** (objectif par défaut, repris chaque mois), ou pour un mois précis avec le bouton **Objectif d’épargne** de **Mon mois**. En bas de la feuille, l’épargne réelle est comparée à cet objectif.
- **Analyses** montre, mois par mois, l’épargne, l’objectif **atteint** ou **manqué** et le plafond variable **tenu** ou **dépassé**.
- Rien à « virer » vers l’épargne : l’argent qui reste sur le compte est votre épargne.

### 11.9 Visite guidée et bulles d’aide

- La **visite guidée** s’ouvre seule à votre première visite de Mes achats. Chaque étape a **Suivant**, **Précédent** et **Passer**. Une fois terminée ou passée, elle ne revient plus d’elle-même ; le bouton **?** en haut de Mes achats la relance.
- Les petites icônes **?** à côté des sections et des notions (prévu, réel, plafond, épargne, « à partir de », « ce mois seulement ») ouvrent une courte explication. Elles s’utilisent aussi au clavier et sont lues par les lecteurs d’écran.

### 11.10 Où trouver le reste

| Onglet | Contenu |
| --- | --- |
| **Opérations** | **Historique** filtrable (période, type, statut, catégorie, nature, montant, texte) et bouton **+ Opération** (revenu ponctuel, dépense prévue). Vue **Revenus et charges récurrents** : salaire, loyer, abonnements, paiements en plusieurs fois ; suspendre, reprendre, résilier. |
| **Projets d’achat** | Ajoutez un produit ou un service (prix estimé, maximum acceptable, date cible, importance, urgence) : l’application dit s’il est **réalisable** à la date voulue (revenus et échéances prévus, plafond variable, épargne du mois, réserve de sécurité, autres achats prioritaires, trois mois suivant l’achat) et propose sinon une date réaliste, un budget réduit, un effort d’épargne ou une priorité plus haute. Vue **Matrice** (glisser ou **⋯ → Déplacer en Qx**), **Réserver de l’argent**, **Je l’ai acheté**, **Reporter**, **Abandonner**, prévision de trésorerie et panneau **Et si… ?** (baisse de salaire, achat supplémentaire, report : rien n’est enregistré). |
| **Analyses** | **Statistiques** sur 3, 6, 12 ou 24 mois : revenus, dépenses, épargne, objectif et plafond mois par mois, dépenses par catégorie, plus grosses dépenses, écart entre prix estimés et payés. **Calendrier** : le mois jour par jour, opérations réalisées et prévues. |
| **⚙ Réglages** | **Mon compte** : **Renommer**, **Corriger le solde** (l’écart avec la banque devient une correction datée et visible). **Préférences financières** : réserve de sécurité, plafond variable et objectif d’épargne par défaut, seuil d’alerte (80 % par défaut). **Catégories** : créer, renommer, déplacer, archiver (une catégorie utilisée s’archive au lieu d’être supprimée). |

Les **alertes** signalent ce qui demande votre attention : plafond presque atteint ou dépassé, dépense variable au-delà de son plafond, salaire non reçu, échéances des 7 prochains jours ou en retard, disponible prévu sous votre réserve, projet d’achat devenu risqué. Chacune mène à l’onglet où agir et disparaît d’elle-même quand sa cause disparaît.

### 11.11 Après la mise à jour du 5 novembre 2026

Si vous utilisiez déjà Mes achats :

- vos comptes ont été **fusionnés** en un seul, sans changer le total : le solde de départ de chaque autre compte apparaît comme une correction « Solde de départ — <nom du compte> », et les virements entre vos comptes ont disparu ;
- vos **prêts** sont devenus des dépenses ou des revenus de la catégorie « Prêts » ;
- l’onglet Prêts, l’onglet Budget et la vue d’ensemble sont remplacés par **Mon mois** ; les anciens liens y mènent automatiquement (l’échéancier mène à **Opérations → Revenus et charges récurrents**, les statistiques et le calendrier à **Analyses**) ;
- votre disponible inclut désormais l’argent qui était sur un compte d’épargne.

## 12. Notes & idées : de l’idée à la tâche

La page **Notes & idées** (menu, ou G puis N) garde vos idées personnelles, professionnelles ou techniques pour les développer à votre rythme, puis les transformer en tâches. Une idée **n’a pas de statut** : ce sont les tâches qui en sont issues qui en ont un. Règles : [cahier des charges § 4.5](cahier-des-charges.md).

1. **Noter une idée** : tapez un titre dans le champ en haut de la page puis **Entrée** (ou **Développer** pour l’ouvrir aussitôt). Depuis n’importe quelle page, la touche **I** (ou la palette : « Noter une idée ») ouvre une saisie rapide : un titre suffit.
2. **Développer** : cliquez sur une carte pour ouvrir l’éditeur. Titre, catégorie, étiquettes et contenu sont **enregistrés automatiquement** (« Enregistré » s’affiche en haut) ; quitter la page enregistre aussi la saisie en cours. Un titre vide n’est pas enregistré.
3. **Deux modes d’édition**, au choix avec le bouton **Markdown / Visuel** de l’éditeur (ou dans **Paramètres → Notes & idées**) :
   - **Markdown** : vous écrivez la syntaxe (`## Titre`, `- liste`, `- [ ] case à cocher`, `**gras**`) ; la barre d’outils l’insère pour vous, **Ctrl+B** / **Ctrl+I** mettent en gras / en italique, **Ctrl+Z** annule. L’onglet **Aperçu** montre le rendu ; on peut y cocher les cases.
   - **Visuel** : la mise en forme s’affiche directement pendant la saisie.

   Le contenu est le même dans les deux modes : une note écrite dans l’un s’ouvre dans l’autre. Le mode visuel peut réécrire légèrement la syntaxe (par exemple ajouter une ligne vide sous un titre) sans changer le contenu.
4. **Organiser** : une **catégorie** (créée dans l’écran **Catégories**, avec une couleur), des **étiquettes** séparées par des virgules et l’étoile **Favori**. La liste se filtre par texte (titre et contenu), catégorie, étiquette, et par vue : **Toutes**, **Favorites**, **À transformer** (aucune tâche encore), **Avec tâches** ; elle se trie par date de modification, de création ou par titre.
5. **Transformer en tâche** : dans l’éditeur, **Créer une tâche** ouvre le formulaire de tâche habituel, prérempli avec le titre et les étiquettes de l’idée ; **Reprendre le contenu de l’idée** copie le texte dans la description. Choisissez le quadrant (urgence et importance), une échéance si besoin, puis **Créer la tâche** : elle rejoint la matrice d’Eisenhower. Recommencez autant de fois que nécessaire : une idée peut donner plusieurs tâches.
6. **Suivre** : le panneau **Tâches issues de cette idée** liste ces tâches avec leur statut et leur quadrant ; cliquez pour ouvrir leur détail. Depuis le détail d’une tâche, le lien **Issue de l’idée « … »** ramène à l’idée. Dans **Mes tâches**, une pastille **Idée** signale ces tâches.
7. **Doublon** : si une tâche du même titre est déjà issue de cette idée, le formulaire le signale ; modifiez le titre ou confirmez avec **Créer quand même**.
8. **Supprimer** : une idée sans tâche se supprime après confirmation. Si des tâches en sont issues, la suppression simple est **bloquée** et un avertissement en explique la raison ; **Supprimer quand même** supprime l’idée définitivement, ses tâches restent dans la matrice sans lien vers elle.

Supprimer une catégorie conserve ses idées, sans catégorie.

## 13. Recherche et raccourcis

| Action                             | Raccourci / accès                                              |
| ---------------------------------- | -------------------------------------------------------------- |
| Palette de recherche               | Ctrl + K, ou Cmd + K sur macOS                                 |
| Nouvelle tâche                     | N, si les raccourcis simples sont activés                      |
| Saisir une dépense                 | E, si les raccourcis simples sont activés                      |
| Noter une idée (Angular)           | I, si les raccourcis simples sont activés                      |
| Navigation                         | G puis D/M/T/F/C/S/B/N/A selon la destination (B : Mes achats, N : Notes & idées) |
| Pause/reprise d’une session active | Espace, hors champ de saisie et selon l’élément qui a le focus |
| Fermer une fenêtre                 | Échap lorsque le dialogue le permet                            |
| Aide rapide Angular                | ? ; la palette accepte aussi /                                 |
| Visite guidée de Mes achats        | Bouton **?** en haut de Mes achats (distinct de la touche ?)   |

Les champs de saisie gardent leur usage normal. Les raccourcis simples peuvent être désactivés ; Ctrl/Cmd + K reste un accès privilégié. Consulter la liste affichée dans l’interface plutôt que de supposer que tous les raccourcis optionnels sont identiques dans les deux variantes.

## 14. Messages et dépannage courant

| Situation                               | Action                                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------------------- |
| La liste est vide                       | Retirer les filtres ; vérifier le projet, le quadrant et le statut.                         |
| La tâche est terminée                   | Aller dans Archives ; restaurer pour un nouveau cycle.                                      |
| « Session déjà active »                 | Reprendre ou interrompre la séance existante, éventuellement lancée dans l’autre interface. |
| Enregistrement refusé                   | Corriger les champs signalés ; si conflit, recharger avant de ressaisir.                    |
| Anciennes valeurs dans l’autre frontend | Recharger l’interface pour récupérer l’état partagé.                                        |
| Pas de son / notification               | Vérifier les options Focus, le volume et les permissions du site.                           |
| API inaccessible                        | Faire vérifier le backend et son healthcheck ; voir le guide d’exploitation.                |

Il n’y a actuellement ni comptes multiples, ni délégation réelle à une autre personne, ni synchronisation complète hors ligne. Les différences de présentation entre variantes sont décrites dans le [design](../technique/design.md).
