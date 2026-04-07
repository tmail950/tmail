export default {
  async email(message, env, ctx) {
    // 1. Configuration
    const INGEST_URL = "https://marvelous-bubblegum-183031.netlify.app/api/ingest";
    const API_KEY = "quamify_secret_key_fixed"; 

    const sender = message.from;
    const recipient = message.to;
    const subject = message.headers.get("subject") || "(No Subject)";
    
    // Read raw email
    const rawEmail = await new Response(message.raw).text();

    // 2. Simple Parsing (Extracting body snippets)
    // For a more advanced version, use a library like 'postal-mime'
    let bodyText = rawEmail;
    let bodyHtml = "";

    // If it's a multipart email, we try to grab some content
    // This is a simplified version; in production, you'd use a parser.
    if (rawEmail.includes("Content-Type: text/html")) {
      bodyHtml = rawEmail.split("Content-Type: text/html")[1]?.split("--")[0] || "";
    }

    const payload = {
      sender: sender,
      recipient: recipient, // The ingest API now cleans this automatically
      subject: subject,
      body_text: bodyText, 
      body_html: bodyHtml,
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
