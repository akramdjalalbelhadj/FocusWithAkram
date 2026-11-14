-- Lot 27 : un projet peut faire partie de plusieurs dossiers. Une tache reste rattachee a ses projets.
CREATE TABLE project_folder_link (
    project_id UUID NOT NULL REFERENCES project (id) ON DELETE CASCADE,
    folder_id  UUID NOT NULL REFERENCES project_folder (id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, folder_id)
);
CREATE INDEX ix_project_folder_link_folder ON project_folder_link (folder_id);

-- Les rangements existants (un dossier par projet) sont conserves.
INSERT INTO project_folder_link (project_id, folder_id)
SELECT id, folder_id FROM project WHERE folder_id IS NOT NULL;

DROP INDEX ix_project_folder;
ALTER TABLE project DROP COLUMN folder_id;
