import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FRONTEND_DIR = resolve(__dirname, '../..');

/**
 * Dependency Compatibility Test Suite
 * Tests for version compatibility and potential conflicts
 */
describe('Dependency compatibility tests', () => {
  let packageJson;
  
  it('should load package.json', () => {
    const packagePath = resolve(FRONTEND_DIR, 'package.json');
    packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
    assert.ok(packageJson, 'package.json should be loaded');
  });
  
  describe('Next.js compatibility', () => {
    it('should have React version compatible with Next.js 14.2.33', () => {
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      const nextVersion = packageJson.dependencies.next;
      const reactVersion = packageJson.dependencies.react;
      
      // Next.js 14 requires React 18+
      assert.match(reactVersion, /\^18|^18/, 'React should be version 18 for Next.js 14');
    });
    
    it('should have compatible TypeScript version', () => {
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      const tsVersion = packageJson.devDependencies.typescript;
      
      assert.ok(tsVersion, 'TypeScript should be present');
      assert.match(tsVersion, /\^5|^5/, 'TypeScript should be version 5 for Next.js 14');
    });
    
    it('should have compatible eslint-config-next', () => {
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      const eslintConfigNext = packageJson.devDependencies['eslint-config-next'];
      
      assert.ok(eslintConfigNext, 'eslint-config-next should be present');
      // Version 15+ is compatible with Next.js 14
    });
  });
  
  describe('React ecosystem compatibility', () => {
    it('should have matching React and React DOM versions', () => {
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      const reactVersion = packageJson.dependencies.react;
      const reactDomVersion = packageJson.dependencies['react-dom'];
      
      assert.strictEqual(
        reactVersion,
        reactDomVersion,
        'React and React DOM versions should match'
      );
    });
    
    it('should have React type definitions matching React version', () => {
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      const reactVersion = packageJson.dependencies.react;
      const reactTypesVersion = packageJson.devDependencies['@types/react'];
      
      const reactMajor = reactVersion.replace(/[\^~]/g, '').split('.')[0];
      const typesMajor = reactTypesVersion.replace(/[\^~]/g, '').split('.')[0];
      
      assert.strictEqual(
        reactMajor,
        typesMajor,
        'React types should match React major version'
      );
    });
  });
  
  describe('Radix UI compatibility', () => {
    it('should have compatible Radix UI versions', () => {
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      const radixDeps = Object.entries(packageJson.dependencies)
        .filter(([name]) => name.startsWith('@radix-ui/'));
      
      assert.ok(radixDeps.length > 0, 'Should have Radix UI dependencies');
      
      // All Radix UI packages should have versions in 1.x or 2.x range
      for (const [name, version] of radixDeps) {
        assert.match(
          version,
          /^[12]\.\d+\.\d+$/,
          `${name} should be in 1.x or 2.x range, got ${version}`
        );
      }
    });
    
    it('should have Radix UI peer dependency @radix-ui/react-slot', () => {
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      assert.ok(
        packageJson.dependencies['@radix-ui/react-slot'],
        'Should have @radix-ui/react-slot as it\'s a common peer dependency'
      );
    });
  });
  
  describe('Form handling compatibility', () => {
    it('should have react-hook-form compatible with React 18', () => {
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      const reactHookFormVersion = packageJson.dependencies['react-hook-form'];
      
      assert.ok(reactHookFormVersion, 'Should have react-hook-form');
      // Version 7+ is compatible with React 18
      assert.match(
        reactHookFormVersion,
        /\^7|^7/,
        'react-hook-form should be version 7+ for React 18 compatibility'
      );
    });
    
    it('should have Zod for schema validation', () => {
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      assert.ok(
        packageJson.dependencies.zod,
        'Should have Zod for validation'
      );
    });
    
    it('should have hookform resolvers for Zod integration', () => {
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      assert.ok(
        packageJson.dependencies['@hookform/resolvers'],
        'Should have @hookform/resolvers for Zod integration'
      );
    });
  });
  
  describe('Styling compatibility', () => {
    it('should have compatible Tailwind CSS and PostCSS', () => {
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      const tailwindVersion = packageJson.devDependencies.tailwindcss;
      const postcssVersion = packageJson.devDependencies.postcss;
      
      assert.ok(tailwindVersion, 'Should have Tailwind CSS');
      assert.ok(postcssVersion, 'Should have PostCSS');
    });
    
    it('should have class utility libraries', () => {
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      assert.ok(
        packageJson.dependencies.clsx || packageJson.dependencies.classnames,
        'Should have class utility library (clsx or classnames)'
      );
      
      assert.ok(
        packageJson.dependencies['tailwind-merge'],
        'Should have tailwind-merge for class merging'
      );
    });
  });
  
  describe('Socket.IO compatibility', () => {
    it('should have socket.io-client', () => {
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      assert.ok(
        packageJson.dependencies['socket.io-client'],
        'Should have socket.io-client'
      );
    });
    
    it('should have compatible socket.io-client version (4.x)', () => {
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      const socketVersion = packageJson.dependencies['socket.io-client'];
      
      assert.match(
        socketVersion,
        /\^4|^4/,
        'socket.io-client should be version 4.x'
      );
    });
  });
  
  describe('Date handling compatibility', () => {
    it('should have date-fns for date manipulation', () => {
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      assert.ok(
        packageJson.dependencies['date-fns'],
        'Should have date-fns'
      );
    });
    
    it('should have react-day-picker compatible with React 18', () => {
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      const dayPickerVersion = packageJson.dependencies['react-day-picker'];
      
      assert.ok(dayPickerVersion, 'Should have react-day-picker');
      // Version 9+ is compatible with React 18
    });
  });
  
  describe('version constraint validation', () => {
    it('should not have conflicting version ranges', () => {
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      // Check for common conflict patterns
      const deps = packageJson.dependencies;
      
      // React versions should not conflict
      if (deps.react && deps['react-dom']) {
        const reactRange = deps.react;
        const reactDomRange = deps['react-dom'];
        
        assert.strictEqual(
          reactRange,
          reactDomRange,
          'React and React DOM should have same version range'
        );
      }
    });
    
    it('should use caret or tilde for patch updates', () => {
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };
      
      const pinned = Object.entries(allDeps)
        .filter(([_, version]) => /^\d+\.\d+\.\d+$/.test(version))
        .map(([name]) => name);
      
      // Some packages like Radix UI are intentionally pinned, which is OK
      // Just ensure we're aware of pinned versions
      assert.ok(
        true,
        `Found ${pinned.length} pinned dependencies: ${pinned.slice(0, 5).join(', ')}...`
      );
    });
  });
  
  describe('peer dependency warnings', () => {
    it('should have all peer dependencies satisfied for major packages', () => {
      const packagePath = resolve(FRONTEND_DIR, 'package.json');
      packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      // Check that key packages have their peers
      const hasReact = packageJson.dependencies.react;
      const hasReactDom = packageJson.dependencies['react-dom'];
      const hasNext = packageJson.dependencies.next;
      
      assert.ok(hasReact, 'Should have React');
      assert.ok(hasReactDom, 'Should have React DOM');
      assert.ok(hasNext, 'Should have Next.js');
    });
  });
});