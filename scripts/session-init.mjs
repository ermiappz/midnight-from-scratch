// Create a private configuration for one participant without printing secret values.
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
// Restrict paths to the known environments and a simple participant label.
const [network, participant] = process.argv.slice(2);
if (process.argv.length !== 4 || !['undeployed', 'preview', 'preprod', 'mainnet'].includes(network) || !/^[a-z0-9-]{1,32}$/.test(participant ?? '')) {
  console.error('Usage: npm run session:init -- <undeployed|preview|preprod|mainnet> <alice>');
  process.exit(1);
}
// New public participants receive independent seeds; the local lesson keeps its funded fixture.
const seed = network === 'undeployed' ? '' : `WALLET_SEED=${randomBytes(32).toString('hex')}\n`;
const token = ['preprod', 'mainnet'].includes(network) ? 'BLOCKFROST_PROJECT_ID=\n' : '';
const content = `MIDNIGHT_NETWORK=${network}\nCOURSE_PARTICIPANT=${participant}\n${seed}${token}PRIVATE_STATE_PASSWORD=Course1!${randomBytes(32).toString('hex')}\n`;
const file = fileURLToPath(new URL(`../Lessons/Lesson 13/Solution/network/.env.${network}.${participant}.local`, import.meta.url));
// Never replace an earlier seed or private-store password while repeating setup.
try { writeFileSync(file, content, { flag: 'wx', mode: 0o600 }); }
catch (error) { console.error(error.code === 'EEXIST' ? 'Configuration already exists. Preserve and reuse it; setup did not replace it.' : error.message); process.exit(1); }
console.log(`Created the private ${network}/${participant} configuration. Back it up privately before funding.`);
if (token) console.log('Add the matching Blockfrost project token to this file before connecting.');
