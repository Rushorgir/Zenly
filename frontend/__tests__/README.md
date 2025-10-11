# Frontend Configuration Tests

This directory contains comprehensive tests for the frontend package configuration and lock files.

## Test Suites

### 1. Package Validation (`config/package-validation.test.mjs`)
Tests the integrity and validity of `package.json`:
- JSON structure validation
- Required fields verification
- Next.js configuration
- Script definitions
- Dependency version validation
- Security best practices
- Version upgrade validation

### 2. Lock File Integrity (`config/lockfile-integrity.test.mjs`)
Tests consistency between package.json and lock files:
- Lock file existence and validity
- Version consistency across lock files
- Dependency resolution
- Security integrity hashes
- HTTPS usage for resolved packages

### 3. Dependency Compatibility (`config/dependency-compatibility.test.mjs`)
Tests for version compatibility and potential conflicts:
- Next.js ecosystem compatibility
- React version matching
- Radix UI compatibility
- Form handling library compatibility
- Styling library compatibility
- Socket.IO compatibility
- Peer dependency validation

## Running the Tests

Using Node.js built-in test runner:

```bash
# Run all tests
node --test frontend/__tests__

# Run specific test suite
node --test frontend/__tests__/config/package-validation.test.mjs

# Run with coverage
node --test --experimental-test-coverage frontend/__tests__

# Watch mode
node --test --watch frontend/__tests__
```

## Test Coverage

These tests provide comprehensive coverage for:
- ✅ Package.json schema validation
- ✅ Next.js version upgrade verification (14.2.16 → 14.2.33)
- ✅ Lock file consistency
- ✅ Dependency compatibility
- ✅ Security best practices
- ✅ Version constraint validation
- ✅ Edge cases and error handling

## CI/CD Integration

Add to your CI pipeline:

```yaml
- name: Run configuration tests
  run: node --test frontend/__tests__
```

## Maintenance

When updating dependencies:
1. Run tests before committing changes
2. Update tests if new dependencies are added
3. Verify lock files are in sync
4. Check for breaking changes in major version updates