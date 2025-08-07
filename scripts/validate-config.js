#!/usr/bin/env node

/**
 * Configuration validation script for CLI
 */

const fs = require('fs');
const path = require('path');

function findConfigFile() {
  const cwd = process.cwd();
  const configPaths = [
    'smart-search.config.json',
    'smart-search.config.yaml',
    'smart-search.config.yml',
    'config/smart-search.json',
    'config/smart-search.yaml',
    '.smart-search.json',
    '.smart-search.yaml'
  ];

  for (const configPath of configPaths) {
    const fullPath = path.join(cwd, configPath);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }
  
  return null;
}

function validateConfig(configPath) {
  console.log(`🔍 Validating configuration: ${configPath}`);
  
  let config;
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    const ext = path.extname(configPath).toLowerCase();
    
    if (ext === '.json') {
      config = JSON.parse(content);
    } else if (ext === '.yaml' || ext === '.yml') {
      console.log('⚠️  YAML validation requires js-yaml package');
      console.log('   Install with: npm install js-yaml');
      return false;
    } else {
      console.error(`❌ Unsupported file format: ${ext}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Failed to parse configuration: ${error.message}`);
    return false;
  }

  const errors = [];
  
  // Validate database configuration
  if (!config.database) {
    errors.push('Database configuration is required');
  } else {
    if (!config.database.type) {
      errors.push('Database type is required');
    }
    
    if (!config.database.connection) {
      errors.push('Database connection is required');
    } else {
      switch (config.database.type) {
        case 'supabase':
          if (!config.database.connection.url) errors.push('Supabase URL is required');
          if (!config.database.connection.key) errors.push('Supabase key is required');
          break;
        case 'mysql':
        case 'postgresql':
          if (!config.database.connection.host) errors.push(`${config.database.type} host is required`);
          if (!config.database.connection.user && !config.database.connection.username) {
            errors.push(`${config.database.type} user/username is required`);
          }
          if (!config.database.connection.database) {
            errors.push(`${config.database.type} database name is required`);
          }
          break;
        case 'mongodb':
          if (!config.database.connection.uri) errors.push('MongoDB URI is required');
          break;
      }
    }
  }

  // Validate search configuration
  if (!config.search) {
    errors.push('Search configuration is required');
  } else {
    if (!config.search.fallback) {
      errors.push('Search fallback strategy is required');
    } else if (!['database', 'cache'].includes(config.search.fallback)) {
      errors.push('Search fallback must be "database" or "cache"');
    }

    if (!config.search.tables || Object.keys(config.search.tables).length === 0) {
      errors.push('At least one table configuration is required');
    } else {
      for (const [tableName, tableConfig] of Object.entries(config.search.tables)) {
        if (!tableConfig.columns || Object.keys(tableConfig.columns).length === 0) {
          errors.push(`Table "${tableName}" must have column mappings`);
        }
        if (!tableConfig.searchColumns || tableConfig.searchColumns.length === 0) {
          errors.push(`Table "${tableName}" must have searchColumns`);
        }
        if (!tableConfig.type) {
          errors.push(`Table "${tableName}" must have a type`);
        }
      }
    }
  }

  // Print results
  if (errors.length === 0) {
    console.log('✅ Configuration is valid!');
    
    // Show configuration summary
    console.log('\n📊 Configuration Summary:');
    console.log(`   Database: ${config.database?.type || 'unknown'}`);
    console.log(`   Cache: ${config.cache?.type || 'none'}`);
    console.log(`   Fallback: ${config.search?.fallback || 'unknown'}`);
    console.log(`   Tables: ${Object.keys(config.search?.tables || {}).join(', ')}`);
    
    return true;
  } else {
    console.log('\n❌ Configuration errors:');
    errors.forEach(error => console.log(`   • ${error}`));
    
    console.log('\n💡 Tips:');
    console.log('   • Check config-examples/ directory for examples');
    console.log('   • Run "npx @samas/smart-search init" to generate a template');
    
    return false;
  }
}

function main() {
  const configPath = process.argv[2];
  
  let targetPath;
  if (configPath) {
    if (!fs.existsSync(configPath)) {
      console.error(`❌ Configuration file not found: ${configPath}`);
      process.exit(1);
    }
    targetPath = configPath;
  } else {
    targetPath = findConfigFile();
    if (!targetPath) {
      console.error('❌ No configuration file found');
      console.log('   Looked for: smart-search.config.json/yaml in common locations');
      console.log('   Run "npx @samas/smart-search init" to create one');
      process.exit(1);
    }
  }

  const isValid = validateConfig(targetPath);
  process.exit(isValid ? 0 : 1);
}

if (require.main === module) {
  main();
}