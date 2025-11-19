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
-- ============================================
-- Indeedバナーナレッジ分析システム
-- 辞書マスターデータ（シードデータ）
-- ============================================

-- 既存データをクリア（開発時のリセット用）
DELETE FROM banner_sub_appeals;
DELETE FROM banner_main_appeals;
DELETE FROM banner_areas;
DELETE FROM banner_knowledge;
DELETE FROM employment_types;
DELETE FROM areas;
DELETE FROM main_appeals;
DELETE FROM visual_types;
DELETE FROM main_colors;
DELETE FROM atmospheres;

-- ============================================
-- 1. 雇用形態辞書 (employment_types)
-- ============================================
INSERT INTO employment_types (code, name, display_order) VALUES
('fulltime', '正社員', 1),
('parttime', 'アルバイト・パート', 2),
('dispatch', '派遣社員', 3),
('contract', '契約社員', 4),
('commission', '業務委託', 5),
('other', 'その他', 99);

-- ============================================
-- 2. エリア辞書 (areas) - 全国 + 47都道府県
-- ============================================
INSERT INTO areas (code, name, display_order) VALUES
('nationwide', '全国', 0),
('hokkaido', '北海道', 1),
('aomori', '青森県', 2),
('iwate', '岩手県', 3),
('miyagi', '宮城県', 4),
('akita', '秋田県', 5),
('yamagata', '山形県', 6),
('fukushima', '福島県', 7),
('ibaraki', '茨城県', 8),
('tochigi', '栃木県', 9),
('gunma', '群馬県', 10),
('saitama', '埼玉県', 11),
('chiba', '千葉県', 12),
('tokyo', '東京都', 13),
('kanagawa', '神奈川県', 14),
('niigata', '新潟県', 15),
('toyama', '富山県', 16),
('ishikawa', '石川県', 17),
('fukui', '福井県', 18),
('yamanashi', '山梨県', 19),
('nagano', '長野県', 20),
('gifu', '岐阜県', 21),
('shizuoka', '静岡県', 22),
('aichi', '愛知県', 23),
('mie', '三重県', 24),
('shiga', '滋賀県', 25),
('kyoto', '京都府', 26),
('osaka', '大阪府', 27),
('hyogo', '兵庫県', 28),
('nara', '奈良県', 29),
('wakayama', '和歌山県', 30),
('tottori', '鳥取県', 31),
('shimane', '島根県', 32),
('okayama', '岡山県', 33),
('hiroshima', '広島県', 34),
('yamaguchi', '山口県', 35),
('tokushima', '徳島県', 36),
('kagawa', '香川県', 37),
('ehime', '愛媛県', 38),
('kochi', '高知県', 39),
('fukuoka', '福岡県', 40),
('saga', '佐賀県', 41),
('nagasaki', '長崎県', 42),
('kumamoto', '熊本県', 43),
('oita', '大分県', 44),
('miyazaki', '宮崎県', 45),
('kagoshima', '鹿児島県', 46),
('okinawa', '沖縄県', 47);

-- ============================================
-- 3. メイン訴求辞書 (main_appeals)
-- ============================================
INSERT INTO main_appeals (code, name, display_order) VALUES
('inexperienced', '未経験歓迎', 1),
('high_income', '高収入・高時給', 2),
('flexible_shift', 'シフト自由・選べる', 3),
('double_work', 'Wワーク・副業OK', 4),
('remote_work', 'リモートワーク・在宅OK', 5),
('station_close', '駅チカ・通勤便利', 6),
('housewife_friendly', '主婦・主夫歓迎', 7),
('senior_active', 'シニア活躍中', 8),
('middle_active', 'ミドル活躍中', 9),
('opening_staff', 'オープニングスタッフ', 10),
('qualification_support', '資格取得支援', 11),
('weekends_off', '土日祝休み', 12),
('fulltime_opportunity', '正社員登用あり', 13),
('free_style', '髪色・服装自由', 14),
('short_term', '短時間・短期OK', 15);

-- ============================================
-- 4. ビジュアル種別辞書 (visual_types)
-- スプレッドシートの「人あり無し」項目と連携
-- ============================================
INSERT INTO visual_types (code, name, display_order) VALUES
('person_with', '人物あり', 1),
('person_without', '人物なし', 2),
('illustration', 'イラスト', 3),
('text_only', 'テキストのみ', 4),
('other', 'その他', 99);

-- ============================================
-- 5. メインカラー辞書 (main_colors)
-- ============================================
INSERT INTO main_colors (code, name, hex_color, display_order) VALUES
('blue', '青系', '#0066CC', 1),
('red_orange', '赤・オレンジ系', '#FF6600', 2),
('green', '緑系', '#00AA44', 3),
('yellow', '黄系', '#FFD700', 4),
('purple', '紫系', '#9933CC', 5),
('pink', 'ピンク系', '#FF66AA', 6),
('black', 'モノクロ・黒', '#333333', 7),
('white_colorful', '白ベース・カラフル', '#FFFFFF', 8);

-- ============================================
-- 6. 雰囲気辞書 (atmospheres)
-- ============================================
INSERT INTO atmospheres (code, name, display_order) VALUES
('bright_energetic', '明るい・元気', 1),
('serious_professional', '真面目・信頼・プロフェッショナル', 2),
('stylish_advanced', 'スタイリッシュ・先進的', 3),
('gentle_warm', '優しい・安心・温かい', 4),
('cool_stylish', 'クール・かっこいい', 5),
('senior_calm', 'シニア向け・落ち着いた', 6),
('impactful', 'インパクト重視', 7);

-- ============================================
-- 投入結果の確認
-- ============================================
-- この部分は実行結果確認用（コメント）
-- SELECT 'employment_types' as table_name, COUNT(*) as count FROM employment_types
-- UNION ALL
-- SELECT 'areas', COUNT(*) FROM areas
-- UNION ALL
-- SELECT 'main_appeals', COUNT(*) FROM main_appeals
-- UNION ALL
-- SELECT 'visual_types', COUNT(*) FROM visual_types
-- UNION ALL
-- SELECT 'main_colors', COUNT(*) FROM main_colors
-- UNION ALL
-- SELECT 'atmospheres', COUNT(*) FROM atmospheres;
