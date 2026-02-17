-- Add flow_data and is_flow columns to auto_responses table
ALTER TABLE auto_responses 
ADD COLUMN IF NOT EXISTS flow_data JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS is_flow BOOLEAN DEFAULT false;

COMMENT ON COLUMN auto_responses.flow_data IS 'JSON array defining the custom flow steps (nodes) to execute';
COMMENT ON COLUMN auto_responses.is_flow IS 'Indicates if this auto-response triggers a custom flow instead of a simple text response';
