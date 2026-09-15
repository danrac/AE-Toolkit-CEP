import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const manifestPath = resolve(root, 'CSXS/manifest.xml');
const manifest = readFileSync(manifestPath, 'utf8');
const versionMatch = manifest.match(/ExtensionBundleVersion="([^"]+)"/);
if (!versionMatch || versionMatch[1] !== packageJson.version) {
  throw new Error(`Manifest version must match package.json (${packageJson.version}).`);
}

const stage = resolve(root, 'dist/AE-Toolkit-CEP');
rmSync(stage, { recursive: true, force: true });
mkdirSync(stage, { recursive: true });
for (const entry of ['CSXS', 'client', 'host']) {
  const source = resolve(root, entry);
  if (!existsSync(source)) throw new Error(`Missing extension entry: ${entry}`);
  cpSync(source, resolve(stage, entry), { recursive: true });
}
writeFileSync(resolve(stage, 'package.json'), JSON.stringify({ name: packageJson.name, version: packageJson.version }, null, 2) + '\n');
console.log(`Staged CEP extension: ${stage}`);
