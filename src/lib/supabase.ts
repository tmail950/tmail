import { createClient } from './supabase/client';

// Lazy initialization using a Proxy to prevent top-level createClient() 
// during build time when process.env is not yet available.
let instance: any = null;

export const supabase = {
  get auth() { return getInstance().auth },
  from: (table: string) => getInstance().from(table),
  rpc: (name: string, args?: any) => getInstance().rpc(name, args),
  get rest() { return getInstance().rest }
};

function getInstance() {
  if (!instance) {
    if (typeof window !== 'undefined') {
      console.log("SUPABASE: Initializing singleton browser client...");
    }
    instance = createClient();
  }
  return instance;
}
