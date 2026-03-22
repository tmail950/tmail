import { supabase } from '@/lib/supabase'

export interface DomainRecord {
  id: string
  user_id: string
  domain_name: string
  is_verified: boolean
  verification_token: string
  created_at: string
  cloudflare_zone_id?: string
  cloudflare_nameservers?: string[]
  cloudflare_status?: string
  admin_approval: 'pending' | 'approved' | 'rejected'
}

export const domainService = {
  async addDomain(domainName: string) {
    const response = await fetch('/api/domains/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domainName }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to setup domain')
    }

    return await response.json()
  },

  async getSettings() {
    try {
      const { data, error } = await supabase.from('site_settings').select('*')
      if (error) throw error
      const settings: Record<string, string> = {}
      data?.forEach((s: any) => settings[s.key] = s.value)
      return settings
    } catch (e) {
      console.warn("Settings fetch failed (table might be missing):", e)
      return {}
    }
  },

  async updateSetting(key: string, value: string) {
    const { error } = await supabase
      .from('site_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() })
    if (error) throw error
  },

  async addAdmin(email: string) {
    const { error } = await supabase.from('admins').upsert({ email })
    if (error) throw error
  },

  async removeAdmin(email: string) {
    const { error } = await supabase.from('admins').delete().eq('email', email)
    if (error) throw error
  },

  async listAdmins() {
    try {
      const { data } = await supabase.from('admins').select('email')
      return data?.map((a: any) => a.email) || []
    } catch (e) {
      return []
    }
  },

  async getStats() {
    try {
      // Get total domains count
      const { count: domainsCount } = await supabase
        .from('user_domains')
        .select('*', { count: 'exact', head: true })

      // Get total verified domains
      const { count: verifiedCount } = await supabase
        .from('user_domains')
        .select('*', { count: 'exact', head: true })
        .eq('is_verified', true)

      // Get total emails processed
      const { count: emailsCount } = await supabase
        .from('emails')
        .select('*', { count: 'exact', head: true })

      return {
        totalDomains: domainsCount || 0,
        activeDomains: verifiedCount || 0,
        totalEmails: emailsCount || 0
      }
    } catch (e) {
      return { totalDomains: 0, activeDomains: 0, totalEmails: 0 }
    }
  },

  async listDomains() {
    try {
      const { data, error } = await supabase
        .from('user_domains')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data as DomainRecord[]) || []
    } catch (e) {
      return []
    }
  },

  async deleteDomain(id: string) {
    const { error, count } = await supabase
      .from('user_domains')
      .delete({ count: 'exact' })
      .eq('id', id)

    if (error) throw error
    if (count === 0) throw new Error('Deletion failed: Domain not found or permission denied.')
  },

  async getCustomDomains() {
    const { data, error } = await supabase.from('custom_domains').select('*')
    if (error) throw error
    return data
  },

  async addCustomDomain(domainName: string) {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) throw new Error('Not authenticated')
    
    try {
      const { data, error } = await supabase
        .from('custom_domains')
        .upsert({ 
          domain_name: domainName.toLowerCase().trim(), 
          user_id: user.id 
        })
        .select()
        .single()
      if (error) throw error
      return data
    } catch (e) {
      console.error("Failed to add custom domain:", e)
      throw e
    }
  },

  async verifyCustomDomain(domainName: string) {
    const response = await fetch('/api/domains/custom-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: domainName }),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'DNS Verification failed')
    }
    return await response.json()
  },

  async verifyDomain(id: string) {
    const response = await fetch('/api/domains/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Verification failed')
    }

    return await response.json()
  },

  async approveDomain(id: string) {
    const response = await fetch('/api/admin/domains/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to approve domain')
    }

    return await response.json()
  },

  async rejectDomain(id: string) {
    const response = await fetch('/api/admin/domains/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to reject domain')
    }

    return await response.json()
  },

  async listPendingDomains() {
    // We can still use supabase direct fetch if RLS allows admins to see all
    const { data, error } = await supabase
      .from('user_domains')
      .select('*, user_id') 
      .eq('admin_approval', 'pending')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data as DomainRecord[]
  },

  async listPublicDomains(retries = 3): Promise<DomainRecord[]> {
    try {
      console.log(`DOMAIN-SERVICE: Fetching approved domains (Attempt ${4 - retries})...`);
      const { data, error } = await supabase
        .from('user_domains')
        .select('*')
        .eq('admin_approval', 'approved')
        .eq('is_verified', true)
        .order('created_at', { ascending: false })
      
      if (error) {
        if (error.name === 'AbortError' && retries > 0) {
          console.warn("DOMAIN-SERVICE: Lock conflict (AbortError). Retrying in 500ms...");
          await new Promise(r => setTimeout(r, 500));
          return this.listPublicDomains(retries - 1);
        }
        console.error("DOMAIN-SERVICE: Fetch error:", error);
        return [];
      }
      console.log("DOMAIN-SERVICE: Domains found:", data?.length || 0);
      return (data as DomainRecord[]) || [];
    } catch (err: any) {
      if (err.name === 'AbortError' && retries > 0) {
        console.warn("DOMAIN-SERVICE: Catching AbortError. Retrying...");
        await new Promise(r => setTimeout(r, 500));
        return this.listPublicDomains(retries - 1);
      }
      console.error("DOMAIN-SERVICE: Critical error:", err);
      return [];
    }
  },

  async deletePlatformDomain(id: string) {
    // Legacy method for cleanup
    return;
  }
}
