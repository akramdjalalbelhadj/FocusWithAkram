# FocusWithAkram — Documentation fonctionnelle

Ce document décrit, fonctionnalité par fonctionnalité, ce qui est **réellement implémenté** dans FocusWithAkram, les règles métier appliquées et la façon de s'en servir. Il suit les demandes de la spécification (matrice d'Eisenhower, Pomodoro, dates et archivage, historique des Pomodoros). La section 17 liste honnêtement ce qui n'est pas fait.

Sommaire

1. Vue d'ensemble et navigation
2. Tâches (propriétés, création, modification)
3. Matrice d'Eisenhower
4. Mes tâches / liste des priorités / Top 3
5. Cycle de vie des tâches et dates
6. Planning prévu vs réalisé
7. Archives
8. Module Pomodoro / Focus
9. **Historique des Pomodoros**
10. Tableau de bord
11. Calendrier
12. Projets
13. Statistiques
14. Paramètres, export / import
15. Recherche, palette de commandes, raccourcis
16. Fuseaux horaires, horloges et fiabilité
17. Limites connues et fonctionnalités non réalisées

---

## 1. Vue d'ensemble et navigation

FocusWithAkram est une application web de productivité personnelle (mono-utilisateur) construite autour de deux idées : **prioriser** avec la matrice d'Eisenhower et **se concentrer** avec la méthode Pomodoro. Les deux modules sont reliés : une session de concentration se lance sur une tâche, et le temps travaillé alimente la tâche, le tableau de bord et les statistiques.

**Navigation** (barre latérale rétractable sur ordinateur et tablette, barre inférieure sur mobile) :

| Page | Rôle |
|---|---|
| Tableau de bord | Cockpit du jour : indicateurs, Top 3, mini-matrice, minuteur, activité de la semaine |
| Matrice d'Eisenhower | Grille 2 × 2 interactive (glisser-déposer) |
| Mes tâches | Listes : priorités, aujourd'hui, semaine, toutes, en retard, terminées |
| Focus / Pomodoro | Minuteur circulaire, objectif du jour, **historique des Pomodoros** |
| Calendrier | Vues mois / semaine / jour, replanification par glisser-déposer |
| Statistiques | Graphiques interactifs sur données réelles |
| Projets | Regroupement léger des tâches |
| Archives | Tâches terminées classées par date réelle de fin |
| Paramètres | Thème, durées, notifications, fuseau, export / import |

Éléments globaux : bouton **Nouvelle tâche** (barre latérale ou barre supérieure), accès rapide **Pomodoro**, pastille de **session active** dans la barre latérale (avec le temps restant), thème clair / sombre / système, notifications (toasts) et états de chargement / vide / erreur sur chaque page.

---

## 2. Tâches

### 2.1 Propriétés

Chaque tâche possède : identifiant UUID, titre (obligatoire, 200 caractères max.), description, notes, **statut** (`À faire`, `En cours`, `Terminée`), quadrant (dérivé de *important* × *urgent*), position dans le quadrant, estimation en minutes, projet, étiquettes (10 max.), sous-tâches, les **six dates** (section 5), un numéro de cycle d'exécution, et le temps réellement travaillé (somme des sessions Pomodoro).

L'**archivage** n'est pas un statut : c'est la date `archivedAt`, posée automatiquement quand une tâche est terminée.

### 2.2 Créer / modifier

- Depuis le bouton **Nouvelle tâche**, le « + » d'un quadrant, un projet ou la touche `N`.
- Le formulaire valide : titre obligatoire, estimation entre 1 et 100 000 minutes, début prévu **antérieur** à la fin prévue.
- Section **Planification** : deux sélecteurs date/heure et un résumé automatique de la **durée prévue**.
- À la création, on peut saisir plusieurs sous-tâches (une par ligne).
- Ajout rapide : champ « Ajout rapide » dans chaque quadrant et dans *Mes tâches* (touche Entrée).

### 2.3 Autres actions

