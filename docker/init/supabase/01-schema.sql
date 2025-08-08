-- Healthcare Data Schema for Supabase + Redis Showcase
-- Optimized for full-text search with PostgreSQL tsvector

-- Create healthcare_data table with comprehensive structure
CREATE TABLE IF NOT EXISTS healthcare_data (
    id VARCHAR(255) PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    condition_name TEXT,
    treatment TEXT,
    specialty TEXT,
    date_created DATE DEFAULT CURRENT_DATE,
    type VARCHAR(100) DEFAULT 'healthcare',
    author TEXT,
    category TEXT,
    language VARCHAR(10) DEFAULT 'en',
    visibility VARCHAR(20) DEFAULT 'public',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    search_vector tsvector,
    
    -- Additional Supabase-specific columns
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_published BOOLEAN DEFAULT true,
    tags TEXT[],
    metadata JSONB
);

-- Create indexes for optimal search performance
CREATE INDEX IF NOT EXISTS idx_healthcare_fts 
ON healthcare_data USING gin(search_vector);

CREATE INDEX IF NOT EXISTS idx_healthcare_specialty 
ON healthcare_data(specialty);

CREATE INDEX IF NOT EXISTS idx_healthcare_type 
ON healthcare_data(type);

CREATE INDEX IF NOT EXISTS idx_healthcare_date 
ON healthcare_data(date_created);

CREATE INDEX IF NOT EXISTS idx_healthcare_published 
ON healthcare_data(is_published);

CREATE INDEX IF NOT EXISTS idx_healthcare_user 
ON healthcare_data(user_id);

-- Create a compound index for common query patterns
CREATE INDEX IF NOT EXISTS idx_healthcare_search_compound 
ON healthcare_data(specialty, type, is_published) 
WHERE is_published = true;

-- Function to automatically update search_vector on INSERT/UPDATE
CREATE OR REPLACE FUNCTION update_healthcare_search_vector() 
RETURNS trigger AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.condition_name, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.treatment, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.specialty, '')), 'D');
    
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update search vector automatically
DROP TRIGGER IF EXISTS trigger_update_healthcare_search_vector ON healthcare_data;
CREATE TRIGGER trigger_update_healthcare_search_vector 
    BEFORE INSERT OR UPDATE ON healthcare_data
    FOR EACH ROW 
    EXECUTE FUNCTION update_healthcare_search_vector();

