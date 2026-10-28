// Reuse the course checker while keeping commands convenient inside this folder.
import { checkExercise } from '../../../scripts/check-exercise.mjs';
const args = process.argv.slice(2);
process.exitCode = await checkExercise(args.length > 1 ? [] : [args[0] ? '22' + args[0] : '22']);
