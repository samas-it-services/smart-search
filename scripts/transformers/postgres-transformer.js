#!/usr/bin/env node

/**
 * @samas/smart-search - PostgreSQL Schema Transformer
 * Transforms universal dataset schemas to PostgreSQL-optimized table structures
 */

const fs = require('fs');
const path = require('path');

class PostgreSQLTransformer {
  constructor() {
    this.dataTypes = {
      string: 'VARCHAR(255)',
      text: 'TEXT',
      integer: 'INTEGER',
      number: 'DECIMAL(15,4)',
      boolean: 'BOOLEAN',
      date: 'DATE',
      datetime: 'TIMESTAMP',
      array: 'JSONB',
      object: 'JSONB'
    };

    this.indexTypes = {
      primary: 'PRIMARY KEY',
      unique: 'UNIQUE',
      btree: 'USING btree',
      gin: 'USING gin',
      gist: 'USING gist',
      hash: 'USING hash',
      fulltext: 'USING gin(to_tsvector(\'english\', {column}))'
    };
  }

  /**
   * Transform universal schema to PostgreSQL table structure
   */
  transformDataset(datasetType, universalSchema, records = []) {
    const schema = this.loadDatasetSchema(datasetType);
    const tableStructure = this.generateTableStructure(datasetType, schema);
    const indexes = this.generateIndexes(datasetType, schema, tableStructure);
    const searchConfig = this.generateSearchConfiguration(schema);
    const dataTransformation = this.generateDataTransformation(records, schema);

    return {
      tableName: `${datasetType}_data`,
      ddl: this.generateDDL(tableStructure, indexes),
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
   * Generate PostgreSQL table structure based on dataset schema
   */
  generateTableStructure(datasetType, schema) {
    const baseColumns = {
      id: { type: 'VARCHAR(255)', constraints: ['PRIMARY KEY'] },
      title: { type: 'TEXT', constraints: ['NOT NULL'] },
      description: { type: 'TEXT' },
      category: { type: 'VARCHAR(100)', constraints: ['NOT NULL'] },
      type: { type: 'VARCHAR(100)', constraints: ['NOT NULL'] },
      status: { type: 'VARCHAR(20)', constraints: [], default: "'active'" },
      date_created: { type: 'TIMESTAMP', constraints: [], default: 'NOW()' },
      date_updated: { type: 'TIMESTAMP', constraints: [], default: 'NOW()' },
      search_vector: { type: 'TSVECTOR', constraints: [] },
      metadata: { type: 'JSONB', constraints: [] },
      language: { type: 'VARCHAR(10)', constraints: [], default: "'en'" }
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
        columns.condition_name = { type: 'TEXT' };
        columns.treatment = { type: 'TEXT' };
        columns.specialty = { type: 'VARCHAR(100)' };
        columns.icd_10_code = { type: 'VARCHAR(20)' };
        columns.cpt_code = { type: 'VARCHAR(10)' };
        columns.severity_level = { type: 'VARCHAR(20)' };
        columns.age_group = { type: 'VARCHAR(20)' };
        columns.body_system = { type: 'JSONB' };
        columns.evidence_level = { type: 'VARCHAR(5)' };
        columns.fda_approved = { type: 'BOOLEAN' };
        break;

      case 'finance':
        columns.symbol = { type: 'VARCHAR(20)' };
        columns.company_name = { type: 'TEXT' };
        columns.exchange = { type: 'VARCHAR(20)' };
        columns.sector = { type: 'VARCHAR(50)' };
        columns.industry = { type: 'VARCHAR(100)' };
        columns.market_cap = { type: 'VARCHAR(20)' };
        columns.current_price = { type: 'DECIMAL(15,4)' };
        columns.volume = { type: 'BIGINT' };
        columns.pe_ratio = { type: 'DECIMAL(8,2)' };
        columns.dividend_yield = { type: 'DECIMAL(5,4)' };
        columns.beta = { type: 'DECIMAL(6,4)' };
        columns.risk_rating = { type: 'VARCHAR(20)' };
        break;

      case 'retail':
        columns.brand = { type: 'VARCHAR(100)' };
        columns.model = { type: 'VARCHAR(100)' };
        columns.sku = { type: 'VARCHAR(50)' };
        columns.upc = { type: 'VARCHAR(15)' };
        columns.current_price = { type: 'DECIMAL(10,2)' };
        columns.original_price = { type: 'DECIMAL(10,2)' };
        columns.in_stock = { type: 'BOOLEAN', default: 'true' };
        columns.stock_quantity = { type: 'INTEGER' };
        columns.average_rating = { type: 'DECIMAL(3,2)' };
        columns.review_count = { type: 'INTEGER' };
        columns.color = { type: 'VARCHAR(50)' };
        columns.size = { type: 'VARCHAR(20)' };
        columns.weight = { type: 'DECIMAL(10,3)' };
        break;

      case 'education':
        columns.course_code = { type: 'VARCHAR(20)' };
        columns.subject_area = { type: 'VARCHAR(100)' };
        columns.grade_level = { type: 'JSONB' };
        columns.difficulty_level = { type: 'VARCHAR(20)' };
        columns.credit_hours = { type: 'DECIMAL(4,2)' };
        columns.institution_name = { type: 'VARCHAR(200)' };
        columns.instructor_name = { type: 'VARCHAR(100)' };
        columns.duration = { type: 'VARCHAR(50)' };
        columns.content_type = { type: 'VARCHAR(50)' };
        columns.completion_rate = { type: 'DECIMAL(5,2)' };
        columns.student_rating = { type: 'DECIMAL(3,2)' };
        break;

      case 'real_estate':
        columns.property_type = { type: 'VARCHAR(50)' };
        columns.listing_type = { type: 'VARCHAR(20)' };
        columns.list_price = { type: 'DECIMAL(12,2)' };
        columns.rent_price = { type: 'DECIMAL(10,2)' };
        columns.square_footage = { type: 'INTEGER' };
        columns.lot_size = { type: 'INTEGER' };
        columns.bedrooms = { type: 'INTEGER' };
        columns.bathrooms = { type: 'DECIMAL(3,1)' };
        columns.year_built = { type: 'INTEGER' };
        columns.address = { type: 'TEXT' };
        columns.city = { type: 'VARCHAR(100)' };
        columns.state = { type: 'VARCHAR(20)' };
        columns.zip_code = { type: 'VARCHAR(10)' };
        columns.neighborhood = { type: 'VARCHAR(100)' };
        columns.garage_spaces = { type: 'INTEGER' };
        break;

      default:
        // Custom dataset - use flexible JSONB structure
        columns.custom_fields = { type: 'JSONB' };
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
      name: `idx_${datasetType}_search_vector`,
      type: 'gin',
      columns: ['search_vector'],
      sql: `CREATE INDEX idx_${datasetType}_search_vector ON ${tableName} USING gin(search_vector);`
    });

    indexes.push({
      name: `idx_${datasetType}_category`,
      type: 'btree',
      columns: ['category'],
      sql: `CREATE INDEX idx_${datasetType}_category ON ${tableName} USING btree(category);`
    });

    indexes.push({
      name: `idx_${datasetType}_type`,
      type: 'btree', 
      columns: ['type'],
      sql: `CREATE INDEX idx_${datasetType}_type ON ${tableName} USING btree(type);`
    });

    indexes.push({
      name: `idx_${datasetType}_status`,
      type: 'btree',
      columns: ['status'],
      sql: `CREATE INDEX idx_${datasetType}_status ON ${tableName} USING btree(status);`
    });

    indexes.push({
      name: `idx_${datasetType}_date_created`,
      type: 'btree',
      columns: ['date_created'],
      sql: `CREATE INDEX idx_${datasetType}_date_created ON ${tableName} USING btree(date_created);`
    });

    indexes.push({
      name: `idx_${datasetType}_metadata`,
      type: 'gin',
      columns: ['metadata'],
      sql: `CREATE INDEX idx_${datasetType}_metadata ON ${tableName} USING gin(metadata);`
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
          name: `idx_${datasetType}_condition`,
          type: 'gin',
          columns: ['condition_name'],
          sql: `CREATE INDEX idx_${datasetType}_condition ON ${tableName} USING gin(to_tsvector('english', condition_name));`
        });
        indexes.push({
          name: `idx_${datasetType}_specialty`,
          type: 'btree',
          columns: ['specialty'],
          sql: `CREATE INDEX idx_${datasetType}_specialty ON ${tableName} USING btree(specialty);`
        });
        indexes.push({
          name: `idx_${datasetType}_icd10`,
          type: 'btree',
          columns: ['icd_10_code'],
          sql: `CREATE INDEX idx_${datasetType}_icd10 ON ${tableName} USING btree(icd_10_code);`
        });
        indexes.push({
          name: `idx_${datasetType}_severity`,
          type: 'btree',
          columns: ['severity_level'],
          sql: `CREATE INDEX idx_${datasetType}_severity ON ${tableName} USING btree(severity_level);`
        });
        break;

      case 'finance':
        indexes.push({
          name: `idx_${datasetType}_symbol`,
          type: 'unique',
          columns: ['symbol'],
          sql: `CREATE UNIQUE INDEX idx_${datasetType}_symbol ON ${tableName} USING btree(symbol);`
        });
        indexes.push({
          name: `idx_${datasetType}_company`,
          type: 'gin',
          columns: ['company_name'],
          sql: `CREATE INDEX idx_${datasetType}_company ON ${tableName} USING gin(to_tsvector('english', company_name));`
        });
        indexes.push({
          name: `idx_${datasetType}_sector`,
          type: 'btree',
          columns: ['sector'],
          sql: `CREATE INDEX idx_${datasetType}_sector ON ${tableName} USING btree(sector);`
        });
        indexes.push({
          name: `idx_${datasetType}_market_cap`,
          type: 'btree',
          columns: ['market_cap'],
          sql: `CREATE INDEX idx_${datasetType}_market_cap ON ${tableName} USING btree(market_cap);`
        });
        indexes.push({
          name: `idx_${datasetType}_price_range`,
          type: 'btree',
          columns: ['current_price'],
          sql: `CREATE INDEX idx_${datasetType}_price_range ON ${tableName} USING btree(current_price);`
        });
        break;

      case 'retail':
        indexes.push({
          name: `idx_${datasetType}_brand`,
          type: 'btree',
          columns: ['brand'],
          sql: `CREATE INDEX idx_${datasetType}_brand ON ${tableName} USING btree(brand);`
        });
        indexes.push({
          name: `idx_${datasetType}_sku`,
          type: 'unique',
          columns: ['sku'],
          sql: `CREATE UNIQUE INDEX idx_${datasetType}_sku ON ${tableName} USING btree(sku) WHERE sku IS NOT NULL;`
        });
        indexes.push({
          name: `idx_${datasetType}_price_rating`,
          type: 'btree',
          columns: ['current_price', 'average_rating'],
          sql: `CREATE INDEX idx_${datasetType}_price_rating ON ${tableName} USING btree(current_price, average_rating);`
        });
        indexes.push({
          name: `idx_${datasetType}_in_stock`,
          type: 'btree',
          columns: ['in_stock'],
          sql: `CREATE INDEX idx_${datasetType}_in_stock ON ${tableName} USING btree(in_stock);`
        });
        break;

      case 'education':
        indexes.push({
          name: `idx_${datasetType}_course_code`,
          type: 'unique',
          columns: ['course_code'],
          sql: `CREATE UNIQUE INDEX idx_${datasetType}_course_code ON ${tableName} USING btree(course_code) WHERE course_code IS NOT NULL;`
        });
        indexes.push({
          name: `idx_${datasetType}_subject`,
          type: 'btree',
          columns: ['subject_area'],
          sql: `CREATE INDEX idx_${datasetType}_subject ON ${tableName} USING btree(subject_area);`
        });
        indexes.push({
          name: `idx_${datasetType}_level`,
          type: 'gin',
          columns: ['grade_level'],
          sql: `CREATE INDEX idx_${datasetType}_level ON ${tableName} USING gin(grade_level);`
        });
        indexes.push({
          name: `idx_${datasetType}_institution`,
          type: 'btree',
          columns: ['institution_name'],
          sql: `CREATE INDEX idx_${datasetType}_institution ON ${tableName} USING btree(institution_name);`
        });
        break;

      case 'real_estate':
        indexes.push({
          name: `idx_${datasetType}_location`,
          type: 'btree',
          columns: ['city', 'state', 'zip_code'],
          sql: `CREATE INDEX idx_${datasetType}_location ON ${tableName} USING btree(city, state, zip_code);`
        });
        indexes.push({
          name: `idx_${datasetType}_price_range`,
          type: 'btree',
          columns: ['list_price'],
          sql: `CREATE INDEX idx_${datasetType}_price_range ON ${tableName} USING btree(list_price);`
        });
        indexes.push({
          name: `idx_${datasetType}_property_type`,
          type: 'btree',
          columns: ['property_type'],
          sql: `CREATE INDEX idx_${datasetType}_property_type ON ${tableName} USING btree(property_type);`
        });
        indexes.push({
          name: `idx_${datasetType}_beds_baths`,
          type: 'btree',
          columns: ['bedrooms', 'bathrooms'],
          sql: `CREATE INDEX idx_${datasetType}_beds_baths ON ${tableName} USING btree(bedrooms, bathrooms);`
        });
        indexes.push({
          name: `idx_${datasetType}_sqft`,
          type: 'btree',
          columns: ['square_footage'],
          sql: `CREATE INDEX idx_${datasetType}_sqft ON ${tableName} USING btree(square_footage);`
        });
        break;
    }

    return indexes;
  }

