# Lessons

[Course overview](../README.md) · [Complete one-file guide](../Learn%20Tot.md) · [Deployment walkthrough](../docs/deployment.md)

Every lesson keeps learning work and the completed reference together:

```text
Lessons/
└── Lesson 09/
    ├── Exercise/   ← read, edit, and check your work here
    └── Solution/   ← compare only after your attempt
```

Run stage checks from the repository root:

```bash
npm run check -- 3A
npm run check -- 3B
npm run progress
```

Or enter an `Exercise` folder and run `node check.mjs A`. A successful stage
prints the next checkpoint. No checker copies a solution over your work, uploads
your files, commits a change, starts Docker, or submits a transaction.

## Course index

| Lesson | Exercise | Solution | Stages |
|---|---|---|---|
| 00 | [Tools and responsibilities](Lesson%2000/Exercise/README.md) | [Orientation reference](Lesson%2000/Solution/README.md) | Orientation |
| 01 | [Project manifest](Lesson%2001/Exercise/README.md) | [Reference](Lesson%2001/Solution/README.md) | 1A |
| 02 | [First contract](Lesson%2002/Exercise/README.md) | [Reference](Lesson%2002/Solution/README.md) | 2A–2B |
| 03 | [Local execution](Lesson%2003/Exercise/README.md) | [Reference](Lesson%2003/Solution/README.md) | 3A–3D |
| 04 | [State and counter](Lesson%2004/Exercise/README.md) | [Reference](Lesson%2004/Solution/README.md) | 4A–4D |
| 05 | [Validation](Lesson%2005/Exercise/README.md) | [Reference](Lesson%2005/Solution/README.md) | 5A–5D |
| 06 | [Return values](Lesson%2006/Exercise/README.md) | [Reference](Lesson%2006/Solution/README.md) | 6A–6C |
| 07 | [Witnesses](Lesson%2007/Exercise/README.md) | [Reference](Lesson%2007/Solution/README.md) | 7A–7D |
| 08 | [Witness trust](Lesson%2008/Exercise/README.md) | [Reference](Lesson%2008/Solution/README.md) | 8A–8D |
| 09 | [Commit and reveal](Lesson%2009/Exercise/README.md) | [Reference](Lesson%2009/Solution/README.md) | 9A–9F |
| 10 | [Multiple users](Lesson%2010/Exercise/README.md) | [Reference](Lesson%2010/Solution/README.md) | 10A–10F |
| 11 | [Project commands](Lesson%2011/Exercise/README.md) | [Reference](Lesson%2011/Solution/README.md) | 11A–11C |
| 12 | [Local services](Lesson%2012/Exercise/README.md) | [Reference](Lesson%2012/Solution/README.md) | 12A–12C |
| 13 | [Wallet and providers](Lesson%2013/Exercise/README.md) | [Reference and SDK workspace](Lesson%2013/Solution/README.md) | 13A–13D |
| 14 | [Network transactions](Lesson%2014/Exercise/README.md) | [Reference](Lesson%2014/Solution/README.md) | 14A–14G |
| 15 | [Feedback round](Lesson%2015/Exercise/README.md) | [Reference](Lesson%2015/Solution/README.md) | 15A–15E |
| 16 | [Adversarial tests](Lesson%2016/Exercise/README.md) | [Reference](Lesson%2016/Solution/README.md) | 16A–16C |
| 17 | [Opening notebook](Lesson%2017/Exercise/README.md) | [Reference](Lesson%2017/Solution/README.md) | 17A–17C |
| 18 | [Feedback interface](Lesson%2018/Exercise/README.md) | [Reference](Lesson%2018/Solution/README.md) | 18A–18C |
| 19 | [Privacy review](Lesson%2019/Exercise/README.md) | [Reference](Lesson%2019/Solution/README.md) | 19A–19C |
| 20 | [Sealed-bidding capstone](Lesson%2020/Exercise/README.md) | [Reference](Lesson%2020/Solution/README.md) | 20A–20D |
| 21 | [AI-enabled review](Lesson%2021/Exercise/README.md) | [Reference](Lesson%2021/Solution/README.md) | 21A–21C |
| 22 | [Agentic project bootstrap](Lesson%2022/Exercise/README.md) | [Reference](Lesson%2022/Solution/README.md) | 22A–22E |

## What a green checkpoint means

The named automated check passed against the current `Exercise` files. It does
not certify all possible behavior, security, privacy, or a deployment. Exit code
0 means passed; 1 means the answer still needs work; 2 means a prerequisite such
as a compatible tool or live service is unavailable.

`PASSED EARLIER` means later edits changed the lesson after that checkpoint. It is
a progress memory, not a claim that the new revision passed.

## Reference solutions

Run a completed answer without changing exercise progress:

```bash
npm run lesson9
npm run lesson -- 17
npm run lesson22
npm run solutions:check
```

The local reference suite covers lessons **1–11 and 15–22**. Lessons 12–14 are
kept outside that default run because configuration validation, SDK installation,
and live transactions have different prerequisites. `npm run lesson14` performs
its documented local deployment workflow and can submit local transactions.

Lesson 13's [network workspace](Lesson%2013/Solution/network/README.md) is shared
with lesson 14. Keeping it beside its introducing lesson avoids a second root-level
solution tree while preserving one reproducible SDK dependency graph.

## Keep private material out of Git and prompts

Do not share wallet seeds, private-state passwords, real commitment openings,
access tokens, or participant-specific environment files. When asking for help,
share the stage, relevant source, redacted output, and the behavior you expected.