-- Insert comprehensive sample healthcare data
INSERT INTO healthcare_data (
    id, title, description, condition_name, treatment, specialty, 
    author, category, type, tags, metadata
) VALUES 
(
    'NCT001',
    'Advanced Diabetes Management with Continuous Glucose Monitoring',
    'A comprehensive study on the effectiveness of continuous glucose monitoring systems in managing Type 1 and Type 2 diabetes, including patient outcomes and quality of life improvements.',
    'Type 1 & Type 2 Diabetes',
    'Continuous glucose monitoring, insulin therapy, lifestyle modification',
    'Endocrinology',
    'Dr. Sarah Johnson, MD',
    'endocrinology',
    'clinical_trial',
    ARRAY['diabetes', 'glucose monitoring', 'insulin', 'endocrinology'],
    '{"trial_phase": "III", "participants": 450, "duration_months": 12}'
),
(
    'NCT002',
    'Innovative Cardiac Surgery Techniques for Complex Coronary Artery Disease',
    'Research into minimally invasive cardiac surgery approaches for patients with complex coronary artery disease, focusing on reduced recovery times and improved patient outcomes.',
    'Complex Coronary Artery Disease',
    'Minimally invasive cardiac surgery, coronary artery bypass',
    'Cardiology',
    'Dr. Michael Chen, MD, PhD',
    'cardiology',
    'surgical_study',
    ARRAY['cardiac surgery', 'coronary artery', 'minimally invasive', 'cardiology'],
    '{"success_rate": 94.2, "avg_recovery_days": 14, "complications": 2.1}'
),
(
    'NCT003',
    'Breakthrough Cancer Immunotherapy for Advanced Melanoma',
    'Clinical trial investigating novel immunotherapy combinations for patients with advanced melanoma, including checkpoint inhibitors and CAR-T cell therapy approaches.',
    'Advanced Melanoma',
    'Immunotherapy, checkpoint inhibitors, CAR-T cell therapy',
    'Oncology',
    'Dr. Emily Rodriguez, MD',
    'oncology',
    'immunotherapy_trial',
    ARRAY['cancer', 'immunotherapy', 'melanoma', 'CAR-T', 'oncology'],
    '{"response_rate": 67.8, "progression_free_survival": 18.3, "grade_3_toxicity": 12.5}'
),
(
    'NCT004',
    'Mental Health Digital Therapeutics for Depression and Anxiety',
    'Evaluation of digital therapeutic platforms for treating depression and anxiety disorders, including mobile apps, virtual reality therapy, and AI-powered cognitive behavioral therapy.',
    'Major Depressive Disorder, Generalized Anxiety Disorder',
    'Digital therapeutics, CBT, mindfulness-based interventions',
    'Psychiatry',
    'Dr. James Wilson, MD, PhD',
    'psychiatry',
    'digital_health',
    ARRAY['mental health', 'digital therapeutics', 'depression', 'anxiety', 'CBT'],
    '{"app_engagement": 78.3, "symptom_improvement": 65.4, "retention_rate": 82.1}'
),
(
    'NCT005',
    'Pediatric Rare Disease Gene Therapy Development',
    'Groundbreaking gene therapy research for pediatric patients with rare genetic disorders, focusing on safety, efficacy, and long-term outcomes.',
    'Rare Genetic Disorders',
    'Gene therapy, supportive care, genetic counseling',
    'Pediatrics',
    'Dr. Lisa Martinez, MD',
    'pediatrics',
    'gene_therapy',
    ARRAY['pediatrics', 'gene therapy', 'rare diseases', 'genetics'],
    '{"age_range": "6 months - 17 years", "genetic_variants": 15, "therapeutic_efficacy": 73.2}'
),
(
    'NCT006',
    'Neurological Rehabilitation Using Brain-Computer Interfaces',
    'Research into brain-computer interface technology for neurological rehabilitation in patients with stroke, spinal cord injury, and neurodegenerative diseases.',
    'Stroke, Spinal Cord Injury, Neurodegenerative Diseases',
    'Brain-computer interface therapy, neurorehabilitation, physical therapy',
    'Neurology',
    'Dr. Robert Kim, MD, PhD',
    'neurology',
    'neurotech',
    ARRAY['neurology', 'brain-computer interface', 'rehabilitation', 'stroke'],
    '{"motor_recovery": 58.7, "independence_score": 71.3, "technology_acceptance": 89.2}'
),
(
    'NCT007',
    'Precision Medicine Approach to Autoimmune Disease Treatment',
    'Personalized treatment strategies for autoimmune diseases using genetic profiling, biomarker analysis, and targeted therapeutic interventions.',
    'Rheumatoid Arthritis, Lupus, Multiple Sclerosis',
    'Precision medicine, targeted biologics, personalized dosing',
    'Rheumatology',
    'Dr. Anna Thompson, MD',
    'rheumatology',
    'precision_medicine',
    ARRAY['autoimmune', 'precision medicine', 'biologics', 'rheumatology'],
    '{"remission_rate": 82.4, "biomarker_accuracy": 91.7, "adverse_events": 8.3}'
),
(
    'NCT008',
    'Advanced Wound Care Using Bioengineered Tissue Technology',
    'Clinical evaluation of bioengineered tissue grafts for complex wound healing in diabetic patients, burn victims, and surgical site infections.',
    'Complex Wounds, Diabetic Ulcers, Burns',
    'Bioengineered tissue grafts, advanced wound dressings, growth factors',
    'Plastic Surgery',
    'Dr. Mark Davis, MD',
    'plastic_surgery',
    'tissue_engineering',
    ARRAY['wound care', 'tissue engineering', 'regenerative medicine', 'diabetes'],
    '{"healing_time_reduction": 42.3, "infection_rate": 3.1, "graft_integration": 94.8}'
),
(
    'NCT009',
    'Telemedicine Integration for Rural Healthcare Access',
    'Implementation and evaluation of telemedicine programs to improve healthcare access in rural communities, focusing on primary care and specialist consultations.',
    'Healthcare Access Disparities',
    'Telemedicine consultations, remote monitoring, digital health platforms',
    'Family Medicine',
    'Dr. Jennifer Lee, MD, MPH',
    'family_medicine',
    'telemedicine',
    ARRAY['telemedicine', 'rural healthcare', 'digital health', 'access'],
    '{"patient_satisfaction": 91.2, "travel_reduction": 78.5, "diagnostic_accuracy": 87.3}'
),
(
    'NCT010',
    'AI-Powered Diagnostic Imaging for Early Cancer Detection',
    'Development and validation of artificial intelligence algorithms for early detection of various cancers using medical imaging, including mammography, CT, and MRI.',
    'Early Stage Cancers',
    'AI-powered diagnostics, medical imaging, computer-aided detection',
    'Radiology',
    'Dr. Kevin Park, MD, PhD',
    'radiology',
    'ai_diagnostics',
    ARRAY['artificial intelligence', 'medical imaging', 'cancer detection', 'radiology'],
    '{"sensitivity": 96.2, "specificity": 88.7, "false_positive_rate": 4.3, "processing_time_seconds": 12.5}'
);

