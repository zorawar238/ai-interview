import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { submitAnswerAction } from '../actions'

export default async function InterviewSessionPage(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ completed?: string; error?: string }>
}) {
  const { id } = await props.params
  const searchParams = await props.searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 1. Fetch interview details
  const { data: interview, error: interviewError } = await supabase
    .from('interviews')
    .select('*')
    .eq('id', id)
    .single()

  if (interviewError || !interview) {
    redirect('/dashboard')
  }

  // 2. Fetch questions for this interview
  const { data: questions = [] } = await supabase
    .from('questions')
    .select('*')
    .eq('interview_id', id)
    .order('position', { ascending: true })

  // 3. Fetch existing answers
  const { data: answers = [] } = await supabase
    .from('answers')
    .select('*')
    .eq('interview_id', id)

  const answeredQuestionIds = new Set((answers || []).map((a) => a.question_id))
  const answeredCount = answers ? answers.length : 0
  const totalQuestions = questions ? questions.length : 0

  // 4. Find the first unanswered question
  const currentQuestion = (questions || []).find((q) => !answeredQuestionIds.has(q.id))
  const isCompleted = interview.status === 'completed' || searchParams.completed === 'true' || (!currentQuestion && totalQuestions > 0)

  // =========================================================================
  // View A: Interview Completed Screen
  // =========================================================================
  if (isCompleted) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white p-6 sm:p-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center justify-between pb-6 border-b border-zinc-800">
            <div>
              <span className="text-xs uppercase tracking-wider text-emerald-400 font-semibold px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/60">
                Completed
              </span>
              <h1 className="text-3xl font-bold mt-3 text-white">Interview Summary</h1>
              <p className="text-zinc-400 text-sm mt-1">
                Role: <strong className="text-white">{interview.role}</strong> ({interview.experience_level}) • Difficulty: {interview.difficulty}
              </p>
            </div>
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm font-medium rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition-all border border-zinc-700/80"
            >
              Return to Dashboard
            </Link>
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-zinc-200">Questions & Submitted Answers</h2>
            {(questions || []).map((q, idx) => {
              const matchedAnswer = (answers || []).find((a) => a.question_id === q.id)
              return (
                <div
                  key={q.id}
                  className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-800 text-indigo-300">
                      Question {idx + 1} • {q.topic}
                    </span>
                    <span className="text-xs text-zinc-500 uppercase">{q.difficulty}</span>
                  </div>

                  <p className="text-base text-zinc-200 font-medium leading-relaxed">
                    {q.prompt}
                  </p>

                  <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-4">
                    <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold block mb-2">
                      Your Answer:
                    </span>
                    <p className="text-sm text-zinc-300 whitespace-pre-wrap font-mono">
                      {matchedAnswer ? matchedAnswer.answer_text : 'No answer recorded.'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // =========================================================================
  // View B: Active Question Answering Screen
  // =========================================================================
  const questionNumber = currentQuestion ? currentQuestion.position : 1

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 sm:p-12">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header / Meta */}
        <div className="flex items-center justify-between pb-6 border-b border-zinc-800">
          <div>
            <span className="text-xs uppercase tracking-wider text-indigo-400 font-semibold px-2.5 py-1 rounded-full bg-indigo-950/60 border border-indigo-800/60">
              {interview.role} ({interview.experience_level})
            </span>
            <h1 className="text-2xl font-bold mt-2 text-white">
              Question {questionNumber} of {totalQuestions}
            </h1>
          </div>
          <Link
            href="/dashboard"
            className="text-xs text-zinc-400 hover:text-white transition-colors"
          >
            Exit to Dashboard
          </Link>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800">
          <div
            className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%`,
            }}
          />
        </div>

        {searchParams?.error && (
          <div className="rounded-xl bg-red-950/40 p-4 border border-red-800/60 text-red-200 text-sm flex gap-3 items-start">
            <span className="text-red-400 font-bold">Notice:</span>
            <span>{searchParams.error}</span>
          </div>
        )}

        {/* Current Question Card */}
        {currentQuestion && (
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-zinc-800 text-indigo-300 border border-zinc-700/60">
                {currentQuestion.topic}
              </span>
              <span className="text-xs uppercase text-zinc-400 tracking-wider">
                Difficulty: <strong className="text-zinc-200">{currentQuestion.difficulty}</strong>
              </span>
            </div>

            <div className="space-y-2">
              <h2 className="text-lg sm:text-xl font-medium text-white leading-relaxed">
                {currentQuestion.prompt}
              </h2>
            </div>

            {/* Answer Form */}
            <form action={submitAnswerAction} className="space-y-4 pt-4 border-t border-zinc-800/80">
              <input type="hidden" name="interviewId" value={interview.id} />
              <input type="hidden" name="questionId" value={currentQuestion.id} />

              <div>
                <label htmlFor="answerText" className="block text-sm font-medium text-zinc-300 mb-2">
                  Your Answer or Solution:
                </label>
                <textarea
                  id="answerText"
                  name="answerText"
                  rows={8}
                  required
                  placeholder="Type your explanation, architectural tradeoffs, or code solution here..."
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-zinc-600 resize-y"
                />
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-xs text-zinc-500">
                  Take your time to structure your thoughts clearly.
                </span>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-white shadow-md shadow-indigo-600/20 transition-all text-sm flex items-center gap-2"
                >
                  {questionNumber === totalQuestions ? 'Submit & Finish Interview' : 'Submit & Next Question →'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
