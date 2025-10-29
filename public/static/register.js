// Data Registration Form
class BannerRegistrationForm {
  constructor() {
    this.dictionaries = {};
    this.uploadedImageKey = null;
    this.uploadedImageUrl = null;
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
      <div class="min-h-screen bg-gray-50 py-8">
        <div class="container mx-auto px-4 max-w-4xl">
          <!-- Header -->
          <div class="mb-8">
            <a href="/" class="text-blue-600 hover:text-blue-800 mb-4 inline-block">
              <i class="fas fa-arrow-left mr-2"></i>ホームに戻る
            </a>
            <h1 class="text-3xl font-bold text-gray-800">
              <i class="fas fa-plus-circle text-blue-600 mr-3"></i>
              バナーデータ登録
            </h1>
          </div>

          <!-- CSV Import Section -->
          <div class="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 class="text-xl font-bold text-gray-800 mb-4">
              <i class="fas fa-file-csv text-green-600 mr-2"></i>
              CSVインポート（ATOMデータ）
            </h2>
            <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input type="file" id="csvFile" accept=".csv" class="hidden">
              <label for="csvFile" class="cursor-pointer">
                <i class="fas fa-upload text-4xl text-gray-400 mb-2"></i>
                <p class="text-gray-600">CSVファイルをドロップまたはクリックしてアップロード</p>
                <p class="text-sm text-gray-400 mt-2">※ image_idをキーにマッピングします</p>
              </label>
            </div>
            <div id="csvStatus" class="mt-4 text-sm"></div>
          </div>

          <!-- Registration Form -->
          <form id="bannerForm" class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-xl font-bold text-gray-800 mb-6">バナー情報入力</h2>

            <!-- ATOMデータセクション -->
            <div class="mb-8">
              <h3 class="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">ATOMデータ</h3>
              
              <div class="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    画像ID <span class="text-red-500">*</span>
                  </label>
                  <input type="text" id="imageId" required 
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="例: IMG001">
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">プロダクト名</label>
                  <input type="text" id="productName" 
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="例: Indeed Premium">
                </div>
              </div>

              <div class="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">職種名</label>
                  <input type="text" id="jobTitle" 
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="例: 営業スタッフ">
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">雇用形態</label>
                  <select id="employmentType" 
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                    <option value="">選択してください</option>
                    ${this.dictionaries.employmentTypes.map(item => 
                      `<option value="${item.code}">${item.name}</option>`
                    ).join('')}
                  </select>
                </div>
              </div>

              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">エリア（複数選択可）</label>
                <div class="border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto">
                  ${this.dictionaries.areas.map(item => `
                    <label class="flex items-center py-1 hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox" name="areas" value="${item.code}" class="mr-2">
                      <span class="text-sm">${item.name}</span>
                    </label>
                  `).join('')}
                </div>
              </div>

              <div class="grid md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">クリック数</label>
                  <input type="number" id="clicks" min="0" value="0"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">CTR（クリック率）</label>
                  <input type="number" id="ctr" min="0" max="100" step="0.01" value="0"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                </div>
              </div>
            </div>

            <!-- バナー画像セクション -->
            <div class="mb-8">
              <h3 class="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">バナー画像</h3>
              
              <div id="dropZone" class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors">
                <input type="file" id="bannerImage" accept="image/*" class="hidden">
                <div id="dropZoneContent">
                  <i class="fas fa-cloud-upload-alt text-5xl text-gray-400 mb-3"></i>
                  <p class="text-gray-600 mb-2">バナー画像をドラッグ＆ドロップ</p>
                  <p class="text-sm text-gray-400">または クリックしてファイルを選択</p>
                </div>
                <div id="imagePreview" class="hidden">
                  <img id="previewImg" class="max-w-full max-h-64 mx-auto rounded">
                  <p id="imageName" class="text-sm text-gray-600 mt-2"></p>
                </div>
              </div>
            </div>

            <!-- 分析タグセクション -->
            <div class="mb-8">
              <div class="flex justify-between items-center mb-4 border-b pb-2">
                <h3 class="text-lg font-semibold text-gray-700">分析タグ</h3>
                <button type="button" id="aiTagButton" 
                  class="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors">
                  <i class="fas fa-robot mr-2"></i>AIでタグを提案
                </button>
              </div>

              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">メイン訴求（複数選択可）</label>
                <div class="border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto">
                  ${this.dictionaries.mainAppeals.map(item => `
                    <label class="flex items-center py-1 hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox" name="mainAppeals" value="${item.code}" class="mr-2">
                      <span class="text-sm">${item.name}</span>
                    </label>
                  `).join('')}
                </div>
              </div>

              <div class="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">ビジュアル種別</label>
                  <select id="visualType" 
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                    <option value="">選択してください</option>
                    ${this.dictionaries.visualTypes.map(item => 
                      `<option value="${item.code}">${item.name}</option>`
                    ).join('')}
                  </select>
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">メインカラー</label>
                  <select id="mainColor" 
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                    <option value="">選択してください</option>
                    ${this.dictionaries.mainColors.map(item => 
                      `<option value="${item.code}">
                        ${item.name} ${item.hex_color ? `(${item.hex_color})` : ''}
                      </option>`
                    ).join('')}
                  </select>
                </div>
              </div>

              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">雰囲気</label>
                <select id="atmosphere" 
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                  <option value="">選択してください</option>
                  ${this.dictionaries.atmospheres.map(item => 
                    `<option value="${item.code}">${item.name}</option>`
                  ).join('')}
                </select>
              </div>

              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">抽出テキスト（OCR）</label>
                <textarea id="extractedText" rows="3"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="画像から抽出されたテキスト（AIが自動入力）"></textarea>
              </div>
            </div>

            <!-- メモセクション -->
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">補足メモ</label>
              <textarea id="notes" rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="営業担当者の補足メモ"></textarea>
            </div>

            <!-- Submit Buttons -->
            <div class="flex justify-end gap-4">
              <button type="button" onclick="history.back()" 
                class="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors">
                キャンセル
              </button>
              <button type="submit" 
                class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                <i class="fas fa-save mr-2"></i>保存
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    // Form submission
    document.getElementById('bannerForm').addEventListener('submit', (e) => this.handleSubmit(e));

    // Image upload - drag & drop
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('bannerImage');

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('border-blue-500', 'bg-blue-50');
    });
    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('border-blue-500', 'bg-blue-50');
    });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('border-blue-500', 'bg-blue-50');
      if (e.dataTransfer.files.length > 0) {
        fileInput.files = e.dataTransfer.files;
        this.handleImageUpload(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.handleImageUpload(e.target.files[0]);
      }
    });

    // AI tag suggestion button
    document.getElementById('aiTagButton').addEventListener('click', () => this.handleAITagSuggestion());
  }

  async handleImageUpload(file) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        this.uploadedImageKey = response.data.key;
        this.uploadedImageUrl = response.data.url;

        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
          document.getElementById('dropZoneContent').classList.add('hidden');
          document.getElementById('imagePreview').classList.remove('hidden');
          document.getElementById('previewImg').src = e.target.result;
          document.getElementById('imageName').textContent = file.name;
        };
        reader.readAsDataURL(file);

        alert('画像をアップロードしました');
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      alert('画像のアップロードに失敗しました');
    }
  }

  async handleAITagSuggestion() {
    if (!this.uploadedImageUrl) {
      alert('先にバナー画像をアップロードしてください');
      return;
    }

    const button = document.getElementById('aiTagButton');
    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>AI分析中...';

    try {
      // Step 1: Extract text from image (OCR)
      const extractResponse = await axios.post('/api/ai/extract-text', {
        image_url: this.uploadedImageUrl
      });

      let extractedText = '';
      if (extractResponse.data.success) {
        extractedText = extractResponse.data.extracted_text;
        document.getElementById('extractedText').value = extractedText;
      }

      // Step 2: Generate tags using AI
      const tagResponse = await axios.post('/api/ai/auto-tag', {
        image_url: this.uploadedImageUrl,
        extracted_text: extractedText
      });

      if (tagResponse.data.success) {
        const tags = tagResponse.data.tags;

        // Apply tags to form
        if (tags.visual_type) {
          // Find code from name
          const visualType = this.dictionaries.visualTypes.find(v => v.name === tags.visual_type);
          if (visualType) {
            document.getElementById('visualType').value = visualType.code;
          }
        }

        if (tags.main_color) {
          const mainColor = this.dictionaries.mainColors.find(c => c.name === tags.main_color);
          if (mainColor) {
            document.getElementById('mainColor').value = mainColor.code;
          }
        }

        if (tags.atmosphere) {
          const atmosphere = this.dictionaries.atmospheres.find(a => a.name === tags.atmosphere);
          if (atmosphere) {
            document.getElementById('atmosphere').value = atmosphere.code;
          }
        }

        if (tags.main_appeal && tags.main_appeal.length > 0) {
          // Uncheck all first
          document.querySelectorAll('input[name="mainAppeals"]').forEach(cb => cb.checked = false);
          
          // Check suggested appeals
          tags.main_appeal.forEach(appealName => {
            const appeal = this.dictionaries.mainAppeals.find(a => a.name === appealName);
            if (appeal) {
              const checkbox = document.querySelector(`input[name="mainAppeals"][value="${appeal.code}"]`);
              if (checkbox) checkbox.checked = true;
            }
          });
        }

        alert('AIによるタグ提案が完了しました！\n必要に応じて修正してください。');
      }
    } catch (error) {
      console.error('AI tag suggestion failed:', error);
      alert('AIタグ提案に失敗しました。もう一度お試しください。');
    } finally {
      button.disabled = false;
      button.innerHTML = originalText;
    }
  }

  async handleSubmit(e) {
    e.preventDefault();

    // Validate image upload
    if (!this.uploadedImageKey) {
      alert('バナー画像をアップロードしてください');
      return;
    }

    // Collect form data
    const data = {
      image_id: document.getElementById('imageId').value,
      product_name: document.getElementById('productName').value || undefined,
      job_title: document.getElementById('jobTitle').value || undefined,
      employment_type: document.getElementById('employmentType').value || undefined,
      areas: Array.from(document.querySelectorAll('input[name="areas"]:checked')).map(cb => cb.value),
      clicks: parseInt(document.getElementById('clicks').value) || 0,
      ctr: parseFloat(document.getElementById('ctr').value) || 0,
      visual_type: document.getElementById('visualType').value || undefined,
      main_appeals: Array.from(document.querySelectorAll('input[name="mainAppeals"]:checked')).map(cb => cb.value),
      main_color: document.getElementById('mainColor').value || undefined,
      atmosphere: document.getElementById('atmosphere').value || undefined,
      extracted_text: document.getElementById('extractedText').value || undefined,
      notes: document.getElementById('notes').value || undefined,
    };

    try {
      const response = await axios.post('/api/banners', data);

      if (response.data.success) {
        alert('データを保存しました！');
        // Reset form
        document.getElementById('bannerForm').reset();
        document.getElementById('dropZoneContent').classList.remove('hidden');
        document.getElementById('imagePreview').classList.add('hidden');
        this.uploadedImageKey = null;
        this.uploadedImageUrl = null;
      }
    } catch (error) {
      console.error('Save failed:', error);
      alert('データの保存に失敗しました');
    }
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new BannerRegistrationForm();
});
