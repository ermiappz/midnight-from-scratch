// Reuse the course checker while keeping commands convenient inside this folder.
import { checkExercise } from '../../../scripts/check-exercise.mjs';
// With no letter, show this lesson's stages; otherwise check the requested stage.
const args = process.argv.slice(2);
// Reject extra arguments instead of silently ignoring a misspelled command.
process.exitCode = await checkExercise(args.length > 1 ? [] : [args[0] ? '19' + args[0] : '19']);
