# Shared network reference — lessons 13–15

[Lesson index](../../../README.md#reference-solutions) · [Wallet guide](../../Exercise/README.md) · [Deployment guide](../../../Lesson%2014/Exercise/README.md)

This is the completed SDK workspace. Lessons 13 and 14 reuse it; lesson 15 adds
`src/round-demo.ts`. The contract sources stay in `../../../Lesson 10/Solution/` and
`../../../Lesson 15/Solution/`. Compilation writes this workspace's own `managed/` directories
so the generated JavaScript resolves this workspace's pinned runtime dependencies.

The guides teach a working layout with `network/` beside your own `feedback.compact`
and `round.compact`. Their relative compile paths reflect that layout. This
reference manifest instead points to the solution folders and can run in place.
Do not mix the two layouts or copy the root node_modules into this directory.

## Offline build

From the repository root, with Node 22.23.2 and compiler 0.31.1 selected:

```bash
npm ci --prefix 'Lessons/Lesson 13/Solution/network'
npm run lesson13
```

This compiles both interfaces with `--skip-zk` and builds TypeScript. It opens no
wallet connection and does not submit a transaction. `npm run lesson12` separately
validates the [Compose fixture](../../../Lesson%2012/Solution/compose.yaml) with Docker Compose.

## Local network execution

Read lessons 12–14 before running this sequence. All commands below start from
the repository root. The fixture uses the `undeployed` network, loopback endpoints
and a publicly known local genesis seed; it is a learning network configuration.

```bash
# Validate the fixture before starting its services.
npm run lesson12
# Start the local node, indexer and proof server.
npm run network:up
# Inspect readiness; use lesson 12's requests to check node and indexer progress.
npm run network:status
```

Create `.env.local` once, inside this workspace. The following command refuses
to replace an existing file and prints no password:

```bash
# Keep the encryption password local, with restrictive file permissions.
node --input-type=module <<'JS'
// Use cryptographic randomness for the private-store password.
import { randomBytes } from 'node:crypto';
// Persist the password so later runs can reopen the same encrypted store.
import { writeFileSync } from 'node:fs';
// Include the character classes required by this provider's password policy.
const password = 'Course1!' + randomBytes(32).toString('hex');
// Refuse overwrite; replacing the password would not decrypt the existing store.
writeFileSync('Lessons/Lesson 13/Solution/network/.env.local', `PRIVATE_STATE_PASSWORD=${password}\n`, { mode: 0o600, flag: 'wx' });
JS
# Build interfaces and SDK code before checking the wallet.
npm run lesson13
# If the genesis wallet has no DUST, first follow the explicit local registration
# procedure in docs/deployment.md section 4; starting containers is not funding.
# Wait for synchronization and fee resources without deploying.
npm --prefix 'Lessons/Lesson 13/Solution/network' run status
# Fully compile, deploy feedback, then commit/reveal and check confirmed state.
npm run lesson14
```

Lesson 14 writes `deployment.json`, `opening.json` and private provider storage
inside this workspace; they are ignored by Git. Its call script refuses to replace
an existing `opening.json`. Inspect and preserve earlier opening data before a
new experiment. The introductory script demonstrates one run; restart/recovery
is the subject of lesson 17. Stopping the process does not undo a confirmed call.

To try the round after the local `npm run lesson15` checks pass:

```bash
# Generate proving artifacts for the round rather than the earlier feedback contract.
npm --prefix 'Lessons/Lesson 13/Solution/network' run compile:round
# Compile the round demonstration's TypeScript.
npm --prefix 'Lessons/Lesson 13/Solution/network' run build
# Deploy and exercise the round on the running local network.
npm --prefix 'Lessons/Lesson 13/Solution/network' run round
```

Stop the services without requesting volume removal:

```bash
# Stop containers while retaining the fixture's existing data where supported.
npm run network:stop
```

## Source map

| File | Responsibility |
|---|---|
| [config.ts](src/config.ts) | Select the local network and service endpoints |
| [wallet.ts](src/wallet.ts) | Derive key roles, synchronize and adapt wallet operations |
| [status.ts](src/status.ts) | Observe synchronization and DUST readiness |
| [providers.ts](src/providers.ts) | Connect public data, proving, private storage and the wallet |
| [feedback.ts](src/feedback.ts) | Pair the generated contract with its compiled artifacts |
| [deploy.ts](src/deploy.ts) | Deploy feedback and save its confirmed address |
| [call.ts](src/call.ts) | Save an opening, commit, reveal and verify indexed results |
| [round-demo.ts](src/round-demo.ts) | Exercise admission and phase transitions on the round |

The manifest and lockfile pin this SDK graph separately from the early runtime.
The guides explain each JSON configuration field; JSON does not permit comments.
The TypeScript build is checked. Live synchronization, full proving, deployment
and confirmation have not been executed as part of this repository restructure.

## Public profiles and shared sessions

The [deployment walkthrough](../../../../docs/deployment.md) provides the full local,
preview, preprod and mainnet path. `config.ts` selects `MIDNIGHT_NETWORK` with a
local default; public profiles require their own private seed. `session.ts` adds
separate info, registration, deployment, read, commit and reveal operations so
peers can test one shared address. `openLocalWallet` continues to reject public
profiles, preserving the introductory runner's local boundary. No public
transaction is sent by the type check or default local reference suite.
