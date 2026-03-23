-- 24-Hour Auto-Delete Migration
-- This script ensures emails are permanently deleted after 24 hours.

-- 1. Create the cleanup function
CREATE OR REPLACE FUNCTION delete_old_emails()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.emails
    WHERE received_at < now() - interval '24 hours';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Attach trigger to the emails table
-- Runs on every INSERT to keep the table clean automatically.
DROP TRIGGER IF EXISTS tg_auto_delete_old_emails ON public.emails;
CREATE TRIGGER tg_auto_delete_old_emails
AFTER INSERT ON public.emails
FOR EACH STATEMENT
EXECUTE FUNCTION delete_old_emails();

-- 3. Initial cleanup
DELETE FROM public.emails WHERE received_at < now() - interval '24 hours';
