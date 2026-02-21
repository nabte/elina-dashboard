SELECT COUNT(*) as users_without_subscription FROM profiles p WHERE NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id = p.id) AND p.role \!= 'superadmin';
