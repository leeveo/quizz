-- Fonction pour ajouter dynamiquement une colonne à la table participants

CREATE OR REPLACE FUNCTION add_column_to_participants(column_name text, column_type text)
RETURNS void AS $$
DECLARE
  column_exists boolean;
BEGIN
  -- Vérifier si la colonne existe déjà
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'participants' 
    AND column_name = add_column_to_participants.column_name
  ) INTO column_exists;
  
  -- Si la colonne n'existe pas, l'ajouter
  IF NOT column_exists THEN
    EXECUTE format('ALTER TABLE participants ADD COLUMN %I %s', 
                  add_column_to_participants.column_name, 
                  add_column_to_participants.column_type);
    RAISE NOTICE 'Colonne % ajoutée à la table participants', add_column_to_participants.column_name;
  ELSE
    RAISE NOTICE 'La colonne % existe déjà dans la table participants', add_column_to_participants.column_name;
  END IF;
END;
$$ LANGUAGE plpgsql;
