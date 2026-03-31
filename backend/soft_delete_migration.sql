-- Migration: Add soft-delete flag, last_used_at tracking, 30-day retention, and FULL RESET
-- This ensures that once-used names are never reassigned and old emails are purged for privacy.

-- 1. Full Reset of existing emails (Requested by user)
TRUNCATE TABLE public.emails;

-- 2. Update user_emails table
ALTER TABLE public.user_emails 
ADD COLUMN IF NOT EXISTS is_deleted_by_user BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Update guest_mailboxes table
ALTER TABLE public.guest_mailboxes 
ADD COLUMN IF NOT EXISTS is_deleted_by_user BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 4. Update Email Retention Policy from 24h to 30 Days
CREATE OR REPLACE FUNCTION delete_old_emails()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.emails
    WHERE received_at < now() - interval '30 days';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Re-load schema
NOTIFY pgrst, 'reload schema';

-- Note: To fully support "one email for one user", we rely on the UNIQUE constraint 
-- on 'email_address' in both user_emails and guest_mailboxes.
-- By using 'is_deleted_by_user' instead of physical deletion, we ensure the row 
-- always exists and blocks regeneration for other users.
