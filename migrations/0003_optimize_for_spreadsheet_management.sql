-- ============================================
-- Indeedバナーナレッジ分析システム
-- スプレッドシート管理最適化マイグレーション
-- ============================================

-- 変更内容:
-- 1. banner_image_key を削除（R2ストレージ不要）
-- 2. banner_image_url を維持（Googleドライブ画像URL格納用）
-- 3. sub_appeal 中間テーブルを追加（複数選択、メイン訴求辞書と同じ選択肢）
-- 4. visual_type の選択肢を変更（["人物あり", "人物なし", "イラスト", "テキストのみ", "その他"]）

-- SQLiteではALTER TABLEの制約があるため、テーブル再作成アプローチを使用

-- ============================================
-- Step 1: 新しいテーブルを作成
-- ============================================

CREATE TABLE IF NOT EXISTS banner_knowledge_new (
  -- 主キー
  knowledge_id TEXT PRIMARY KEY,
  
  -- スプレッドシート連携フィールド
  image_id TEXT NOT NULL UNIQUE,           -- スプシ: 参照番号
  company_name TEXT,                        -- スプシ: 企業名
  job_title TEXT,                           -- スプシ: 求人
  impressions INTEGER DEFAULT 0,            -- スプシ: 表示回数
  clicks INTEGER DEFAULT 0,                 -- スプシ: クリック数
  ctr REAL DEFAULT 0.0,                     -- スプシ: クリック率（CTR）
  employment_type TEXT,                     -- スプシ: 雇用形態
  
  -- area は単一選択（banner_areasテーブルで管理）
  -- スプシ: エリア
  
  -- バナー画像URL（Googleドライブ）
  banner_image_url TEXT,                    -- スプシ: 画像URL
  
  -- 分析タグ（スプレッドシートから連携）
  visual_type TEXT,                         -- スプシ: 人あり無し（visual_types.code を参照）
  main_color TEXT,                          -- スプシ: 色味（main_colors.code を参照）
  atmosphere TEXT,                          -- 手動入力/AI支援（atmospheres.code を参照）
  
  -- main_appeal は banner_main_appeals テーブルで管理（複数選択）
  -- sub_appeal は banner_sub_appeals テーブルで管理（複数選択、新規追加）
  
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
  company_name,
  job_title,
  impressions,
  clicks,
  ctr,
  employment_type,
  banner_image_url,                        -- banner_image_key は削除
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
-- Step 4: banner_sub_appeals 中間テーブルを作成
-- ============================================

CREATE TABLE IF NOT EXISTS banner_sub_appeals (
  knowledge_id TEXT NOT NULL,
  appeal_code TEXT NOT NULL,
  PRIMARY KEY (knowledge_id, appeal_code),
  FOREIGN KEY (knowledge_id) REFERENCES banner_knowledge(knowledge_id) ON DELETE CASCADE,
  FOREIGN KEY (appeal_code) REFERENCES main_appeals(code) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_banner_sub_appeals_knowledge ON banner_sub_appeals(knowledge_id);
CREATE INDEX IF NOT EXISTS idx_banner_sub_appeals_appeal ON banner_sub_appeals(appeal_code);

-- ============================================
-- Step 5: インデックスを再作成
-- ============================================

CREATE INDEX IF NOT EXISTS idx_banner_knowledge_image_id ON banner_knowledge(image_id);
CREATE INDEX IF NOT EXISTS idx_banner_knowledge_employment_type ON banner_knowledge(employment_type);
CREATE INDEX IF NOT EXISTS idx_banner_knowledge_ctr ON banner_knowledge(ctr DESC);
CREATE INDEX IF NOT EXISTS idx_banner_knowledge_created_at ON banner_knowledge(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_banner_knowledge_company_name ON banner_knowledge(company_name);

-- ============================================
-- Step 6: トリガーを再作成
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
-- * banner_image_key フィールドは削除されました（R2ストレージ不要）
-- * banner_image_url はGoogleドライブのURLを格納します
-- * banner_sub_appeals テーブルが新規作成され、main_appeals辞書を参照します
-- * visual_type の選択肢は次のステップで更新されます
