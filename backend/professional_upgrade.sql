-- SQL for TMAIL.PK Professional Upgrade

-- 1. Platforms Domains Table (Disposable Domains provided by the platform)
CREATE TABLE IF NOT EXISTS public.domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;

-- Public read access for the signup dropdown
CREATE POLICY "Allow public read access to active domains" 
    ON public.domains FOR SELECT 
    USING (is_active = TRUE);

-- Admin management access
CREATE POLICY "Admins can manage platform domains" 
    ON public.domains FOR ALL 
    USING (
        auth.jwt() ->> 'email' = 'info369skills@gmail.com' 
        OR EXISTS (SELECT 1 FROM admins WHERE email = auth.jwt() ->> 'email')
    );

-- 2. Ensure emails can be deleted when a user is deleted
-- The emails table currently uses `recipient_address`.
-- We should ideally have a way to match emails to users.
-- Since emails are received based on the address, and the address is the user's login ID,
-- we can delete emails WHERE recipient_address = user_email.

-- Initial Professional Domains
INSERT INTO public.domains (domain_name) VALUES 
('sharebot.net'),
('TMAIL.PK-mail.com'),
('temp-mail.pro')
ON CONFLICT (domain_name) DO NOTHING;
