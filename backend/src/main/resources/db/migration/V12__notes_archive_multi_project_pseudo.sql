-- Lot 22 : archives des idees, taches dans plusieurs projets, pseudo, champ « notes » des taches fusionne.

-- Idees archivees : transformees en tache (CONVERTED), archivees a la main (ARCHIVED) ou supprimees
-- avec un delai de 72 heures (DELETED, purge_at renseigne).
ALTER TABLE note
    ADD COLUMN archived_at    TIMESTAMPTZ,
    ADD COLUMN archive_reason VARCHAR(20),
    ADD COLUMN purge_at       TIMESTAMPTZ,
    ADD CONSTRAINT ck_note_archive_reason CHECK (archive_reason IS NULL OR archive_reason IN ('CONVERTED', 'ARCHIVED', 'DELETED')),
    ADD CONSTRAINT ck_note_archive_state CHECK ((archived_at IS NULL) = (archive_reason IS NULL)),
    ADD CONSTRAINT ck_note_purge CHECK (purge_at IS NULL OR archive_reason = 'DELETED');
CREATE INDEX ix_note_purge ON note (purge_at) WHERE purge_at IS NOT NULL;

-- Projets supplementaires d'une tache (le projet principal reste task.project_id).
CREATE TABLE task_extra_project (
    task_id    UUID NOT NULL REFERENCES task (id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES project (id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, project_id)
);
CREATE INDEX ix_task_extra_project ON task_extra_project (project_id);

-- Le champ « notes » d'une tache disparait de l'interface : son contenu rejoint la description.
UPDATE task
SET description = CASE
        WHEN description IS NULL OR btrim(description) = '' THEN notes
        ELSE description || E'\n\n' || notes
    END,
    notes = NULL
WHERE notes IS NOT NULL AND btrim(notes) <> '';

-- Pseudo affiche dans le tableau de bord (demande au premier lancement).
ALTER TABLE user_settings ADD COLUMN display_name VARCHAR(40);

-- Les idees deja transformees en tache quittent la liste et rejoignent les archives.
UPDATE note n
SET archived_at = now(), archive_reason = 'CONVERTED'
WHERE archived_at IS NULL AND EXISTS (SELECT 1 FROM task t WHERE t.source_note_id = n.id);