Supprimer (avec confirmation), **dupliquer** (copie titre, description, quadrant, projet, étiquettes, sous-tâches non cochées, sans dates), terminer, démarrer, remettre en pause, déplacer vers un quadrant, ouvrir le panneau détaillé, démarrer un Pomodoro. Ces actions sont disponibles via le menu « ⋯ » de chaque carte et le panneau de détail.

### 2.4 Sous-tâches

Titre, état fait / à faire, position, date de création. Une **barre de progression** s'affiche sur la carte. **Par défaut, la progression des sous-tâches ne change jamais le statut du parent.** L'option *Paramètres → « Les sous-tâches font avancer la tâche parente »* l'active : cocher la première sous-tâche démarre la tâche, cocher la dernière la termine (et l'archive).

### 2.5 Étiquettes

Saisies séparées par des virgules ; insensibles à la casse (« Dev » et « dev » sont la même étiquette). Elles servent de filtre dans la matrice et dans *Mes tâches*.

---

## 3. Matrice d'Eisenhower

Quatre quadrants, chacun avec titre, icône, couleur, compteur, indicateur de tâches **en retard**, état vide soigné, bouton d'ajout et champ d'ajout rapide :

| Quadrant | Nom | Critères | Couleur |
|---|---|---|---|
| Q1 | Faire maintenant | Urgent et important | Corail |
| Q2 | Planifier | Important, non urgent | Indigo |
| Q3 | Déléguer / limiter | Urgent, non important | Ambre |
| Q4 | Éliminer / plus tard | Ni urgent ni important | Violet discret |

### Interactions

- **Glisser-déposer** entre quadrants et **réordonnancement** dans un quadrant. Le nouvel ordre est **enregistré en base** (un déplacement n'est jamais seulement visuel ; en cas d'échec, l'affichage revient à l'état précédent).
- Quand une tâche change de quadrant, ses propriétés *important* et *urgent* sont mises à jour automatiquement (le quadrant est calculé à partir d'elles, il ne peut donc pas être incohérent).
- **Annuler** : après chaque déplacement, une notification propose « Annuler » qui restaure l'ordre et le quadrant précédents.
- **Alternatives accessibles** : menu « ⋯ → Déplacer vers… » ; au clavier, **Alt + ↑ / ↓** réordonne la carte et **Alt + 1…4** la déplace vers un quadrant.
- **Filtres** : recherche instantanée, projet, statut (à faire / en cours), étiquette, « en retard ».
- **Panneau détaillé** : clic sur le titre d'une carte.
- **Mobile / tablette étroite** : sélecteur de quadrant (onglets avec compteurs) affichant un quadrant à la fois.

### Règle importante

Le retard d'une échéance **ne déplace jamais** une tâche d'un quadrant à un autre : seul l'utilisateur change le quadrant.

Les tâches terminées **disparaissent** de la matrice (elles sont archivées).

---

## 4. Mes tâches, priorités et Top 3

### 4.1 Vues

Une barre d'onglets propose : **Priorités**, **Aujourd'hui**, **Cette semaine**, **Toutes**, **En retard**, **Terminées**. Chaque vue accepte recherche, projet et étiquette ; un tri client (priorité, échéance, titre, création) est disponible.

### 4.2 Règle de priorisation (vue « Priorités »)

Ordre des quadrants Q1 → Q2 → Q3 → Q4, puis, **à l'intérieur d'un quadrant** :

1. tâches **en retard** d'abord ;
2. **échéance** la plus proche (sans échéance en dernier) ;
3. statut **En cours** avant À faire ;
4. **ordre manuel** défini dans la matrice ;
5. date de création.

Les tâches terminées n'apparaissent pas dans les vues actives (elles sont dans *Terminées* et *Archives*). Les tâches En cours sont reconnaissables (bordure et badge).

### 4.3 Définition des vues

- **Aujourd'hui** : tâches dont l'intervalle prévu recoupe la journée locale, tâches En cours, et tâches du Top 3.
- **Cette semaine** : échéance dans la semaine courante (selon le premier jour de semaine choisi).
- **En retard** : fin prévue dépassée et tâche non terminée.

### 4.4 Top 3 du jour

Sur le tableau de bord, « **Choisir mes 3** » ouvre une sélection de trois tâches actives maximum. Une barre de progression affiche l'avancement (tâches terminées / choisies) et un bouton **Commencer** lance un Pomodoro sur la tâche. Le Top 3 est enregistré par jour (fuseau de l'utilisateur).

