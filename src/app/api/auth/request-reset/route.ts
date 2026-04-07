export const runtime = 'edge';
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
    const { data: settings } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'admin_email')
      .single();

    const masterAdmin = settings?.value || 'info369skills@gmail.com';

    // 2. Insert into reset_requests table for Admin visibility
    const { error: insertError } = await supabase
      .from('reset_requests')
      .insert({ email: email.toLowerCase().trim() });

    if (insertError && insertError.code !== '23505') {
       throw insertError;
    }

    // 3. Send Notification to Master Admin (Optional fallback)
    try {
      const { emailService } = await import('@/lib/email');
      await emailService.sendPasswordResetRequest(masterAdmin, email);
    } catch (e) {
      console.warn('Email notification skipped:', e);
    }

    return NextResponse.json({ success: true, message: 'Reset request logged. Admin will assist you shortly.' });
  } catch (error: any) {
    console.error('Reset Request Error:', error);
    return NextResponse.json({ error: 'Failed to process reset request.' }, { status: 500 });
  }
}
