-- ============================================
-- Indeedバナーナレッジ分析システム
-- 初期スキーママイグレーション
-- ============================================

-- ============================================
-- 辞書テーブル（ステップ3で値を定義）
-- ============================================

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

-- ============================================
-- メインテーブル: BannerKnowledge
-- ============================================

CREATE TABLE IF NOT EXISTS banner_knowledge (
  -- 主キー
  knowledge_id TEXT PRIMARY KEY,
  
  -- ATOMデータフィールド
  image_id TEXT NOT NULL UNIQUE,
  product_name TEXT,
  job_title TEXT,
  employment_type TEXT,  -- employment_types.code を参照
  clicks INTEGER DEFAULT 0,
  ctr REAL DEFAULT 0.0,
  
  -- バナー画像（R2のキー/パスを保存）
  banner_image_key TEXT NOT NULL,
  banner_image_url TEXT,
  
  -- 分析タグ
  visual_type TEXT,  -- visual_types.code を参照
  main_color TEXT,   -- main_colors.code を参照
  atmosphere TEXT,   -- atmospheres.code を参照
  
  -- AI自動入力フィールド
  extracted_text TEXT,
  
  -- 任意メモ
  notes TEXT,
  
  -- タイムスタンプ
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 中間テーブル: BannerKnowledge <-> エリア（多対多）
-- ============================================

CREATE TABLE IF NOT EXISTS banner_areas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  knowledge_id TEXT NOT NULL,
  area_code TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (knowledge_id) REFERENCES banner_knowledge(knowledge_id) ON DELETE CASCADE,
  FOREIGN KEY (area_code) REFERENCES areas(code) ON DELETE CASCADE,
  UNIQUE(knowledge_id, area_code)
);

-- ============================================
-- 中間テーブル: BannerKnowledge <-> メイン訴求（多対多）
-- ============================================

CREATE TABLE IF NOT EXISTS banner_main_appeals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  knowledge_id TEXT NOT NULL,
  appeal_code TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (knowledge_id) REFERENCES banner_knowledge(knowledge_id) ON DELETE CASCADE,
  FOREIGN KEY (appeal_code) REFERENCES main_appeals(code) ON DELETE CASCADE,
  UNIQUE(knowledge_id, appeal_code)
);

-- ============================================
-- インデックス作成
-- ============================================

-- BannerKnowledgeテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_banner_knowledge_image_id ON banner_knowledge(image_id);
CREATE INDEX IF NOT EXISTS idx_banner_knowledge_employment_type ON banner_knowledge(employment_type);
CREATE INDEX IF NOT EXISTS idx_banner_knowledge_ctr ON banner_knowledge(ctr DESC);
CREATE INDEX IF NOT EXISTS idx_banner_knowledge_created_at ON banner_knowledge(created_at DESC);

-- 中間テーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_banner_areas_knowledge_id ON banner_areas(knowledge_id);
CREATE INDEX IF NOT EXISTS idx_banner_areas_area_code ON banner_areas(area_code);
CREATE INDEX IF NOT EXISTS idx_banner_main_appeals_knowledge_id ON banner_main_appeals(knowledge_id);
CREATE INDEX IF NOT EXISTS idx_banner_main_appeals_appeal_code ON banner_main_appeals(appeal_code);

-- ============================================
-- トリガー: updated_atの自動更新
-- ============================================

CREATE TRIGGER IF NOT EXISTS update_banner_knowledge_timestamp 
AFTER UPDATE ON banner_knowledge
FOR EACH ROW
BEGIN
  UPDATE banner_knowledge 
  SET updated_at = CURRENT_TIMESTAMP 
  WHERE knowledge_id = NEW.knowledge_id;
END;
