// Search and Analysis Dashboard
class BannerDashboard {
  constructor() {
    this.dictionaries = {};
    this.searchResults = [];
    this.init();
  }

  async init() {
    await this.loadDictionaries();
    this.render();
    this.attachEventListeners();
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
      alert('辞書データの読み込みに失敗しました');
    }
  }

  render() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="min-h-screen bg-gray-50">
        <!-- Header -->
        <div class="bg-white shadow-sm border-b">
          <div class="container mx-auto px-4 py-4">
            <a href="/" class="text-blue-600 hover:text-blue-800 mb-2 inline-block">
              <i class="fas fa-arrow-left mr-2"></i>ホームに戻る
            </a>
            <h1 class="text-2xl font-bold text-gray-800">
              <i class="fas fa-search text-green-600 mr-2"></i>
              検索・分析ダッシュボード
            </h1>
          </div>
        </div>

        <!-- 3-Pane Layout -->
        <div class="container mx-auto px-4 py-6">
          <div class="grid grid-cols-12 gap-6">
            
            <!-- Left Pane: Search Area -->
            <div class="col-span-12 lg:col-span-3">
              <div class="bg-white rounded-lg shadow-md p-6 sticky top-6">
                <h2 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  <i class="fas fa-filter text-blue-600 mr-2"></i>
                  検索条件
                </h2>

                <form id="searchForm">
                  <!-- Job Title -->
                  <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">職種名</label>
                    <input type="text" id="jobTitle" 
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="部分一致検索">
                  </div>

                  <!-- Employment Type -->
                  <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">雇用形態</label>
                    <div class="border border-gray-300 rounded-md p-2 max-h-40 overflow-y-auto">
                      ${this.dictionaries.employmentTypes.map(item => `
                        <label class="flex items-center py-1 hover:bg-gray-50 cursor-pointer text-sm">
                          <input type="checkbox" name="employmentTypes" value="${item.code}" class="mr-2">
                          ${item.name}
                        </label>
                      `).join('')}
                    </div>
                  </div>

                  <!-- Areas -->
                  <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">エリア</label>
                    <div class="border border-gray-300 rounded-md p-2 max-h-40 overflow-y-auto">
                      ${this.dictionaries.areas.map(item => `
                        <label class="flex items-center py-1 hover:bg-gray-50 cursor-pointer text-sm">
                          <input type="checkbox" name="areas" value="${item.code}" class="mr-2">
                          ${item.name}
                        </label>
                      `).join('')}
                    </div>
                  </div>

                  <!-- Main Appeals -->
                  <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">メイン訴求</label>
                    <div class="border border-gray-300 rounded-md p-2 max-h-40 overflow-y-auto">
                      ${this.dictionaries.mainAppeals.map(item => `
                        <label class="flex items-center py-1 hover:bg-gray-50 cursor-pointer text-sm">
                          <input type="checkbox" name="mainAppeals" value="${item.code}" class="mr-2">
                          ${item.name}
                        </label>
                      `).join('')}
                    </div>
                  </div>

                  <!-- Limit -->
                  <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">表示件数</label>
                    <select id="limit" 
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm">
                      <option value="5">上位5件</option>
                      <option value="10" selected>上位10件</option>
                      <option value="20">上位20件</option>
                      <option value="50">上位50件</option>
                    </select>
                  </div>

                  <!-- Search Button -->
                  <button type="submit" 
                    class="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors font-semibold">
                    <i class="fas fa-search mr-2"></i>検索実行
                  </button>
                </form>
              </div>
            </div>

            <!-- Center Pane: Search Results -->
            <div class="col-span-12 lg:col-span-6">
              <div class="bg-white rounded-lg shadow-md p-6">
                <div class="flex justify-between items-center mb-4">
                  <h2 class="text-lg font-bold text-gray-800 flex items-center">
                    <i class="fas fa-list text-green-600 mr-2"></i>
                    検索結果
                  </h2>
                  <span id="resultCount" class="text-sm text-gray-600">0件</span>
                </div>

                <div id="searchResults" class="space-y-4">
                  <div class="text-center py-12 text-gray-400">
                    <i class="fas fa-search text-6xl mb-4"></i>
                    <p>検索条件を入力して検索を実行してください</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right Pane: AI Analysis -->
            <div class="col-span-12 lg:col-span-3">
              <div class="bg-white rounded-lg shadow-md p-6 sticky top-6">
                <h2 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  <i class="fas fa-robot text-purple-600 mr-2"></i>
                  AI分析
                </h2>

                <button id="aiAnalysisButton" disabled
                  class="w-full bg-purple-600 text-white py-2 rounded-md hover:bg-purple-700 transition-colors font-semibold mb-4 disabled:bg-gray-300 disabled:cursor-not-allowed">
                  <i class="fas fa-magic mr-2"></i>この結果をAIで分析
                </button>

                <div id="analysisResult" class="hidden">
                  <div class="bg-purple-50 border border-purple-200 rounded-md p-4 mb-3">
                    <div class="flex items-start mb-2">
                      <i class="fas fa-lightbulb text-purple-600 mr-2 mt-1"></i>
                      <div class="flex-1">
                        <h3 class="font-semibold text-gray-800 text-sm mb-2">分析結果</h3>
                        <div id="analysisText" class="text-sm text-gray-700 whitespace-pre-line"></div>
                      </div>
                    </div>
                  </div>
                  
                  <button id="copyButton" 
                    class="w-full bg-gray-600 text-white py-2 rounded-md hover:bg-gray-700 transition-colors text-sm">
                    <i class="fas fa-copy mr-2"></i>分析結果をコピー
                  </button>
                </div>

                <div id="analysisPlaceholder" class="text-center py-8 text-gray-400">
                  <i class="fas fa-brain text-5xl mb-3"></i>
                  <p class="text-sm">検索結果からAIが<br>成功パターンを分析します</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    // Search form submission
    document.getElementById('searchForm').addEventListener('submit', (e) => this.handleSearch(e));

    // AI analysis button
    document.getElementById('aiAnalysisButton').addEventListener('click', () => this.handleAIAnalysis());

    // Copy button
    document.getElementById('copyButton')?.addEventListener('click', () => this.copyAnalysisResult());
  }

  async handleSearch(e) {
    e.preventDefault();

    const searchParams = {
      job_title: document.getElementById('jobTitle').value || undefined,
      employment_types: Array.from(document.querySelectorAll('input[name="employmentTypes"]:checked')).map(cb => cb.value),
      areas: Array.from(document.querySelectorAll('input[name="areas"]:checked')).map(cb => cb.value),
      main_appeals: Array.from(document.querySelectorAll('input[name="mainAppeals"]:checked')).map(cb => cb.value),
      limit: parseInt(document.getElementById('limit').value),
    };

    // Remove empty arrays
    if (searchParams.employment_types.length === 0) delete searchParams.employment_types;
    if (searchParams.areas.length === 0) delete searchParams.areas;
    if (searchParams.main_appeals.length === 0) delete searchParams.main_appeals;

    try {
      const response = await axios.post('/api/banners/search', searchParams);

      if (response.data.success) {
        this.searchResults = response.data.items;
        this.renderSearchResults();
        
        // Enable AI analysis button if there are results
        document.getElementById('aiAnalysisButton').disabled = this.searchResults.length === 0;
      }
    } catch (error) {
      console.error('Search failed:', error);
      alert('検索に失敗しました');
    }
  }

  renderSearchResults() {
    const container = document.getElementById('searchResults');
    const countElem = document.getElementById('resultCount');

    countElem.textContent = `${this.searchResults.length}件`;

    if (this.searchResults.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12 text-gray-400">
          <i class="fas fa-inbox text-6xl mb-4"></i>
          <p>検索条件に一致するデータが見つかりませんでした</p>
        </div>
      `;
      return;
    }

    // Get dictionary name mapping
    const appealNames = {};
    this.dictionaries.mainAppeals.forEach(item => {
      appealNames[item.code] = item.name;
    });

    container.innerHTML = this.searchResults.map((item, index) => `
      <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div class="flex gap-4">
          <!-- Rank Badge -->
          <div class="flex-shrink-0">
            <div class="w-12 h-12 rounded-full ${index < 3 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'} flex items-center justify-center font-bold text-lg">
              ${index + 1}
            </div>
          </div>

          <!-- Banner Image -->
          <div class="flex-shrink-0">
            ${item.banner_image_url ? `
              <img src="${item.banner_image_url}" alt="Banner" class="w-32 h-20 object-cover rounded border border-gray-200">
            ` : `
              <div class="w-32 h-20 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                <i class="fas fa-image text-gray-400 text-2xl"></i>
              </div>
            `}
          </div>

          <!-- Info -->
          <div class="flex-1">
            <div class="flex items-start justify-between mb-2">
              <h3 class="font-semibold text-gray-800">${item.job_title || '職種名なし'}</h3>
              <span class="text-2xl font-bold text-green-600">${(item.ctr || 0).toFixed(2)}%</span>
            </div>
            
            <div class="text-sm text-gray-600 mb-2">
              <i class="fas fa-mouse-pointer mr-1"></i>
              クリック数: ${item.clicks || 0}
              ${item.product_name ? ` | <i class="fas fa-box ml-2 mr-1"></i>${item.product_name}` : ''}
            </div>

            ${item.main_appeals && item.main_appeals.length > 0 ? `
              <div class="flex flex-wrap gap-1 mt-2">
                ${item.main_appeals.map(code => `
                  <span class="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                    ${appealNames[code] || code}
                  </span>
                `).join('')}
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `).join('');
  }

  async handleAIAnalysis() {
    if (this.searchResults.length === 0) {
      alert('検索結果がありません');
      return;
    }

    const button = document.getElementById('aiAnalysisButton');
    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>AI分析中...';

    try {
      // Get search conditions
      const searchConditions = {
        job_title: document.getElementById('jobTitle').value || '全職種',
        employment_types: Array.from(document.querySelectorAll('input[name="employmentTypes"]:checked')).map(cb => {
          const item = this.dictionaries.employmentTypes.find(et => et.code === cb.value);
          return item ? item.name : cb.value;
        }),
        areas: Array.from(document.querySelectorAll('input[name="areas"]:checked')).map(cb => {
          const item = this.dictionaries.areas.find(a => a.code === cb.value);
          return item ? item.name : cb.value;
        }),
        main_appeals: Array.from(document.querySelectorAll('input[name="mainAppeals"]:checked')).map(cb => {
          const item = this.dictionaries.mainAppeals.find(ma => ma.code === cb.value);
          return item ? item.name : cb.value;
        })
      };

      // Prepare top results with dictionary names
      const topResults = this.searchResults.map(item => {
        // Convert codes to names
        const visualType = this.dictionaries.visualTypes?.find(v => v.code === item.visual_type);
        const mainColor = this.dictionaries.mainColors?.find(c => c.code === item.main_color);
        const atmosphere = this.dictionaries.atmospheres?.find(a => a.code === item.atmosphere);
        const mainAppeals = (item.main_appeals || []).map(code => {
          const appeal = this.dictionaries.mainAppeals.find(ma => ma.code === code);
          return appeal ? appeal.name : code;
        });

        return {
          ctr: item.ctr,
          visual_type: visualType ? visualType.name : item.visual_type,
          main_color: mainColor ? mainColor.name : item.main_color,
          atmosphere: atmosphere ? atmosphere.name : item.atmosphere,
          main_appeals: mainAppeals,
          job_title: item.job_title,
          clicks: item.clicks
        };
      });

      // Call AI analysis API
      const response = await axios.post('/api/ai/analyze-trends', {
        search_conditions: searchConditions,
        top_results: topResults
      });

      if (response.data.success) {
        document.getElementById('analysisPlaceholder').classList.add('hidden');
        document.getElementById('analysisResult').classList.remove('hidden');
        document.getElementById('analysisText').textContent = response.data.analysis;
      } else {
        alert('AI分析に失敗しました: ' + response.data.error);
      }
    } catch (error) {
      console.error('AI analysis failed:', error);
      alert('AI分析に失敗しました。もう一度お試しください。');
    } finally {
      button.disabled = false;
      button.innerHTML = originalText;
    }
  }

  copyAnalysisResult() {
    const text = document.getElementById('analysisText').textContent;
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById('copyButton');
      const originalText = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-check mr-2"></i>コピーしました！';
      btn.classList.remove('bg-gray-600', 'hover:bg-gray-700');
      btn.classList.add('bg-green-600');
      
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.classList.remove('bg-green-600');
        btn.classList.add('bg-gray-600', 'hover:bg-gray-700');
      }, 2000);
    });
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new BannerDashboard();
});
