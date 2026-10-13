'use client'

import React, { useState, useEffect, useTransition } from 'react'
import dynamic from 'next/dynamic'
import { submitAnswerAction } from '../actions'

// Dynamically import Monaco Editor to avoid SSR window errors
const Editor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] w-full flex flex-col items-center justify-center bg-zinc-950 text-zinc-500 font-mono text-xs border border-zinc-800 rounded-xl space-y-2">
      <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <span>Initializing Monaco Code Editor...</span>
    </div>
  ),
})

interface InterviewWorkspaceProps {
  interviewId: string
  questionId: string
  questionNumber: number
  totalQuestions: number
  topic: string
  difficulty: string
  prompt: string
  hints: string[]
  durationMinutes: number
}

const LANGUAGE_TEMPLATES: Record<string, string> = {
  typescript: `// TypeScript Solution
// Write your types, implementation, and edge-case handling:

function solution() {
  // TODO: Implement solution
}
`,
  javascript: `// JavaScript Solution
// Write your implementation and edge-case handling:

function solution() {
  // TODO: Implement solution
}
`,
  python: `# Python Solution
# Write your implementation and edge-case handling:

def solution():
    # TODO: Implement solution
    pass
`,
  sql: `-- PostgreSQL Query / Schema Design
-- Write your SQL query or table constraints below:

SELECT 
    * 
FROM 
    your_table;
`,
}

