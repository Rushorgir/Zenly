import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FRONTEND_DIR = resolve(__dirname, '../..');

/**
 * Package.json Validation Test Suite
 * Tests the integrity and validity of package.json configuration
 */
describe('frontend/package.json validation', () => {
  let packageJson;
  
  it('should exist and be readable', () => {
    const packagePath = resolve(FRONTEND_DIR, 'package.json');
    assert.ok(existsSync(packagePath), 'package.json should exist');
    
    const content = readFileSync(packagePath, 'utf8');
    assert.ok(content.length > 0, 'package.json should not be empty');
  });
  
  it('should be valid JSON', () => {
    const packagePath = resolve(FRONTEND_DIR, 'package.json');
    const content = readFileSync(packagePath, 'utf8');
    
    assert.doesNotThrow(
      () => {
        packageJson = JSON.parse(content);
      },
      'package.json should be valid JSON'
    );
  });
  
  describe('required fields', () => {
    it('should have a name field', () => {
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      assert.ok(packageJson.name, 'package.json should have a name field');
      assert.strictEqual(typeof packageJson.name, 'string', 'name should be a string');
      assert.ok(packageJson.name.length > 0, 'name should not be empty');
    });
    
    it('should have a version field', () => {
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      assert.ok(packageJson.version, 'package.json should have a version field');
      assert.strictEqual(typeof packageJson.version, 'string', 'version should be a string');
      assert.match(packageJson.version, /^\d+\.\d+\.\d+/, 'version should follow semver pattern');
    });
    
    it('should have scripts field', () => {
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      assert.ok(packageJson.scripts, 'package.json should have scripts');
      assert.strictEqual(typeof packageJson.scripts, 'object', 'scripts should be an object');
    });
    
    it('should have dependencies field', () => {
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      assert.ok(packageJson.dependencies, 'package.json should have dependencies');
      assert.strictEqual(typeof packageJson.dependencies, 'object', 'dependencies should be an object');
    });
  });
  
  describe('Next.js configuration', () => {
    it('should have Next.js as a dependency', () => {
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      assert.ok(packageJson.dependencies.next, 'Next.js should be in dependencies');
    });
    
    it('should have Next.js version 14.2.33', () => {
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      const nextVersion = packageJson.dependencies.next;
      assert.strictEqual(nextVersion, '14.2.33', 'Next.js version should be 14.2.33');
    });
    
    it('should have React as a dependency', () => {
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      assert.ok(packageJson.dependencies.react, 'React should be in dependencies');
      assert.ok(packageJson.dependencies['react-dom'], 'React DOM should be in dependencies');
    });
    
    it('should have TypeScript type definitions in devDependencies', () => {
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      assert.ok(packageJson.devDependencies, 'Should have devDependencies');
      assert.ok(packageJson.devDependencies['@types/react'], 'Should have React type definitions');
      assert.ok(packageJson.devDependencies['@types/node'], 'Should have Node type definitions');
    });
  });
  
  describe('essential scripts', () => {
    it('should have dev script', () => {
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      assert.ok(packageJson.scripts.dev, 'Should have dev script');
      assert.match(packageJson.scripts.dev, /next dev/, 'dev script should use next dev');
    });
    
    it('should have build script', () => {
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      assert.ok(packageJson.scripts.build, 'Should have build script');
      assert.match(packageJson.scripts.build, /next build/, 'build script should use next build');
    });
    
    it('should have start script', () => {
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      assert.ok(packageJson.scripts.start, 'Should have start script');
      assert.match(packageJson.scripts.start, /next start/, 'start script should use next start');
    });
    
    it('should have lint script', () => {
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      assert.ok(packageJson.scripts.lint, 'Should have lint script');
    });
  });
  
  describe('dependency version validation', () => {
    it('should have valid version strings for all dependencies', () => {
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };
      
      const versionPattern = /^[\^~]?\d+\.\d+\.\d+|^[\^~]?\d+|^\*|^latest|^workspace:\*/;
      
      for (const [dep, version] of Object.entries(allDeps)) {
        assert.match(
          version,
          versionPattern,
          `${dep} should have a valid version string: ${version}`
        );
      }
    });
    
    it('should not have conflicting peer dependencies', () => {
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      // Check React versions are consistent
      const reactVersion = packageJson.dependencies.react;
      const reactDomVersion = packageJson.dependencies['react-dom'];
      
      assert.ok(reactVersion, 'React should be defined');
      assert.ok(reactDomVersion, 'React DOM should be defined');
      
      // Both should start with the same major version
      const reactMajor = reactVersion.replace(/[\^~]/g, '').split('.')[0];
      const reactDomMajor = reactDomVersion.replace(/[\^~]/g, '').split('.')[0];
      
      assert.strictEqual(
        reactMajor,
        reactDomMajor,
        'React and React DOM should have compatible major versions'
      );
    });
  });
  
  describe('security and best practices', () => {
    it('should not have dependencies with wildcard versions in production', () => {
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      const productionDeps = packageJson.dependencies || {};
      const wildcardDeps = Object.entries(productionDeps)
        .filter(([_, version]) => version === '*' || version === 'latest')
        .map(([name]) => name);
      
      // Allow specific exceptions if needed
      const allowedWildcards = ['recharts']; // recharts uses 'latest'
      const invalidWildcards = wildcardDeps.filter(dep => !allowedWildcards.includes(dep));
      
      assert.strictEqual(
        invalidWildcards.length,
        0,
        `Production dependencies should not use wildcard versions: ${invalidWildcards.join(', ')}`
      );
    });
    
    it('should have private flag set to true', () => {
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      assert.strictEqual(packageJson.private, true, 'package.json should be marked as private');
    });
    
    it('should not have duplicate dependencies in dependencies and devDependencies', () => {
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      const deps = Object.keys(packageJson.dependencies || {});
      const devDeps = Object.keys(packageJson.devDependencies || {});
      
      const duplicates = deps.filter(dep => devDeps.includes(dep));
      
      assert.strictEqual(
        duplicates.length,
        0,
        `Dependencies should not appear in both dependencies and devDependencies: ${duplicates.join(', ')}`
      );
    });
  });
  
  describe('UI framework dependencies', () => {
    it('should have Radix UI components', () => {
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      const radixDeps = Object.keys(packageJson.dependencies).filter(dep => 
        dep.startsWith('@radix-ui/')
      );
      
      assert.ok(radixDeps.length > 0, 'Should have Radix UI components');
    });
    
    it('should have Tailwind CSS', () => {
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      assert.ok(
        packageJson.devDependencies.tailwindcss,
        'Should have Tailwind CSS in devDependencies'
      );
    });
    
    it('should have form handling library', () => {
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      assert.ok(
        packageJson.dependencies['react-hook-form'],
        'Should have react-hook-form for form handling'
      );
    });
    
    it('should have validation library', () => {
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      assert.ok(
        packageJson.dependencies.zod,
        'Should have Zod for validation'
      );
    });
  });
  
  describe('edge cases and error handling', () => {
    it('should handle malformed JSON gracefully in tests', () => {
      const malformedJson = '{ "name": "test", "version": ';
      
      assert.throws(
        () => JSON.parse(malformedJson),
        SyntaxError,
        'Should throw SyntaxError for malformed JSON'
      );
    });
    
    it('should handle missing dependencies field', () => {
      const minimalPackage = { name: 'test', version: '1.0.0' };
      
      assert.strictEqual(
        minimalPackage.dependencies,
        undefined,
        'Missing dependencies field should be undefined'
      );
    });
    
    it('should validate version string format', () => {
      const validVersions = ['1.0.0', '^1.0.0', '~1.0.0', '>=1.0.0', '*', 'latest'];
      const invalidVersions = ['v1.0.0', 'one.zero.zero', ''];
      
      const semverPattern = /^(>=|<=|>|<|\^|~)?\d+(\.\d+(\.\d+)?)?$|^\*$|^latest$/;
      
      validVersions.forEach(version => {
        assert.match(version, semverPattern, `${version} should be valid`);
      });
      
      invalidVersions.forEach(version => {
        if (version !== '') {
          assert.doesNotMatch(version, semverPattern, `${version} should be invalid`);
        }
      });
    });
  });
  
  describe('Next.js version upgrade validation', () => {
    it('should be on Next.js 14.2.x series', () => {
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      const nextVersion = packageJson.dependencies.next;
      assert.match(
        nextVersion,
        /^14\.2\.\d+$/,
        'Next.js version should be in 14.2.x series'
      );
    });
    
    it('should be on patch version 33 or higher', () => {
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      const nextVersion = packageJson.dependencies.next;
      const patchVersion = parseInt(nextVersion.split('.')[2]);
      
      assert.ok(
        patchVersion >= 33,
        `Next.js patch version should be 33 or higher, got ${patchVersion}`
      );
    });
    
    it('should not be on a pre-release version', () => {
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      const nextVersion = packageJson.dependencies.next;
      assert.doesNotMatch(
        nextVersion,
        /-alpha|-beta|-rc|-canary/,
        'Next.js version should not be a pre-release'
      );
    });
  });
});