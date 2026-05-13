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
  if (!session) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const { currentPassword, newPassword } = await req.json()
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: '현재 비밀번호와 새 비밀번호를 입력하세요' }, { status: 400 })
  }
  if (newPassword.length < 4) {
    return NextResponse.json({ error: '새 비밀번호는 4자 이상이어야 합니다' }, { status: 400 })
  }

  const rows = await getSheetRows('teachers', true)
  const teachers = parseRows<TeacherRow>(rows)
  const idx = teachers.findIndex(t => t.teacher_code === session.teacherCode)

  if (idx === -1) return NextResponse.json({ error: '교사 정보를 찾을 수 없습니다' }, { status: 404 })

  const teacher = teachers[idx]
  if (teacher.password !== currentPassword) {
    return NextResponse.json({ error: '현재 비밀번호가 올바르지 않습니다' }, { status: 401 })
  }

  // rows[0] = headers, rows[1] = first data row → data row index = idx + 2
  const rowNum = idx + 2
  await updateRowAt('teachers', rowNum, [
    teacher.teacher_code,
    newPassword,
    teacher.role,
    teacher.grade,
    teacher.class_number,
  ])
  invalidateCache('teachers')

  return NextResponse.json({ ok: true })
}
