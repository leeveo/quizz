-- SQL functions to fix database structure

-- Function to create the add_quiz_id function
CREATE OR REPLACE FUNCTION create_add_quiz_id_function() RETURNS void AS $$
BEGIN
    -- Create the function to add quiz_id column if it doesn't exist
    EXECUTE $FUNC$
    CREATE OR REPLACE FUNCTION add_quiz_id_to_participants() RETURNS void AS $INNER$
    BEGIN
        -- Check if column exists
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'participants' 
            AND column_name = 'quiz_id'
        ) THEN
            -- Add column
            ALTER TABLE participants ADD COLUMN quiz_id UUID;
        END IF;
    END;
    $INNER$ LANGUAGE plpgsql;
    $FUNC$;
END;
$$ LANGUAGE plpgsql;

-- Create the function immediately
SELECT create_add_quiz_id_function();

-- Function to check and create participants table if it doesn't exist
CREATE OR REPLACE FUNCTION ensure_participants_table() RETURNS void AS $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'participants'
    ) THEN
        CREATE TABLE participants (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name TEXT NOT NULL,
            avatar_emoji TEXT,
            quiz_id UUID,
            connected_at TIMESTAMPTZ DEFAULT now()
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to create the add_launch_id function
CREATE OR REPLACE FUNCTION create_add_launch_id_function() RETURNS void AS $$
BEGIN
    -- Create the function to add launch_id column if it doesn't exist
    EXECUTE $FUNC$
    CREATE OR REPLACE FUNCTION add_launch_id_to_quizzes() RETURNS void AS $INNER$
    BEGIN
        -- Check if column exists
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'quizzes' 
            AND column_name = 'launch_id'
        ) THEN
            -- Add column
            ALTER TABLE quizzes ADD COLUMN launch_id TEXT;
        END IF;
    END;
    $INNER$ LANGUAGE plpgsql;
    $FUNC$;
END;
$$ LANGUAGE plpgsql;

-- Create the function immediately
SELECT create_add_launch_id_function();
