-- Categories initiales du module « Mes achats ». Elles restent entierement modifiables, archivables
-- ou supprimables (si inutilisees) depuis l'application.
WITH parents (name, icon, color, position) AS (
    VALUES ('Logement', 'house', '#7c5cfa', 0),
           ('Courses', 'cart', '#22a06b', 1),
           ('Abonnements', 'repeat', '#3b82f6', 2),
           ('Restaurants', 'utensils', '#f97316', 3),
           ('Santé', 'health', '#e5484d', 4),
           ('Produits numériques', 'monitor', '#0ea5e9', 5),
           ('Dons', 'gift', '#d946ef', 6),
           ('Vêtements', 'shirt', '#a855f7', 7),
           ('Soins personnels', 'scissors', '#ec4899', 8),
           ('Transports ponctuels', 'car', '#eab308', 9),
           ('Loisirs', 'party', '#14b8a6', 10),
           ('Autres', 'more', '#64748b', 11)
),
inserted AS (
    INSERT INTO fin_category (id, name, icon, color, position, created_at)
    SELECT gen_random_uuid(), name, icon, color, position, now() FROM parents
    RETURNING id, name
)
INSERT INTO fin_category (id, parent_id, name, position, created_at)
SELECT gen_random_uuid(), i.id, c.name, c.position, now()
FROM inserted i
JOIN (VALUES ('Logement', 'Loyer', 0), ('Logement', 'Charges', 1),
             ('Courses', 'Alimentation', 0), ('Courses', 'Produits ménagers', 1), ('Courses', 'Soins', 2),
             ('Courses', 'Hygiène', 3),
             ('Abonnements', 'Téléphone / SIM', 0), ('Abonnements', 'ChatGPT', 1), ('Abonnements', 'Claude', 2),
             ('Abonnements', 'Transport', 3), ('Abonnements', 'Laverie', 4), ('Abonnements', 'Sport', 5),
             ('Abonnements', 'Électricité', 6), ('Abonnements', 'Assurances', 7), ('Abonnements', 'Vélo / VTC', 8),
             ('Restaurants', 'Restaurants', 0), ('Restaurants', 'Fast-food', 1), ('Restaurants', 'Cafés', 2),
             ('Santé', 'Médicaments non remboursés', 0), ('Santé', 'Consultations', 1), ('Santé', 'Autres frais', 2),
             ('Produits numériques', 'Logiciels', 0), ('Produits numériques', 'Licences', 1),
             ('Produits numériques', 'VPN', 2), ('Produits numériques', 'Services numériques', 3),
             ('Dons', 'Dons personnels', 0), ('Dons', 'Dons associatifs', 1), ('Dons', 'Dons familiaux', 2),
             ('Vêtements', 'Vêtements', 0), ('Vêtements', 'Chaussures', 1), ('Vêtements', 'Vêtements de sport', 2),
             ('Vêtements', 'Accessoires', 3),
             ('Soins personnels', 'Coiffeur', 0), ('Soins personnels', 'Autres soins', 1),
             ('Transports ponctuels', 'Taxi', 0), ('Transports ponctuels', 'VTC', 1),
             ('Transports ponctuels', 'Billets', 2), ('Transports ponctuels', 'Déplacements', 3),
             ('Loisirs', 'Activités', 0), ('Loisirs', 'Sorties', 1),
             ('Autres', 'Dépenses diverses', 0)) AS c (parent, name, position)
    ON c.parent = i.name;
