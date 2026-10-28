# Improve one learning moment

Start with a specific point where a learner gets stuck. Good contributions make
one concept easier to explain, one error easier to recover from, or one check
more accurate. The [written lessons](Lessons/README.md) follow a growing ratings
project, from public state to sealed feedback and an independent capstone.

The [interactive Community Learning Lab](https://community-learning-lab-midnight.ermiarch.chatgpt.site) is maintained separately.
This repository contains the written course, exercises and reference code.

## Choose the right place

| Change | Location |
|---|---|
| Lesson guide and learner starter | `Lessons/Lesson NN/Exercise/` |
| Completed reference | `Lessons/Lesson NN/Solution/` |
| Stage checks and grading behavior | `scripts/exercises/` |
| Concept diagrams | `assets/diagrams/` |
| Course-wide explanations | `Learn Tot.md` and `docs/` |

Learners work in `Exercise/`; `Solution/` is the reference. Maintainer changes to
references should include the corresponding guide and checks.

## Make a focused contribution

Keep one concrete task per stage. Supply the preceding context, explain why a
new line exists, and include an answer learners can compare with their attempt.
Use diagram labels that name actual inputs, rules and results. Preserve the
privacy boundary: do not imply a local model submitted a transaction or
established anonymity.

Checks should reject a plausible mistake as well as accept a correct answer.
Compile contract changes with the pinned toolchain and exercise their behavior.
Consult the Midnight Expert knowledge base when changing Midnight-specific
claims, record the source and version, and distinguish checks run from checks
that still require tools or services.

```bash
# Check the affected exercise stage and completed reference.
npm run check -- 9C
npm run lesson -- 9
# Check grading behavior and documentation links.
npm run check:graders
npm run check:links
```

Replace `9C` and `9` with the stage and lesson you changed. The exercise command
grades learner files; running a reference does not mark an exercise complete.

In a contribution, explain the learner's problem, the resulting behavior, checks
actually run, and remaining limitations. For a bug report, include the stage ID,
attempted code, expected feedback, actual feedback and toolchain versions. Use
synthetic inputs; do not include wallet seeds or real private openings.

Native compilation, local runtime behavior and network confirmation are
different evidence. Preserve those labels and never overwrite a learner's work
with a reference answer as part of a check.
