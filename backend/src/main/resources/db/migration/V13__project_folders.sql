-- Lot 23 : dossiers de projets (un seul niveau). Une tache reste rattachee a ses projets, jamais a un dossier.
CREATE TABLE project_folder (
    id         UUID PRIMARY KEY,
    name       VARCHAR(80) NOT NULL,
    color      VARCHAR(7)  NOT NULL DEFAULT '#64748b',
    created_at TIMESTAMPTZ NOT NULL,
    version    BIGINT      NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX ux_project_folder_name ON project_folder (lower(name));

-- Supprimer un dossier laisse ses projets en place, sans dossier.
ALTER TABLE project ADD COLUMN folder_id UUID REFERENCES project_folder (id) ON DELETE SET NULL;
CREATE INDEX ix_project_folder ON project (folder_id);
