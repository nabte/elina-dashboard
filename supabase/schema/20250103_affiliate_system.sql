-- Add affiliate columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_affiliate BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id);

-- Index for performance on lookups
CREATE INDEX IF NOT EXISTS idx_curr_profiles_referred_by ON profiles(referred_by);

-- Function to get affiliate stats securely
CREATE OR REPLACE FUNCTION get_affiliate_stats(affiliate_uuid UUID)
RETURNS TABLE (
    total_referrals BIGINT,
    active_referrals BIGINT,
    monthly_commission DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_referrals,
        COUNT(*) FILTER (WHERE s.status = 'active')::BIGINT as active_referrals,
        (COUNT(*) FILTER (WHERE s.status = 'active') * 999 * 0.20)::DECIMAL as monthly_commission
    FROM profiles p
    LEFT JOIN subscriptions s ON p.id = s.user_id
    WHERE p.referred_by = affiliate_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get referral details (for the affiliate panel table)
CREATE OR REPLACE FUNCTION get_affiliate_referrals(affiliate_uuid UUID)
RETURNS TABLE (
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    status TEXT,
    plan_id TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        -- Obfuscate email for privacy/security even though it's the affiliate's referral
        CONCAT(SUBSTRING(p.email FROM 1 FOR 3), '***', SUBSTRING(p.email FROM POSITION('@' IN p.email))) as email,
        p.created_at,
        COALESCE(s.status, 'inactive') as status,
        COALESCE(s.plan_id, 'none') as plan_id
    FROM profiles p
    LEFT JOIN subscriptions s ON p.id = s.user_id
    WHERE p.referred_by = affiliate_uuid
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
