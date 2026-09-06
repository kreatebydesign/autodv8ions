/**
 * Generate a Google OAuth refresh token for Gmail (isolated from Calendar).
 *
 * Usage:
 *   node scripts/get-google-gmail-refresh-token.js
 *
 * Prerequisites:
 *   - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local
 *   - Gmail API enabled in the same Google Cloud project as the OAuth client
 *   - Redirect URI authorized in Google Cloud Console:
 *     http://localhost:3001/api/auth/google/callback
 *   - Authorize while signed in as sales@autodv8ions.com
 *
 * DO NOT replace GOOGLE_REFRESH_TOKEN (Calendar / legacy Drive).
 * This script only produces GOOGLE_GMAIL_REFRESH_TOKEN.
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { google } = require("googleapis");

const REDIRECT_URI = "http://localhost:3001/api/auth/google/callback";
const SCOPE = "https://www.googleapis.com/auth/gmail.modify";

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("Missing .env.local at project root.");
    process.exit(1);
  }

  const env = {};
  const contents = fs.readFileSync(envPath, "utf8");

  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }

  return env;
}

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const env = loadEnvLocal();
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error(
      "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env.local",
    );
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    REDIRECT_URI,
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [SCOPE],
  });

  console.log("\n=== Gmail OAuth (isolated from Calendar) ===\n");
  console.log(
    "1. Sign in to Google as sales@autodv8ions.com (not a personal account).",
  );
  console.log("2. Open this URL and approve Gmail access:\n");
  console.log(authUrl);
  console.log(
    "\n3. After approving, Google redirects to localhost:3001 with ?code=...",
  );
  console.log(
    "   (The page may fail to load — that is expected. Copy the URL from the address bar.)\n",
  );
  console.log(
    "4. Paste either the authorization code or the full redirect URL below.\n",
  );
  console.log(
    "DO NOT replace GOOGLE_REFRESH_TOKEN. Add GOOGLE_GMAIL_REFRESH_TOKEN instead.\n",
  );

  const input = await ask(
    "Paste the authorization code (or full redirect URL): ",
  );

  let code = input;
  if (input.includes("code=")) {
    try {
      const url = new URL(input);
      code = url.searchParams.get("code") || input;
    } catch {
      const match = input.match(/[?&]code=([^&]+)/);
      if (match) code = decodeURIComponent(match[1]);
    }
  }

  if (!code) {
    console.error("No authorization code provided.");
    process.exit(1);
  }

  const { tokens } = await oauth2Client.getToken(code);

  if (tokens.refresh_token) {
    console.log("\nGOOGLE_GMAIL_REFRESH_TOKEN=" + tokens.refresh_token);
    console.log(
      "\nAdd that line to .env.local and Vercel. Leave GOOGLE_REFRESH_TOKEN unchanged.\n",
    );
  } else {
    console.error(
      "\nNo refresh_token returned. Revoke this app for sales@autodv8ions.com at",
    );
    console.error(
      "https://myaccount.google.com/permissions then run this script again.",
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\nError:", err.message || err);
  process.exit(1);
});
