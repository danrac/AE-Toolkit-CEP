#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const manifest = readFileSync(resolve(root, 'CSXS/manifest.xml'), 'utf8');

// Check if we're in a git repository
function checkGitRepository() {
  try {
    execFileSync('git', ['rev-parse', '--git-dir'], { cwd: root, stdio: 'ignore' });
    console.log('PASS: Running inside expected git repository');
    return true;
  } catch (error) {
    console.log('FAIL: Not running inside a git repository');
    return false;
  }
}

// Check if git executable exists
function checkGitExecutable() {
  try {
    execFileSync('git', ['--version'], { stdio: 'ignore' });
    console.log('PASS: Git executable exists');
    return true;
  } catch (error) {
    console.log('FAIL: Git executable not found');
    return false;
  }
}

// Check if gh executable exists
function checkGhExecutable() {
  try {
    execFileSync('gh', ['--version'], { stdio: 'ignore' });
    console.log('PASS: GitHub CLI (gh) executable exists');
    return true;
  } catch (error) {
    console.log('WARN: GitHub CLI (gh) executable not found');
    return false;
  }
}

// Check if gh auth status succeeds
function checkGhAuth() {
  try {
    const result = spawnSync('gh', ['auth', 'status'], { cwd: root, stdio: 'pipe' });
    if (result.status === 0) {
      console.log('PASS: GitHub CLI authenticated');
      return true;
    } else {
      console.log('WARN: GitHub CLI not authenticated');
      return undefined; // Return undefined for warning, not false
    }
  } catch (error) {
    console.log('WARN: Could not check GitHub CLI authentication');
    return undefined; // Return undefined for warning, not false
  }
}

// Check if origin remote exists
function checkOriginRemote() {
  try {
    const result = spawnSync('git', ['remote', 'get-url', 'origin'], { cwd: root, stdio: 'pipe' });
    if (result.status === 0) {
      console.log('PASS: Origin remote exists');
      return true;
    } else {
      console.log('FAIL: Origin remote does not exist');
      return false;
    }
  } catch (error) {
    console.log('FAIL: Could not check origin remote');
    return false;
  }
}

// Check current branch
function checkCurrentBranch() {
  try {
    const result = spawnSync('git', ['branch', '--show-current'], { cwd: root, stdio: 'pipe' });
    if (result.status === 0) {
      console.log(`PASS: Current branch is ${result.stdout.toString().trim()}`);
      return true;
    } else {
      console.log('FAIL: Could not determine current branch');
      return false;
    }
  } catch (error) {
    console.log('FAIL: Could not check current branch');
    return false;
  }
}

// Check git working tree status
function checkWorkingTreeStatus() {
  try {
    const result = spawnSync('git', ['status', '--porcelain'], { cwd: root, stdio: 'pipe' });
    if (result.status === 0 && result.stdout.toString().trim() === '') {
      console.log('PASS: Git working tree is clean');
      return true;
    } else {
      console.log('WARN: Git working tree has uncommitted changes');
      if (result.stdout.toString().trim()) {
        console.log(`Uncommitted changes:\n${result.stdout.toString()}`);
      }
      return false;
    }
  } catch (error) {
    console.log('FAIL: Could not check git working tree status');
    return false;
  }
}

// Check package.json version
function checkPackageVersion() {
  if (packageJson.version) {
    console.log(`PASS: Package version is ${packageJson.version}`);
    return true;
  } else {
    console.log('FAIL: Package version not found in package.json');
    return false;
  }
}

// Check manifest version
function checkManifestVersion() {
  const versionMatch = manifest.match(/ExtensionBundleVersion="([^"]+)"/);
  if (versionMatch && versionMatch[1]) {
    console.log(`PASS: Manifest version is ${versionMatch[1]}`);
    return true;
  } else {
    console.log('FAIL: Manifest version not found in CSXS/manifest.xml');
    return false;
  }
}

// Check versions match
function checkVersionsMatch() {
  const manifestVersion = manifest.match(/ExtensionBundleVersion="([^"]+)"/);
  if (manifestVersion && manifestVersion[1] === packageJson.version) {
    console.log('PASS: Package version matches manifest version');
    return true;
  } else {
    console.log('FAIL: Package version does not match manifest version');
    return false;
  }
}

// Check Node/npm availability
function checkNodeNpm() {
  try {
    execFileSync('node', ['--version'], { stdio: 'ignore' });
    execFileSync('npm', ['--version'], { stdio: 'ignore' });
    console.log('PASS: Node.js and npm are available');
    return true;
  } catch (error) {
    console.log('FAIL: Node.js or npm not found');
    return false;
  }
}

// Check required dependencies
function checkDependencies() {
  try {
    execFileSync('npm', ['ls'], { cwd: root, stdio: 'ignore' });
    console.log('PASS: Required dependencies are installed');
    return true;
  } catch (error) {
    console.log('FAIL: Required dependencies not installed');
    return false;
  }
}

// Check if existing tests can run
function checkTests() {
  try {
    const result = spawnSync('npm', ['run', 'test'], { cwd: root, stdio: 'pipe' });
    if (result.status === 0) {
      console.log('PASS: Existing tests can run successfully');
      return true;
    } else {
      console.log('FAIL: Existing tests failed to run');
      return false;
    }
  } catch (error) {
    console.log('FAIL: Could not run existing tests');
    return false;
  }
}

