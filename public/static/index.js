// Indeedバナーナレッジ分析システム - メインダッシュボード
class BannerAnalyticsSystem {
  constructor() {
    this.banners = [];
    this.filteredBanners = [];
    this.dictionaries = {};
    this.sheetConfig = this.loadSheetConfig();
    this.init();
  }

  async init() {
    await this.loadDictionaries();
    this.render();
    this.attachEventListeners();
    
    // スプレッドシート設定があれば自動同期
    if (this.sheetConfig.spreadsheet_id) {
      await this.syncFromSheet();
    } else {
      this.showSetupGuide();
    }
  }

  loadSheetConfig() {
    const saved = localStorage.getItem('sheet_config');
    return saved ? JSON.parse(saved) : {};
  }

  saveSheetConfig(config) {
    localStorage.setItem('sheet_config', JSON.stringify(config));
    this.sheetConfig = config;
  }

  async loadDictionaries() {
    try {
      const [employmentTypes, areas, mainAppeals, visualTypes, mainColors, atmospheres] = await Promise.all([
        axios.get('/api/dictionaries/employment-types'),
        axios.get('/api/dictionaries/areas'),
        axios.get('/api/dictionaries/main-appeals'),
        axios.get('/api/dictionaries/visual-types'),
        axios.get('/api/dictionaries/main-colors'),
        axios.get('/api/dictionaries/atmospheres'),
      ]);

      this.dictionaries = {
        employmentTypes: employmentTypes.data,
        areas: areas.data,
        mainAppeals: mainAppeals.data,
        visualTypes: visualTypes.data,
        mainColors: mainColors.data,
        atmospheres: atmospheres.data,
      };
    } catch (error) {
      console.error('Failed to load dictionaries:', error);
    }
  }

  render() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <!-- Header -->
        <header class="bg-white shadow-sm border-b border-gray-200">
          <div class="container mx-auto px-4 py-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <i class="fas fa-chart-line text-3xl text-blue-600"></i>
                <div>
                  <h1 class="text-2xl font-bold text-gray-900">Indeedバナーナレッジ分析システム</h1>
                  <p class="text-sm text-gray-500">効果の出るバナーを分析・可視化</p>
                </div>
              </div>
              <button id="syncButton" class="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                <i class="fas fa-sync"></i>
                <span>スプレッドシート同期</span>
              </button>
            </div>
          </div>
        </header>

        <!-- Main Content -->
        <div class="container mx-auto px-4 py-8">
          <!-- Setup Guide (shown when no config) -->
          <div id="setupGuide" class="hidden mb-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-xl p-8 text-white">
            <h2 class="text-2xl font-bold mb-4 flex items-center">
              <i class="fas fa-rocket mr-3"></i>
              はじめましょう
            </h2>
            <p class="text-lg mb-6 opacity-90">Googleスプレッドシートを連携して、バナーデータを自動的に分析します。</p>
            <button id="setupButton" class="bg-white text-blue-600 font-bold px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors shadow-lg">
              <i class="fas fa-cog mr-2"></i>
              スプレッドシート設定
            </button>
          </div>

          <!-- Stats Overview -->
          <div id="statsSection" class="hidden mb-8 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div class="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-500 mb-1">総バナー数</p>
                  <p id="totalBanners" class="text-3xl font-bold text-gray-900">0</p>
                </div>
                <i class="fas fa-images text-4xl text-blue-500 opacity-20"></i>
              </div>
            </div>
            <div class="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-500 mb-1">平均CTR</p>
                  <p id="avgCTR" class="text-3xl font-bold text-gray-900">0%</p>
                </div>
                <i class="fas fa-percent text-4xl text-green-500 opacity-20"></i>
              </div>
            </div>
            <div class="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-500 mb-1">総表示回数</p>
                  <p id="totalImpressions" class="text-3xl font-bold text-gray-900">0</p>
                </div>
                <i class="fas fa-eye text-4xl text-purple-500 opacity-20"></i>
              </div>
            </div>
            <div class="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-500 mb-1">総クリック数</p>
                  <p id="totalClicks" class="text-3xl font-bold text-gray-900">0</p>
                </div>
                <i class="fas fa-mouse-pointer text-4xl text-orange-500 opacity-20"></i>
              </div>
            </div>
          </div>

