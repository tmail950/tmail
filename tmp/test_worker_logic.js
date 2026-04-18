const rawEmail = `From: test@test.com
To: test@test.com
Subject: Test Email
Content-Type: text/plain; charset="UTF-8"

This is a test body
--boundary123--`;

function extractPart(raw, type) {
  const regex = new RegExp(`Content-Type: ${type}`, 'i');
  const parts = raw.split(regex);
  if (parts.length < 2) return "";
  
  const content = parts[1];
  const bodyStartSearch = content.match(/\r?\n\r?\n/);
  if (!bodyStartSearch) return "";
  
  const bodyStartIndex = bodyStartSearch.index + bodyStartSearch[0].length;
  let body = content.slice(bodyStartIndex);
  
  const boundaryIndex = body.search(/\r?\n--/);
  if (boundaryIndex !== -1) {
    body = body.slice(0, boundaryIndex);
  }
  
  return body.trim();
}

let plain = extractPart(rawEmail, "text/plain");
console.log("Extracted Plain:", plain);

