// Use native fetch (Node 18+)

const INGEST_URL = "http://localhost:3000/api/ingest"; // Test locally first
const INGEST_API_KEY = "quamify_secret_key_fixed";

async function testIngest() {
  const payload = {
    sender: "tester@example.com",
    recipient: "New User <test@tmail.pk>",
    subject: "Test Ingestion",
    body_text: "This is a test email body.",
    body_html: "<b>This is a test email body.</b>",
    api_key: INGEST_API_KEY
  };

  try {
    const response = await fetch(INGEST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log("Response Status:", response.status);
    console.log("Response Body:", data);

    if (response.ok) {
      console.log("✅ SUCCESS: Ingestion API is working correctly.");
    } else {
      console.log("❌ FAILURE: Ingestion API returned an error.");
    }
  } catch (err) {
    console.error("❌ ERROR: Connection failed. Make sure 'npm run dev' is running.");
  }
}

testIngest();
