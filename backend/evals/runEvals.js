import { seedData } from '../data/seed.js';
import { runEvals } from './agentEvals.js';

async function main() {
  console.log('Seeding in-memory data for evals...');
  await seedData();
  await runEvals();
}
main().catch(e => { console.error(e); process.exit(1); });
