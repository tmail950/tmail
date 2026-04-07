import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// We use service role key for ingestion to bypass RLS since the worker isn't a "user"
export async function POST(request: Request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
  );
  try {
    const body = await request.json();
    const { sender, subject, recipient, body_text, body_html, api_key } = body;

    // Secure the endpoint with an API Key
    if (api_key !== process.env.INGEST_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Clean recipient address (handle "Name <email@domain.com>")
    let cleanRecipient = recipient.toLowerCase().trim();
    const emailMatch = cleanRecipient.match(/<(.+@.+)>/);
    if (emailMatch) {
      cleanRecipient = emailMatch[1].toLowerCase().trim();
    }

    console.log(`INGEST: Receiving email for [${cleanRecipient}] from [${sender}]`);

    const { error: insertError } = await supabaseAdmin
      .from('emails')
      .insert({
        sender,
        subject: subject || '(No Subject)',
        recipient_address: cleanRecipient,
        body_text: body_text || '',
        body_html: body_html || '',
        received_at: new Date().toISOString()
      });

    if (insertError) {
      console.error(`INGEST: Database insert error: ${insertError.message}`);
      throw insertError;
    }

    console.log(`INGEST: Successfully saved email to database for [${cleanRecipient}]`);
    return NextResponse.json({ success: true, message: 'Email ingested successfully' });
  } catch (error: any) {
    console.error(`INGEST: API Error: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
