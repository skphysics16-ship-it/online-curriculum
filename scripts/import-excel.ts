/**
 * Excel 데이터 → Google Sheets 임포트 스크립트
 * 실행: npx tsx scripts/import-excel.ts
 *
 * 필요한 환경변수:
 *   GOOGLE_SPREADSHEET_ID       - Google 스프레드시트 ID
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL - 서비스 계정 이메일
 *   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY - 서비스 계정 비공개 키
 *
 * Google Sheets 탭 구성 (아래 이름으로 탭을 미리 만들어 두세요):
 *   teachers / students / student_completed_courses / school_courses / online_courses / registrations
 *
 * teachers 탭은 import 대상이 아닙니다. 직접 입력:
 *   헤더: teacher_code | password | role | grade | class_number
 *   role 값: admin / year_head / homeroom
 */

import * as XLSX from 'xlsx'
import * as path from 'path'
import * as fs from 'fs'
import { createHash } from 'crypto'
import { google } from 'googleapis'

// ── 환경변수 체크 ────────────────────────────────────────────────
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID
const SA_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
const SA_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY

if (!SPREADSHEET_ID || !SA_EMAIL || !SA_KEY) {
  console.error('환경변수 GOOGLE_SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY 설정 필요')
  process.exit(1)
}

// ── Google Sheets 클라이언트 ──────────────────────────────────────
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: SA_EMAIL,
    private_key: SA_KEY.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
})
const sheets = google.sheets({ version: 'v4', auth })

async function writeSheet(
  sheetName: string,
  headers: string[],
  rows: (string | number | boolean | null)[][]
) {
  await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID!, range: sheetName })
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID!,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [headers, ...rows.map(r => r.map(v => v ?? ''))] },
  })
}

// ── 유틸리티 ─────────────────────────────────────────────────────
function stableId(...parts: (string | number)[]): string {
  return createHash('md5').update(parts.join('::')).digest('hex')
}

function readSheet(filePath: string, sheetName: string): unknown[][] {
  const wb = XLSX.readFile(filePath)
  const ws = wb.Sheets[sheetName]
  if (!ws) throw new Error(`시트 "${sheetName}" 없음: ${filePath}`)
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as unknown[][]
}

function getClassNumber(studentId: string): number {
  return parseInt(studentId.slice(1, 3), 10)
}

function getGrade(studentId: string): number {
  return parseInt(studentId[0], 10)
}

const DATA_DIR = path.join(__dirname, '..', '..', '..')

