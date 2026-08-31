-- database/schema.sql
-- Phase 4: Initial schema configuration for users.
-- Other tables (projects, analysis_runs, etc.) will be added in subsequent phases.

-- Enable UUID extension if we want to use UUIDs for secure, non-sequential IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
