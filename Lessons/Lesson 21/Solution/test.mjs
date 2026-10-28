// Validate the completed review worksheet without recording learner progress.
import { fileURLToPath } from 'node:url';
import { aiCheck } from '../../../scripts/exercises/ai-checks.mjs';
for (const stage of ['21A', '21B', '21C']) aiCheck(stage, fileURLToPath(new URL('.', import.meta.url)));
console.log('Lesson 21: review structure and concept checks passed; no submitted evidence was independently verified');
