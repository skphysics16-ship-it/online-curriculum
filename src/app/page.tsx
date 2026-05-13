import { getSheetRows, parseRows } from '@/lib/sheets'
import type { OnlineCourse } from '@/types'
import PublicPageClient from '@/components/PublicPageClient'

interface OnlineRow {
  id: string; course_name: string; subject_group: string; course_type: string
  credits: string; curriculum_revision: string; offering_type: string
  prerequisite: string; available_grade: string; available_semester: string
  is_school_opened: string
}

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const rows = await getSheetRows('online_courses')

  const allCourses: OnlineCourse[] = parseRows<OnlineRow>(rows).map(r => ({
    id: r.id,
    course_name: r.course_name,
    subject_group: r.subject_group || null,
    course_type: r.course_type || null,
    credits: r.credits ? Number(r.credits) : null,
    curriculum_revision: Number(r.curriculum_revision),
    offering_type: r.offering_type as '개설형' | '주문형',
    prerequisite: r.prerequisite || null,
    available_grade: r.available_grade ? Number(r.available_grade) : null,
    available_semester: r.available_semester ? Number(r.available_semester) : null,
    is_school_opened: r.is_school_opened?.toLowerCase() === 'true',
  }))

  const sort = (a: OnlineCourse, b: OnlineCourse) =>
    (a.offering_type ?? '').localeCompare(b.offering_type ?? '') ||
    (a.subject_group ?? '').localeCompare(b.subject_group ?? '') ||
    a.course_name.localeCompare(b.course_name)

  const courses2015 = allCourses.filter(c => c.curriculum_revision === 2015).sort(sort)
  const courses2022 = allCourses.filter(c => c.curriculum_revision === 2022).sort(sort)

  return (
    <PublicPageClient
      courses2015={courses2015}
      courses2022={courses2022}
    />
  )
}
