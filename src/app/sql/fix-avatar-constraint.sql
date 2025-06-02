-- Script pour rendre la colonne avatar nullable ou lui donner une valeur par défaut

-- Option 1: Rendre la colonne avatar nullable
ALTER TABLE participants ALTER COLUMN avatar DROP NOT NULL;

-- Option 2 (alternative): Donner une valeur par défaut à avatar
-- ALTER TABLE participants ALTER COLUMN avatar SET DEFAULT '👤';
