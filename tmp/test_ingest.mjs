/**
 * Test script to verify if the Vercel Ingestion API is working correctly.
 * Usage: node tmp/test_ingest.mjs
 */

const INGEST_URL = "https://qcmail.vercel.app/api/ingest";
const API_KEY = "quamify_secret_key_fixed"; // Must match your Vercel Environment Variable

async function testIngest() {
  console.log(`🚀 Testing Ingestion API at: ${INGEST_URL}`);
  
  const payload = {
    sender: "test-sender@example.com",
    recipient: "debug-test@qcmail.vercel.app",
    subject: "Debugging Vercel Ingestion",
    body_text: "This is a test message to verify the pipeline.",
    body_html: "<p>This is a test message to verify the pipeline.</p>",
    api_key: API_KEY
  };

  try {
    const response = await fetch(INGEST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (response.ok) {
      console.log("✅ SUCCESS: API accepted the test email.");
      console.log("Result:", result);
      console.log("\nNext Steps:");
      console.log("1. Check your inbox at https://qcmail.vercel.app/ for 'debug-test@qcmail.vercel.app'");
      console.log("2. If it's there, then the issue is in the Cloudflare Worker configuration.");
    } else {
      console.error(`❌ FAILED: API returned error [${response.status}]`);
      console.error("Error Detail:", result);
    }
  } catch (error) {
    console.error("❌ ERROR: Could not reach the API.");
    console.error(error.message);
  }
}

testIngest();
