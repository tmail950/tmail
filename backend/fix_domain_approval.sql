-- 1. Approve all existing verified domains so they appear in the public dropdown
UPDATE public.user_domains
SET admin_approval = 'approved'
WHERE is_verified = true
  AND (admin_approval IS NULL OR admin_approval = 'pending');

-- 2. Ensure new domains are still pending by default but allow admins to see them
-- (Already handled by table defaults, but this confirms the state for existing data)
