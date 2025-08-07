// MongoDB initialization script for @samas/smart-search
// Creates sample collections and data for testing

// Switch to smartsearch database
db = db.getSiblingDB('smartsearch');

// Create collections with text indexes
db.createCollection('documents');
db.createCollection('tutorials');
db.createCollection('contributors');

// Create text indexes for full-text search
db.documents.createIndex({ 
  title: "text", 
  content: "text", 
  author: "text" 
}, {
  name: "documents_text_index",
  weights: { title: 10, author: 5, content: 1 }
});

db.tutorials.createIndex({ 
  title: "text", 
  description: "text", 
  technology: "text" 
}, {
  name: "tutorials_text_index",
  weights: { title: 10, technology: 5, description: 1 }
});

db.contributors.createIndex({ 
  name: "text", 
  bio: "text", 
  skills: "text" 
}, {
  name: "contributors_text_index",
  weights: { name: 10, skills: 5, bio: 1 }
});

// Insert sample documents
db.documents.insertMany([
  {
    _id: ObjectId(),
    title: "MongoDB Atlas Search Integration",
    author: "Database Expert",
    content: "Learn how to integrate MongoDB Atlas Search for powerful full-text search capabilities in your applications. This comprehensive guide covers index creation, query optimization, and advanced search features.",
    category: "Database",
    tags: ["mongodb", "atlas", "search", "nosql"],
    publishedAt: new Date("2024-01-15"),
    visibility: "public"
  },
  {
    _id: ObjectId(),
    title: "Building Scalable Web APIs with Express.js",
    author: "API Developer",
    content: "Master the art of building scalable and maintainable REST APIs using Express.js. Topics include middleware design, error handling, authentication, and performance optimization techniques.",
    category: "Backend",
    tags: ["nodejs", "express", "api", "javascript"],
    publishedAt: new Date("2024-01-10"),
    visibility: "public"
  },
  {
    _id: ObjectId(),
    title: "Advanced TypeScript Patterns for Large Applications",
    author: "TypeScript Guru",
    content: "Explore advanced TypeScript patterns and techniques for building large-scale applications. Learn about decorators, generics, conditional types, and architectural patterns.",
    category: "Programming",
    tags: ["typescript", "patterns", "architecture", "javascript"],
    publishedAt: new Date("2024-01-08"),
    visibility: "public"
  },
  {
    _id: ObjectId(),
    title: "Microservices Communication Patterns",
    author: "Architecture Lead",
    content: "Deep dive into communication patterns for microservices architecture including synchronous, asynchronous, and event-driven approaches with practical examples.",
    category: "Architecture",
    tags: ["microservices", "communication", "architecture", "patterns"],
    publishedAt: new Date("2024-01-05"),
    visibility: "public"
  },
  {
    _id: ObjectId(),
    title: "Cloud-Native Application Security",
    author: "Security Engineer",
    content: "Comprehensive guide to securing cloud-native applications covering container security, service mesh security, and zero-trust architecture principles.",
    category: "Security",
    tags: ["security", "cloud", "containers", "kubernetes"],
    publishedAt: new Date("2024-01-03"),
    visibility: "public"
  }
]);

// Insert sample tutorials
db.tutorials.insertMany([
  {
    _id: ObjectId(),
    title: "Complete React Tutorial Series",
    description: "Learn React from basics to advanced concepts with hands-on projects and real-world examples",
    technology: "React",
    difficulty: "beginner",
    duration: "8 hours",
    createdAt: new Date("2024-01-12")
  },
  {
    _id: ObjectId(),
    title: "Docker Containerization Workshop",
    description: "Master Docker containers, images, and orchestration with practical exercises and deployment strategies",
    technology: "Docker",
    difficulty: "intermediate",
    duration: "6 hours",
    createdAt: new Date("2024-01-09")
  },
  {
    _id: ObjectId(),
    title: "GraphQL API Development",
    description: "Build powerful GraphQL APIs with schema design, resolvers, and performance optimization techniques",
    technology: "GraphQL",
    difficulty: "advanced",
    duration: "10 hours",
    createdAt: new Date("2024-01-07")
  },
  {
    _id: ObjectId(),
    title: "Kubernetes Deployment Guide",
    description: "Deploy and manage applications on Kubernetes with best practices for production environments",
    technology: "Kubernetes",
    difficulty: "advanced",
    duration: "12 hours",
    createdAt: new Date("2024-01-04")
  },
  {
    _id: ObjectId(),
    title: "Python Data Analysis Bootcamp",
    description: "Analyze data using Python with pandas, NumPy, and visualization libraries for data science projects",
    technology: "Python",
    difficulty: "intermediate",
    duration: "15 hours",
    createdAt: new Date("2024-01-02")
  }
]);

// Insert sample contributors
db.contributors.insertMany([
  {
    _id: ObjectId(),
    name: "Database Expert",
    bio: "Senior database engineer with expertise in MongoDB, PostgreSQL, and distributed systems architecture",
    skills: ["MongoDB", "PostgreSQL", "Database Design", "Distributed Systems"],
    email: "db.expert@example.com",
    joinedAt: new Date("2023-06-15"),
    contributionCount: 25
  },
  {
    _id: ObjectId(),
    name: "API Developer",
    bio: "Full-stack developer specializing in API design, Node.js, and cloud-native applications",
    skills: ["Node.js", "Express.js", "API Design", "Cloud Architecture"],
    email: "api.dev@example.com",
    joinedAt: new Date("2023-07-20"),
    contributionCount: 18
  },
  {
    _id: ObjectId(),
    name: "TypeScript Guru",
    bio: "TypeScript expert and JavaScript architect with 8+ years of frontend and backend development experience",
    skills: ["TypeScript", "JavaScript", "React", "Node.js"],
    email: "ts.guru@example.com",
    joinedAt: new Date("2023-05-10"),
    contributionCount: 32
  },
  {
    _id: ObjectId(),
    name: "Architecture Lead",
    bio: "Software architect focused on microservices, distributed systems, and scalable application design",
    skills: ["Microservices", "System Architecture", "Docker", "Kubernetes"],
    email: "arch.lead@example.com",
    joinedAt: new Date("2023-04-08"),
    contributionCount: 15
  },
  {
    _id: ObjectId(),
    name: "Security Engineer",
    bio: "Cybersecurity specialist with focus on application security, cloud security, and DevSecOps practices",
    skills: ["Security", "DevSecOps", "Cloud Security", "Penetration Testing"],
    email: "sec.eng@example.com",
    joinedAt: new Date("2023-08-12"),
    contributionCount: 12
  }
]);

// Create additional indexes for performance
db.documents.createIndex({ "category": 1 });
db.documents.createIndex({ "publishedAt": -1 });
db.documents.createIndex({ "tags": 1 });

db.tutorials.createIndex({ "technology": 1 });
db.tutorials.createIndex({ "difficulty": 1 });
db.tutorials.createIndex({ "createdAt": -1 });

db.contributors.createIndex({ "skills": 1 });
db.contributors.createIndex({ "joinedAt": -1 });

// Print success message
print("MongoDB initialization completed successfully!");
print("Collections created: documents, tutorials, contributors");
print("Text indexes and performance indexes created");
print("Sample data inserted for all collections");