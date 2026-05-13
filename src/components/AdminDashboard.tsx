'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Registration } from '@/types'
import type { TeacherInfo } from '@/app/admin/page'

interface Props {
  registrations: Registration[]
  teachers: TeacherInfo[]
}

type AdminTab = '신청 내역' | '교사 관리'

const ROLE_LABEL: Record<string, string> = {
  admin: '관리자',
  year_head: '학년부장',
  homeroom: '담임',
}

export default function AdminDashboard({ registrations: initialRegs, teachers }: Props) {
  const router = useRouter()

  const [registrations, setRegistrations] = useState(initialRegs)
  const [adminTab, setAdminTab] = useState<AdminTab>('신청 내역')
  const [filterGrade, setFilterGrade] = useState<number | 'all'>('all')
  const [filterClass, setFilterClass] = useState<number | 'all'>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('접수')

  // 교사 관리 상태
  const [resetTarget, setResetTarget] = useState<string | null>(null)
  const [resetResult, setResetResult] = useState<Record<string, 'ok' | 'error'>>({})

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  async function handleStatusChange(regId: string, newStatus: '접수' | '취소') {
    const res = await fetch('/api/registrations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registration_id: regId }),
    })
    if (res.ok) {
      setRegistrations(prev =>
        prev.map(r => r.id === regId ? { ...r, status: newStatus } : r)
      )
    }
  }

  async function handleResetPassword(teacherCode: string) {
    setResetTarget(teacherCode)
    const res = await fetch('/api/admin/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacherCode }),
    })
    setResetTarget(null)
    setResetResult(prev => ({ ...prev, [teacherCode]: res.ok ? 'ok' : 'error' }))
    setTimeout(() => setResetResult(prev => { const n = { ...prev }; delete n[teacherCode]; return n }), 3000)
  }

  const filtered = registrations.filter(r => {
    const student = r.students
    if (filterGrade !== 'all' && student?.grade !== filterGrade) return false
    if (filterClass !== 'all' && student?.class_number !== filterClass) return false
    if (filterType !== 'all' && r.offering_type !== filterType) return false
    if (filterStatus !== 'all' && r.status !== filterStatus) return false
    return true
  })

  const courseCount = filtered.reduce<Record<string, number>>((acc, r) => {
    const name = r.online_courses?.course_name ?? '알 수 없음'
    acc[name] = (acc[name] ?? 0) + 1
    return acc
  }, {})

  const classes = Array.from(new Set(registrations.map(r => r.students?.class_number).filter(Boolean))).sort()

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-blue-700 text-white px-6 py-3 flex items-center justify-between">
        <div>
          <span className="font-bold text-sm">세광고등학교 | 온라인 교육과정 전체 관리</span>
          <span className="ml-3 text-blue-200 text-xs">sk000 (전체 관리자)</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/teacher" className="text-xs text-blue-200 hover:text-white transition-colors">교사 뷰</a>
          <button onClick={handleLogout} className="text-xs text-blue-200 hover:text-white transition-colors">로그아웃</button>
        </div>
      </header>

      {/* 관리자 탭 */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-1 max-w-7xl mx-auto">
          {(['신청 내역', '교사 관리'] as AdminTab[]).map(t => (
            <button
              key={t}
              onClick={() => setAdminTab(t)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                adminTab === t
                  ? 'border-blue-700 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full px-6 py-6 space-y-6">
        {/* 신청 내역 탭 */}
        {adminTab === '신청 내역' && (
          <>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                <p className="text-xs text-gray-500">전체 신청</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{registrations.filter(r => r.status === '접수').length}건</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                <p className="text-xs text-gray-500">개설형</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">{registrations.filter(r => r.status === '접수' && r.offering_type === '개설형').length}건</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                <p className="text-xs text-gray-500">주문형</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{registrations.filter(r => r.status === '접수' && r.offering_type === '주문형').length}건</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-sm text-gray-800">과목별 신청 인원</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left px-5 py-2.5 font-medium">과목명</th>
                      <th className="text-center px-4 py-2.5 font-medium">신청 인원</th>
                      <th className="text-center px-4 py-2.5 font-medium">최소 인원(3명)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {Object.entries(courseCount)
                      .sort(([, a], [, b]) => b - a)
                      .map(([name, count]) => (
                        <tr key={name} className="hover:bg-gray-50">
                          <td className="px-5 py-2.5 text-gray-900">{name}</td>
                          <td className="px-4 py-2.5 text-center font-medium">{count}명</td>
                          <td className="px-4 py-2.5 text-center">
                            {count >= 3
                              ? <span className="text-green-600 text-xs">✓ 충족</span>
                              : <span className="text-red-500 text-xs">미달 ({3 - count}명 부족)</span>
                            }
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
                <h2 className="font-semibold text-sm text-gray-800 mr-2">신청 내역</h2>
                <select
                  value={String(filterGrade)}
                  onChange={e => setFilterGrade(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-600 focus:outline-none"
                >
                  <option value="all">전체 학년</option>
                  <option value="2">2학년</option>
                  <option value="3">3학년</option>
                </select>
                <select
                  value={String(filterClass)}
                  onChange={e => setFilterClass(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-600 focus:outline-none"
                >
                  <option value="all">전체 반</option>
                  {classes.map(c => <option key={c} value={c}>{c}반</option>)}
                </select>
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-600 focus:outline-none"
                >
                  <option value="all">전체 유형</option>
                  <option value="개설형">개설형</option>
                  <option value="주문형">주문형</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-600 focus:outline-none"
                >
                  <option value="all">전체 상태</option>
                  <option value="접수">접수</option>
                  <option value="취소">취소</option>
                </select>
                <span className="text-xs text-gray-400 ml-auto">{filtered.length}건</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left px-5 py-2.5 font-medium">학번</th>
                      <th className="text-left px-4 py-2.5 font-medium">이름</th>
                      <th className="text-center px-4 py-2.5 font-medium">학년/반</th>
                      <th className="text-left px-4 py-2.5 font-medium">신청 과목</th>
                      <th className="text-center px-4 py-2.5 font-medium">유형</th>
                      <th className="text-left px-4 py-2.5 font-medium">접수 담임</th>
                      <th className="text-center px-4 py-2.5 font-medium">상태</th>
                      <th className="text-center px-4 py-2.5 font-medium">신청일</th>
                      <th className="text-center px-4 py-2.5 font-medium">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-5 py-2.5 text-gray-500 text-xs">{r.students?.student_id}</td>
                        <td className="px-4 py-2.5 font-medium text-gray-900">{r.students?.name}</td>
                        <td className="px-4 py-2.5 text-center text-gray-600 text-xs">
                          {r.students?.grade}학년 {r.students?.class_number}반
                        </td>
                        <td className="px-4 py-2.5 text-gray-800">{r.online_courses?.course_name}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            r.offering_type === '개설형' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                          }`}>{r.offering_type}</span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-500 text-xs">{r.registered_by}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            r.status === '접수' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>{r.status}</span>
                        </td>
                        <td className="px-4 py-2.5 text-center text-xs text-gray-400">
                          {new Date(r.created_at).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {r.status === '접수' && (
                            <button
                              onClick={() => handleStatusChange(r.id, '취소')}
                              className="text-xs text-red-600 border border-red-200 rounded px-2 py-0.5 hover:bg-red-50 transition-colors"
                            >
                              취소
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 && (
                  <p className="text-center py-10 text-sm text-gray-400">신청 내역이 없습니다</p>
                )}
              </div>
            </div>
          </>
        )}

        {/* 교사 관리 탭 */}
        {adminTab === '교사 관리' && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-sm text-gray-800">교사 비밀번호 관리</h2>
              <p className="text-xs text-gray-400 mt-0.5">초기화 버튼을 누르면 해당 교사의 비밀번호가 <strong>1234</strong>로 변경됩니다.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-5 py-2.5 font-medium">교사 코드</th>
                    <th className="text-center px-4 py-2.5 font-medium">역할</th>
                    <th className="text-center px-4 py-2.5 font-medium">학년</th>
                    <th className="text-center px-4 py-2.5 font-medium">반</th>
                    <th className="text-center px-4 py-2.5 font-medium">비밀번호 초기화</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {teachers.map(t => (
                    <tr key={t.teacher_code} className="hover:bg-gray-50">
                      <td className="px-5 py-2.5 font-medium text-gray-900">{t.teacher_code}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          t.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                          t.role === 'year_head' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {ROLE_LABEL[t.role] ?? t.role}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center text-gray-600 text-xs">{t.grade || '-'}</td>
                      <td className="px-4 py-2.5 text-center text-gray-600 text-xs">{t.class_number || '-'}</td>
                      <td className="px-4 py-2.5 text-center">
                        {resetResult[t.teacher_code] === 'ok' ? (
                          <span className="text-xs text-green-600">✓ 초기화 완료</span>
                        ) : resetResult[t.teacher_code] === 'error' ? (
                          <span className="text-xs text-red-500">오류 발생</span>
                        ) : (
                          <button
                            onClick={() => handleResetPassword(t.teacher_code)}
                            disabled={resetTarget === t.teacher_code}
                            className="text-xs text-orange-600 border border-orange-200 rounded px-2.5 py-1 hover:bg-orange-50 transition-colors disabled:opacity-50"
                          >
                            {resetTarget === t.teacher_code ? '처리 중...' : '1234로 초기화'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {teachers.length === 0 && (
                <p className="text-center py-10 text-sm text-gray-400">교사 정보가 없습니다</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
