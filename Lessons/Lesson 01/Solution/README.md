# Lesson 1 reference — Project manifest

[Guide](../../Lesson%2001/Exercise/README.md) · [All solutions](../../README.md#reference-solutions)

This folder is a completed reference answer. Practice in your own working files
and use this version for comparison; you do not need to edit it to run the check.
Comments explain why each logical statement is present.

- [manifest.json](manifest.json)
- [test.js](test.js)

`manifest.json` is the minimal package.json example under a different filename
so it does not change the module settings for the test runner. `name` labels the
project; `private: true` prevents npm publication. JSON cannot contain comments.

From the repository root:

```bash
npm run lesson1
```

Checks the two-field manifest. No contract or dependency is introduced in this lesson.
