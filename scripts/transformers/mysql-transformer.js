#!/usr/bin/env node

/**
 * @samas/smart-search - MySQL Schema Transformer
 * Transforms universal dataset schemas to MySQL-optimized table structures
 */

const fs = require('fs');
const path = require('path');

class MySQLTransformer {
  constructor() {
    this.dataTypes = {
      string: 'VARCHAR(255)',
      text: 'TEXT',
      integer: 'INT',
      number: 'DECIMAL(15,4)',
      boolean: 'BOOLEAN',
      date: 'DATE',
      datetime: 'TIMESTAMP',
      array: 'JSON',
      object: 'JSON'
    };

    this.indexTypes = {
      primary: 'PRIMARY KEY',
      unique: 'UNIQUE',
      btree: 'USING BTREE',
      hash: 'USING HASH',
      fulltext: 'FULLTEXT'
    };

    this.engines = {
      default: 'InnoDB',
      fulltext: 'InnoDB', // MySQL 5.6+ supports FULLTEXT on InnoDB
      memory: 'MEMORY'
    };
  }

  /**
   * Transform universal schema to MySQL table structure
   */
  transformDataset(datasetType, universalSchema, records = []) {
    const schema = this.loadDatasetSchema(datasetType);
    const tableStructure = this.generateTableStructure(datasetType, schema);
    const indexes = this.generateIndexes(datasetType, schema, tableStructure);
    const searchConfig = this.generateSearchConfiguration(schema);
    const dataTransformation = this.generateDataTransformation(records, schema);

    return {
      tableName: `${datasetType}_data`,
      ddl: this.generateDDL(datasetType, tableStructure, indexes),
      searchConfig,
      dataTransformation,
      optimizations: this.generateOptimizations(datasetType, schema)
    };
  }

