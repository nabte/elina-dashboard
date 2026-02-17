-- Create prompts table if it doesn't exist (it seems it might be missing or malformed)
-- This table stores the "Main Prompt" for the user's AI
CREATE TABLE IF NOT EXISTS public.prompts (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    prompt_content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own prompt"
    ON public.prompts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert/update their own prompt"
    ON public.prompts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own prompt"
    ON public.prompts FOR UPDATE
    USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE TRIGGER trg_prompts_updated_at
    BEFORE UPDATE ON public.prompts
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
