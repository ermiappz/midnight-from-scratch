# Lesson 6 — Return a value instead of changing state

[Course overview](../../../README.md) · [Exercise index](../../README.md) · [Previous](../../Lesson%2005/Exercise/README.md) · [Next](../../Lesson%2007/Exercise/README.md)

## Ask a question without recording a new rating

**Learning goal:** read the application answer from `.result` and keep it separate
from the state carried in `.context`.

Add `readRating` first, inspect the generated signature, then add `isFiveStars`.
Expect `5n` from the first read, `true` at rating 5 and `false` after setting 4.
Also compare the ledger before and after each read: a correct answer paired with
an accidental write is still a faulty reader. These tests distinguish “returns
Boolean” from “always returns true” and “reads state” from “changes state.”

## Your exercise workspace

Edit the starter files **in this folder**. They already contain the previous
lesson's prerequisite concepts; TODO comments identify the new work. Keep building
these same files through the lettered stages. The [reference answer](../../Lesson%2006/Solution/README.md)
is separate and is not used as your submitted implementation.

Run grading commands below **from the repository root**, or run `node check.mjs A`
inside this folder to check stage 6A. With no letter, `node check.mjs` lists the
stages. The guide's ordinary file/compile/run commands use this folder as their
working directory; a mention of the project root in the original walkthrough
means this exercise's working folder. Keep your implementation in this folder.

| Stage | Work checked | Command from repository root |
|---|---|---|
| 6A | Return the stored rating | `npm run check -- 6A` |
| 6B | Read the application result | `npm run check -- 6B` |
| 6C | Return a Boolean without changing state | `npm run check -- 6C` |

A failed check reports the first unmet requirement. Fix it and rerun the same
stage. A pass records the checked revision and suggests the next stage.
`npm run progress` distinguishes current passes from stages passed before later
edits. This history is local and ignored by Git; nothing is uploaded or submitted
to an external service.

---

