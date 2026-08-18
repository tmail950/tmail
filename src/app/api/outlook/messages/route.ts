import { NextResponse } from 'next/server';

const GRAPH = 'https://graph.microsoft.com/v1.0';

const FOLDER_MAP: Record<string, string> = {
  inbox:   'inbox',
  sent:    'sentitems',
  drafts:  'drafts',
  junk:    'junkemail',
  trash:   'deleteditems',
  archive: 'archive',
};

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
    const { refreshToken, clientId, folder = 'inbox' } = await request.json();

    if (!refreshToken || !clientId) {
      return NextResponse.json({ error: 'refreshToken and clientId are required' }, { status: 400 });
    }

    const accessToken = await getAccessToken(refreshToken, clientId);

    const folderPath = FOLDER_MAP[folder] ?? 'inbox';
    const select = 'id,subject,from,receivedDateTime,isRead,bodyPreview,hasAttachments';
    const url = `${GRAPH}/me/mailFolders/${folderPath}/messages?$top=50&$orderby=receivedDateTime desc&$select=${select}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Graph API error ${res.status}`);
    }

    const data = await res.json();

    // Normalise to tmail Email shape
    const messages = (data.value || []).map((m: any) => ({
      id: m.id,
      subject: m.subject || '(No Subject)',
      sender: m.from?.emailAddress
        ? `${m.from.emailAddress.name || ''} <${m.from.emailAddress.address}>`.trim()
        : 'Unknown',
      recipient_address: '',          // not available in list view
      body_text: m.bodyPreview || '',
      body_html: null,
      received_at: m.receivedDateTime,
      isRead: m.isRead,
      hasAttachments: m.hasAttachments,
    }));

    return NextResponse.json({ messages });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch messages' }, { status: 500 });
  }
}
