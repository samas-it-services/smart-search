#!/usr/bin/env node

/**
 * @samas/smart-search - CLI Tool
 * Generate configuration templates and validate configurations
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function showHelp() {
  console.log(`
🔍 @samas/smart-search CLI

USAGE:
  npx @samas/smart-search <command> [options]

COMMANDS:
  init [format]           Generate configuration template
                         format: json|yaml (default: json)
  
  validate [config-path]  Validate configuration file
                         config-path: path to config file (optional)
  
  test-config            Test configuration and connection
  
  help                   Show this help message

EXAMPLES:
  npx @samas/smart-search init json
  npx @samas/smart-search init yaml
  npx @samas/smart-search validate ./smart-search.config.json
  npx @samas/smart-search test-config

CONFIGURATION:
  The CLI will look for configuration files in these locations:
  - smart-search.config.json
  - smart-search.config.yaml
  - smart-search.config.yml
  - config/smart-search.json
  - config/smart-search.yaml
  - .smart-search.json
  - .smart-search.yaml

ENVIRONMENT VARIABLES:
  Instead of config files, you can use environment variables:
  - SUPABASE_URL and SUPABASE_ANON_KEY for Supabase
  - REDIS_URL for Redis
  - See .env.example for full list

🌟 Support @samas/smart-search:
  💰 GitHub Sponsors: https://github.com/sponsors/bilgrami
  ☕ Ko-fi: https://ko-fi.com/bilgrami
  🐦 Follow: https://x.com/sbilgrami
`);
}

function generateTemplate(format = 'json') {
  console.log(`📝 Generating ${format.toUpperCase()} configuration template...`);
  
  const templates = {
    json: {
      filename: 'smart-search.config.json',
      content: JSON.stringify({
        database: {
          type: "supabase",
          connection: {
            url: "${SUPABASE_URL}",
            key: "${SUPABASE_ANON_KEY}"
          }
        },
        cache: {
          type: "redis",
          connection: {
            url: "${REDIS_URL}"
          }
        },
        search: {
          fallback: "database",
          tables: {
            books: {
              columns: {
                id: "id",
                title: "title",
                subtitle: "author",
                description: "description",
                category: "category",
                language: "language",
                visibility: "visibility",
                createdAt: "uploaded_at"
              },
              searchColumns: ["title", "author", "description"],
              type: "book"
            },
            users: {
              columns: {
                id: "id",
                title: "full_name",
                subtitle: "username",
                description: "bio",
                createdAt: "created_at"
              },
              searchColumns: ["full_name", "username", "bio"],
              type: "user"
            }
          }
        },
        circuitBreaker: {
          failureThreshold: 3,
          recoveryTimeout: 60000,
          healthCacheTTL: 30000
        },
        cache: {
          enabled: true,
          defaultTTL: 300000,
          maxSize: 10000
        },
        performance: {
          enableMetrics: true,
          logQueries: false,
          slowQueryThreshold: 1000
        }
      }, null, 2)
    },
    yaml: {
      filename: 'smart-search.config.yaml',
      content: `# @samas/smart-search Configuration
database:
  type: supabase
  connection:
    url: \${SUPABASE_URL}
    key: \${SUPABASE_ANON_KEY}

cache:
  type: redis
  connection:
    url: \${REDIS_URL}

search:
  fallback: database
  tables:
    books:
      columns:
        id: id
        title: title
        subtitle: author
        description: description
        category: category
        language: language
        visibility: visibility
        createdAt: uploaded_at
      searchColumns:
        - title
        - author
        - description
      type: book
    users:
      columns:
        id: id
        title: full_name
        subtitle: username
        description: bio
        createdAt: created_at
      searchColumns:
        - full_name
        - username
        - bio
      type: user

circuitBreaker:
  failureThreshold: 3
  recoveryTimeout: 60000
  healthCacheTTL: 30000

cache:
  enabled: true
  defaultTTL: 300000
  maxSize: 10000

performance:
  enableMetrics: true
  logQueries: false
  slowQueryThreshold: 1000`
    }
  };

  const template = templates[format];
  if (!template) {
    console.error(`❌ Unsupported format: ${format}. Use 'json' or 'yaml'.`);
    process.exit(1);
  }

  const configPath = path.join(process.cwd(), template.filename);
  
  if (fs.existsSync(configPath)) {
    console.log(`⚠️  Configuration file already exists: ${template.filename}`);
    console.log('   Use --force to overwrite or choose a different name.');
    return;
  }

  fs.writeFileSync(configPath, template.content, 'utf8');
  
  console.log(`✅ Configuration template created: ${template.filename}`);
  console.log('\nNext steps:');
  console.log('1. Update the configuration with your actual database/cache credentials');
  console.log('2. Set environment variables or replace ${VAR} placeholders');
  console.log('3. Test your configuration: npx @samas/smart-search test-config');
  console.log('\n📚 See config-examples/ directory for more examples');
}

function validateConfiguration(configPath) {
  console.log(`🔍 Validating configuration${configPath ? ` from ${configPath}` : ''}...`);
  
  try {
    // Use tsx to run the TypeScript validation
    const scriptPath = path.join(__dirname, '..', 'scripts', 'validate-config.js');
    const command = configPath 
      ? `node ${scriptPath} "${configPath}"` 
      : `node ${scriptPath}`;
    
    execSync(command, { stdio: 'inherit', cwd: process.cwd() });
  } catch (error) {
    console.error('❌ Configuration validation failed');
    process.exit(1);
  }
}

function testConfiguration() {
  console.log('🧪 Testing configuration and connections...');
  
  try {
    const testScript = path.join(__dirname, '..', 'scripts', 'test-config.js');
    execSync(`node ${testScript}`, { stdio: 'inherit', cwd: process.cwd() });
  } catch (error) {
    console.error('❌ Configuration test failed');
    process.exit(1);
  }
}

// Main CLI logic
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'init':
      const format = args[1] || 'json';
      generateTemplate(format);
      break;
    
    case 'validate':
      const configPath = args[1];
      validateConfiguration(configPath);
      break;
    
    case 'test-config':
      testConfiguration();
      break;
    
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    
    default:
      if (!command) {
        showHelp();
      } else {
        console.error(`❌ Unknown command: ${command}`);
        console.log('Run "npx @samas/smart-search help" for usage information.');
        process.exit(1);
      }
  }
}

if (require.main === module) {
  main();
}