-- Create Row Level Security policies for Supabase
ALTER TABLE healthcare_data ENABLE ROW LEVEL SECURITY;

-- Policy for public read access to published data
CREATE POLICY "Public healthcare data is viewable by everyone" 
ON healthcare_data FOR SELECT 
USING (is_published = true);

-- Policy for authenticated users to insert data
CREATE POLICY "Users can insert healthcare data" 
ON healthcare_data FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Policy for users to update their own data
CREATE POLICY "Users can update their own healthcare data" 
ON healthcare_data FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Policy for users to delete their own data
CREATE POLICY "Users can delete their own healthcare data" 
ON healthcare_data FOR DELETE 
USING (auth.uid() = user_id);

-- Create a function for full-text search with ranking
CREATE OR REPLACE FUNCTION search_healthcare_data(search_query text, result_limit integer DEFAULT 20)
RETURNS TABLE(
    id VARCHAR(255),
    title TEXT,
    description TEXT,
    condition_name TEXT,
    treatment TEXT,
    specialty TEXT,
    author TEXT,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    rank REAL
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        hd.id,
        hd.title,
        hd.description,
        hd.condition_name,
        hd.treatment,
        hd.specialty,
        hd.author,
        hd.category,
        hd.created_at,
        ts_rank(hd.search_vector, plainto_tsquery('english', search_query)) as rank
    FROM healthcare_data hd
    WHERE hd.search_vector @@ plainto_tsquery('english', search_query)
        AND hd.is_published = true
    ORDER BY rank DESC, hd.created_at DESC
    LIMIT result_limit;
END;
$$;

-- Grant access to the search function for anonymous and authenticated users
GRANT EXECUTE ON FUNCTION search_healthcare_data(text, integer) TO anon, authenticated;

-- Create indexes for optimal RLS performance
CREATE INDEX IF NOT EXISTS idx_healthcare_rls_published 
ON healthcare_data(is_published) WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_healthcare_rls_user 
ON healthcare_data(user_id) WHERE user_id IS NOT NULL;

-- Create a view for search results with metadata
CREATE OR REPLACE VIEW healthcare_search_results AS
SELECT 
    id,
    title,
    description,
    condition_name,
    treatment,
    specialty,
    author,
    category,
    language,
    created_at,
    tags,
    metadata,
    ts_rank(search_vector, plainto_tsquery('english', '')) as base_rank
FROM healthcare_data
WHERE is_published = true;

-- Grant access to the view
GRANT SELECT ON healthcare_search_results TO anon, authenticated;

-- Create a stats view for dashboard information
CREATE OR REPLACE VIEW healthcare_stats AS
SELECT 
    COUNT(*) as total_records,
    COUNT(DISTINCT specialty) as specialties_count,
    COUNT(DISTINCT category) as categories_count,
    AVG(CASE WHEN metadata->>'participants' IS NOT NULL 
            THEN (metadata->>'participants')::numeric 
            ELSE NULL END) as avg_participants,
    MAX(created_at) as last_updated
FROM healthcare_data
WHERE is_published = true;

-- Grant access to the stats view
GRANT SELECT ON healthcare_stats TO anon, authenticated;