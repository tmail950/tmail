import { createClient } from '@/lib/supabase/client';

const MASTER_ADMINS = [
  'info369skills@gmail.com',
  'danubaba369@gmail.com',
];

export async function isMasterAdmin(email: string | undefined): Promise<boolean> {
  if (!email) return false;
  const userEmail = email.toLowerCase().trim();
  
  // 1. Check Hardcoded List
  if (MASTER_ADMINS.some(admin => admin.toLowerCase() === userEmail)) {
    return true;
  }

  // 2. Check site_settings (Dynamic admin)
  try {
    const supabase = createClient();
    const { data: settings } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'admin_email')
      .maybeSingle();

    if (settings?.value?.toLowerCase().trim() === userEmail) {
      return true;
    }
  } catch (e) {
    console.warn("ADMIN-CHECK: Site settings fetch failed:", e);
  }

  return false;
}
