import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Interview, Evaluation, Question } from '@/types/database'
import DashboardAnalytics from './DashboardAnalytics'
import { getCurrentUser, DEMO_USER } from '@/utils/auth'
import { mockDb } from '@/lib/storage/mockDb'

export default async function DashboardPage() {
  const user = await getCurrentUser()

  let interviewList: Interview[] = []
  let evaluations: Evaluation[] = []
  let questions: Question[] = []

  // If in guest bypass mode, immediately load from local mockDb for instant sub-millisecond rendering
  if (user.id === DEMO_USER.id) {
    interviewList = mockDb.getInterviews(user.id)
    const interviewIds = interviewList.map((i) => i.id)
    if (interviewIds.length > 0) {
      evaluations = mockDb.getEvaluationsByInterviewIds(interviewIds)
      questions = mockDb.getQuestionsByInterviewIds(interviewIds)
    }
  } else {
    const supabase = await createClient()

    // 1. Fetch candidate's interviews from Supabase with mockDb fallback
    try {
      const { data: interviews = [], error: dbError } = await supabase
        .from('interviews')
        .select('*')
        .order('created_at', { ascending: false })

      if (interviews && interviews.length > 0 && !dbError) {
        interviewList = interviews as Interview[]
      }
    } catch {
      // Supabase unreachable
    }

    if (interviewList.length === 0) {
      interviewList = mockDb.getInterviews(user.id)
    }

    const interviewIds = interviewList.map((i) => i.id)

    // 2. Fetch all evaluations for candidate's interviews
    if (interviewIds.length > 0) {
      try {
        const { data: evalData } = await supabase
          .from('evaluations')
          .select('*')
          .in('interview_id', interviewIds)

        if (evalData && evalData.length > 0) {
          evaluations = evalData as Evaluation[]
        }
      } catch {}

      if (evaluations.length === 0) {
        evaluations = mockDb.getEvaluationsByInterviewIds(interviewIds)
      }

      try {
        const { data: questionData } = await supabase
          .from('questions')
          .select('*')
          .in('interview_id', interviewIds)

        if (questionData && questionData.length > 0) {
          questions = questionData as Question[]
        }
      } catch {}

      if (questions.length === 0) {
        questions = mockDb.getQuestionsByInterviewIds(interviewIds)
      }
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 sm:p-12">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-8 border-b border-zinc-800">
          <div>
            <span className="text-xs uppercase tracking-wider text-indigo-400 font-semibold px-2.5 py-1 rounded-full bg-indigo-950/60 border border-indigo-800/60 font-mono">
              Candidate Workspace
            </span>
            <h1 className="text-3xl font-bold mt-2 text-white">Interview Dashboard & Analytics</h1>
            <p className="text-zinc-400 text-sm mt-1">Logged in as {user.email}</p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/interview/new"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all text-sm flex items-center gap-2 cursor-pointer"
            >
              + Start New Interview
            </Link>
            <form action="/auth/signout" method="post">
              <button className="px-4 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-all cursor-pointer">
                Sign out
              </button>
            </form>
          </div>
        </header>

        {/* Analytics & History Component */}
        <DashboardAnalytics
          interviews={interviewList}
          evaluations={evaluations}
          questions={questions}
          dbError={false}
        />
      </div>
    </div>
  )
}
