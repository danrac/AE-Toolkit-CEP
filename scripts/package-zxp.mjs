import { existsSync, readFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import './stage-extension.mjs';

const root = resolve(import.meta.dirname, '..');
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const releaseTag = process.env.RELEASE_TAG || `v${packageJson.version}`;
if (releaseTag !== `v${packageJson.version}`) throw new Error(`RELEASE_TAG (${releaseTag}) must match package.json version (${packageJson.version}).`);
const signer = process.env.ZXPSIGNCMD_PATH;
const certificate = process.env.ZXP_CERT_PATH;
const password = process.env.ZXP_CERT_PASSWORD;
if (!signer || !existsSync(signer)) throw new Error('Set ZXPSIGNCMD_PATH to Adobe ZXPSignCmd.');
if (!certificate || !existsSync(certificate)) throw new Error('Set ZXP_CERT_PATH to the signing .p12 file.');
if (!password) throw new Error('Set ZXP_CERT_PASSWORD for the signing certificate.');

const stage = resolve(root, 'dist/AE-Toolkit-CEP');
const output = resolve(root, `dist/AE-Toolkit-CEP-${releaseTag}.zxp`);
rmSync(output, { force: true });
const args = ['-sign', stage, output, certificate, password];
if (process.env.ZXP_TSA_URL) args.push('-tsa', process.env.ZXP_TSA_URL);
execFileSync(signer, args, { stdio: 'inherit' });
if (!existsSync(output)) throw new Error('ZXPSignCmd completed without creating a ZXP package.');
console.log(`Created signed ZXP: ${output}`);