---

## 5. Cycle de vie et dates

### 5.1 Les six informations temporelles

| Champ | Qui la renseigne | Modifiable |
|---|---|---|
| Date de création | Le **backend**, automatiquement | Jamais |
| Début prévisionnel | L'utilisateur | Tant que la tâche n'est pas terminée |
| Fin prévisionnelle | L'utilisateur | Tant que la tâche n'est pas terminée |
| Début réel | Le backend au clic « Commencer » (ou l'utilisateur, explicitement) | Correction explicite |
| Fin réelle | Le backend au clic « Terminer » | — |
| Date d'archivage | Le backend, à la terminaison | — |

**Affichage** : `yyyy-MM-dd HH:mm` (ex. `2026-10-30 09:30`) dans le **fuseau horaire des paramètres**. Les instants sont **stockés en UTC**. Les dates réelles ne sont jamais remplacées par les dates prévues.

### 5.2 Sélecteur de date et d'heure

Champ texte avec **saisie manuelle** au format `aaaa-mm-jj hh:mm` (validée, message d'erreur explicite) **et** fenêtre calendrier (navigation par mois, jour, heures, minutes, bouton « Maintenant », effacement). La saisie est interprétée dans le fuseau configuré, y compris lors des changements d'heure (une heure inexistante est décalée vers l'avant, une heure ambiguë prend l'heure d'hiver).

### 5.3 États

**À faire (TODO)** — à la création : date de création enregistrée, dates prévues saisies, début et fin réels vides. La tâche apparaît dans la matrice et les priorités.

**En cours (IN_PROGRESS)** — clic sur **Commencer la tâche** (ou démarrage d'un Pomodoro sur la tâche) :
- le début réel est enregistré **automatiquement** ;
- **il n'est pas écrasé** si la tâche est mise en pause puis reprise (la pause remet le statut à « À faire » mais conserve le début réel) ;
- la fin réelle reste vide ; la tâche reste dans la matrice.
- **Début rétroactif** : « Corriger le début » (panneau détail) ouvre une fenêtre qui demande explicitement la date. Elle ne peut pas être dans le futur.

**Terminée (DONE)** — clic sur **Terminer la tâche** :
1. statut `Terminée` ;
2. fin réelle enregistrée automatiquement ;
3. dates prévues conservées telles quelles ;
4. durée réelle et écarts calculés (section 6) ;
5. **archivage automatique** ;
6. disparition de la matrice et des listes actives ;
7. consultation dans **Archives**.

Si une tâche passe de « À faire » à « Terminée » **sans avoir été démarrée**, l'application **demande la date de début réelle** (rien n'est inventé). Toutes ces opérations sont **atomiques** (une seule transaction : tâche + cycle d'exécution).

### 5.4 Contrôles de cohérence

Appliqués par le backend **et** par des contraintes en base de données :

- début prévu < fin prévue ;
- début réel ≤ fin réelle ;
- une tâche À faire n'a pas de fin réelle ;
- une tâche En cours a un début réel ;
- une tâche Terminée a début réel, fin réelle et archivage ;
- une tâche active n'est jamais archivée ;
- les dates réelles ne peuvent pas être dans le futur (tolérance de 2 minutes pour les écarts d'horloge).

Les erreurs sont renvoyées au format *ProblemDetail* (RFC 9457) avec un code stable (`ACTUAL_START_REQUIRED`, `PLANNED_DATES_INCONSISTENT`, `PLANNED_DATES_LOCKED`, `DATE_IN_FUTURE`…).

### 5.5 Restauration et cycles multiples

**Restaurer** une tâche archivée la remet « À faire », vide ses dates réelles et son archivage, et **incrémente son numéro de cycle**. Le cycle précédent est conservé dans l'entité `TaskExecution` (dates prévues et réelles, archivage) : **aucune donnée ni statistique historique n'est perdue**. Après une nouvelle terminaison, la tâche a deux cycles. Le panneau de détail liste les **cycles d'exécution** avec leurs sessions Pomodoro.

---

## 6. Planning prévu vs réalisé

Le panneau de détail de chaque tâche contient un tableau **Planning et réalisation** :

| Information | Définition |
|---|---|
| Durée prévue | fin prévue − début prévu |
| Durée réelle écoulée | fin réelle − début réel |
| Temps actif | somme des sessions Pomodoro de **travail** du cycle |
| Écart de début | début réel − début prévu |
| Écart de fin | fin réelle − fin prévue |
| Écart de durée | durée réelle écoulée − durée prévue |

Un **écart négatif** signifie « plus tôt que prévu » (affiché en vert, positif en rouge). Si une date nécessaire manque, la valeur affichée est « — » : rien n'est inventé.

**Durée écoulée ≠ temps travaillé** : une tâche peut durer deux jours avec deux heures de travail actif ; les deux valeurs sont distinctes.

**Ponctualité** (cartes d'archives, statistiques) : *En avance* (fin réelle > 5 min avant la prévue), *À l'heure* (±5 min), *En retard* (> 5 min après).

**Chronologie** : six événements (création, début prévu, début réel, fin prévue, fin réelle, archivage) dans l'ordre chronologique ; les événements non encore survenus sont grisés (« À venir » ou « Non renseigné »).

---

## 7. Archives

Page indépendante regroupant les tâches terminées **par date réelle de fin** (jamais par création, prévision ou archivage).

- **Sections exclusives** : Aujourd'hui, Hier, Cette semaine, Ce mois-ci, Mois précédents, Années précédentes — puis sous-groupes par jour (« 30 octobre 2026 ») avec l'heure de fin devant chaque tâche. Une tâche n'apparaît que dans une section. Le calcul tient compte du fuseau et du premier jour de semaine.
- **Navigation** par année / mois (avec nombre de tâches) et filtre par dates de début et de fin.
- **Filtres** : nom, projet, quadrant, période ; **tri** par date de fin (récentes ou anciennes d'abord) ; pagination (« Charger la suite »).
- **Carte** : heure de fin, titre, projet, quadrant, durées prévue / réelle / active, badge En avance / À l'heure / En retard, actions Détail et **Restaurer**.
- **Détail complet** : titre, description, projet, étiquettes, quadrant, six dates, durées, temps actif, sessions Pomodoro, sous-tâches, notes, cycles.
- **Export** CSV ou JSON des archives.

Les filtres de période respectent les **changements d'heure** (le 25 octobre 2026 dure 25 h à Paris, le 29 mars 2026 dure 23 h).

---

## 8. Module Pomodoro / Focus

### 8.1 Interface

Grand **chronomètre circulaire** avec anneau de progression animé, temps restant `mm:ss`, type de session (Concentration, Pause courte, Pause longue), numéro du Pomodoro du jour, tâche associée, boutons **Démarrer, Pause, Reprendre, Réinitialiser, Passer**, bouton **Configurer**, aperçu de la **prochaine session**, **mode plein écran**. Le temps restant est aussi affiché dans le **titre de l'onglet** et dans la **barre latérale** (indicateur de session active, y compris sur les autres pages).

### 8.2 Paramètres

Durée de travail, pause courte, pause longue et nombre de sessions avant la pause longue sont **saisis librement** (valeurs initiales : 25 / 5 / 15 / 4), modifiables sur la page Focus ou dans les Paramètres. Deux options : **démarrer automatiquement les pauses** et **enchaîner automatiquement la session suivante**. Son de fin (cloche, carillon, doux — générés sans fichier audio, désactivables) et **notifications du navigateur** (permission demandée à l'activation).

### 8.3 Comportement

1. **Démarrer** crée une session côté serveur (durée issue des paramètres) ; sur une tâche « À faire », la tâche passe « En cours » (le début réel est celui du démarrage).
2. Le temps restant est recalculé à partir de l'**instant de fin théorique** (voir section 16), jamais par décrémentation : il reste exact après changement d'onglet, mise en veille, verrouillage, **rechargement** ou réouverture.
3. **Pause / Reprise** : la pause fige le temps ; la reprise recalcule la fin (une pause de 30 min décale la fin de 30 min).
4. À la fin : son, notification, message et invite « Pause courte / Nouvelle session / Plus tard » ; enchaînement automatique selon les préférences.
5. **Réinitialiser** et **Passer** *interrompent* la session : le temps déjà travaillé est conservé (et attribué à la tâche), mais la session **n'est pas comptée comme terminée**.
6. Les **pauses ne comptent jamais** comme temps travaillé et ne peuvent pas être associées à une tâche.
7. Une pause longue est proposée après le nombre de sessions configuré (compté sur les Pomodoros terminés du jour).

### 8.4 Règles de fiabilité

- **Une seule session active** à la fois (garanti par un index unique en base) : pas de session fantôme.
- **Clôture idempotente** : valider deux fois la même session (double clic, réessai réseau) ne double pas le temps.
- **Clôture refusée trop tôt** (`SESSION_NOT_FINISHED`) : une session non terminée n'est jamais comptée comme terminée.
- Une session **abandonnée** (navigateur fermé) est automatiquement clôturée **à son instant de fin théorique** à la prochaine lecture : le temps compté est exactement la durée prévue, pas la durée d'absence.
- Le temps d'une tâche est **calculé** à partir des sessions (somme), jamais stocké dans un compteur : aucun double comptage possible.

---

## 9. Historique des Pomodoros

**Tous les Pomodoros réalisés sont enregistrés en base** (date, heure de début, heure de fin, durée travaillée, durée prévue, statut, tâche associée) et consultables sur la page **Focus → « Historique des Pomodoros »**.

- Affichage **jour par jour** sur les 14 derniers jours, du plus récent au plus ancien ; titres « Aujourd'hui », « Hier » puis date complète.
- Pour chaque jour : **temps total de concentration** et **nombre de Pomodoros terminés**.
- Pour chaque session : plage horaire (ex. `08:44–08:45`, dans votre fuseau), **tâche** (ou « Sans tâche »), **durée travaillée**, et la mention « interrompue » si elle l'a été (pastille verte = terminée, orange = interrompue).
- Un jour est celui de la **fin** de la session, dans le fuseau configuré.
- L'**objectif quotidien** (jauge et temps du jour) est alimenté par ces mêmes données.
- Les sessions apparaissent aussi dans le **détail d'une tâche** (par cycle d'exécution) et dans les **statistiques**.

API : `GET /api/v1/pomodoro/history/daily?from=aaaa-mm-jj&to=aaaa-mm-jj` (30 derniers jours par défaut, 400 jours maximum) et `GET /api/v1/pomodoro/history` (liste paginée à plat).

---

## 10. Tableau de bord

- **En-tête** : salutation selon l'heure, date du jour, résumé de l'activité, bouton Nouvelle tâche.
- **Six indicateurs** : tâches restantes, terminées aujourd'hui (et cette semaine), temps de concentration du jour, Pomodoros terminés, tâches en retard, progression de l'objectif quotidien. Chacun est un lien vers la page concernée.
- **Priorités du jour** (Top 3) avec actions rapides : terminer (case à cocher), commencer un Pomodoro, ouvrir le détail.
- **Mini-matrice** : compteur et retards par quadrant, lien vers la matrice.
- **Widget Pomodoro** : minuteur compact (démarrer, pause, reprendre) et accès au mode Focus.
- **Activité des 7 derniers jours** : tâches terminées et minutes de concentration (avec tableau alternatif pour lecteurs d'écran).
- **Message de motivation** discret, basé sur la progression (sans gamification ni culpabilisation).

Toutes les valeurs proviennent de la base de données.

---

## 11. Calendrier

- Vues **mois**, **semaine** et **jour**, navigation précédent / suivant / aujourd'hui, filtre par projet.
- Les tâches sont placées selon leur **fin prévue** (échéance) ; aucune heure n'est inventée pour une tâche sans date. Couleur selon le quadrant, bordure rouge si en retard, badge En cours.
- Clic sur une tâche : panneau détaillé. Un jour sélectionné affiche la liste de ses tâches.
- **Modification de l'échéance** : glisser une tâche vers un autre jour (vue mois) conserve l'heure locale et décale le début prévu du même nombre de jours ; l'écriture est enregistrée en base.
- Panneau **Non planifiées** : tâches sans échéance.
- Mobile : la grille affiche des repères par jour et la liste du jour sélectionné en dessous.

Les tâches terminées ne figurent pas au calendrier (elles sont archivées).

---

## 12. Projets

Un projet : nom (unique parmi les actifs), description, couleur, échéance facultative, statut actif / archivé. On peut créer, modifier, **archiver / restaurer**, supprimer. Chaque carte affiche une **barre d'avancement** (tâches terminées / total) et un bouton « Tâche » qui pré-sélectionne le projet. Archiver ou supprimer un projet **conserve les tâches**. Les tâches se filtrent par projet dans la matrice, les listes, le calendrier et les archives.

---

## 13. Statistiques

Filtre de période : **Aujourd'hui, 7 jours, 30 jours, personnalisée**. Les jours suivent le **fuseau configuré**.

- **Chiffres clés** : tâches créées (et taux de complétion), terminées, en retard, temps de concentration, sessions et durée moyenne, sessions interrompues, objectifs quotidiens atteints, durée prévue totale, durée réelle écoulée totale.
- **Évolution quotidienne** (courbe + barres) : tâches terminées et minutes de concentration.
- **Durée prévue vs réelle** (barres) pour les dernières tâches terminées.
- **Répartition** : tâches actives par quadrant (anneau) et par statut (anneau).
- **Temps par projet** (anneau) et **par tâche** (top 10).
- **Heatmap** d'activité sur 12 mois.
- **Respect du planning** : nombre en avance / à l'heure / en retard et écart moyen entre fin prévue et fin réelle.

Chaque graphique a une **alternative textuelle** (libellé accessible et/ou tableau « Afficher les données »). Les données viennent exclusivement de la base ; l'historique des cycles restaurés reste compté.

---

## 14. Paramètres, export et import

**Paramètres** (enregistrés automatiquement) : thème clair / sombre / système, fuseau horaire, premier jour de la semaine, durées Pomodoro, objectif quotidien de concentration, démarrage automatique des pauses et des sessions, son (type, activation, écoute), notifications, option sous-tâches→parent, activation des raccourcis. La liste des raccourcis est affichée.

**Export** : tâches en **CSV** (UTF-8, colonnes en français, neutralisation des formules de tableur) ou **JSON**, par périmètre (actives, archivées, toutes) ; **sauvegarde complète** JSON (projets, tâches avec sous-tâches, étiquettes et cycles, sessions Pomodoro).

**Import JSON** (sauvegarde) en deux temps : **aperçu** (validation sans écriture : nombre à créer, ignorés, erreurs) puis **confirmation**. Les **doublons** (même identifiant, ou même titre et même date de création) sont ignorés, les projets sont rapprochés par nom, les tâches invalides sont signalées sans bloquer les autres, et les invariants (statuts / dates) sont revérifiés. Seules des sessions terminées sont importées.

---

## 15. Recherche, palette de commandes et raccourcis

- **Palette de commandes** (`Ctrl/⌘ + K`, ou clic sur la barre de recherche) : recherche de tâches (y compris archivées) et de projets, création de tâche, navigation, démarrage d'une session Focus, ouverture des paramètres, bascule du thème. Navigation aux flèches, Entrée pour exécuter, Échap pour fermer.
- **Raccourcis** (ignorés dans les champs de saisie, désactivables) : `N` nouvelle tâche · `/` rechercher · `Espace` démarrer / mettre en pause le Pomodoro · `G` puis `D / M / T / F / C / S / A` aller à une page · `?` aide · `Échap` fermer.
- **Accessibilité** : lien « Aller au contenu », focus visible, navigation clavier des menus et dialogues (pièges de focus), libellés ARIA, `prefers-reduced-motion` respecté, contrastes calculés pour le niveau AA en thème clair et sombre.

---

## 16. Fuseaux horaires, horloges et fiabilité

- **Stockage en UTC**, affichage et regroupements dans le fuseau des paramètres (défaut : `Europe/Paris`).
- **Source de temps du minuteur** : le **serveur**. Chaque réponse contient `serverTime` ; le client mesure `décalage = heure serveur − heure client` et le soustrait à son horloge. Un ordinateur dont l'heure est décalée affiche donc quand même le bon temps restant.
- `setInterval` ne sert qu'à rafraîchir l'écran (4 fois par seconde) ; le temps affiché est toujours **recalculé** depuis l'instant de fin.
- Au retour de l'onglet, du focus, du réseau ou au chargement, l'état est **resynchronisé** depuis le serveur ; une copie locale permet d'afficher le minuteur immédiatement (même hors ligne).
- **Coupure réseau** : un bandeau l'indique ; le minuteur continue d'avancer ; pause / reprise / fin nécessitent le serveur (la fin est alors réessayée à la reconnexion). Il n'y a **pas** de synchronisation hors ligne complète.
- **Concurrence** : verrouillage optimiste (`version`) sur tâches et sessions ; conflit → erreur 409 explicite.

---

## 17. Limites connues et fonctionnalités non réalisées

Pour rester honnête sur l'état du produit :

- **Pas d'authentification** : l'application est conçue pour un usage **personnel local**. Le backend écoute sur `127.0.0.1` et Docker Compose publie sur `127.0.0.1` uniquement. Ne l'exposez pas sur Internet sans ajouter une authentification.
- **Tests de bout en bout Playwright : non écrits.** Les scénarios ont été vérifiés manuellement dans un navigateur (création, glisser-déposer persisté, Pomodoro avec rechargement et fin automatique, historique) mais pas automatisés.
- **Docker** : les fichiers (Dockerfiles, `docker-compose.yml`, nginx) sont fournis mais **n'ont pas pu être exécutés** sur le poste de développement (Docker absent). Les tests d'intégration backend utilisent un **PostgreSQL embarqué** (vrai PostgreSQL, pas H2) au lieu de Testcontainers.
- **Glisser-déposer** : testé à la souris ; sur mobile, le glisser entre quadrants n'est pas disponible quand un seul quadrant est affiché (utilisez le menu « Déplacer vers »). Dans le calendrier, la replanification par glisser-déposer existe seulement en **vue mois**.
- **Couverture de tests frontend** limitée aux utilitaires de dates et au moteur du minuteur (12 tests) ; pas de tests de composants (formulaires, glisser-déposer, filtres).
- **Accessibilité** : bonnes pratiques appliquées, mais aucun audit automatisé ni test avec lecteur d'écran n'a été réalisé.
- **Hors ligne** : détection et messages explicites uniquement.
- **Délégation** (quadrant 3) : simple libellé, pas de fonctionnalité d'assignation.
- Les sessions **interrompues** pendant une pause longue d'inactivité ne sont pas expirées automatiquement tant qu'elles sont « en pause ».