// ── 1. 학생 데이터 임포트 ─────────────────────────────────────────
async function importStudents(filePath: string, cohortYear: number, grade: number, curriculumRevision: number) {
  console.log(`\n📥 학생 데이터 임포트: ${cohortYear}년 입학생 (현 ${grade}학년)`)

  const sheetName = `${cohortYear} 입학생 학생별 2학년 선택과목`
  const rows = readSheet(filePath, sheetName)
  const courseHeaderRow = rows[1] as (string | null)[]

  // 공통과목
  const commonSheetName = `${cohortYear} 입학생 공통과목`
  const commonRows = readSheet(filePath, commonSheetName)
  const commonCourses = commonRows.slice(1).map(r => (r as unknown[])[0] as string).filter(Boolean)

  // 3학년 선택과목 시트
  const grade3SheetName = `${cohortYear} 입학생 학생별 3학년 선택과목`
  const grade3Rows = readSheet(filePath, grade3SheetName)
  const grade3CourseHeaders = (grade3Rows[1] as (string | null)[]).slice(3).filter(Boolean) as string[]
  const grade3StudentRows = grade3Rows.slice(3).filter(r => {
    const row = r as unknown[]
    return row[1] && String(row[1]).match(/^\d{5}$/)
  })

  const openedCoursesSet = new Set<string>()

  // 학생 데이터 구성
  const studentRows: (string | number | null)[][] = []
  const completedRows: (string | number | null)[][] = []

  const grade2DataRows = rows.slice(2).filter(r => {
    const row = r as unknown[]
    return row[1] && String(row[1]).match(/^\d{5}$/)
  })

  for (const row of grade2DataRows) {
    const r = row as unknown[]
    const studentId = String(r[1])
    const name = String(r[2])
    const gender = r[3] ? String(r[3]) : ''
    const track = r[4] ? String(r[4]) : null

    // students 행 (id = student_id)
    studentRows.push([studentId, studentId, name, gender, cohortYear, grade, getClassNumber(studentId), track])

    // 공통과목 이수
    for (const courseName of commonCourses) {
      completedRows.push([stableId(studentId, courseName), studentId, courseName, '공통', 1, null])
    }

    // 2학년 선택과목 이수
    const courseValues = (r as unknown[]).slice(4)
    courseValues.forEach((val, idx) => {
      const courseName = courseHeaderRow[idx + 4]
      if (val === 1 && courseName) {
        openedCoursesSet.add(String(courseName))
        completedRows.push([stableId(studentId, String(courseName)), studentId, String(courseName), '선택', 2, null])
      }
    })
  }

  // 3학년 선택과목 이수
  for (const row of grade3StudentRows) {
    const r = row as unknown[]
    const studentId = String(r[1])
    const courseValues = r.slice(3)
    courseValues.forEach((val, idx) => {
      const courseName = grade3CourseHeaders[idx]
      if (val === 1 && courseName) {
        openedCoursesSet.add(courseName)
        completedRows.push([stableId(studentId, courseName), studentId, courseName, '선택', 3, null])
      }
    })
  }

  // 학교 편제 과목
  const classifSheetName = `${cohortYear} 입학생 과목 분류`
  const classifRows = readSheet(filePath, classifSheetName)
  const schoolRows: (string | number | boolean | null)[][] = classifRows.slice(1)
    .filter(r => (r as unknown[])[1])
    .map(r => {
      const row = r as unknown[]
      const courseName = String(row[1])
      return [
        stableId(cohortYear, courseName),
        courseName,
        row[0] ? String(row[0]) : '일반',
        cohortYear,
        curriculumRevision,
        openedCoursesSet.has(courseName),
      ]
    })

  console.log(`  학생 ${studentRows.length}명 저장 중...`)
  await writeSheet('students', ['id', 'student_id', 'name', 'gender', 'cohort_year', 'grade', 'class_number', 'track'], studentRows)

  console.log(`  이수 과목 ${completedRows.length}건 저장 중...`)
  await writeSheet('student_completed_courses', ['id', 'student_id', 'course_name', 'course_category', 'grade', 'semester'], completedRows)

  console.log(`  학교 편제 과목 ${schoolRows.length}건 저장 중...`)
  await writeSheet('school_courses', ['id', 'course_name', 'course_type', 'cohort_year', 'curriculum_revision', 'is_opened'], schoolRows)

  console.log('  ✅ 완료')
}

