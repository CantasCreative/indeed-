// Indeedバナーナレッジ分析システム - メインダッシュボード
class BannerAnalyticsSystem {
  constructor() {
    this.banners = [];
    this.filteredBanners = [];
    this.dictionaries = {};
    this.sheetConfig = this.loadSheetConfig();
    this.selectedCSVFile = null;
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
              <i class="fas fa-upload text-blue-600 mr-3"></i>
              データインポート
            </h2>
            
            <!-- Tab Navigation -->
            <div class="flex border-b border-gray-200 mb-6">
              <button id="tabCSVUpload" class="tab-button active px-6 py-3 text-sm font-medium border-b-2 border-blue-600 text-blue-600">
                <i class="fas fa-file-csv mr-2"></i>CSVアップロード（推奨）
              </button>
              <button id="tabWebPublish" class="tab-button px-6 py-3 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700">
                <i class="fas fa-globe mr-2"></i>ウェブ公開連携
              </button>
            </div>

            <!-- CSV Upload Tab -->
            <div id="csvUploadTab" class="space-y-4 mb-6">
              <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div class="flex items-start">
                  <i class="fas fa-info-circle text-blue-600 mr-2 mt-1"></i>
                  <div class="text-sm text-gray-700">
                    <p class="font-semibold mb-1">機密情報も安全に扱えます</p>
                    <p>スプレッドシートをCSV形式でエクスポートしてアップロードしてください。</p>
                  </div>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  CSVファイルを選択 <span class="text-red-500">*</span>
                </label>
                <div id="csvDropZone" class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors">
                  <input type="file" id="csvFileInput" accept=".csv" class="hidden">
                  <i class="fas fa-cloud-upload-alt text-5xl text-gray-400 mb-3"></i>
                  <p class="text-gray-600 mb-2">CSVファイルをドラッグ＆ドロップ</p>
                  <p class="text-sm text-gray-400">または クリックしてファイルを選択</p>
                  <p id="csvFileName" class="text-sm text-green-600 mt-2 hidden"></p>
                </div>
              </div>
              <div class="text-xs text-gray-500">
                <p class="font-semibold mb-1">エクスポート手順：</p>
                <ol class="list-decimal ml-4 space-y-1">
                  <li>スプレッドシートで「ファイル」→「ダウンロード」→「カンマ区切り形式(.csv)」</li>
                  <li>ダウンロードしたCSVファイルをここにアップロード</li>
                </ol>
              </div>
            </div>

            <!-- Web Publish Tab -->
            <div id="webPublishTab" class="space-y-4 mb-6 hidden">
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
                    <p class="font-semibold mb-1">注意：スプレッドシートを「ウェブに公開」する必要があります</p>
                    <ol class="list-decimal ml-4 space-y-1">
                      <li>スプレッドシートで「ファイル」→「共有」→「ウェブに公開」をクリック</li>
                      <li>「リンク」タブで「公開」をクリック</li>
                      <li>機密情報がある場合はCSVアップロードをご利用ください</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex justify-end space-x-3">
              <button id="cancelConfigButton" class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                キャンセル
              </button>
              <button id="uploadCSVButton" class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                <i class="fas fa-upload mr-2"></i>
                CSVをインポート
              </button>
              <button id="saveConfigButton" class="hidden px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
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
    document.getElementById('uploadCSVButton').addEventListener('click', () => this.uploadCSV());
    document.getElementById('applyFilters')?.addEventListener('click', () => this.applyFilters());
    document.getElementById('analyzeButton')?.addEventListener('click', () => this.runAIAnalysis());
    
    // Tab switching
    document.getElementById('tabCSVUpload')?.addEventListener('click', () => this.switchTab('csv'));
    document.getElementById('tabWebPublish')?.addEventListener('click', () => this.switchTab('web'));
    
    // CSV file drop zone
    const csvDropZone = document.getElementById('csvDropZone');
    const csvFileInput = document.getElementById('csvFileInput');
    
    csvDropZone?.addEventListener('click', () => csvFileInput.click());
    csvDropZone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      csvDropZone.classList.add('border-blue-500', 'bg-blue-50');
    });
    csvDropZone?.addEventListener('dragleave', () => {
      csvDropZone.classList.remove('border-blue-500', 'bg-blue-50');
    });
    csvDropZone?.addEventListener('drop', (e) => {
      e.preventDefault();
      csvDropZone.classList.remove('border-blue-500', 'bg-blue-50');
      if (e.dataTransfer.files.length > 0) {
        this.handleCSVFile(e.dataTransfer.files[0]);
      }
    });
    
    csvFileInput?.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.handleCSVFile(e.target.files[0]);
      }
    });
  }

  switchTab(tab) {
    const csvTab = document.getElementById('csvUploadTab');
    const webTab = document.getElementById('webPublishTab');
    const csvButton = document.getElementById('tabCSVUpload');
    const webButton = document.getElementById('tabWebPublish');
    const uploadButton = document.getElementById('uploadCSVButton');
    const saveButton = document.getElementById('saveConfigButton');
    
    if (tab === 'csv') {
      csvTab.classList.remove('hidden');
      webTab.classList.add('hidden');
      csvButton.classList.add('active', 'border-blue-600', 'text-blue-600');
      csvButton.classList.remove('border-transparent', 'text-gray-500');
      webButton.classList.remove('active', 'border-blue-600', 'text-blue-600');
      webButton.classList.add('border-transparent', 'text-gray-500');
      uploadButton.classList.remove('hidden');
      saveButton.classList.add('hidden');
    } else {
      csvTab.classList.add('hidden');
      webTab.classList.remove('hidden');
      webButton.classList.add('active', 'border-blue-600', 'text-blue-600');
      webButton.classList.remove('border-transparent', 'text-gray-500');
      csvButton.classList.remove('active', 'border-blue-600', 'text-blue-600');
      csvButton.classList.add('border-transparent', 'text-gray-500');
      uploadButton.classList.add('hidden');
      saveButton.classList.remove('hidden');
    }
  }

  handleCSVFile(file) {
    if (!file.name.endsWith('.csv')) {
      alert('CSVファイルを選択してください');
      return;
    }
    
    this.selectedCSVFile = file;
    document.getElementById('csvFileName').textContent = `✓ ${file.name}`;
    document.getElementById('csvFileName').classList.remove('hidden');
  }

  async uploadCSV() {
    if (!this.selectedCSVFile) {
      alert('CSVファイルを選択してください');
      return;
    }

    const uploadButton = document.getElementById('uploadCSVButton');
    uploadButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>インポート中...';
    uploadButton.disabled = true;

    try {
      const csvText = await this.selectedCSVFile.text();
      const response = await axios.post('/api/banners/sync-from-csv', { csv_text: csvText });
      
      if (response.data.success) {
        alert(`✅ ${response.data.imported_count}件のバナーデータをインポートしました`);
        this.hideConfigModal();
        await this.loadBanners();
        this.hideSetupGuide();
      } else {
        alert(`❌ インポートエラー: ${response.data.error}`);
      }
    } catch (error) {
      console.error('CSV upload failed:', error);
      alert('CSVのインポートに失敗しました');
    } finally {
      uploadButton.innerHTML = '<i class="fas fa-upload mr-2"></i>CSVをインポート';
      uploadButton.disabled = false;
    }
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
          ${banner.image_url 
            ? `<img src="${banner.image_url}" alt="参照番号: ${banner.image_id}" class="w-full h-full object-cover" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 300%22%3E%3Crect fill=%22%23ddd%22 width=%22400%22 height=%22300%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 fill=%22%23999%22 font-size=%2218%22 dy=%22.3em%22%3E画像読込エラー%3C/text%3E%3C/svg%3E'">` 
            : '<div class="w-full h-full flex items-center justify-center text-gray-400"><i class="fas fa-image text-4xl"></i><p class="mt-2">画像URLなし</p></div>'}
          ${banner.image_id ? `
            <div class="absolute top-2 left-2 bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
              #${banner.image_id}
            </div>
          ` : ''}
        </div>
        <div class="p-4">
          <h4 class="font-bold text-gray-900 mb-1">${banner.image_id ? `参照番号: ${banner.image_id}` : '参照番号なし'}</h4>
          <p class="text-sm text-gray-600 mb-2">${banner.notes || '備考なし'}</p>
          
          ${banner.main_appeals && banner.main_appeals.length > 0 ? `
            <div class="mb-2">
              <p class="text-xs text-gray-500 mb-1">メインアピール:</p>
              <div class="flex flex-wrap gap-1">
                ${banner.main_appeals.slice(0, 3).map(appeal => {
                  const appealObj = this.dictionaries.mainAppeals.find(a => a.code === appeal);
                  return appealObj ? `<span class="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">${appealObj.name}</span>` : '';
                }).join('')}
              </div>
            </div>
          ` : ''}
          
          ${banner.sub_appeals && banner.sub_appeals.length > 0 ? `
            <div class="mb-2">
              <p class="text-xs text-gray-500 mb-1">サブアピール:</p>
              <div class="flex flex-wrap gap-1">
                ${banner.sub_appeals.slice(0, 2).map(appeal => `
                  <span class="bg-green-100 text-green-700 text-xs px-2 py-1 rounded">${appeal}</span>
                `).join('')}
              </div>
            </div>
          ` : ''}
          
          ${banner.areas && banner.areas.length > 0 ? `
            <div class="mb-3">
              <p class="text-xs text-gray-500 mb-1">エリア:</p>
              <div class="flex flex-wrap gap-1">
                ${banner.areas.slice(0, 3).map(area => {
                  const areaObj = this.dictionaries.areas.find(a => a.code === area);
                  return areaObj ? `<span class="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded">${areaObj.name}</span>` : '';
                }).join('')}
                ${banner.areas.length > 3 ? `<span class="text-xs text-gray-500">+${banner.areas.length - 3}</span>` : ''}
              </div>
            </div>
          ` : ''}
          
          <button onclick="bannerSystem.showBannerDetail(${banner.knowledge_id})" 
            class="w-full mt-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-md hover:shadow-lg">
            <i class="fas fa-chart-line mr-2"></i>効果詳細を見る
          </button>
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

  async showBannerDetail(knowledgeId) {
    try {
      // Get banner details
      const response = await axios.get(`/api/banners/${knowledgeId}`);
      
      if (!response.data) {
        alert('バナー情報の取得に失敗しました');
        return;
      }

      const banner = response.data;
      
      // Create modal
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
      modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div class="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl">
            <div class="flex items-center justify-between">
              <h2 class="text-2xl font-bold flex items-center">
                <i class="fas fa-chart-line mr-3"></i>
                効果詳細分析
              </h2>
              <button onclick="this.closest('.fixed').remove()" class="text-white hover:text-gray-200 text-2xl">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
          
          <div class="p-6">
            <!-- Banner Image -->
            <div class="mb-6">
              <h3 class="text-lg font-bold text-gray-800 mb-3 flex items-center">
                <i class="fas fa-image mr-2 text-blue-600"></i>
                バナー画像
              </h3>
              <div class="relative rounded-xl overflow-hidden shadow-lg bg-gray-100">
                ${banner.image_url 
                  ? `<img src="${banner.image_url}" alt="参照番号: ${banner.image_id}" class="w-full object-contain max-h-96">` 
                  : '<div class="w-full h-64 flex items-center justify-center text-gray-400"><i class="fas fa-image text-6xl"></i></div>'}
              </div>
              ${banner.image_id ? `
                <p class="mt-2 text-sm text-gray-600">
                  <strong>参照番号:</strong> ${banner.image_id}
                </p>
              ` : ''}
            </div>

            <!-- Basic Info -->
            <div class="mb-6">
              <h3 class="text-lg font-bold text-gray-800 mb-3 flex items-center">
                <i class="fas fa-info-circle mr-2 text-blue-600"></i>
                基本情報
              </h3>
              <div class="bg-gray-50 rounded-lg p-4 space-y-2">
                ${banner.notes ? `<p class="text-sm"><strong>備考:</strong> ${banner.notes}</p>` : ''}
              </div>
            </div>

            <!-- Main Appeals -->
            ${banner.main_appeals && banner.main_appeals.length > 0 ? `
              <div class="mb-6">
                <h3 class="text-lg font-bold text-gray-800 mb-3 flex items-center">
                  <i class="fas fa-bullhorn mr-2 text-blue-600"></i>
                  メインアピール
                </h3>
                <div class="flex flex-wrap gap-2">
                  ${banner.main_appeals.map(appeal => {
                    const appealObj = this.dictionaries.mainAppeals.find(a => a.code === appeal);
                    return appealObj ? `<span class="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-medium">${appealObj.name}</span>` : '';
                  }).join('')}
                </div>
              </div>
            ` : ''}

            <!-- Sub Appeals -->
            ${banner.sub_appeals && banner.sub_appeals.length > 0 ? `
              <div class="mb-6">
                <h3 class="text-lg font-bold text-gray-800 mb-3 flex items-center">
                  <i class="fas fa-list-ul mr-2 text-green-600"></i>
                  サブアピール
                </h3>
                <div class="flex flex-wrap gap-2">
                  ${banner.sub_appeals.map(appeal => `
                    <span class="bg-green-100 text-green-700 px-4 py-2 rounded-lg">${appeal}</span>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <!-- Areas -->
            ${banner.areas && banner.areas.length > 0 ? `
              <div class="mb-6">
                <h3 class="text-lg font-bold text-gray-800 mb-3 flex items-center">
                  <i class="fas fa-map-marker-alt mr-2 text-orange-600"></i>
                  対象エリア
                </h3>
                <div class="flex flex-wrap gap-2">
                  ${banner.areas.map(area => {
                    const areaObj = this.dictionaries.areas.find(a => a.code === area);
                    return areaObj ? `<span class="bg-orange-100 text-orange-700 px-4 py-2 rounded-lg">${areaObj.name}</span>` : '';
                  }).join('')}
                </div>
              </div>
            ` : ''}

            <!-- AI Analysis Button -->
            <div class="mt-8 pt-6 border-t border-gray-200">
              <button onclick="bannerSystem.analyzeSingleBanner(${knowledgeId})" 
                class="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-xl font-bold text-lg">
                <i class="fas fa-brain mr-2"></i>
                このバナーをAI分析
              </button>
              <div id="singleAnalysisResult_${knowledgeId}" class="mt-4 hidden">
                <div class="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                  <div id="singleAnalysisContent_${knowledgeId}" class="prose max-w-none"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Close on outside click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.remove();
        }
      });
    } catch (error) {
      console.error('Failed to show banner detail:', error);
      alert('バナー詳細の表示に失敗しました');
    }
  }

  async analyzeSingleBanner(knowledgeId) {
    const resultDiv = document.getElementById(`singleAnalysisResult_${knowledgeId}`);
    const contentDiv = document.getElementById(`singleAnalysisContent_${knowledgeId}`);
    
    resultDiv.classList.remove('hidden');
    contentDiv.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin text-3xl text-purple-600"></i><p class="mt-2 text-gray-600">AI分析中...</p></div>';

    try {
      const response = await axios.post('/api/ai/analyze-banner', {
        knowledge_id: knowledgeId
      });

      if (response.data.success) {
        contentDiv.innerHTML = this.formatAnalysisResult(response.data.analysis);
      } else {
        contentDiv.innerHTML = '<p class="text-red-600">分析に失敗しました</p>';
      }
    } catch (error) {
      console.error('Single banner analysis failed:', error);
      contentDiv.innerHTML = '<p class="text-red-600">AI分析エラーが発生しました</p>';
    }
  }
}

// Initialize
let bannerSystem;
document.addEventListener('DOMContentLoaded', () => {
  bannerSystem = new BannerAnalyticsSystem();
});
