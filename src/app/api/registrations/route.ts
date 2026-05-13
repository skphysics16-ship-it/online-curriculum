import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getSheetRows, parseRows, appendRow, updateRowAt, invalidateCache } from '@/lib/sheets'

const HEADERS = ['id', 'student_id', 'online_course_id', 'offering_type', 'registered_by', 'status', 'created_at', 'updated_at']

interface RegRow {
  id: string; student_id: string; online_course_id: string; offering_type: string;
  registered_by: string; status: string; created_at: string; updated_at: string
}

// 특정 학생+과목 조합의 행 번호(1-indexed)와 데이터를 반환
async function findRegistrationRow(studentId: string, onlineCourseId: string): Promise<{ rowNum: number; row: RegRow } | null> {
  const rows = await getSheetRows('registrations', true)
  if (rows.length < 2) return null
  const headers = rows[0]
  const sidIdx = headers.indexOf('student_id')
  const cidIdx = headers.indexOf('online_course_id')
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (r[sidIdx] === studentId && r[cidIdx] === onlineCourseId) {
      return {
        rowNum: i + 1,
        row: Object.fromEntries(headers.map((h, j) => [h, r[j] ?? ''])) as unknown as RegRow,
      }
    }
  }
  return null
}

// 등록 ID로 행 찾기 (관리자 상태 변경용)
async function findRegistrationById(id: string): Promise<{ rowNum: number; row: RegRow } | null> {
  const rows = await getSheetRows('registrations', true)
  if (rows.length < 2) return null
  const headers = rows[0]
  const idIdx = headers.indexOf('id')
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][idIdx] === id) {
      return {
        rowNum: i + 1,
        row: Object.fromEntries(headers.map((h, j) => [h, rows[i][j] ?? ''])) as unknown as RegRow,
      }
    }
  }
  return null
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await req.json()
  const { student_id, online_course_id, offering_type } = body

  if (!student_id || !online_course_id || !offering_type) {
    return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 })
  }

  const existing = await findRegistrationRow(student_id, online_course_id)
  const now = new Date().toISOString()

  if (existing) {
    if (existing.row.status === '접수') {
      return NextResponse.json(existing.row)
    }
    // 취소 → 접수로 복원
    const updated = { ...existing.row, status: '접수', updated_at: now }
    await updateRowAt('registrations', existing.rowNum, HEADERS.map(h => updated[h as keyof RegRow]))
    invalidateCache('registrations')
    return NextResponse.json(updated)
  }

  // 신규 등록
  const newReg = {
    id: crypto.randomUUID(),
    student_id,
    online_course_id,
    offering_type,
    registered_by: session.teacherCode,
    status: '접수',
    created_at: now,
    updated_at: now,
  }
  await appendRow('registrations', HEADERS.map(h => newReg[h as keyof typeof newReg]))
  invalidateCache('registrations')
  return NextResponse.json(newReg)
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await req.json()
  let found: { rowNum: number; row: RegRow } | null = null

  if (body.registration_id) {
    found = await findRegistrationById(body.registration_id)
  } else if (body.student_id && body.online_course_id) {
    found = await findRegistrationRow(body.student_id, body.online_course_id)
  }

  if (!found) return NextResponse.json({ error: '신청 내역 없음' }, { status: 404 })

  const updated = { ...found.row, status: '취소', updated_at: new Date().toISOString() }
  await updateRowAt('registrations', found.rowNum, HEADERS.map(h => updated[h as keyof RegRow]))
  invalidateCache('registrations')
  return NextResponse.json({ ok: true })
}
