import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const version = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version;
const manifest = readFileSync(resolve(root, 'CSXS/manifest.xml'), 'utf8');
const versions = [manifest.match(/ExtensionBundleVersion="([^"]+)"/), manifest.match(/<Extension\s+Id="[^"]+"\s+Version="([^"]+)"/)];
if (versions.some(match => !match || match[1] !== version)) throw new Error('Bundle and panel manifest versions must match package.json.');
const lock = JSON.parse(readFileSync(resolve(root, 'package-lock.json'), 'utf8'));
if (lock.version !== version || lock.packages[''].version !== version) throw new Error('package-lock.json versions must match package.json.');
for (const required of ['com.danrac.aetoolkit.cep.panel', './client/index.html', './host/host.jsx']) {
  if (manifest.indexOf(required) === -1) throw new Error(`Manifest is missing ${required}.`);
}
for (const runtimeFile of ['client/index.html', 'client/js/app.js', 'client/js/template-store.js', 'client/js/format-csv.js', 'client/js/shared-backup.js', 'client/js/panel-state.js', 'host/host.jsx']) {
  if (!existsSync(resolve(root, runtimeFile))) throw new Error(`Missing runtime file: ${runtimeFile}`);
}
console.log('Release structure is valid.');
