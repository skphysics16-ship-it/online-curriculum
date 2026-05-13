'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Student, Teacher, StudentCompletedCourse, OnlineCourse, Registration } from '@/types'

interface Props {
  teacher: Teacher
  students: Student[]
}

type OfferingTab = '개설형' | '주문형'

export default function TeacherDashboard({ teacher, students }: Props) {
  const router = useRouter()

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [completedCourses, setCompletedCourses] = useState<StudentCompletedCourse[]>([])
  const [onlineCourses, setOnlineCourses] = useState<OnlineCourse[]>([])
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [offeringTab, setOfferingTab] = useState<OfferingTab>('개설형')
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // 비밀번호 변경 모달 상태
  const [showPwModal, setShowPwModal] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)

  const filteredStudents = students.filter(s =>
    s.name.includes(searchQuery) || s.student_id.includes(searchQuery)
  )

  const grouped = filteredStudents.reduce<Record<number, Student[]>>((acc, s) => {
    acc[s.class_number] = acc[s.class_number] ?? []
    acc[s.class_number].push(s)
    return acc
  }, {})

  const loadStudentData = useCallback(async (student: Student) => {
    setLoading(true)
    setSelectedStudent(student)

    const res = await fetch(`/api/students/${student.id}/data`)
    if (res.ok) {
      const data = await res.json()
      setCompletedCourses(data.completedCourses)
      setOnlineCourses(data.availableOnlineCourses)
      setRegistrations(data.registrations)
    }
    setLoading(false)
  }, [])

  async function handleRegister(course: OnlineCourse) {
    if (!selectedStudent) return
    const res = await fetch('/api/registrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: selectedStudent.id,
        online_course_id: course.id,
        offering_type: course.offering_type,
      }),
    })
    if (res.ok) await loadStudentData(selectedStudent)
  }

  async function handleCancel(registration: Registration) {
    if (!selectedStudent) return
    const res = await fetch('/api/registrations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registration_id: registration.id,
      }),
    })
    if (res.ok) await loadStudentData(selectedStudent)
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')
    if (newPw !== confirmPw) {
      setPwError('새 비밀번호가 일치하지 않습니다')
      return
    }
    if (newPw.length < 4) {
      setPwError('새 비밀번호는 4자 이상이어야 합니다')
      return
    }
    setPwLoading(true)
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
    })
    const data = await res.json()
    setPwLoading(false)
    if (!res.ok) {
      setPwError(data.error ?? '비밀번호 변경에 실패했습니다')
      return
    }
    setPwSuccess(true)
    setCurrentPw('')
    setNewPw('')
    setConfirmPw('')
  }

  function closePwModal() {
    setShowPwModal(false)
    setPwError('')
    setPwSuccess(false)
    setCurrentPw('')
    setNewPw('')
    setConfirmPw('')
  }

  const registeredIds = new Set(registrations.map(r => r.online_course_id))
  const filteredOnline = onlineCourses.filter(c => c.offering_type === offeringTab)

  const commonCourses = completedCourses.filter(c => c.course_category === '공통')
  const electiveCourses = completedCourses.filter(c => c.course_category === '선택')

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <header className="bg-blue-700 text-white px-4 py-3 flex items-center justify-between shrink-0">
        <div>
          <span className="font-bold text-sm">세광고등학교 | 온라인 교육과정 관리</span>
          <span className="ml-3 text-blue-200 text-xs">
            {teacher.teacher_code}
            {teacher.role === 'year_head' && ` (${teacher.grade}학년부장)`}
            {teacher.role === 'homeroom' && ` (${teacher.grade}학년 ${teacher.class_number}반 담임)`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPwModal(true)}
            className="text-xs text-blue-200 hover:text-white transition-colors border border-blue-500 px-2.5 py-1 rounded-md"
          >
            비밀번호 변경
          </button>
          <button onClick={handleLogout} className="text-xs text-blue-200 hover:text-white transition-colors">
            로그아웃
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 좌측: 학생 명렬표 (20%) */}
        <aside className="w-[20%] min-w-[160px] border-r border-gray-200 bg-white flex flex-col overflow-hidden">
          <div className="p-3 border-b border-gray-100">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="이름/학번 검색"
              className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {Object.entries(grouped)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([classNum, classStudents]) => (
                <div key={classNum}>
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 bg-gray-50 sticky top-0">
                    {classStudents[0]?.grade ?? ''}학년 {classNum}반
                  </div>
                  {classStudents.map(s => (
                    <button
                      key={s.id}
                      onClick={() => loadStudentData(s)}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                        selectedStudent?.id === s.id
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-gray-400 mr-1.5">{s.student_id}</span>
                      {s.name}
                    </button>
                  ))}
                </div>
              ))}
          </div>
        </aside>

        {/* 중앙: 이수 과목 현황 (40%) */}
        <section className="w-[40%] border-r border-gray-200 bg-gray-50 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-white shrink-0">
            <h2 className="font-semibold text-sm text-gray-800">
              {selectedStudent ? `${selectedStudent.name} 이수 과목` : '학생을 선택하세요'}
            </h2>
            {selectedStudent && (
              <p className="text-xs text-gray-400 mt-0.5">
                {selectedStudent.student_id} | {selectedStudent.grade}학년 {selectedStudent.class_number}반 | {selectedStudent.cohort_year}년 입학
              </p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {!selectedStudent && (
              <p className="text-sm text-gray-400 text-center mt-16">좌측에서 학생을 선택하세요</p>
            )}
            {loading && (
              <p className="text-sm text-gray-400 text-center mt-16">불러오는 중...</p>
            )}

            {selectedStudent && !loading && (
              <div className="space-y-4">
                {registrations.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-blue-600 mb-2">온라인 수강 신청 내역</h3>
                    <div className="bg-blue-50 rounded-lg border border-blue-100 divide-y divide-blue-100">
                      {registrations.map(r => (
                        <div key={r.id} className="px-3 py-2 flex items-center justify-between text-xs">
                          <span className="font-medium text-blue-800">{r.online_courses?.course_name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            r.offering_type === '개설형' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                          }`}>{r.offering_type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-xs font-semibold text-gray-500 mb-2">공통과목</h3>
                  <div className="bg-white rounded-lg border border-gray-100 divide-y divide-gray-50">
                    {commonCourses.length === 0 && (
                      <p className="px-3 py-2 text-xs text-gray-400">데이터 없음</p>
                    )}
                    {commonCourses.map(c => (
                      <div key={c.id} className="px-3 py-1.5 text-xs text-gray-700">{c.course_name}</div>
                    ))}
                  </div>
                </div>

                {[2, 3].map(g => {
                  const items = electiveCourses.filter(c => c.grade === g)
                  if (items.length === 0) return null
                  return (
                    <div key={g}>
                      <h3 className="text-xs font-semibold text-gray-500 mb-2">{g}학년 선택과목</h3>
                      <div className="bg-white rounded-lg border border-gray-100 divide-y divide-gray-50">
                        {items.map(c => (
                          <div key={c.id} className="px-3 py-1.5 text-xs text-gray-700">{c.course_name}</div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* 우측: 온라인 교육과정 신청 (40%) */}
        <section className="w-[40%] bg-white flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 shrink-0">
            <h2 className="font-semibold text-sm text-gray-800 mb-2">온라인 교육과정 신청</h2>
            <div className="flex gap-2">
              {(['개설형', '주문형'] as OfferingTab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setOfferingTab(t)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    offeringTab === t
                      ? t === '개설형' ? 'bg-blue-700 text-white' : 'bg-green-600 text-white'
                      : 'text-gray-500 bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {!selectedStudent && (
              <p className="text-sm text-gray-400 text-center mt-16">학생을 선택하면 신청 가능한 과목이 표시됩니다</p>
            )}
            {selectedStudent && !loading && filteredOnline.length === 0 && (
              <p className="text-sm text-gray-400 text-center mt-16">신청 가능한 {offeringTab} 과목이 없습니다</p>
            )}
            {selectedStudent && !loading && filteredOnline.length > 0 && (
              <div className="space-y-1">
                {filteredOnline.map(course => {
                  const isRegistered = registeredIds.has(course.id)
                  const reg = registrations.find(r => r.online_course_id === course.id)
                  return (
                    <div
                      key={course.id}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-xs transition-colors ${
                        isRegistered ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div className="flex-1 min-w-0 mr-2">
                        <p className={`font-medium truncate ${isRegistered ? 'text-blue-800' : 'text-gray-800'}`}>
                          {course.course_name}
                        </p>
                        <p className="text-gray-400 mt-0.5">
                          {course.subject_group ?? ''}
                          {course.credits && ` · ${course.credits}학점`}
                          {course.prerequisite && ` · 선이수: ${course.prerequisite}`}
                        </p>
                      </div>
                      {isRegistered ? (
                        <button
                          onClick={() => reg && handleCancel(reg)}
                          className="shrink-0 px-2.5 py-1 text-xs text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                        >
                          취소
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRegister(course)}
                          className="shrink-0 px-2.5 py-1 text-xs text-blue-700 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
                        >
                          신청
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* 비밀번호 변경 모달 */}
      {showPwModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">비밀번호 변경</h2>

            {pwSuccess ? (
              <div className="text-center py-4">
                <p className="text-green-600 font-medium mb-4">비밀번호가 성공적으로 변경되었습니다.</p>
                <button
                  onClick={closePwModal}
                  className="w-full bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors"
                >
                  닫기
                </button>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">현재 비밀번호</label>
                  <input
                    type="password"
                    value={currentPw}
                    onChange={e => setCurrentPw(e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">새 비밀번호</label>
                  <input
                    type="password"
                    value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">새 비밀번호 확인</label>
                  <input
                    type="password"
                    value={confirmPw}
                    onChange={e => setConfirmPw(e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  />
                </div>

                {pwError && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {pwError}
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={closePwModal}
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={pwLoading}
                    className="flex-1 bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors disabled:opacity-50"
                  >
                    {pwLoading ? '변경 중...' : '변경'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
