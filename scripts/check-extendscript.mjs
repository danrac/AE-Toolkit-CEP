import { parse } from 'acorn';
import { readFileSync, readdirSync } from 'node:fs';
const files = process.argv.slice(2);
if (!files.length) { for (const dir of ['host', 'tests']) files.push(...readdirSync(dir).filter(name => name.endsWith('.jsx')).map(name => `${dir}/${name}`)); }
for (const file of files) {
  parse(readFileSync(file, 'utf8'), { ecmaVersion: 3, allowReserved: "never" });
  console.log(`PASS ES3 syntax: ${file}`);
}