          <!-- Filters -->
          <div id="filtersSection" class="hidden mb-8 bg-white rounded-xl shadow-md p-6">
            <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <i class="fas fa-filter mr-2 text-blue-600"></i>
              フィルター
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">企業名</label>
                <input type="text" id="filterCompany" placeholder="企業名で検索" 
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">求人</label>
                <input type="text" id="filterJob" placeholder="職種名で検索" 
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">CTR順</label>
                <select id="filterSort" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                  <option value="ctr_desc">CTR 高い順</option>
                  <option value="ctr_asc">CTR 低い順</option>
                  <option value="impressions_desc">表示回数 多い順</option>
                  <option value="clicks_desc">クリック数 多い順</option>
                </select>
              </div>
              <div class="flex items-end">
                <button id="applyFilters" class="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                  <i class="fas fa-search mr-2"></i>適用
                </button>
              </div>
            </div>
          </div>

          <!-- Banner Gallery -->
          <div id="gallerySection" class="hidden mb-8">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-xl font-bold text-gray-800 flex items-center">
                <i class="fas fa-th text-blue-600 mr-2"></i>
                バナーギャラリー
                <span id="resultCount" class="ml-3 text-sm font-normal text-gray-500"></span>
              </h3>
              <button id="analyzeButton" class="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors shadow-md">
                <i class="fas fa-brain mr-2"></i>
                AI効果分析
              </button>
            </div>
            <div id="bannerGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <!-- Banner cards will be inserted here -->
            </div>
          </div>

          <!-- AI Analysis Results -->
          <div id="analysisSection" class="hidden mb-8 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-xl p-8">
            <h3 class="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <i class="fas fa-robot text-purple-600 mr-3"></i>
              AI効果分析レポート
            </h3>
            <div id="analysisContent" class="prose max-w-none">
              <!-- Analysis content will be inserted here -->
            </div>
          </div>
        </div>

        <!-- Sheet Config Modal -->
        <div id="configModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 p-8">
            <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <i class="fas fa-cog text-blue-600 mr-3"></i>
              Googleスプレッドシート設定
            </h2>
            <div class="space-y-4 mb-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  スプレッドシートID <span class="text-red-500">*</span>
                </label>
                <input type="text" id="configSpreadsheetId" 
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="1ABC...xyz">
                <p class="text-xs text-gray-500 mt-1">URLの「/d/」と「/edit」の間の文字列</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  シートID（gid）- オプション
                </label>
                <input type="text" id="configGid" 
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0" value="0">
                <p class="text-xs text-gray-500 mt-1">URLの「#gid=」の後の数字（通常は0）</p>
              </div>
              <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div class="flex items-start">
                  <i class="fas fa-exclamation-triangle text-yellow-600 mr-2 mt-1"></i>
                  <div class="text-sm text-gray-700">
                    <p class="font-semibold mb-1">重要：スプレッドシートを「ウェブに公開」してください</p>
                    <ol class="list-decimal ml-4 space-y-1">
                      <li>スプレッドシートで「ファイル」→「共有」→「ウェブに公開」をクリック</li>
                      <li>「リンク」タブで「公開」をクリック</li>
                      <li>この設定をしないとデータ同期できません</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
            <div class="flex justify-end space-x-3">
              <button id="cancelConfigButton" class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                キャンセル
              </button>
              <button id="saveConfigButton" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <i class="fas fa-save mr-2"></i>
                保存して同期
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  showSetupGuide() {
    document.getElementById('setupGuide').classList.remove('hidden');
  }

  hideSetupGuide() {
    document.getElementById('setupGuide').classList.add('hidden');
    document.getElementById('statsSection').classList.remove('hidden');
    document.getElementById('filtersSection').classList.remove('hidden');
    document.getElementById('gallerySection').classList.remove('hidden');
  }

