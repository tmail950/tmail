const CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4';

export interface CloudflareZone {
  id: string;
  name: string;
  name_servers: string[];
  status: string;
}

export const cloudflare = {
  async fetch(path: string, options: RequestInit = {}) {
    const response = await fetch(`${CLOUDFLARE_API_BASE}${path}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.errors?.[0]?.message || 'Cloudflare API error');
    }
    return data.result;
  },

  async createZone(domainName: string): Promise<CloudflareZone> {
    return this.fetch('/zones', {
      method: 'POST',
      body: JSON.stringify({
        name: domainName,
        account: { id: process.env.CLOUDFLARE_ACCOUNT_ID },
        type: 'full',
      }),
    });
  },

  async getZone(zoneId: string): Promise<CloudflareZone> {
    return this.fetch(`/zones/${zoneId}`);
  },

  async deleteZone(zoneId: string) {
    return this.fetch(`/zones/${zoneId}`, {
      method: 'DELETE',
    });
  },

  async setupEmailRouting(zoneId: string, workerName: string) {
    // 1. Enable Email Routing for the zone
    await this.fetch(`/zones/${zoneId}/email/routing/enabled`, {
      method: 'POST',
    });

    // 2. Add Worker Route (Catch-all)
    // Note: Cloudflare has a specific endpoint for the catch-all rule
    return this.fetch(`/zones/${zoneId}/email/routing/rules/catch_all`, {
      method: 'PUT',
      body: JSON.stringify({
        name: 'Quamify Catch-all',
        enabled: true,
        actions: [{ type: 'worker', value: [workerName] }],
        matchers: [{ type: 'all' }],
      }),
    });
  },

  async addVerificationTXT(zoneId: string, token: string) {
    return this.fetch(`/zones/${zoneId}/dns_records`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'TXT',
        name: '@',
        content: token,
        ttl: 3600,
      }),
    });
  }
};
