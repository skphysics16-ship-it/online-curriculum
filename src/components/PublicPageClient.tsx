'use client'

import { useState } from 'react'
import type { OnlineCourse } from '@/types'

type Tab = '안내' | '개설형' | '주문형'
type Grade = '3학년(2015)' | '2학년(2022)' | '1학년(2022)'

interface Props {
  courses2015: OnlineCourse[]
  courses2022: OnlineCourse[]
}

const SUBJECT_ORDER = ['수학', '영어', '사회', '역사', '도덕', '과학', '기술·가정', '기술가정', '한문', '교양']

function subjectIndex(group: string) {
  const i = SUBJECT_ORDER.findIndex(s => group === s || group.includes(s))
  return i === -1 ? 99 : i
}

export default function PublicPageClient({ courses2015, courses2022 }: Props) {
  const [tab, setTab] = useState<Tab>('안내')
  const [grade, setGrade] = useState<Grade>('3학년(2015)')
  const [pdfYear, setPdfYear] = useState<'2015' | '2022'>('2015')

  const courses = grade === '3학년(2015)' ? courses2015
    : grade === '1학년(2022)' ? courses2022.filter(c => c.available_grade === 1 || c.available_grade === null)
    : courses2022.filter(c => c.available_grade === 2 || c.available_grade === null)
  const filtered = tab === '안내' ? [] : courses.filter(c => c.offering_type === '개설형')

  const grouped = filtered.reduce<Record<string, OnlineCourse[]>>((acc, c) => {
    const key = c.subject_group ?? '기타'
    acc[key] = acc[key] ?? []
    acc[key].push(c)
    return acc
  }, {})

  const groupEntries = Object.entries(grouped).sort(([a], [b]) => subjectIndex(a) - subjectIndex(b))

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* 헤더 */}
      <header className="bg-blue-700 text-white py-6 px-6 shadow">
        <div className="max-w-5xl mx-auto">
          <p className="text-sm text-blue-200 mb-1">세광고등학교 | 2026학년도 2학기</p>
          <h1 className="text-2xl font-bold">충북 온라인학교 수강 희망과목 조사 안내</h1>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        {/* 탭 */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {(['안내', '개설형', '주문형'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 text-sm font-medium rounded-t-md transition-colors ${
                tab === t
                  ? 'bg-blue-700 text-white'
                  : 'text-gray-600 hover:text-blue-700 hover:bg-blue-50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* 안내 탭 */}
        {tab === '안내' && (
          <div className="space-y-6">
            <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-blue-700 mb-3">온라인 교육과정이란?</h2>
              <p className="text-gray-700 leading-relaxed">
                학생들이 소속 학교에 개설되지 않은 과목을 선택하여 이수할 수 있도록 하는 제도입니다.
              </p>
              <p className="text-gray-700 leading-relaxed mt-2">
                정규 교과 시간 중 <strong className="underline">공강 시간</strong>에 실시간 원격 수업 혹은 대면 수업으로 실시합니다.
              </p>
              <p className="text-gray-700 leading-relaxed mt-2">
                정규 교육과정처럼 평가를 실시하여 성적이 산출되며 생활기록부 기재가 가능합니다.
              </p>
            </section>

            <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-blue-700 mb-3">수강 신청 기준</h2>
              <ul className="list-disc list-inside space-y-1.5 text-gray-700">
                <li>본교 교육과정에 편성되지 않은 과목</li>
                <li>본교 교육과정에 편성되어 있으나 수요 부족 등으로 개설되지 않은 과목</li>
                <li>위계가 있는 경우 선이수 교과를 이수한 경우에 한함<br />
                  <span className="text-sm text-gray-500 ml-4">예) 고급 물리학 수강 → 물리학 선이수 필요</span>
                </li>
              </ul>
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                수강인원 기준은 <strong>3명~15명</strong>이며, 충북 온라인 학교 및 본교 협의 결과에 따라 과목이 개설되지 않을 수도 있습니다.
              </div>
            </section>

            <div className="grid md:grid-cols-2 gap-4">
              <section
                onClick={() => setTab('개설형')}
                className="bg-white rounded-xl shadow-sm border border-blue-100 p-6 cursor-pointer hover:shadow-md transition-shadow"
              >
                <h2 className="text-lg font-bold text-blue-700 mb-2">개설형 교육과정</h2>
                <p className="text-gray-700 text-sm leading-relaxed">
                  충북 온라인 학교에서 이미 개설한 수업 중 희망하는 교과를 신청합니다.
                </p>
                <p className="text-blue-500 text-xs mt-3">→ 과목 목록 보기</p>
              </section>
              <section
                onClick={() => setTab('주문형')}
                className="bg-white rounded-xl shadow-sm border border-green-100 p-6 cursor-pointer hover:shadow-md transition-shadow"
              >
                <h2 className="text-lg font-bold text-green-700 mb-2">주문형 교육과정</h2>
                <p className="text-gray-700 text-sm leading-relaxed">
                  개설이 예정되지 않은 교과 중 희망하는 교과를 주문할 수 있습니다.
                </p>
                <p className="text-green-500 text-xs mt-3">→ 과목 목록 보기</p>
              </section>
            </div>

            <section className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h2 className="text-lg font-bold text-blue-800 mb-2">신청 방법</h2>
              <p className="text-gray-700">
                희망 과목 확인 후 <strong>담임 선생님께 신청</strong>하시면 됩니다.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                문의: 2층 3학년 교무실 이준희 선생님
              </p>
            </section>
          </div>
        )}

        {/* 개설형 탭 */}
        {tab === '개설형' && (
          <div>
            {/* 학년 선택 */}
            <div className="flex gap-3 mb-5">
              {(['3학년(2015)', '2학년(2022)', '1학년(2022)'] as Grade[]).map(g => (
                <button
                  key={g}
                  onClick={() => setGrade(g)}
                  className={`px-6 py-2.5 rounded-full text-base font-semibold border transition-colors ${
                    grade === g
                      ? 'bg-blue-700 text-white border-blue-700'
                      : 'text-gray-600 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <p className="text-gray-500 text-center py-16">해당하는 과목이 없습니다.</p>
            ) : (
              <div className="space-y-6">
                {groupEntries.map(([group, items]) => (
                  <div key={group}>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      {group}
                    </h3>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                      <table className="w-full text-sm table-fixed">
                        <colgroup>
                          <col style={{ width: '40%' }} />
                          <col style={{ width: '25%' }} />
                          <col style={{ width: '10%' }} />
                          <col style={{ width: '25%' }} />
                        </colgroup>
                        <thead className="bg-gray-50 text-gray-600">
                          <tr>
                            <th className="text-left px-4 py-2.5 font-medium">과목명</th>
                            <th className="text-center px-3 py-2.5 font-medium">과목 유형</th>
                            <th className="text-center px-3 py-2.5 font-medium">학점</th>
                            <th className="text-left px-3 py-2.5 font-medium">선이수과목</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {items.map(c => (
                            <tr key={c.id} className={`transition-colors ${c.is_school_opened ? 'bg-gray-50 opacity-70' : 'hover:bg-gray-50'}`}>
                              <td className="px-4 py-2.5 text-base whitespace-nowrap overflow-hidden text-ellipsis">
                                <span className={`font-medium ${c.is_school_opened ? 'text-gray-400' : 'text-gray-900'}`}>{c.course_name}</span>
                                {c.is_school_opened && (
                                  <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">학교 개설</span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                  {c.course_type ?? '-'}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-center text-gray-600">
                                {c.credits ?? '-'}
                              </td>
                              <td className="px-3 py-2.5 text-gray-500 text-xs">
                                {c.is_school_opened ? '신청 불가 (학교 개설 과목)' : (c.prerequisite ?? '-')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
              희망 과목 확인 후 <strong>담임 선생님께 신청</strong>해 주세요.
              문의: 2층 3학년 교무실 이준희 선생님
            </div>
          </div>
        )}

        {/* 주문형 탭 */}
        {tab === '주문형' && (
          <div>
            <div className="flex gap-3 mb-5">
              {(['2015', '2022'] as const).map(y => (
                <button
                  key={y}
                  onClick={() => setPdfYear(y)}
                  className={`px-6 py-2.5 rounded-full text-base font-semibold border transition-colors ${
                    pdfYear === y
                      ? 'bg-green-700 text-white border-green-700'
                      : 'text-gray-600 border-gray-300 hover:border-green-400'
                  }`}
                >
                  {y}교과
                </button>
              ))}
            </div>

            <iframe
              src={`/${pdfYear}교과.pdf`}
              className="w-full rounded-lg border border-gray-200"
              style={{ height: '800px' }}
            />

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
              희망 과목 확인 후 <strong>담임 선생님께 신청</strong>해 주세요.
              문의: 2층 3학년 교무실 이준희 선생님
            </div>
          </div>
        )}
      </main>

      <footer className="text-center text-sm text-gray-600 py-4 border-t border-gray-100 bg-white">
        세광고등학교 | 2026학년도 2학기 온라인 교육과정
        <span className="mx-2">·</span>
        <a href="/login" className="hover:text-blue-600 transition-colors">교사 로그인</a>
      </footer>
    </div>
  )
}
