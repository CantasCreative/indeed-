import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-workers';
import type { Bindings } from './types';
import * as db from './db';
import * as ai from './ai';
import * as sheets from './sheets';

const app = new Hono<{ Bindings: Bindings }>();

// Enable CORS for API routes
app.use('/api/*', cors());

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }));

// ============================================
// API Routes - Dictionaries
// ============================================

app.get('/api/dictionaries/employment-types', async (c) => {
  const items = await db.getEmploymentTypes(c.env.DB);
  return c.json(items);
});

app.get('/api/dictionaries/areas', async (c) => {
  const items = await db.getAreas(c.env.DB);
  return c.json(items);
});

app.get('/api/dictionaries/main-appeals', async (c) => {
  const items = await db.getMainAppeals(c.env.DB);
  return c.json(items);
});

app.get('/api/dictionaries/visual-types', async (c) => {
  const items = await db.getVisualTypes(c.env.DB);
  return c.json(items);
});

app.get('/api/dictionaries/main-colors', async (c) => {
  const items = await db.getMainColors(c.env.DB);
  return c.json(items);
});

app.get('/api/dictionaries/atmospheres', async (c) => {
  const items = await db.getAtmospheres(c.env.DB);
  return c.json(items);
});

// ============================================
// API Routes - Banner Knowledge
// ============================================

