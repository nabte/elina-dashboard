-- Add reminder settings columns to appointment_settings
ALTER TABLE "appointment_settings"
ADD COLUMN IF NOT EXISTS "reminder_hours_before" INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS "reminder_days_before" INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS "is_reminder_enabled" BOOLEAN DEFAULT true;

-- Create message_templates table if it doesn't exist
CREATE TABLE IF NOT EXISTS "message_templates" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    "type" TEXT NOT NULL, -- 'appointment_reminder', 'confirmation', etc.
    "template_text" TEXT NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE("user_id", "type")
);

-- RLS for message_templates
ALTER TABLE "message_templates" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_message_templates_policy" ON "message_templates";
CREATE POLICY "owner_message_templates_policy" ON "message_templates"
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Insert default templates for existing users (optional, but good for UX)
-- This might need to be done via application logic or a separate script if users already exist
