-- Mise à jour de la table Quizzes pour ajouter les champs nécessaires
ALTER TABLE quizzes 
ADD COLUMN IF NOT EXISTS active boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS started_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS ended_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS active_question_id uuid REFERENCES questions(id),
ADD COLUMN IF NOT EXISTS finished boolean DEFAULT false;

-- Vérifier si la table participants existe déjà
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'participants') THEN
        -- La table existe, vérifier et ajouter la colonne quiz_id si elle n'existe pas
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                       WHERE table_schema = 'public' 
                       AND table_name = 'participants' 
                       AND column_name = 'quiz_id') THEN
            ALTER TABLE participants ADD COLUMN quiz_id uuid REFERENCES quizzes(id) ON DELETE CASCADE;
        END IF;
    ELSE
        -- La table n'existe pas, la créer complètement
        CREATE TABLE participants (
            id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
            quiz_id uuid REFERENCES quizzes(id) ON DELETE CASCADE,
            name text NOT NULL,
            avatar_id text,
            avatar_emoji text,
            connected_at timestamp with time zone DEFAULT now(),
            score integer DEFAULT 0
        );
    END IF;
END
$$;

-- Même chose pour participant_answers
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'participant_answers') THEN
        -- Vérifier si les colonnes nécessaires existent
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                       WHERE table_schema = 'public' 
                       AND table_name = 'participant_answers' 
                       AND column_name = 'quiz_id') THEN
            ALTER TABLE participant_answers ADD COLUMN quiz_id uuid REFERENCES quizzes(id) ON DELETE CASCADE;
        END IF;
    ELSE
        -- La table n'existe pas, la créer complètement
        CREATE TABLE participant_answers (
            id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
            participant_id uuid REFERENCES participants(id) ON DELETE CASCADE,
            question_id uuid REFERENCES questions(id) ON DELETE CASCADE,
            quiz_id uuid REFERENCES quizzes(id) ON DELETE CASCADE,
            selected_option integer,
            answered_at timestamp with time zone DEFAULT now()
        );
    END IF;
END
$$;

-- Table pour suivre la question active et si les résultats sont affichés
CREATE TABLE IF NOT EXISTS active_questions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id uuid REFERENCES quizzes(id) ON DELETE CASCADE,
    question_id uuid REFERENCES questions(id) ON DELETE CASCADE,
    show_results boolean DEFAULT false,
    correct_option integer,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(quiz_id, question_id)
);

-- Activer les fonctionnalités en temps réel pour les tables
DO $$
BEGIN
    -- Vérifier si la publication existe
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        -- Ajouter les tables à la publication
        ALTER PUBLICATION supabase_realtime ADD TABLE quizzes;
        ALTER PUBLICATION supabase_realtime ADD TABLE participants;
        ALTER PUBLICATION supabase_realtime ADD TABLE participant_answers;
        ALTER PUBLICATION supabase_realtime ADD TABLE active_questions;
    END IF;
END
$$;
