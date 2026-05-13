import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getSheetRows, parseRows } from '@/lib/sheets'

interface StudentRow { id: string; cohort_year: string }
interface CompletedRow { id: string; student_id: string; course_name: string; course_category: string; grade: string; semester: string }
interface SchoolRow { course_name: string; cohort_year: string; is_opened: string }
interface OnlineRow {
  id: string; course_name: string; subject_group: string; course_type: string;
  credits: string; curriculum_revision: string; offering_type: string;
  prerequisite: string; available_grade: string; available_semester: string
}
interface RegRow {
  id: string; student_id: string; online_course_id: string; offering_type: string;
  registered_by: string; status: string; created_at: string; updated_at: string
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { studentId } = await params

  // 5개 시트를 병렬로 읽어 latency 최소화
  const [studentRows, completedRows, schoolRows, onlineRows, regRows] = await Promise.all([
    getSheetRows('students'),
    getSheetRows('student_completed_courses'),
    getSheetRows('school_courses'),
    getSheetRows('online_courses'),
    getSheetRows('registrations'),
  ])

  const student = parseRows<StudentRow>(studentRows).find(s => s.id === studentId)
  if (!student) return NextResponse.json({ error: '학생 없음' }, { status: 404 })

  const cohortYear = Number(student.cohort_year)
  const revision = cohortYear === 2024 ? 2015 : 2022

  // 이수 과목
  const completedCourses = parseRows<CompletedRow>(completedRows)
    .filter(c => c.student_id === studentId)
    .map(c => ({
      id: c.id,
      student_id: c.student_id,
      course_name: c.course_name,
      course_category: c.course_category || null,
      grade: c.grade ? Number(c.grade) : null,
      semester: c.semester ? Number(c.semester) : null,
    }))

  const completedNames = new Set(completedCourses.map(c => c.course_name))

  // 학교 개설 과목 (온라인 신청 불가)
  const openedNames = new Set(
    parseRows<SchoolRow>(schoolRows)
      .filter(c => Number(c.cohort_year) === cohortYear && c.is_opened === 'true')
      .map(c => c.course_name)
  )

  // 온라인 과목 전체 (조인용)
  const allOnline = parseRows<OnlineRow>(onlineRows).map(c => ({
    id: c.id,
    course_name: c.course_name,
    subject_group: c.subject_group || null,
    course_type: c.course_type || null,
    credits: c.credits ? Number(c.credits) : null,
    curriculum_revision: Number(c.curriculum_revision),
    offering_type: c.offering_type as '개설형' | '주문형',
    prerequisite: c.prerequisite || null,
    available_grade: c.available_grade ? Number(c.available_grade) : null,
    available_semester: c.available_semester ? Number(c.available_semester) : null,
  }))

  // 학생이 신청 가능한 과목 (이수 안 했고, 학교에서 개설 안 된 과목)
  const availableOnlineCourses = allOnline
    .filter(c => Number(c.curriculum_revision) === revision)
    .filter(c => !completedNames.has(c.course_name) && !openedNames.has(c.course_name))
    .sort((a, b) => {
      if (a.offering_type !== b.offering_type) return a.offering_type.localeCompare(b.offering_type)
      if ((a.subject_group ?? '') !== (b.subject_group ?? ''))
        return (a.subject_group ?? '').localeCompare(b.subject_group ?? '')
      return a.course_name.localeCompare(b.course_name)
    })

  const onlineLookup = new Map(allOnline.map(c => [c.id, c]))

  // 현재 접수 중인 신청 내역
  const registrations = parseRows<RegRow>(regRows)
    .filter(r => r.student_id === studentId && r.status === '접수')
    .map(r => ({
      id: r.id,
      student_id: r.student_id,
      online_course_id: r.online_course_id,
      offering_type: r.offering_type as '개설형' | '주문형',
      registered_by: r.registered_by,
      status: r.status as '접수' | '취소',
      created_at: r.created_at,
      updated_at: r.updated_at,
      online_courses: onlineLookup.get(r.online_course_id) ?? null,
    }))

  return NextResponse.json({ completedCourses, availableOnlineCourses, registrations })
}
