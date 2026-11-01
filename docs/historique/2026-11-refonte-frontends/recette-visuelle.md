# Recette visuelle — 1 novembre 2026

> **Rapport de lot historique.** Pour l’état courant au 1 novembre 2026, consulter l’[avancement fonctionnel](../../suivi/avancement-fonctionnel.md), l’[avancement technique](../../suivi/avancement-technique.md) et le [design détaillé](../../technique/design.md). Les chemins et résultats de ce rapport décrivent sa recette initiale.
> Les captures historiques ne sont plus présentes dans la copie locale. Leurs noms sont conservés comme références textuelles ; une nouvelle génération est nécessaire.

Les 14 références ont été ouvertes individuellement, puis les 28 captures de pages comparées visuellement. Les PNG originaux sont conservés dans references/. Les nouvelles captures sont des pages réellement rendues, pas des découpes de maquette.

## Conditions

Chromium, 1440×900, fr-FR, Europe/Paris ; même base isolée, neuf tâches et deux projets de recette, mêmes filtres initiaux et timer au repos. Les captures finales sont exécutées après les mutations. Les sessions interrompues restent dans les deux historiques. Aucune métrique du PNG copiée. Captures pleine page : leur hauteur varie avec le contenu. Les références ont un ratio et des exemples différents ; comparaison par structure, hiérarchie, espacements, couleur et lisibilité, sans score de similarité inventé.

## Matrice des 28 comparaisons

« Structure conforme » ne signifie pas reproduction au pixel près. Les adaptations modérées ci-dessous restent des écarts à une fidélité graphique stricte.

