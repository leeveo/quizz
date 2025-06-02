-- Add launched_at column to quizzes table

DO $$
BEGIN
    -- Check if the column already exists
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'quizzes' 
        AND column_name = 'launched_at'
    ) THEN
        -- Add the column
        ALTER TABLE quizzes ADD COLUMN launched_at timestamptz;
        
        RAISE NOTICE 'Column launched_at added to quizzes table';
    ELSE
        RAISE NOTICE 'Column launched_at already exists in quizzes table';
    END IF;
END
$$;
