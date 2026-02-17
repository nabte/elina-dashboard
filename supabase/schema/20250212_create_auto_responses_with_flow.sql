-- Create auto_responses table IF NOT EXISTS
CREATE TABLE IF NOT EXISTS auto_responses (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    trigger_text TEXT NOT NULL,
    response_text TEXT NOT NULL,
    is_active BOOLEAN DEFAULT false,
    match_type TEXT DEFAULT 'exact' CHECK (match_type IN ('exact', 'contains')),
    flow_data JSONB DEFAULT '[]'::jsonb,
    is_flow BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_auto_responses_user_active ON auto_responses(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_auto_responses_trigger_text ON auto_responses USING gin(to_tsvector('spanish', trigger_text));

-- RLS
ALTER TABLE auto_responses ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'auto_responses' AND policyname = 'Users can view their own auto responses') THEN
        CREATE POLICY "Users can view their own auto responses" ON auto_responses FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'auto_responses' AND policyname = 'Users can insert their own auto responses') THEN
        CREATE POLICY "Users can insert their own auto responses" ON auto_responses FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'auto_responses' AND policyname = 'Users can update their own auto responses') THEN
        CREATE POLICY "Users can update their own auto responses" ON auto_responses FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'auto_responses' AND policyname = 'Users can delete their own auto responses') THEN
        CREATE POLICY "Users can delete their own auto responses" ON auto_responses FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_auto_responses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_auto_responses_updated_at_trigger ON auto_responses;
CREATE TRIGGER update_auto_responses_updated_at_trigger
    BEFORE UPDATE ON auto_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_auto_responses_updated_at();

-- Comments
COMMENT ON TABLE auto_responses IS 'Table for auto responses including custom flows';
COMMENT ON COLUMN auto_responses.flow_data IS 'JSON array defining the custom flow steps (nodes) to execute';
COMMENT ON COLUMN auto_responses.is_flow IS 'Indicates if this auto-response triggers a custom flow instead of a simple text response';