| Page | Thème | Framework | Référence | Capture réelle | Conformité / écart | Gravité |
|---|---|---|---|---|---|---|
| matrice | clair | angular | [Matrice_Eisenhower_clair.png](../../maquettes/Matrice_Eisenhower_clair.png) | `screenshots/angular-matrice-clair.png` | Structure conforme ; barre de filtres métier supplémentaire, icônes et marges légèrement différentes. | mineure |
| matrice | clair | react | [Matrice_Eisenhower_clair.png](../../maquettes/Matrice_Eisenhower_clair.png) | `screenshots/react-matrice-clair.png` | Structure conforme ; barre de filtres métier supplémentaire, icônes et marges légèrement différentes. | mineure |
| matrice | sombre | angular | [Matrice_Eisenhower_sombre.png](../../maquettes/Matrice_Eisenhower_sombre.png) | `screenshots/angular-matrice-sombre.png` | Structure conforme ; barre de filtres métier supplémentaire, icônes et marges légèrement différentes. | mineure |
| matrice | sombre | react | [Matrice_Eisenhower_sombre.png](../../maquettes/Matrice_Eisenhower_sombre.png) | `screenshots/react-matrice-sombre.png` | Structure conforme ; barre de filtres métier supplémentaire, icônes et marges légèrement différentes. | mineure |
| calendrier | clair | angular | [Calendrier_clair.png](../../maquettes/Calendrier_clair.png) | `screenshots/angular-calendrier-clair.png` | Structure conforme ; novembre utilise six lignes, titres longs plus hauts, disposition des contrôles différente. | mineure |
| calendrier | clair | react | [Calendrier_clair.png](../../maquettes/Calendrier_clair.png) | `screenshots/react-calendrier-clair.png` | Structure conforme ; novembre utilise six lignes, titres longs plus hauts, disposition des contrôles différente. | mineure |
| calendrier | sombre | angular | [Calendrier_sombre.png](../../maquettes/Calendrier_sombre.png) | `screenshots/angular-calendrier-sombre.png` | Structure conforme ; novembre utilise six lignes, titres longs plus hauts, disposition des contrôles différente. | mineure |
| calendrier | sombre | react | [Calendrier_sombre.png](../../maquettes/Calendrier_sombre.png) | `screenshots/react-calendrier-sombre.png` | Structure conforme ; novembre utilise six lignes, titres longs plus hauts, disposition des contrôles différente. | mineure |
| tableau-de-bord | clair | angular | [FocusWithAkram_Tableau_de_bord_clair.png](../../maquettes/FocusWithAkram_Tableau_de_bord_clair.png) | `screenshots/angular-tableau-de-bord-clair.png` | Adaptation : six KPI préservés, deux rangées ; graphique et hauteur totale différents. | modérée |
| tableau-de-bord | clair | react | [FocusWithAkram_Tableau_de_bord_clair.png](../../maquettes/FocusWithAkram_Tableau_de_bord_clair.png) | `screenshots/react-tableau-de-bord-clair.png` | Adaptation : six KPI préservés, deux rangées ; graphique et hauteur totale différents. | modérée |
| tableau-de-bord | sombre | angular | [FocusWithAkram_Tableau_de_bord_sombre.png](../../maquettes/FocusWithAkram_Tableau_de_bord_sombre.png) | `screenshots/angular-tableau-de-bord-sombre.png` | Adaptation : six KPI préservés, deux rangées ; graphique et hauteur totale différents. | modérée |
| tableau-de-bord | sombre | react | [FocusWithAkram_Tableau_de_bord_sombre.png](../../maquettes/FocusWithAkram_Tableau_de_bord_sombre.png) | `screenshots/react-tableau-de-bord-sombre.png` | Adaptation : six KPI préservés, deux rangées ; graphique et hauteur totale différents. | modérée |
| mes-taches | clair | angular | [FocusWithAkram_Mes_taches_clair.png](../../maquettes/FocusWithAkram_Mes_taches_clair.png) | `screenshots/angular-mes-taches-clair.png` | Adaptation : vues métier complètes et résumé latéral ; lignes et filtres plus hauts que la référence. | modérée |
| mes-taches | clair | react | [FocusWithAkram_Mes_taches_clair.png](../../maquettes/FocusWithAkram_Mes_taches_clair.png) | `screenshots/react-mes-taches-clair.png` | Adaptation : vues métier complètes et résumé latéral ; lignes et filtres plus hauts que la référence. | modérée |
| mes-taches | sombre | angular | [FocusWithAkram_Mes_taches_sombre.png](../../maquettes/FocusWithAkram_Mes_taches_sombre.png) | `screenshots/angular-mes-taches-sombre.png` | Adaptation : vues métier complètes et résumé latéral ; lignes et filtres plus hauts que la référence. | modérée |
| mes-taches | sombre | react | [FocusWithAkram_Mes_taches_sombre.png](../../maquettes/FocusWithAkram_Mes_taches_sombre.png) | `screenshots/react-mes-taches-sombre.png` | Adaptation : vues métier complètes et résumé latéral ; lignes et filtres plus hauts que la référence. | modérée |
| focus-pomodoro | clair | angular | [FocusWithAkram_Focus_Pomodoro_clair.png](../../maquettes/FocusWithAkram_Focus_Pomodoro_clair.png) | `screenshots/angular-focus-pomodoro-clair.png` | Anneau et actions conformes au principe ; état prêt réel. Historique sous le minuteur dans les deux variantes, cycle et objectif à droite. | modérée |
| focus-pomodoro | clair | react | [FocusWithAkram_Focus_Pomodoro_clair.png](../../maquettes/FocusWithAkram_Focus_Pomodoro_clair.png) | `screenshots/react-focus-pomodoro-clair.png` | Anneau et actions conformes au principe ; état prêt réel. Historique sous le minuteur dans les deux variantes, cycle et objectif à droite. | modérée |
| focus-pomodoro | sombre | angular | [FocusWithAkram_Focus_Pomodoro_sombre.png](../../maquettes/FocusWithAkram_Focus_Pomodoro_sombre.png) | `screenshots/angular-focus-pomodoro-sombre.png` | Anneau et actions conformes au principe ; état prêt réel. Historique sous le minuteur dans les deux variantes, cycle et objectif à droite. | modérée |
| focus-pomodoro | sombre | react | [FocusWithAkram_Focus_Pomodoro_sombre.png](../../maquettes/FocusWithAkram_Focus_Pomodoro_sombre.png) | `screenshots/react-focus-pomodoro-sombre.png` | Anneau et actions conformes au principe ; état prêt réel. Historique sous le minuteur dans les deux variantes, cycle et objectif à droite. | modérée |
| statistiques | clair | angular | [FocusWithAkram_Statistiques_clair.png](../../maquettes/FocusWithAkram_Statistiques_clair.png) | `screenshots/angular-statistiques-clair.png` | Adaptation : données réelles nulles dans la fixture ; Angular ajoute les KPI et graphiques métier, React des tableaux ; géométrie différente. | modérée |
| statistiques | clair | react | [FocusWithAkram_Statistiques_clair.png](../../maquettes/FocusWithAkram_Statistiques_clair.png) | `screenshots/react-statistiques-clair.png` | Adaptation : données réelles nulles dans la fixture ; Angular ajoute les KPI et graphiques métier, React des tableaux ; géométrie différente. | modérée |
| statistiques | sombre | angular | [FocusWithAkram_Statistiques_sombre.png](../../maquettes/FocusWithAkram_Statistiques_sombre.png) | `screenshots/angular-statistiques-sombre.png` | Adaptation : données réelles nulles dans la fixture ; Angular ajoute les KPI et graphiques métier, React des tableaux ; géométrie différente. | modérée |
| statistiques | sombre | react | [FocusWithAkram_Statistiques_sombre.png](../../maquettes/FocusWithAkram_Statistiques_sombre.png) | `screenshots/react-statistiques-sombre.png` | Adaptation : données réelles nulles dans la fixture ; Angular ajoute les KPI et graphiques métier, React des tableaux ; géométrie différente. | modérée |
| projets | clair | angular | [FocusWithAkram_Projets_clair.png](../../maquettes/FocusWithAkram_Projets_clair.png) | `screenshots/angular-projets-clair.png` | Cartes, couleurs et progression réelles ; deux projets de recette, pas les cinq exemples du PNG. Angular conserve les actions directes. Aperçu de deux tâches actives ouvrant leur détail. | modérée |
| projets | clair | react | [FocusWithAkram_Projets_clair.png](../../maquettes/FocusWithAkram_Projets_clair.png) | `screenshots/react-projets-clair.png` | Cartes, couleurs et progression réelles ; deux projets de recette, pas les cinq exemples du PNG. Angular conserve les actions directes. Aperçu de deux tâches actives ouvrant leur détail. | modérée |
| projets | sombre | angular | [FocusWithAkram_Projets_sombre.png](../../maquettes/FocusWithAkram_Projets_sombre.png) | `screenshots/angular-projets-sombre.png` | Cartes, couleurs et progression réelles ; deux projets de recette, pas les cinq exemples du PNG. Angular conserve les actions directes. Aperçu de deux tâches actives ouvrant leur détail. | modérée |
| projets | sombre | react | [FocusWithAkram_Projets_sombre.png](../../maquettes/FocusWithAkram_Projets_sombre.png) | `screenshots/react-projets-sombre.png` | Cartes, couleurs et progression réelles ; deux projets de recette, pas les cinq exemples du PNG. Angular conserve les actions directes. Aperçu de deux tâches actives ouvrant leur détail. | modérée |

