import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const SERVICE_ACCOUNT_PATH = process.env.GSC_SERVICE_ACCOUNT_PATH || './config/gsc-service-account.json';

let searchConsoleClient: ReturnType<typeof google.searchconsole> | null = null;

export function getAuth() {
  const keyFilePath = path.resolve(SERVICE_ACCOUNT_PATH);
  return new GoogleAuth({
    keyFile: keyFilePath,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });
}

export function getSearchConsole() {
  if (!searchConsoleClient) {
    searchConsoleClient = google.searchconsole({ version: 'v1', auth: getAuth() });
  }
  return searchConsoleClient;
}
