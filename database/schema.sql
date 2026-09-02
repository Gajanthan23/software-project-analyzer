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

-- Analysis Runs table (Phase 9) — tracks each analysis lifecycle
CREATE TABLE IF NOT EXISTS analysis_runs (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    status       VARCHAR(20) NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    error_message TEXT,
    started_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Code Metrics table (Phase 9) — stores LOC & structural metrics per run
CREATE TABLE IF NOT EXISTS code_metrics (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id              UUID NOT NULL REFERENCES analysis_runs(id) ON DELETE CASCADE,
    project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    -- File counts
    total_files         INT  DEFAULT 0,
    source_files        INT  DEFAULT 0,
    test_files          INT  DEFAULT 0,
    config_files        INT  DEFAULT 0,
    documentation_files INT  DEFAULT 0,
    other_files         INT  DEFAULT 0,
    -- LOC breakdown
    total_loc           INT  DEFAULT 0,
    code_loc            INT  DEFAULT 0,
    comment_loc         INT  DEFAULT 0,
    blank_loc           INT  DEFAULT 0,
    -- Structural counts
    functions           INT  DEFAULT 0,
    classes             INT  DEFAULT 0,
    modules             INT  DEFAULT 0,
    directory_depth     INT  DEFAULT 0,
    dependency_count    INT  DEFAULT 0,
    -- Language data (JSONB for flexibility)
    primary_language    VARCHAR(100),
    languages           JSONB DEFAULT '{}'::jsonb,
    -- Metadata
    analysis_tool       TEXT,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Complexity Metrics table (Phase 10) — stores cyclomatic complexity & function hotspots
CREATE TABLE IF NOT EXISTS complexity_metrics (
    id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id                    UUID NOT NULL REFERENCES analysis_runs(id) ON DELETE CASCADE,
    project_id                UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    total_functions           INT  DEFAULT 0,
    avg_complexity            NUMERIC(6, 2) DEFAULT 0.0,
    max_complexity            INT  DEFAULT 0,
    high_complexity_count     INT  DEFAULT 0,
    high_complexity_threshold INT  DEFAULT 10,
    complexity_distribution   JSONB DEFAULT '{}'::jsonb,
    top_complex_functions     JSONB DEFAULT '[]'::jsonb,
    file_complexity           JSONB DEFAULT '[]'::jsonb,
    analysis_tool             TEXT,
    created_at                TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Duplication Metrics table (Phase 11) — stores code clone detection metrics
CREATE TABLE IF NOT EXISTS duplication_metrics (
    id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id                    UUID NOT NULL REFERENCES analysis_runs(id) ON DELETE CASCADE,
    project_id                UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    duplicated_blocks         INT  DEFAULT 0,
    duplicated_loc            INT  DEFAULT 0,
    duplication_percentage    NUMERIC(5, 2) DEFAULT 0.0,
    duplicated_files_count    INT  DEFAULT 0,
    duplicated_files          JSONB DEFAULT '[]'::jsonb,
    duplicate_instances       JSONB DEFAULT '[]'::jsonb,
    recommendations           JSONB DEFAULT '[]'::jsonb,
    analysis_tool             TEXT,
    created_at                TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Testing Metrics table (Phase 12) — stores test suite and code coverage metrics
CREATE TABLE IF NOT EXISTS testing_metrics (
    id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id                    UUID NOT NULL REFERENCES analysis_runs(id) ON DELETE CASCADE,
    project_id                UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    has_tests                 BOOLEAN DEFAULT false,
    test_files_count          INT  DEFAULT 0,
    source_files_count        INT  DEFAULT 0,
    test_to_source_file_ratio NUMERIC(5, 2) DEFAULT 0.0,
    test_loc                  INT  DEFAULT 0,
    source_loc                INT  DEFAULT 0,
    test_to_source_loc_ratio  NUMERIC(5, 2) DEFAULT 0.0,
    test_frameworks           JSONB DEFAULT '[]'::jsonb,
    has_coverage_report       BOOLEAN DEFAULT false,
    coverage_percentage       NUMERIC(5, 2),
    coverage_status           VARCHAR(50) DEFAULT 'unavailable',
    coverage_message          TEXT,
    test_directories          JSONB DEFAULT '[]'::jsonb,
    test_files                JSONB DEFAULT '[]'::jsonb,
    analysis_tool             TEXT,
    created_at                TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Documentation Metrics table (Phase 13) — stores heuristic documentation scores and structural findings
CREATE TABLE IF NOT EXISTS documentation_metrics (
    id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id                    UUID NOT NULL REFERENCES analysis_runs(id) ON DELETE CASCADE,
    project_id                UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    classification            VARCHAR(50) DEFAULT 'HEURISTIC',
    documentation_score       NUMERIC(5, 2) DEFAULT 0.0,
    score_breakdown           JSONB DEFAULT '{}'::jsonb,
    has_readme                BOOLEAN DEFAULT false,
    readme_file               VARCHAR(255),
    readme_size_bytes         INT DEFAULT 0,
    readme_sections           JSONB DEFAULT '{}'::jsonb,
    has_docs_dir              BOOLEAN DEFAULT false,
    docs_files_count          INT DEFAULT 0,
    docs_sample_files         JSONB DEFAULT '[]'::jsonb,
    governance_files          JSONB DEFAULT '{}'::jsonb,
    comment_density_pct       NUMERIC(5, 2) DEFAULT 0.0,
    recommendations           JSONB DEFAULT '[]'::jsonb,
    analysis_notes            TEXT,
    analysis_tool             TEXT,
    created_at                TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Dependency Metrics table (Phase 14) — stores production & dev package manifests
CREATE TABLE IF NOT EXISTS dependency_metrics (
    id                           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id                       UUID NOT NULL REFERENCES analysis_runs(id) ON DELETE CASCADE,
    project_id                   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    production_dependency_count  INT DEFAULT 0,
    dev_dependency_count         INT DEFAULT 0,
    total_dependency_count       INT DEFAULT 0,
    ecosystems                   JSONB DEFAULT '[]'::jsonb,
    manifest_files               JSONB DEFAULT '[]'::jsonb,
    dependencies_by_file         JSONB DEFAULT '{}'::jsonb,
    top_dependencies             JSONB DEFAULT '[]'::jsonb,
    recommendations              JSONB DEFAULT '[]'::jsonb,
    vulnerability_notes          TEXT,
    analysis_tool                TEXT,
    created_at                   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Security Findings table (Phase 15) — stores static analysis & secret scanner findings (one row per finding)
CREATE TABLE IF NOT EXISTS security_findings (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id         UUID NOT NULL REFERENCES analysis_runs(id) ON DELETE CASCADE,
    project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    file_path      VARCHAR(512) NOT NULL,
    line_number    INT DEFAULT 1,
    severity       VARCHAR(20) NOT NULL CHECK (severity IN ('Critical', 'High', 'Medium', 'Low')),
    category       VARCHAR(100) NOT NULL,
    title          TEXT NOT NULL,
    description    TEXT,
    recommendation TEXT,
    rule_id        VARCHAR(100),
    analysis_tool  TEXT,
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