## Responsive et charge

Les sept pages ont aussi une capture sombre à 768×1024 et 390×844 : suffixes `-sombre-768.png` et `-sombre-390.png`. Aucun débordement horizontal lors des assertions navigateur. Matrice : un quadrant visible par onglet ; calendrier : petites cellules et détail sous la grille. Les listes et fenêtres détaillées sont accessibles séparément.

Le scénario volume ajoute 120 tâches par API, conserve les mêmes données pour les deux frameworks, produit 18 captures `-volume-1440.png` / `-volume-390.png`, puis nettoie ses IDs. Il vérifie les sept pages mobiles ; il ne constitue pas un test à plusieurs milliers de tâches. Les projets et historiques ne sont pas artificiellement multipliés.

## Corrections issues de la vérification

Contraste du texte secondaire renforcé ; grille calendrier rendue navigable au clavier ; attribut ARIA des statuts Pomodoro corrigé ; débordement de la recherche dans le header mobile supprimé ; badges de priorité raccourcis dans la liste ; séparation de la légende du graphique dashboard ; titre central du donut lisible en sombre.

28 audits axe WCAG 2 A/AA (sept pages, deux thèmes, deux frameworks) sans violation détectée. Cela ne certifie pas intégralement WCAG : lecteurs d’écran, gestes tactiles réels et tous les dialogues ne sont pas couverts par cet audit. Les tests E2E contrôlent également les erreurs JavaScript et la navigation Archives/Paramètres.

## Limites et fidélité restante

Le paysage CSS est simplifié. Les cartes Projets affichent désormais deux vraies tâches actives ouvrant le détail. Focus place désormais le cycle et l’objectif à droite et l’historique en dessous dans les deux variantes ; les dimensions de l’anneau et la disposition des actions diffèrent encore. Les statistiques gardent toutes les mesures documentées, ce qui allonge la page. Ces différences sont visibles et documentées, pas déclarées inexistantes. Les 28 captures sont la base de décision pour une éventuelle retouche graphique finale.
