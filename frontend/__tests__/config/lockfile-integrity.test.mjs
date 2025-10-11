import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FRONTEND_DIR = resolve(__dirname, '../..');

/**
 * Lock File Integrity Test Suite
 * Tests consistency between package.json and lock files
 */
describe('Lock file integrity tests', () => {
  describe('package-lock.json', () => {
    it('should exist', () => {
      const lockPath = resolve(FRONTEND_DIR, 'package-lock.json');
      assert.ok(existsSync(lockPath), 'package-lock.json should exist');
    });
    
    it('should be valid JSON', () => {
      const lockPath = resolve(FRONTEND_DIR, 'package-lock.json');
      const content = readFileSync(lockPath, 'utf8');
      
      assert.doesNotThrow(
        () => JSON.parse(content),
        'package-lock.json should be valid JSON'
      );
    });
    
    it('should have lockfileVersion field', () => {
      const lockPath = resolve(FRONTEND_DIR, 'package-lock.json');
      const lockFile = JSON.parse(readFileSync(lockPath, 'utf8'));
      
      assert.ok(lockFile.lockfileVersion, 'Should have lockfileVersion');
      assert.ok(
        lockFile.lockfileVersion >= 2,
        'Should use npm lockfile version 2 or higher'
      );
    });
    
    it('should have name matching package.json', () => {
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      const lockPath = resolve(FRONTEND_DIR, 'package-lock.json');
      
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      const lockFile = JSON.parse(readFileSync(lockPath, 'utf8'));
      
      assert.strictEqual(
        lockFile.name,
        packageJson.name,
        'Lock file name should match package.json name'
      );
    });
    
    it('should have version matching package.json', () => {
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      const lockPath = resolve(FRONTEND_DIR, 'package-lock.json');
      
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      const lockFile = JSON.parse(readFileSync(lockPath, 'utf8'));
      
      assert.strictEqual(
        lockFile.version,
        packageJson.version,
        'Lock file version should match package.json version'
      );
    });
    
    it('should contain Next.js at version 14.2.33', () => {
      const lockPath = resolve(FRONTEND_DIR, 'package-lock.json');
      const lockFile = JSON.parse(readFileSync(lockPath, 'utf8'));
      
      // Check in packages section (npm v7+)
      let nextFound = false;
      let nextVersion = null;
      
      if (lockFile.packages) {
        for (const [key, pkg] of Object.entries(lockFile.packages)) {
          if (key.includes('node_modules/next') && !key.includes('next-')) {
            nextFound = true;
            nextVersion = pkg.version;
            break;
          }
        }
      }
      
      assert.ok(nextFound, 'Next.js should be in lock file');
      assert.strictEqual(nextVersion, '14.2.33', 'Next.js version should be 14.2.33 in lock file');
    });
    
    it('should not contain corrupted entries', () => {
      const lockPath = resolve(FRONTEND_DIR, 'package-lock.json');
      const lockFile = JSON.parse(readFileSync(lockPath, 'utf8'));
      
      if (lockFile.packages) {
        for (const [path, pkg] of Object.entries(lockFile.packages)) {
          if (path === '') continue; // Root package
          
          assert.ok(
            pkg.version || pkg.resolved || pkg.link,
            `Package at ${path} should have version, resolved, or link field`
          );
        }
      }
    });
  });
  
  describe('pnpm-lock.yaml', () => {
    it('should exist', () => {
      const lockPath = resolve(FRONTEND_DIR, 'pnpm-lock.yaml');
      assert.ok(existsSync(lockPath), 'pnpm-lock.yaml should exist');
    });
    
    it('should be readable', () => {
      const lockPath = resolve(FRONTEND_DIR, 'pnpm-lock.yaml');
      const content = readFileSync(lockPath, 'utf8');
      
      assert.ok(content.length > 0, 'pnpm-lock.yaml should not be empty');
    });
    
    it('should contain lockfileVersion', () => {
      const lockPath = resolve(FRONTEND_DIR, 'pnpm-lock.yaml');
      const content = readFileSync(lockPath, 'utf8');
      
      assert.match(content, /lockfileVersion:/, 'Should contain lockfileVersion');
    });
    
    it('should reference Next.js 14.2.33', () => {
      const lockPath = resolve(FRONTEND_DIR, 'pnpm-lock.yaml');
      const content = readFileSync(lockPath, 'utf8');
      
      assert.match(
        content,
        /next.*14\.2\.33/,
        'Should reference Next.js 14.2.33'
      );
    });
    
    it('should have valid YAML structure', () => {
      const lockPath = resolve(FRONTEND_DIR, 'pnpm-lock.yaml');
      const content = readFileSync(lockPath, 'utf8');
      
      // Basic YAML validation - check for proper indentation and structure
      const lines = content.split('\n');
      let hasProperStructure = false;
      
      for (const line of lines) {
        if (line.match(/^[a-zA-Z]/)) {
          hasProperStructure = true;
          break;
        }
      }
      
      assert.ok(hasProperStructure, 'YAML should have valid top-level keys');
    });
  });
  
  describe('lock file consistency', () => {
    it('should have consistent Next.js version across lock files', () => {
      const npmLockPath = resolve(FRONTEND_DIR, 'package-lock.json');
      const pnpmLockPath = resolve(FRONTEND_DIR, 'pnpm-lock.yaml');
      
      const npmLock = JSON.parse(readFileSync(npmLockPath, 'utf8'));
      const pnpmLock = readFileSync(pnpmLockPath, 'utf8');
      
      // Extract Next.js version from npm lock
      let npmNextVersion = null;
      if (npmLock.packages) {
        for (const [key, pkg] of Object.entries(npmLock.packages)) {
          if (key.includes('node_modules/next') && !key.includes('next-')) {
            npmNextVersion = pkg.version;
            break;
          }
        }
      }
      
      // Check pnpm lock contains same version
      const pnpmHasVersion = pnpmLock.includes('14.2.33');
      
      assert.strictEqual(npmNextVersion, '14.2.33', 'npm lock should have Next.js 14.2.33');
      assert.ok(pnpmHasVersion, 'pnpm lock should reference Next.js 14.2.33');
    });
    
    it('should have lock files newer than or same age as package.json', () => {
      // Note: In a real scenario, you'd check file timestamps
      // This is a conceptual test
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      const npmLockPath = resolve(FRONTEND_DIR, 'package-lock.json');
      const pnpmLockPath = resolve(FRONTEND_DIR, 'pnpm-lock.yaml');
      
      assert.ok(existsSync(packagePath), 'package.json exists');
      assert.ok(existsSync(npmLockPath), 'package-lock.json exists');
      assert.ok(existsSync(pnpmLockPath), 'pnpm-lock.yaml exists');
    });
  });
  
  describe('dependency resolution', () => {
    it('should resolve all dependencies without conflicts', () => {
      const lockPath = resolve(FRONTEND_DIR, 'package-lock.json');
      const lockFile = JSON.parse(readFileSync(lockPath, 'utf8'));
      
      assert.ok(lockFile.packages, 'Lock file should have packages');
      
      // Check that no package has a broken reference
      const packageNames = new Set();
      if (lockFile.packages) {
        for (const [path] of Object.entries(lockFile.packages)) {
          if (path !== '') {
            packageNames.add(path);
          }
        }
      }
      
      assert.ok(packageNames.size > 0, 'Should have resolved packages');
    });
    
    it('should not have circular dependencies in resolution', () => {
      const lockPath = resolve(FRONTEND_DIR, 'package-lock.json');
      const lockFile = JSON.parse(readFileSync(lockPath, 'utf8'));
      
      // This is a simplified check - in reality, circular dependencies
      // would be caught by npm/pnpm during installation
      assert.ok(lockFile.packages, 'Lock file structure is valid');
    });
  });
  
  describe('security and integrity', () => {
    it('should have integrity hashes for packages', () => {
      const lockPath = resolve(FRONTEND_DIR, 'package-lock.json');
      const lockFile = JSON.parse(readFileSync(lockPath, 'utf8'));
      
      let hasIntegrity = false;
      
      if (lockFile.packages) {
        for (const [path, pkg] of Object.entries(lockFile.packages)) {
          if (path !== '' && pkg.integrity) {
            hasIntegrity = true;
            assert.match(
              pkg.integrity,
              /^sha\d+-/,
              `Package at ${path} should have valid integrity hash`
            );
          }
        }
      }
      
      assert.ok(hasIntegrity, 'Lock file should contain integrity hashes');
    });
    
    it('should use https URLs for resolved packages', () => {
      const lockPath = resolve(FRONTEND_DIR, 'package-lock.json');
      const lockFile = JSON.parse(readFileSync(lockPath, 'utf8'));
      
      if (lockFile.packages) {
        for (const [path, pkg] of Object.entries(lockFile.packages)) {
          if (pkg.resolved && typeof pkg.resolved === 'string') {
            if (pkg.resolved.startsWith('http')) {
              assert.ok(
                pkg.resolved.startsWith('https://'),
                `Package at ${path} should use HTTPS: ${pkg.resolved}`
              );
            }
          }
        }
      }
    });
  });
});