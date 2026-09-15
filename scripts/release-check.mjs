import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const manifest = readFileSync(resolve(root, 'CSXS/manifest.xml'), 'utf8');
for (const required of ['com.danrac.aetoolkit.cep.panel', './client/index.html', './host/host.jsx']) {
  if (manifest.indexOf(required) === -1) throw new Error(`Manifest is missing ${required}.`);
}
for (const runtimeFile of ['client/index.html', 'client/js/app.js', 'client/js/template-store.js', 'host/host.jsx']) {
  if (!existsSync(resolve(root, runtimeFile))) throw new Error(`Missing runtime file: ${runtimeFile}`);
}
console.log('Release structure is valid.');
