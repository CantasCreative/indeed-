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

    // Convert sheet data to banner format
    const banners = sheets.convertSheetDataToBanners(sheetRows, areaMap, employmentTypeMap, mainAppealsMap);

    // Migrate images from external storage (Google Drive, Dropbox) to R2
    const migrationResults = {
      total: 0,
      migrated: 0,
      failed: 0,
      skipped: 0
    };

    for (const banner of banners) {
      if (banner.banner_image_url && sheets.isExternalStorageUrl(banner.banner_image_url)) {
        migrationResults.total++;
        try {
          // Download image from external URL and upload to R2
          const response = await fetch(banner.banner_image_url);
          
          if (!response.ok) {
            console.warn(`Failed to fetch image for ${banner.image_id}: ${response.status}`);
            migrationResults.failed++;
            continue;
          }

          const contentType = response.headers.get('Content-Type');
          if (!contentType || !contentType.startsWith('image/')) {
            console.warn(`Invalid content type for ${banner.image_id}: ${contentType}`);
            migrationResults.failed++;
            continue;
          }

          // Generate unique key for R2
          const timestamp = Date.now();
          const randomStr = Math.random().toString(36).substring(2, 15);
          const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
          const key = `banners/${timestamp}-${randomStr}.${ext}`;

          // Upload to R2
          const arrayBuffer = await response.arrayBuffer();
          await c.env.BANNER_BUCKET.put(key, arrayBuffer, {
            httpMetadata: {
              contentType: contentType,
            },
          });

          // Update banner with new R2 URL
          banner.banner_image_url = `/api/images/${key}`;
          migrationResults.migrated++;
          
          console.log(`Migrated image for ${banner.image_id}: ${key}`);
        } catch (error: any) {
          console.error(`Failed to migrate image for ${banner.image_id}:`, error);
          migrationResults.failed++;
          // Keep original URL if migration fails
        }
      } else if (banner.banner_image_url) {
        migrationResults.skipped++;
      }
    }

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

// Upload banner image to R2
app.post('/api/upload', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return c.json({ success: false, error: 'No file provided' }, 400);
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ success: false, error: 'Invalid file type. Only images are allowed.' }, 400);
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return c.json({ success: false, error: 'File size exceeds 5MB limit' }, 400);
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

    // Generate public URL
    const url = `/api/images/${key}`;

    return c.json({ success: true, key, url, originalName: file.name });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Batch upload multiple images
app.post('/api/upload-batch', async (c) => {
  try {
    const formData = await c.req.formData();
    const files: File[] = [];
    
    // Collect all files from formData
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return c.json({ success: false, error: 'No files provided' }, 400);
    }

    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
          errors.push({ filename: file.name, error: 'Invalid file type' });
          continue;
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
          errors.push({ filename: file.name, error: 'File size exceeds 5MB' });
          continue;
        }

        // Generate unique key
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

        results.push({
          originalName: file.name,
          key,
          url: `/api/images/${key}`,
          size: file.size,
        });
      } catch (error: any) {
        errors.push({ filename: file.name, error: error.message });
      }
    }

    return c.json({ 
      success: true, 
      uploaded: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Download image from URL and upload to R2 (for migrating Google Drive images)
app.post('/api/upload-from-url', async (c) => {
  try {
    const { url, filename } = await c.req.json();
    
    if (!url) {
      return c.json({ success: false, error: 'URL is required' }, 400);
    }

    // Fetch image from URL
    const response = await fetch(url);
    if (!response.ok) {
      return c.json({ success: false, error: `Failed to fetch image: ${response.status}` }, 400);
    }

    const contentType = response.headers.get('Content-Type');
    if (!contentType || !contentType.startsWith('image/')) {
      return c.json({ success: false, error: 'URL does not point to an image' }, 400);
    }

    // Generate unique key
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const ext = contentType.split('/')[1] || 'jpg';
    const key = `banners/${timestamp}-${randomStr}.${ext}`;

    // Upload to R2
    const arrayBuffer = await response.arrayBuffer();
    await c.env.BANNER_BUCKET.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: contentType,
      },
    });

    return c.json({ 
      success: true, 
      key, 
      url: `/api/images/${key}`,
      originalUrl: url,
      filename: filename || 'downloaded-image'
    });
  } catch (error: any) {
    console.error('Upload from URL error:', error);
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
