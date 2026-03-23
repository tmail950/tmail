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
      method: "POST",
      body: JSON.stringify({
        type: "TXT",
        name: "@",
        content: token,
        ttl: 3600,
      }),
    });
  },

  async setupEmailDNS(zoneId: string) {
    console.log(`CLOUDFLARE: Configuring Email DNS for zone ${zoneId}...`);
    
    // 1. MX Records
    const mxRecords = [
      { type: "MX", name: "@", content: "route1.mx.cloudflare.net", priority: 10, ttl: 3600 },
      { type: "MX", name: "@", content: "route2.mx.cloudflare.net", priority: 20, ttl: 3600 },
      { type: "MX", name: "@", content: "route3.mx.cloudflare.net", priority: 30, ttl: 3600 },
    ];

    for (const record of mxRecords) {
      try {
        await this.fetch(`/zones/${zoneId}/dns_records`, {
          method: "POST",
          body: JSON.stringify(record),
        });
      } catch (e: any) {
        // Ignore if already exists
        if (!e.message?.includes("already exists")) {
          console.warn(`CLOUDFLARE: MX record creation failed: ${e.message}`);
        }
      }
    }

    // 2. SPF Record
    try {
      await this.fetch(`/zones/${zoneId}/dns_records`, {
        method: "POST",
        body: JSON.stringify({
          type: "TXT",
          name: "@",
          content: "v=spf1 include:_spf.mx.cloudflare.net ~all",
          ttl: 3600,
        }),
      });
    } catch (e: any) {
      if (!e.message?.includes("already exists")) {
        console.warn(`CLOUDFLARE: SPF record creation failed: ${e.message}`);
      }
    }

    return { success: true };
  },

  async setupGeneralDNS(zoneId: string, domainName: string) {
    console.log(`CLOUDFLARE: Configuring General DNS (A/CNAME) for zone ${zoneId}...`);
    
    const records = [
      { type: "A", name: "@", content: "76.76.21.21", ttl: 3600, proxied: true },
      { type: "CNAME", name: "www", content: "cname.quammify.fun", ttl: 3600, proxied: true },
    ];

    for (const record of records) {
      try {
        await this.fetch(`/zones/${zoneId}/dns_records`, {
          method: "POST",
          body: JSON.stringify(record),
        });
      } catch (e: any) {
        if (!e.message?.includes("already exists")) {
          console.warn(`CLOUDFLARE: DNS record creation failed (${record.type}): ${e.message}`);
        }
      }
    }
    return { success: true };
  },
};
