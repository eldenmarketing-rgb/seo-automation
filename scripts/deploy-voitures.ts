import dotenv from 'dotenv';
dotenv.config();
import { triggerDeploy } from '../src/deployers/vercel-deploy.js';
async function main() {
  const ok = await triggerDeploy('voitures');
  console.log(`Voitures: ${ok ? '✅ deploy triggered' : '❌ failed'}`);
}
main().catch(e => { console.error(e.message); process.exit(1); });
