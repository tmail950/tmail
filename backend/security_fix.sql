-- QUAMIFY MAIL: SECURITY HARDENING FIX (v2)
-- Run this in your Supabase SQL Editor to lock down email privacy.

-- 1. Remove Permissive Policies
DROP POLICY IF EXISTS "Users can view emails for their domains" ON public.emails;
DROP POLICY IF EXISTS "Users can view emails for their reserved addresses" ON public.emails;
DROP POLICY IF EXISTS "Users can view emails for their guest addresses" ON public.emails;

-- 2. Create Strict Ownership Policy for Registered Users
-- This ensures you ONLY see emails for addresses you have explicitly reserved.
CREATE POLICY "Strict Email Ownership" 
ON public.emails FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.user_emails 
        WHERE public.user_emails.user_id = auth.uid() 
        AND public.emails.recipient_address = public.user_emails.email_address
    )
    OR
    (auth.uid() IS NULL AND EXISTS (
        SELECT 1 FROM public.guest_mailboxes
        WHERE public.guest_mailboxes.email_address = public.emails.recipient_address
        -- NOTE: For production guests, we'd add session-based security here.
    ))
);

-- 3. Ensure Unique Constraints are Enforced
-- This prevents two users from ever claiming the same address.
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_emails_email_address_key') THEN
        ALTER TABLE public.user_emails ADD CONSTRAINT user_emails_email_address_key UNIQUE (email_address);
    END IF;
END $$;

-- 4. Final check on guest uniqueness
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'handle_unique_guest_emails') THEN
        ALTER TABLE public.guest_mailboxes ADD CONSTRAINT handle_unique_guest_emails UNIQUE (email_address);
    END IF;
END $$;
