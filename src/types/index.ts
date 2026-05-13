export type TeacherRole = 'admin' | 'year_head' | 'homeroom'
export type OfferingType = '개설형' | '주문형'
export type RegistrationStatus = '접수' | '취소'

export interface Student {
  id: string
  student_id: string
  name: string
  gender: string
  cohort_year: number
  grade: number
  class_number: number
  track: string | null
}

export interface SchoolCourse {
  id: string
  course_name: string
  course_type: string | null
  cohort_year: number
  curriculum_revision: number
  is_opened: boolean
}

export interface StudentCompletedCourse {
  id: string
  student_id: string
  course_name: string
  course_category: string | null
  grade: number | null
  semester: number | null
}

export interface OnlineCourse {
  id: string
  course_name: string
  subject_group: string | null
  course_type: string | null
  credits: number | null
  curriculum_revision: number
  offering_type: OfferingType
  prerequisite: string | null
  available_grade: number | null
  available_semester: number | null
  is_school_opened: boolean
}

export interface Registration {
  id: string
  student_id: string
  online_course_id: string
  offering_type: OfferingType
  registered_by: string
  status: RegistrationStatus
  created_at: string
  updated_at: string
  online_courses?: OnlineCourse
  students?: Student
}

export interface Teacher {
  id: string
  teacher_code: string
  role: TeacherRole
  grade: number | null
  class_number: number | null
}
