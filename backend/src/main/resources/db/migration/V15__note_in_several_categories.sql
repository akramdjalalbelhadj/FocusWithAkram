-- Lot 29 : une idee peut avoir plusieurs categories (ou aucune).
CREATE TABLE note_category_link (
    note_id     UUID NOT NULL REFERENCES note (id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES note_category (id) ON DELETE CASCADE,
    PRIMARY KEY (note_id, category_id)
);
CREATE INDEX ix_note_category_link_category ON note_category_link (category_id);

-- Les categories existantes (une par idee) sont conservees.
INSERT INTO note_category_link (note_id, category_id)
SELECT id, category_id FROM note WHERE category_id IS NOT NULL;

DROP INDEX ix_note_category;
ALTER TABLE note DROP COLUMN category_id;
