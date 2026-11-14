package com.focusflow.transfer;

/**
 * Traitement des dossiers en conflit a l'import (voir {@code ImportConflict}).
 * <ul>
 *   <li>{@code MERGE} (par defaut, sauvegarde complete) : comportement historique, dossiers et projets rapproches
 *       par nom, rien n'est modifie ni ignore ;</li>
 *   <li>{@code SKIP} : les dossiers en conflit (dossier, projets et taches qui ne concernent qu'eux) sont ignores,
 *       le reste est importe ;</li>
 *   <li>{@code REPLACE} : le fichier ecrase l'existant pour ces dossiers (couleur du dossier ; description, couleur,
 *       etat et dossier des projets ; taches deja presentes remplacees, leurs sessions et leur Top 3 conserves).
 *       Rien n'est supprime de ce qui n'est pas dans le fichier.</li>
 * </ul>
 */
public enum ConflictMode { MERGE, SKIP, REPLACE }
