// Validate every reference stage without recording learner progress.
import { evaluateCheckpoint } from '../../../scripts/check-exercise.mjs';
import { fileURLToPath } from 'node:url';

const folder = fileURLToPath(new URL('./', import.meta.url));
for (const stage of ['22A', '22B', '22C', '22D', '22E']) await evaluateCheckpoint(stage, folder);
console.log('Lesson 22: agentic project plan, verification harness, and DevEx feedback record passed');