  /**
   * Generate complete DDL for table creation
   */
  generateDDL(tableStructure, indexes) {
    const tableName = Object.keys(tableStructure).length ? 
      `${Object.keys(tableStructure)[0].split('_')[0]}_data` : 'dataset_data';

    let ddl = `-- PostgreSQL DDL for ${tableName}\n\n`;
    
    // Create table
    ddl += `CREATE TABLE IF NOT EXISTS ${tableName} (\n`;
    
    const columns = Object.entries(tableStructure).map(([name, config]) => {
      let columnDef = `  ${name} ${config.type}`;
      
      if (config.constraints && config.constraints.length > 0) {
        columnDef += ` ${config.constraints.join(' ')}`;
      }
      
      if (config.default) {
        columnDef += ` DEFAULT ${config.default}`;
      }
      
      return columnDef;
    });
    
    ddl += columns.join(',\n') + '\n);\n\n';
    
    // Add indexes
    indexes.forEach(index => {
      ddl += index.sql + '\n';
    });
    
    // Add triggers for search vector maintenance
    ddl += `\n-- Trigger to maintain search vector\n`;
    ddl += `CREATE OR REPLACE FUNCTION ${tableName}_search_vector_update() RETURNS trigger AS $$\n`;
    ddl += `BEGIN\n`;
    ddl += `  NEW.search_vector := to_tsvector('english', \n`;
    ddl += `    COALESCE(NEW.title, '') || ' ' ||\n`;
    ddl += `    COALESCE(NEW.description, '') || ' ' ||\n`;
    ddl += `    COALESCE(NEW.category, '')\n`;
    ddl += `  );\n`;
    ddl += `  NEW.date_updated := NOW();\n`;
    ddl += `  RETURN NEW;\n`;
    ddl += `END;\n`;
    ddl += `$$ LANGUAGE plpgsql;\n\n`;
    
    ddl += `CREATE TRIGGER ${tableName}_search_vector_trigger\n`;
    ddl += `  BEFORE INSERT OR UPDATE ON ${tableName}\n`;
    ddl += `  FOR EACH ROW EXECUTE FUNCTION ${tableName}_search_vector_update();\n\n`;
    
    return ddl;
  }

