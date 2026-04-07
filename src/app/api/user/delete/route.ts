import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const userEmail = user.email

    // 1. Fetch all reserved holographic addresses
    const { data: reservedAddresses } = await adminClient
      .from('user_emails')
      .select('email_address')
      .eq('user_id', user.id);
    
    const addressesToPurge = [
      user.email,
      ...(reservedAddresses?.map(r => r.email_address) || [])
    ].filter(Boolean) as string[];

    // 2. Transhumanist Purge: Delete all emails for ANY of the user's addresses
    if (addressesToPurge.length > 0) {
      const { error: emailDeleteError } = await adminClient
        .from('emails')
        .delete()
        .in('recipient_address', addressesToPurge);
      
      if (emailDeleteError) {
        console.error('Failed to delete holographic transmissions:', emailDeleteError);
      }
    }

    // 2. Delete the user from auth.users (this will cascade to other tables if ON DELETE CASCADE is set)
    const { error: userDeleteError } = await adminClient.auth.admin.deleteUser(user.id)

    if (userDeleteError) {
      return NextResponse.json({ error: userDeleteError.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Account and associated data deleted successfully' })
  } catch (error: any) {
    console.error('Account deletion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
