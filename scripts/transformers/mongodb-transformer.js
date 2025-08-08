#!/usr/bin/env node

/**
 * @samas/smart-search - MongoDB Schema Transformer
 * Transforms universal dataset schemas to MongoDB-optimized document structures
 */

const fs = require('fs');
const path = require('path');

class MongoDBTransformer {
  constructor() {
    this.dataTypes = {
      string: 'String',
      text: 'String',
      integer: 'Number',
      number: 'Number',
      boolean: 'Boolean',
      date: 'Date',
      datetime: 'Date',
      array: 'Array',
      object: 'Object'
    };

    this.indexTypes = {
      single: 'single field',
      compound: 'compound',
      multikey: 'multikey',
      text: 'text',
      geo: '2dsphere',
      hashed: 'hashed',
      sparse: 'sparse',
      partial: 'partial',
      ttl: 'TTL'
    };
  }

  /**
   * Transform universal schema to MongoDB collection structure
   */
  transformDataset(datasetType, universalSchema, records = []) {
    const schema = this.loadDatasetSchema(datasetType);
    const documentStructure = this.generateDocumentStructure(datasetType, schema);
    const indexes = this.generateIndexes(datasetType, schema, documentStructure);
    const searchConfig = this.generateSearchConfiguration(schema);
    const dataTransformation = this.generateDataTransformation(records, schema);

    return {
      collectionName: `${datasetType}_data`,
      documentStructure,
      indexes,
      searchConfig,
      dataTransformation,
      optimizations: this.generateOptimizations(datasetType, schema),
      validationRules: this.generateValidationRules(datasetType, schema),
      aggregationPipelines: this.generateAggregationPipelines(datasetType, schema)
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
   * Generate MongoDB document structure based on dataset schema
   */
  generateDocumentStructure(datasetType, schema) {
    const baseDocument = {
      _id: { type: 'ObjectId', description: 'MongoDB document ID' },
      id: { type: 'String', required: true, unique: true, description: 'Business identifier' },
      title: { type: 'String', required: true, description: 'Primary title' },
      description: { type: 'String', description: 'Detailed description' },
      category: { type: 'String', required: true, description: 'Classification category' },
      type: { type: 'String', required: true, description: 'Content type' },
      status: { type: 'String', default: 'active', enum: ['active', 'inactive', 'deprecated', 'draft', 'pending'], description: 'Record status' },
      dateCreated: { type: 'Date', default: Date.now, description: 'Creation timestamp' },
      dateUpdated: { type: 'Date', default: Date.now, description: 'Last update timestamp' },
      language: { type: 'String', default: 'en', description: 'Content language' },
      tags: { type: 'Array', items: 'String', description: 'Searchable tags' },
      searchTerms: { type: 'Array', items: 'String', description: 'Preprocessed search terms' },
      metadata: { type: 'Object', description: 'Flexible metadata object' }
    };

    // Add dataset-specific fields based on schema
    const specificFields = this.generateDatasetFields(datasetType, schema);
    
    return { ...baseDocument, ...specificFields };
  }

  /**
   * Generate dataset-specific document fields
   */
  generateDatasetFields(datasetType, schema) {
    const fields = {};

    switch (datasetType) {
      case 'healthcare':
        fields.medical = {
          type: 'Object',
          properties: {
            conditionName: { type: 'String', description: 'Medical condition' },
            treatment: { type: 'String', description: 'Treatment protocol' },
            specialty: { type: 'String', description: 'Medical specialty' },
            codes: {
              type: 'Object',
              properties: {
                icd10: { type: 'String', description: 'ICD-10 code' },
                cpt: { type: 'String', description: 'CPT code' },
                loinc: { type: 'String', description: 'LOINC code' },
                rxnorm: { type: 'String', description: 'RxNorm code' },
                snomed: { type: 'String', description: 'SNOMED CT code' }
              }
            },
            clinical: {
              type: 'Object',
              properties: {
                severityLevel: { type: 'String', enum: ['low', 'mild', 'moderate', 'high', 'severe', 'critical'] },
                ageGroup: { type: 'String', enum: ['neonatal', 'infant', 'pediatric', 'adolescent', 'adult', 'geriatric', 'all_ages'] },
                genderSpecific: { type: 'String', enum: ['male', 'female', 'all', 'not_applicable'] },
                treatmentPhase: { type: 'String', enum: ['prevention', 'screening', 'diagnosis', 'treatment', 'monitoring', 'followup'] },
                bodySystems: { type: 'Array', items: 'String' },
                symptoms: { type: 'Array', items: 'String' },
                contraindications: { type: 'Array', items: 'String' }
              }
            },
            regulatory: {
              type: 'Object',
              properties: {
                fdaApproved: { type: 'Boolean' },
                hipaaLevel: { type: 'String', enum: ['public', 'protected', 'restricted', 'confidential'] },
                clinicalTrialPhase: { type: 'String', enum: ['preclinical', 'phase0', 'phase1', 'phase2', 'phase3', 'phase4', 'approved'] }
              }
            },
            performance: {
              type: 'Object',
              properties: {
                successRate: { type: 'Number', min: 0, max: 100 },
                evidenceLevel: { type: 'String', enum: ['A', 'B', 'C', 'D', 'E'] },
                lastUpdated: { type: 'Date' }
              }
            }
          }
        };
        break;

      case 'finance':
        fields.financial = {
          type: 'Object',
          properties: {
            symbol: { type: 'String', required: true, unique: true, description: 'Trading symbol' },
            companyName: { type: 'String', description: 'Company name' },
            identifiers: {
              type: 'Object',
              properties: {
                isin: { type: 'String', description: 'ISIN identifier' },
                cusip: { type: 'String', description: 'CUSIP identifier' },
                sedol: { type: 'String', description: 'SEDOL identifier' }
              }
            },
            market: {
              type: 'Object',
              properties: {
                exchange: { type: 'String', description: 'Trading exchange' },
                sector: { type: 'String', description: 'Industry sector' },
                industry: { type: 'String', description: 'Specific industry' },
                marketCap: { type: 'String', enum: ['nano', 'micro', 'small', 'mid', 'large', 'mega'] },
                currency: { type: 'String', default: 'USD' },
                country: { type: 'String', description: 'Country code' }
              }
            },
            pricing: {
              type: 'Object',
              properties: {
                currentPrice: { type: 'Number', min: 0 },
                previousClose: { type: 'Number', min: 0 },
                dayHigh: { type: 'Number', min: 0 },
                dayLow: { type: 'Number', min: 0 },
                volume: { type: 'Number', min: 0 },
                bid: { type: 'Number', min: 0 },
                ask: { type: 'Number', min: 0 },
                lastUpdated: { type: 'Date', default: Date.now }
              }
            },
            risk: {
              type: 'Object',
              properties: {
                volatility: { type: 'Number', min: 0, max: 100 },
                beta: { type: 'Number' },
                sharpeRatio: { type: 'Number' },
                riskRating: { type: 'String', enum: ['very_conservative', 'conservative', 'moderate', 'aggressive', 'very_aggressive', 'speculative'] }
              }
            },
            performance: {
              type: 'Object',
              properties: {
                ytdReturn: { type: 'Number' },
                trailing1m: { type: 'Number' },
                trailing12m: { type: 'Number' },
                dividendYield: { type: 'Number', min: 0 },
                peRatio: { type: 'Number', min: 0 },
                pbRatio: { type: 'Number', min: 0 }
              }
            }
          }
        };
        break;

      case 'retail':
        fields.product = {
          type: 'Object',
          properties: {
            brand: { type: 'String', description: 'Product brand' },
            model: { type: 'String', description: 'Product model' },
            identifiers: {
              type: 'Object',
              properties: {
                sku: { type: 'String', unique: true, description: 'Stock Keeping Unit' },
                upc: { type: 'String', description: 'Universal Product Code' },
                ean: { type: 'String', description: 'European Article Number' },
                isbn: { type: 'String', description: 'ISBN for books' }
              }
            },
            specifications: {
              type: 'Object',
              properties: {
                weight: { type: 'Number', min: 0, description: 'Weight in grams' },
                dimensions: {
                  type: 'Object',
                  properties: {
                    length: { type: 'Number', min: 0 },
                    width: { type: 'Number', min: 0 },
                    height: { type: 'Number', min: 0 },
                    unit: { type: 'String', enum: ['mm', 'cm', 'm', 'in', 'ft'], default: 'cm' }
                  }
                },
                color: { type: 'String' },
                size: { type: 'String' },
                materials: { type: 'Array', items: 'String' }
              }
            },
            pricing: {
              type: 'Object',
              properties: {
                msrp: { type: 'Number', min: 0, description: 'MSRP' },
                currentPrice: { type: 'Number', min: 0, description: 'Current price' },
                originalPrice: { type: 'Number', min: 0, description: 'Original price' },
                discountPercent: { type: 'Number', min: 0, max: 100 },
                currency: { type: 'String', default: 'USD' },
                pricingTier: { type: 'String', enum: ['budget', 'value', 'premium', 'luxury'] }
              }
            },
            inventory: {
              type: 'Object',
              properties: {
                inStock: { type: 'Boolean', default: true },
                stockQuantity: { type: 'Number', min: 0 },
                warehouseLocations: { type: 'Array', items: 'String' },
                shippingTime: { type: 'String' },
                backorderAllowed: { type: 'Boolean', default: false }
              }
            },
            quality: {
              type: 'Object',
              properties: {
                averageRating: { type: 'Number', min: 1, max: 5 },
                reviewCount: { type: 'Number', min: 0 },
                returnRate: { type: 'Number', min: 0, max: 100 },
                warrantyPeriod: { type: 'String' },
                certifications: { type: 'Array', items: 'String' }
              }
            }
          }
        };
        break;

      case 'education':
        fields.academic = {
          type: 'Object',
          properties: {
            courseCode: { type: 'String', unique: true, description: 'Course identifier' },
            subjectArea: { type: 'String', description: 'Academic subject' },
            gradeLevel: { type: 'Array', items: 'String', description: 'Target grade levels' },
            difficultyLevel: { type: 'String', enum: ['beginner', 'intermediate', 'advanced', 'expert', 'variable'] },
            creditHours: { type: 'Number', min: 0, max: 20 },
            prerequisites: { type: 'Array', items: 'String' },
            learningObjectives: { type: 'Array', items: 'String' },
            content: {
              type: 'Object',
              properties: {
                contentType: { type: 'String', enum: ['course', 'lesson', 'module', 'tutorial', 'workshop'] },
                format: { type: 'Array', items: 'String' },
                duration: { type: 'String' },
                sequenceNumber: { type: 'Number', min: 1 }
              }
            },
            pedagogy: {
              type: 'Object',
              properties: {
                teachingMethods: { type: 'Array', items: 'String' },
                learningStyles: { type: 'Array', items: 'String' },
                bloomTaxonomy: { type: 'Array', items: 'String' },
                accessibilityFeatures: { type: 'Array', items: 'String' }
              }
            },
            institution: {
              type: 'Object',
              properties: {
                name: { type: 'String' },
                type: { type: 'String', enum: ['university', 'college', 'online_platform', 'k12_school'] },
                department: { type: 'String' },
                instructorName: { type: 'String' },
                instructorCredentials: { type: 'Array', items: 'String' }
              }
            },
            metrics: {
              type: 'Object',
              properties: {
                studentRating: { type: 'Number', min: 1, max: 5 },
                completionRate: { type: 'Number', min: 0, max: 100 },
                passRate: { type: 'Number', min: 0, max: 100 },
                engagementScore: { type: 'Number', min: 0, max: 100 }
              }
            }
          }
        };
        break;

      case 'real_estate':
        fields.property = {
          type: 'Object',
          properties: {
            propertyType: { type: 'String', description: 'Type of property' },
            listingType: { type: 'String', enum: ['for_sale', 'for_rent', 'sold', 'rented', 'off_market'] },
            specifications: {
              type: 'Object',
              properties: {
                squareFootage: { type: 'Number', min: 0 },
                lotSize: { type: 'Number', min: 0 },
                bedrooms: { type: 'Number', min: 0 },
                bathrooms: { type: 'Number', min: 0 },
                floors: { type: 'Number', min: 1 },
                yearBuilt: { type: 'Number', min: 1800, max: 2030 },
                garageSpaces: { type: 'Number', min: 0 },
                pool: { type: 'Boolean', default: false },
                fireplace: { type: 'Boolean', default: false },
                basement: { type: 'Boolean', default: false }
              }
            },
            location: {
              type: 'Object',
              properties: {
                address: {
                  type: 'Object',
                  properties: {
                    streetNumber: { type: 'String' },
                    streetName: { type: 'String' },
                    unit: { type: 'String' },
                    city: { type: 'String', required: true },
                    state: { type: 'String', required: true },
                    zipCode: { type: 'String', required: true },
                    country: { type: 'String', default: 'US' }
                  }
                },
                coordinates: {
                  type: 'Object',
                  properties: {
                    type: { type: 'String', enum: ['Point'], default: 'Point' },
                    coordinates: { type: 'Array', items: 'Number', description: '[longitude, latitude]' }
                  }
                },
                neighborhood: { type: 'String' },
                schoolDistrict: { type: 'String' },
                walkabilityScore: { type: 'Number', min: 0, max: 100 }
              }
            },
            pricing: {
              type: 'Object',
              properties: {
                listPrice: { type: 'Number', min: 0 },
                rentPrice: { type: 'Number', min: 0 },
                pricePerSqft: { type: 'Number', min: 0 },
                propertyTaxes: { type: 'Number', min: 0 },
                hoaFees: { type: 'Number', min: 0 },
                insuranceEstimate: { type: 'Number', min: 0 }
              }
            },
            features: {
              type: 'Object',
              properties: {
                interiorFeatures: { type: 'Array', items: 'String' },
                exteriorFeatures: { type: 'Array', items: 'String' },
                appliances: { type: 'Array', items: 'String' },
                parking: {
                  type: 'Object',
                  properties: {
                    type: { type: 'String', enum: ['garage', 'carport', 'driveway', 'street'] },
                    spaces: { type: 'Number', min: 0 }
                  }
                }
              }
            },
            market: {
              type: 'Object',
              properties: {
                daysOnMarket: { type: 'Number', min: 0 },
                priceHistory: { type: 'Array', items: 'Object' },
                comparableSales: { type: 'Array', items: 'Object' }
              }
            }
          }
        };
        break;

      default:
        // Custom dataset - use flexible structure
        fields.customData = {
          type: 'Object',
          description: 'Flexible data structure for custom datasets'
        };
        break;
    }

    return fields;
  }

  /**
   * Generate optimized indexes for dataset
   */
  generateIndexes(datasetType, schema, documentStructure) {
    const collectionName = `${datasetType}_data`;
    const indexes = [];

    // Always create these essential indexes
    indexes.push({
      name: `${datasetType}_id_unique`,
      type: 'unique',
      keys: { id: 1 },
      options: { unique: true, background: true },
      command: `db.${collectionName}.createIndex({ "id": 1 }, { unique: true, background: true })`
    });

    indexes.push({
      name: `${datasetType}_category_type`,
      type: 'compound',
      keys: { category: 1, type: 1 },
      options: { background: true },
      command: `db.${collectionName}.createIndex({ "category": 1, "type": 1 }, { background: true })`
    });

    indexes.push({
      name: `${datasetType}_status_date`,
      type: 'compound',
      keys: { status: 1, dateCreated: -1 },
      options: { background: true },
      command: `db.${collectionName}.createIndex({ "status": 1, "dateCreated": -1 }, { background: true })`
    });

    indexes.push({
      name: `${datasetType}_text_search`,
      type: 'text',
      keys: { title: 'text', description: 'text', tags: 'text' },
      options: { 
        background: true,
        weights: { title: 10, description: 5, tags: 1 },
        name: `${datasetType}_text_index`
      },
      command: `db.${collectionName}.createIndex({ "title": "text", "description": "text", "tags": "text" }, { background: true, weights: { title: 10, description: 5, tags: 1 }, name: "${datasetType}_text_index" })`
    });

    indexes.push({
      name: `${datasetType}_language`,
      type: 'single',
      keys: { language: 1 },
      options: { background: true },
      command: `db.${collectionName}.createIndex({ "language": 1 }, { background: true })`
    });

    // Add dataset-specific indexes
    const specificIndexes = this.generateDatasetSpecificIndexes(datasetType, collectionName);
    indexes.push(...specificIndexes);

    return indexes;
  }

  /**
   * Generate dataset-specific indexes for optimal search performance
   */
  generateDatasetSpecificIndexes(datasetType, collectionName) {
    const indexes = [];

    switch (datasetType) {
      case 'healthcare':
        indexes.push({
          name: `${datasetType}_medical_codes`,
          type: 'compound',
          keys: { 'medical.codes.icd10': 1, 'medical.codes.cpt': 1 },
          options: { background: true, sparse: true },
          command: `db.${collectionName}.createIndex({ "medical.codes.icd10": 1, "medical.codes.cpt": 1 }, { background: true, sparse: true })`
        });
        
        indexes.push({
          name: `${datasetType}_specialty_severity`,
          type: 'compound',
          keys: { 'medical.specialty': 1, 'medical.clinical.severityLevel': 1 },
          options: { background: true },
          command: `db.${collectionName}.createIndex({ "medical.specialty": 1, "medical.clinical.severityLevel": 1 }, { background: true })`
        });

        indexes.push({
          name: `${datasetType}_body_systems`,
          type: 'multikey',
          keys: { 'medical.clinical.bodySystems': 1 },
          options: { background: true },
          command: `db.${collectionName}.createIndex({ "medical.clinical.bodySystems": 1 }, { background: true })`
        });

        indexes.push({
          name: `${datasetType}_fda_approved`,
          type: 'single',
          keys: { 'medical.regulatory.fdaApproved': 1 },
          options: { background: true, sparse: true },
          command: `db.${collectionName}.createIndex({ "medical.regulatory.fdaApproved": 1 }, { background: true, sparse: true })`
        });
        break;

      case 'finance':
        indexes.push({
          name: `${datasetType}_symbol_unique`,
          type: 'unique',
          keys: { 'financial.symbol': 1 },
          options: { unique: true, background: true },
          command: `db.${collectionName}.createIndex({ "financial.symbol": 1 }, { unique: true, background: true })`
        });

        indexes.push({
          name: `${datasetType}_sector_market_cap`,
          type: 'compound',
          keys: { 'financial.market.sector': 1, 'financial.market.marketCap': 1 },
          options: { background: true },
          command: `db.${collectionName}.createIndex({ "financial.market.sector": 1, "financial.market.marketCap": 1 }, { background: true })`
        });

        indexes.push({
          name: `${datasetType}_price_volume`,
          type: 'compound',
          keys: { 'financial.pricing.currentPrice': 1, 'financial.pricing.volume': -1 },
          options: { background: true },
          command: `db.${collectionName}.createIndex({ "financial.pricing.currentPrice": 1, "financial.pricing.volume": -1 }, { background: true })`
        });

        indexes.push({
          name: `${datasetType}_exchange`,
          type: 'single',
          keys: { 'financial.market.exchange': 1 },
          options: { background: true },
          command: `db.${collectionName}.createIndex({ "financial.market.exchange": 1 }, { background: true })`
        });
        break;

      case 'retail':
        indexes.push({
          name: `${datasetType}_sku_unique`,
          type: 'unique',
          keys: { 'product.identifiers.sku': 1 },
          options: { unique: true, background: true, sparse: true },
          command: `db.${collectionName}.createIndex({ "product.identifiers.sku": 1 }, { unique: true, background: true, sparse: true })`
        });

        indexes.push({
          name: `${datasetType}_brand_category`,
          type: 'compound',
          keys: { 'product.brand': 1, category: 1 },
          options: { background: true },
          command: `db.${collectionName}.createIndex({ "product.brand": 1, "category": 1 }, { background: true })`
        });

        indexes.push({
          name: `${datasetType}_price_rating`,
          type: 'compound',
          keys: { 'product.pricing.currentPrice': 1, 'product.quality.averageRating': -1 },
          options: { background: true },
          command: `db.${collectionName}.createIndex({ "product.pricing.currentPrice": 1, "product.quality.averageRating": -1 }, { background: true })`
        });

        indexes.push({
          name: `${datasetType}_stock_status`,
          type: 'compound',
          keys: { 'product.inventory.inStock': 1, 'product.inventory.stockQuantity': -1 },
          options: { background: true },
          command: `db.${collectionName}.createIndex({ "product.inventory.inStock": 1, "product.inventory.stockQuantity": -1 }, { background: true })`
        });
        break;

      case 'education':
        indexes.push({
          name: `${datasetType}_course_code_unique`,
          type: 'unique',
          keys: { 'academic.courseCode': 1 },
          options: { unique: true, background: true, sparse: true },
          command: `db.${collectionName}.createIndex({ "academic.courseCode": 1 }, { unique: true, background: true, sparse: true })`
        });

        indexes.push({
          name: `${datasetType}_subject_level`,
          type: 'compound',
          keys: { 'academic.subjectArea': 1, 'academic.difficultyLevel': 1 },
          options: { background: true },
          command: `db.${collectionName}.createIndex({ "academic.subjectArea": 1, "academic.difficultyLevel": 1 }, { background: true })`
        });

        indexes.push({
          name: `${datasetType}_grade_levels`,
          type: 'multikey',
          keys: { 'academic.gradeLevel': 1 },
          options: { background: true },
          command: `db.${collectionName}.createIndex({ "academic.gradeLevel": 1 }, { background: true })`
        });

        indexes.push({
          name: `${datasetType}_institution`,
          type: 'single',
          keys: { 'academic.institution.name': 1 },
          options: { background: true },
          command: `db.${collectionName}.createIndex({ "academic.institution.name": 1 }, { background: true })`
        });
        break;

      case 'real_estate':
        indexes.push({
          name: `${datasetType}_location_2dsphere`,
          type: 'geo',
          keys: { 'property.location.coordinates': '2dsphere' },
          options: { background: true, sparse: true },
          command: `db.${collectionName}.createIndex({ "property.location.coordinates": "2dsphere" }, { background: true, sparse: true })`
        });

        indexes.push({
          name: `${datasetType}_city_state_zip`,
          type: 'compound',
          keys: { 'property.location.address.city': 1, 'property.location.address.state': 1, 'property.location.address.zipCode': 1 },
          options: { background: true },
          command: `db.${collectionName}.createIndex({ "property.location.address.city": 1, "property.location.address.state": 1, "property.location.address.zipCode": 1 }, { background: true })`
        });

        indexes.push({
          name: `${datasetType}_price_beds_baths`,
          type: 'compound',
          keys: { 'property.pricing.listPrice': 1, 'property.specifications.bedrooms': 1, 'property.specifications.bathrooms': 1 },
          options: { background: true },
          command: `db.${collectionName}.createIndex({ "property.pricing.listPrice": 1, "property.specifications.bedrooms": 1, "property.specifications.bathrooms": 1 }, { background: true })`
        });

        indexes.push({
          name: `${datasetType}_property_type_listing`,
          type: 'compound',
          keys: { 'property.propertyType': 1, 'property.listingType': 1 },
          options: { background: true },
          command: `db.${collectionName}.createIndex({ "property.propertyType": 1, "property.listingType": 1 }, { background: true })`
        });
        break;
    }

    return indexes;
  }

  /**
   * Generate search configuration for MongoDB text search
   */
  generateSearchConfiguration(schema) {
    const searchFields = schema.properties?.search_fields?.properties || {};
    
    return {
      textSearch: {
        enabled: true,
        indexName: 'text_search_index',
        language: 'english',
        caseSensitive: false,
        diacriticSensitive: false,
        textIndexVersion: 3
      },
      searchFields: {
        primary: searchFields.primary?.properties?.fields?.default || ['title'],
        secondary: searchFields.secondary?.properties?.fields?.default || ['description'],
        tertiary: searchFields.tertiary?.properties?.fields?.default || ['tags'],
        faceted: searchFields.faceted?.properties?.fields?.default || ['category', 'type', 'status']
      },
      aggregationSearch: {
        enabled: true,
        faceting: true,
        highlighting: true,
        autocomplete: true
      },
      performanceHints: {
        useTextIndex: true,
        enableRegexSearch: false,
        cacheFrequentQueries: true,
        useAggregationPipelines: true
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
          dateCreated: new Date(record.date_created || Date.now()),
          dateUpdated: new Date(record.date_updated || Date.now()),
          language: record.language || 'en',
          tags: this.extractTags(record),
          searchTerms: this.generateSearchTerms(record),
          metadata: record.metadata || {}
        };

        // Add dataset-specific transformations
        if (record.metadata) {
          const datasetSpecificData = this.transformDatasetSpecificFields(record.metadata, record);
          Object.assign(transformed, datasetSpecificData);
        }

        return transformed;
      },

      bulkInsertCommand: (collectionName, records) => {
        return `db.${collectionName}.insertMany(${JSON.stringify(records, null, 2)}, { ordered: false });`;
      },

      upsertCommand: (collectionName, record) => {
        return `db.${collectionName}.replaceOne({ "id": "${record.id}" }, ${JSON.stringify(record, null, 2)}, { upsert: true });`;
      }
    };
  }

  /**
   * Extract searchable tags from record
   */
  extractTags(record) {
    const tags = [];
    
    if (record.metadata?.tags) {
      tags.push(...record.metadata.tags);
    }
    
    // Add category as tag
    if (record.category) {
      tags.push(record.category);
    }
    
    // Add type as tag
    if (record.type) {
      tags.push(record.type);
    }
    
    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Generate search terms for better searchability
   */
  generateSearchTerms(record) {
    const terms = [];
    
    // Extract words from title and description
    if (record.title) {
      terms.push(...record.title.toLowerCase().split(/\W+/).filter(w => w.length > 2));
    }
    
    if (record.description) {
      terms.push(...record.description.toLowerCase().split(/\W+/).filter(w => w.length > 2));
    }
    
    return [...new Set(terms)]; // Remove duplicates
  }

  /**
   * Transform dataset-specific fields
   */
  transformDatasetSpecificFields(metadata, record) {
    const transformed = {};
    
    if (metadata.dataset_type) {
      switch (metadata.dataset_type) {
        case 'healthcare':
          if (metadata.medical_codes || metadata.clinical_data) {
            transformed.medical = {
              conditionName: metadata.condition_name || record.condition_name,
              treatment: metadata.treatment || record.treatment,
              specialty: metadata.specialty || record.specialty,
              codes: metadata.medical_codes || {},
              clinical: metadata.clinical_data || {},
              regulatory: metadata.regulatory || {},
              performance: metadata.performance || {}
            };
          }
          break;
          
        case 'finance':
          if (metadata.market_data || metadata.pricing) {
            transformed.financial = {
              symbol: metadata.symbol || record.symbol,
              companyName: metadata.company_name || record.company_name,
              identifiers: metadata.identifiers || {},
              market: metadata.market_data || {},
              pricing: metadata.pricing || {},
              risk: metadata.risk_metrics || {},
              performance: metadata.performance || {}
            };
          }
          break;
          
        case 'retail':
          if (metadata.product_details) {
            transformed.product = {
              brand: metadata.brand || record.brand,
              model: metadata.model || record.model,
              identifiers: {
                sku: metadata.sku || record.sku,
                upc: metadata.upc || record.upc
              },
              specifications: metadata.product_details || {},
              pricing: metadata.pricing || {},
              inventory: metadata.availability || {},
              quality: metadata.quality_metrics || {}
            };
          }
          break;
          
        case 'education':
          if (metadata.academic_details) {
            transformed.academic = {
              courseCode: metadata.course_code || record.course_code,
              subjectArea: metadata.subject_area || record.subject_area,
              gradeLevel: metadata.grade_level || [],
              difficultyLevel: metadata.difficulty_level || 'beginner',
              creditHours: metadata.credit_hours || 0,
              prerequisites: metadata.prerequisites || [],
              learningObjectives: metadata.learning_objectives || [],
              content: metadata.content_structure || {},
              pedagogy: metadata.pedagogical_info || {},
              institution: metadata.institution_info || {},
              metrics: metadata.quality_metrics || {}
            };
          }
          break;
          
        case 'real_estate':
          if (metadata.property_details) {
            transformed.property = {
              propertyType: metadata.property_type || record.property_type,
              listingType: metadata.listing_type || record.listing_type,
              specifications: metadata.property_details || {},
              location: metadata.location_data || {},
              pricing: metadata.pricing || {},
              features: metadata.features_amenities || {},
              market: metadata.market_data || {}
            };
          }
          break;
      }
    }
    
    return transformed;
  }

  /**
   * Generate validation rules using MongoDB schema validation
   */
  generateValidationRules(datasetType, schema) {
    const rules = {
      $jsonSchema: {
        bsonType: 'object',
        required: ['id', 'title', 'category', 'type'],
        properties: {
          _id: { bsonType: 'objectId' },
          id: { bsonType: 'string', minLength: 1, maxLength: 255 },
          title: { bsonType: 'string', minLength: 1, maxLength: 500 },
          description: { bsonType: ['string', 'null'], maxLength: 5000 },
          category: { bsonType: 'string', minLength: 1, maxLength: 100 },
          type: { bsonType: 'string', minLength: 1, maxLength: 100 },
          status: { 
            bsonType: 'string', 
            enum: ['active', 'inactive', 'deprecated', 'draft', 'pending'] 
          },
          dateCreated: { bsonType: 'date' },
          dateUpdated: { bsonType: 'date' },
          language: { bsonType: 'string', pattern: '^[a-z]{2}(-[A-Z]{2})?$' },
          tags: { bsonType: 'array', items: { bsonType: 'string' } },
          searchTerms: { bsonType: 'array', items: { bsonType: 'string' } },
          metadata: { bsonType: 'object' }
        }
      }
    };

    return {
      validationLevel: 'strict',
      validationAction: 'error',
      validator: rules,
      command: `db.createCollection("${datasetType}_data", { validator: ${JSON.stringify(rules, null, 2)} })`
    };
  }

  /**
   * Generate common aggregation pipelines
   */
  generateAggregationPipelines(datasetType, schema) {
    const pipelines = {};

    // Common faceted search pipeline
    pipelines.facetedSearch = {
      name: 'faceted_search',
      description: 'Search with faceted results',
      pipeline: [
        { $match: { status: 'active' } },
        {
          $facet: {
            results: [
              { $limit: 20 },
              { $sort: { dateUpdated: -1 } }
            ],
            categories: [
              { $group: { _id: '$category', count: { $sum: 1 } } },
              { $sort: { count: -1 } }
            ],
            types: [
              { $group: { _id: '$type', count: { $sum: 1 } } },
              { $sort: { count: -1 } }
            ]
          }
        }
      ]
    };

    // Dataset-specific pipelines
    switch (datasetType) {
      case 'finance':
        pipelines.sectorAnalysis = {
          name: 'sector_analysis',
          description: 'Financial sector performance analysis',
          pipeline: [
            { $match: { 'financial.market.sector': { $exists: true } } },
            {
              $group: {
                _id: '$financial.market.sector',
                count: { $sum: 1 },
                avgPrice: { $avg: '$financial.pricing.currentPrice' },
                avgPE: { $avg: '$financial.performance.peRatio' }
              }
            },
            { $sort: { count: -1 } }
          ]
        };
        break;

      case 'retail':
        pipelines.brandAnalysis = {
          name: 'brand_analysis',
          description: 'Product brand performance analysis',
          pipeline: [
            { $match: { 'product.brand': { $exists: true } } },
            {
              $group: {
                _id: '$product.brand',
                count: { $sum: 1 },
                avgPrice: { $avg: '$product.pricing.currentPrice' },
                avgRating: { $avg: '$product.quality.averageRating' }
              }
            },
            { $sort: { count: -1 } }
          ]
        };
        break;
    }

    return pipelines;
  }

  /**
   * Generate MongoDB-specific optimizations
   */
  generateOptimizations(datasetType, schema) {
    return {
      connectionOptions: {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferMaxEntries: 0
      },

      collectionOptions: {
        capped: false,
        autoIndexId: true,
        writeConcern: { w: 'majority', j: true }
      },

      readPreference: 'secondaryPreferred',
      
      indexHints: {
        textSearch: { $text: { $search: 'query_text' } },
        categoryFilter: { category: 1, type: 1 },
        dateRange: { dateCreated: -1 }
      },

      aggregationOptimizations: [
        'Use $match as early as possible in pipelines',
        'Use $project to limit fields returned',
        'Use $limit to restrict result sets',
        'Create supporting indexes for $sort operations'
      ],

      sharding: datasetType === 'real_estate' ? {
        shardKey: { 'property.location.address.state': 1, 'property.location.address.city': 1 },
        strategy: 'hashed'
      } : null,

      ttlIndexes: [
        {
          field: 'dateCreated',
          expireAfterSeconds: 31536000 // 1 year
        }
      ]
    };
  }
}

// Export for use as module
module.exports = MongoDBTransformer;

// CLI usage
if (require.main === module) {
  const transformer = new MongoDBTransformer();
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: mongodb-transformer.js <dataset-type> [output-file]');
    console.error('Example: mongodb-transformer.js retail retail-mongodb.js');
    process.exit(1);
  }

  const datasetType = args[0];
  const outputFile = args[1];

  try {
    const result = transformer.transformDataset(datasetType);
    
    const output = [
      `// MongoDB setup for ${result.collectionName}`,
      '',
      '// Create collection with validation',
      result.validationRules.command,
      '',
      '// Create indexes',
      ...result.indexes.map(idx => idx.command),
      '',
      '// Sample aggregation pipelines',
      ...Object.values(result.aggregationPipelines).map(pipeline => 
        `// ${pipeline.description}\n// ${JSON.stringify(pipeline.pipeline, null, 2)}`
      ),
      ''
    ].join('\n');
    
    if (outputFile) {
      fs.writeFileSync(outputFile, output);
      console.log(`✅ MongoDB setup written to: ${outputFile}`);
      console.log(`📊 Collection: ${result.collectionName}`);
      console.log(`🔍 Search config: ${JSON.stringify(result.searchConfig, null, 2)}`);
    } else {
      console.log(output);
    }
  } catch (error) {
    console.error('❌ Transformation failed:', error.message);
    process.exit(1);
  }
}