# Lesson 11 — Make the project reproducible

[Course overview](../../../README.md) · [Exercise index](../../README.md) · [Previous](../../Lesson%2010/Exercise/README.md) · [Next](../../Lesson%2012/Exercise/README.md)

## Reproduce behavior before changing environments

**Learning goal:** rebuild the same ratings behavior from source and a lockfile,
then explain which artifacts must change when targeting another network.

First name the commands, then generate the matching lockfile, then reproduce the
Alice/Bob run in a temporary folder. Expect two separate records with ratings 3
and 5 and a rejected wrong-secret attempt. This tests something a successful run
in your working directory cannot: the build must not depend on forgotten files
or old generated output.

## Your exercise workspace

Edit the starter files **in this folder**. They already contain the previous
lesson's prerequisite concepts; TODO comments identify the new work. Keep building
these same files through the lettered stages. The [reference answer](../../Lesson%2011/Solution/README.md)
is separate and is not used as your submitted implementation.

Run grading commands below **from the repository root**, or run `node check.mjs A`
inside this folder to check stage 11A. With no letter, `node check.mjs` lists the
stages. The guide's ordinary file/compile/run commands use this folder as their
working directory; a mention of the project root in the original walkthrough
means this exercise's working folder. Keep your implementation in this folder.

| Stage | Work checked | Command from repository root |
|---|---|---|
| 11A | Name compile and run commands | `npm run check -- 11A` |
| 11B | Record dependency versions | `npm run check -- 11B` |
| 11C | Run the reproducible workflow | `npm run check -- 11C` |

A failed check reports the first unmet requirement. Fix it and rerun the same
stage. A pass records the checked revision and suggests the next stage.
`npm run progress` distinguishes current passes from stages passed before later
edits. This history is local and ignored by Git; nothing is uploaded or submitted
to an external service.

---

[Course map](../../../README.md#course-map) · [Previous](../../Lesson%2010/Exercise/README.md) · [Next](../../Lesson%2012/Exercise/README.md)


The snippets build the files in this exercise folder. The reference folder contains the completed version.

**Goal:** know precisely what each npm command runs, preserve dependency versions,
and distinguish source files from generated files before adding network services.

**Memory cue:** changing source and executing output are separate operations.

[![Two preparations, one local run](../../../assets/diagrams/lesson-11-reproducible-build.svg)](../../../assets/diagrams/lesson-11-reproducible-build.html)

## 11A — Name and run the commands

### Name commands you already understand

Work in `Lessons/Lesson 11/Exercise/`. In this folder's `package.json`, keep
`name`, `private`, `type` and the dependency. Add or update the entries below
inside its `scripts` object. The repository root manifest already has course
commands and is not the file being exercised here:

```json
"scripts": {
  "start": "node run.js",
  "compile-compact": "compact compile +0.31.1 --skip-zk hello.compact managed/hello",
  "compile:feedback": "compact compile +0.31.1 --skip-zk feedback.compact managed/feedback",
  "feedback": "node run-feedback.js",
  "check:feedback": "npm run compile:feedback && npm run feedback"
}
```

This fragment belongs inside the outer JSON object. Do not paste a second
`scripts` property. JSON needs commas between properties and has no comments.
The colon inside a script name is just naming; `check:feedback` is not a special
npm command. The shell's `&&` runs the second command only if compilation succeeds.

```bash
npm run
npm run check:feedback
npm run compile-compact
npm start
```

The first command lists scripts. The next runs lesson 10 end to end locally.
The last two verify that lesson 9 still works. `npm start` is npm's shorthand
for the `start` script; most other names require `npm run NAME`.

## 11B — Preserve source and dependency versions

### Source, output, library and lockfile

| File/directory | Owner and purpose | Commit? |
|---|---|---|
| `*.compact`, `run*.js` | Code you write | Yes |
| `package.json` | Direct dependencies and named commands | Yes |
| `package-lock.json` | Resolved dependency graph and integrity records | Yes |
| `node_modules/` | Installed package code | No |
| `managed/` | Compiler output | No; regenerate |
| Future private openings/seed files | Local secrets and recovery material | Never as course source |

`npm install` deliberately changes an installation and may update the lockfile.
`npm ci` installs an existing lockfile and fails when it disagrees with the
manifest. It replaces node_modules; use it when a clean install is intended.
Neither compiles the contract unless a script explicitly does so.

### Create the lesson lockfile once

The starter has no lockfile. From this lesson folder run `npm install` once to
resolve its pinned manifest and create `package-lock.json`; inspect and retain
that file. Subsequent clean installs use `npm ci`. This installs dependencies,
not a new Compact compiler.

### Inspect versions without upgrading

```bash
node --version
compact compile +0.31.1 --version
npm ls @midnight-ntwrk/compact-runtime @midnight-ntwrk/onchain-runtime-v3
```

Expect runtime 0.16.0 for this compiler. The exact transitive on-chain runtime
in the original lockfile may differ from the later network workspace's pin.
Do not add the whole network SDK to the root and accidentally mix two runtime
class implementations. Lessons 13–14 use a separate `network/` manifest and
compile into its own `managed/` so generated code resolves that dependency set.

## 11C — Reproduce the completed workflow

### Do a clean-room check

From `Lessons/Lesson 11/Exercise/`, make a temporary folder and copy only the lesson 10
inputs. This changes no tracked source:

```bash
lesson_check_dir=$(mktemp -d)
cp package.json package-lock.json feedback.compact run-feedback.js "$lesson_check_dir/"
cd "$lesson_check_dir"
npm ci
npm run check:feedback
```

`mktemp -d` prints a new path; the variable retains it. The copied manifest has
other scripts, but we invoke only the one whose source files we copied. Return
to the repository in your next terminal command using its actual path.

Expected: the same Alice/Bob results without copying node_modules or managed.
If compilation fails, address that error before running Node against stale output.

### Exercise

1. Add a script `check:local` that compiles and runs lessons 9 and 10 in order.
2. Change only a print label. Which command is sufficient?
3. Change a Compact assertion. Which command prevents accidentally running stale JS?
4. Explain why committing node_modules is not a substitute for the lockfile.

<details>
<summary>Answers — lesson 11</summary>

Add this property to `scripts`, with the required comma:

```json
"check:local": "npm run compile-compact && npm start && npm run check:feedback"
```

A label change needs `npm start` or `npm run feedback`, depending on the file.
An assertion change needs compilation before execution; `npm run check:feedback`
handles both for the feedback contract. Installed packages are bulky output
specific to an installation; the lockfile records how to reproduce dependencies.
It does not replace source files or machine tools such as the Compact compiler.

</details>

**Checkpoint:** execute lesson 10 from copied source and a lockfile, and explain
every command. No network has been started yet.

**Promotion cue:** promote reviewed source and rebuild matching artifacts for
each environment. Do not promote private openings, genesis seeds, or an old
network's deployment address as application source. The [deployment guide](../../../docs/deployment.md)
shows what changes between local, preview, preprod, and mainnet.

**Verification:** see the [toolchain and verification guide](../../../docs/knowledge-audit.md) for supported checks and their scope.