  attachEventListeners() {
    document.getElementById('syncButton').addEventListener('click', () => this.showConfigModal());
    document.getElementById('setupButton')?.addEventListener('click', () => this.showConfigModal());
    document.getElementById('saveConfigButton').addEventListener('click', () => this.saveAndSync());
    document.getElementById('cancelConfigButton').addEventListener('click', () => this.hideConfigModal());
    document.getElementById('applyFilters')?.addEventListener('click', () => this.applyFilters());
    document.getElementById('analyzeButton')?.addEventListener('click', () => this.runAIAnalysis());
  }

  showConfigModal() {
    const modal = document.getElementById('configModal');
    modal.classList.remove('hidden');
    
    // Load saved config
    if (this.sheetConfig.spreadsheet_id) {
      document.getElementById('configSpreadsheetId').value = this.sheetConfig.spreadsheet_id;
    }
    if (this.sheetConfig.gid) {
      document.getElementById('configGid').value = this.sheetConfig.gid;
    }
  }

  hideConfigModal() {
    document.getElementById('configModal').classList.add('hidden');
  }

  async saveAndSync() {
    const spreadsheet_id = document.getElementById('configSpreadsheetId').value.trim();
    const gid = document.getElementById('configGid').value.trim() || '0';

    if (!spreadsheet_id) {
      alert('スプレッドシートIDを入力してください');
      return;
    }

    this.saveSheetConfig({ spreadsheet_id, gid });
    this.hideConfigModal();
    await this.syncFromSheet();
  }

  async syncFromSheet() {
    if (!this.sheetConfig.spreadsheet_id) {
      alert('スプレッドシート設定が不完全です');
      return;
    }

    const syncButton = document.getElementById('syncButton');
    syncButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>同期中...';
    syncButton.disabled = true;

    try {
      const response = await axios.post('/api/banners/sync-from-sheet', this.sheetConfig);
      
      if (response.data.success) {
        alert(`✅ ${response.data.imported_count}件のバナーデータを同期しました`);
        await this.loadBanners();
        this.hideSetupGuide();
      } else {
        alert(`❌ 同期エラー: ${response.data.error}`);
      }
    } catch (error) {
      console.error('Sync failed:', error);
      alert('同期に失敗しました。設定を確認してください。');
    } finally {
      syncButton.innerHTML = '<i class="fas fa-sync mr-2"></i>スプレッドシート同期';
      syncButton.disabled = false;
    }
  }

  async loadBanners() {
    try {
      const response = await axios.post('/api/banners/search', { limit: 1000 });
      this.banners = response.data.items || [];
      this.filteredBanners = this.banners;
      this.updateStats();
      this.renderBannerGallery();
    } catch (error) {
      console.error('Failed to load banners:', error);
    }
  }

  updateStats() {
    const totalBanners = this.banners.length;
    const avgCTR = totalBanners > 0 
      ? (this.banners.reduce((sum, b) => sum + (b.ctr || 0), 0) / totalBanners).toFixed(2)
      : 0;
    const totalImpressions = this.banners.reduce((sum, b) => sum + (b.impressions || 0), 0);
    const totalClicks = this.banners.reduce((sum, b) => sum + (b.clicks || 0), 0);

    document.getElementById('totalBanners').textContent = totalBanners.toLocaleString();
    document.getElementById('avgCTR').textContent = avgCTR + '%';
    document.getElementById('totalImpressions').textContent = totalImpressions.toLocaleString();
    document.getElementById('totalClicks').textContent = totalClicks.toLocaleString();
  }

  applyFilters() {
    const companyFilter = document.getElementById('filterCompany').value.toLowerCase();
    const jobFilter = document.getElementById('filterJob').value.toLowerCase();
    const sortOrder = document.getElementById('filterSort').value;

    this.filteredBanners = this.banners.filter(banner => {
      const matchCompany = !companyFilter || (banner.company_name || '').toLowerCase().includes(companyFilter);
      const matchJob = !jobFilter || (banner.job_title || '').toLowerCase().includes(jobFilter);
      return matchCompany && matchJob;
    });

    // Sort
    this.filteredBanners.sort((a, b) => {
      switch(sortOrder) {
        case 'ctr_desc': return (b.ctr || 0) - (a.ctr || 0);
        case 'ctr_asc': return (a.ctr || 0) - (b.ctr || 0);
        case 'impressions_desc': return (b.impressions || 0) - (a.impressions || 0);
        case 'clicks_desc': return (b.clicks || 0) - (a.clicks || 0);
        default: return 0;
      }
    });

    this.renderBannerGallery();
  }

