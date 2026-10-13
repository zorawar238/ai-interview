import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import InterviewWorkspace from './InterviewWorkspace'
import { EvaluationResult } from '@/lib/validations/evaluation'

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

  // 3. Fetch existing answers & evaluations
  const { data: answers = [] } = await supabase
    .from('answers')
    .select('*')
    .eq('interview_id', id)

  const { data: evaluations = [] } = await supabase
    .from('evaluations')
    .select('*')
    .eq('interview_id', id)

  const answeredQuestionIds = new Set((answers || []).map((a) => a.question_id))
  const answeredCount = answers ? answers.length : 0
  const totalQuestions = questions ? questions.length : 0

  // 4. Find the first unanswered question
  const currentQuestion = (questions || []).find((q) => !answeredQuestionIds.has(q.id))
  const isCompleted = interview.status === 'completed' || searchParams.completed === 'true' || (!currentQuestion && totalQuestions > 0)

  // Calculate aggregate score
  const validScores = (evaluations || []).map((e) => e.score).filter((s): s is number => typeof s === 'number')
  const averageScore = validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : null

  // =========================================================================
  // View A: Interview Completed Screen
  // =========================================================================
  if (isCompleted) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white p-6 sm:p-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-zinc-800">
            <div>
              <span className="text-xs uppercase tracking-wider text-emerald-400 font-semibold px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/60">
                Completed
              </span>
              <h1 className="text-3xl font-bold mt-3 text-white">Interview Performance Report</h1>
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

          {/* Aggregate Performance Overview Card */}
          {averageScore !== null && (
            <div className="bg-gradient-to-br from-indigo-950/40 via-zinc-900/60 to-zinc-900/80 border border-indigo-900/40 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <span className="text-xs uppercase tracking-wider text-indigo-400 font-semibold">
                  Overall Assessment
                </span>
                <h3 className="text-2xl font-bold text-white mt-1">
                  {averageScore >= 85
                    ? 'Exceptional Performance'
                    : averageScore >= 70
                    ? 'Strong Candidate'
                    : averageScore >= 55
                    ? 'Borderline — Needs Targeted Practice'
                    : 'Foundational Gaps Identified'}
                </h3>
                <p className="text-sm text-zinc-400 mt-2 max-w-xl">
                  Evaluated across {totalQuestions} questions by your local AI interviewer based on technical accuracy, edge-case consideration, and communication.
                </p>
              </div>

              <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 min-w-[130px]">
                <span className="text-4xl font-extrabold text-indigo-400">{averageScore}</span>
                <span className="text-xs text-zinc-500 font-medium uppercase mt-1">Score / 100</span>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-zinc-200">Question-by-Question Breakdown</h2>
            {(questions || []).map((q, idx) => {
              const matchedAnswer = (answers || []).find((a) => a.question_id === q.id)
              const matchedEvaluation = matchedAnswer ? (evaluations || []).find((e) => e.answer_id === matchedAnswer.id) : null

              let parsedDetails: Partial<EvaluationResult> | null = null
              if (matchedEvaluation?.feedback) {
                try {
                  parsedDetails = JSON.parse(matchedEvaluation.feedback) as Partial<EvaluationResult>
                } catch {
                  parsedDetails = { feedback: matchedEvaluation.feedback }
                }
              }

              return (
                <div
                  key={q.id}
                  className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-5"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-zinc-800 text-indigo-300">
                      Question {idx + 1} • {q.topic}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500 uppercase">{q.difficulty}</span>
                      {matchedEvaluation?.score !== null && matchedEvaluation?.score !== undefined && (
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/80">
                          {matchedEvaluation.score}/100
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-base text-zinc-200 font-medium leading-relaxed">
                    {q.prompt}
                  </p>

                  {/* Candidate's Answer */}
                  <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-4">
                    <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold block mb-2">
                      Your Submitted Answer:
                    </span>
                    <p className="text-sm text-zinc-300 whitespace-pre-wrap font-mono">
                      {matchedAnswer ? matchedAnswer.answer_text : 'No answer recorded.'}
                    </p>
                  </div>

                  {/* AI Evaluation Assessment */}
                  {parsedDetails && (
                    <div className="bg-zinc-950/50 border border-indigo-950/60 rounded-xl p-5 space-y-4">
                      <div>
                        <span className="text-xs uppercase tracking-wider text-indigo-400 font-semibold block mb-1">
                          AI Evaluator Feedback:
                        </span>
                        <p className="text-sm text-zinc-300 leading-relaxed">
                          {parsedDetails.feedback}
                        </p>
                      </div>

                      {/* Strengths */}
                      {Array.isArray(parsedDetails.strengths) && parsedDetails.strengths.length > 0 && (
                        <div>
                          <span className="text-xs font-semibold text-emerald-400 block mb-1.5">
                            Key Strengths:
                          </span>
                          <ul className="list-disc list-inside space-y-1 text-xs text-zinc-300">
                            {parsedDetails.strengths.map((str: string, sIdx: number) => (
                              <li key={sIdx}>{str}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Areas for Improvement */}
                      {Array.isArray(parsedDetails.areasForImprovement) && parsedDetails.areasForImprovement.length > 0 && (
                        <div>
                          <span className="text-xs font-semibold text-amber-400 block mb-1.5">
                            Areas to Improve:
                          </span>
                          <ul className="list-disc list-inside space-y-1 text-xs text-zinc-300">
                            {parsedDetails.areasForImprovement.map((area: string, aIdx: number) => (
                              <li key={aIdx}>{area}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
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

  let hints: string[] = []
  if (currentQuestion?.rubric) {
    try {
      const parsed = JSON.parse(currentQuestion.rubric)
      if (Array.isArray(parsed.hints)) {
        hints = parsed.hints
      }
    } catch {
      // not JSON
    }
  }

  if (hints.length === 0 && currentQuestion) {
    hints = [
      `Consider edge cases specific to ${currentQuestion.topic} (e.g. empty collections, null checks, boundary conditions).`,
      `Analyze the time vs space trade-offs between a naive solution and an optimized approach.`,
    ]
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 sm:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header / Meta */}
        <div className="flex items-center justify-between pb-6 border-b border-zinc-800">
          <div>
            <span className="text-xs uppercase tracking-wider text-indigo-400 font-semibold px-2.5 py-1 rounded-full bg-indigo-950/60 border border-indigo-800/60 font-mono">
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

        {/* Interactive Workspace with Monaco Code Editor, Timer, & Hints */}
        {currentQuestion && (
          <InterviewWorkspace
            interviewId={interview.id}
            questionId={currentQuestion.id}
            questionNumber={questionNumber}
            totalQuestions={totalQuestions}
            topic={currentQuestion.topic}
            difficulty={currentQuestion.difficulty}
            prompt={currentQuestion.prompt}
            hints={hints}
            durationMinutes={interview.duration_minutes || 30}
          />
        )}
      </div>
    </div>
  )
}
