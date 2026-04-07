import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const { email, newPassword, requestId } = await req.json();
    if (!email || !newPassword || !requestId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Check if email belongs to a guest mailbox
    const { data: guest } = await supabase
      .from('guest_mailboxes')
      .select('email_address')
      .eq('email_address', email)
      .maybeSingle();

    if (guest) {
      const { error: guestError } = await supabase
        .from('guest_mailboxes')
        .update({ password_hash: newPassword })
        .eq('email_address', email);
      
      if (guestError) throw guestError;
    } else {
      // 2. Check if email belongs to a registered user
      const { data: userList, error: userError } = await supabase.auth.admin.listUsers();
      if (userError) throw userError;

      const targetUser = userList.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
      
      if (targetUser) {
        const { error: resetError } = await supabase.auth.admin.updateUserById(targetUser.id, {
          password: newPassword
        });
        if (resetError) throw resetError;
      } else {
        return NextResponse.json({ error: 'User/Mailbox not found.' }, { status: 404 });
      }
    }

    // 3. Cleanup Request
    await supabase.from('reset_requests').delete().eq('id', requestId);

    return NextResponse.json({ success: true, message: 'Password reset successfully.' });
  } catch (error: any) {
    console.error('Admin Reset Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to reset password.' }, { status: 500 });
  }
}
