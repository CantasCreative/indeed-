// AI Integration Functions

// AI Function 1: Auto-tagging from banner image
export async function generateBannerTags(imageUrl: string, extractedText: string): Promise<any> {
  const systemPrompt = `# あなたの役割
あなたはプロの広告クリエイティブアナリストです。
アップロードされたバナー画像を分析し、指定されたデータモデルに基づいて分類タグを提案してください。

# タグの定義（辞書）
分析の際は、必ず以下の「選択肢」の中から最も適切なものだけを選んでください。
辞書にない単語は使用しないでください。

* visual_type: ["人物写真（単体）", "人物写真（複数）", "イラスト", "テキストのみ", "商品・風景写真", "その他"]
* main_color: ["青系", "赤・オレンジ系", "緑系", "黄系", "紫系", "ピンク系", "モノクロ・黒", "白ベース・カラフル"]
* atmosphere: ["明るい・元気", "真面目・信頼・プロフェッショナル", "スタイリッシュ・先進的", "優しい・安心・温かい", "クール・かっこいい", "シニア向け・落ち着いた", "インパクト重視"]
* main_appeal: ["未経験歓迎", "高収入・高時給", "シフト自由・選べる", "Wワーク・副業OK", "リモートワーク・在宅OK", "駅チカ・通勤便利", "主婦・主夫歓迎", "シニア活躍中", "ミドル活躍中", "オープニングスタッフ", "資格取得支援", "土日祝休み", "正社員登用あり", "髪色・服装自由", "短時間・短期OK"]

# 出力形式
以下のJSON形式で、分析結果のみを回答してください。
* visual_type, main_color, atmosphere は、辞書から**1つ**だけ選んでください。
* main_appeal は、辞書から該当するものを**複数**（配列形式で）選んでください。該当なしの場合は空の配列 \`[]\` としてください。
* 解説や前置きは一切不要です。

{
  "visual_type": "（ここに選択肢から1つ）",
  "main_color": "（ここに選択肢から1つ）",
  "atmosphere": "（ここに選択肢から1つ）",
  "main_appeal": ["（ここに選択肢から複数）"]
}`;

  const userPrompt = `# 分析対象
画像URL: ${imageUrl}
画像から抽出されたテキスト: ${extractedText || 'なし'}

上記のバナー画像を分析し、JSON形式でタグを提案してください。`;

  // Call external AI API (e.g., OpenAI GPT-4 Vision)
  // For this demo, we'll return a simulated response
  // In production, replace this with actual AI API call
  
  // Example: OpenAI API call
  // const response = await fetch('https://api.openai.com/v1/chat/completions', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'Authorization': `Bearer ${API_KEY}`
  //   },
  //   body: JSON.stringify({
  //     model: 'gpt-4-vision-preview',
  //     messages: [
  //       { role: 'system', content: systemPrompt },
  //       { 
  //         role: 'user', 
  //         content: [
  //           { type: 'text', text: userPrompt },
  //           { type: 'image_url', image_url: { url: imageUrl } }
  //         ]
  //       }
  //     ],
  //     max_tokens: 500
  //   })
  // });

  // Simulated AI response for demo
  const simulatedResponse = {
    visual_type: "人物写真（単体）",
    main_color: "青系",
    atmosphere: "明るい・元気",
    main_appeal: ["未経験歓迎", "高収入・高時給"]
  };

  return simulatedResponse;
}

