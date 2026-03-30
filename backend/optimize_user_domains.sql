-- Optimize user_domains table for faster queries
CREATE INDEX IF NOT EXISTS idx_user_domains_admin_approval ON public.user_domains (admin_approval);
CREATE INDEX IF NOT EXISTS idx_user_domains_is_verified ON public.user_domains (is_verified);
CREATE INDEX IF NOT EXISTS idx_user_domains_user_id ON public.user_domains (user_id);
CREATE INDEX IF NOT EXISTS idx_user_domains_created_at ON public.user_domains (created_at DESC);

-- Also optimize site_settings if it's used frequently
CREATE INDEX IF NOT EXISTS idx_site_settings_key ON public.site_settings (key);