[Course overview](../../../README.md#course-map) · [Previous](../../Lesson%2005/Exercise/README.md) · [Next](../../Lesson%2007/Exercise/README.md)


The starter manifest belongs to this exercise. Update it at the steps below.
The separate root manifest holds the grading and reference commands.

Work through one stage at a time. Append or replace only the code named in that step.

| Stage | Focus | Stop when you can explain |
|---|---|---|
| [6A](#6a--return-the-stored-rating) | Return declared | readRating returns Uint<8> |
| [6B](#6b--inspect-and-call-the-new-interface) | Result read | Find the answer in .result |
| [6C](#6c--exercise-return-a-boolean) | Boolean exercise | 5 → true; 4 → false |

**Memory cue:** A returned answer and stored state are separate.

[![Return a value without changing the rating](../../../assets/diagrams/lesson-06-read-only.svg)](../../../assets/diagrams/lesson-06-read-only.html)

No packages or services are added. Compact spells the type `Boolean`, not
`Bool`; its JavaScript counterpart is `boolean`. The pinned compiler checks the
examples. Parentheses `()` mark a circuit with no explicit arguments.

## 6A — Return the stored rating

So far, both circuits end their signatures with `: []`: they produce no
application return value, even though their execution returns updated context.

```compact
// Return the stored public rating without changing it.
export circuit readRating(): Uint<8> {
    // Return already-public state as the circuit's application value.
    return rating;
}
```

Add that circuit at the top level, outside the existing circuit bodies.

- `export circuit`: an operation your JavaScript can call.
- `readRating`: the entry point's name.
- `()`: no explicit Compact arguments. JavaScript still supplies context.
- `: Uint<8>`: the operation must return an unsigned 8-bit integer.
- `return rating;`: send the current rating back to the caller. This reads a
  public ledger field, so there is no private value requiring disclosure here.
- No assignment or increment occurs: the operation leaves the rating unchanged.

This is not a `pure` circuit: its result depends on ledger state. That is why
the generated JS puts it under impureCircuits, even though it does not write.
Pure circuits cannot access ledger state or call witnesses; we will introduce
them with an input-only computation later.

## 6B — Inspect and call the new interface

```bash
npm run compile-compact
```

In managed/hello/contract/index.d.ts, compare:

```ts
setRating(context: CircuitContext<PS>, newRating: bigint): CircuitResults<PS, []>;
readRating(context: CircuitContext<PS>): CircuitResults<PS, bigint>;
```

These are shortened signatures for explanation, not code to paste into the
generated file. The final generic argument changed from [] to bigint because
the new circuit returns a Uint<8> value.

### Call it from run.js

For the examples below, change the earlier successful `setRating` argument
from `4n` to `5n`. The repository runner already uses `5n`.

After your existing rating work, add:

```js
// setRating returned no application value, but did return an execution context.
console.log('setRating returned:', rated.result); // []

// readRating has no explicit parameters, so pass only the execution context.
const read = contract.impureCircuits.readRating(rated.context);

// The circuit's return statement determines this property.
console.log('readRating returned:', read.result.toString()); // 5

// Its execution context still contains the public ledger state.
console.log('Stored rating:', ledger(read.context.currentQueryContext.state).rating.toString()); // 5
```

Run `npm start`.

| Expression | Meaning |
|---|---|
| `rated.result` | setRating's application return value: [] |
| `read.result` | readRating's application return value: 5n |
| `read.context` | Execution context, including state for a subsequent call |
| `ledger(read.context.currentQueryContext.state).rating` | Decode the rating from that state |

Using `return` does not automatically write a value to the ledger. Conversely,
writing state does not automatically return that value. These are separate
actions. A return derived from private inputs may require disclosure; this
lesson returns an already-public ledger value.

## 6C — Exercise: return a Boolean

Write an exported circuit named `isFiveStars` with no explicit arguments.
It must return `Boolean`: true when the stored rating equals 5, false otherwise.
It must not change rating, message or edits.

Hints:

- A comparison such as `rating == 5` evaluates to a Boolean.
- Use the `return` statement to give the answer to the caller.
- Read the returned answer through the JS execution result's `.result` property.
- Call it after rating 5 (expect true), then set rating 4 and call it again
  using the new context (expect false).

Questions: why can readRating omit disclose()? Why does a read-only circuit
still need context? How does the generated return type differ from setRating's?

<details>
<summary>Answers — lesson 6</summary>

```compact
// Expose a Boolean answer instead of forcing callers to interpret raw state.
export circuit isFiveStars(): Boolean {
    // Answer the five-star question without changing the stored rating.
    return rating == 5;
}
```

```js
// Keep the call's answer and returned context for the next observation or operation.
const five = contract.impureCircuits.isFiveStars(rated.context);
// Display the observed value at this stage of the example.
console.log(five.result); // true: rated.context contains rating 5
// Keep the call's answer and returned context for the next observation or operation.
const four = contract.impureCircuits.setRating(five.context, 4n);
// Keep the call's answer and returned context for the next observation or operation.
const notFive = contract.impureCircuits.isFiveStars(four.context);
// Display the observed value at this stage of the example.
console.log(notFive.result); // false
```

`readRating` returns existing public data, so no private input needs disclosure.
It needs context because the answer depends on the current ledger. Its generated
return value is `bigint`, compared with `[]` for `setRating`; `isFiveStars`
returns a JS `boolean`. None of the reads assigns to a ledger field.

</details>

Toolset investigation reminder: an earlier declaration without `()` using
`isFiveStars: Bool` was reported to compile. This observation has not been
reproduced here. Revisit it with a Midnight expert, recording the exact source,
compiler command, exit status and editor diagnostics. The working form is
`isFiveStars(): Boolean`; compiler errors and editor feedback are separate.

**Verification:** see the [toolchain and verification guide](../../../docs/knowledge-audit.md) for supported checks and their scope.
