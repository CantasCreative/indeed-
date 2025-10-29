import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-workers';
import type { Bindings } from './types';
import * as db from './db';

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

// Create new banner knowledge
app.post('/api/banners', async (c) => {
  try {
    const data = await c.req.json();
    const knowledgeId = await db.createBannerKnowledge(c.env.DB, data);
    return c.json({ success: true, knowledge_id: knowledgeId });
  } catch (error: any) {
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

// Home page - navigation
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
    <body class="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
        <div class="container mx-auto px-4 py-16">
            <div class="text-center mb-12">
                <h1 class="text-4xl font-bold text-gray-800 mb-4">
                    <i class="fas fa-chart-line text-blue-600 mr-3"></i>
                    Indeedバナーナレッジ分析システム
                </h1>
                <p class="text-gray-600 text-lg">
                    Indeed広告のバナー実績をAI分析で営業の差別化を実現
                </p>
            </div>

            <div class="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                <!-- データ登録カード -->
                <a href="/register" class="block">
                    <div class="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow duration-300 border-t-4 border-blue-600">
                        <div class="text-center">
                            <div class="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <i class="fas fa-plus-circle text-4xl text-blue-600"></i>
                            </div>
                            <h2 class="text-2xl font-bold text-gray-800 mb-3">データ登録</h2>
                            <p class="text-gray-600 mb-4">
                                ATOMデータのインポート<br>
                                バナー画像のアップロード<br>
                                AIによるタグ提案
                            </p>
                            <span class="inline-block bg-blue-600 text-white px-6 py-2 rounded-full font-semibold hover:bg-blue-700 transition-colors">
                                登録画面へ <i class="fas fa-arrow-right ml-2"></i>
                            </span>
                        </div>
                    </div>
                </a>

                <!-- 検索・分析カード -->
                <a href="/dashboard" class="block">
                    <div class="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow duration-300 border-t-4 border-green-600">
                        <div class="text-center">
                            <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <i class="fas fa-search text-4xl text-green-600"></i>
                            </div>
                            <h2 class="text-2xl font-bold text-gray-800 mb-3">検索・分析</h2>
                            <p class="text-gray-600 mb-4">
                                条件別バナー検索<br>
                                CTRトップ5表示<br>
                                AIによる成功分析
                            </p>
                            <span class="inline-block bg-green-600 text-white px-6 py-2 rounded-full font-semibold hover:bg-green-700 transition-colors">
                                ダッシュボードへ <i class="fas fa-arrow-right ml-2"></i>
                            </span>
                        </div>
                    </div>
                </a>
            </div>

            <div class="mt-16 text-center text-gray-500 text-sm">
                <p><i class="fas fa-database mr-2"></i>Cloudflare D1 + R2 | <i class="fas fa-robot mr-2"></i>AI統合準備完了</p>
            </div>
        </div>
    </body>
    </html>
  `);
});

export default app;
