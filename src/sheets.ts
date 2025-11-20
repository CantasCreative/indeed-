// Google Sheets Integration
// CSV公開URLを使用してスプレッドシートデータを取得

export interface SheetConfig {
  spreadsheet_id: string;
  gid?: string; // シートのgid（オプション）
}

export interface SheetRow {
  [key: string]: string | number;
}

/**
 * Googleスプレッドシート（CSV公開URL）からデータを取得
 * @param config スプレッドシート設定
 * @returns 行データの配列
 */
export async function fetchSheetData(config: SheetConfig): Promise<SheetRow[]> {
  const { spreadsheet_id, gid = '0' } = config;
  
  // CSV公開URL
  // スプレッドシートを「ウェブに公開」する必要があります
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheet_id}/export?format=csv&gid=${gid}`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`スプレッドシートの取得に失敗しました: ${response.status} ${response.statusText}`);
    }

    const csvText = await response.text();
    
    if (!csvText || csvText.trim().length === 0) {
      throw new Error('スプレッドシートが空です');
    }

    // CSVをパース
    return parseCSV(csvText);
  } catch (error) {
    console.error('Failed to fetch sheet data:', error);
    throw error;
  }
}

/**
 * CSVテキストから直接データを取得（ファイルアップロード用）
 * @param csvText CSV文字列
 * @returns 行データの配列
 */
export function fetchSheetDataFromCSV(csvText: string): SheetRow[] {
  if (!csvText || csvText.trim().length === 0) {
    throw new Error('CSVデータが空です');
  }
  return parseCSV(csvText);
}

/**
 * CSV文字列をパースして行データの配列に変換
 * @param csvText CSV文字列
 * @returns 行データの配列
 */
function parseCSV(csvText: string): SheetRow[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    return [];
  }

  // 1行目をヘッダーとして解析
  const headers = parseCSVLine(lines[0]);
  const rows: SheetRow[] = [];

  // 2行目以降をデータとして処理
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: SheetRow = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    rows.push(row);
  }

  return rows;
}

/**
 * CSV行をパースして値の配列に変換（カンマ区切り、ダブルクォート対応）
 * @param line CSV行
 * @returns 値の配列
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // エスケープされたダブルクォート
        current += '"';
        i++; // 次の文字をスキップ
      } else {
        // クォートの開始/終了
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // フィールドの区切り
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // 最後のフィールドを追加
  result.push(current.trim());

  return result;
}

/**
 * 画像URLを直接表示可能な形式に変換
 * Google Drive URLの場合は埋め込み可能なURLに変換
 * @param url 元のURL
 * @returns 直接表示可能なURL
 */
function convertToDirectImageUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return url;
  }

  const trimmedUrl = url.trim();

  // Google Drive URLのパターン1: /file/d/{FILE_ID}/view
  const drivePattern1 = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
  const match1 = trimmedUrl.match(drivePattern1);
  if (match1) {
    const fileId = match1[1];
    return `https://drive.google.com/uc?export=view&id=${fileId}`;
  }

  // Google Drive URLのパターン2: /open?id={FILE_ID}
  const drivePattern2 = /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/;
  const match2 = trimmedUrl.match(drivePattern2);
  if (match2) {
    const fileId = match2[1];
    return `https://drive.google.com/uc?export=view&id=${fileId}`;
  }

  // Dropbox URLの変換（dl=0 を dl=1 に変更）
  if (trimmedUrl.includes('dropbox.com')) {
    return trimmedUrl.replace('dl=0', 'dl=1').replace('www.dropbox.com', 'dl.dropboxusercontent.com');
  }

  // その他のURLはそのまま返す
  return trimmedUrl;
}

/**
 * URLがGoogle DriveまたはDropboxのURLかどうかを判定
 * @param url チェックするURL
 * @returns 外部ストレージURLの場合true
 */
export function isExternalStorageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  const trimmedUrl = url.trim().toLowerCase();
  
  // Google Drive URL
  if (trimmedUrl.includes('drive.google.com')) {
    return true;
  }
  
  // Dropbox URL
  if (trimmedUrl.includes('dropbox.com')) {
    return true;
  }
  
  return false;
}

/**
 * スプレッドシートデータをBannerKnowledgeフォーマットに変換
 * @param sheetRows スプレッドシート行データ
 * @param areaMap エリアコードマッピング
 * @param employmentTypeMap 雇用形態コードマッピング（オプション）
 * @param mainAppealsMap メイン訴求コードマッピング（オプション）
 * @returns BannerKnowledgeデータ
 */
