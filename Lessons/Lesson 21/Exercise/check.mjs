// Route this folder's stage to the shared checker without changing another lesson.
import { checkExercise } from '../../../scripts/check-exercise.mjs';
process.exitCode = await checkExercise(['21' + (process.argv[2] ?? '')]);
