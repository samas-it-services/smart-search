-- PostgreSQL initialization script for @samas/smart-search
-- Creates sample schema and data for testing

-- Enable text search extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Articles table with tsvector column
CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255),
    content TEXT,
    category VARCHAR(100),
    language VARCHAR(10) DEFAULT 'en',
    visibility VARCHAR(20) DEFAULT 'public',
    published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    search_vector tsvector
);

-- Create GIN index for full-text search
CREATE INDEX idx_articles_search ON articles USING GIN(search_vector);
CREATE INDEX idx_articles_category ON articles (category);
CREATE INDEX idx_articles_language ON articles (language);
CREATE INDEX idx_articles_visibility ON articles (visibility);

-- Projects table
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    project_name VARCHAR(255) NOT NULL,
    project_description TEXT,
    technology VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    search_vector tsvector
);

-- Create GIN index for projects search
CREATE INDEX idx_projects_search ON projects USING GIN(search_vector);
CREATE INDEX idx_projects_technology ON projects (technology);
CREATE INDEX idx_projects_status ON projects (status);

-- Authors table  
CREATE TABLE authors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    bio TEXT,
    expertise TEXT[],
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    search_vector tsvector
);

-- Create GIN index for authors search
CREATE INDEX idx_authors_search ON authors USING GIN(search_vector);

-- Function to update search vectors
CREATE OR REPLACE FUNCTION update_search_vector() RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'articles' THEN
        NEW.search_vector := setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
                            setweight(to_tsvector('english', coalesce(NEW.author, '')), 'B') ||
                            setweight(to_tsvector('english', coalesce(NEW.content, '')), 'C');
    ELSIF TG_TABLE_NAME = 'projects' THEN
        NEW.search_vector := setweight(to_tsvector('english', coalesce(NEW.project_name, '')), 'A') ||
                            setweight(to_tsvector('english', coalesce(NEW.project_description, '')), 'C') ||
                            setweight(to_tsvector('english', coalesce(NEW.technology, '')), 'B');
    ELSIF TG_TABLE_NAME = 'authors' THEN
        NEW.search_vector := setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
                            setweight(to_tsvector('english', coalesce(NEW.bio, '')), 'C');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update search vectors
CREATE TRIGGER articles_search_vector_update 
    BEFORE INSERT OR UPDATE ON articles 
    FOR EACH ROW EXECUTE FUNCTION update_search_vector();

CREATE TRIGGER projects_search_vector_update 
    BEFORE INSERT OR UPDATE ON projects 
    FOR EACH ROW EXECUTE FUNCTION update_search_vector();

CREATE TRIGGER authors_search_vector_update 
    BEFORE INSERT OR UPDATE ON authors 
    FOR EACH ROW EXECUTE FUNCTION update_search_vector();

-- Sample data for articles
INSERT INTO articles (title, author, content, category, language, visibility) VALUES
('Getting Started with PostgreSQL Full-Text Search', 'John Database', 'PostgreSQL provides powerful full-text search capabilities using tsvector and tsquery. This article covers the basics of setting up full-text search indexes and optimizing query performance.', 'Database', 'en', 'public'),
('Advanced Node.js Performance Optimization', 'Sarah Node', 'Learn advanced techniques for optimizing Node.js applications including event loop management, memory optimization, and clustering strategies for high-performance web services.', 'Programming', 'en', 'public'),
('Docker Container Security Best Practices', 'Mike Security', 'Comprehensive guide to securing Docker containers in production environments, covering image security, runtime protection, and network isolation strategies.', 'DevOps', 'en', 'public'),
('React Server-Side Rendering with Next.js', 'Lisa Frontend', 'Deep dive into server-side rendering with Next.js, including static generation, incremental static regeneration, and performance optimization techniques.', 'Frontend', 'en', 'public'),
('GraphQL API Design Patterns', 'Tom API', 'Explore common design patterns for building scalable GraphQL APIs, including schema design, resolver optimization, and caching strategies.', 'API', 'en', 'public');

-- Sample data for projects
INSERT INTO projects (project_name, project_description, technology, status) VALUES
('Smart Search Engine', 'Universal search library with intelligent fallback for any database and cache combination', 'TypeScript', 'active'),
('Microservices Dashboard', 'Real-time monitoring dashboard for microservices architecture with health checks and performance metrics', 'React', 'active'),
('API Gateway Service', 'High-performance API gateway with rate limiting, authentication, and load balancing capabilities', 'Go', 'active'),
('Data Pipeline Framework', 'Scalable data processing pipeline for real-time analytics and batch processing workloads', 'Python', 'maintenance'),
('Container Orchestrator', 'Lightweight container orchestration platform optimized for edge computing environments', 'Rust', 'planning');

-- Sample data for authors
INSERT INTO authors (name, bio, expertise) VALUES
('John Database', 'Database architect with 10+ years of experience in PostgreSQL, MongoDB, and distributed systems', ARRAY['PostgreSQL', 'MongoDB', 'Database Design', 'Performance Optimization']),
('Sarah Node', 'Senior Node.js developer specializing in high-performance web applications and microservices architecture', ARRAY['Node.js', 'JavaScript', 'Microservices', 'Performance']),
('Mike Security', 'Cybersecurity expert focused on container security, DevOps practices, and cloud security architecture', ARRAY['Docker', 'Security', 'DevOps', 'Cloud Architecture']),
('Lisa Frontend', 'Frontend architect with expertise in React, TypeScript, and modern web development practices', ARRAY['React', 'TypeScript', 'Frontend Architecture', 'Web Performance']),
('Tom API', 'API design specialist with experience in REST, GraphQL, and event-driven architectures', ARRAY['GraphQL', 'REST API', 'Event Architecture', 'Microservices']);