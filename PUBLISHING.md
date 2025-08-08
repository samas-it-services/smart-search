# 📦 Publishing Guide for Smart Search

Complete guide for publishing the Smart Search library to NPM.

## 🚀 Quick Publishing

### Test Before Publishing (Recommended)
```bash
# Test the publish process safely
npm run publish:test

# Or directly
./scripts/test-publish.sh
```

### Publish to NPM
```bash
# Bug fixes (1.0.0 → 1.0.1)
npm run publish:patch

# New features (1.0.0 → 1.1.0)
npm run publish:minor

# Breaking changes (1.0.0 → 2.0.0)
npm run publish:major
```

## 🧪 Testing & Dry Runs

### Safe Testing
```bash
# Test everything without making changes
npm run publish:test

# Dry run a specific version type
npm run publish:dry-run
./scripts/publish-to-npm.sh minor --dry-run
```

### What the Test Covers
- ✅ System requirements (Node.js, npm, git, TypeScript)
- ✅ Package configuration analysis
- ✅ Build process verification
- ✅ Package content validation
- ✅ NPM authentication & permissions
- ✅ Version strategy recommendations
- ✅ Complete dry-run simulation

## 📋 Pre-Publication Checklist

Before publishing, ensure:

### Code Quality
- [ ] All tests pass (`npm run test:unit`)
- [ ] TypeScript compiles (`npm run type-check`)
- [ ] Linting passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)

### Documentation
- [ ] README.md is up to date
- [ ] CHANGELOG.md has release notes
- [ ] API documentation is current
- [ ] Examples work with new changes

### Git Status
- [ ] Working directory is clean
- [ ] All changes are committed
- [ ] On main/master branch
- [ ] Remote is up to date

### Version Strategy
- [ ] **Patch (x.y.Z)**: Bug fixes, security updates, documentation
- [ ] **Minor (x.Y.z)**: New features, enhancements, backward compatible
- [ ] **Major (X.y.z)**: Breaking changes, major API changes

## 🛠️ Publishing Scripts

### Main Scripts
- `./scripts/publish-to-npm.sh` - Main publishing script
- `./scripts/test-publish.sh` - Safe testing script

### NPM Script Shortcuts
```bash
# Testing
npm run publish:test          # Full test suite
npm run publish:dry-run       # Quick dry run

# Version Management  
npm run publish:patch         # Publish patch version
npm run publish:minor         # Publish minor version
npm run publish:major         # Publish major version

# Legacy compatibility
npm run version:patch         # Same as publish:patch
npm run version:minor         # Same as publish:minor
npm run version:major         # Same as publish:major
```

## 🔧 Advanced Usage

### Custom Version Numbers
```bash
# Publish specific version
./scripts/publish-to-npm.sh 1.2.3

# With options
./scripts/publish-to-npm.sh 1.2.3 --dry-run
./scripts/publish-to-npm.sh patch --skip-tests --force
```

### Command Options
- `--dry-run` - Test without making changes
- `--skip-tests` - Skip test execution (not recommended)
- `--force` - Force publish with warnings
- `--help` - Show detailed help

### Emergency Publishing
```bash
# Skip tests (use carefully)
./scripts/publish-to-npm.sh patch --skip-tests

# Force from non-main branch
./scripts/publish-to-npm.sh patch --force
```

## 🔍 What Happens During Publishing

### 1. Pre-flight Checks
- ✅ Verify git working directory is clean
- ✅ Check current branch (main/master)
- ✅ Validate NPM authentication
- ✅ Confirm version doesn't already exist

### 2. Build & Test
- ✅ Install dependencies if needed
- ✅ Run TypeScript type checking
- ✅ Execute unit tests
- ✅ Build distribution files
- ✅ Verify build artifacts

### 3. Version Management
- ✅ Update package.json version
- ✅ Create git commit with release message
- ✅ Create git tag (v1.2.3)

### 4. Publication
- ✅ Publish to NPM registry
- ✅ Push commits and tags to git remote
- ✅ Display success information

### 5. Error Handling
- ✅ Automatic rollback on failure
- ✅ Restore package.json version
- ✅ Remove git tags and commits
- ✅ Clear error messaging

## 🌟 Package Information

### Current Configuration
- **Name**: `@samas/smart-search`
- **Registry**: https://registry.npmjs.org/
- **Scope**: `@samas`
- **License**: Apache-2.0
- **Author**: Syd A Bilgrami

### Published Files
The package includes:
- `dist/` - Compiled JavaScript and TypeScript definitions
- `src/` - Source TypeScript files
- `bin/` - CLI executable
- `config-examples/` - Configuration templates
- `README.md` - Documentation
- `LICENSE` - License file

### Installation
```bash
# Latest version
npm install @samas/smart-search

# Specific version
npm install @samas/smart-search@1.2.3

# Development installation
npm install -g @samas/smart-search
```

## 🚨 Troubleshooting

### Common Issues

**Authentication Error**
```bash
# Login to NPM
npm login

# Check current user
npm whoami
```

**Permission Denied**
```bash
# Check package access
npm access list packages @samas

# Request access if needed
npm access grant read-write @samas/smart-search username
```

**Version Already Exists**
```bash
# Check existing versions
npm view @samas/smart-search versions --json

# Use different version number
./scripts/publish-to-npm.sh 1.2.4
```

**Build Failures**
```bash
# Clean build
rm -rf dist/ node_modules/
npm install
npm run build

# Check TypeScript errors
npm run type-check
```

**Git Issues**
```bash
# Clean working directory
git status
git add . && git commit -m "Prepare for release"

# Switch to main branch
git checkout main
git pull origin main
```

### Getting Help

1. **Test First**: Run `npm run publish:test` to identify issues
2. **Check Logs**: Review error messages for specific issues
3. **Dry Run**: Use `--dry-run` flag to test without changes
4. **Force Options**: Use `--force` and `--skip-tests` carefully
5. **Manual Rollback**: If needed, manually revert git commits and tags

## 📈 Release Workflow

### Recommended Process

1. **Development**
   ```bash
   # Make changes
   git add . && git commit -m "Add new feature"
   ```

2. **Pre-release Testing**
   ```bash
   npm run test:all
   npm run publish:test
   ```

3. **Documentation**
   - Update CHANGELOG.md
   - Update README.md if needed
   - Review package.json metadata

4. **Release**
   ```bash
   # Choose appropriate version type
   npm run publish:minor  # for new features
   npm run publish:patch  # for bug fixes
   ```

5. **Post-release**
   - Announce on GitHub/social media
   - Update dependent projects
   - Plan next version features

### Semantic Versioning Guide

- **1.0.0 → 1.0.1** (Patch): Bug fixes, documentation, security patches
- **1.0.0 → 1.1.0** (Minor): New features, enhancements, backward compatible
- **1.0.0 → 2.0.0** (Major): Breaking changes, API modifications, major rewrites

---

Happy publishing! 🎉