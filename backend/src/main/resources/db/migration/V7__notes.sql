-- Notes & Brainstorming : idees, categories d'idees, lien tache -> idee d'origine et mode d'editeur.
-- Migration additive : aucune donnee existante n'est modifiee.

CREATE TABLE note_category (
    id         UUID PRIMARY KEY,
    name       VARCHAR(60) NOT NULL,
    color      VARCHAR(7)  NOT NULL DEFAULT '#4f46e5',
    created_at TIMESTAMPTZ NOT NULL,
    version    BIGINT      NOT NULL DEFAULT 0,
    CONSTRAINT ck_note_category_name CHECK (length(btrim(name)) > 0),
    CONSTRAINT ck_note_category_color CHECK (color ~ '^#[0-9a-fA-F]{6}$')
);
CREATE UNIQUE INDEX ux_note_category_name ON note_category (lower(name));

-- Une idee n'a pas de statut : seules les taches qui en sont issues en ont un.
CREATE TABLE note (
    id          UUID PRIMARY KEY,
    title       VARCHAR(200) NOT NULL,
    content     TEXT         NOT NULL DEFAULT '',
    category_id UUID REFERENCES note_category (id) ON DELETE SET NULL,
    favorite    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL,
    updated_at  TIMESTAMPTZ  NOT NULL,
    version     BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT ck_note_title CHECK (length(btrim(title)) > 0),
    CONSTRAINT ck_note_content_length CHECK (char_length(content) <= 100000)
);
CREATE INDEX ix_note_updated ON note (updated_at DESC);
CREATE INDEX ix_note_category ON note (category_id);

CREATE TABLE note_tag (
    note_id UUID        NOT NULL REFERENCES note (id) ON DELETE CASCADE,
    name    VARCHAR(40) NOT NULL,
    PRIMARY KEY (note_id, name)
);
CREATE INDEX ix_note_tag_name ON note_tag (lower(name));

-- Idee d'origine d'une tache. La suppression d'une idee avec taches est refusee par l'application ;
-- une suppression forcee conserve les taches, que la base detache (SET NULL).
ALTER TABLE task ADD COLUMN source_note_id UUID REFERENCES note (id) ON DELETE SET NULL;
CREATE INDEX ix_task_source_note ON task (source_note_id) WHERE source_note_id IS NOT NULL;

ALTER TABLE user_settings
    ADD COLUMN note_editor_mode VARCHAR(10) NOT NULL DEFAULT 'MARKDOWN',
    ADD CONSTRAINT ck_settings_note_editor_mode CHECK (note_editor_mode IN ('MARKDOWN', 'RICH'));
