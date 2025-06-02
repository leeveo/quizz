-- Run this script directly in the Supabase SQL Editor

-- First check if the column exists
DO $$
DECLARE
  column_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'quizzes' 
    AND column_name = 'primary_color'
  ) INTO column_exists;
  
  IF NOT column_exists THEN
    -- Add the column with default value
    EXECUTE 'ALTER TABLE quizzes ADD COLUMN primary_color VARCHAR(20) DEFAULT ''#4f46e5''';
    RAISE NOTICE 'Added primary_color column to quizzes table';
  ELSE
    RAISE NOTICE 'Column primary_color already exists in quizzes table';
  END IF;
END $$;

-- Show the updated table structure
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'quizzes'
ORDER BY ordinal_position;

-- Display sample data to verify the column
SELECT id, title, primary_color
FROM quizzes
LIMIT 5;
