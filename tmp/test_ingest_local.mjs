import fetch from 'node-fetch';

async function testIngest() {
  const email = "testuser@tmail.pk"; // REPLACE WITH AN ACTIVE ADDRESS FROM YOUR LOCAL SITE
  const apiKey = "quamify_secret_key_fixed";
  
  console.log(`Sending test email to ${email}...`);
  
  const response = await fetch('http://localhost:3000/api/ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: "sender@test.com",
      subject: "Test Email Presence",
      recipient: email,
      body_text: "Checking if ingestion still works after refactor.",
      body_html: "<p>Checking if ingestion still works after refactor.</p>",
      api_key: apiKey
    })
  });

  const result = await response.json();
  console.log('Result:', result);
}

testIngest();
