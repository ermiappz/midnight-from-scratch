// Network checkpoints inspect configuration or read existing state; they never deploy or start services.
import { join } from 'node:path';
// Check prerequisites without installing dependencies as a side effect.
import { existsSync, writeFileSync, unlinkSync } from 'node:fs';
// Give transient type probes unique names without replacing learner files.
import { randomUUID } from 'node:crypto';
// Reuse bounded process execution and actionable assertion messages.
import { assert, Blocked, source, json, run, compile, probe } from './helpers.mjs';
// Grade the specific conceptual questions independently from live service availability.
import { quiz } from './local-checks.mjs';

// Require the workspace's separate SDK installation before attempting its TypeScript build.
function build(folder, files) {
  const network = join(folder, 'network');
  const pkg = json(network, 'package.json');
  assert.equal(pkg.type, 'module', 'Select ES modules in network/package.json.');
  assert.equal(pkg.dependencies?.['@midnight-ntwrk/compact-runtime'], '0.16.0', 'Use the pinned SDK manifest from the guide.');
  for (const file of files) assert.ok(source(network, `src/${file}.ts`).replace(/\/\/[^\n]*/g, '').trim(), `Implement network/src/${file}.ts; comments alone are not an implementation.`);
  if (!existsSync(join(network, 'node_modules/typescript/bin/tsc'))) throw new Blocked('Install this exercise’s SDK dependencies: cd to its network/ folder and run npm install (or npm ci when its lockfile exists).');
  run(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json'], network);
  return network;
}
// Check a local HTTP endpoint with a finite timeout and a useful service-specific error.
async function request(url, options = {}) {
  try {
    const response = await fetch(url, { ...options, signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response;
  } catch (error) { throw new Blocked(`Local service unavailable at ${url}: ${error.message}. Follow the start/readiness steps before retrying.`); }
}
// Compile network code without importing it into the grader's different runtime dependency graph.
export async function networkCheck(id, folder) {
  const network = join(folder, 'network');
  if (['12C', '14D', '14E', '14F', '14G'].includes(id)) { quiz(id, folder); return; }
  if (id === '12A') {
    quiz(id, folder);
    source(network, 'compose.yaml');
    const config = JSON.parse(run('docker', ['compose', '-f', 'compose.yaml', 'config', '--format', 'json'], network));
    for (const service of ['node', 'indexer', 'proof-server']) assert.ok(config.services?.[service]?.image, `Configure the ${service} image in network/compose.yaml.`);
    return;
  }
  if (id === '12B') {
    const node = await request('http://127.0.0.1:9944', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'chain_getHeader', params: [] }) });
    assert.ok(BigInt((await node.json()).result?.number ?? '0') > 0n, 'Wait for the local node to advance beyond genesis.');
    const indexer = await request('http://127.0.0.1:8088/api/v4/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: '{ __typename }' }) });
    assert.equal(typeof (await indexer.json()).data?.__typename, 'string', 'The indexer must answer a GraphQL query.');
    const services = run('docker', ['compose', '-p', 'midnight-course', '-f', 'compose.yaml', 'ps', '--status', 'running', '--services'], network).split(/\s+/);
    assert.ok(services.includes('proof-server'), 'Start the configured proof-server container. This check observes its running status; live proof generation is checked separately.');
    return;
  }
  if (id.startsWith('13')) {
    const files = id === '13A' ? ['config'] : id === '13D' ? ['config', 'wallet', 'status', 'providers'] : ['config', 'wallet'];
    // Check inferred return shapes as well as exported names: empty function stubs must not pass.
    const typeProbe = join(network, 'src', `exercise-typecheck-${randomUUID()}.ts`);
    const walletTypes = id === '13A' ? '' : `
import type { openLocalWallet, waitForDust } from './wallet.js';
import type { WalletProvider, MidnightProvider } from '@midnight-ntwrk/midnight-js-types';
type WalletShape = Check<Awaited<ReturnType<typeof openLocalWallet>> extends {
  wallet: object; bridge: WalletProvider & MidnightProvider; keystore: { getBech32Address: () => unknown }
} ? true : false>;
type ReadinessShape = Check<Awaited<ReturnType<typeof waitForDust>> extends { isSynced: boolean; dust: object } ? true : false>;
`;
    const providerTypes = id !== '13D' ? '' : `
import type { providersFor } from './providers.js';
type ProviderShape = Check<ReturnType<typeof providersFor> extends Record<
  'privateStateProvider' | 'publicDataProvider' | 'zkConfigProvider' | 'proofProvider' | 'walletProvider' | 'midnightProvider', object
> ? true : false>;
`;
    let dir;
    try {
      writeFileSync(typeProbe, `import type { endpoints } from './config.js';
type Check<T extends true> = T;
type EndpointShape = Check<typeof endpoints extends Record<'indexer' | 'indexerWS' | 'nodeWS' | 'proof', string> ? true : false>;
${walletTypes}${providerTypes}`, { flag: 'wx' });
      dir = build(folder, files);
    } finally {
      if (existsSync(typeProbe)) unlinkSync(typeProbe);
    }
    // Importing configuration has no wallet startup side effect.
    probe(dir, 'build/config.js', "__exerciseAssert.equal(networkId, 'undeployed'); __exerciseAssert.equal(new URL(endpoints.nodeWS).hostname, '127.0.0.1');");
    if (id !== '13A') probe(dir, 'build/wallet.js', "__exerciseAssert.equal(typeof openLocalWallet, 'function', 'Export openLocalWallet.'); __exerciseAssert.equal(typeof waitForDust, 'function', 'Export waitForDust.');");
    if (id === '13C') {
      source(dir, 'src/status.ts');
      const result = run(process.execPath, ['--env-file=.env.local', 'build/status.js'], dir, 210_000);
      assert.match(result, /Synchronized:\s*true/, 'The status script must observe a synchronized wallet.');
      const balance = /DUST \(SPECK\):\s*(\d+)/.exec(result);
      assert.ok(balance && BigInt(balance[1]) >= 1_000_000_000_000_000n, 'Wait for the guide’s DUST readiness threshold.');
    }
    if (id === '13D') probe(dir, 'build/providers.js', "__exerciseAssert.equal(typeof providersFor, 'function', 'Export the provider assembly function.');");
    return;
  }
  if (id === '14A') {
    // Full compilation belongs to this explicitly selected checkpoint only.
    await compile(folder, 'feedback.compact', 'network/managed/feedback', true);
    build(folder, ['config', 'wallet', 'providers', 'feedback']);
    return;
  }
  const dir = build(folder, ['config', 'wallet', 'providers', 'feedback', 'deploy', ...(id === '14C' ? ['call'] : [])]);
  const saved = json(dir, 'deployment.json');
  assert.equal(saved.network, 'undeployed', 'Use a local deployment record.');
  assert.match(saved.address ?? '', /^[a-f0-9]{64}$/i, 'Save the confirmed contract address in deployment.json.');
  // Query independently of the learner's printed deployment or transaction messages.
  const check = `
import { readFileSync as __read } from 'node:fs';
import { indexerPublicDataProvider as __provider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { endpoints as __endpoints } from './build/config.js';
import { Contract as __Contract, ledger as __ledger } from './managed/feedback/contract/index.js';
import * as __runtime from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
const __saved = JSON.parse(__read('deployment.json', 'utf8'));
const __state = await __provider(__endpoints.indexer, __endpoints.indexerWS).queryContractState(__saved.address);
__exerciseAssert.ok(__state, 'No confirmed contract found at the saved address.');
__exerciseAssert.ok(__ledger(__state.data).submissions, 'The address must belong to this feedback contract.');
${id === '14C' ? `const __opening = JSON.parse(__read('opening.json', 'utf8'));
__exerciseAssert.equal(__opening.address, __saved.address, 'The opening must belong to this deployment.');
const __context = __runtime.createCircuitContext(__saved.address, '0'.repeat(64), __state, {});
const __id = new __Contract({}).circuits.participantId(__context, new Uint8Array(__opening.secret)).result;
const __entry = __ledger(__state.data).submissions.lookup(__id);
__exerciseAssert.equal(__entry.revealed, true, 'Wait for a confirmed reveal.');
__exerciseAssert.equal(__entry.value, BigInt(__opening.choice), 'The confirmed rating must match the saved opening.');` : ''}`;
  // Run only the independent read-back code, without executing the learner's deployment script.
  probe(dir, null, check);
}
