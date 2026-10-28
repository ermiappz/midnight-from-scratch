# Lesson 12 reference — the supplied local stack

[Exercise](../../Lesson%2012/Exercise/README.md) · [Stack provenance](../../../network/README.md)

`compose.yaml` includes the same canonical bundle as the course startup command.
From the root, `npm run lesson12` validates configuration without starting it.
`npm run network:up` starts it; `npm run network:status` observes readiness.
The [deployment walkthrough](../../../docs/deployment.md) explains what those checks establish.
