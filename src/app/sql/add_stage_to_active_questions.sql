-- Ajouter une colonne stage à la table active_questions pour suivre l'étape de la question

-- Vérifier si la colonne existe déjà avant de l'ajouter
DO $$
BEGIN
    -- Vérifier si la colonne existe déjà
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'active_questions' 
        AND column_name = 'stage'
    ) THEN
        -- Ajouter la colonne
        ALTER TABLE active_questions ADD COLUMN stage text DEFAULT 'question';
        
        RAISE NOTICE 'Colonne stage ajoutée à la table active_questions';
    ELSE
        RAISE NOTICE 'La colonne stage existe déjà dans la table active_questions';
    END IF;
END
$$;
