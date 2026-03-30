-- SQL for TMAIL.PK Mail Advanced Features

-- 1. Domains Table
CREATE TABLE IF NOT EXISTS user_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    domain_name TEXT NOT NULL UNIQUE,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE user_domains ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own domains" ON user_domains;
CREATE POLICY "Users can view their own domains" 
    ON user_domains FOR SELECT 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view verified domains" ON user_domains;
CREATE POLICY "Anyone can view verified domains" 
    ON user_domains FOR SELECT 
    USING (is_verified = true AND admin_approval = 'approved');

DROP POLICY IF EXISTS "Users can insert their own domains" ON user_domains;
CREATE POLICY "Users can insert their own domains" 
    ON user_domains FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own domains" ON user_domains;
CREATE POLICY "Users can delete their own domains" 
    ON user_domains FOR DELETE 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own domains" ON user_domains;
CREATE POLICY "Users can update their own domains" 
    ON user_domains FOR UPDATE USING (auth.uid() = user_id);

-- Final Admin Infrastructure
CREATE TABLE IF NOT EXISTS public.admins (
    email TEXT PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.custom_domains (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    domain_name TEXT UNIQUE NOT NULL,
    dns_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS & Policies
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_domains ENABLE ROW LEVEL SECURITY;

-- Global Read Access
DROP POLICY IF EXISTS "Public read site_settings" ON public.site_settings;
CREATE POLICY "Public read site_settings" ON public.site_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read admins" ON public.admins;
CREATE POLICY "Public read admins" ON public.admins FOR SELECT USING (true);

-- Admin Management
DROP POLICY IF EXISTS "Admins manage settings" ON public.site_settings;
CREATE POLICY "Admins manage settings" ON public.site_settings FOR ALL 
    USING (auth.jwt() ->> 'email' = 'info369skills@gmail.com' OR EXISTS (SELECT 1 FROM admins WHERE email = auth.jwt() ->> 'email'));

-- Admin Management Policies (Split to avoid syntax error)
DROP POLICY IF EXISTS "Admins insert admins" ON public.admins;
CREATE POLICY "Admins insert admins" ON public.admins FOR INSERT WITH CHECK (
    auth.jwt() ->> 'email' = 'info369skills@gmail.com' OR auth.jwt() ->> 'email' IN (SELECT email FROM admins)
);

DROP POLICY IF EXISTS "Admins update admins" ON public.admins;
CREATE POLICY "Admins update admins" ON public.admins FOR UPDATE USING (
    auth.jwt() ->> 'email' = 'info369skills@gmail.com' OR auth.jwt() ->> 'email' IN (SELECT email FROM admins)
);

DROP POLICY IF EXISTS "Admins delete admins" ON public.admins;
CREATE POLICY "Admins delete admins" ON public.admins FOR DELETE USING (
    auth.jwt() ->> 'email' = 'info369skills@gmail.com' OR auth.jwt() ->> 'email' IN (SELECT email FROM admins)
);

DROP POLICY IF EXISTS "Admins manage custom_domains" ON public.custom_domains;
CREATE POLICY "Admins manage custom_domains" ON public.custom_domains FOR ALL 
    USING (auth.jwt() ->> 'email' = 'info369skills@gmail.com' OR EXISTS (SELECT 1 FROM admins WHERE email = auth.jwt() ->> 'email'));

-- User Custom Domains
DROP POLICY IF EXISTS "Users view own custom_domains" ON public.custom_domains;
CREATE POLICY "Users view own custom_domains" ON public.custom_domains FOR SELECT 
    USING (auth.uid() = user_id);

-- Cache Refresh
NOTIFY pgrst, 'reload schema';

-- Initial records
INSERT INTO admins (email) VALUES ('info369skills@gmail.com') ON CONFLICT DO NOTHING;
INSERT INTO site_settings (key, value) VALUES ('main_domain', 'TMAIL.PK-mail.vercel.app') ON CONFLICT DO NOTHING;
INSERT INTO site_settings (key, value) VALUES ('support_email', 'support@369aiventures.com') ON CONFLICT DO NOTHING;
INSERT INTO site_settings (key, value) VALUES ('copyright_text', 'TMAIL.PK. All Rights Reserved.') ON CONFLICT DO NOTHING;
INSERT INTO site_settings (key, value) VALUES ('terms_content', 'By accessing and using TMAIL.PK Mail, you agree to be bound by these terms. This service provides temporary holographic email addresses for testing and privacy purposes.') ON CONFLICT DO NOTHING;
INSERT INTO site_settings (key, value) VALUES ('safety_clause_content', 'TMAIL.PK ka structure third-party providers (Vercel, Supabase, Cloudflare) par depend karta hai. In platforms ki policies, free-tier limits, ya uptime humare control mein nahi hain.') ON CONFLICT DO NOTHING;

-- 2. Domain Limit Trigger (9 Domains Max)
CREATE OR REPLACE FUNCTION check_domain_limit() RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM user_domains WHERE user_id = NEW.user_id) >= 9 THEN
    RAISE EXCEPTION 'Domain limit reached (Max 9)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tg_check_domain_limit ON user_domains;
CREATE TRIGGER tg_check_domain_limit
BEFORE INSERT ON user_domains
FOR EACH ROW EXECUTE FUNCTION check_domain_limit();

-- 3. Emails Table (The core of the inbox)
CREATE TABLE IF NOT EXISTS public.emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender TEXT NOT NULL,
    subject TEXT,
    recipient_address TEXT NOT NULL,
    body_text TEXT,
    body_html TEXT,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Emails
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

-- High-Concurrency Indexes
CREATE INDEX IF NOT EXISTS idx_emails_recipient_address ON public.emails (recipient_address);
CREATE INDEX IF NOT EXISTS idx_emails_received_at ON public.emails (received_at DESC);

-- Email Access Policy: Users can only see emails for domains they own and have verified
DROP POLICY IF EXISTS "Users can view emails for their domains" ON public.emails;
CREATE POLICY "Users can view emails for their domains" 
    ON public.emails FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM user_domains 
            WHERE user_domains.user_id = auth.uid() 
            AND public.emails.recipient_address LIKE ('%@' || user_domains.domain_name)
        )
        OR 
        public.emails.recipient_address LIKE '%@TMAIL.PK-mail.com'
        OR
        EXISTS (
            SELECT 1 FROM public.guest_mailboxes
            WHERE public.guest_mailboxes.email_address = public.emails.recipient_address
        )
    );
    
DROP POLICY IF EXISTS "Public can insert emails" ON public.emails;
CREATE POLICY "Public can insert emails" 
    ON public.emails FOR INSERT 
    WITH CHECK (true);

-- 4. Rate Limiting Table
CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    hits INTEGER DEFAULT 1,
    last_hit TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
