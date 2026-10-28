# Lesson 14 reference — Deploy, call and confirm

[Guide](../../Lesson%2014/Exercise/README.md) · [All solutions](../../README.md#reference-solutions)

This folder is a completed reference answer. Practice in your own working files
and use this version for comparison; you do not need to edit it to run the check.
Comments explain why each logical statement is present.

- [test.js](test.js)

The contract is reused from [lesson 10](../../Lesson%2010/Solution/feedback.compact);
this lesson adds tooling around it rather than a different contract.

First run `npm ci --prefix 'Lessons/Lesson 13/Solution/network'` from the repository root.
Lesson 14 also requires running local services and `Lessons/Lesson 13/Solution/network/.env.local`;
follow the [network setup](../../Lesson%2013/Solution/network/README.md) before invoking it.

From the repository root:

```bash
npm run lesson14
```

Fully compiles the feedback contract, builds the SDK workspace, deploys a new local instance, then commits, reveals and reads confirmed state. This sends local transactions each time it is run.

The [deployment walkthrough](../../../docs/deployment.md) adds explicit preview,
preprod, sharing, browser-build, and production procedures. The separate
`session:init` / `session` commands use network-specific participant profiles;
`npm run lesson14` retains its explicitly local behavior. Stages 14E–14G grade
concept questions, not public transaction evidence.
