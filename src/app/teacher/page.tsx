import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getSheetRows, parseRows } from '@/lib/sheets'
import type { Student, Teacher } from '@/types'
import TeacherDashboard from '@/components/TeacherDashboard'

interface StudentRow {
  id: string; student_id: string; name: string; gender: string;
  cohort_year: string; grade: string; class_number: string; track: string
}

export default async function TeacherPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role === 'admin') redirect('/admin')

  const rows = await getSheetRows('students')
  const allStudents: Student[] = parseRows<StudentRow>(rows).map(r => ({
    id: r.id,
    student_id: r.student_id,
    name: r.name,
    gender: r.gender,
    cohort_year: Number(r.cohort_year),
    grade: Number(r.grade),
    class_number: Number(r.class_number),
    track: r.track || null,
  }))

  let students = allStudents
  if (session.role === 'homeroom') {
    students = allStudents.filter(s => s.grade === session.grade && s.class_number === session.classNumber)
  } else if (session.role === 'year_head') {
    students = allStudents.filter(s => s.grade === session.grade)
  }
  students.sort((a, b) => a.student_id.localeCompare(b.student_id))

  const teacher: Teacher = {
    id: '',
    teacher_code: session.teacherCode,
    role: session.role as Teacher['role'],
    grade: session.grade,
    class_number: session.classNumber,
  }

  return <TeacherDashboard teacher={teacher} students={students} />
}
