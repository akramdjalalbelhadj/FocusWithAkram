-- FocusFlow : schema initial. Tous les instants sont stockes en UTC (timestamptz).

CREATE TABLE project (
    id          UUID PRIMARY KEY,
    name        VARCHAR(120) NOT NULL,
    description TEXT,
    color       VARCHAR(9)   NOT NULL DEFAULT '#6366f1',
    icon        VARCHAR(40),
    due_at      TIMESTAMPTZ,
    archived    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL,
    version     BIGINT       NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX ux_project_name_active ON project (lower(name)) WHERE archived = FALSE;

CREATE TABLE tag (
    id   UUID PRIMARY KEY,
    name VARCHAR(40) NOT NULL
);
CREATE UNIQUE INDEX ux_tag_name ON tag (lower(name));

CREATE TABLE task (
    id                UUID PRIMARY KEY,
    title             VARCHAR(200) NOT NULL,
    description       TEXT,
    notes             TEXT,
    status            VARCHAR(20)  NOT NULL,
    important         BOOLEAN      NOT NULL,
    urgent            BOOLEAN      NOT NULL,
    position          INTEGER      NOT NULL DEFAULT 0,
    estimated_minutes INTEGER,
    project_id        UUID REFERENCES project (id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ  NOT NULL,
    updated_at        TIMESTAMPTZ  NOT NULL,
    planned_start_at  TIMESTAMPTZ,
    planned_end_at    TIMESTAMPTZ,
    actual_start_at   TIMESTAMPTZ,
    actual_end_at     TIMESTAMPTZ,
    archived_at       TIMESTAMPTZ,
    execution_number  INTEGER      NOT NULL DEFAULT 1,
    version           BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT ck_task_status CHECK (status IN ('TODO', 'IN_PROGRESS', 'DONE')),
    CONSTRAINT ck_task_planned CHECK (planned_start_at IS NULL OR planned_end_at IS NULL OR planned_start_at < planned_end_at),
    CONSTRAINT ck_task_actual CHECK (actual_start_at IS NULL OR actual_end_at IS NULL OR actual_start_at <= actual_end_at),
    CONSTRAINT ck_task_todo_no_end CHECK (status <> 'TODO' OR actual_end_at IS NULL),
    CONSTRAINT ck_task_progress_start CHECK (status <> 'IN_PROGRESS' OR actual_start_at IS NOT NULL),
    CONSTRAINT ck_task_done CHECK (status <> 'DONE' OR (actual_start_at IS NOT NULL AND actual_end_at IS NOT NULL AND archived_at IS NOT NULL)),
    CONSTRAINT ck_task_active_not_archived CHECK (status = 'DONE' OR archived_at IS NULL)
);
CREATE INDEX ix_task_active ON task (important, urgent, position) WHERE archived_at IS NULL;
CREATE INDEX ix_task_archive ON task (actual_end_at DESC) WHERE archived_at IS NOT NULL;
CREATE INDEX ix_task_project ON task (project_id);
CREATE INDEX ix_task_planned_end ON task (planned_end_at);
CREATE INDEX ix_task_created ON task (created_at);

CREATE TABLE task_tag (
    task_id UUID NOT NULL REFERENCES task (id) ON DELETE CASCADE,
    tag_id  UUID NOT NULL REFERENCES tag (id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, tag_id)
);
CREATE INDEX ix_task_tag_tag ON task_tag (tag_id);

CREATE TABLE subtask (
    id         UUID PRIMARY KEY,
    task_id    UUID         NOT NULL REFERENCES task (id) ON DELETE CASCADE,
    title      VARCHAR(200) NOT NULL,
    done       BOOLEAN      NOT NULL DEFAULT FALSE,
    position   INTEGER      NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ  NOT NULL
);
CREATE INDEX ix_subtask_task ON subtask (task_id, position);

-- Un cycle d'execution termine d'une tache. Les cycles ne sont jamais supprimes par une restauration.
CREATE TABLE task_execution (
    id               UUID PRIMARY KEY,
    task_id          UUID        NOT NULL REFERENCES task (id) ON DELETE CASCADE,
    execution_number INTEGER     NOT NULL,
    planned_start_at TIMESTAMPTZ,
    planned_end_at   TIMESTAMPTZ,
    actual_start_at  TIMESTAMPTZ NOT NULL,
    actual_end_at    TIMESTAMPTZ NOT NULL,
    archived_at      TIMESTAMPTZ NOT NULL,
    CONSTRAINT ux_task_execution UNIQUE (task_id, execution_number),
    CONSTRAINT ck_execution_actual CHECK (actual_start_at <= actual_end_at)
);
CREATE INDEX ix_task_execution_end ON task_execution (actual_end_at);

CREATE TABLE pomodoro_session (
    id                  UUID PRIMARY KEY,
    task_id             UUID REFERENCES task (id) ON DELETE SET NULL,
    execution_number    INTEGER,
    type                VARCHAR(20) NOT NULL,
    status              VARCHAR(20) NOT NULL,
    planned_seconds     INTEGER     NOT NULL,
    accumulated_seconds INTEGER     NOT NULL DEFAULT 0,
    worked_seconds      INTEGER     NOT NULL DEFAULT 0,
    sequence_number     INTEGER     NOT NULL DEFAULT 1,
    started_at          TIMESTAMPTZ NOT NULL,
    last_resumed_at     TIMESTAMPTZ,
    ended_at            TIMESTAMPTZ,
    version             BIGINT      NOT NULL DEFAULT 0,
    CONSTRAINT ck_session_type CHECK (type IN ('WORK', 'SHORT_BREAK', 'LONG_BREAK')),
    CONSTRAINT ck_session_status CHECK (status IN ('RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED')),
    CONSTRAINT ck_session_planned CHECK (planned_seconds > 0),
    CONSTRAINT ck_session_running CHECK (status <> 'RUNNING' OR last_resumed_at IS NOT NULL),
    CONSTRAINT ck_session_ended CHECK (status IN ('RUNNING', 'PAUSED') OR ended_at IS NOT NULL)
);
-- Garantit au plus une session active : empeche les sessions fantomes et le double comptage.
CREATE UNIQUE INDEX ux_session_single_active ON pomodoro_session ((TRUE)) WHERE status IN ('RUNNING', 'PAUSED');
CREATE INDEX ix_session_started ON pomodoro_session (started_at DESC);
CREATE INDEX ix_session_task ON pomodoro_session (task_id, execution_number);

-- Top 3 du jour : objectifs prioritaires choisis pour une date locale.
CREATE TABLE daily_goal (
    id         UUID PRIMARY KEY,
    goal_date  DATE        NOT NULL,
    task_id    UUID        NOT NULL REFERENCES task (id) ON DELETE CASCADE,
    position   INTEGER     NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ux_daily_goal_task UNIQUE (goal_date, task_id),
    CONSTRAINT ux_daily_goal_position UNIQUE (goal_date, position) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT ck_daily_goal_position CHECK (position BETWEEN 0 AND 2)
);

-- Singleton : application mono-utilisateur.
CREATE TABLE user_settings (
    id                        SMALLINT PRIMARY KEY CHECK (id = 1),
    time_zone                 VARCHAR(60) NOT NULL DEFAULT 'Europe/Paris',
    week_starts_on            VARCHAR(10) NOT NULL DEFAULT 'MONDAY',
    theme                     VARCHAR(10) NOT NULL DEFAULT 'SYSTEM',
    work_minutes              INTEGER     NOT NULL DEFAULT 25,
    short_break_minutes       INTEGER     NOT NULL DEFAULT 5,
    long_break_minutes        INTEGER     NOT NULL DEFAULT 15,
    sessions_before_long      INTEGER     NOT NULL DEFAULT 4,
    auto_start_breaks         BOOLEAN     NOT NULL DEFAULT FALSE,
    auto_start_work           BOOLEAN     NOT NULL DEFAULT FALSE,
    notifications_enabled     BOOLEAN     NOT NULL DEFAULT FALSE,
    sound_enabled             BOOLEAN     NOT NULL DEFAULT TRUE,
    sound_name                VARCHAR(20) NOT NULL DEFAULT 'bell',
    daily_focus_goal_minutes  INTEGER     NOT NULL DEFAULT 120,
    subtasks_complete_parent  BOOLEAN     NOT NULL DEFAULT FALSE,
    shortcuts_enabled         BOOLEAN     NOT NULL DEFAULT TRUE,
    compact_mode              BOOLEAN     NOT NULL DEFAULT FALSE,
    version                   BIGINT      NOT NULL DEFAULT 0
);
INSERT INTO user_settings (id) VALUES (1);
