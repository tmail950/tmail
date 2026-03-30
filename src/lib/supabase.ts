import { createClient as createBrowserClient } from './supabase/client';

// Singleton instance for client-side use
let instance: any = null;

export const supabase = new Proxy({} as any, {
  get: (target, prop) => {
    if (!instance) {
      instance = createBrowserClient();
    }
    return instance[prop];
  }
});
