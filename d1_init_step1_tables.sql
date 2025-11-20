-- ステップ1: テーブル作成

-- 雇用形態辞書
CREATE TABLE IF NOT EXISTS employment_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- エリア辞書
CREATE TABLE IF NOT EXISTS areas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- メイン訴求辞書
CREATE TABLE IF NOT EXISTS main_appeals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ビジュアル種別辞書
CREATE TABLE IF NOT EXISTS visual_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- メインカラー辞書
CREATE TABLE IF NOT EXISTS main_colors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  hex_color TEXT,
  display_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 雰囲気辞書
CREATE TABLE IF NOT EXISTS atmospheres (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- バナーナレッジメインテーブル
CREATE TABLE IF NOT EXISTS banner_knowledge (
  knowledge_id TEXT PRIMARY KEY,
  image_id TEXT NOT NULL UNIQUE,
  product_name TEXT,
  job_title TEXT,
  employment_type TEXT,
  clicks INTEGER DEFAULT 0,
  ctr REAL DEFAULT 0.0,
  banner_image_key TEXT NOT NULL,
  banner_image_url TEXT,
  visual_type TEXT,
  main_color TEXT,
  atmosphere TEXT,
  extracted_text TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- エリア中間テーブル
CREATE TABLE IF NOT EXISTS banner_areas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  knowledge_id TEXT NOT NULL,
  area_code TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (knowledge_id) REFERENCES banner_knowledge(knowledge_id) ON DELETE CASCADE,
  UNIQUE(knowledge_id, area_code)
);

-- メイン訴求中間テーブル
CREATE TABLE IF NOT EXISTS banner_main_appeals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  knowledge_id TEXT NOT NULL,
  main_appeal_code TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (knowledge_id) REFERENCES banner_knowledge(knowledge_id) ON DELETE CASCADE,
  UNIQUE(knowledge_id, main_appeal_code)
);

-- サブ訴求中間テーブル
CREATE TABLE IF NOT EXISTS banner_sub_appeals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  knowledge_id TEXT NOT NULL,
  sub_appeal_code TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (knowledge_id) REFERENCES banner_knowledge(knowledge_id) ON DELETE CASCADE,
  UNIQUE(knowledge_id, sub_appeal_code)
);
