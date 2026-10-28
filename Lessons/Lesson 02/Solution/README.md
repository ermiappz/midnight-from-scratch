# Lesson 2 reference — First public contract

[Guide](../../Lesson%2002/Exercise/README.md) · [All solutions](../../README.md#reference-solutions)

This folder is a completed reference answer. Practice in your own working files
and use this version for comparison; you do not need to edit it to run the check.
Comments explain why each logical statement is present.

- [lesson.compact](lesson.compact)
- [test.js](test.js)

From the repository root:

```bash
npm run lesson2
```

Compiles the first contract and checks its generated JavaScript and TypeScript interface. Executing a circuit begins in lesson 3.

The command compiles with `--skip-zk` into this folder's ignored `managed/`
directory before running `test.js`. Each run uses fresh local state and needs
no wallet, Docker service or network deployment.
