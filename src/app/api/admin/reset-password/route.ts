import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, COOKIE_NAME } from '@/lib/auth'
import { getSheetRows, parseRows, updateRowAt, invalidateCache } from '@/lib/sheets'

interface TeacherRow {
  teacher_code: string
  password: string
  role: string
  grade: string
  class_number: string
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const session = await verifyToken(token)
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  const { teacherCode } = await req.json()
  if (!teacherCode) return NextResponse.json({ error: '교사 코드를 입력하세요' }, { status: 400 })

  const rows = await getSheetRows('teachers', true)
  const teachers = parseRows<TeacherRow>(rows)
  const idx = teachers.findIndex(t => t.teacher_code === String(teacherCode).trim().toLowerCase())

  if (idx === -1) return NextResponse.json({ error: '해당 교사를 찾을 수 없습니다' }, { status: 404 })

  const teacher = teachers[idx]
  const rowNum = idx + 2
  await updateRowAt('teachers', rowNum, [
    teacher.teacher_code,
    '1234',
    teacher.role,
    teacher.grade,
    teacher.class_number,
  ])
  invalidateCache('teachers')

  return NextResponse.json({ ok: true })
}
