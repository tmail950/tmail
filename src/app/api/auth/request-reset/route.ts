import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { emailService } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    
    // 1. Get Master Admin Email
    const { data: settings, error: settingsError } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'admin_email')
      .single();

    const masterAdmin = settings?.value || 'info369skills@gmail.com';

    // 2. Send Notification to Master Admin
    await emailService.sendPasswordResetRequest(masterAdmin, email);

    return NextResponse.json({ success: true, message: 'Reset request sent to master admin.' });
  } catch (error: any) {
    console.error('Reset Request Error:', error);
    return NextResponse.json({ error: 'Failed to process reset request.' }, { status: 500 });
  }
}