  /**
   * Load dataset-specific schema
   */
  loadDatasetSchema(datasetType) {
    const schemaPath = path.join(__dirname, '../data-schemas', `${datasetType}.json`);
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema not found for dataset type: ${datasetType}`);
    }
    return JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  }

  /**
   * Generate MySQL table structure based on dataset schema
   */
  generateTableStructure(datasetType, schema) {
    const baseColumns = {
      id: { 
        type: 'VARCHAR(255)', 
        constraints: ['NOT NULL', 'PRIMARY KEY'],
        collation: 'utf8mb4_unicode_ci'
      },
      title: { 
        type: 'TEXT', 
        constraints: ['NOT NULL'],
        collation: 'utf8mb4_unicode_ci'
      },
      description: { 
        type: 'TEXT',
        collation: 'utf8mb4_unicode_ci'
      },
      category: { 
        type: 'VARCHAR(100)', 
        constraints: ['NOT NULL'],
        collation: 'utf8mb4_unicode_ci'
      },
      type: { 
        type: 'VARCHAR(100)', 
        constraints: ['NOT NULL'],
        collation: 'utf8mb4_unicode_ci'
      },
      status: { 
        type: 'VARCHAR(20)', 
        constraints: ['NOT NULL'], 
        default: "'active'",
        collation: 'utf8mb4_unicode_ci'
      },
      date_created: { 
        type: 'TIMESTAMP', 
        constraints: ['NOT NULL'], 
        default: 'CURRENT_TIMESTAMP'
      },
      date_updated: { 
        type: 'TIMESTAMP', 
        constraints: ['NOT NULL'], 
        default: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
      },
      metadata: { 
        type: 'JSON',
        constraints: []
      },
      language: { 
        type: 'VARCHAR(10)', 
        constraints: ['NOT NULL'], 
        default: "'en'",
        collation: 'utf8mb4_unicode_ci'
      }
    };

    // Add dataset-specific columns based on schema
    const specificColumns = this.generateDatasetColumns(datasetType, schema);
    
    return { ...baseColumns, ...specificColumns };
  }

  /**
   * Generate dataset-specific columns
   */
  generateDatasetColumns(datasetType, schema) {
    const columns = {};

    switch (datasetType) {
      case 'healthcare':
        columns.condition_name = { 
          type: 'TEXT', 
          collation: 'utf8mb4_unicode_ci' 
        };
        columns.treatment = { 
          type: 'TEXT', 
          collation: 'utf8mb4_unicode_ci' 
        };
        columns.specialty = { 
          type: 'VARCHAR(100)', 
          collation: 'utf8mb4_unicode_ci' 
        };
        columns.icd_10_code = { 
          type: 'VARCHAR(20)', 
          collation: 'utf8mb4_unicode_ci' 
        };
        columns.cpt_code = { 
          type: 'VARCHAR(10)', 
          collation: 'utf8mb4_unicode_ci' 
        };
        columns.severity_level = { 
          type: 'ENUM(\'low\', \'mild\', \'moderate\', \'high\', \'severe\', \'critical\')', 
          collation: 'utf8mb4_unicode_ci' 
        };
        columns.age_group = { 
          type: 'ENUM(\'neonatal\', \'infant\', \'pediatric\', \'adolescent\', \'adult\', \'geriatric\', \'all_ages\')', 
          collation: 'utf8mb4_unicode_ci' 
        };
        columns.body_system = { 
          type: 'JSON' 
        };
        columns.evidence_level = { 
          type: 'ENUM(\'A\', \'B\', \'C\', \'D\', \'E\')', 
          collation: 'utf8mb4_unicode_ci' 
        };
        columns.fda_approved = { 
          type: 'BOOLEAN' 
        };
        break;

      case 'finance':
        columns.symbol = { 
          type: 'VARCHAR(20)', 
          constraints: ['UNIQUE'],
          collation: 'utf8mb4_unicode_ci' 
        };
        columns.company_name = { 
          type: 'TEXT', 
          collation: 'utf8mb4_unicode_ci' 
        };
        columns.exchange = { 
          type: 'VARCHAR(20)', 
          collation: 'utf8mb4_unicode_ci' 
        };
        columns.sector = { 
          type: 'VARCHAR(50)', 
          collation: 'utf8mb4_unicode_ci' 
        };
        columns.industry = { 
          type: 'VARCHAR(100)', 
          collation: 'utf8mb4_unicode_ci' 
        };
        columns.market_cap = { 
          type: 'ENUM(\'nano\', \'micro\', \'small\', \'mid\', \'large\', \'mega\')', 
          collation: 'utf8mb4_unicode_ci' 
        };
        columns.current_price = { 
          type: 'DECIMAL(15,4)' 
        };
        columns.volume = { 
          type: 'BIGINT UNSIGNED' 
        };
        columns.pe_ratio = { 
          type: 'DECIMAL(8,2)' 
        };
        columns.dividend_yield = { 
          type: 'DECIMAL(5,4)' 
        };
        columns.beta = { 
          type: 'DECIMAL(6,4)' 
        };
        columns.risk_rating = { 
          type: 'ENUM(\'very_conservative\', \'conservative\', \'moderate\', \'aggressive\', \'very_aggressive\', \'speculative\')', 
          collation: 'utf8mb4_unicode_ci' 
        };
        break;

      case 'retail':
        columns.brand = { 
          type: 'VARCHAR(100)', 
          collation: 'utf8mb4_unicode_ci' 
        };
        columns.model = { 
          type: 'VARCHAR(100)', 
          collation: 'utf8mb4_unicode_ci' 
        };
        columns.sku = { 
          type: 'VARCHAR(50)', 
          constraints: ['UNIQUE'],
          collation: 'utf8mb4_unicode_ci' 
        };
        columns.upc = { 
          type: 'VARCHAR(15)', 
          collation: 'utf8mb4_unicode_ci' 
        };
        columns.current_price = { 
          type: 'DECIMAL(10,2)' 
        };
        columns.original_price = { 
          type: 'DECIMAL(10,2)' 
        };
        columns.in_stock = { 
          type: 'BOOLEAN', 
          default: 'TRUE' 
        };
        columns.stock_quantity = { 
          type: 'INT UNSIGNED' 
        };
        columns.average_rating = { 
          type: 'DECIMAL(3,2)' 
        };
        columns.review_count = { 
          type: 'INT UNSIGNED' 
        };
        columns.color = { 
          type: 'VARCHAR(50)', 
          collation: 'utf8mb4_unicode_ci' 
        };
        columns.size = { 
          type: 'VARCHAR(20)', 
          collation: 'utf8mb4_unicode_ci' 
        };
        columns.weight = { 
          type: 'DECIMAL(10,3)' 
        };
        break;

      case 'education':
        columns.course_code = { 
          type: 'VARCHAR(20)', 
          constraints: ['UNIQUE'],
          collation: 'utf8mb4_unicode_ci' 
        };
        columns.subject_area = { 
          type: 'VARCHAR(100)', 
          collation: 'utf8mb4_unicode_ci' 
        };
        columns.grade_level = { 
          type: 'JSON' 
        };
        columns.difficulty_level = { 
          type: 'ENUM(\'beginner\', \'intermediate\', \'advanced\', \'expert\', \'variable\')', 
          collation: 'utf8mb4_unicode_ci' 
        };
        columns.credit_hours = { 
          type: 'DECIMAL(4,2)' 
        };
        columns.institution_name = { 
          type: 'VARCHAR(200)', 
          collation: 'utf8mb4_unicode_ci' 
        };
        columns.instructor_name = { 
          type: 'VARCHAR(100)', 
          collation: 'utf8mb4_unicode_ci' 
        };
        columns.duration = { 
          type: 'VARCHAR(50)', 
          collation: 'utf8mb4_unicode_ci' 
        };
        columns.content_type = { 
          type: 'VARCHAR(50)', 
          collation: 'utf8mb4_unicode_ci' 
        };
        columns.completion_rate = { 
          type: 'DECIMAL(5,2)' 
        };
        columns.student_rating = { 
          type: 'DECIMAL(3,2)' 
        };
        break;

      case 'real_estate':
        columns.property_type = { 
          type: 'VARCHAR(50)', 
          collation: 'utf8mb4_unicode_ci' 
        };
        columns.listing_type = { 
          type: 'ENUM(\'for_sale\', \'for_rent\', \'sold\', \'rented\', \'off_market\', \'coming_soon\')', 
          collation: 'utf8mb4_unicode_ci' 
        };
        columns.list_price = { 
          type: 'DECIMAL(12,2)' 
        };
        columns.rent_price = { 
          type: 'DECIMAL(10,2)' 
        };
        columns.square_footage = { 
          type: 'INT UNSIGNED' 
        };
        columns.lot_size = { 
          type: 'INT UNSIGNED' 
        };
        columns.bedrooms = { 
          type: 'TINYINT UNSIGNED' 
        };
        columns.bathrooms = { 
          type: 'DECIMAL(3,1)' 
        };
        columns.year_built = { 
          type: 'YEAR' 
        };
        columns.address = { 
          type: 'TEXT', 
          collation: 'utf8mb4_unicode_ci' 
        };
        columns.city = { 
          type: 'VARCHAR(100)', 
          collation: 'utf8mb4_unicode_ci' 
        };
        columns.state = { 
          type: 'VARCHAR(20)', 
          collation: 'utf8mb4_unicode_ci' 
        };
        columns.zip_code = { 
          type: 'VARCHAR(10)', 
          collation: 'utf8mb4_unicode_ci' 
        };
        columns.neighborhood = { 
          type: 'VARCHAR(100)', 
          collation: 'utf8mb4_unicode_ci' 
        };
        columns.garage_spaces = { 
          type: 'TINYINT UNSIGNED' 
        };
        break;

      default:
        // Custom dataset - use flexible JSON structure
        columns.custom_fields = { 
          type: 'JSON' 
        };
        break;
    }

    return columns;
  }

  /**
   * Generate optimized indexes for dataset
   */
  generateIndexes(datasetType, schema, tableStructure) {
    const tableName = `${datasetType}_data`;
    const indexes = [];

    // Always create these essential indexes
    indexes.push({
      name: `idx_${datasetType}_category`,
      type: 'btree',
      columns: ['category'],
      sql: `CREATE INDEX idx_${datasetType}_category ON ${tableName} (category);`
    });

    indexes.push({
      name: `idx_${datasetType}_type`,
      type: 'btree',
      columns: ['type'],
      sql: `CREATE INDEX idx_${datasetType}_type ON ${tableName} (type);`
    });

    indexes.push({
      name: `idx_${datasetType}_status`,
      type: 'btree',
      columns: ['status'],
      sql: `CREATE INDEX idx_${datasetType}_status ON ${tableName} (status);`
    });

    indexes.push({
      name: `idx_${datasetType}_date_created`,
      type: 'btree',
      columns: ['date_created'],
      sql: `CREATE INDEX idx_${datasetType}_date_created ON ${tableName} (date_created);`
    });

    // Full-text search indexes
    indexes.push({
      name: `idx_${datasetType}_fulltext`,
      type: 'fulltext',
      columns: ['title', 'description'],
      sql: `CREATE FULLTEXT INDEX idx_${datasetType}_fulltext ON ${tableName} (title, description);`
    });

    // JSON metadata index (MySQL 5.7+)
    indexes.push({
      name: `idx_${datasetType}_metadata`,
      type: 'functional',
      columns: ['metadata'],
      sql: `CREATE INDEX idx_${datasetType}_metadata ON ${tableName} ((CAST(metadata AS CHAR(255))));`
    });

    // Add dataset-specific indexes
    const specificIndexes = this.generateDatasetSpecificIndexes(datasetType, tableName, tableStructure);
    indexes.push(...specificIndexes);

    return indexes;
  }

  /**
   * Generate dataset-specific indexes for optimal search performance
   */
  generateDatasetSpecificIndexes(datasetType, tableName, tableStructure) {
    const indexes = [];

    switch (datasetType) {
      case 'healthcare':
        indexes.push({
          name: `idx_${datasetType}_condition_fulltext`,
          type: 'fulltext',
          columns: ['condition_name', 'treatment'],
          sql: `CREATE FULLTEXT INDEX idx_${datasetType}_condition_fulltext ON ${tableName} (condition_name, treatment);`
        });
        indexes.push({
          name: `idx_${datasetType}_specialty`,
          type: 'btree',
          columns: ['specialty'],
          sql: `CREATE INDEX idx_${datasetType}_specialty ON ${tableName} (specialty);`
        });
        indexes.push({
          name: `idx_${datasetType}_codes`,
          type: 'btree',
          columns: ['icd_10_code', 'cpt_code'],
          sql: `CREATE INDEX idx_${datasetType}_codes ON ${tableName} (icd_10_code, cpt_code);`
        });
        indexes.push({
          name: `idx_${datasetType}_severity_age`,
          type: 'btree',
          columns: ['severity_level', 'age_group'],
          sql: `CREATE INDEX idx_${datasetType}_severity_age ON ${tableName} (severity_level, age_group);`
        });
        break;

      case 'finance':
        indexes.push({
          name: `idx_${datasetType}_symbol_unique`,
          type: 'unique',
          columns: ['symbol'],
          sql: `CREATE UNIQUE INDEX idx_${datasetType}_symbol_unique ON ${tableName} (symbol);`
        });
        indexes.push({
          name: `idx_${datasetType}_company_fulltext`,
          type: 'fulltext',
          columns: ['company_name'],
          sql: `CREATE FULLTEXT INDEX idx_${datasetType}_company_fulltext ON ${tableName} (company_name);`
        });
        indexes.push({
          name: `idx_${datasetType}_sector_industry`,
          type: 'btree',
          columns: ['sector', 'industry'],
          sql: `CREATE INDEX idx_${datasetType}_sector_industry ON ${tableName} (sector, industry);`
        });
        indexes.push({
          name: `idx_${datasetType}_market_cap_price`,
          type: 'btree',
          columns: ['market_cap', 'current_price'],
          sql: `CREATE INDEX idx_${datasetType}_market_cap_price ON ${tableName} (market_cap, current_price);`
        });
        indexes.push({
          name: `idx_${datasetType}_performance`,
          type: 'btree',
          columns: ['pe_ratio', 'dividend_yield', 'beta'],
          sql: `CREATE INDEX idx_${datasetType}_performance ON ${tableName} (pe_ratio, dividend_yield, beta);`
        });
        break;

      case 'retail':
        indexes.push({
          name: `idx_${datasetType}_brand_model`,
          type: 'btree',
          columns: ['brand', 'model'],
          sql: `CREATE INDEX idx_${datasetType}_brand_model ON ${tableName} (brand, model);`
        });
        indexes.push({
          name: `idx_${datasetType}_sku_unique`,
          type: 'unique',
          columns: ['sku'],
          sql: `CREATE UNIQUE INDEX idx_${datasetType}_sku_unique ON ${tableName} (sku);`
        });
        indexes.push({
          name: `idx_${datasetType}_price_rating`,
          type: 'btree',
          columns: ['current_price', 'average_rating'],
          sql: `CREATE INDEX idx_${datasetType}_price_rating ON ${tableName} (current_price, average_rating);`
        });
        indexes.push({
          name: `idx_${datasetType}_stock_status`,
          type: 'btree',
          columns: ['in_stock', 'stock_quantity'],
          sql: `CREATE INDEX idx_${datasetType}_stock_status ON ${tableName} (in_stock, stock_quantity);`
        });
        indexes.push({
          name: `idx_${datasetType}_attributes`,
          type: 'btree',
          columns: ['color', 'size'],
          sql: `CREATE INDEX idx_${datasetType}_attributes ON ${tableName} (color, size);`
        });
        break;

      case 'education':
        indexes.push({
          name: `idx_${datasetType}_course_code_unique`,
          type: 'unique',
          columns: ['course_code'],
          sql: `CREATE UNIQUE INDEX idx_${datasetType}_course_code_unique ON ${tableName} (course_code);`
        });
        indexes.push({
          name: `idx_${datasetType}_subject_level`,
          type: 'btree',
          columns: ['subject_area', 'difficulty_level'],
          sql: `CREATE INDEX idx_${datasetType}_subject_level ON ${tableName} (subject_area, difficulty_level);`
        });
        indexes.push({
          name: `idx_${datasetType}_institution_instructor`,
          type: 'btree',
          columns: ['institution_name', 'instructor_name'],
          sql: `CREATE INDEX idx_${datasetType}_institution_instructor ON ${tableName} (institution_name, instructor_name);`
        });
        indexes.push({
          name: `idx_${datasetType}_ratings`,
          type: 'btree',
          columns: ['student_rating', 'completion_rate'],
          sql: `CREATE INDEX idx_${datasetType}_ratings ON ${tableName} (student_rating, completion_rate);`
        });
        break;

      case 'real_estate':
        indexes.push({
          name: `idx_${datasetType}_location`,
          type: 'btree',
          columns: ['city', 'state', 'zip_code'],
          sql: `CREATE INDEX idx_${datasetType}_location ON ${tableName} (city, state, zip_code);`
        });
        indexes.push({
          name: `idx_${datasetType}_price_range`,
          type: 'btree',
          columns: ['list_price', 'rent_price'],
          sql: `CREATE INDEX idx_${datasetType}_price_range ON ${tableName} (list_price, rent_price);`
        });
        indexes.push({
          name: `idx_${datasetType}_property_features`,
          type: 'btree',
          columns: ['property_type', 'bedrooms', 'bathrooms'],
          sql: `CREATE INDEX idx_${datasetType}_property_features ON ${tableName} (property_type, bedrooms, bathrooms);`
        });
        indexes.push({
          name: `idx_${datasetType}_size_year`,
          type: 'btree',
          columns: ['square_footage', 'year_built'],
          sql: `CREATE INDEX idx_${datasetType}_size_year ON ${tableName} (square_footage, year_built);`
        });
        indexes.push({
          name: `idx_${datasetType}_neighborhood`,
          type: 'btree',
          columns: ['neighborhood'],
          sql: `CREATE INDEX idx_${datasetType}_neighborhood ON ${tableName} (neighborhood);`
        });
        break;
    }

    return indexes;
  }

  /**
   * Generate complete DDL for table creation
   */
  generateDDL(datasetType, tableStructure, indexes) {
    const tableName = `${datasetType}_data`;

    let ddl = `-- MySQL DDL for ${tableName}\n\n`;
    
    // Create table
    ddl += `CREATE TABLE IF NOT EXISTS ${tableName} (\n`;
    
    const columns = Object.entries(tableStructure).map(([name, config]) => {
      let columnDef = `  ${name} ${config.type}`;
      
      if (config.collation) {
        columnDef += ` COLLATE ${config.collation}`;
      }
      
      if (config.constraints && config.constraints.length > 0) {
        columnDef += ` ${config.constraints.join(' ')}`;
      }
      
      if (config.default) {
        columnDef += ` DEFAULT ${config.default}`;
      }
      
      return columnDef;
    });
    
    ddl += columns.join(',\n') + '\n';
    ddl += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;
    
    // Add indexes
    indexes.forEach(index => {
      ddl += index.sql + '\n';
    });
    
    // Add triggers for automatic timestamp updates
    ddl += `\n-- Trigger to update date_updated\n`;
    ddl += `DELIMITER //\n`;
    ddl += `CREATE TRIGGER ${tableName}_update_timestamp\n`;
    ddl += `  BEFORE UPDATE ON ${tableName}\n`;
    ddl += `  FOR EACH ROW\n`;
    ddl += `BEGIN\n`;
    ddl += `  SET NEW.date_updated = CURRENT_TIMESTAMP();\n`;
    ddl += `END;//\n`;
    ddl += `DELIMITER ;\n\n`;
    
    return ddl;
  }

  /**
   * Generate search configuration for MySQL full-text search
   */
  generateSearchConfiguration(schema) {
    const searchFields = schema.properties?.search_fields?.properties || {};
    
    return {
      fullTextSearch: {
        enabled: true,
        mode: 'NATURAL LANGUAGE MODE',
        booleanMode: 'IN BOOLEAN MODE',
        searchFunction: 'MATCH() AGAINST()'
      },
      searchFields: {
        primary: searchFields.primary?.properties?.fields?.default || ['title'],
        secondary: searchFields.secondary?.properties?.fields?.default || ['description'],
        tertiary: searchFields.tertiary?.properties?.fields?.default || ['category'],
        faceted: searchFields.faceted?.properties?.fields?.default || ['type', 'status']
      },
      indexStrategy: 'fulltext_innodb',
      performanceHints: {
        useFullTextIndex: true,
        enableBooleanMode: true,
        ftMinWordLen: 4,
        ftMaxWordLen: 254
      }
    };
  }

  /**
   * Generate data transformation logic
   */
  generateDataTransformation(records, schema) {
    return {
      transformRecord: (record) => {
        const transformed = {
          id: record.id,
          title: record.title,
          description: record.description,
          category: record.category,
          type: record.type,
          status: record.status || 'active',
          date_created: record.date_created || new Date().toISOString().slice(0, 19).replace('T', ' '),
          language: record.language || 'en',
          metadata: JSON.stringify(record.metadata || {})
        };

        // Add dataset-specific transformations
        if (record.metadata) {
          Object.keys(record.metadata).forEach(key => {
            if (key !== 'dataset_type') {
              const columnName = this.camelToSnake(key);
              if (typeof record.metadata[key] === 'object') {
                transformed.metadata = JSON.stringify({
                  ...JSON.parse(transformed.metadata),
                  [key]: record.metadata[key]
                });
              } else {
                transformed[columnName] = record.metadata[key];
              }
            }
          });
        }

        return transformed;
      },

      bulkInsertQuery: (tableName, records) => {
        if (!records.length) return '';
        
        const columns = Object.keys(records[0]);
        const values = records.map(record => 
          `(${columns.map(col => this.formatValue(record[col])).join(', ')})`
        ).join(',\n    ');
        
        return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES\n    ${values}\n  ON DUPLICATE KEY UPDATE\n    ${columns.filter(c => c !== 'id').map(c => `${c} = VALUES(${c})`).join(',\n    ')};`;
      }
    };
  }

  /**
   * Generate MySQL-specific optimizations
   */
  generateOptimizations(datasetType, schema) {
    return {
      connectionPool: {
        connectionLimit: 10,
        queueLimit: 0,
        acquireTimeout: 60000,
        timeout: 60000
      },
      
      serverConfiguration: [
        'SET sql_mode = "STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO";',
        'SET innodb_buffer_pool_size = 1G;',
        'SET innodb_log_file_size = 256M;',
        'SET ft_min_word_len = 3;',
        'SET ft_boolean_syntax = "+ -><()~*:""&|";'
      ],
      
      partitioning: datasetType === 'finance' ? {
        strategy: 'range',
        column: 'YEAR(date_created)',
        partitions: 5
      } : null,
      
      caching: {
        queryCache: true,
        queryCacheSize: '256M',
        queryCacheType: 'ON'
      },
      
      maintenanceTasks: [
        `OPTIMIZE TABLE ${datasetType}_data;`,
        `ANALYZE TABLE ${datasetType}_data;`,
        `REPAIR TABLE ${datasetType}_data;`
      ]
    };
  }

  /**
   * Helper functions
   */
  camelToSnake(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  formatValue(value) {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''").replace(/\\/g, "\\\\")}'`;
    }
    if (typeof value === 'object') {
      return `'${JSON.stringify(value).replace(/'/g, "''").replace(/\\/g, "\\\\")}'`;
    }
    return value;
  }
}

// Export for use as module
module.exports = MySQLTransformer;

// CLI usage
if (require.main === module) {
  const transformer = new MySQLTransformer();
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: mysql-transformer.js <dataset-type> [output-file]');
    console.error('Example: mysql-transformer.js finance finance-mysql.sql');
    process.exit(1);
  }

  const datasetType = args[0];
  const outputFile = args[1];

  try {
    const result = transformer.transformDataset(datasetType);
    
    if (outputFile) {
      fs.writeFileSync(outputFile, result.ddl);
      console.log(`✅ MySQL DDL written to: ${outputFile}`);
      console.log(`📊 Table: ${result.tableName}`);
      console.log(`🔍 Search config: ${JSON.stringify(result.searchConfig, null, 2)}`);
    } else {
      console.log(result.ddl);
    }
  } catch (error) {
    console.error('❌ Transformation failed:', error.message);
    process.exit(1);
  }
}