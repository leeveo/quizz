-- Script pour ajouter les colonnes manquantes à la table participants

-- Ajouter la colonne avatar_emoji si elle n'existe pas
DO $$
BEGIN
    -- Vérifier si la colonne avatar_emoji existe déjà
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'participants' 
        AND column_name = 'avatar_emoji'
    ) THEN
        -- Ajouter la colonne
        ALTER TABLE participants ADD COLUMN avatar_emoji text;
        RAISE NOTICE 'Colonne avatar_emoji ajoutée à la table participants';
    ELSE
        RAISE NOTICE 'La colonne avatar_emoji existe déjà dans la table participants';
    END IF;
    
    -- Vérifier si la colonne avatar_id existe déjà
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'participants' 
        AND column_name = 'avatar_id'
    ) THEN
        -- Ajouter la colonne
        ALTER TABLE participants ADD COLUMN avatar_id text;
        RAISE NOTICE 'Colonne avatar_id ajoutée à la table participants';
    ELSE
        RAISE NOTICE 'La colonne avatar_id existe déjà dans la table participants';
    END IF;
END
$$;

-- Confirmer que les colonnes existent maintenant
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'participants' 
AND column_name IN ('avatar_emoji', 'avatar_id');
