-- ステップ2: 辞書データ投入

-- 雇用形態
INSERT INTO employment_types (code, name, display_order) VALUES
('fulltime', '正社員', 1),
('contract', '契約社員', 2),
('parttime', 'アルバイト・パート', 3),
('temporary', '派遣社員', 4),
('other', 'その他', 5);

-- エリア
INSERT INTO areas (code, name, display_order) VALUES
('hokkaido', '北海道', 1),
('tohoku', '東北', 2),
('kanto', '関東', 3),
('chubu', '中部', 4),
('kansai', '関西', 5),
('chugoku', '中国', 6),
('shikoku', '四国', 7),
('kyushu', '九州・沖縄', 8),
('nationwide', '全国', 9);

-- メイン訴求（15項目 - サブ訴求も同じリストを使用）
INSERT INTO main_appeals (code, name, display_order) VALUES
('inexperienced', '未経験歓迎', 1),
('high_income', '高収入・高時給', 2),
('flexible_shift', 'シフト自由・選べる', 3),
('weekends_holidays_off', '土日祝休み', 4),
('homemaker_friendly', '主婦・主夫歓迎', 5),
('student_friendly', '学生歓迎', 6),
('immediate_start', 'オープニングスタッフ', 7),
('benefits_perks', '福利厚生充実', 8),
('transportation_provided', '交通費支給', 9),
('near_station', '駅近', 10),
('short_hours', '短時間OK', 11),
('daily_payment', '日払い・週払いOK', 12),
('wfh', '在宅勤務・リモートワーク', 13),
('senior_friendly', 'シニア歓迎', 14),
('short_term', '短時間・短期OK', 15);

-- ビジュアル種別
INSERT INTO visual_types (code, name, display_order) VALUES
('with_people', '人あり', 1),
('without_people', '人なし', 2);

-- メインカラー
INSERT INTO main_colors (code, name, hex_color, display_order) VALUES
('red', '赤', '#FF0000', 1),
('blue', '青', '#0000FF', 2),
('green', '緑', '#00FF00', 3),
('yellow', '黄', '#FFFF00', 4),
('orange', 'オレンジ', '#FFA500', 5),
('purple', '紫', '#800080', 6),
('pink', 'ピンク', '#FFC0CB', 7),
('brown', '茶', '#8B4513', 8),
('black', '黒', '#000000', 9),
('white', '白', '#FFFFFF', 10),
('gray', 'グレー', '#808080', 11);

-- 雰囲気
INSERT INTO atmospheres (code, name, display_order) VALUES
('cheerful', '明るい', 1),
('calm', '落ち着いた', 2),
('professional', 'プロフェッショナル', 3),
('friendly', 'フレンドリー', 4),
('energetic', '元気な', 5);
