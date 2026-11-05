# FocusWithAkram — guide d’utilisation

Mis à jour le **3 novembre 2026** pour Angular et React (Notes & idées : Angular seulement). Installation : [exploitation](../technique/exploitation.md). Les interfaces utilisent les mêmes données ; leur présentation et leur mode d’enregistrement peuvent différer.

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

## 11. Mes achats : comptes, dépenses et revenus

Le module **Mes achats** (menu, ou G puis B) suit votre argent réel. Ses règles complètes sont dans la [spécification](mes-achats/specification.md).

1. **Premier accès** : créez votre compte principal avec le montant réellement disponible aujourd’hui. Ajoutez ensuite, dans **Réglages**, un compte d’épargne ou des espèces. L’épargne n’entre pas dans le solde disponible.
2. **Saisie rapide** : touche **E** (ou bouton **Dépense**, ou la palette) depuis n’importe quel écran. Saisissez le montant (virgule acceptée), un libellé et une catégorie. Cochez « Indispensable » pour un loyer ou un abonnement de transport, « Exceptionnelle » pour une dépense imprévue.
3. **Réalisée ou prévue** : seule une opération réalisée (payée, reçue) change le solde. Un salaire attendu se saisit comme revenu **prévu** ; le jour venu, menu **⋯ → Marquer comme reçu** avec le montant réel : l’écart avec le prévu reste affiché.
4. **Virements** : d’un compte à un autre ; vers l’épargne, ils comptent comme épargne mise de côté.
5. **Retour d’un produit** : menu **⋯ → Saisir un remboursement** sur la dépense ; il réduit les dépenses de la catégorie, il ne compte pas comme un revenu.
6. **Doublons** : si une opération semblable existe (même compte et montant, à trois jours près), l’application le signale avant d’enregistrer ; confirmez si ce n’est pas la même.
7. **Solde différent de la banque** : **Corriger le solde** sur le compte. L’écart devient une correction visible et datée dans l’historique.
8. **Annuler ou supprimer** : « Annuler » garde l’opération dans l’historique sans effet ; « Supprimer » l’efface (erreur de saisie). Le solde initial ne se supprime pas : il se corrige.
9. **Catégories** : dans **Réglages**, créez, renommez, déplacez ou archivez catégories et sous-catégories. Une catégorie déjà utilisée s’archive au lieu d’être supprimée, pour que l’historique reste lisible.

10. **Échéancier** : déclarez votre salaire, vos abonnements, charges fixes et paiements en plusieurs fois (montant habituel, périodicité, première échéance, fin éventuelle). Leurs échéances apparaissent comme **prévues** dans la vue d’ensemble et le budget, jamais comme payées : menu **⋯ → Marquer comme payé / reçu** (montant réel), **Ajuster cette échéance** (autre montant ou date pour cette fois) ou **Sauter cette échéance** (mois sans salaire, abonnement non renouvelé). Suspendez, reprenez ou résiliez un échéancier ; son historique est conservé.
11. **Budget** : fixez pour le mois un **plafond des dépenses variables** et un **objectif d’épargne** (ou des valeurs par défaut dans **Réglages**). La jauge est verte, orange à partir du seuil d’alerte (80 % par défaut), rouge au-delà du plafond ; une dépense réelle n’est jamais bloquée. Le budget affiche aussi les revenus reçus et attendus, les dépenses indispensables du mois et l’épargne théorique (revenus attendus − indispensables − plafond).
12. **Préférences financières** (Réglages) : réserve de sécurité, plancher d’épargne, plafond et objectif par défaut, seuil d’alerte.
13. **Achats prévus** : ajoutez un produit ou un service (prix estimé, maximum acceptable, date cible, importance, urgence). Pendant la saisie, l’application calcule s’il est **réalisable** à la date voulue, en tenant compte de vos revenus et échéances prévus, du plafond variable, de l’épargne du mois, de votre réserve de sécurité et des autres achats prioritaires ; elle vérifie aussi les trois mois qui suivent l’achat. S’il ne l’est pas, elle propose une date réaliste, un budget réduit, un effort d’épargne mensuel ou une priorité plus haute. Vous pouvez toujours enregistrer l’objectif tel quel.
14. **Matrice des achats** : vue « Matrice » de l’onglet Achats prévus, distincte de celle des tâches. Glissez une carte ou utilisez **⋯ → Déplacer en Qx** : l’ordre de financement suit les quadrants (Q1 d’abord), puis la date cible.
15. **Réserver et acheter** : **⋯ → Réserver de l’argent** affecte une part du disponible libre à l’achat ; **Je l’ai acheté** enregistre la dépense réelle (prix et date réels), qui ne consomme pas le plafond variable. **Reporter** et **Abandonner** conservent l’historique ; la **prévision de trésorerie** affiche le disponible jour par jour avant et après les achats prévus.
16. **Prêts** : onglet **Prêts**, bouton **Prêt ou emprunt**. Indiquez la personne, le montant, la date, l’échéance éventuelle et le compte concerné ; cochez « Prêt antérieur au suivi » si l’argent a bougé avant votre solde de départ. Un prêt n’est ni une dépense ni un revenu. **⋯ → Remboursement reçu** (ou **Rembourser**) enregistre un remboursement, même partiel ; **Abandonner le reste** (ou **Dette remise**) clôt le prêt sans mouvement d’argent ; **Annuler** sert aux saisies erronées. Un remboursement que l’on vous doit n’est jamais compté comme disponible dans les prévisions ; une dette est déduite à son échéance.
17. **Alertes** : en tête de la vue d’ensemble, l’application signale ce qui demande votre attention (plafond presque atteint ou dépassé, salaire non reçu, échéances des 7 prochains jours ou en retard, disponible prévu sous votre réserve, achat devenu risqué, prêt en retard). Chaque alerte mène à l’onglet où agir ; elle disparaît d’elle-même quand sa cause disparaît.
18. **Calendrier** : le mois jour par jour, entrées et sorties réalisées et prévues (échéances comprises). Touchez un jour pour voir ses opérations et les confirmer.
19. **Statistiques** : sur 3, 6, 12 ou 24 mois, revenus, dépenses (indispensables, variables, achats prévus), épargne et taux d’épargne, dépenses par catégorie et sous-catégorie, plus grosses dépenses, écart entre prix estimés et prix payés.
20. **Et si… ?** (Achats prévus) : testez une baisse de salaire, des dépenses variables réduites, un achat supplémentaire, un report ou un renoncement. Le résultat est comparé à la prévision actuelle ; rien n’est enregistré.

La **Vue d’ensemble** montre le disponible, l’épargne, les revenus reçus et attendus, les dépenses du mois (indispensables et variables), le non dépensé, ce qu’on vous doit et ce que vous devez, les opérations à venir ou en retard et la répartition par catégorie. **Opérations** filtre l’historique par période, type, statut, compte, catégorie, nature, montant et texte.

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
