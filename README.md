# Indeedバナーナレッジ分析システム

## プロジェクト概要
- **アプリ名**: Indeedバナーナレッジ分析システム
- **目的**: Indeed広告のATOMデータとバナークリエイティブを一元管理し、AI分析により営業の差別化を図る社内システム
- **主要機能**:
  1. Indeed広告のATOMデータ（実績）とバナー画像の一元管理
  2. バナーの訴求内容・デザイン傾向のタグ付けと蓄積
  3. AIによる画像からの自動タグ付け
  4. 業種・雇用形態別のCTRトップ5バナーの分析とAI要約

## 現在の実装状況

### ✅ 完了した機能
- プロジェクト初期化（Hono + Cloudflare Pages）
- データベーススキーマ設計と実装
- Gitリポジトリ設定

### 📊 データモデル

#### メインテーブル: `banner_knowledge`
| フィールド名 | データ型 | 説明 |
|------------|---------|------|
| knowledge_id | TEXT | 一意のID（主キー） |
| image_id | TEXT | ATOMの画像ID（必須・一意） |
| product_name | TEXT | プロダクト名 |
| job_title | TEXT | 職種名 |
| employment_type | TEXT | 雇用形態（辞書参照） |
| clicks | INTEGER | クリック数 |
| ctr | REAL | クリック率 |
| banner_image_key | TEXT | R2バケットの画像キー |
| banner_image_url | TEXT | 画像URL |
| visual_type | TEXT | ビジュアル種別（辞書参照） |
| main_color | TEXT | メインカラー（辞書参照） |
| atmosphere | TEXT | 雰囲気（辞書参照） |
| extracted_text | TEXT | OCR抽出テキスト（AI自動入力） |
| notes | TEXT | 補足メモ |
| created_at | DATETIME | 登録日 |
| updated_at | DATETIME | 更新日 |

#### 辞書テーブル
- `employment_types` - 雇用形態辞書（ステップ3で値を定義）
- `areas` - エリア辞書（ステップ3で値を定義）
- `main_appeals` - メイン訴求辞書（ステップ3で値を定義）
- `visual_types` - ビジュアル種別辞書（ステップ3で値を定義）
- `main_colors` - メインカラー辞書（ステップ3で値を定義）
- `atmospheres` - 雰囲気辞書（ステップ3で値を定義）

#### 中間テーブル（多対多関係）
- `banner_areas` - バナーとエリアの関連
- `banner_main_appeals` - バナーとメイン訴求の関連

### 🗄️ ストレージサービス
- **Cloudflare D1**: SQLiteベースのリレーショナルデータベース（メタデータ管理）
- **Cloudflare R2**: S3互換オブジェクトストレージ（バナー画像保存）

### 🔧 データベース管理コマンド
```bash
# ローカル開発用
npm run db:migrate:local    # マイグレーション実行（ローカル）
npm run db:console:local    # SQLクエリ実行（ローカル）
npm run db:reset            # データベースリセット

# 本番環境用
npm run db:migrate:prod     # マイグレーション実行（本番）
npm run db:console:prod     # SQLクエリ実行（本番）
```

## 🚀 次の実装ステップ

### ステップ3: 辞書データの定義
- 雇用形態辞書の値定義
- エリア辞書の値定義
- メイン訴求辞書の値定義
- ビジュアル種別辞書の値定義
- メインカラー辞書の値定義
- 雰囲気辞書の値定義

### ステップ4: バックエンドAPI実装
- データ登録API
- データ検索API
- CTRトップ5取得API
- 画像アップロードAPI

### ステップ5: AI統合
- 画像解析API連携（OCR）
- 自動タグ付け機能
- 分析・要約生成API

### ステップ6: フロントエンド実装
- データ登録画面
- 検索・分析画面
- レポート表示画面

## 技術スタック
- **フレームワーク**: Hono (TypeScript)
- **デプロイ**: Cloudflare Pages + Workers
- **データベース**: Cloudflare D1 (SQLite)
- **ストレージ**: Cloudflare R2
- **フロントエンド**: HTML + TailwindCSS + JavaScript
- **バージョン管理**: Git

## デプロイ状況
- **ステータス**: 開発中（データモデル定義完了）
- **最終更新**: 2025-10-29
