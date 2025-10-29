// Cloudflare Workers Bindings
export type Bindings = {
  DB: D1Database;
  BANNER_BUCKET: R2Bucket;
};

// BannerKnowledge Model (Updated)
export interface BannerKnowledge {
  knowledge_id: string;
  image_id: string;                    // CSV: 参照番号
  company_name?: string;                // CSV: 企業名 (NEW)
  job_title?: string;                   // CSV: 求人
  impressions?: number;                 // CSV: 表示回数 (NEW)
  clicks?: number;                      // CSV: クリック数
  ctr?: number;                         // CSV: クリック率（CTR）
  employment_type?: string;             // 手動入力: 雇用形態（辞書参照）
  banner_image_key?: string;            // 手動アップロード
  banner_image_url?: string;
  visual_type?: string;                 // AI支援 + 手動入力
  main_color?: string;                  // AI支援 + 手動入力
  atmosphere?: string;                  // AI支援 + 手動入力
  extracted_text?: string;              // AI自動入力
  notes?: string;                       // 手動入力（任意）
  created_at?: string;
  updated_at?: string;
  // area は単一選択（areaフィールドまたはareasの最初の要素）
  area?: string;                        // CSV: 都道府県（単一選択）
  areas?: string[];                     // 互換性のため維持（1要素のみ使用）
  main_appeals?: string[];              // AI支援 + 手動入力（複数選択）
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

// API Request/Response Types (Updated)
export interface CreateBannerRequest {
  image_id: string;                    // CSV: 参照番号
  company_name?: string;                // CSV: 企業名
  job_title?: string;                   // CSV: 求人
  area?: string;                        // CSV: 都道府県（単一選択）
  impressions?: number;                 // CSV: 表示回数
  clicks?: number;                      // CSV: クリック数
  ctr?: number;                         // CSV: クリック率
  employment_type?: string;             // 手動入力: 雇用形態
  visual_type?: string;                 // AI支援 + 手動入力
  main_appeals?: string[];              // AI支援 + 手動入力（複数選択）
  main_color?: string;                  // AI支援 + 手動入力
  atmosphere?: string;                  // AI支援 + 手動入力
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
