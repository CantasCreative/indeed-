// Google Sheets Integration
// Google Sheets API v4を使用してスプレッドシートデータを取得

export interface SheetConfig {
  spreadsheet_id: string;
  api_key: string;
  sheet_name?: string;
}

export interface SheetRow {
  [key: string]: string | number;
}

/**
 * Googleスプレッドシートからデータを取得
 * @param config スプレッドシート設定
 * @returns 行データの配列
 */
export async function fetchSheetData(config: SheetConfig): Promise<SheetRow[]> {
  const { spreadsheet_id, api_key, sheet_name = 'Sheet1' } = config;
  
  // Google Sheets API v4エンドポイント
  const range = encodeURIComponent(`${sheet_name}!A:Z`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}/values/${range}?key=${api_key}`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Google Sheets API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.values || data.values.length === 0) {
      return [];
    }

    // 1行目をヘッダーとして使用
    const headers = data.values[0];
    const rows: SheetRow[] = [];

    // 2行目以降をデータとして処理
    for (let i = 1; i < data.values.length; i++) {
      const row: SheetRow = {};
      const values = data.values[i];

      headers.forEach((header: string, index: number) => {
        const value = values[index] || '';
        row[header] = value;
      });

      rows.push(row);
    }

    return rows;
  } catch (error) {
    console.error('Failed to fetch sheet data:', error);
    throw error;
  }
}

/**
 * スプレッドシートデータをBannerKnowledgeフォーマットに変換
 * @param sheetRows スプレッドシート行データ
 * @param areaMap エリアコードマッピング
 * @returns BannerKnowledgeデータ
 */
export function convertSheetDataToBanners(
  sheetRows: SheetRow[],
  areaMap: Map<string, string>
): any[] {
  return sheetRows.map(row => {
    // 必須フィールドのチェック
    if (!row['参照番号']) {
      return null;
    }

    // エリアコードの変換
    const areaName = row['都道府県'] || row['エリア'];
    const areaCode = areaName ? areaMap.get(String(areaName)) : undefined;

    // CTRの計算（表示回数とクリック数から）
    const impressions = parseFloat(String(row['表示回数'] || 0));
    const clicks = parseFloat(String(row['クリック数'] || 0));
    let ctr = parseFloat(String(row['クリック率（CTR）'] || row['CTR'] || 0));
    
    // CTRが%表記の場合は数値に変換
    if (ctr > 100) {
      ctr = ctr / 100;
    } else if (ctr === 0 && impressions > 0 && clicks > 0) {
      ctr = (clicks / impressions) * 100;
    }

    // メイン訴求の配列化（カンマ区切りの場合）
    let mainAppeals: string[] = [];
    const mainAppealStr = row['メイン訴求'] || row['main_appeal'];
    if (mainAppealStr && typeof mainAppealStr === 'string') {
      mainAppeals = mainAppealStr.split(',').map(s => s.trim()).filter(Boolean);
    }

    // サブ訴求の配列化（カンマ区切りの場合）
    let subAppeals: string[] = [];
    const subAppealStr = row['サブ訴求'] || row['sub_appeal'];
    if (subAppealStr && typeof subAppealStr === 'string') {
      subAppeals = subAppealStr.split(',').map(s => s.trim()).filter(Boolean);
    }

    return {
      image_id: String(row['参照番号']),
      company_name: row['企業名'] || undefined,
      job_title: row['求人'] || row['職種名'] || undefined,
      area: areaCode,
      impressions: Math.round(impressions),
      clicks: Math.round(clicks),
      ctr: parseFloat(ctr.toFixed(2)),
      employment_type: row['雇用形態'] || undefined,
      banner_image_url: row['画像URL'] || row['バナー画像URL'] || undefined,
      visual_type: row['人あり無し'] || row['ビジュアル種別'] || undefined,
      main_appeals: mainAppeals,
      sub_appeals: subAppeals,
      main_color: row['色味'] || row['メインカラー'] || undefined,
      atmosphere: row['雰囲気'] || undefined,
      notes: row['備考'] || row['メモ'] || undefined,
    };
  }).filter(Boolean); // null値を除外
}
