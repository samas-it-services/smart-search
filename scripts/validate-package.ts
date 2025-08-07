#!/usr/bin/env tsx

/**
 * @samas/smart-search - Package Validation Script
 * Validates the package structure, exports, and functionality
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

interface ValidationResult {
  category: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
}

class PackageValidator {
  private results: ValidationResult[] = [];
  private packageRoot = process.cwd();

  async validate() {
    console.log('🔍 Validating @samas/smart-search package...\n');

    await this.validatePackageStructure();
    await this.validatePackageJson();
    await this.validateTypeScript();
    await this.validateExports();
    await this.validateLicense();
    await this.validateDependencies();
    await this.validateTests();
    await this.validateExamples();
    await this.validateDocumentation();

    this.printResults();
    return this.getOverallStatus();
  }

  private validatePackageStructure() {
    const requiredFiles = [
      'package.json',
      'tsconfig.json',
      'README.md',
      'LICENSE',
      'src/index.ts',
      'src/SmartSearch.ts',
      'src/types.ts',
      'src/providers/index.ts',
      'src/providers/SupabaseProvider.ts',
      'src/providers/RedisProvider.ts'
    ];

    const requiredDirs = [
      'src',
      'src/providers',
      'src/__tests__',
      'examples',
      'tests/e2e'
    ];

    for (const file of requiredFiles) {
      const exists = existsSync(join(this.packageRoot, file));
      this.results.push({
        category: 'Structure',
        test: `File: ${file}`,
        status: exists ? 'PASS' : 'FAIL',
        message: exists ? 'Exists' : 'Missing required file'
      });
    }

    for (const dir of requiredDirs) {
      const exists = existsSync(join(this.packageRoot, dir));
      this.results.push({
        category: 'Structure',
        test: `Directory: ${dir}`,
        status: exists ? 'PASS' : 'FAIL',
        message: exists ? 'Exists' : 'Missing required directory'
      });
    }
  }

  private validatePackageJson() {
    try {
      const packageJsonPath = join(this.packageRoot, 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

      // Required fields
      const requiredFields = [
        'name', 'version', 'description', 'main', 'module', 'types',
        'license', 'keywords', 'author', 'funding', 'homepage',
        'repository', 'bugs', 'files', 'scripts', 'engines'
      ];

      for (const field of requiredFields) {
        const exists = packageJson[field] !== undefined;
        this.results.push({
          category: 'Package.json',
          test: `Field: ${field}`,
          status: exists ? 'PASS' : 'FAIL',
          message: exists ? 'Present' : 'Missing required field'
        });
      }

      // Validate specific values
      this.results.push({
        category: 'Package.json',
        test: 'Name format',
        status: packageJson.name === '@samas/smart-search' ? 'PASS' : 'FAIL',
        message: packageJson.name === '@samas/smart-search' ? 'Correct' : `Expected @samas/smart-search, got ${packageJson.name}`
      });

      this.results.push({
        category: 'Package.json',
        test: 'License',
        status: packageJson.license === 'Apache-2.0' ? 'PASS' : 'FAIL',
        message: packageJson.license === 'Apache-2.0' ? 'Apache-2.0' : `Expected Apache-2.0, got ${packageJson.license}`
      });

      // Validate funding links
      const fundingValid = Array.isArray(packageJson.funding) && 
        packageJson.funding.some((f: any) => f.url?.includes('github.com/sponsors/bilgrami')) &&
        packageJson.funding.some((f: any) => f.url?.includes('ko-fi.com/bilgrami'));

      this.results.push({
        category: 'Package.json',
        test: 'Funding links',
        status: fundingValid ? 'PASS' : 'FAIL',
        message: fundingValid ? 'GitHub Sponsors and Ko-fi present' : 'Missing required funding links'
      });

      // Validate scripts
      const requiredScripts = ['build', 'test', 'test:unit', 'test:e2e', 'lint', 'examples:basic'];
      for (const script of requiredScripts) {
        const exists = packageJson.scripts?.[script] !== undefined;
        this.results.push({
          category: 'Package.json',
          test: `Script: ${script}`,
          status: exists ? 'PASS' : 'WARN',
          message: exists ? 'Present' : 'Missing recommended script'
        });
      }

    } catch (error) {
      this.results.push({
        category: 'Package.json',
        test: 'Parse',
        status: 'FAIL',
        message: `Failed to parse: ${error}`
      });
    }
  }

  private validateTypeScript() {
    try {
      // Check if TypeScript compiles without errors
      execSync('npx tsc --noEmit', { cwd: this.packageRoot, stdio: 'pipe' });
      this.results.push({
        category: 'TypeScript',
        test: 'Compilation',
        status: 'PASS',
        message: 'No type errors'
      });
    } catch (error) {
      this.results.push({
        category: 'TypeScript',
        test: 'Compilation',
        status: 'FAIL',
        message: 'Type errors found'
      });
    }

    // Validate tsconfig.json
    try {
      const tsconfigPath = join(this.packageRoot, 'tsconfig.json');
      const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'));

      const requiredOptions = ['target', 'module', 'declaration', 'outDir', 'strict'];
      for (const option of requiredOptions) {
        const exists = tsconfig.compilerOptions?.[option] !== undefined;
        this.results.push({
          category: 'TypeScript',
          test: `Config: ${option}`,
          status: exists ? 'PASS' : 'WARN',
          message: exists ? 'Configured' : 'Missing recommended option'
        });
      }
    } catch (error) {
      this.results.push({
        category: 'TypeScript',
        test: 'tsconfig.json',
        status: 'FAIL',
        message: 'Invalid or missing tsconfig.json'
      });
    }
  }

  private validateExports() {
    try {
      // Check main exports
      const indexPath = join(this.packageRoot, 'src/index.ts');
      const indexContent = readFileSync(indexPath, 'utf8');

      const expectedExports = [
        'SmartSearch',
        'SupabaseProvider',
        'RedisProvider',
        'SearchResult',
        'SearchOptions',
        'SmartSearchConfig'
      ];

      for (const exportName of expectedExports) {
        const hasExport = indexContent.includes(`export { ${exportName}`) || 
                         indexContent.includes(`export type { ${exportName}`) ||
                         indexContent.includes(`export default ${exportName}`);
        
        this.results.push({
          category: 'Exports',
          test: exportName,
          status: hasExport ? 'PASS' : 'FAIL',
          message: hasExport ? 'Exported' : 'Missing export'
        });
      }

      // Check provider exports
      const providerIndexPath = join(this.packageRoot, 'src/providers/index.ts');
      const providerContent = readFileSync(providerIndexPath, 'utf8');

      const expectedProviderExports = ['SupabaseProvider', 'RedisProvider'];
      for (const exportName of expectedProviderExports) {
        const hasExport = providerContent.includes(`export { ${exportName}`);
        this.results.push({
          category: 'Exports',
          test: `Provider: ${exportName}`,
          status: hasExport ? 'PASS' : 'FAIL',
          message: hasExport ? 'Exported' : 'Missing provider export'
        });
      }

    } catch (error) {
      this.results.push({
        category: 'Exports',
        test: 'Validation',
        status: 'FAIL',
        message: `Failed to validate exports: ${error}`
      });
    }
  }

  private validateLicense() {
    try {
      const licensePath = join(this.packageRoot, 'LICENSE');
      const licenseContent = readFileSync(licensePath, 'utf8');

      const isApache2 = licenseContent.includes('Apache License') && 
                       licenseContent.includes('Version 2.0') &&
                       licenseContent.includes('Samas Bilgrami');

      this.results.push({
        category: 'License',
        test: 'Apache 2.0',
        status: isApache2 ? 'PASS' : 'FAIL',
        message: isApache2 ? 'Valid Apache 2.0 license' : 'Invalid or incorrect license'
      });

    } catch (error) {
      this.results.push({
        category: 'License',
        test: 'File',
        status: 'FAIL',
        message: 'LICENSE file missing or unreadable'
      });
    }
  }

  private validateDependencies() {
    try {
      const packageJsonPath = join(this.packageRoot, 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

      // Should have minimal runtime dependencies
      const depCount = Object.keys(packageJson.dependencies || {}).length;
      this.results.push({
        category: 'Dependencies',
        test: 'Runtime dependencies',
        status: depCount === 0 ? 'PASS' : 'WARN',
        message: depCount === 0 ? 'Zero dependencies (good)' : `${depCount} dependencies (consider minimizing)`
      });

      // Should have comprehensive dev dependencies
      const devDeps = packageJson.devDependencies || {};
      const requiredDevDeps = [
        'typescript', 'vitest', '@playwright/test', 'tsup', 'eslint'
      ];

      for (const dep of requiredDevDeps) {
        const exists = devDeps[dep] !== undefined;
        this.results.push({
          category: 'Dependencies',
          test: `DevDep: ${dep}`,
          status: exists ? 'PASS' : 'WARN',
          message: exists ? 'Present' : 'Missing recommended dev dependency'
        });
      }

    } catch (error) {
      this.results.push({
        category: 'Dependencies',
        test: 'Validation',
        status: 'FAIL',
        message: `Failed to validate dependencies: ${error}`
      });
    }
  }

  private validateTests() {
    const testFiles = [
      'src/__tests__/SmartSearch.test.ts',
      'src/__tests__/providers/SupabaseProvider.test.ts',
      'src/__tests__/providers/RedisProvider.test.ts',
      'tests/e2e/smart-search.spec.ts'
    ];

    for (const testFile of testFiles) {
      const exists = existsSync(join(this.packageRoot, testFile));
      this.results.push({
        category: 'Tests',
        test: testFile,
        status: exists ? 'PASS' : 'FAIL',
        message: exists ? 'Test file exists' : 'Missing test file'
      });
    }

    // Check test configurations
    const configFiles = ['vitest.config.ts', 'playwright.config.ts'];
    for (const configFile of configFiles) {
      const exists = existsSync(join(this.packageRoot, configFile));
      this.results.push({
        category: 'Tests',
        test: `Config: ${configFile}`,
        status: exists ? 'PASS' : 'WARN',
        message: exists ? 'Config exists' : 'Missing test configuration'
      });
    }
  }

  private validateExamples() {
    const exampleFiles = [
      'examples/basic-usage.ts',
      'examples/advanced-configuration.ts',
      'examples/multiple-databases.ts'
    ];

    for (const exampleFile of exampleFiles) {
      const exists = existsSync(join(this.packageRoot, exampleFile));
      this.results.push({
        category: 'Examples',
        test: exampleFile,
        status: exists ? 'PASS' : 'WARN',
        message: exists ? 'Example exists' : 'Missing example file'
      });
    }

    // Validate example content
    try {
      const basicUsagePath = join(this.packageRoot, 'examples/basic-usage.ts');
      if (existsSync(basicUsagePath)) {
        const content = readFileSync(basicUsagePath, 'utf8');
        const hasImport = content.includes("import { SmartSearch");
        const hasUsage = content.includes("new SmartSearch");
        
        this.results.push({
          category: 'Examples',
          test: 'Basic usage content',
          status: hasImport && hasUsage ? 'PASS' : 'WARN',
          message: hasImport && hasUsage ? 'Contains proper usage examples' : 'Missing import or usage examples'
        });
      }
    } catch (error) {
      this.results.push({
        category: 'Examples',
        test: 'Content validation',
        status: 'WARN',
        message: 'Failed to validate example content'
      });
    }
  }

  private validateDocumentation() {
    try {
      const readmePath = join(this.packageRoot, 'README.md');
      const readmeContent = readFileSync(readmePath, 'utf8');

      // Check for required sections
      const requiredSections = [
        '# @samas/smart-search',
        '## Support the Project',
        '## Features',
        '## Quick Start',
        '## Installation',
        '## Configuration Examples',
        '## API Reference',
        '## License'
      ];

      for (const section of requiredSections) {
        const hasSection = readmeContent.includes(section);
        this.results.push({
          category: 'Documentation',
          test: `README: ${section}`,
          status: hasSection ? 'PASS' : 'WARN',
          message: hasSection ? 'Section present' : 'Missing recommended section'
        });
      }

      // Check for donation links
      const hasDonationLinks = readmeContent.includes('github.com/sponsors/bilgrami') &&
                              readmeContent.includes('ko-fi.com/bilgrami') &&
                              readmeContent.includes('x.com/sbilgrami');

      this.results.push({
        category: 'Documentation',
        test: 'Donation links',
        status: hasDonationLinks ? 'PASS' : 'FAIL',
        message: hasDonationLinks ? 'All donation links present' : 'Missing required donation links'
      });

      // Check for code examples
      const hasCodeExamples = readmeContent.includes('```typescript') || readmeContent.includes('```javascript');
      this.results.push({
        category: 'Documentation',
        test: 'Code examples',
        status: hasCodeExamples ? 'PASS' : 'WARN',
        message: hasCodeExamples ? 'Contains code examples' : 'Missing code examples'
      });

    } catch (error) {
      this.results.push({
        category: 'Documentation',
        test: 'README.md',
        status: 'FAIL',
        message: 'README.md missing or unreadable'
      });
    }
  }

  private printResults() {
    console.log('📊 Validation Results:\n');

    const categories = [...new Set(this.results.map(r => r.category))];
    
    for (const category of categories) {
      console.log(`\n📁 ${category}:`);
      const categoryResults = this.results.filter(r => r.category === category);
      
      for (const result of categoryResults) {
        const icon = result.status === 'PASS' ? '✅' : result.status === 'WARN' ? '⚠️' : '❌';
        console.log(`  ${icon} ${result.test}: ${result.message}`);
      }
    }

    // Summary
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const warned = this.results.filter(r => r.status === 'WARN').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const total = this.results.length;

    console.log('\n📈 Summary:');
    console.log(`  ✅ Passed: ${passed}/${total} (${((passed/total)*100).toFixed(1)}%)`);
    if (warned > 0) console.log(`  ⚠️  Warnings: ${warned}/${total} (${((warned/total)*100).toFixed(1)}%)`);
    if (failed > 0) console.log(`  ❌ Failed: ${failed}/${total} (${((failed/total)*100).toFixed(1)}%)`);

    console.log('\n🌟 Support @samas/smart-search:');
    console.log('  💰 GitHub Sponsors: https://github.com/sponsors/bilgrami');
    console.log('  ☕ Ko-fi: https://ko-fi.com/bilgrami');
    console.log('  🐦 Follow: https://x.com/sbilgrami');
  }

  private getOverallStatus(): 'success' | 'warning' | 'failure' {
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const warned = this.results.filter(r => r.status === 'WARN').length;
    
    if (failed > 0) return 'failure';
    if (warned > 0) return 'warning';
    return 'success';
  }
}

// Run validation if script is executed directly
if (require.main === module) {
  const validator = new PackageValidator();
  validator.validate().then(status => {
    process.exit(status === 'failure' ? 1 : 0);
  }).catch(error => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });
}

export { PackageValidator };