export function convertSheetDataToBanners(
  sheetRows: SheetRow[],
  areaMap: Map<string, string>,
  employmentTypeMap?: Map<string, string>,
  mainAppealsMap?: Map<string, string>,
  visualTypeMap?: Map<string, string>
): any[] {
  return sheetRows.map(row => {
    // 必須フィールドのチェック
    if (!row['参照番号']) {
      return null;
    }

    // エリアコードの変換
    const areaName = row['都道府県'] || row['エリア'];
    const areaCode = areaName ? areaMap.get(String(areaName).trim()) : undefined;

    // CTRの計算（表示回数とクリック数から）
    const impressions = parseFloat(String(row['表示回数'] || 0).replace(/,/g, ''));
    const clicks = parseFloat(String(row['クリック数'] || 0).replace(/,/g, ''));
    
    // CTRの解析（%記号を削除して数値に変換）
    let ctrStr = String(row['クリック率（CTR）'] || row['CTR'] || '0');
    ctrStr = ctrStr.replace('%', '').trim();
    let ctr = parseFloat(ctrStr);
    
    // CTRが0で、表示回数とクリック数がある場合は計算
    if ((isNaN(ctr) || ctr === 0) && impressions > 0 && clicks > 0) {
      ctr = (clicks / impressions) * 100;
    }

    // メイン訴求の配列化（カンマ区切りの場合）
    let mainAppeals: string[] = [];
    const mainAppealStr = row['メイン訴求'] || row['main_appeal'];
    if (mainAppealStr && typeof mainAppealStr === 'string' && mainAppealStr.trim()) {
      const appealNames = mainAppealStr.split(',').map(s => s.trim()).filter(Boolean);
      // マッピングがある場合は名前→codeに変換、ない場合はフリーテキストのまま
      if (mainAppealsMap) {
        mainAppeals = appealNames.map(name => mainAppealsMap.get(name) || name);
      } else {
        mainAppeals = appealNames;
      }
    }

    // サブ訴求の配列化（カンマ区切りの場合）
    let subAppeals: string[] = [];
    const subAppealStr = row['サブ訴求'] || row['sub_appeal'];
    if (subAppealStr && typeof subAppealStr === 'string' && subAppealStr.trim()) {
      const appealNames = subAppealStr.split(',').map(s => s.trim()).filter(Boolean);
      // マッピングがある場合は名前→codeに変換、ない場合はフリーテキストのまま
      if (mainAppealsMap) {
        subAppeals = appealNames.map(name => mainAppealsMap.get(name) || name);
      } else {
        subAppeals = appealNames;
      }
    }

    // 画像URLの処理（Google Drive URLを直接表示用に変換）
    let imageUrl = row['画像のURL'] || row['画像URL'] || row['バナー画像URL'] || undefined;
    if (imageUrl) {
      imageUrl = convertToDirectImageUrl(imageUrl);
    }

    // 雇用形態コードの変換（名前→codeへのマッピング）
    let employmentType = row['雇用形態'] || undefined;
    if (employmentType && employmentTypeMap) {
      const employmentTypeName = String(employmentType).trim();
      const mappedCode = employmentTypeMap.get(employmentTypeName);
      if (mappedCode) {
        employmentType = mappedCode;
      }
    }

    // ビジュアル種別コードの変換（名前→codeへのマッピング）
    let visualType = row['人ありなし'] || row['人あり無し'] || row['ビジュアル種別'] || undefined;
    if (visualType && visualTypeMap) {
      const visualTypeName = String(visualType).trim();
      const mappedCode = visualTypeMap.get(visualTypeName);
      if (mappedCode) {
        visualType = mappedCode;
      }
    }

    return {
      image_id: String(row['参照番号']),
      company_name: row['企業名'] || undefined,
      job_title: row['求人'] || row['職種名'] || undefined,
      area: areaCode,
      impressions: Math.round(impressions),
      clicks: Math.round(clicks),
      ctr: parseFloat(ctr.toFixed(2)),
      employment_type: employmentType,
      banner_image_url: imageUrl,
      visual_type: visualType,
      main_appeals: mainAppeals,
      sub_appeals: subAppeals,
      main_color: row['色味'] || row['メインカラー'] || undefined,
      atmosphere: row['雰囲気'] || undefined,
      notes: row['備考'] || row['メモ'] || undefined,
    };
  }).filter(Boolean); // null値を除外
}
