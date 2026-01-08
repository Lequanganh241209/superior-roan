-- Aether OS V2: Context Oracle Migration
-- Run this in your Supabase SQL Editor

CREATE TABLE project_metadata (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id TEXT NOT NULL UNIQUE, -- Link to Vercel/GitHub ID
  name TEXT NOT NULL,
  
  -- The "Brain" of the project
  structure JSONB DEFAULT '{}'::jsonb, -- Folder structure & file list
  dependencies JSONB DEFAULT '[]'::jsonb, -- Installed packages
  env_vars JSONB DEFAULT '{}'::jsonb, -- Required environment variables
  
  -- Self-Healing Logs
  last_build_status TEXT DEFAULT 'unknown',
  error_logs JSONB DEFAULT '[]'::jsonb,
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE project_metadata ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read/write for demo (In prod, restrict to auth users)
CREATE POLICY "Allow public access" ON project_metadata FOR ALL USING (true);
