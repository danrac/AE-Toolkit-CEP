#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');

// Check if release-manifest.json exists
function checkManifestExists() {
  const manifestPath = resolve(root, 'dist/release-manifest.json');
  if (existsSync(manifestPath)) {
    console.log('PASS: Release manifest exists');
    return true;
  } else {
    console.log('FAIL: Release manifest does not exist');
    return false;
  }
}

// Read and parse the manifest
function readManifest() {
  const manifestPath = resolve(root, 'dist/release-manifest.json');
  try {
    const manifestContent = readFileSync(manifestPath, 'utf8');
    return JSON.parse(manifestContent);
  } catch (error) {
    console.error('FAIL: Could not parse release manifest:', error.message);
    return null;
  }
}

// Check package version matches prepared version
function checkPackageVersion(manifest) {
  const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
  if (packageJson.version === manifest.version) {
    console.log('PASS: Package version matches prepared version');
    return true;
  } else {
    console.log('FAIL: Package version does not match prepared version');
    return false;
  }
}

// Check manifest version matches
function checkManifestVersion(manifest) {
  const manifestContent = readFileSync(resolve(root, 'CSXS/manifest.xml'), 'utf8');
  const versionMatch = manifestContent.match(/ExtensionBundleVersion="([^"]+)"/);
  if (versionMatch && versionMatch[1] === manifest.version) {
    console.log('PASS: Manifest version matches prepared version');
    return true;
  } else {
    console.log('FAIL: Manifest version does not match prepared version');
    return false;
  }
}

// Check artifact exists
function checkArtifactExists(manifest) {
  if (existsSync(manifest.artifact)) {
    console.log('PASS: Artifact exists');
    return true;
  } else {
    console.log('FAIL: Artifact does not exist');
    return false;
  }
}

// Check filename matches version
function checkFilenameMatchesVersion(manifest) {
  const expectedFilename = `AE-Toolkit-CEP-v${manifest.version}.zxp`;
  const actualFilename = manifest.artifact.split('/').pop();
  if (actualFilename === expectedFilename) {
    console.log('PASS: Artifact filename matches version');
    return true;
  } else {
    console.log('FAIL: Artifact filename does not match version');
    return false;
  }
}

// Check SHA-256 matches manifest
function checkSha256Matches(manifest) {
  if (!existsSync(manifest.artifact)) {
    console.log('FAIL: Cannot verify SHA-256, artifact does not exist');
    return false;
  }
  
  const fileBuffer = readFileSync(manifest.artifact);
  const calculatedSha256 = createHash('sha256').update(fileBuffer).digest('hex');
  
  if (calculatedSha256 === manifest.sha256) {
    console.log('PASS: SHA-256 matches manifest');
    return true;
  } else {
    console.log('FAIL: SHA-256 does not match manifest');
    return false;
  }
}

// Check ZXP is non-zero size
function checkZxpSize(manifest) {
  if (!existsSync(manifest.artifact)) {
    console.log('FAIL: Cannot check size, artifact does not exist');
    return false;
  }
  
  const stats = statSync(manifest.artifact);
  if (stats.size > 0) {
    console.log(`PASS: ZXP is ${stats.size} bytes (non-zero)`);
    return true;
  } else {
    console.log('FAIL: ZXP is zero bytes');
    return false;
  }
}

// Check signing verification
function checkSigningVerification(manifest) {
  if (!existsSync(manifest.artifact)) {
    console.log('FAIL: Cannot verify signature, artifact does not exist');
    return false;
  }
  
  // Try to verify signature using unzip command (if available)
  try {
    const result = spawnSync('unzip', ['-l', manifest.artifact], { cwd: root, stdio: 'pipe' });
    if (result.status === 0 && result.stdout.toString().includes('signer')) {
      console.log('PASS: Signature verification successful');
      return true;
    } else {
      console.log('WARN: Could not verify signature (unzip command may not be available or ZXP not signed)');
      return false;
    }
  } catch (error) {
    console.log('WARN: Could not verify signature (unzip command not available or error occurred)');
    return false;
  }
}

// Check prospective git tag does not already exist locally
function checkLocalTagExists(manifest) {
  const tag = manifest.tag;
  try {
    const result = spawnSync('git', ['rev-parse', tag], { cwd: root, stdio: 'pipe' });
    if (result.status === 0) {
      console.log(`FAIL: Tag ${tag} already exists locally`);
      return false;
    } else {
      console.log(`PASS: Tag ${tag} does not exist locally`);
      return true;
    }
  } catch (error) {
    console.log(`PASS: Tag ${tag} does not exist locally`);
    return true;
  }
}

// Check prospective git tag does not already exist remotely
function checkRemoteTagExists(manifest) {
  const tag = manifest.tag;
  try {
    const result = spawnSync('git', ['ls-remote', '--tags', 'origin', tag], { cwd: root, stdio: 'pipe' });
    if (result.status === 0 && result.stdout.toString().trim()) {
      console.log(`FAIL: Tag ${tag} already exists remotely`);
      return false;
    } else {
      console.log(`PASS: Tag ${tag} does not exist remotely`);
      return true;
    }
  } catch (error) {
    console.log(`WARN: Could not check remote tag existence for ${tag}`);
    return false;
  }
}

// Check GitHub release does not already exist
function checkGitHubReleaseExists(manifest) {
  const tag = manifest.tag;
  try {
    const result = spawnSync('gh', ['release', 'view', tag], { cwd: root, stdio: 'pipe' });
    if (result.status === 0) {
      console.log(`FAIL: GitHub release with tag ${tag} already exists`);
      return false;
    } else {
      console.log(`PASS: No GitHub release exists with tag ${tag}`);
      return true;
    }
  } catch (error) {
    console.log(`PASS: No GitHub release exists with tag ${tag}`);
    return true;
  }
}

// Main verification function
function runVerification() {
  console.log('=== RELEASE VERIFICATION ===\n');
  
  // Check manifest exists
  if (!checkManifestExists()) {
    process.exit(1);
  }
  
  const manifest = readManifest();
  if (!manifest) {
    process.exit(1);
  }
  
  const checks = [
    checkPackageVersion.bind(null, manifest),
    checkManifestVersion.bind(null, manifest),
    checkArtifactExists.bind(null, manifest),
    checkFilenameMatchesVersion.bind(null, manifest),
    checkSha256Matches.bind(null, manifest),
    checkZxpSize.bind(null, manifest),
    checkSigningVerification.bind(null, manifest),
    checkLocalTagExists.bind(null, manifest),
    checkRemoteTagExists.bind(null, manifest),
    checkGitHubReleaseExists.bind(null, manifest)
  ];
  
  let passCount = 0;
  let failCount = 0;
  
  for (const check of checks) {
    const result = check();
    if (result === true) {
      passCount++;
    } else if (result === false) {
      failCount++;
    }
  }
  
  console.log('\n=== VERIFICATION SUMMARY ===');
  console.log(`PASS: ${passCount}`);
  console.log(`FAIL: ${failCount}`);
  
  if (failCount > 0) {
    console.log('\n❌ Some verification checks failed.');
    process.exit(1);
  } else {
    console.log('\n✅ All verification checks passed.');
    return true;
  }
}

runVerification();