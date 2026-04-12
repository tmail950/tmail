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
      // 1. Total mailboxes (User + Guest)
      const [{ count: userCount }, { count: guestCount }] = await Promise.all([
        supabase.from('user_emails').select('*', { count: 'exact', head: true }),
        supabase.from('guest_mailboxes').select('*', { count: 'exact', head: true })
      ]);

      // 2. Total messages received
      const { count: messagesCount } = await supabase
        .from('emails')
        .select('*', { count: 'exact', head: true });

      // 3. Active domains
      const { count: verifiedCount } = await supabase
        .from('user_domains')
        .select('*', { count: 'exact', head: true })
        .eq('is_verified', true);

      return {
        totalMailboxes: (userCount || 0) + (guestCount || 0),
        activeDomains: verifiedCount || 0,
        totalMessages: messagesCount || 0
      }
    } catch (e) {
      return { totalMailboxes: 0, activeDomains: 0, totalMessages: 0 }
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
    const res = await fetch('/api/admin/domains/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Deletion failed.')
    return data
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
      .eq('is_deleted_by_user', false)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Asynchronously touch the last_used_at for all listed emails
    if (data && data.length > 0) {
      const addresses = data.map((e: any) => e.email_address);
      supabase.from('user_emails').update({ last_used_at: new Date().toISOString() }).in('email_address', addresses).then();
    }
    
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
      // 1. CHECK IF USER ALREADY OWNS THIS EMAIL
      const { data: existingOwned } = await supabase
        .from('user_emails')
        .select('*')
        .eq('email_address', cleanAddress)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (existingOwned) {
        console.log(`DOMAINS: User already owns ${cleanAddress}, returning existing record.`);
        return existingOwned;
      }

      // 2. CROSS-TABLE CHECK: Ensure not in guest_mailboxes (unless we migrate later)
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
          password: password,
          last_used_at: new Date().toISOString(),
          is_used: true
        })
        .select();

      const { data, error } = await Promise.race([dbPromise, timeoutPromise]) as any;
      
      if (error) {
        if (error.code === '23505') {
          // Double check if somehow it was inserted since our last check (race condition)
          const { data: recheck } = await supabase.from('user_emails').select('*').eq('email_address', cleanAddress).eq('user_id', userId).maybeSingle();
          if (recheck) return recheck;
          throw new Error('This address is already taken.');
        }
        console.error(`DOMAINS: Reservation DB error for ${cleanAddress}:`, error.message);
        throw new Error(`Database Error: ${error.message}`);
      }
      
      const record = Array.isArray(data) ? data[0] : data;
      if (!record) throw new Error('Failed to confirm reservation.');

      console.log(`DOMAINS: Successfully reserved ${cleanAddress}`);
      return record;
    } catch (err: any) {
      // Log as a warning instead of a red console error to prevent UI overlay
      if (err.message.includes('already taken')) {
        console.warn(`DOMAINS: Reservation conflict for ${cleanAddress}: ${err.message}`);
      } else {
        console.error(`DOMAINS: Critical failure during reservation of ${cleanAddress}:`, err.message);
      }
      throw err;
    }
  },

  async guestAssociateEmail(address: string, password: string): Promise<any> {
    const cleanAddress = address.toLowerCase().trim();

    // CROSS-TABLE CHECK: Ensure not in user_emails
    const { data: existingUser } = await supabase
      .from('user_emails')
      .select('email_address')
      .eq('email_address', cleanAddress)
      .maybeSingle();
    
    if (existingUser) {
      throw new Error('This address is already taken by a registered user.');
    }

    // GUEST-IDENTITY CHECK: If exists, verify password
    const { data: existingGuest, error: fetchError } = await supabase
      .from('guest_mailboxes')
      .select('*')
      .eq('email_address', cleanAddress)
      .maybeSingle();

    if (existingGuest) {
      if (existingGuest.password_hash === password) {
        // Correct password - allow re-access/reactivation
        if (existingGuest.is_deleted_by_user) {
          await supabase.from('guest_mailboxes')
            .update({ is_deleted_by_user: false, last_used_at: new Date().toISOString() })
            .eq('email_address', cleanAddress);
        }
        return existingGuest;
      } else {
        throw new Error('This address is already managed by a different password.');
      }
    }

    const { data, error } = await supabase
      .from('guest_mailboxes')
      .insert({ 
        email_address: cleanAddress, 
        password_hash: password, // In production, hash this!
        last_used_at: new Date().toISOString(),
        is_used: true // Mark as used for strict allotment
      })
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') {
        // Race condition check
        return this.guestAssociateEmail(address, password);
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
      .maybeSingle(); // Don't filter by is_deleted_by_user here to allow reactivation
    
    if (error || !data) {
      throw new Error('Invalid address or password.');
    }

    // Reactivate and touch last_used_at for guest
    supabase.from('guest_mailboxes')
      .update({ 
        is_deleted_by_user: false, 
        last_used_at: new Date().toISOString() 
      })
      .eq('email_address', cleanAddress)
      .then();
    
    return data;
  },

  async deleteUserEmail(userId: string, address: string) {
    const { error } = await supabase
      .from('user_emails')
      .update({ is_deleted_by_user: true })
      .eq('user_id', userId)
      .eq('email_address', address.toLowerCase().trim());
    
    if (error) throw error;
  },

  async deleteGuestEmail(address: string) {
    const { error } = await supabase
      .from('guest_mailboxes')
      .update({ is_deleted_by_user: true })
      .eq('email_address', address.toLowerCase().trim());
    
    if (error) throw error;
  },

  async deletePlatformDomain(id: string) {
    // Legacy method for cleanup
    return;
  },

  async migrateGuestEmails(userId: string, guestHistory: any[]): Promise<string[]> {
    if (!guestHistory || guestHistory.length === 0) return [];
    console.log(`DOMAINS: Migrating ${guestHistory.length} guest emails to user ${userId}`);
    
    const migratedAddresses: string[] = [];
    for (const item of guestHistory) {
      const addr = (typeof item === 'string' ? item : item.email_address)?.toLowerCase()?.trim();
      if (!addr) continue;

      try {
        const pass = item.password || item.password_hash;
        
        // Use associateEmail which now handles existing owned emails gracefully
        await this.associateEmail(userId, addr, undefined, pass);
        migratedAddresses.push(addr);
        
        // Optional: Mark guest mailbox as migrated/deleted
        await this.deleteGuestEmail(addr);
      } catch (err) {
        console.warn(`DOMAINS: Migration failed for ${addr}:`, err);
      }
    }
    return migratedAddresses;
  }
}
