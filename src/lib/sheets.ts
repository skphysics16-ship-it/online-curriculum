import { google } from 'googleapis'

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID!

// 5분 TTL 모듈 캐시 (같은 요청 내 / 서버 인스턴스 내 재사용)
const _cache = new Map<string, { data: string[][]; exp: number }>()

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

export async function getSheetRows(sheetName: string, bypassCache = false): Promise<string[][]> {
  if (!bypassCache) {
    const hit = _cache.get(sheetName)
    if (hit && Date.now() < hit.exp) return hit.data
  }
  const sheets = google.sheets({ version: 'v4', auth: getAuth() })
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
  })
  const data = (res.data.values ?? []) as string[][]
  _cache.set(sheetName, { data, exp: Date.now() + 5 * 60 * 1000 })
  return data
}

export function invalidateCache(...sheetNames: string[]) {
  if (sheetNames.length === 0) _cache.clear()
  else sheetNames.forEach(n => _cache.delete(n))
}

// 첫 행을 헤더로 사용해 객체 배열로 변환
export function parseRows<T extends Record<string, string>>(rows: string[][]): T[] {
  if (rows.length < 2) return []
  const headers = rows[0]
  return rows
    .slice(1)
    .filter(row => row.some(Boolean))
    .map(row => Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ''])) as T)
}

// 시트 맨 아래에 행 추가
export async function appendRow(sheetName: string, values: (string | number | boolean | null)[]): Promise<void> {
  const sheets = google.sheets({ version: 'v4', auth: getAuth() })
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [values.map(v => v ?? '')] },
  })
}

// 특정 행 번호(1-indexed, 헤더=1 이므로 데이터는 2부터) 업데이트
export async function updateRowAt(
  sheetName: string,
  rowNum: number,
  values: (string | number | boolean | null)[]
): Promise<void> {
  const sheets = google.sheets({ version: 'v4', auth: getAuth() })
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A${rowNum}`,
    valueInputOption: 'RAW',
    requestBody: { values: [values.map(v => v ?? '')] },
  })
}

// 시트 전체를 헤더 + 데이터로 덮어쓰기 (import 용)
export async function writeSheet(
  sheetName: string,
  headers: string[],
  rows: (string | number | boolean | null)[][]
): Promise<void> {
  const sheets = google.sheets({ version: 'v4', auth: getAuth() })
  await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID, range: sheetName })
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [headers, ...rows.map(r => r.map(v => v ?? ''))] },
  })
}
