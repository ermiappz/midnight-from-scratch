# Toolchain and verification

[Course overview](../README.md) · [Complete guide](../Learn%20Tot.md) · [Deployment walkthrough](deployment.md)

## Version compatibility

The course pins Compact compiler **0.31.1**, source language **0.23**, runtime
**0.16.0**, Midnight.js **4.1.1** and Wallet SDK **1.2.0**. These packages form a
compatible set; a newer compiler or runtime is not necessarily compatible with
the target network. Check the [official support matrix](https://docs.midnight.network/relnotes/support-matrix)
before upgrading or deploying.

The local Docker bundle is documented in [network/README.md](../network/README.md).
It supplies a node, indexer and prover. Public-network endpoints and the separate
prover setup are covered in the deployment walkthrough. A service health response
does not establish that a contract transaction has been accepted.

## Reproduce the checks

| Command | Evidence |
|---|---|
| `npm run check -- 9C` | The current exercise meets that checkpoint's requirements |
| `npm run lesson -- 9` | The completed reference compiles and runs locally |
| `npm run solutions:check` | Local references 1–11 and 15–22 compile and run |
| `npm run check:graders` | Graders distinguish completed implementations from selected broken fixtures |
| `npm run check:network-tools` | Session setup handles secrets, permissions and invalid inputs as specified |
| `npm run check:links` | Local Markdown destinations resolve |

Some checks require installed SDK dependencies or running services. A skipped
or blocked check is not a pass. Keep the command, tool versions and actual result
when reporting a problem. The original local verification baseline passed the
reference suite, grader checks and network-tool checks; reproduce the relevant
checks after changing code or dependencies.

## What the evidence does not establish

Compilation with `--skip-zk` checks syntax and types and emits generated code; it
does not generate proving keys, run every behavior or confirm a transaction.
Local runtime tests exercise contract logic. Network evidence additionally
requires proving, submission, confirmation and independent read-back.

The repository does not claim a verified public-network release. Follow the
deployment guide to collect evidence on your chosen network. The lesson 18
browser shell is a simulation until its adapter is connected to real providers;
the session CLI is the shared-network integration reference. The lesson 15
feedback round adds admission and phase policies beyond the simpler session
CLI contract.

Lessons 21–22 teach grounded AI development. Their worksheet checks validate
structure and required fields; they cannot authenticate a written claim that a
test or deployment succeeded. Independently run the proposed checks and review
the actual implementation.

## Technical references

- [Midnight documentation](https://docs.midnight.network/)
- [Maintained application examples](https://github.com/midnightntwrk/midnight-examples)
- [Midnight Expert](https://github.com/midnightntwrk/midnight-expert)
- [Networks and environments](https://docs.midnight.network/guides/networks-and-environments)

Privacy review must account for disclosed values, stable participant identifiers,
opening recovery, prover visibility and external metadata. The feedback design
does not establish anonymous participation or one record per human.
