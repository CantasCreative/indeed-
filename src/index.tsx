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
    
    return c.json({ success: true, item });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Upload banner image to R2
app.post('/api/upload', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return c.json({ success: false, error: 'No file provided' }, 400);
    }

    // Generate unique key for R2
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const ext = file.name.split('.').pop();
    const key = `banners/${timestamp}-${randomStr}.${ext}`;

    // Upload to R2
    const arrayBuffer = await file.arrayBuffer();
    await c.env.BANNER_BUCKET.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // Generate public URL (adjust based on your R2 public URL configuration)
    const url = `/api/images/${key}`;

    return c.json({ success: true, key, url });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get image from R2
app.get('/api/images/*', async (c) => {
  try {
    const key = c.req.path.replace('/api/images/', '');
    const object = await c.env.BANNER_BUCKET.get(key);

    if (!object) {
      return c.notFound();
    }

    return new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error: any) {
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
