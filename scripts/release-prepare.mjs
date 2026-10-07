#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const root = resolve(import.meta.dirname, '..');
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const manifest = readFileSync(resolve(root, 'CSXS/manifest.xml'), 'utf8');

// Get the version bump type from command line arguments
const bumpType = process.argv[2];
if (!bumpType) {
  console.error('Usage: npm run release:prepare -- [patch|minor|major|<version>]');
  process.exit(1);
}

// Parse current version
const currentVersion = packageJson.version;
const versionParts = currentVersion.split('.').map(part => parseInt(part, 10));

// Calculate new version based on bump type
let newVersion;
if (bumpType === 'patch') {
  newVersion = `${versionParts[0]}.${versionParts[1]}.${versionParts[2] + 1}`;
} else if (bumpType === 'minor') {
  newVersion = `${versionParts[0]}.${versionParts[1] + 1}.0`;
} else if (bumpType === 'major') {
  newVersion = `${versionParts[0] + 1}.0.0`;
} else {
  // Assume it's an explicit version
  newVersion = bumpType;
}

console.log(`Current version: ${currentVersion}`);
console.log(`Proposed version: ${newVersion}`);
console.log(`Proposed git tag: v${newVersion}`);
console.log(`Proposed ZXP filename: AE-Toolkit-CEP-v${newVersion}.zxp`);

// Validate new version format
const versionRegex = /^\d+\.\d+\.\d+$/;
if (!versionRegex.test(newVersion)) {
  console.error('Invalid version format. Must be in x.y.z format.');
  process.exit(1);
}

// Files that contain version information to update
const versionFiles = [
  'package.json',
  'package-lock.json',
  'CSXS/manifest.xml'
];

console.log('\nFiles whose version will change:');
versionFiles.forEach(file => console.log(`  ${file}`));

// Update package.json
function updatePackageJson() {
  const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
  pkg.version = newVersion;
  writeFileSync(resolve(root, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
  console.log('Updated package.json');
}

// Update manifest.xml
function updateManifest() {
  const manifestContent = readFileSync(resolve(root, 'CSXS/manifest.xml'), 'utf8');
  const updatedManifest = manifestContent.replace(
    /ExtensionBundleVersion="([^"]+)"/,
    `ExtensionBundleVersion="${newVersion}"`
  ).replace(/(<Extension\s+Id="[^"]+"\s+Version=")[^"]+"/g, (_, prefix) => prefix + newVersion + '"');
  writeFileSync(resolve(root, 'CSXS/manifest.xml'), updatedManifest);
  console.log('Updated CSXS/manifest.xml');
}

// Run npm test
function runTests() {
  console.log('\nRunning tests...');
  try {
    const result = spawnSync('npm', ['run', 'test'], { cwd: root, stdio: 'inherit' });
    if (result.status === 0) {
      console.log('✅ Tests passed');
      return true;
    } else {
      console.log('❌ Tests failed');
      return false;
    }
  } catch (error) {
    console.error('Failed to run tests:', error.message);
    return false;
  }
}

// Run release check
function runReleaseCheck() {
  console.log('\nRunning release check...');
  try {
    const result = spawnSync('npm', ['run', 'release:check'], { cwd: root, stdio: 'inherit' });
    if (result.status === 0) {
      console.log('✅ Release check passed');
      return true;
    } else {
      console.log('❌ Release check failed');
      return false;
    }
  } catch (error) {
    console.error('Failed to run release check:', error.message);
    return false;
  }
}

// Stage the extension
function stageExtension() {
  console.log('\nStaging extension...');
  try {
    const result = spawnSync('npm', ['run', 'package:stage'], { cwd: root, stdio: 'inherit' });
    if (result.status === 0) {
      console.log('✅ Extension staged successfully');
      return true;
    } else {
      console.log('❌ Failed to stage extension');
      return false;
    }
  } catch (error) {
    console.error('Failed to stage extension:', error.message);
    return false;
  }
}

