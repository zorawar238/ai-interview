import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import InterviewWorkspace from './InterviewWorkspace'
import ReportExportActions from './ReportExportActions'
import { EvaluationResult } from '@/lib/validations/evaluation'
import { AdaptiveContext } from '@/lib/validations/interview'
import { getTargetQuestionCount } from '@/lib/adaptive/engine'
import { getCurrentUser, DEMO_USER } from '@/utils/auth'
import { mockDb } from '@/lib/storage/mockDb'
import { Interview, Question, Answer, Evaluation } from '@/types/database'

export default async function InterviewSessionPage(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ completed?: string; error?: string }>
}) {
  const { id } = await props.params
  const searchParams = await props.searchParams
  const user = await getCurrentUser()

  // 1. Fetch interview details with instant mockDb path for guest mode
  let interview: Interview | null = null
  let questions: Question[] = []
  let answers: Answer[] = []
  let evaluations: Evaluation[] = []

  if (user.id === DEMO_USER.id) {
    interview = mockDb.getInterviewById(id)
    if (interview) {
      questions = mockDb.getQuestionsByInterviewId(id)
      answers = mockDb.getAnswersByInterviewId(id)
      evaluations = mockDb.getEvaluationsByInterviewId(id)
    }
  }

  if (!interview) {
    const supabase = await createClient()
    try {
      const { data: interviewData, error: interviewError } = await supabase
        .from('interviews')
        .select('*')
        .eq('id', id)
        .single()

      if (interviewData && !interviewError) {
        interview = interviewData as Interview
      }
    } catch {}

    if (!interview) {
      interview = mockDb.getInterviewById(id)
    }

    if (!interview) {
      redirect('/dashboard')
    }

    // 2. Fetch questions for this interview
    try {
      const { data: rawQuestions } = await supabase
        .from('questions')
        .select('*')
        .eq('interview_id', id)
        .order('position', { ascending: true })

      if (rawQuestions && rawQuestions.length > 0) {
        questions = rawQuestions as Question[]
      }
    } catch {}

    if (questions.length === 0) {
      questions = mockDb.getQuestionsByInterviewId(id)
    }

    // 3. Fetch existing answers & evaluations
    try {
      const { data: rawAnswers } = await supabase
        .from('answers')
        .select('*')
        .eq('interview_id', id)

      if (rawAnswers && rawAnswers.length > 0) {
        answers = rawAnswers as Answer[]
      }
    } catch {}

    if (answers.length === 0) {
      answers = mockDb.getAnswersByInterviewId(id)
    }

    try {
      const { data: rawEvaluations } = await supabase
        .from('evaluations')
        .select('*')
        .eq('interview_id', id)

      if (rawEvaluations && rawEvaluations.length > 0) {
        evaluations = rawEvaluations as Evaluation[]
      }
    } catch {}

    if (evaluations.length === 0) {
      evaluations = mockDb.getEvaluationsByInterviewId(id)
    }
  }

  const answeredQuestionIds = new Set(answers.map((a) => a.question_id))
  const answeredCount = answers.length

  // Calculate target questions and total questions dynamically
  let targetQuestions = 3
  let interviewMode: 'adaptive' | 'static' = 'adaptive'
  if (questions.length > 0 && questions[0].rubric) {
    try {
      const parsed = JSON.parse(questions[0].rubric)
      if (typeof parsed.targetQuestions === 'number') {
        targetQuestions = parsed.targetQuestions
      }
      if (parsed.interviewMode) {
        interviewMode = parsed.interviewMode
      }
    } catch {}
  } else if (interview.duration_minutes) {
    targetQuestions = getTargetQuestionCount(interview.duration_minutes)
  }

  const totalQuestions = Math.max(targetQuestions, questions.length)

  // 4. Find the first unanswered question
  const currentQuestion = (questions || []).find((q) => !answeredQuestionIds.has(q.id))
  const isCompleted =
    interview.status === 'completed' ||
    searchParams.completed === 'true' ||
    (answeredCount >= totalQuestions && totalQuestions > 0)

  // Calculate aggregate score
  const validScores = (evaluations || []).map((e) => e.score).filter((s): s is number => typeof s === 'number')
  const averageScore = validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : null

  // =========================================================================
  // View A: Interview Completed Screen
  // =========================================================================
  if (isCompleted) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white p-6 sm:p-12 print-page">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-zinc-800">
            <div>
              <span className="text-xs uppercase tracking-wider text-emerald-400 font-semibold px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/60 font-mono">
                Completed • {interviewMode === 'adaptive' ? 'Adaptive Session' : 'Standard Session'}
              </span>
              <h1 className="text-3xl font-bold mt-3 text-white">Interview Performance Report</h1>
              <p className="text-zinc-400 text-sm mt-1">
                Role: <strong className="text-white">{interview.role}</strong> ({interview.experience_level}) • Difficulty: {interview.difficulty}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <ReportExportActions
                interview={{
                  id: interview.id,
                  role: interview.role,
                  experience_level: interview.experience_level,
                  difficulty: interview.difficulty,
                  duration_minutes: interview.duration_minutes,
                  interview_mode: interviewMode,
                  created_at: interview.created_at,
                }}
                questions={questions}
                answers={answers}
                evaluations={evaluations}
                averageScore={averageScore}
              />
              <Link
                href="/dashboard"
                className="no-print px-4 py-2 text-sm font-medium rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition-all border border-zinc-700/80"
              >
                Dashboard
              </Link>
            </div>
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
                  Evaluated across {questions.length} questions by your local AI interviewer based on technical accuracy, edge-case consideration, and communication.
                </p>
              </div>

              <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 min-w-[130px]">
                <span className="text-4xl font-extrabold text-indigo-400">{averageScore}</span>
                <span className="text-xs text-zinc-500 font-medium uppercase mt-1">Score / 100</span>
              </div>
            </div>
          )}

          {/* Adaptive Calibration Trajectory Breakdown */}
          {questions.length > 0 && (
            <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-white">⚡ Adaptive Calibration Path</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-mono">
                    Real-time AI Adjustment
                  </span>
                </div>
                <span className="text-xs text-zinc-400 font-mono">
                  {questions.length} Calibrated Steps
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
                {questions.map((q, qIdx) => {
                  const ans = (answers || []).find((a) => a.question_id === q.id)
                  const ev = ans ? (evaluations || []).find((e) => e.answer_id === ans.id) : null
                  let qContext: AdaptiveContext | null = null
                  try {
                    if (q.rubric) {
                      const parsed = JSON.parse(q.rubric)
                      qContext = parsed.adaptiveContext || null
                    }
                  } catch {}

                  const isLevelUp = qContext?.adaptationType === 'level_up'
                  const isScaffold = qContext?.adaptationType === 'scaffold'

                  return (
                    <div
                      key={q.id}
                      className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-2.5 flex flex-col justify-between"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-zinc-300 font-mono">Phase {qIdx + 1}</span>
                          <span
                            className={`px-2 py-0.5 rounded uppercase font-mono text-[10px] border ${
                              q.difficulty === 'hard'
                                ? 'bg-red-950/60 text-red-300 border-red-800/60'
                                : q.difficulty === 'medium'
                                ? 'bg-indigo-950/60 text-indigo-300 border-indigo-800/60'
                                : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                            }`}
                          >
                            {q.difficulty}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-white truncate">{q.topic}</p>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-zinc-850 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-400">Score:</span>
                          <span className="font-mono font-bold text-indigo-300">
                            {ev?.score !== null && ev?.score !== undefined ? `${ev.score}/100` : '—'}
                          </span>
                        </div>
                        {qContext && (
                          <div className="text-[11px] text-zinc-400 leading-snug">
                            {isLevelUp && <span className="text-emerald-400 font-semibold block">↗ Scaled Up Challenge</span>}
                            {isScaffold && <span className="text-amber-400 font-semibold block">🛡️ Targeted Scaffolding</span>}
                            {!isLevelUp && !isScaffold && <span className="text-indigo-400 font-semibold block">🎯 Baseline Challenge</span>}
                            <span className="line-clamp-2 mt-0.5">{qContext.rationale}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
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
                  className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-5 print-card"
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
                  <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold block">
                        Your Submitted Answer:
                      </span>
                      {matchedAnswer?.answer_text?.includes('Candidate Speech Delivery Telemetry') && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/80 flex items-center gap-1">
                          <span>🎙️</span>
                          <span>Live Verbal Session</span>
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed">
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
  let currentAdaptiveContext: AdaptiveContext | null = null

  if (currentQuestion?.rubric) {
    try {
      const parsed = JSON.parse(currentQuestion.rubric)
      if (Array.isArray(parsed.hints)) {
        hints = parsed.hints
      }
      if (parsed.adaptiveContext) {
        currentAdaptiveContext = parsed.adaptiveContext
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

        {/* Interactive Workspace with Live Oral Discussion / Monaco Editor, Timer, Hints & Adaptive Calibration */}
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
            adaptiveContext={currentAdaptiveContext}
            durationMinutes={interview.duration_minutes || 30}
            role={interview.role}
            interviewFormat={interview.interview_format || (currentQuestion.type === 'coding' ? 'coding' : 'conversational')}
            questionType={currentQuestion.type}
            resumeText={interview.resume_text || null}
          />
        )}
      </div>
    </div>
  )
}
