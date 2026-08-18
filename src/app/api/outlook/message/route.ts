import { NextResponse } from 'next/server';

const GRAPH = 'https://graph.microsoft.com/v1.0';

async function getAccessToken(refreshToken: string, clientId: string): Promise<string> {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    refresh_token: refreshToken,
    scope: 'https://graph.microsoft.com/Mail.Read offline_access',
  });

  const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description?.split('\r\n')[0] || 'Token refresh failed');
  }
  return data.access_token;
}

export async function POST(request: Request) {
  try {
    const { refreshToken, clientId, messageId } = await request.json();

    if (!refreshToken || !clientId || !messageId) {
      return NextResponse.json({ error: 'refreshToken, clientId and messageId are required' }, { status: 400 });
    }

    const accessToken = await getAccessToken(refreshToken, clientId);

    const select = 'id,subject,from,toRecipients,ccRecipients,receivedDateTime,isRead,body,hasAttachments';
    const url = `${GRAPH}/me/messages/${encodeURIComponent(messageId)}?$select=${select}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Graph API error ${res.status}`);
    }

    const m = await res.json();

    const message = {
      id: m.id,
      subject: m.subject || '(No Subject)',
      sender: m.from?.emailAddress
        ? `${m.from.emailAddress.name || ''} <${m.from.emailAddress.address}>`.trim()
        : 'Unknown',
      recipient_address: (m.toRecipients || [])
        .map((r: any) => r.emailAddress?.address)
        .filter(Boolean)
        .join(', '),
      body_text: m.body?.contentType === 'text' ? m.body.content : null,
      body_html: m.body?.contentType === 'html'  ? m.body.content : null,
      received_at: m.receivedDateTime,
      isRead: m.isRead,
      hasAttachments: m.hasAttachments,
    };

    return NextResponse.json({ message });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch message' }, { status: 500 });
  }
}
