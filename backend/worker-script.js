export default {
  async email(message, env, ctx) {
    // 1. Configuration
    const INGEST_URL = "https://qcmail.vercel.app/api/ingest";
    const API_KEY = "quamify_secret_key_fixed"; 

    const sender = message.from;
    const recipient = message.to;
    const subject = message.headers.get("subject") || "(No Subject)";
    
    // Read raw email
    const rawEmail = await new Response(message.raw).text();

    /**
     * Robust extraction of MIME parts from raw email.
     * Skips headers within the part and extracts actual content.
     */
    function extractPart(raw, type) {
      // Split on the Content-Type header for this specific type (case insensitive)
      const regex = new RegExp(`Content-Type: ${type}`, 'i');
      const parts = raw.split(regex);
      if (parts.length < 2) return "";
      
      // parts[1] starts after 'Content-Type: text/html'
      // It likely looks like: '; charset="UTF-8"\r\n\r\nActualBody\r\n--boundary--'
      const content = parts[1];
      
      // Find the start of the body (double newline after part headers)
      const bodyStartSearch = content.match(/\r?\n\r?\n/);
      if (!bodyStartSearch) return "";
      
      const bodyStartIndex = bodyStartSearch.index + bodyStartSearch[0].length;
      let body = content.slice(bodyStartIndex);
      
      // Split by the next boundary marker (starts with -- followed by boundary string)
      // Usually the next boundary starts with \r\n--
      const boundaryIndex = body.search(/\r?\n--/);
      if (boundaryIndex !== -1) {
        body = body.slice(0, boundaryIndex);
      }
      
      return body.trim();
    }

    let bodyText = extractPart(rawEmail, "text/plain");
    let bodyHtml = extractPart(rawEmail, "text/html");

    // Fallback: If no parts found, it might NOT be a multi-part email (plain or html only)
    if (!bodyText && !bodyHtml) {
      // Find the first double newline in the entire email
      const parts = rawEmail.split(/\r?\n\r?\n/);
      const possibleBody = parts.length > 1 ? parts.slice(1).join("\n\n").trim() : rawEmail;
      
      if (rawEmail.toLowerCase().includes("content-type: text/html")) {
        bodyHtml = possibleBody;
      } else {
        bodyText = possibleBody;
      }
    }

    const payload = {
      sender: sender,
      recipient: recipient,
      subject: subject,
      body_text: bodyText || "", 
      body_html: bodyHtml || "",
      api_key: API_KEY
    };

    // 3. Forward to Netlify
    const response = await fetch(INGEST_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`INGEST Error [${response.status}]: ${errorText}`);
    } else {
      console.log(`Successfully forwarded email from [${sender}] to [${recipient}]`);
    }
  }
}
