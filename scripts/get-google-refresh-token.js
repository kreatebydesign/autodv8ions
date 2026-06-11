/**
 * Temporary helper — generate a Google OAuth refresh token for Calendar.
 *
 * Usage:
 *   node scripts/get-google-refresh-token.js
 *
 * Prerequisites:
 *   - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local
 *   - Redirect URI authorized in Google Cloud Console:
 *     http://localhost:3001/api/auth/google/callback
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { google } = require("googleapis");

const REDIRECT_URI = "http://localhost:3001/api/auth/google/callback";
const SCOPE = "https://www.googleapis.com/auth/calendar";

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

  console.log("\nOpen this URL in your browser and authorize Calendar access:\n");
  console.log(authUrl);
  console.log(
    "\nAfter approving, Google redirects to localhost:3001 with ?code=...\n",
  );
  console.log(
    "Copy the `code` query param from the redirect URL (or the full URL).\n",
  );

  const input = await ask("Paste the authorization code (or full redirect URL): ");

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

  console.log("\n--- Tokens ---\n");
  if (tokens.refresh_token) {
    console.log("GOOGLE_REFRESH_TOKEN=" + tokens.refresh_token);
  } else {
    console.warn(
      "No refresh_token returned. Revoke app access at https://myaccount.google.com/permissions",
    );
    console.warn("Then run this script again with prompt=consent.");
    if (tokens.access_token) {
      console.log("\nAccess token (short-lived):", tokens.access_token);
    }
  }

  if (tokens.scope) console.log("\nGranted scope:", tokens.scope);
  if (tokens.expiry_date) {
    console.log(
      "Access token expires:",
      new Date(tokens.expiry_date).toISOString(),
    );
  }

  console.log(
    "\nAdd GOOGLE_REFRESH_TOKEN to .env.local and Vercel when ready.\n",
  );
}

main().catch((err) => {
  console.error("\nError:", err.message || err);
  process.exit(1);
});
