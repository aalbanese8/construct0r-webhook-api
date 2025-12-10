-- Projects table (mirrors Supabase schema)
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,           -- UUID (generate with crypto.randomUUID())
  user_id TEXT,                  -- Keep for future multi-user support or set to 'default'
  name TEXT NOT NULL,
  nodes TEXT,                    -- JSON string (workflow nodes)
  edges TEXT,                    -- JSON string (workflow connections)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);

-- Users table (optional - only if keeping local auth)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Settings table (for app configuration)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