  /**
   * Generate search configuration for PostgreSQL full-text search
   */
  generateSearchConfiguration(schema) {
    const searchFields = schema.properties?.search_fields?.properties || {};
    
    return {
      fullTextSearch: {
        enabled: true,
        language: 'english',
        searchColumn: 'search_vector',
        rankingFunction: 'ts_rank'
      },
      searchFields: {
        primary: searchFields.primary?.properties?.fields?.default || ['title'],
        secondary: searchFields.secondary?.properties?.fields?.default || ['description'],
        tertiary: searchFields.tertiary?.properties?.fields?.default || ['category'],
        faceted: searchFields.faceted?.properties?.fields?.default || ['type', 'status']
      },
      indexStrategy: 'gin_tsvector',
      performanceHints: {
        useSearchVector: true,
        enablePartialMatches: true,
        cacheFrequentQueries: true
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
          date_created: record.date_created || new Date().toISOString(),
          language: record.language || 'en',
          metadata: record.metadata || {}
        };

        // Add dataset-specific transformations
        if (record.metadata) {
          Object.keys(record.metadata).forEach(key => {
            if (key !== 'dataset_type') {
              const columnName = this.camelToSnake(key);
              if (typeof record.metadata[key] === 'object') {
                transformed.metadata[key] = record.metadata[key];
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
        
        return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES\n    ${values}\n  ON CONFLICT (id) DO UPDATE SET\n    ${columns.filter(c => c !== 'id').map(c => `${c} = EXCLUDED.${c}`).join(',\n    ')};`;
      }
    };
  }

  /**
   * Generate PostgreSQL-specific optimizations
   */
  generateOptimizations(datasetType, schema) {
    return {
      connectionPool: {
        min: 2,
        max: 10,
        idle: 10000,
        acquire: 60000,
        evict: 1000
      },
      
      queryOptimizations: [
        'SET enable_seqscan = off;', // Prefer index scans
        'SET random_page_cost = 1.1;', // Optimize for SSD
        'SET effective_cache_size = \'1GB\';',
        `SET default_text_search_config = 'english';`
      ],
      
      partitioning: datasetType === 'real_estate' ? {
        strategy: 'range',
        column: 'date_created',
        interval: 'monthly'
      } : null,
      
      materializedViews: this.generateMaterializedViews(datasetType),
      
      vacuumStrategy: {
        autovacuum: true,
        autovacuum_analyze_threshold: 50,
        autovacuum_vacuum_threshold: 50
      }
    };
  }

  /**
   * Generate materialized views for common queries
   */
  generateMaterializedViews(datasetType) {
    const views = [];

    switch (datasetType) {
      case 'finance':
        views.push({
          name: `${datasetType}_sector_summary`,
          sql: `
            CREATE MATERIALIZED VIEW ${datasetType}_sector_summary AS
            SELECT 
              sector,
              COUNT(*) as count,
              AVG(current_price) as avg_price,
              AVG(pe_ratio) as avg_pe_ratio
            FROM ${datasetType}_data
            WHERE status = 'active'
            GROUP BY sector;
          `
        });
        break;
        
      case 'retail':
        views.push({
          name: `${datasetType}_brand_summary`, 
          sql: `
            CREATE MATERIALIZED VIEW ${datasetType}_brand_summary AS
            SELECT 
              brand,
              COUNT(*) as product_count,
              AVG(current_price) as avg_price,
              AVG(average_rating) as avg_rating
            FROM ${datasetType}_data
            WHERE status = 'active' AND in_stock = true
            GROUP BY brand;
          `
        });
        break;
    }

    return views;
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
      return `'${value.replace(/'/g, "''")}'`;
    }
    if (typeof value === 'object') {
      return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
    }
    return value;
  }
}

// Export for use as module
module.exports = PostgreSQLTransformer;

// CLI usage
if (require.main === module) {
  const transformer = new PostgreSQLTransformer();
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: postgres-transformer.js <dataset-type> [output-file]');
    console.error('Example: postgres-transformer.js healthcare healthcare-postgres.sql');
    process.exit(1);
  }

  const datasetType = args[0];
  const outputFile = args[1];

  try {
    const result = transformer.transformDataset(datasetType);
    
    if (outputFile) {
      fs.writeFileSync(outputFile, result.ddl);
      console.log(`✅ PostgreSQL DDL written to: ${outputFile}`);
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