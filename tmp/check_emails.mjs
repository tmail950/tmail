import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ezxxrheargftbumrfzst.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6eHhyaGVhcmdmdGJ1bXJmenN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzI2NzEzMywiZXhwIjoyMDg4ODQzMTMzfQ.BybrZ1hbYMWoNLrQyPI9y-UUrPxCYgVZ81UHpM32Gsw";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkEmails() {
  const { data, error } = await supabase
    .from('emails')
    .select('id, recipient_address, sender, subject, received_at')
    .order('received_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Latest emails in DB:", data);
  }
}

checkEmails();
