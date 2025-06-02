-- Script d'urgence pour ajouter la colonne quiz_id à la table participants

-- Ajouter directement la colonne quiz_id si elle n'existe pas
DO $$
BEGIN
    -- Vérifier si la colonne existe déjà
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'participants' 
        AND column_name = 'quiz_id'
    ) THEN
        -- Ajouter la colonne
        ALTER TABLE participants ADD COLUMN quiz_id uuid;
        
        -- Ajouter la contrainte de clé étrangère
        ALTER TABLE participants 
        ADD CONSTRAINT fk_participants_quiz 
        FOREIGN KEY (quiz_id) 
        REFERENCES quizzes(id) 
        ON DELETE CASCADE;
        
        RAISE NOTICE 'Colonne quiz_id ajoutée à la table participants';
    ELSE
        RAISE NOTICE 'La colonne quiz_id existe déjà dans la table participants';
    END IF;
END
$$;

-- Confirmer que la colonne existe maintenant
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'participants' 
AND column_name = 'quiz_id';
