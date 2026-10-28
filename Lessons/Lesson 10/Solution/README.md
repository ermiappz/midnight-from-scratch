# Lesson 10 reference — Multiple participants

[Guide](../../Lesson%2010/Exercise/README.md) · [All solutions](../../README.md#reference-solutions)

This folder is a completed reference answer. Practice in your own working files
and use this version for comparison; you do not need to edit it to run the check.
Comments explain why each logical statement is present.

- [feedback.compact](feedback.compact)
- [run-feedback.js](run-feedback.js)
- [test.js](test.js)

From the repository root:

```bash
npm run lesson10
```

Runs Alice and Bob through commit/reveal and checks ownership rejection. Both use independent records.

The command compiles with `--skip-zk` into this folder's ignored `managed/`
directory before running `test.js`. Each run uses fresh local state and needs
no wallet, Docker service or network deployment.
