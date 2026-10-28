// Reuse the supplied upstream Compose bundle through a single course command.
import { spawnSync } from 'node:child_process';
// Resolve the bundle independently of the caller's current working directory.
import { fileURLToPath } from 'node:url';
// Keep the project name stable across startup, status and stop commands.
const file = fileURLToPath(new URL('../network/compose.yaml', import.meta.url));
const base = ['compose', '-p', 'midnight-course', '-f', file];
// Accept only fixed operations; never interpolate command text supplied by a user.
const operation = process.argv[2];
const options = { up: ['up', '-d', '--wait'], stop: ['stop'], logs: ['logs', '--tail', '80'], check: ['config', '--quiet'], status: ['ps'] };
if (process.argv.length !== 3 || !options[operation]) {
  console.error('Usage: npm run network:<up|status|stop|logs|check>');
  process.exit(1);
}
// Propagate Compose failures before reporting any network readiness.
const result = spawnSync('docker', [...base, ...options[operation]], { stdio: 'inherit', shell: false });
if (result.error || result.status !== 0) {
  console.error(result.error?.message ?? 'Docker Compose failed. Start Docker Desktop and inspect npm run network:logs.');
  process.exit(result.status || 1);
}
if (operation === 'status') {
  // Probe each service independently and bound waits when a process is unavailable.
  const probes = [
    ['node', 'http://127.0.0.1:9944', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'chain_getHeader', params: [] }) }, data => {
      if (BigInt(data.result?.number ?? '0') === 0n) throw new Error('No block beyond genesis');
      return `block ${BigInt(data.result.number)}`;
    }],
    ['indexer', 'http://127.0.0.1:8088/api/v4/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: '{ __typename }' }) }, data => {
      if (!data.data?.__typename || data.errors) throw new Error('GraphQL did not answer');
      return 'GraphQL answered';
    }],
    ['prover', 'http://127.0.0.1:6300/health', {}, () => 'health answered; contract proving is a separate check'],
  ];
  // A healthy node does not mask a broken indexer or prover.
  for (const [label, url, init, describe] of probes) {
    try {
      const response = await fetch(url, { ...init, signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = label === 'prover' ? null : await response.json();
      console.log(`${label}: ${describe(data)}`);
    } catch (error) { console.error(`${label}: ${error.message}`); process.exitCode = 1; }
  }
}