// ── 2. 온라인 교과 임포트 ─────────────────────────────────────────
async function importOnlineCourses(filePath: string) {
  console.log('\n📥 온라인 교과 임포트')

  // 학교 개설 과목 (임포트된 school_courses 참조 대신 파일에서 직접 집계)
  // import 순서: importStudents가 먼저 실행되므로 여기선 Sheets를 읽지 않고 파일에서 집계
  // (단순화를 위해 Sheets에서 읽어옴)
  const { data: scData } = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID!,
    range: 'school_courses',
  })
  const scRows = (scData.values ?? []) as string[][]
  const openedNames2024 = new Set<string>()
  const openedNames2025 = new Set<string>()
  if (scRows.length > 1) {
    const headers = scRows[0]
    const nameIdx = headers.indexOf('course_name')
    const yearIdx = headers.indexOf('cohort_year')
    const openIdx = headers.indexOf('is_opened')
    scRows.slice(1).forEach(r => {
      if (r[openIdx] === 'true') {
        if (r[yearIdx] === '2024') openedNames2024.add(r[nameIdx])
        else if (r[yearIdx] === '2025') openedNames2025.add(r[nameIdx])
      }
    })
  }

  const onlineRows: (string | number | null)[][] = []

  // 2015 개설교과
  const rows2015Open = readSheet(filePath, '2015 개설교과')
  let currentSubjectGroup = ''
  rows2015Open.slice(3).forEach(row => {
    const r = row as unknown[]
    if (r[0]) currentSubjectGroup = String(r[0])
    const courseName = r[2] ? String(r[2]).trim() : null
    if (!courseName) return
    if (openedNames2024.has(courseName)) return
    onlineRows.push([
      stableId(2015, courseName), courseName, currentSubjectGroup || null,
      r[1] ? String(r[1]) : null, r[3] ? Number(r[3]) : null,
      2015, '개설형', r[4] ? String(r[4]) : null, null, null,
    ])
  })

  // 2015 전체 교과 → 주문형
  const rows2015All = readSheet(filePath, '2015 교과')
  const opened2015 = new Set(onlineRows.filter(r => r[5] === 2015 && r[6] === '개설형').map(r => r[1] as string))
  rows2015All.slice(3).forEach(row => {
    const r = row as unknown[]
    const cells = [r[2], r[3], r[4], r[5]].filter(Boolean).map(v => String(v))
    cells.forEach(cell => {
      cell.split(/[,，\n]/).map(s => s.trim()).filter(Boolean).forEach(courseName => {
        if (opened2015.has(courseName) || openedNames2024.has(courseName)) return
        if (onlineRows.some(c => c[1] === courseName && c[5] === 2015)) return
        onlineRows.push([
          stableId(2015, courseName), courseName, r[1] ? String(r[1]) : null,
          null, null, 2015, '주문형', null, null, null,
        ])
      })
    })
  })

  // 2022 개설교과
  const rows2022Open = readSheet(filePath, '2022 개설교과')
  let currentGroup2022 = ''
  rows2022Open.slice(4).forEach(row => {
    const r = row as unknown[]
    if (r[0]) currentGroup2022 = String(r[0])
    const courseName = r[2] ? String(r[2]).trim() : null
    if (!courseName) return
    if (openedNames2025.has(courseName)) return
    const availGrade = r[4] ? 1 : r[5] ? 2 : null
    onlineRows.push([
      stableId(2022, courseName), courseName, currentGroup2022 || null,
      r[1] ? String(r[1]) : null, r[3] ? Number(r[3]) : null,
      2022, '개설형', r[6] ? String(r[6]) : null,
      availGrade, availGrade ? 2 : null,
    ])
  })

  // 2022 전체 교과 → 주문형
  const rows2022All = readSheet(filePath, '2022 교과')
  const opened2022 = new Set(onlineRows.filter(r => r[5] === 2022 && r[6] === '개설형').map(r => r[1] as string))
  rows2022All.slice(3).forEach(row => {
    const r = row as unknown[]
    const cells = [r[1], r[2], r[3], r[4], r[5], r[6]].filter(Boolean).map(v => String(v))
    cells.forEach(cell => {
      cell.split(/[,，\n]/).map(s => s.trim()).filter(Boolean).forEach(courseName => {
        if (opened2022.has(courseName) || openedNames2025.has(courseName)) return
        if (onlineRows.some(c => c[1] === courseName && c[5] === 2022)) return
        onlineRows.push([
          stableId(2022, courseName), courseName, r[0] ? String(r[0]) : null,
          null, null, 2022, '주문형', null, null, null,
        ])
      })
    })
  })

  console.log(`  온라인 교과 ${onlineRows.length}건 저장 중...`)
  await writeSheet('online_courses', [
    'id', 'course_name', 'subject_group', 'course_type', 'credits',
    'curriculum_revision', 'offering_type', 'prerequisite', 'available_grade', 'available_semester',
  ], onlineRows)
  console.log('  ✅ 완료')
}

// ── 메인 ──────────────────────────────────────────────────────────
async function main() {
  console.log('=== 온라인 교육과정 데이터 임포트 시작 ===\n')

  const file2024 = path.join(DATA_DIR, '2024 입학생 이수과목(현3학년).xlsx')
  const file2025 = path.join(DATA_DIR, '2025 입학생 이수과목(현2학년).xlsx')
  const fileOnline = path.join(DATA_DIR, '온라인 개설 교육과정 및 교육과정.xlsx')

  for (const f of [file2024, file2025, fileOnline]) {
    if (!fs.existsSync(f)) { console.error(`파일 없음: ${f}`); process.exit(1) }
  }

  await importStudents(file2024, 2024, 3, 2015)
  await importStudents(file2025, 2025, 2, 2022)
  await importOnlineCourses(fileOnline)

  console.log('\n=== 임포트 완료 ===')
  console.log('\n⚠️  registrations 탭은 초기화되지 않습니다 (신청 데이터 보호)')
  console.log('   registrations 탭이 없다면 헤더만 입력하세요:')
  console.log('   id | student_id | online_course_id | offering_type | registered_by | status | created_at | updated_at')
}

main().catch(console.error)
