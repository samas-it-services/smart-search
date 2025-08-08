-- PostgreSQL DDL for id_data

CREATE TABLE IF NOT EXISTS id_data (
  id VARCHAR(255) PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  type VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  date_created TIMESTAMP DEFAULT NOW(),
  date_updated TIMESTAMP DEFAULT NOW(),
  search_vector TSVECTOR,
  metadata JSONB,
  language VARCHAR(10) DEFAULT 'en',
  condition_name TEXT,
  treatment TEXT,
  specialty VARCHAR(100),
  icd_10_code VARCHAR(20),
  cpt_code VARCHAR(10),
  severity_level VARCHAR(20),
  age_group VARCHAR(20),
  body_system JSONB,
  evidence_level VARCHAR(5),
  fda_approved BOOLEAN
);

CREATE INDEX idx_healthcare_search_vector ON healthcare_data USING gin(search_vector);
CREATE INDEX idx_healthcare_category ON healthcare_data USING btree(category);
CREATE INDEX idx_healthcare_type ON healthcare_data USING btree(type);
CREATE INDEX idx_healthcare_status ON healthcare_data USING btree(status);
CREATE INDEX idx_healthcare_date_created ON healthcare_data USING btree(date_created);
CREATE INDEX idx_healthcare_metadata ON healthcare_data USING gin(metadata);
CREATE INDEX idx_healthcare_condition ON healthcare_data USING gin(to_tsvector('english', condition_name));
CREATE INDEX idx_healthcare_specialty ON healthcare_data USING btree(specialty);
CREATE INDEX idx_healthcare_icd10 ON healthcare_data USING btree(icd_10_code);
CREATE INDEX idx_healthcare_severity ON healthcare_data USING btree(severity_level);

-- Trigger to maintain search vector
CREATE OR REPLACE FUNCTION id_data_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', 
    COALESCE(NEW.title, '') || ' ' ||
    COALESCE(NEW.description, '') || ' ' ||
    COALESCE(NEW.category, '')
  );
  NEW.date_updated := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER id_data_search_vector_trigger
  BEFORE INSERT OR UPDATE ON id_data
  FOR EACH ROW EXECUTE FUNCTION id_data_search_vector_update();