// Check if release check can run
function checkReleaseCheck() {
  try {
    const result = spawnSync('npm', ['run', 'release:check'], { cwd: root, stdio: 'pipe' });
    if (result.status === 0) {
      console.log('PASS: Release check can run successfully');
      return true;
    } else {
      console.log('FAIL: Release check failed to run');
      return false;
    }
  } catch (error) {
    console.log('FAIL: Could not run release check');
    return false;
  }
}

// Check ZXPSIGNCMD_PATH status
function checkZXPSignCmdPath() {
  const signer = process.env.ZXPSIGNCMD_PATH;
  if (signer) {
    if (existsSync(signer)) {
      console.log('PASS: ZXPSIGNCMD_PATH is set and points to existing file');
      return true;
    } else {
      console.log('FAIL: ZXPSIGNCMD_PATH is set but points to non-existent file');
      return false;
    }
  } else {
    console.log('WARN: ZXPSIGNCMD_PATH is not set');
    return undefined; // Return undefined for warning, not false
  }
}

// Check ZXP_CERT_PATH status
function checkZPxCertPath() {
  const certificate = process.env.ZXP_CERT_PATH;
  if (certificate) {
    if (existsSync(certificate)) {
      console.log('PASS: ZXP_CERT_PATH is set and points to existing file');
      return true;
    } else {
      console.log('FAIL: ZXP_CERT_PATH is set but points to non-existent file');
      return false;
    }
  } else {
    console.log('WARN: ZXP_CERT_PATH is not set');
    return undefined; // Return undefined for warning, not false
  }
}

// Check ZXP_CERT_PASSWORD status
function checkZPxCertPassword() {
  const password = process.env.ZXP_CERT_PASSWORD;
  if (password) {
    console.log('PASS: ZXP_CERT_PASSWORD is set (not displayed)');
    return true;
  } else {
    console.log('WARN: ZXP_CERT_PASSWORD is not set');
    return undefined; // Return undefined for warning, not false
  }
}

// Check signing certificate exists if configured
function checkSigningCertificate() {
  const certificate = process.env.ZXP_CERT_PATH;
  const password = process.env.ZXP_CERT_PASSWORD;
  
  if (certificate && password) {
    if (existsSync(certificate)) {
      console.log('PASS: Signing certificate exists');
      return true;
    } else {
      console.log('FAIL: Signing certificate does not exist at specified path');
      return false;
    }
  } else if (certificate || password) {
    console.log('WARN: Partial signing configuration - missing either certificate or password');
    return undefined; // Return undefined for warning, not false
  } else {
    console.log('INFO: No signing configuration provided');
    return true; // Not an error, just no configuration
  }
}

// Check ZXPSignCmd exists if configured
function checkZXPSignCmd() {
  const signer = process.env.ZXPSIGNCMD_PATH;
  
  if (signer) {
    if (existsSync(signer)) {
      console.log('PASS: ZXPSignCmd executable exists');
      return true;
    } else {
      console.log('FAIL: ZXPSignCmd executable does not exist at specified path');
      return false;
    }
  } else {
    console.log('INFO: No ZXPSignCmd configured');
    return true; // Not an error, just no configuration
  }
}

// Check if prospective version/tag already exists locally
function checkLocalTagExists() {
  const tag = `v${packageJson.version}`;
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

// Check if prospective tag already exists remotely
function checkRemoteTagExists() {
  const tag = `v${packageJson.version}`;
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
    return undefined; // Return undefined for warning, not false
  }
}

// Check if GitHub release with prospective tag already exists
function checkGitHubReleaseExists() {
  const tag = `v${packageJson.version}`;
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

// Main preflight check function
function runPreflightChecks() {
  console.log('=== RELEASE PREFLIGHT CHECKS ===\n');
  
  const checks = [
    checkGitRepository,
    checkGitExecutable,
    checkGhExecutable,
    checkGhAuth,
    checkOriginRemote,
    checkCurrentBranch,
    checkWorkingTreeStatus,
    checkPackageVersion,
    checkManifestVersion,
    checkVersionsMatch,
    checkNodeNpm,
    checkDependencies,
    checkTests,
    checkReleaseCheck,
    checkZXPSignCmdPath,
    checkZPxCertPath,
    checkZPxCertPassword,
    checkSigningCertificate,
    checkZXPSignCmd,
    checkLocalTagExists,
    checkRemoteTagExists,
    checkGitHubReleaseExists
  ];
  
  let passCount = 0;
  let warnCount = 0;
  let failCount = 0;
  
  for (const check of checks) {
    const result = check();
    if (result === true) {
      passCount++;
    } else if (result === false) {
      failCount++;
    } else if (result === undefined) {
      warnCount++;
    }
    console.log(''); // Empty line for readability
  }
  
  console.log('=== PREFLIGHT SUMMARY ===');
  console.log(`PASS: ${passCount}`);
  console.log(`WARN: ${warnCount}`);
  console.log(`FAIL: ${failCount}`);
  
  if (failCount > 0) {
    console.log('\n❌ Preflight checks failed. Please fix the issues above.');
    process.exit(1);
  } else {
    if (warnCount > 0) {
      console.log('\n⚠️  Preflight completed with warnings.');
    } else {
      console.log('\n✅ All preflight checks passed.');
    }
    return true;
  }
}

runPreflightChecks();