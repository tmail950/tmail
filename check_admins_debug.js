
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function checkAdmins() {
  const emails = ['master@tmail.pk', 'Admin@tmail.pk', 'info369skills@gmail.com'];
  
  console.log("Checking Admin Users in Auth...");
  
  for (const email of emails) {
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) {
      console.error("Error listing users:", error.message);
      return;
    }
    
    const user = data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      console.log(`[FOUND] ${email} - ID: ${user.id}`);
    } else {
      console.log(`[MISSING] ${email}`);
    }
  }
}

checkAdmins();
