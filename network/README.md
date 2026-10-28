# Supplied Midnight local stack

This folder vendors the **unmodified service definitions** from
[`midnight-examples/examples/hello-world/compose.yml`](https://github.com/midnightntwrk/midnight-examples/blob/f0ae51ee42f5fd2be500fbc9e4cfe614bb91f820/examples/hello-world/compose.yml),
commit `f0ae51ee42f5fd2be500fbc9e4cfe614bb91f820`, checked 27 October 2026.
The upstream Apache-2.0 license is included as [LICENSE.upstream](LICENSE.upstream).
The course wrapper fixes a Compose project name; it does not redesign the services.

From the course root, with Docker Desktop running (Compose 2.20+ for the
lesson compatibility include files):

```bash
# Download the supplied images when necessary and start the complete local stack.
npm run network:up
# Observe node progress, an indexer response, and the prover health endpoint.
npm run network:status
# Preserve containers while stopping their processes.
npm run network:stop
```

The stack has three services: **node 1.0.0**, **indexer 4.3.3**, and **proof
server 8.1.0**. Its network ID is `undeployed`; ports 9944, 8088, and 6300 bind to
loopback. A running prover/health endpoint does not establish that a contract
proof succeeds. Lesson 14 performs that integration exercise.

There is **no explorer container** in this upstream bundle. Query local public
state through the indexer. Use an explorer for the chosen public network when
sharing a deployment. The archived `midnight-local-dev` repository now directs
users to `midnight-examples`; it is not a second prerequisite for this course.

`npm run network:up` may download substantial images. `stop` preserves containers;
removing/recreating them can reset this disposable chain. Save openings and
private stores, and reconcile deployment addresses against the current chain.

The upstream alternative, in a checkout of `midnight-examples`, is:

```bash
# Run from the upstream repository after its documented Yarn installation.
yarn workspace @midnight-ntwrk/example-hello-world env:up
```

Use one stack at a time: both own the same host ports. To fund a **local browser
wallet**, use the upstream `fund:wallet` workflow linked in the
[deployment guide](../docs/deployment.md#sharing).
