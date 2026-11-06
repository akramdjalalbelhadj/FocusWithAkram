-- Tutoriel de « Notes & idées » : termine ou passe une fois, il ne revient plus de lui-meme (relance possible).
ALTER TABLE user_settings
    ADD COLUMN notes_tutorial_done BOOLEAN NOT NULL DEFAULT FALSE;
