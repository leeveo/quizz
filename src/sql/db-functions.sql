-- SQL function to add primary_color column to quizzes table

CREATE OR REPLACE FUNCTION add_primary_color_column()
RETURNS void AS $$
BEGIN
  -- Check if the column exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'quizzes' 
    AND column_name = 'primary_color'
  ) THEN
    -- Add the column with default value '#4f46e5' (indigo)
    EXECUTE 'ALTER TABLE quizzes ADD COLUMN primary_color VARCHAR(20) DEFAULT ''#4f46e5''';
  END IF;
END;
$$ LANGUAGE plpgsql;
