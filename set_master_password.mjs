
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setMasterPassword() {
  const email = 'abcd@artradering.com'
  const password = 'TMAIL.PKMaster2026!' // Temporary strong password
  
  console.log(`Setting password for ${email}...`)
  
  // Try to find the user first
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) {
    console.error('Error listing users:', listError)
    return
  }
  
  const existingUser = users.find(u => u.email === email)
  
  if (existingUser) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      { password: password, email_confirm: true }
    )
    if (updateError) {
      console.error('Error updating password:', updateError)
    } else {
      console.log('Password updated successfully.')
    }
  } else {
    // Create new user if not exists
    const { error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })
    if (createError) {
      console.error('Error creating user:', createError)
    } else {
      console.log('User created and password set successfully.')
    }
  }
}

setMasterPassword()
