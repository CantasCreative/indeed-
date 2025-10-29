// Cloudflare Workers Bindings
export type Bindings = {
  DB: D1Database;
  BANNER_BUCKET: R2Bucket;
};

// BannerKnowledge Model
export interface BannerKnowledge {
  knowledge_id: string;
  image_id: string;
  product_name?: string;
  job_title?: string;
  employment_type?: string;
  clicks?: number;
  ctr?: number;
  banner_image_key?: string;
  banner_image_url?: string;
  visual_type?: string;
  main_color?: string;
  atmosphere?: string;
  extracted_text?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  // 多対多関係
  areas?: string[];
  main_appeals?: string[];
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

// API Request/Response Types
export interface CreateBannerRequest {
  image_id: string;
  product_name?: string;
  job_title?: string;
  employment_type?: string;
  areas?: string[];
  clicks?: number;
  ctr?: number;
  visual_type?: string;
  main_appeals?: string[];
  main_color?: string;
  atmosphere?: string;
  extracted_text?: string;
  notes?: string;
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
