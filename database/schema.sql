-- database/schema.sql
-- Phase 4 & Phase 6 schema definitions

-- Enable UUID extension for secure non-sequential IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (Phase 4)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Projects table (Phase 6)
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    repo_url VARCHAR(512) NOT NULL,
    owner VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    default_branch VARCHAR(100) DEFAULT 'main',
    stars_count INT DEFAULT 0,
    forks_count INT DEFAULT 0,
    languages JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_project UNIQUE(user_id, owner, name)
);
