-- Make banner_image_key nullable (for CSV imports without images)
-- SQLite doesn't support ALTER COLUMN directly, so we need to recreate the table

-- Step 1: Create new table with nullable banner_image_key
CREATE TABLE IF NOT EXISTS banner_knowledge_new (
  knowledge_id TEXT PRIMARY KEY,
  image_id TEXT NOT NULL UNIQUE,
  product_name TEXT,
  job_title TEXT,
  employment_type TEXT,
  clicks INTEGER DEFAULT 0,
  ctr REAL DEFAULT 0.0,
  banner_image_key TEXT,
  banner_image_url TEXT,
  visual_type TEXT,
  main_color TEXT,
  atmosphere TEXT,
  extracted_text TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Copy data if exists
INSERT INTO banner_knowledge_new 
SELECT * FROM banner_knowledge;

-- Step 3: Drop old table
DROP TABLE banner_knowledge;

-- Step 4: Rename new table
ALTER TABLE banner_knowledge_new RENAME TO banner_knowledge;
