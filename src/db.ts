import type { BannerKnowledge, DictionaryItem, MainColor, CreateBannerRequest, SearchRequest } from './types';

// Generate unique ID
export function generateId(): string {
  return `BK${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
}

// Dictionary APIs
export async function getEmploymentTypes(db: D1Database): Promise<DictionaryItem[]> {
  const result = await db.prepare('SELECT * FROM employment_types ORDER BY display_order').all();
  return result.results as DictionaryItem[];
}

export async function getAreas(db: D1Database): Promise<DictionaryItem[]> {
  const result = await db.prepare('SELECT * FROM areas ORDER BY display_order').all();
  return result.results as DictionaryItem[];
}

export async function getMainAppeals(db: D1Database): Promise<DictionaryItem[]> {
  const result = await db.prepare('SELECT * FROM main_appeals ORDER BY display_order').all();
  return result.results as DictionaryItem[];
}

export async function getVisualTypes(db: D1Database): Promise<DictionaryItem[]> {
  const result = await db.prepare('SELECT * FROM visual_types ORDER BY display_order').all();
  return result.results as DictionaryItem[];
}

export async function getMainColors(db: D1Database): Promise<MainColor[]> {
  const result = await db.prepare('SELECT * FROM main_colors ORDER BY display_order').all();
  return result.results as MainColor[];
}

export async function getAtmospheres(db: D1Database): Promise<DictionaryItem[]> {
  const result = await db.prepare('SELECT * FROM atmospheres ORDER BY display_order').all();
  return result.results as DictionaryItem[];
}

// Create BannerKnowledge (Updated)
export async function createBannerKnowledge(
  db: D1Database,
  data: CreateBannerRequest,
  bannerImageKey?: string,
  bannerImageUrl?: string
): Promise<string> {
  const knowledgeId = generateId();

  // Insert main record (Updated schema)
  await db
    .prepare(`
      INSERT INTO banner_knowledge (
        knowledge_id, image_id, company_name, job_title, impressions,
        clicks, ctr, employment_type, banner_image_key, banner_image_url, 
        visual_type, main_color, atmosphere, extracted_text, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      knowledgeId,
      data.image_id,
      data.company_name || null,
      data.job_title || null,
      data.impressions || 0,
      data.clicks || 0,
      data.ctr || 0.0,
      data.employment_type || null,
      bannerImageKey || null,
      bannerImageUrl || null,
      data.visual_type || null,
      data.main_color || null,
      data.atmosphere || null,
      data.extracted_text || null,
      data.notes || null
    )
    .run();

  // Insert area (single selection - store as one record in banner_areas)
  if (data.area) {
    await db
      .prepare('INSERT INTO banner_areas (knowledge_id, area_code) VALUES (?, ?)')
      .bind(knowledgeId, data.area)
      .run();
  }

  // Insert main appeals (many-to-many)
  if (data.main_appeals && data.main_appeals.length > 0) {
    for (const appealCode of data.main_appeals) {
      await db
        .prepare('INSERT INTO banner_main_appeals (knowledge_id, appeal_code) VALUES (?, ?)')
        .bind(knowledgeId, appealCode)
        .run();
    }
  }

  return knowledgeId;
}

// Search BannerKnowledge
export async function searchBannerKnowledge(
  db: D1Database,
  params: SearchRequest
): Promise<BannerKnowledge[]> {
  let query = 'SELECT DISTINCT bk.* FROM banner_knowledge bk';
  const conditions: string[] = [];
  const bindings: any[] = [];

  // Join with areas if needed
  if (params.areas && params.areas.length > 0) {
    query += ' INNER JOIN banner_areas ba ON bk.knowledge_id = ba.knowledge_id';
    conditions.push(`ba.area_code IN (${params.areas.map(() => '?').join(',')})`);
    bindings.push(...params.areas);
  }

  // Join with main appeals if needed
  if (params.main_appeals && params.main_appeals.length > 0) {
    query += ' INNER JOIN banner_main_appeals bma ON bk.knowledge_id = bma.knowledge_id';
    conditions.push(`bma.appeal_code IN (${params.main_appeals.map(() => '?').join(',')})`);
    bindings.push(...params.main_appeals);
  }

  // Job title filter (partial match)
  if (params.job_title) {
    conditions.push('bk.job_title LIKE ?');
    bindings.push(`%${params.job_title}%`);
  }

  // Employment types filter
  if (params.employment_types && params.employment_types.length > 0) {
    conditions.push(`bk.employment_type IN (${params.employment_types.map(() => '?').join(',')})`);
    bindings.push(...params.employment_types);
  }

  // Add WHERE clause
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  // Order by CTR DESC and limit
  query += ' ORDER BY bk.ctr DESC';
  if (params.limit) {
    query += ' LIMIT ?';
    bindings.push(params.limit);
  }

  const stmt = db.prepare(query);
  const result = await stmt.bind(...bindings).all();

  // Fetch related areas and appeals for each result
  const items = result.results as BannerKnowledge[];
  for (const item of items) {
    // Get area (single selection - only one record expected)
    const areasResult = await db
      .prepare('SELECT area_code FROM banner_areas WHERE knowledge_id = ? LIMIT 1')
      .bind(item.knowledge_id)
      .all();
    if (areasResult.results.length > 0) {
      item.area = (areasResult.results[0] as any).area_code;
      item.areas = [item.area]; // For backward compatibility
    }

    // Get main appeals
    const appealsResult = await db
      .prepare('SELECT appeal_code FROM banner_main_appeals WHERE knowledge_id = ?')
      .bind(item.knowledge_id)
      .all();
    item.main_appeals = appealsResult.results.map((r: any) => r.appeal_code);
  }

  return items;
}

// Get BannerKnowledge by ID
export async function getBannerKnowledgeById(
  db: D1Database,
  knowledgeId: string
): Promise<BannerKnowledge | null> {
  const result = await db
    .prepare('SELECT * FROM banner_knowledge WHERE knowledge_id = ?')
    .bind(knowledgeId)
    .first();

  if (!result) return null;

  const item = result as BannerKnowledge;

  // Get area (single selection)
  const areasResult = await db
    .prepare('SELECT area_code FROM banner_areas WHERE knowledge_id = ? LIMIT 1')
    .bind(knowledgeId)
    .all();
  if (areasResult.results.length > 0) {
    item.area = (areasResult.results[0] as any).area_code;
    item.areas = [item.area]; // For backward compatibility
  }

  // Get main appeals
  const appealsResult = await db
    .prepare('SELECT appeal_code FROM banner_main_appeals WHERE knowledge_id = ?')
    .bind(knowledgeId)
    .all();
  item.main_appeals = appealsResult.results.map((r: any) => r.appeal_code);

  return item;
}
