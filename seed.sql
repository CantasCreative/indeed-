-- ============================================
-- Indeedバナーナレッジ分析システム
-- 辞書マスターデータ（シードデータ）
-- ============================================

-- 既存データをクリア（開発時のリセット用）
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
-- ============================================
INSERT INTO visual_types (code, name, display_order) VALUES
('person_single', '人物写真（単体）', 1),
('person_multiple', '人物写真（複数）', 2),
('illustration', 'イラスト', 3),
('text_only', 'テキストのみ', 4),
('product_landscape', '商品・風景写真', 5),
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