// Sync data from Google Spreadsheet (CSV public URL)
app.post('/api/banners/sync-from-sheet', async (c) => {
  try {
    const { spreadsheet_id, gid } = await c.req.json();
    
    if (!spreadsheet_id) {
      return c.json({ success: false, error: 'スプレッドシートIDが必要です' }, 400);
    }

    // Fetch data from Google Sheets (CSV export)
    const sheetRows = await sheets.fetchSheetData({
      spreadsheet_id,
      gid: gid || '0'
    });

    if (sheetRows.length === 0) {
      return c.json({ success: false, error: 'スプレッドシートにデータがありません。スプレッドシートを「ウェブに公開」していることを確認してください。' }, 400);
    }

    // Get area dictionary for mapping
    const areas = await db.getAreas(c.env.DB);
    const areaMap = new Map(areas.map(a => [a.name, a.code]));

    // Convert sheet data to banner format
    const banners = sheets.convertSheetDataToBanners(sheetRows, areaMap);

    // Clear existing data and insert new data
    await db.clearAllBanners(c.env.DB);

    // Disable foreign key constraints temporarily to allow free text in appeals
    await c.env.DB.prepare('PRAGMA foreign_keys = OFF').run();

    const imported = [];
    const errors = [];

    for (const banner of banners) {
      try {
        if (!banner.image_id) {
          errors.push({ banner, error: '参照番号が必要です' });
          continue;
        }

        const knowledgeId = await db.createBannerKnowledge(c.env.DB, banner);
        imported.push({ ...banner, knowledge_id: knowledgeId });
      } catch (error: any) {
        errors.push({ banner, error: error.message });
      }
    }

    // Re-enable foreign key constraints
    await c.env.DB.prepare('PRAGMA foreign_keys = ON').run();

    return c.json({ 
      success: true, 
      imported_count: imported.length,
      error_count: errors.length,
      message: `${imported.length}件のバナーデータを同期しました`,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    console.error('Sheet sync error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Sync data from CSV file upload (for confidential data)
app.post('/api/banners/sync-from-csv', async (c) => {
  try {
    const { csv_text } = await c.req.json();
    
    if (!csv_text) {
      return c.json({ success: false, error: 'CSVデータが必要です' }, 400);
    }

    // Parse CSV text
    const sheetRows = sheets.fetchSheetDataFromCSV(csv_text);

    if (sheetRows.length === 0) {
      return c.json({ success: false, error: 'CSVにデータがありません' }, 400);
    }

    // Debug: Log CSV headers
    console.log('CSV Headers:', Object.keys(sheetRows[0]));
    console.log('First row sample:', sheetRows[0]);

    // Get area dictionary for mapping
    const areas = await db.getAreas(c.env.DB);
    const areaMap = new Map(areas.map(a => [a.name, a.code]));

    // Get employment type dictionary for mapping
    const employmentTypes = await db.getEmploymentTypes(c.env.DB);
    const employmentTypeMap = new Map(employmentTypes.map(et => [et.name, et.code]));

    // Get main appeals dictionary for mapping
    const mainAppeals = await db.getMainAppeals(c.env.DB);
    const mainAppealsMap = new Map(mainAppeals.map(ma => [ma.name, ma.code]));

    // Get visual types dictionary for mapping
    const visualTypes = await db.getVisualTypes(c.env.DB);
    const visualTypeMap = new Map(visualTypes.map(vt => [vt.name, vt.code]));

    // Convert sheet data to banner format
    const banners = sheets.convertSheetDataToBanners(sheetRows, areaMap, employmentTypeMap, mainAppealsMap, visualTypeMap);

    // Migrate images from external storage (Google Drive, Dropbox) to R2
    // Image migration disabled - keep external URLs as-is
    const migrationResults = {
      total: 0,
      migrated: 0,
      failed: 0,
      skipped: banners.filter(b => b.banner_image_url).length
    };

    // Upsert data (update existing or create new)
    // No need to clear all data - preserve existing banners and image URLs
    
    // Disable foreign key constraints temporarily to allow free text in appeals
    await c.env.DB.prepare('PRAGMA foreign_keys = OFF').run();

    const imported = [];
    const updated = [];
    const errors = [];

    for (const banner of banners) {
      try {
        if (!banner.image_id) {
          errors.push({ banner, error: '参照番号が必要です' });
          continue;
        }

        const result = await db.upsertBannerKnowledge(c.env.DB, banner);
        
        if (result.isNew) {
          imported.push({ ...banner, knowledge_id: result.knowledgeId });
        } else {
          updated.push({ ...banner, knowledge_id: result.knowledgeId });
        }
      } catch (error: any) {
        errors.push({ banner, error: error.message });
      }
    }

    // Re-enable foreign key constraints
    await c.env.DB.prepare('PRAGMA foreign_keys = ON').run();

    return c.json({ 
      success: true, 
      imported_count: imported.length,
      updated_count: updated.length,
      error_count: errors.length,
      image_migration: migrationResults,
      message: `新規登録: ${imported.length}件 / 更新: ${updated.length}件（画像移行: ${migrationResults.migrated}件成功 / ${migrationResults.failed}件失敗 / ${migrationResults.skipped}件スキップ）`,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    console.error('CSV import error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Search banner knowledge
app.post('/api/banners/search', async (c) => {
  try {
    const params = await c.req.json();
    const items = await db.searchBannerKnowledge(c.env.DB, params);
    return c.json({ success: true, items, total: items.length });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get banner knowledge by ID
app.get('/api/banners/:id', async (c) => {
  try {
    const knowledgeId = c.req.param('id');
    const item = await db.getBannerKnowledgeById(c.env.DB, knowledgeId);
    
    if (!item) {
      return c.json({ success: false, error: 'Not found' }, 404);
    }
    
    return c.json(item);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Update banner image URL
app.patch('/api/banners/:id/image', async (c) => {
  try {
    const knowledgeId = c.req.param('id');
    const { banner_image_url } = await c.req.json();
    
    if (!banner_image_url) {
      return c.json({ success: false, error: 'banner_image_url is required' }, 400);
    }

    // Update banner image URL in database
    await c.env.DB.prepare(
      'UPDATE banner_knowledge SET banner_image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE knowledge_id = ?'
    ).bind(banner_image_url, knowledgeId).run();

    return c.json({ success: true, message: 'Image URL updated successfully' });
  } catch (error: any) {
    console.error('Update image URL error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Delete banner by ID
app.delete('/api/banners/:id', async (c) => {
  try {
    const knowledgeId = c.req.param('id');
    const deleted = await db.deleteBannerKnowledge(c.env.DB, knowledgeId);
    
    if (!deleted) {
      return c.json({ success: false, error: 'Banner not found' }, 404);
    }

    return c.json({ success: true, message: 'Banner deleted successfully' });
  } catch (error: any) {
    console.error('Delete banner error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Upload banner image to R2
// Image upload disabled - using external URLs only
app.post('/api/upload', async (c) => {
  return c.json({ 
    success: false, 
    error: '画像アップロード機能は無効化されています。外部URL（Google Drive、Imgurなど）を使用してください。' 
  }, 400);
});

// Batch upload disabled - using external URLs only
app.post('/api/upload-batch', async (c) => {
  return c.json({ 
    success: false, 
    error: '画像アップロード機能は無効化されています。外部URL（Google Drive、Imgurなど）を使用してください。' 
  }, 400);
});

// Upload from URL disabled - using external URLs directly
app.post('/api/upload-from-url', async (c) => {
  return c.json({ 
    success: false, 
    error: '画像アップロード機能は無効化されています。外部URLを直接データベースに保存してください。' 
  }, 400);
});

// R2 image serving disabled - using external URLs directly
app.get('/api/images/*', async (c) => {
  return c.json({ 
    success: false, 
    error: 'R2画像配信は無効化されています。外部URLを使用してください。' 
  }, 404);
});

// Proxy external images (for Google Drive, etc.) to avoid CORS issues
app.get('/api/proxy-image', async (c) => {
  try {
    const imageUrl = c.req.query('url');
    
    if (!imageUrl) {
      return c.json({ success: false, error: 'URL parameter is required' }, 400);
    }

    // Fetch the image from external URL
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      return c.json({ success: false, error: 'Failed to fetch image' }, response.status);
    }

    // Return the image with proper headers to avoid CORS
    return new Response(response.body, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400', // Cache for 1 day
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    console.error('Image proxy error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// API Routes - AI Functions
// ============================================

// AI Function 1: Auto-tagging from banner image
app.post('/api/ai/auto-tag', async (c) => {
  try {
    const { image_url, extracted_text } = await c.req.json();
    
    if (!image_url) {
      return c.json({ success: false, error: 'Image URL is required' }, 400);
    }

    // Call AI service for auto-tagging
    const tags = await ai.generateBannerTags(image_url, extracted_text || '');
    
    return c.json({ success: true, tags });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// AI Function 2: Trend analysis from search results
app.post('/api/ai/analyze-trends', async (c) => {
  try {
    const { search_conditions, top_results } = await c.req.json();
    
    if (!top_results || top_results.length === 0) {
      return c.json({ success: false, error: 'No results to analyze' }, 400);
    }

    // Call AI service for trend analysis
    const analysis = await ai.analyzeBannerTrends(search_conditions, top_results);
    
    return c.json({ success: true, analysis });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// AI Function 3: Analyze single banner effectiveness
app.post('/api/ai/analyze-banner', async (c) => {
  try {
    const { knowledge_id } = await c.req.json();
    
    if (!knowledge_id) {
      return c.json({ success: false, error: 'knowledge_id is required' }, 400);
    }

    // Get banner data
    const banner = await db.getBannerKnowledgeById(c.env.DB, knowledge_id);
    
    if (!banner) {
      return c.json({ success: false, error: 'Banner not found' }, 404);
    }

    // Call AI service for single banner analysis
    const analysis = await ai.analyzeSingleBanner(banner);
    
    return c.json({ success: true, analysis });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Extract text from image (OCR)
app.post('/api/ai/extract-text', async (c) => {
  try {
    const { image_url } = await c.req.json();
    
    if (!image_url) {
      return c.json({ success: false, error: 'Image URL is required' }, 400);
    }

    // Call OCR service
    const text = await ai.extractTextFromImage(image_url);
    
    return c.json({ success: true, extracted_text: text });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// Frontend Routes
// ============================================

// Data registration form page
app.get('/register', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>データ登録 - Indeedバナーナレッジ分析システム</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <div id="app"></div>
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/register.js"></script>
    </body>
    </html>
  `);
});

// Search and analysis dashboard page
app.get('/dashboard', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>検索・分析ダッシュボード - Indeedバナーナレッジ分析システム</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <div id="app"></div>
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/dashboard.js"></script>
    </body>
    </html>
  `);
});

// Home page - Main Analytics Dashboard
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Indeedバナーナレッジ分析システム</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body>
        <div id="app"></div>
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/index.js"></script>
    </body>
    </html>
  `);
});

// Old registration page (deprecated) - redirect to home
app.get('/register', (c) => {
  return c.redirect('/', 301);
});

// Old dashboard page (deprecated) - redirect to home
app.get('/dashboard', (c) => {
  return c.redirect('/', 301);
});

export default app;
