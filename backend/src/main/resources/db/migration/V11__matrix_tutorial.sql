-- Tutoriel de la matrice d'Eisenhower : termine ou passe une fois, il ne revient plus de lui-meme (relance possible).
ALTER TABLE user_settings
    ADD COLUMN matrix_tutorial_done BOOLEAN NOT NULL DEFAULT FALSE;
