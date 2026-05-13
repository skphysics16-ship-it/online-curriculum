import { NextRequest, NextResponse } from 'next/server'
import { getSheetRows, parseRows } from '@/lib/sheets'
import { createToken, COOKIE_NAME } from '@/lib/auth'

interface TeacherRow {
  teacher_code: string
  password: string
  role: string
  grade: string
  class_number: string
}

export async function POST(req: NextRequest) {
  const { code, password } = await req.json()
  if (!code || !password) {
    return NextResponse.json({ error: '교사 코드와 비밀번호를 입력하세요' }, { status: 400 })
  }

  const rows = await getSheetRows('teachers')
  const teachers = parseRows<TeacherRow>(rows)
  const teacher = teachers.find(t => t.teacher_code === String(code).trim().toLowerCase())

  if (!teacher || teacher.password !== password) {
    return NextResponse.json({ error: '교사 코드 또는 비밀번호가 올바르지 않습니다' }, { status: 401 })
  }

  const token = await createToken({
    teacherCode: teacher.teacher_code,
    role: teacher.role,
    grade: teacher.grade ? Number(teacher.grade) : null,
    classNumber: teacher.class_number ? Number(teacher.class_number) : null,
  })

  const response = NextResponse.json({ role: teacher.role })
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })
  return response
}
