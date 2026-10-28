// Describe checkpoint boundaries independently from the implementation used to grade them.
export const lessons = {
  1: ['Project manifest', ['A', 'Name the project and prevent publication']],
  2: ['First contract', ['A', 'Declare and compile the public message'], ['B', 'Implement and exercise storeMessage']],
  3: ['Local execution', ['A', 'Prepare the runtime and module format'], ['B', 'Build the execution context'], ['C', 'Call storeMessage'], ['D', 'Explain and verify fresh state']],
  4: ['State and counter', ['A', 'Declare the counter'], ['B', 'Count each successful call'], ['C', 'Carry state through two calls'], ['D', 'Name compile and run commands']],
  5: ['Validation', ['A', 'Declare the rating field'], ['B', 'Enforce the 1–5 rule'], ['C', 'Call with a valid rating'], ['D', 'Reject invalid inputs and retain state']],
  6: ['Return values', ['A', 'Return the stored rating'], ['B', 'Read the application result'], ['C', 'Return a Boolean without changing state']],
  7: ['Witnesses', ['A', 'Declare the witness'], ['B', 'Constrain the supplied value'], ['C', 'Register the notebook callback'], ['D', 'Apply and inspect the preference']],
  8: ['Witness trust', ['A', 'Predict the caller-controlled input'], ['B', 'Supply a different valid preference'], ['C', 'Reject an invalid preference'], ['D', 'Restore and explain the trust boundary']],
  9: ['Commit and reveal', ['A', 'Explain and retain the opening'], ['B', 'Commit once without publishing the rating'], ['C', 'Check the opening before reveal'], ['D', 'Assemble the commit/reveal caller'], ['E', 'Inspect the two public states'], ['F', 'Check boundaries and replay']],
  10: ['Multiple users', ['A', 'Store independent public map entries'], ['B', 'Derive the record ID from a secret'], ['C', 'Store a sealed record'], ['D', 'Authorize and verify reveal'], ['E', 'Complete Alice and Bob’s records'], ['F', 'Scope IDs to this contract']],
  11: ['Project commands', ['A', 'Name compile and run commands'], ['B', 'Record dependency versions'], ['C', 'Run the reproducible workflow']],
  12: ['Local services', ['A', 'Validate the service configuration'], ['B', 'Observe node, indexer and prover'], ['C', 'Explain failures and stopping']],
  13: ['Wallet and providers', ['A', 'Configure and build the SDK workspace'], ['B', 'Implement wallet key roles and adapters'], ['C', 'Observe synchronization and DUST'], ['D', 'Assemble the provider bundle']],
  14: ['Network transactions', ['A', 'Compile proving artifacts and the interface'], ['B', 'Verify the confirmed deployment'], ['C', 'Verify the revealed record on chain'], ['D', 'Explain recovery and confirmation'], ['E', 'Choose preview and preprod correctly'], ['F', 'Plan a shared public test'], ['G', 'Explain production release gates']],
  15: ['Feedback round', ['A', 'Specify admission and phases'], ['B', 'Initialize round state'], ['C', 'Enforce admission and submission'], ['D', 'Enforce reveal, closure and replay'], ['E', 'Run the two-participant demonstration']],
  16: ['Adversarial tests', ['A', 'Test the valid flow'], ['B', 'Catch wrong openings'], ['C', 'Catch replay and state corruption']],
  17: ['Opening notebook', ['A', 'Save an opening safely'], ['B', 'Restore it across processes'], ['C', 'Reject missing and mismatched records']],
  18: ['Feedback interface', ['A', 'Derive button and status state'], ['B', 'Handle asynchronous confirmation'], ['C', 'Render the accessible interface']],
  19: ['Privacy review', ['A', 'Classify public and private data'], ['B', 'Produce a safe public receipt'], ['C', 'State accurate privacy claims']],
  20: ['Sealed-bidding capstone', ['A', 'Commit a bid once'], ['B', 'Authorize phase changes'], ['C', 'Reveal and select the winner'], ['D', 'Demonstrate results and document the design']],
  21: ['AI-enabled development', ['A', 'Specify the ratings feature'], ['B', 'Write a grounded Midnight expert request'], ['C', 'Record honest verification and privacy limits']],
  22: ['Agentic project bootstrap', ['A', 'Frame a private-by-design product slice'], ['B', 'Choose and record the project scaffold'], ['C', 'Ground Midnight Expert with bounded context'], ['D', 'Design the verification harness'], ['E', 'Turn agent failures into developer-experience evidence']],
};

