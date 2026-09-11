import jwt from 'jsonwebtoken';
import fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

function generateEnableBankingJWT() {
  const privateKey = process.env.ENABLEBANKING_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const keyId = process.env.ENABLEBANKING_KEY_ID;
  if (!privateKey || !keyId) throw new Error("Missing env variables");
  const payload = {
    iss: 'enablebanking.com',
    aud: 'api.enablebanking.com',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  };
  return jwt.sign(payload, privateKey, { algorithm: 'RS256', keyid: keyId });
}

async function run() {
  try {
     const token = generateEnableBankingJWT();
     // 1. start auth mapped to sandbox
     const body = {
        access: {
          valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          balances: true,
          transactions: true
        },
        aspsp: { name: "Enable Banking Sandbox", country: "FI" },
        state: "test-123",
        redirect_url: "https://example.com/callback"
     };
     const startRes = await fetch('https://api.enablebanking.com/auth', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
       body: JSON.stringify(body)
     });
     const authData = await startRes.json();
     console.log("Auth start:", authData);
     // Since it's sandbox, it might give us an authorization URL we can easily hit or maybe we need a real UI...
  } catch(e) {
     console.error(e);
  }
}
run();
