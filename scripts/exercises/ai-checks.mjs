// Grade a bounded AI review worksheet without claiming to verify prose or network outcomes.
import { assert, json } from './helpers.mjs';
const cases = ['valid-opening', 'wrong-rating', 'wrong-salt', 'unauthorized-owner', 'replay', 'phase', 'unchanged-state'];
// Keep the same staged entry point as the ordinary code exercises.
export function aiCheck(id, folder) {
  const review = json(folder, 'review.json');
  assert.equal(review.schemaVersion, 1, 'Use schemaVersion 1.');
  const text = (value, label) => assert.ok(typeof value === 'string' && value.trim().length >= 12, `Explain ${label} in at least 12 characters.`);
  text(review.feature?.goal, 'the ratings feature goal');
  assert.equal(review.feature.ratingMin, 1, 'The minimum valid rating is 1.');
  assert.equal(review.feature.ratingMax, 5, 'The maximum valid rating is 5.');
  assert.deepEqual(review.feature.publicAtCommit, ['participantId', 'commitment'], 'Classify the commit outputs.');
  assert.deepEqual(review.feature.publicAtReveal, ['rating'], 'Classify the newly disclosed value at reveal.');
  assert.deepEqual(review.feature.private, ['secret', 'salt'], 'Keep participant secrets and salts private from public observers.');
  if (id === '21A') return;
  const request = review.request;
  for (const [key, value] of Object.entries({ compiler: '0.31.1', language: '0.23', runtime: '0.16.0', sdk: '4.1.1' })) assert.equal(request?.[key], value, `Pin ${key} to ${value} in the request.`);
  assert.equal(request.target, 'Lessons/Lesson 15/Exercise/round.compact', 'Target the editable round contract.');
  text(request.prompt, 'the task and expected verification');
  assert.ok(request.expertSkills?.includes('compact-core:compact-review') && request.expertSkills.includes('midnight-verify:verify-compact'), 'Ask for Compact review and verification.');
  assert.ok(request.sourceFiles?.includes('Lessons/Lesson 15/Solution/round.compact') && request.sourceFiles.includes('Lessons/Lesson 16/Solution/tests.mjs'), 'Supply contract and adversarial-test context.');
  if (id === '21B') return;
  const verification = review.verification;
  assert.equal(verification?.cases?.length, cases.length, 'Describe all seven distinct verification cases.');
  assert.deepEqual([...new Set(verification.cases.map(item => item.id))].sort(), [...cases].sort(), 'Use each required case ID once.');
  for (const item of verification.cases) {
    text(item.expected, `${item.id}'s expected behavior`);
    assert.ok(['not-run', 'passed', 'failed'].includes(item.evidenceStatus), 'Label each observation not-run, passed, or failed.');
    text(item.evidence, `${item.id}'s evidence or reason it has not run`);
  }
  assert.deepEqual(verification.privacy, { noSecretInPublicReceipt: true, stableIdCanLinkActions: true, localTestsProveNetworkDeployment: false }, 'Correct the privacy and verification boundaries.');
  text(verification.limitations, 'remaining limits');
  assert.ok(['pending', 'completed'].includes(verification.humanReview), 'Record whether human review remains pending.');
}

// Grade the final agentic-project plan as a reproducible engineering artifact.
// This checks structure and known course invariants; it never claims the agent ran.
export function agenticCheck(id, folder) {
  const plan = json(folder, 'project-plan.json');
  const text = (value, label) => assert.ok(typeof value === 'string' && value.trim().length >= 12, `Explain ${label} in at least 12 characters.`);
  assert.equal(plan.schemaVersion, 1, 'Use schemaVersion 1.');

  text(plan.product?.name, 'the project name');
  text(plan.product?.user, 'the target user');
  text(plan.product?.problem, 'the problem');
  text(plan.product?.firstSlice, 'the first demonstrable slice');
  assert.ok(plan.product?.privateData?.includes('rating') && plan.product.privateData.includes('opening salt'), 'Keep the rating and opening salt private before reveal.');
  assert.ok(plan.product?.publicData?.includes('commitment') && plan.product.publicData.includes('revealed rating'), 'Name the commitment and deliberately revealed rating as public data.');
  if (id === '22A') return;

  assert.equal(plan.scaffold?.tool, 'create-mn-app', 'Use the Midnight project generator named create-mn-app.');
  assert.match(plan.scaffold?.command ?? '', /^npx create-mn-app@latest [a-z0-9-]+ --template hello-world$/, 'Record a reproducible hello-world scaffold command.');
  assert.equal(plan.scaffold?.setupCommand, 'npm run setup', 'Use the generated local setup command.');
  assert.equal(plan.scaffold?.initialNetwork, 'undeployed', 'Begin on the local undeployed network.');
  assert.equal(plan.scaffold?.source, 'https://github.com/midnightntwrk/create-mn-app', 'Record the generator source.');
  if (id === '22B') return;

  assert.equal(plan.agent?.expert, 'midnight-expert', 'Name Midnight Expert as the domain grounding layer.');
  assert.equal(plan.agent?.doctorCommand, '/midnight-expert:doctor', 'Run the Midnight Expert health check before relying on its plugins.');
  assert.ok(plan.agent?.contextFiles?.includes('PROJECT_SPEC.md') && plan.agent.contextFiles.includes('AGENTS.md'), 'Ground the agent with a project specification and repository instructions.');
  assert.ok(plan.agent?.editablePaths?.includes('contracts/') && plan.agent.editablePaths.includes('tests/'), 'Bound edits to contract and test paths.');
  for (const secret of ['wallet seed', 'private-state password', 'opening salt']) assert.ok(plan.agent?.forbiddenPromptData?.includes(secret), `Keep ${secret} out of prompts.`);
  text(plan.agent?.prompt, 'the bounded agent task');
  if (id === '22C') return;

  const requiredCases = ['happy-path', 'wrong-opening', 'unauthorized-caller', 'replay', 'retained-state'];
  assert.deepEqual([...new Set(plan.verification?.cases ?? [])].sort(), [...requiredCases].sort(), 'Include all five positive and adversarial cases exactly once.');
  assert.ok(plan.verification?.commands?.some(command => /compact|compile|setup/.test(command)), 'Record a setup or contract compilation command.');
  assert.ok(plan.verification?.commands?.some(command => /test/.test(command)), 'Record a test command.');
  assert.deepEqual(plan.verification?.evidencePolicy, { separateObservedFromInferred: true, networkClaimsNeedReadBack: true, securityNeedsHumanReview: true }, 'Keep observed, inferred, network, and security claims distinct.');
  if (id === '22D') return;

  assert.ok(Array.isArray(plan.feedback?.observations) && plan.feedback.observations.length >= 1, 'Record at least one concrete agent or developer-experience observation.');
  for (const observation of plan.feedback.observations) {
    assert.ok(['retrieval', 'tooling', 'documentation', 'api', 'verification'].includes(observation.category), 'Use a recognized feedback category.');
    text(observation.symptom, 'the observed failure or friction');
    text(observation.evidence, 'the evidence');
    text(observation.proposedImprovement, 'the proposed improvement');
  }
  for (const metric of ['taskSuccess', 'compactCompile', 'testsPassed', 'unsupportedClaims']) assert.equal(typeof plan.feedback?.metrics?.[metric], 'boolean', `Record ${metric} as true or false.`);
  assert.ok(['pending', 'completed'].includes(plan.feedback?.humanReview), 'Record whether human review is pending or completed.');
}
