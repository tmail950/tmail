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

    // 1. Delete all received emails for this user
    if (userEmail) {
      const { error: emailDeleteError } = await adminClient
        .from('emails')
        .delete()
        .eq('recipient_address', userEmail)
      
      if (emailDeleteError) {
        console.error('Failed to delete emails:', emailDeleteError)
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