  renderBannerGallery() {
    const grid = document.getElementById('bannerGrid');
    const resultCount = document.getElementById('resultCount');
    
    resultCount.textContent = `(${this.filteredBanners.length}件)`;

    if (this.filteredBanners.length === 0) {
      grid.innerHTML = '<p class="col-span-full text-center text-gray-500 py-12">バナーデータがありません</p>';
      return;
    }

    grid.innerHTML = this.filteredBanners.map(banner => `
      <div class="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300">
        <div class="relative aspect-video bg-gray-100">
          ${banner.banner_image_url 
            ? `<img src="${banner.banner_image_url}" alt="${banner.job_title || 'バナー'}" class="w-full h-full object-cover" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 300%22%3E%3Crect fill=%22%23ddd%22 width=%22400%22 height=%22300%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 fill=%22%23999%22 font-size=%2218%22 dy=%22.3em%22%3E画像なし%3C/text%3E%3C/svg%3E'">` 
            : '<div class="w-full h-full flex items-center justify-center text-gray-400"><i class="fas fa-image text-4xl"></i></div>'}
          <div class="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
            CTR ${(banner.ctr || 0).toFixed(2)}%
          </div>
        </div>
        <div class="p-4">
          <h4 class="font-bold text-gray-900 mb-1 truncate">${banner.company_name || '企業名なし'}</h4>
          <p class="text-sm text-gray-600 mb-3 truncate">${banner.job_title || '職種名なし'}</p>
          <div class="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span><i class="fas fa-eye mr-1"></i>${(banner.impressions || 0).toLocaleString()}</span>
            <span><i class="fas fa-mouse-pointer mr-1"></i>${(banner.clicks || 0).toLocaleString()}</span>
          </div>
          ${banner.main_appeals && banner.main_appeals.length > 0 ? `
            <div class="flex flex-wrap gap-1 mt-2">
              ${banner.main_appeals.slice(0, 2).map(appeal => {
                const appealObj = this.dictionaries.mainAppeals.find(a => a.code === appeal);
                return appealObj ? `<span class="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">${appealObj.name}</span>` : '';
              }).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `).join('');
  }

  async runAIAnalysis() {
    const analysisButton = document.getElementById('analyzeButton');
    const analysisSection = document.getElementById('analysisSection');
    const analysisContent = document.getElementById('analysisContent');

    analysisButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>分析中...';
    analysisButton.disabled = true;

    try {
      // Get top 10 banners by CTR
      const topBanners = [...this.filteredBanners]
        .sort((a, b) => (b.ctr || 0) - (a.ctr || 0))
        .slice(0, 10);

      const response = await axios.post('/api/ai/analyze-trends', {
        search_conditions: {
          company_name: document.getElementById('filterCompany').value,
          job_title: document.getElementById('filterJob').value,
        },
        top_results: topBanners
      });

      if (response.data.success) {
        analysisSection.classList.remove('hidden');
        analysisContent.innerHTML = this.formatAnalysisResult(response.data.analysis);
        analysisSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        alert('AI分析に失敗しました');
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('AI分析エラーが発生しました');
    } finally {
      analysisButton.innerHTML = '<i class="fas fa-brain mr-2"></i>AI効果分析';
      analysisButton.disabled = false;
    }
  }

  formatAnalysisResult(text) {
    // Convert markdown-like formatting to HTML
    return text
      .replace(/## (.+)/g, '<h3 class="text-xl font-bold text-gray-800 mt-6 mb-3">$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-purple-700">$1</strong>')
      .replace(/\d+\.\s+\*\*(.+?):\*\*/g, '<div class="mt-4"><strong class="text-lg text-gray-800">$1:</strong>')
      .replace(/\n\n/g, '</div><div class="mt-2">')
      .replace(/\n/g, '<br>');
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new BannerAnalyticsSystem();
});
