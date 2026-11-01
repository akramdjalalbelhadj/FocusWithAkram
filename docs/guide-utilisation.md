# FocusWithAkram — guide d’utilisation

Mis à jour le **1 novembre 2026** pour Angular et React. Installation : [exploitation](exploitation.md). Les interfaces utilisent les mêmes données ; leur présentation et leur mode d’enregistrement peuvent différer.

## 1. Ouvrir l’application

Après lancement, ouvrir Angular sur `http://127.0.0.1:4200` ou React sur `http://127.0.0.1:5173`. Il n’y a pas de compte à créer pour l’usage local actuel.

Sur ordinateur, la barre latérale permet de naviguer et de se replier. Sur mobile, la barre inférieure donne les accès principaux ; **Plus** ouvre les destinations complémentaires. Les neuf pages sont Tableau de bord, Matrice d’Eisenhower, Mes tâches, Focus / Pomodoro, Calendrier, Statistiques, Projets, Archives et Paramètres.

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

Dans **Paramètres**, exporter les tâches en CSV ou JSON, ou télécharger une **Sauvegarde complète**. Pour une reprise complète des données métier, préférer cette dernière au CSV.

Pour importer : sélectionner le JSON, lire l’aperçu des créations, réutilisations, doublons et erreurs, puis confirmer l’import. Conserver le fichier d’origine jusqu’à vérification des tâches, projets et historiques.

La sauvegarde actuelle ne contient pas les préférences utilisateur. Relever séparément thème, fuseau et réglages du minuteur lors d’un changement de poste. Un export contient des données personnelles en clair : le conserver à un endroit adapté.

## 11. Recherche et raccourcis

| Action                             | Raccourci / accès                                              |
| ---------------------------------- | -------------------------------------------------------------- |
| Palette de recherche               | Ctrl + K, ou Cmd + K sur macOS                                 |
| Nouvelle tâche                     | N, si les raccourcis simples sont activés                      |
| Navigation                         | G puis D/M/T/F/C/S/A selon la destination disponible           |
| Pause/reprise d’une session active | Espace, hors champ de saisie et selon l’élément qui a le focus |
| Fermer une fenêtre                 | Échap lorsque le dialogue le permet                            |
| Aide rapide Angular                | ? ; la palette accepte aussi /                                 |

Les champs de saisie gardent leur usage normal. Les raccourcis simples peuvent être désactivés ; Ctrl/Cmd + K reste un accès privilégié. Consulter la liste affichée dans l’interface plutôt que de supposer que tous les raccourcis optionnels sont identiques dans les deux variantes.

## 12. Messages et dépannage courant

| Situation                               | Action                                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------------------- |
| La liste est vide                       | Retirer les filtres ; vérifier le projet, le quadrant et le statut.                         |
| La tâche est terminée                   | Aller dans Archives ; restaurer pour un nouveau cycle.                                      |
| « Session déjà active »                 | Reprendre ou interrompre la séance existante, éventuellement lancée dans l’autre interface. |
| Enregistrement refusé                   | Corriger les champs signalés ; si conflit, recharger avant de ressaisir.                    |
| Anciennes valeurs dans l’autre frontend | Recharger l’interface pour récupérer l’état partagé.                                        |
| Pas de son / notification               | Vérifier les options Focus, le volume et les permissions du site.                           |
| API inaccessible                        | Faire vérifier le backend et son healthcheck ; voir le guide d’exploitation.                |

Il n’y a actuellement ni comptes multiples, ni délégation réelle à une autre personne, ni synchronisation complète hors ligne. Les différences de présentation entre variantes sont décrites dans le [design](design.md).
