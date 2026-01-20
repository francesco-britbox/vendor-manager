-- Create read-only user for reporting/consumer apps
-- This user has SELECT-only access for security (principle of least privilege)

CREATE USER reports_reader WITH PASSWORD 'reports_reader_2025';

-- Grant connect permission
GRANT CONNECT ON DATABASE presence_manager TO reports_reader;

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO reports_reader;

-- Grant SELECT on all existing tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO reports_reader;

-- Grant SELECT on future tables automatically
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO reports_reader;
