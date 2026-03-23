import { createClient } from './supabase/client';

// Lazy initialization using a Proxy to prevent top-level createClient() 
// during build time when process.env is not yet available.
let instance: any = null;

export const supabase = new Proxy({} as any, {
  get: (target, prop) => {
    if (!instance) {
      if (typeof window !== 'undefined') {
        console.log("SUPABASE: Initializing singleton browser client...");
      }
      instance = createClient();
    }
    return instance[prop];
  }
});
