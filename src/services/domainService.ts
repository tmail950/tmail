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

  async listDomains(): Promise<DomainRecord[]> {
    try {
      const response = await fetch('/api/admin/domains/list', { cache: 'no-store' })
      if (!response.ok) {
        throw new Error('Failed to fetch admin domains')
      }
      return await response.json()
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

  async syncDomain(id: string) {
    const response = await fetch('/api/admin/domains/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Sync failed')
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

  async listPublicDomains(): Promise<DomainRecord[]> {
    try {
      console.log("DOMAIN-SERVICE: Fetching approved domains via server-side API (RLS Bypass)...");
      const response = await fetch('/api/domains/list', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Failed to fetch domains from API');
      }
      const data = await response.json();
      console.log("DOMAIN-SERVICE: Fetched domains successfully. Total:", data?.length || 0);
      return (data as DomainRecord[]) || [];
    } catch (err: any) {
      console.error("DOMAIN-SERVICE: Critical API error:", err);
      return [];
    }
  },

  async listUserEmails(userId: string) {
    const { data, error } = await supabase
      .from('user_emails')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },
  
  async isEmailTaken(address: string): Promise<boolean> {
    const cleanAddress = address.toLowerCase().trim();
    
    // Check user_emails
    const { count: userCount } = await supabase
      .from('user_emails')
      .select('*', { count: 'exact', head: true })
      .eq('email_address', cleanAddress);
      
    if (userCount && userCount > 0) return true;
    
    // Check guest_mailboxes
    const { count: guestCount } = await supabase
      .from('guest_mailboxes')
      .select('*', { count: 'exact', head: true })
      .eq('email_address', cleanAddress);
      
    return (guestCount && guestCount > 0) || false;
  },

  async associateEmail(userId: string, address: string, domainId?: string, password?: string) {
    const cleanAddress = address.toLowerCase().trim();
    console.log(`DOMAINS: Initiating reservation for ${cleanAddress} (User: ${userId})`);
    
    try {
      // CROSS-TABLE CHECK: Ensure not in guest_mailboxes either
      const { data: existingGuest } = await supabase
        .from('guest_mailboxes')
        .select('email_address')
        .eq('email_address', cleanAddress)
        .maybeSingle();
      
      if (existingGuest) {
        throw new Error('This address is already taken.');
      }

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database timeout during reservation.')), 8000)
      );

      const dbPromise = supabase
        .from('user_emails')
        .insert({ 
          user_id: userId, 
          email_address: cleanAddress,
          password: password
        })
        .select();

      const { data, error } = await Promise.race([dbPromise, timeoutPromise]) as any;
      
      if (error) {
        console.error(`DOMAINS: Reservation DB error for ${cleanAddress}:`, error.message);
        if (error.code === '23505') {
          throw new Error('This address is already taken.');
        }
        throw new Error(`Database Error: ${error.message}`);
      }
      
      const record = Array.isArray(data) ? data[0] : data;
      if (!record) {
        console.error(`DOMAINS: No data returned for ${cleanAddress}`);
        throw new Error('Failed to confirm reservation.');
      }

      console.log(`DOMAINS: Successfully reserved ${cleanAddress}`);
      return record;
    } catch (err: any) {
      console.error(`DOMAINS: Critical failure during reservation of ${cleanAddress}:`, err.message);
      throw err;
    }
  },

  async guestAssociateEmail(address: string, password: string) {
    const cleanAddress = address.toLowerCase().trim();

    // CROSS-TABLE CHECK: Ensure not in user_emails either
    const { data: existingUser } = await supabase
      .from('user_emails')
      .select('email_address')
      .eq('email_address', cleanAddress)
      .maybeSingle();
    
    if (existingUser) {
      throw new Error('This address is already taken.');
    }

    const { data, error } = await supabase
      .from('guest_mailboxes')
      .insert({ 
        email_address: cleanAddress, 
        password_hash: password // In production, hash this!
      })
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') throw new Error('This address is already taken.');
      if (error.message?.includes('not found')) {
        throw new Error('Database table missing. Please run the SQL migration in backend/guest_mailboxes.sql');
      }
      throw error;
    }
    return data;
  },

  async verifyGuestMailbox(address: string, password: string) {
    const cleanAddress = address.toLowerCase().trim();
    const { data, error } = await supabase
      .from('guest_mailboxes')
      .select('*')
      .eq('email_address', cleanAddress)
      .eq('password_hash', password)
      .single();
    
    if (error || !data) {
      throw new Error('Invalid address or password.');
    }
    return data;
  },

  async deleteUserEmail(userId: string, address: string) {
    const { error } = await supabase
      .from('user_emails')
      .delete()
      .eq('user_id', userId)
      .eq('email_address', address.toLowerCase().trim());
    
    if (error) throw error;
  },

  async deleteGuestEmail(address: string) {
    const { error } = await supabase
      .from('guest_mailboxes')
      .delete()
      .eq('email_address', address.toLowerCase().trim());
    
    if (error) throw error;
  },

  async deletePlatformDomain(id: string) {
    // Legacy method for cleanup
    return;
  }
}
