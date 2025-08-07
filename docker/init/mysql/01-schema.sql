-- MySQL initialization script for @samas/smart-search
-- Creates sample schema and data for testing

USE smartsearch;

-- Books table
CREATE TABLE books (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255),
    description TEXT,
    category VARCHAR(100),
    language VARCHAR(10) DEFAULT 'en',
    visibility ENUM('public', 'private') DEFAULT 'public',
    isbn VARCHAR(20),
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_language (language),
    INDEX idx_visibility (visibility),
    FULLTEXT idx_search (title, author, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Products table
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_name VARCHAR(255) NOT NULL,
    product_description TEXT,
    category_name VARCHAR(100),
    price DECIMAL(10,2),
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_category (category_name),
    FULLTEXT idx_product_search (product_name, product_description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Users table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    full_name VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE,
    email VARCHAR(255),
    bio TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    FULLTEXT idx_user_search (full_name, username, bio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sample data
INSERT INTO books (title, author, description, category, language, visibility, isbn) VALUES
('JavaScript: The Definitive Guide', 'David Flanagan', 'Comprehensive guide to JavaScript programming language covering ES6+ features', 'Programming', 'en', 'public', '978-1491952023'),
('Python Crash Course', 'Eric Matthes', 'A hands-on, project-based introduction to programming in Python', 'Programming', 'en', 'public', '978-1593276034'),
('Clean Code', 'Robert Martin', 'A handbook of agile software craftsmanship with practical techniques', 'Software Engineering', 'en', 'public', '978-0132350884'),
('Design Patterns', 'Gang of Four', 'Elements of reusable object-oriented software design', 'Software Engineering', 'en', 'public', '978-0201633612'),
('The Pragmatic Programmer', 'Andrew Hunt', 'Your journey to mastery in software development', 'Programming', 'en', 'public', '978-0135957059');

INSERT INTO products (product_name, product_description, category_name, price) VALUES
('Wireless Headphones', 'High-quality wireless headphones with noise cancellation and 30-hour battery life', 'Electronics', 199.99),
('Programming Keyboard', 'Mechanical keyboard designed for programmers with customizable backlighting', 'Electronics', 159.99),
('Monitor Stand', 'Adjustable monitor stand with USB hub and wireless charging pad', 'Accessories', 89.99),
('Webcam HD', 'Professional HD webcam with auto-focus and built-in microphone', 'Electronics', 79.99),
('Laptop Cooling Pad', 'Laptop cooling pad with adjustable fans and ergonomic design', 'Accessories', 49.99);

INSERT INTO users (full_name, username, email, bio) VALUES
('John Developer', 'john_dev', 'john@example.com', 'Full-stack developer specializing in JavaScript and Python'),
('Sarah Engineer', 'sarah_eng', 'sarah@example.com', 'Software engineer with expertise in cloud architecture and DevOps'),
('Mike Coder', 'mike_code', 'mike@example.com', 'Frontend developer passionate about React and modern web technologies'),
('Lisa Architect', 'lisa_arch', 'lisa@example.com', 'Software architect with 15 years of experience in distributed systems'),
('Tom Builder', 'tom_build', 'tom@example.com', 'Backend developer focused on scalable microservices and databases');