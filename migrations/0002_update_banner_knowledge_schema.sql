-- ============================================
-- Indeedバナーナレッジ分析システム
-- BannerKnowledgeスキーマ変更マイグレーション
-- ============================================

-- 変更内容:
-- 1. product_name を削除
-- 2. company_name を追加
-- 3. area を単一選択に変更（banner_areas 中間テーブルは維持するが、使用は1レコードのみ）
-- 4. impressions を追加
-- 5. employment_type は手動入力フィールドとして明確化

-- SQLiteではALTER TABLEの制約があるため、テーブル再作成アプローチを使用

-- ============================================
-- Step 1: 新しいテーブルを作成
-- ============================================

CREATE TABLE IF NOT EXISTS banner_knowledge_new (
  -- 主キー
  knowledge_id TEXT PRIMARY KEY,
  
  -- ATOMデータフィールド（CSVインポート対象）
  image_id TEXT NOT NULL UNIQUE,           -- CSV: 参照番号
  company_name TEXT,                        -- CSV: 企業名（新規追加）
  job_title TEXT,                           -- CSV: 求人
  impressions INTEGER DEFAULT 0,            -- CSV: 表示回数（新規追加）
  clicks INTEGER DEFAULT 0,                 -- CSV: クリック数
  ctr REAL DEFAULT 0.0,                     -- CSV: クリック率（CTR）
  
  -- area は単一選択（banner_areasテーブルで管理するが1レコードのみ使用）
  -- CSV: 都道府県 → エリア辞書とマッピング
  
  -- 手動入力フィールド
  employment_type TEXT,                     -- 雇用形態（手動入力、辞書参照）
  
  -- バナー画像（R2のキー/パスを保存）
  banner_image_key TEXT,                    -- 手動アップロード
  banner_image_url TEXT,
  
  -- 分析タグ（AI支援 + 手動入力）
  visual_type TEXT,                         -- visual_types.code を参照
  main_color TEXT,                          -- main_colors.code を参照
  atmosphere TEXT,                          -- atmospheres.code を参照
  
  -- AI自動入力フィールド
  extracted_text TEXT,
  
  -- 任意メモ
  notes TEXT,
  
  -- タイムスタンプ
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Step 2: 既存データを新テーブルにコピー
-- ============================================

INSERT INTO banner_knowledge_new (
  knowledge_id,
  image_id,
  company_name,
  job_title,
  impressions,
  clicks,
  ctr,
  employment_type,
  banner_image_key,
  banner_image_url,
  visual_type,
  main_color,
  atmosphere,
  extracted_text,
  notes,
  created_at,
  updated_at
)
SELECT 
  knowledge_id,
  image_id,
  NULL as company_name,              -- 新規フィールド、既存データはNULL
  job_title,
  0 as impressions,                  -- 新規フィールド、既存データは0
  clicks,
  ctr,
  employment_type,
  banner_image_key,
  banner_image_url,
  visual_type,
  main_color,
  atmosphere,
  extracted_text,
  notes,
  created_at,
  updated_at
FROM banner_knowledge;

-- ============================================
-- Step 3: 古いテーブルを削除し、新テーブルをリネーム
-- ============================================

DROP TABLE banner_knowledge;
ALTER TABLE banner_knowledge_new RENAME TO banner_knowledge;

-- ============================================
-- Step 4: インデックスを再作成
-- ============================================

CREATE INDEX IF NOT EXISTS idx_banner_knowledge_image_id ON banner_knowledge(image_id);
CREATE INDEX IF NOT EXISTS idx_banner_knowledge_employment_type ON banner_knowledge(employment_type);
CREATE INDEX IF NOT EXISTS idx_banner_knowledge_ctr ON banner_knowledge(ctr DESC);
CREATE INDEX IF NOT EXISTS idx_banner_knowledge_created_at ON banner_knowledge(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_banner_knowledge_company_name ON banner_knowledge(company_name);

-- ============================================
-- Step 5: トリガーを再作成
-- ============================================

DROP TRIGGER IF EXISTS update_banner_knowledge_timestamp;

CREATE TRIGGER update_banner_knowledge_timestamp 
AFTER UPDATE ON banner_knowledge
FOR EACH ROW
BEGIN
  UPDATE banner_knowledge 
  SET updated_at = CURRENT_TIMESTAMP 
  WHERE knowledge_id = NEW.knowledge_id;
END;

-- ============================================
-- 注意事項
-- ============================================
-- * banner_areas テーブルは維持されますが、area は単一選択として使用します
-- * 既存データでは company_name と impressions は NULL/0 となります
-- * employment_type は手動入力フィールドとして明確化されました
