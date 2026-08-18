import { NextResponse } from 'next/server';

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
    const desc: string = data.error_description || data.error || 'Token refresh failed';
    // Surface a clean message
    const clean = desc.split('\r\n')[0].split('Trace ID')[0].trim();
    throw new Error(clean);
  }
  return data.access_token;
}

export async function POST(request: Request) {
  try {
    const { combo } = await request.json();
    if (!combo || typeof combo !== 'string') {
      return NextResponse.json({ error: 'combo is required' }, { status: 400 });
    }

    // Parse email|password|refresh_token|client_id
    // refresh_token may itself contain "|" characters — last segment is always client_id
    const flat = combo.replace(/\r?\n/g, '').trim();
    const parts = flat.split('|').map((p) => p.trim());
    if (parts.length < 4) {
      return NextResponse.json({ error: 'Invalid format. Expected: email|password|refresh_token|client_id' }, { status: 400 });
    }

    const email = parts[0];
    const clientId = parts[parts.length - 1];
    const refreshToken = parts.slice(2, -1).join('|');

    // Validate by exchanging the refresh token for an access token
    await getAccessToken(refreshToken, clientId);

    return NextResponse.json({ ok: true, email, clientId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Connection failed' }, { status: 400 });
  }
}
