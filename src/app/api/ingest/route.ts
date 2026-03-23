import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// We use service role key for ingestion to bypass RLS since the worker isn't a "user"
export async function POST(request: Request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
  );
  try {
    const { sender, subject, recipient, body_text, body_html, api_key } = await request.json();
    console.log('--- INCOMING EMAIL ---');
    console.log('Sender:', sender);
    console.log('Recipient:', recipient);
    console.log('Subject:', subject);
    console.log('----------------------');

    // Secure the endpoint with an API Key
    if (api_key !== process.env.INGEST_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!sender || !recipient) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('emails')
      .insert({
        sender,
        subject: subject || '(No Subject)',
        recipient_address: recipient.toLowerCase().trim(),
        body_text,
        body_html,
        received_at: new Date().toISOString()
      });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, message: 'Email ingested successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
