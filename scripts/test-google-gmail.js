/**
 * Verify Gmail OAuth connection (profile only — no message content).
 *
 * Usage:
 *   node scripts/test-google-gmail.js
 *
 * Requires in .env.local:
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   GOOGLE_GMAIL_REFRESH_TOKEN
 * Optional:
 *   GOOGLE_GMAIL_USER=sales@autodv8ions.com
 */

const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

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

async function main() {
  const env = loadEnvLocal();
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  const refreshToken = env.GOOGLE_GMAIL_REFRESH_TOKEN;
  const userId = (env.GOOGLE_GMAIL_USER || "me").trim() || "me";

  if (!clientId || !clientSecret || !refreshToken) {
    console.error(
      "Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_GMAIL_REFRESH_TOKEN in .env.local",
    );
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  const { data } = await gmail.users.getProfile({ userId });

  console.log("Gmail connection OK");
  console.log("emailAddress:", data.emailAddress || "(none)");
  console.log("messagesTotal:", data.messagesTotal ?? 0);
  console.log("threadsTotal:", data.threadsTotal ?? 0);
}

main().catch((err) => {
  console.error("Gmail connection failed:", err.message || err);
  process.exit(1);
});
