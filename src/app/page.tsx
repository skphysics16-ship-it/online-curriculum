import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { OnlineCourse } from '@/types'
import PublicPageClient from '@/components/PublicPageClient'

export const revalidate = 3600

export default async function HomePage() {
  const supabase = await createServerSupabaseClient()

  const { data: courses2015 } = await supabase
    .from('online_courses')
    .select('*')
    .eq('curriculum_revision', 2015)
    .order('offering_type')
    .order('subject_group')
    .order('course_name')

  const { data: courses2022 } = await supabase
    .from('online_courses')
    .select('*')
    .eq('curriculum_revision', 2022)
    .order('offering_type')
    .order('subject_group')
    .order('course_name')

  return (
    <PublicPageClient
      courses2015={(courses2015 ?? []) as OnlineCourse[]}
      courses2022={(courses2022 ?? []) as OnlineCourse[]}
    />
  )
}
