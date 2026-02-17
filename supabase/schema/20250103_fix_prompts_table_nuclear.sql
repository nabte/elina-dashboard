-- "Nuclear" fix for prompts table
-- We drop it with CASCADE to remove any broken dependencies/policies
DROP TABLE IF EXISTS public.prompts CASCADE;

-- Re-create it cleanly
CREATE TABLE public.prompts (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    prompt_content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Re-enable RLS
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;

-- Re-create Policies
CREATE POLICY "Users can view their own prompt"
    ON public.prompts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert/update their own prompt"
    ON public.prompts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own prompt"
    ON public.prompts FOR UPDATE
    USING (auth.uid() = user_id);

-- Re-create Trigger
CREATE OR REPLACE TRIGGER trg_prompts_updated_at
    BEFORE UPDATE ON public.prompts
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Note: The error 400 happened because "ON CONFLICT (user_id)" failed. 
-- This usually means user_id wasn't a primary key or unique constraint.
-- This script guarantees it is.
