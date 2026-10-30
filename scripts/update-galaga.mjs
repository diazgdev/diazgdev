import { writeFile, rename } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { parseCalendar, renderGalaga } from './calendar.mjs';

const response = await fetch('https://github.com/users/diazgdev/contributions', {
  headers: { 'User-Agent': 'diazgdev-profile' },
  signal: AbortSignal.timeout(30000),
});
if (!response.ok) throw new Error(`Calendar request failed: ${response.status}`);
const days = parseCalendar(await response.text());
const svg = await renderGalaga(days);
await writeFile('galaga.svg.tmp', svg);
execFileSync('python3', ['scripts/static-galaga.py', 'galaga.svg.tmp', 'galaga-static.svg.tmp']);
await rename('galaga.svg.tmp', 'galaga.svg');
await rename('galaga-static.svg.tmp', 'galaga-static.svg');
console.log(`Refreshed Galaga from ${days.length} public calendar days.`);
