-- 학생 테이블
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  student_id varchar(10) unique not null,  -- 학번 (30101, 20305)
  name varchar(50) not null,
  gender varchar(5),
  cohort_year int not null,               -- 입학년도 2024/2025
  grade int not null,                      -- 현재 학년 2/3
  class_number int not null,              -- 반 1~9
  track varchar(20),                       -- 과정
  created_at timestamptz default now()
);

-- 학교 편제 과목 (편제 O, 개설 여부 포함)
create table if not exists school_courses (
  id uuid primary key default gen_random_uuid(),
  course_name varchar(100) not null,
  course_type varchar(20),                -- 공통/일반/진로
  cohort_year int not null,               -- 2024/2025
  curriculum_revision int not null,       -- 2015/2022
  is_opened boolean not null default false  -- 수강생 >= 1이면 true
);

-- 학생별 이수 과목
create table if not exists student_completed_courses (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  course_name varchar(100) not null,
  course_category varchar(20),            -- 공통/선택
  grade int,                              -- 이수 학년
  semester int                            -- 이수 학기
);

-- 온라인 교과 목록 (개설형 + 주문형)
create table if not exists online_courses (
  id uuid primary key default gen_random_uuid(),
  course_name varchar(100) not null,
  subject_group varchar(50),              -- 교과(군): 수학, 국어 등
  course_type varchar(30),               -- 공통/일반/진로선택/융합선택
  credits int,
  curriculum_revision int not null,      -- 2015/2022
  offering_type varchar(10) not null,    -- '개설형' | '주문형'
  prerequisite varchar(200),
  available_grade int,                    -- 개설 학년 (1/2, null이면 무관)
  available_semester int,                -- 개설 학기 (null이면 1,2학기 모두)
  created_at timestamptz default now()
);

-- 수강 신청 접수
create table if not exists registrations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  online_course_id uuid not null references online_courses(id) on delete cascade,
  offering_type varchar(10) not null,    -- '개설형' | '주문형'
  registered_by varchar(10) not null,    -- 담임 교사 코드 (sk201 등)
  status varchar(10) not null default '접수',  -- '접수' | '취소'
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(student_id, online_course_id)
);

-- 교사 계정
create table if not exists teachers (
  id uuid primary key default gen_random_uuid(),
  teacher_code varchar(10) unique not null,  -- sk000, sk200, sk201...
  role varchar(20) not null,                  -- 'admin' | 'year_head' | 'homeroom'
  grade int,                                  -- 2 or 3 (year_head/homeroom)
  class_number int,                           -- 1~9 (homeroom만)
  auth_user_id uuid,                          -- Supabase Auth UID (나중에 연결)
  created_at timestamptz default now()
);

-- 인덱스
create index if not exists idx_students_grade_class on students(grade, class_number);
create index if not exists idx_student_completed_student_id on student_completed_courses(student_id);
create index if not exists idx_registrations_student_id on registrations(student_id);
create index if not exists idx_registrations_registered_by on registrations(registered_by);
create index if not exists idx_online_courses_curriculum on online_courses(curriculum_revision, offering_type);

-- updated_at 자동 갱신 함수
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger registrations_updated_at
  before update on registrations
  for each row execute function update_updated_at();

-- 교사 계정 시드
insert into teachers (teacher_code, role, grade, class_number) values
  ('sk000', 'admin', null, null),
  ('sk200', 'year_head', 2, null),
  ('sk300', 'year_head', 3, null),
  ('sk201', 'homeroom', 2, 1),
  ('sk202', 'homeroom', 2, 2),
  ('sk203', 'homeroom', 2, 3),
  ('sk204', 'homeroom', 2, 4),
  ('sk205', 'homeroom', 2, 5),
  ('sk206', 'homeroom', 2, 6),
  ('sk207', 'homeroom', 2, 7),
  ('sk208', 'homeroom', 2, 8),
  ('sk209', 'homeroom', 2, 9),
  ('sk301', 'homeroom', 3, 1),
  ('sk302', 'homeroom', 3, 2),
  ('sk303', 'homeroom', 3, 3),
  ('sk304', 'homeroom', 3, 4),
  ('sk305', 'homeroom', 3, 5),
  ('sk306', 'homeroom', 3, 6),
  ('sk307', 'homeroom', 3, 7),
  ('sk308', 'homeroom', 3, 8),
  ('sk309', 'homeroom', 3, 9)
on conflict (teacher_code) do nothing;
