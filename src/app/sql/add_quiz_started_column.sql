-- Ajouter une colonne quiz_started à la table quizzes pour distinguer lancé/démarré

-- Vérifier si la colonne existe déjà avant de l'ajouter
DO $$
BEGIN
    -- Vérifier si la colonne existe déjà
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'quizzes' 
        AND column_name = 'quiz_started'
    ) THEN
        -- Ajouter la colonne
        ALTER TABLE quizzes ADD COLUMN quiz_started boolean DEFAULT false;
        
        RAISE NOTICE 'Colonne quiz_started ajoutée à la table quizzes';
    ELSE
        RAISE NOTICE 'La colonne quiz_started existe déjà dans la table quizzes';
    END IF;
END
$$;
