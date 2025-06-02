-- Créer une fonction pour réparer la table participants
CREATE OR REPLACE FUNCTION fix_participants_table()
RETURNS void AS $$
BEGIN
    -- Vérifier si la colonne quiz_id existe déjà
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'participants' 
        AND column_name = 'quiz_id'
    ) THEN
        -- Ajouter la colonne
        EXECUTE 'ALTER TABLE participants ADD COLUMN quiz_id uuid';
        
        -- Ajouter la contrainte de clé étrangère
        EXECUTE 'ALTER TABLE participants 
                ADD CONSTRAINT fk_participants_quiz 
                FOREIGN KEY (quiz_id) 
                REFERENCES quizzes(id) 
                ON DELETE CASCADE';
                
        RAISE NOTICE 'Colonne quiz_id ajoutée à la table participants';
    ELSE
        RAISE NOTICE 'La colonne quiz_id existe déjà dans la table participants';
    END IF;
END;
$$ LANGUAGE plpgsql;
