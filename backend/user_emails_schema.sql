-- Phase 2: Multi-Email Management System

-- 1. User Emails Table (Reservations)
CREATE TABLE IF NOT EXISTS public.user_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email_address TEXT NOT NULL UNIQUE,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_emails ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_emails
DROP POLICY IF EXISTS "Users can view their own reserved emails" ON public.user_emails;
CREATE POLICY "Users can view their own reserved emails" 
    ON public.user_emails FOR SELECT 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can reserve their own emails" ON public.user_emails;
CREATE POLICY "Users can reserve their own emails" 
    ON public.user_emails FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own reserved emails" ON public.user_emails;
CREATE POLICY "Users can delete their own reserved emails" 
    ON public.user_emails FOR DELETE 
    USING (auth.uid() = user_id);

-- 2. Update Public Emails Access Policy
-- Users should see emails for any address THEY have reserved in user_emails
DROP POLICY IF EXISTS "Users can view emails for their reserved addresses" ON public.emails;
CREATE POLICY "Users can view emails for their reserved addresses" 
    ON public.emails FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_emails 
            WHERE public.user_emails.user_id = auth.uid() 
            AND public.emails.recipient_address = public.user_emails.email_address
        )
        OR 
        -- Keep legacy domain-based access if applicable (optional, but requested for custom domains)
        EXISTS (
            SELECT 1 FROM user_domains 
            WHERE user_domains.user_id = auth.uid() 
            AND public.emails.recipient_address LIKE ('%@' || user_domains.domain_name)
        )
    );

-- 3. Initial association for existing users (Best effort)
-- This logic would normally run in a migration, but for now we'll rely on the app to associate on first visit.
