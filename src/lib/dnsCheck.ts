/**
 * Performs a fast, direct DNS lookup for Cloudflare nameservers.
 * This should be used strictly on the server side.
 */
export async function fastNSCheck(domain: string): Promise<boolean> {
  const cleanDomain = domain.toLowerCase().trim();
  
  try {
    // Environment guard to prevent client-side tracing
    if (typeof window !== 'undefined') {
      throw new Error('fastNSCheck called from client');
    }

    // Dynamic import to prevent the Node.js 'dns' module from being traced into the client bundle
    const dns = await import('dns/promises');
    
    // Perform a nameserver lookup
    const nsRecords = await dns.resolveNs(cleanDomain);
    
    // Check if Cloudflare's standard nameservers are present
    const cloudflareNS = [
      'paige.ns.cloudflare.com',
      'roan.ns.cloudflare.com'
    ].map(ns => ns.toLowerCase());

    const isCloudflare = nsRecords.some(ns => 
      cloudflareNS.includes(ns.toLowerCase())
    );

    return isCloudflare;
  } catch (err) {
    // Record not found or other DNS issue - not necessarily a failure, just not verified yet
    return false;
  }
}