// AI Function 2: Trend analysis from search results
export async function analyzeBannerTrends(
  searchConditions: any,
  topResults: any[]
): Promise<string> {
  const systemPrompt = `# あなたの役割
あなたは優秀な広告営業コンサルタント兼データアナリストです。

# 背景
営業担当者が、クライアントへの新規提案資料を作成するために、過去のIndeedバナー広告の成功実績（CTRトップ）を検索しました。

# あなたのタスク
以下の「トップ実績バナーの分析データ」を読み解き、このクライアントに提案すべき「成功の傾向」を分析してください。
そして、営業担当者がそのまま提案資料に使えるような、簡潔な「分析サマリー」を作成してください。

# 分析サマリーの作成ルール
* データ（JSON）に基づき、事実ベースで分析してください。
* 「クリエイティブ（ビジュアル）」「色味」「メイン訴求」の3つの観点で傾向をまとめてください。
* 営業担当者がクライアントにそのまま見せられるよう、プロフェッショナルかつ分かりやすい言葉遣いをしてください。
* 「〜のようです」「〜と考えられます」といった曖昧な表現は避け、「〜の傾向があります」「〜が効果的です」と断定的に記述してください。

# 出力フォーマット
## {職種名}・{雇用形態} 向けバナーの成功傾向

過去のCTR上位実績を分析した結果、以下の成功パターンが確認できました。

1.  **クリエイティブ（ビジュアル）:**
    （実績データに基づく傾向を記述）

2.  **色味:**
    （実績データに基づく傾向を記述）

3.  **メイン訴求:**
    （実績データに基づく傾向を記述）`;

  const jobTitle = searchConditions.job_title || '指定職種';
  const employmentTypes = searchConditions.employment_types || [];
  const employmentTypeStr = employmentTypes.length > 0 
    ? employmentTypes.join('・') 
    : '全雇用形態';

  // Prepare analysis data
  const analysisData = topResults.map(item => ({
    company_name: item.company_name,
    job_title: item.job_title,
    impressions: item.impressions,
    clicks: item.clicks,
    ctr: item.ctr,
    visual_type: item.visual_type,
    main_color: item.main_color,
    atmosphere: item.atmosphere,
    main_appeal: item.main_appeals
  }));

  const companyName = searchConditions.company_name || '全企業';
  
  const userPrompt = `# 検索条件
- 企業名: ${companyName}
- 求人: ${jobTitle}
- 雇用形態: ${employmentTypeStr}
- エリア: ${searchConditions.areas ? searchConditions.areas.join('、') : '全国'}
- 検索結果件数: ${topResults.length}件

# トップ実績バナーの分析データ（JSON形式）
${JSON.stringify(analysisData, null, 2)}

上記のデータを分析し、営業提案用のサマリーを作成してください。`;

  // Call external AI API (e.g., OpenAI GPT-4)
  // For this demo, we'll return a simulated response
  // In production, replace this with actual AI API call
  
  // Example: OpenAI API call
  // const response = await fetch('https://api.openai.com/v1/chat/completions', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'Authorization': `Bearer ${API_KEY}`
  //   },
  //   body: JSON.stringify({
  //     model: 'gpt-4',
  //     messages: [
  //       { role: 'system', content: systemPrompt },
  //       { role: 'user', content: userPrompt }
  //     ],
  //     max_tokens: 1000
  //   })
  // });

  // Simulated AI response for demo
  const visualTypes: { [key: string]: number } = {};
  const colors: { [key: string]: number } = {};
  const appeals: { [key: string]: number } = {};

  topResults.forEach(item => {
    if (item.visual_type) {
      visualTypes[item.visual_type] = (visualTypes[item.visual_type] || 0) + 1;
    }
    if (item.main_color) {
      colors[item.main_color] = (colors[item.main_color] || 0) + 1;
    }
    if (item.main_appeals) {
      item.main_appeals.forEach((appeal: string) => {
        appeals[appeal] = (appeals[appeal] || 0) + 1;
      });
    }
  });

  const topVisualType = Object.entries(visualTypes).sort((a, b) => b[1] - a[1])[0]?.[0] || 'データ不足';
  const topColor = Object.entries(colors).sort((a, b) => b[1] - a[1])[0]?.[0] || 'データ不足';
  const topAppeals = Object.entries(appeals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([appeal]) => appeal);

  const avgCTR = topResults.reduce((sum, item) => sum + (item.ctr || 0), 0) / topResults.length;
  const avgImpressions = topResults.reduce((sum, item) => sum + (item.impressions || 0), 0) / topResults.length;
  const avgClicks = topResults.reduce((sum, item) => sum + (item.clicks || 0), 0) / topResults.length;

  const simulatedResponse = `## ${jobTitle}・${employmentTypeStr} 向けバナーの成功傾向

過去のCTR上位実績（平均CTR: ${avgCTR.toFixed(2)}%、平均表示回数: ${Math.round(avgImpressions).toLocaleString()}、平均クリック数: ${Math.round(avgClicks).toLocaleString()}）を分析した結果、以下の成功パターンが確認できました。

1.  **クリエイティブ（ビジュアル）:**
    実績上位${topResults.length}件中${visualTypes[topVisualType] || 0}件が「${topVisualType}」を採用しており、視覚的インパクトを重視したデザインがクリック率向上に効果的です。特に${topResults[0]?.atmosphere || '明るく親しみやすい'}雰囲気の表現が、ターゲット層の関心を引く傾向があります。

2.  **色味:**
    最も多く使用されているのは「${topColor}」で、ターゲットにポジティブな印象を与えています。この色使いは視認性が高く、求人広告として目立つ効果が確認できます。

3.  **メイン訴求:**
    実績上位バナーの多くに${topAppeals.map(a => `「${a}」`).join('、')}が含まれています。${topAppeals[0] ? `特に「${topAppeals[0]}」` : 'これらの訴求'}は応募意欲を高める効果的なメッセージとして機能しています。働きやすさや待遇面を明確に訴求することで、ターゲット層の応募行動を促進できます。

**推奨アプローチ:**
上記の成功パターンを踏まえ、${topVisualType}のクリエイティブに${topColor}を基調としたデザインで、${topAppeals.slice(0, 2).map(a => `「${a}」`).join('と')}を前面に打ち出すバナーの制作を推奨します。`;

  return simulatedResponse;
}

// Helper function to extract text from image (OCR simulation)
export async function extractTextFromImage(imageUrl: string): Promise<string> {
  // In production, use OCR API like Google Cloud Vision, AWS Textract, or Tesseract.js
  // For demo purposes, return a placeholder
  return "未経験OK 高時給1500円 週2日〜OK シフト自由";
}
