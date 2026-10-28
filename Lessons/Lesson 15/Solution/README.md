# Lesson 15 reference — Sealed feedback mini-project

[Guide](../../Lesson%2015/Exercise/README.md) · [All solutions](../../README.md#reference-solutions)

This folder is a completed reference answer. Practice in your own working files
and use this version for comparison; you do not need to edit it to run the check.
Comments explain why each logical statement is present.

- [round.compact](round.compact)
- [run-round.js](run-round.js)
- [test.js](test.js)

From the repository root:

```bash
npm run lesson15
```

The local runner checks a complete round plus admission, organizer/owner authorization, range, phase, opening and replay rejections. It uses generated JavaScript execution with `--skip-zk`; it does not produce a network confirmation. The optional network round uses [round-demo.ts](../../Lesson%2013/Solution/network/src/round-demo.ts) after the [deployment setup](../../../docs/deployment.md).

After comparing, close this answer and explain the rule from memory. Make changes
in the exercise folder, then rerun its checkpoint; running this reference does not
mark the learner’s stages complete.
