import dotenv from 'dotenv';
dotenv.config();

import { triggerDeploy } from '../src/deployers/vercel-deploy.js';

async function main() {
  console.log('Triggering Vercel redeploy for garage + vtc...\n');

  const garageOk = await triggerDeploy('garage');
  console.log(`Garage: ${garageOk ? '✅ deploy triggered' : '❌ failed'}`);

  const vtcOk = await triggerDeploy('vtc');
  console.log(`VTC: ${vtcOk ? '✅ deploy triggered' : '❌ failed'}`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
