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
      const errorMsg = data.errors?.[0]?.message || 'Cloudflare API error';
      console.error(`CLOUDFLARE API FAILURE [${path}]:`, errorMsg, data.errors);
      throw new Error(errorMsg);
    }
    return data.result;
  },

  async listZones(name?: string): Promise<CloudflareZone[]> {
    const query = name ? `?name=${name}` : '';
    return this.fetch(`/zones${query}`);
  },

  async createZone(domainName: string): Promise<CloudflareZone> {
    try {
      return await this.fetch('/zones', {
        method: 'POST',
        body: JSON.stringify({
          name: domainName,
          account: { id: process.env.CLOUDFLARE_ACCOUNT_ID },
          type: 'full',
        }),
      });
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        const zones = await this.listZones(domainName);
        if (zones.length > 0) return zones[0];
      }
      throw e;
    }
  },

  async findZoneByName(domainName: string): Promise<CloudflareZone | null> {
    const zones = await this.listZones(domainName);
    return zones.length > 0 ? zones[0] : null;
  },

  async getZone(zoneId: string): Promise<CloudflareZone> {
    return this.fetch(`/zones/${zoneId}`);
  },

  async deleteZone(zoneId: string) {
    return this.fetch(`/zones/${zoneId}`, {
      method: 'DELETE',
    });
  },

  async getRoutingSettings(zoneId: string) {
    return this.fetch(`/zones/${zoneId}/email/routing/settings`);
  },

  async setupEmailRouting(zoneId: string, workerName: string) {
    console.log(`CLOUDFLARE: [${zoneId}] Initiating Email Routing automation...`);
    
    // 1. Ensure Email Routing is ENABLED
    let isAlreadyEnabled = false;
    try {
      const settings = await this.getRoutingSettings(zoneId);
      isAlreadyEnabled = settings.enabled;
      console.log(`CLOUDFLARE: [${zoneId}] Current routing status: ${settings.status}, Enabled: ${settings.enabled}`);
      
      if (!isAlreadyEnabled) {
        console.log(`CLOUDFLARE: [${zoneId}] Enabling Email Routing service...`);
        // Attempt dedicated enable endpoint first
        try {
          await this.fetch(`/zones/${zoneId}/email/routing/enabled`, { method: 'POST' });
        } catch (postError: any) {
          console.log(`CLOUDFLARE: [${zoneId}] POST enabled failed, trying PATCH settings: ${postError.message}`);
          await this.fetch(`/zones/${zoneId}/email/routing/settings`, {
            method: 'PATCH',
            body: JSON.stringify({ enabled: true }),
          });
        }
      }
    } catch (err: any) {
      console.warn(`CLOUDFLARE: [${zoneId}] Routing Enablement Warning (might be fine): ${err.message}`);
    }

    // 2. Configure Catch-all to Worker
    console.log(`CLOUDFLARE: [${zoneId}] Applying Catch-all rule for worker [${workerName}]...`);
    
    try {
      // Use PUT to ensure the rule is either created or completely overwritten to our spec
      const catchAllRes = await this.fetch(`/zones/${zoneId}/email/routing/rules/catch_all`, {
        method: 'PUT',
        body: JSON.stringify({
          name: 'Quamify Automated Catch-all',
          enabled: true,
          actions: [{ type: 'worker', value: [workerName] }],
          matchers: [{ type: 'all' }],
        }),
      });
      console.log(`CLOUDFLARE: [${zoneId}] Catch-all rule synchronized successfully.`);
      return catchAllRes;
    } catch (ruleError: any) {
      console.error(`CLOUDFLARE: [${zoneId}] FAILED to configure catch-all rule:`, ruleError.message);
      throw new Error(`Cloudflare Catch-all configuration failed: ${ruleError.message}`);
    }
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
