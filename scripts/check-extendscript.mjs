import { parse } from 'acorn';
import { readFileSync } from 'node:fs';
const files = process.argv.slice(2);
if (!files.length) files.push('host/host.jsx');
for (const file of files) {
  parse(readFileSync(file, 'utf8'), { ecmaVersion: 3, allowReserved: "never" });
  console.log(`PASS ES3 syntax: ${file}`);
}