// Keep concept checks explicit: these are narrow questions, not automated grading of prose.
export const questions = {
  '12A': { suppliedStack: ['midnight-examples', 'Which maintained Midnight repository supplies the stack?'], localNetwork: ['undeployed', 'What is the local network ID?'], explorerIncluded: [false, 'Does the supplied three-service stack include an explorer?'] },
  '14E': { localId: ['undeployed', 'Local network ID?'], previewId: ['preview', 'Early public experimentation network ID?'], testnetId: ['preprod', 'Final public test environment ID?'], productionId: ['mainnet', 'Production network ID?'], vitePreviewSelectsNetwork: [false, 'Does Vite preview select the Midnight Preview network?'] },
  '14F': { shareSeeds: [false, 'Should peers receive your wallet seed or opening?'], deployForEachTester: [false, 'Should every tester deploy a different contract when testing shared state?'], readBackRequired: [true, 'Should each tester independently read indexed state?'] },
  '14G': { productionBuildSelectsMainnet: [false, 'Does a production frontend build select mainnet automatically?'], faucetAvailable: [false, 'Is there a mainnet faucet?'], localEvidenceProvesMainnet: [false, 'Does local evidence establish mainnet success?'] },
  '3D': { restartMessage: ['', 'What is the initial message after restarting this local runner?'], circuitReturn: ['result', 'Which result property holds the application return value: result or context?'] },
  '8A': { savedPreference: [4, 'The notebook contains 4; what remains saved if the callback preserves it?'], suppliedPreference: [2, 'The callback returns 2; which value enters Compact?'], accepted: [true, 'Does 2 satisfy the circuit’s 1–5 range rule?'] },
  '8D': { authenticatesNotebook: [false, 'Does the range assertion prove that the callback read the notebook honestly?'], rejectsSix: [true, 'Does the circuit reject a callback returning 6?'] },
  '9A': { opening: ['choice-and-original-salt', 'What must be retained: choice-only, new-salt, or choice-and-original-salt?'], saltPublic: [false, 'Should the salt be public before reveal in this five-choice design?'] },
  '9E': { beforeReveal: [0, 'Which public placeholder is stored before the opening?'], afterReveal: [3, 'Which rating does the guide reveal?'], newSaltRecovers: [false, 'Does generating a new salt recover a lost opening?'] },
  '12C': { transactionService: ['node', 'Which service accepts transactions: node, indexer, or proof-server?'], queryService: ['indexer', 'Which service supplies indexed public data?'], stopDeletesVolumes: [false, 'Does docker compose stop request volume deletion?'] },
  '14D': { submittedMeansConfirmed: [false, 'Does submitting alone establish confirmation?'], retryWithNewSalt: [false, 'Should a missing response cause the app to replace the saved salt?'], readBackRequired: [true, 'Should the app check the confirmed contract state?'] },
  '15A': { phaseOrder: ['submit-reveal-closed', 'Write the round’s phase order separated by hyphens.'], admissionAuthority: ['organizer', 'Who may admit participants?'], countNonReveals: [false, 'Should an unopened rating contribute to the revealed average?'] },
  '19A': { commitment: ['public', 'Classify the on-ledger commitment: public or private.'], participantId: ['public', 'Classify the on-ledger participant identifier.'], salt: ['private', 'Classify the retained secret salt.'], revealedRating: ['public', 'Classify a deliberately revealed rating.'] },
  '19C': { anonymousGuaranteed: [false, 'Does a hashed record ID guarantee anonymity?'], dustHidesPublishedFields: [false, 'Does DUST hide an explicitly published wallet-to-rating mapping?'], linkedWithinContract: [true, 'Can actions using the same public ID be linked within that contract?'] },
};

// Normalize the optional letter while refusing paths, unknown lessons and extra syntax.
export function parseCheckpoint(value) {
  const match = /^(\d{1,2})([a-z])?$/i.exec(value ?? '');
  if (!match || !lessons[Number(match[1])]) throw new Error('Choose a lesson 1–22 or a checkpoint such as 3A.');
  const lesson = Number(match[1]);
  const letter = match[2]?.toUpperCase();
  if (letter && !lessons[lesson].slice(1).some(([part]) => part === letter)) throw new Error(`Lesson ${lesson} has no stage ${letter}.`);
  return { lesson, letter, id: `${lesson}${letter ?? ''}` };
}
