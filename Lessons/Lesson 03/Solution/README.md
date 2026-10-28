# Lesson 3 reference — Local execution and context

[Guide](../../Lesson%2003/Exercise/README.md) · [All solutions](../../README.md#reference-solutions)

This folder is a completed reference answer. Practice in your own working files
and use this version for comparison; you do not need to edit it to run the check.
Comments explain why each logical statement is present.

- [lesson.compact](lesson.compact)
- [test.js](test.js)

From the repository root:

```bash
npm run lesson3
```

Checks the empty message, the stored message, and the empty application return value.

The command compiles with `--skip-zk` into this folder's ignored `managed/`
directory before running `test.js`. Each run uses fresh local state and needs
no wallet, Docker service or network deployment.
