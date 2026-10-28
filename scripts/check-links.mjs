// Verify that every local Markdown destination survives repository restructures.
import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const markdown = [];

async function walk(folder) {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'managed', 'build'].includes(entry.name)) continue;
    const path = join(folder, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (entry.isFile() && extname(entry.name) === '.md') markdown.push(path);
  }
}

await walk(root);
const failures = [];
for (const source of markdown) {
  const content = await readFile(source, 'utf8');
  const links = /!?\[[^\]]*\]\(([^)]+)\)/g;
  for (const match of content.matchAll(links)) {
    let destination = match[1].trim();
    const wrapped = destination.startsWith('<') && destination.endsWith('>');
    if (wrapped) destination = destination.slice(1, -1);
    if (/^(?:[a-z]+:|#)/i.test(destination)) continue;
    if (!wrapped && /\s/.test(destination)) {
      failures.push(`${relative(root, source)}: encode or wrap spaces in ${destination}`);
      continue;
    }
    destination = destination.split('#', 1)[0].split('?', 1)[0];
    if (!destination) continue;
    try { destination = decodeURIComponent(destination); }
    catch { failures.push(`${relative(root, source)}: malformed URI ${destination}`); continue; }
    const target = resolve(dirname(source), destination);
    if (!target.startsWith(root + '/')) {
      failures.push(`${relative(root, source)}: escapes repository: ${destination}`);
      continue;
    }
    try { await stat(target); }
    catch { failures.push(`${relative(root, source)}: missing ${destination}`); }
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`Checked local links in ${markdown.length} Markdown files.`);