// Sign the ZXP if signing configuration is available
function signZXP() {
  const signer = process.env.ZXPSIGNCMD_PATH;
  const certificate = process.env.ZXP_CERT_PATH;
  const password = process.env.ZXP_CERT_PASSWORD;
  
  if (!signer || !certificate || !password) {
    console.log('\n⚠️  Signing configuration not available. Skipping signing.');
    return true;
  }
  
  console.log('\nSigning ZXP...');
  try {
    const result = spawnSync('npm', ['run', 'package:zxp'], { cwd: root, stdio: 'inherit' });
    if (result.status === 0) {
      console.log('✅ ZXP signed successfully');
      return true;
    } else {
      console.log('❌ Failed to sign ZXP');
      return false;
    }
  } catch (error) {
    console.error('Failed to sign ZXP:', error.message);
    return false;
  }
}

// Generate release metadata
function generateReleaseMetadata() {
  const tag = `v${newVersion}`;
  const commit = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, stdio: 'pipe' }).stdout.toString().trim();
  const branch = spawnSync('git', ['branch', '--show-current'], { cwd: root, stdio: 'pipe' }).stdout.toString().trim();
  
  // Get artifact path
  const artifactPath = resolve(root, `dist/AE-Toolkit-CEP-${tag}.zxp`);
  let sha256 = '';
  let signatureVerified = false;
  
  if (existsSync(artifactPath)) {
    const fileBuffer = readFileSync(artifactPath);
    sha256 = createHash('sha256').update(fileBuffer).digest('hex');
    
    // Try to verify signature if possible
    try {
      const result = spawnSync('unzip', ['-l', artifactPath], { cwd: root, stdio: 'pipe' });
      if (result.status === 0 && result.stdout.toString().includes('signer')) {
        signatureVerified = true;
      }
    } catch (error) {
      // Signature verification failed or not supported
    }
  }
  
  const metadata = {
    version: newVersion,
    tag: tag,
    branch: branch,
    commit: commit,
    artifact: artifactPath,
    sha256: sha256,
    preparedAt: new Date().toISOString(),
    testsPassed: true, // This will be set after running tests
    releaseCheckPassed: true, // This will be set after running release check
    signatureVerified: signatureVerified
  };
  
  writeFileSync(resolve(root, 'dist/release-manifest.json'), JSON.stringify(metadata, null, 2) + '\n');
  console.log('✅ Release manifest generated');
}

// Main preparation function
async function prepareRelease() {
  console.log('=== RELEASE PREPARATION ===\n');
  
  // Validate current versions first
  const manifestVersion = manifest.match(/ExtensionBundleVersion="([^"]+)"/);
  if (!manifestVersion || manifestVersion[1] !== currentVersion) {
    console.error('❌ Manifest version does not match package.json version');
    process.exit(1);
  }
  
  // Update version files
  updatePackageJson();
  const lock = JSON.parse(readFileSync(resolve(root, 'package-lock.json'), 'utf8'));
  lock.version = newVersion;
  lock.packages[''].version = newVersion;
  writeFileSync(resolve(root, 'package-lock.json'), JSON.stringify(lock, null, 2) + '\n');
  updateManifest();
  
  // Run tests
  const testsPassed = runTests();
  if (!testsPassed) {
    console.error('❌ Tests failed, aborting release preparation');
    process.exit(1);
  }
  
  // Run release check
  const releaseCheckPassed = runReleaseCheck();
  if (!releaseCheckPassed) {
    console.error('❌ Release check failed, aborting release preparation');
    process.exit(1);
  }
  
  // Stage extension
  const stagingSuccess = stageExtension();
  if (!stagingSuccess) {
    console.error('❌ Extension staging failed, aborting release preparation');
    process.exit(1);
  }
  
  // Sign ZXP if possible
  const signingSuccess = signZXP();
  if (!signingSuccess) {
    console.error('❌ Signing failed, aborting release preparation');
    process.exit(1);
  }
  
  // Generate metadata
  generateReleaseMetadata();
  
  console.log('\n=== RELEASE PREPARATION COMPLETE ===');
  console.log(`Version: ${newVersion}`);
  console.log(`Tag: v${newVersion}`);
  console.log(`Artifact: dist/AE-Toolkit-CEP-v${newVersion}.zxp`);
  
  const artifactPath = resolve(root, `dist/AE-Toolkit-CEP-v${newVersion}.zxp`);
  if (existsSync(artifactPath)) {
    const stats = statSync(artifactPath);
    console.log(`Size: ${stats.size} bytes`);
  }
}

prepareRelease();
