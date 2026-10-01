#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

console.log('=== LOCAL RELEASE DRY RUN ===\n');

// Get current version
const currentVersion = packageJson.version;
console.log(`Current version: ${currentVersion}`);

// Calculate next version (patch bump for demo)
const versionParts = currentVersion.split('.').map(part => parseInt(part, 10));
const nextVersion = `${versionParts[0]}.${versionParts[1]}.${versionParts[2] + 1}`;
console.log(`Next version: ${nextVersion}`);

const tag = `v${nextVersion}`;
console.log(`Tag: ${tag}`);

const artifact = `dist/AE-Toolkit-CEP-${tag}.zxp`;
console.log(`Artifact: ${artifact}`);

// Get repository info
try {
  const remoteResult = spawnSync('git', ['remote', 'get-url', 'origin'], { cwd: root, stdio: 'pipe' });
  if (remoteResult.status === 0) {
    console.log(`GitHub repository: ${remoteResult.stdout.toString().trim()}`);
  }
} catch (error) {
  console.log('GitHub repository: Unknown');
}

// Get current branch
try {
  const branchResult = spawnSync('git', ['branch', '--show-current'], { cwd: root, stdio: 'pipe' });
  if (branchResult.status === 0) {
    console.log(`Branch: ${branchResult.stdout.toString().trim()}`);
  }
} catch (error) {
  console.log('Branch: Unknown');
}

console.log('\n=== DRY RUN PLAN ===');
console.log('Would run:');
console.log('  - npm test');
console.log('  - npm run release:check');
console.log('  - npm run package:stage');
console.log('  - npm run package:zxp (if signing configured)');

console.log('\nWould later publish:');
console.log('  - git commit (not executed in dry-run)');
console.log('  - git tag (not executed in dry-run)');
console.log('  - git push (not executed in dry-run)');
console.log('  - gh release create (not executed in dry-run)');
console.log('  - artifact upload (not executed in dry-run)');

// Check signing prerequisites
console.log('\n=== SIGNING PREREQUISITES ===');
const signer = process.env.ZXPSIGNCMD_PATH;
const certificate = process.env.ZXP_CERT_PATH;
const password = process.env.ZXP_CERT_PASSWORD;

if (signer && certificate && password) {
  console.log('✅ Signing configuration is available');
  console.log(`   ZXPSIGNCMD_PATH: ${signer}`);
  console.log(`   ZXP_CERT_PATH: ${certificate}`);
  console.log('   ZXP_CERT_PASSWORD: [set but not displayed]');
} else {
  console.log('⚠️  Signing configuration is incomplete');
  if (!signer) console.log('   Missing ZXPSIGNCMD_PATH');
  if (!certificate) console.log('   Missing ZXP_CERT_PATH'); 
  if (!password) console.log('   Missing ZXP_CERT_PASSWORD');
}

console.log('\n=== DRY RUN COMPLETE ===');
console.log('This was a dry run - no changes were made to the repository.');