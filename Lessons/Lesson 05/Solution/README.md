# Lesson 5 reference — Types and validation

[Guide](../../Lesson%2005/Exercise/README.md) · [All solutions](../../README.md#reference-solutions)

This folder is a completed reference answer. Practice in your own working files
and use this version for comparison; you do not need to edit it to run the check.
Comments explain why each logical statement is present.

- [lesson.compact](lesson.compact)
- [test.js](test.js)

From the repository root:

```bash
npm run lesson5
```

Accepts rating 4, rejects 0, 6 and 256, and checks the retained valid rating.

The command compiles with `--skip-zk` into this folder's ignored `managed/`
directory before running `test.js`. Each run uses fresh local state and needs
no wallet, Docker service or network deployment.
