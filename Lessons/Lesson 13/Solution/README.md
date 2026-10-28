# Lesson 13 reference — Wallet and providers

[Guide](../../Lesson%2013/Exercise/README.md) · [All solutions](../../README.md#reference-solutions)

This folder is a completed reference answer. Practice in your own working files
and use this version for comparison; you do not need to edit it to run the check.
Comments explain why each logical statement is present.

- [test.js](test.js)

The contract is reused from [lesson 10](../../Lesson%2010/Solution/feedback.compact);
this lesson adds tooling around it rather than a different contract.

First run `npm ci --prefix 'Lessons/Lesson 13/Solution/network'` from the repository root.

From the repository root:

```bash
npm run lesson13
```

Compiles both reference interfaces and builds [the shared SDK workspace](network/README.md). This checks types; it does not connect or synchronize a wallet.
