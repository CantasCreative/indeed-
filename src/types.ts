// Cloudflare Workers Bindings
export type Bindings = {
  DB: D1Database;
  BANNER_BUCKET: R2Bucket;
};

// BannerKnowledge Model (Optimized for Spreadsheet Management)
export interface BannerKnowledge {
  knowledge_id: string;
  image_id: string;                    // スプシ: 参照番号
  company_name?: string;                // スプシ: 企業名
  job_title?: string;                   // スプシ: 求人
  impressions?: number;                 // スプシ: 表示回数
  clicks?: number;                      // スプシ: クリック数
  ctr?: number;                         // スプシ: クリック率（CTR）
  employment_type?: string;             // スプシ: 雇用形態（辞書参照）
  banner_image_url?: string;            // スプシ: Googleドライブ画像URL
  visual_type?: string;                 // スプシ: 人あり無し（辞書参照）
  main_color?: string;                  // スプシ: 色味（辞書参照）
  atmosphere?: string;                  // 手動入力/AI支援
  extracted_text?: string;              // AI自動入力
  notes?: string;                       // 手動入力（任意）
  created_at?: string;
  updated_at?: string;
  // area は単一選択（areaフィールドまたはareasの最初の要素）
  area?: string;                        // スプシ: エリア（単一選択）
  areas?: string[];                     // 互換性のため維持（1要素のみ使用）
  main_appeals?: string[];              // スプシ: メイン訴求（複数選択）
  sub_appeals?: string[];               // スプシ: サブ訴求（複数選択、NEW）
}

// Dictionary Models
export interface DictionaryItem {
  id: number;
  code: string;
  name: string;
  display_order: number;
  created_at: string;
}

export interface MainColor extends DictionaryItem {
  hex_color?: string;
}

// API Request/Response Types (Optimized for Spreadsheet Management)
export interface CreateBannerRequest {
  image_id: string;                    // スプシ: 参照番号
  company_name?: string;                // スプシ: 企業名
  job_title?: string;                   // スプシ: 求人
  area?: string;                        // スプシ: エリア（単一選択）
  impressions?: number;                 // スプシ: 表示回数
  clicks?: number;                      // スプシ: クリック数
  ctr?: number;                         // スプシ: クリック率
  employment_type?: string;             // スプシ: 雇用形態
  banner_image_url?: string;            // スプシ: Googleドライブ画像URL
  visual_type?: string;                 // スプシ: 人あり無し
  main_appeals?: string[];              // スプシ: メイン訴求（複数選択）
  sub_appeals?: string[];               // スプシ: サブ訴求（複数選択）
  main_color?: string;                  // スプシ: 色味
  atmosphere?: string;                  // 手動入力/AI支援
  extracted_text?: string;              // AI自動入力
  notes?: string;                       // 手動入力（任意）
}

// CSV Import Request
export interface CSVImportRequest {
  image_id: string;                    // 参照番号
  company_name: string;                // 企業名
  job_title: string;                   // 求人
  area: string;                        // 都道府県
  impressions: number;                 // 表示回数
  clicks: number;                      // クリック数
  ctr: number;                         // クリック率（CTR）
}

export interface SearchRequest {
  company_name?: string;
  job_title?: string;
  employment_types?: string[];
  areas?: string[];
  main_appeals?: string[];
  limit?: number;
}

export interface SearchResult {
  items: BannerKnowledge[];
  total: number;
}
