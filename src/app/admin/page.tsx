import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getSheetRows, parseRows } from '@/lib/sheets'
import type { Registration, Student, OnlineCourse } from '@/types'
import AdminDashboard from '@/components/AdminDashboard'

interface StudentRow { id: string; student_id: string; name: string; grade: string; class_number: string; gender: string; cohort_year: string; track: string }
interface OnlineRow { id: string; course_name: string; subject_group: string; course_type: string; credits: string; curriculum_revision: string; offering_type: string; prerequisite: string; available_grade: string; available_semester: string }
interface RegRow { id: string; student_id: string; online_course_id: string; offering_type: string; registered_by: string; status: string; created_at: string; updated_at: string }

export default async function AdminPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'admin') redirect('/teacher')

  const [studentRows, onlineRows, regRows] = await Promise.all([
    getSheetRows('students'),
    getSheetRows('online_courses'),
    getSheetRows('registrations'),
  ])

  const studentMap = new Map<string, Student>(
    parseRows<StudentRow>(studentRows).map(r => [r.id, {
      id: r.id, student_id: r.student_id, name: r.name, gender: r.gender,
      cohort_year: Number(r.cohort_year), grade: Number(r.grade),
      class_number: Number(r.class_number), track: r.track || null,
    }])
  )

  const courseMap = new Map<string, OnlineCourse>(
    parseRows<OnlineRow>(onlineRows).map(r => [r.id, {
      id: r.id, course_name: r.course_name, subject_group: r.subject_group || null,
      course_type: r.course_type || null, credits: r.credits ? Number(r.credits) : null,
      curriculum_revision: Number(r.curriculum_revision),
      offering_type: r.offering_type as '개설형' | '주문형',
      prerequisite: r.prerequisite || null,
      available_grade: r.available_grade ? Number(r.available_grade) : null,
      available_semester: r.available_semester ? Number(r.available_semester) : null,
    }])
  )

  const registrations: Registration[] = parseRows<RegRow>(regRows)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(r => ({
      id: r.id,
      student_id: r.student_id,
      online_course_id: r.online_course_id,
      offering_type: r.offering_type as '개설형' | '주문형',
      registered_by: r.registered_by,
      status: r.status as '접수' | '취소',
      created_at: r.created_at,
      updated_at: r.updated_at,
      students: studentMap.get(r.student_id),
      online_courses: courseMap.get(r.online_course_id),
    }))

  return <AdminDashboard registrations={registrations} />
}