export default function InterviewWorkspace({
  interviewId,
  questionId,
  questionNumber,
  totalQuestions,
  topic,
  difficulty,
  prompt,
  hints,
  durationMinutes,
}: InterviewWorkspaceProps) {
  // 1. Editor State
  const initialLanguage = topic.toLowerCase().includes('sql') ? 'sql' : 'typescript'
  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage)
  const [code, setCode] = useState(LANGUAGE_TEMPLATES[initialLanguage] || LANGUAGE_TEMPLATES.typescript)
  const [textNotes, setTextNotes] = useState('')
  const [activeTab, setActiveTab] = useState<'code' | 'notes'>('code')

  // 2. Hints State
  const [revealedHintsCount, setRevealedHintsCount] = useState(0)
  const [isHintsOpen, setIsHintsOpen] = useState(false)

  // 3. Timer State
  const [secondsRemaining, setSecondsRemaining] = useState(durationMinutes * 60)
  const [isTimerPaused, setIsTimerPaused] = useState(false)

  // 4. Submission Transition State
  const [isPending, startTransition] = useTransition()

  // Countdown timer effect
  useEffect(() => {
    if (isTimerPaused || secondsRemaining <= 0) return

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)

    return () => clearInterval(interval)
  }, [isTimerPaused, secondsRemaining])

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60)
    const secs = totalSecs % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Handle language switch
  const handleLanguageChange = (newLang: string) => {
    setSelectedLanguage(newLang)
    if (code.trim() === '' || Object.values(LANGUAGE_TEMPLATES).some((t) => t.trim() === code.trim())) {
      setCode(LANGUAGE_TEMPLATES[newLang] || '// Write your solution here')
    }
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // Aggregate code and architectural notes into combined answer text
    let combinedAnswer = ''
    if (code.trim()) {
      combinedAnswer += `\`\`\`${selectedLanguage}\n${code.trim()}\n\`\`\`\n`
    }
    if (textNotes.trim()) {
      combinedAnswer += `\n### Architecture / Explanation Notes:\n${textNotes.trim()}`
    }

    if (!combinedAnswer.trim()) {
      alert('Please enter an answer or code solution before submitting.')
      return
    }

    const formData = new FormData()
    formData.append('interviewId', interviewId)
    formData.append('questionId', questionId)
    formData.append('answerText', combinedAnswer.trim())

    startTransition(async () => {
      await submitAnswerAction(formData)
    })
  }

  const isLowTime = secondsRemaining <= 300 // 5 minutes or less
  const isCriticalTime = secondsRemaining <= 60 // 1 minute or less

  return (
    <div className="space-y-6">
      {/* Question Card & Live Timer Bar */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-5 backdrop-blur-sm shadow-xl">
        {/* Top Info Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-zinc-800 text-indigo-300 border border-zinc-700/60 font-mono">
              {topic}
            </span>
            <span className="text-xs uppercase text-zinc-400 font-mono tracking-wider">
              Difficulty: <strong className="text-zinc-200">{difficulty}</strong>
            </span>
          </div>

          {/* Real-time Timer Badge */}
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all ${
                isCriticalTime
                  ? 'bg-red-950/80 text-red-300 border-red-700 animate-pulse'
                  : isLowTime
                  ? 'bg-amber-950/70 text-amber-300 border-amber-700'
                  : 'bg-zinc-950 text-indigo-300 border-zinc-800'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isCriticalTime ? 'bg-red-400' : isLowTime ? 'bg-amber-400' : 'bg-indigo-400'}`} />
              <span>{formatTime(secondsRemaining)}</span>
              <button
                type="button"
                onClick={() => setIsTimerPaused(!isTimerPaused)}
                className="text-[10px] text-zinc-400 hover:text-white underline ml-1 cursor-pointer"
                title={isTimerPaused ? 'Resume Timer' : 'Pause Timer'}
              >
                {isTimerPaused ? '▶ Resume' : '⏸ Pause'}
              </button>
            </div>
          </div>
        </div>

        {/* Question Prompt */}
        <div className="space-y-2">
          <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider block">
            Problem Scenario
          </span>
          <h2 className="text-base sm:text-lg font-medium text-white leading-relaxed">
            {prompt}
          </h2>
        </div>

        {/* Progressive Hints Drawer */}
        {hints && hints.length > 0 && (
          <div className="pt-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 overflow-hidden">
              <button
                type="button"
                onClick={() => setIsHintsOpen(!isHintsOpen)}
                className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/60 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span>💡 Progressive Hints</span>
                  <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-[10px] text-indigo-300 font-mono">
                    {revealedHintsCount} of {hints.length} revealed
                  </span>
                </div>
                <span>{isHintsOpen ? '▲ Collapse' : '▼ Expand'}</span>
              </button>

              {isHintsOpen && (
                <div className="p-4 border-t border-zinc-800/80 space-y-3 bg-zinc-950/80">
                  {hints.slice(0, revealedHintsCount).map((hint, hIdx) => (
                    <div
                      key={hIdx}
                      className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-900/40 text-xs text-indigo-200 leading-relaxed"
                    >
                      <strong className="text-indigo-400 font-mono mr-1.5">Hint {hIdx + 1}:</strong>
                      {hint}
                    </div>
                  ))}

                  {revealedHintsCount < hints.length ? (
                    <button
                      type="button"
                      onClick={() => setRevealedHintsCount((prev) => prev + 1)}
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-indigo-300 border border-zinc-700 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Unlock Hint {revealedHintsCount + 1}</span>
                      <span className="text-[10px] text-zinc-400">(Incur minimal score penalty)</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-zinc-500 font-mono block">
                      All available hints revealed.
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Editor & Notes Workspace */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* Workspace Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-zinc-950/80 border-b border-zinc-800/80">
          {/* View Toggles */}
          <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'code'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>{`{ }`}</span>
              <span>Monaco Code IDE</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('notes')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'notes'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>📝</span>
              <span>Architecture & Trade-offs</span>
            </button>
          </div>

          {/* Language Selector (Active in Code Mode) */}
          {activeTab === 'code' && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-zinc-500">Language:</span>
              <select
                value={selectedLanguage}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              >
                <option value="typescript">TypeScript</option>
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="sql">SQL</option>
              </select>
            </div>
          )}
        </div>

        {/* Tab 1: Monaco Code Editor */}
        {activeTab === 'code' && (
          <div className="relative">
            <Editor
              height="440px"
              language={selectedLanguage}
              value={code}
              theme="vs-dark"
              onChange={(val) => setCode(val || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: "var(--font-geist-mono), 'Fira Code', monospace",
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 12, bottom: 12 },
                bracketPairColorization: { enabled: true },
                wordWrap: 'on',
              }}
            />
          </div>
        )}

        {/* Tab 2: Architecture & Trade-offs Text Notes */}
        {activeTab === 'notes' && (
          <div className="p-4 space-y-2 bg-zinc-950/60">
            <span className="text-xs text-zinc-400 block">
              Describe your design, time/space complexity ($O(N)$), trade-offs, and failure recovery:
            </span>
            <textarea
              rows={16}
              value={textNotes}
              onChange={(e) => setTextNotes(e.target.value)}
              placeholder="Explain your approach, system boundaries, race condition handling, or complexity analysis here..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-zinc-600 resize-y"
            />
          </div>
        )}

        {/* Action / Submit Footer */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 bg-zinc-950/90 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-zinc-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Both code and architectural notes are evaluated together by local Ollama.</span>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 disabled:cursor-not-allowed font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            {isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Evaluating with Ollama AI...</span>
              </>
            ) : questionNumber === totalQuestions ? (
              'Submit & Finish Interview'
            ) : (
              'Submit & Next Question →'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
