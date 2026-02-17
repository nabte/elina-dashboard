-- Affiliate Withdrawal System Migration
-- This migration creates the withdrawal_requests table and RPCs for managing affiliate payouts.

-- 1. Create the withdrawal_requests table
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
    notes TEXT, -- Admin notes for rejection reason, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES profiles(id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_affiliate ON withdrawal_requests(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);

-- 2. RLS Policies
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Affiliates can view their own withdrawal requests
CREATE POLICY "Affiliates can view own withdrawals"
ON withdrawal_requests FOR SELECT
USING (auth.uid() = affiliate_id);

-- Affiliates can insert their own withdrawal requests
CREATE POLICY "Affiliates can request withdrawals"
ON withdrawal_requests FOR INSERT
WITH CHECK (auth.uid() = affiliate_id AND status = 'pending');

-- Superadmins can view all withdrawal requests
CREATE POLICY "Superadmins can view all withdrawals"
ON withdrawal_requests FOR SELECT
USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
);

-- Superadmins can update withdrawal requests (approve/reject)
CREATE POLICY "Superadmins can update withdrawals"
ON withdrawal_requests FOR UPDATE
USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
);

-- 3. RPC: Create Withdrawal Request
-- Validates that the affiliate has sufficient estimated commission before creating a request
CREATE OR REPLACE FUNCTION create_withdrawal_request(requested_amount DECIMAL)
RETURNS JSON AS $$
DECLARE
    affiliate_user_id UUID := auth.uid();
    active_referrals INT;
    estimated_commission DECIMAL;
    pending_withdrawals DECIMAL;
    available_balance DECIMAL;
    new_request_id UUID;
BEGIN
    -- Check if user is an affiliate
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = affiliate_user_id AND is_affiliate = TRUE) THEN
        RETURN json_build_object('success', false, 'error', 'User is not an approved affiliate.');
    END IF;

    -- Count active referrals (subscriptions with status 'active' or 'trialing')
    SELECT COUNT(*) INTO active_referrals
    FROM profiles p
    JOIN subscriptions s ON p.id = s.user_id
    WHERE p.referred_by = affiliate_user_id
      AND s.status IN ('active', 'trialing');

    -- Calculate estimated commission ($199.80 MXN per active referral)
    estimated_commission := active_referrals * 199.80;

    -- Calculate pending withdrawals
    SELECT COALESCE(SUM(amount), 0) INTO pending_withdrawals
    FROM withdrawal_requests
    WHERE affiliate_id = affiliate_user_id AND status = 'pending';

    -- Available balance
    available_balance := estimated_commission - pending_withdrawals;

    -- Validate requested amount
    IF requested_amount > available_balance THEN
        RETURN json_build_object('success', false, 'error', 'Insufficient balance. Available: ' || available_balance::TEXT);
    END IF;

    IF requested_amount < 500 THEN
        RETURN json_build_object('success', false, 'error', 'Minimum withdrawal amount is $500 MXN.');
    END IF;

    -- Create the request
    INSERT INTO withdrawal_requests (affiliate_id, amount, status)
    VALUES (affiliate_user_id, requested_amount, 'pending')
    RETURNING id INTO new_request_id;

    RETURN json_build_object('success', true, 'request_id', new_request_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC: Get Admin Withdrawals (for SuperAdmin panel)
CREATE OR REPLACE FUNCTION get_admin_withdrawals(filter_status TEXT DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    affiliate_id UUID,
    affiliate_email TEXT,
    amount DECIMAL,
    status TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    processed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- Verify caller is superadmin
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role = 'superadmin') THEN
        RAISE EXCEPTION 'Unauthorized: Superadmin access required.';
    END IF;

    RETURN QUERY
    SELECT 
        wr.id,
        wr.affiliate_id,
        p.email AS affiliate_email,
        wr.amount,
        wr.status,
        wr.notes,
        wr.created_at,
        wr.processed_at
    FROM withdrawal_requests wr
    JOIN profiles p ON wr.affiliate_id = p.id
    WHERE (filter_status IS NULL OR wr.status = filter_status)
    ORDER BY wr.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC: Process Withdrawal (Approve/Reject)
CREATE OR REPLACE FUNCTION process_withdrawal(
    request_id UUID,
    new_status TEXT,
    admin_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    admin_user_id UUID := auth.uid();
BEGIN
    -- Verify caller is superadmin
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = admin_user_id AND role = 'superadmin') THEN
        RETURN json_build_object('success', false, 'error', 'Unauthorized.');
    END IF;

    -- Validate new_status
    IF new_status NOT IN ('approved', 'rejected', 'paid') THEN
        RETURN json_build_object('success', false, 'error', 'Invalid status.');
    END IF;

    -- Update the request
    UPDATE withdrawal_requests
    SET status = new_status,
        notes = admin_notes,
        processed_at = NOW(),
        processed_by = admin_user_id
    WHERE id = request_id AND status = 'pending';

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Request not found or already processed.');
    END IF;

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC: Get My Withdrawal History (for Affiliates)
CREATE OR REPLACE FUNCTION get_my_withdrawals()
RETURNS TABLE (
    id UUID,
    amount DECIMAL,
    status TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    processed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wr.id,
        wr.amount,
        wr.status,
        wr.notes,
        wr.created_at,
        wr.processed_at
    FROM withdrawal_requests wr
    WHERE wr.affiliate_id = auth.uid()
    ORDER BY wr.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
