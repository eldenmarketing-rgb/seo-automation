import dotenv from 'dotenv';
dotenv.config();

import * as readline from 'readline';
import * as fs from 'fs';

const CLIENT_ID = process.env.GSC_CLIENT_ID!;
const CLIENT_SECRET = process.env.GSC_CLIENT_SECRET!;
const REDIRECT_URI = 'https://garage-perpignan.fr/api/gsc-callback';
const SCOPES = 'https://www.googleapis.com/auth/webmasters.readonly';

const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.set('client_id', CLIENT_ID);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', SCOPES);
authUrl.searchParams.set('access_type', 'offline');
authUrl.searchParams.set('prompt', 'consent');

const mode = process.argv[2]; // 'url' or 'exchange'

if (mode === 'exchange') {
  // Exchange code for token
  const code = process.argv[3];
  if (!code) {
    console.error('Usage: npx tsx scripts/gsc-auth.ts exchange <CODE>');
    process.exit(1);
  }

  (async () => {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenRes.json() as Record<string, unknown>;

    if (tokens.error) {
      console.error(`\n❌ Erreur: ${tokens.error}`);
      console.error(`   ${tokens.error_description}`);
      process.exit(1);
    }

    const refreshToken = tokens.refresh_token as string;
    console.log('\n✅ Refresh token obtenu !');

    // Save to .env
    let envContent = fs.readFileSync('.env', 'utf-8');
    envContent = envContent.replace(/^GSC_REFRESH_TOKEN=.*$/m, `GSC_REFRESH_TOKEN=${refreshToken}`);
    fs.writeFileSync('.env', envContent);

    console.log('✅ Sauvegardé dans .env');
    console.log('\nRedémarre le bot : pm2 restart seo-bot --update-env');
  })();
} else {
  // Default: show URL
  console.log('\n=== Google Search Console — Autorisation ===\n');
  console.log('Ouvre ce lien :\n');
  console.log(authUrl.toString());
  console.log('\nAprès autorisation, copie le code affiché et lance :');
  console.log('npx tsx scripts/gsc-auth.ts exchange <LE_CODE>\n');
}
