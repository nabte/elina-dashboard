-- Enable pgvector extension if not already enabled (should be enabled for RAG)
CREATE EXTENSION IF NOT EXISTS vector;

-- Table: prompt_versions
-- Stores the history of prompt changes with metadata
CREATE TABLE IF NOT EXISTS prompt_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    prompt_content TEXT NOT NULL,
    version_number INTEGER NOT NULL,
    change_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Constraint to ensure version numbers are unique per user (handled via logic/trigger usually, 
    -- but unique index helps concurrency)
    UNIQUE(user_id, version_number)
);

-- Index for faster lookup of user's prompt history
CREATE INDEX IF NOT EXISTS idx_prompt_versions_user_created ON prompt_versions(user_id, created_at DESC);

-- Table: training_examples
-- Stores user-curated examples (good/bad responses) for RAG optimization
CREATE TABLE IF NOT EXISTS training_examples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    contact_id TEXT, -- Can be null for generic examples, or link to a specific contact/simulation
    user_message TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    is_good_example BOOLEAN DEFAULT true, -- true = good response to emulate, false = bad response to avoid
    notes TEXT,
    embedding VECTOR(1536), -- For semantic search of examples
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for training_examples
CREATE INDEX IF NOT EXISTS idx_training_examples_user_good ON training_examples(user_id, is_good_example);
-- HNSW index for vector search
CREATE INDEX IF NOT EXISTS idx_training_examples_embedding ON training_examples USING hnsw (embedding vector_cosine_ops);

-- Alter Table: chat_history
-- Add is_simulation flag to distinguish real chats from playground simulations
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_history' AND column_name = 'is_simulation') THEN
        ALTER TABLE chat_history ADD COLUMN is_simulation BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Index for filtering simulations
CREATE INDEX IF NOT EXISTS idx_chat_history_simulation ON chat_history(user_id, is_simulation);

-- Policies (RLS)
-- Enable RLS
ALTER TABLE prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_examples ENABLE ROW LEVEL SECURITY;

-- Prompt Versions Policies
CREATE POLICY "Users can view their own prompt versions" 
    ON prompt_versions FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own prompt versions" 
    ON prompt_versions FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Training Examples Policies
CREATE POLICY "Users can view their own training examples" 
    ON training_examples FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own training examples" 
    ON training_examples FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own training examples" 
    ON training_examples FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own training examples" 
    ON training_examples FOR DELETE
    USING (auth.uid() = user_id);
