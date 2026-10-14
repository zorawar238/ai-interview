'use client'

import React, { useState, useEffect, useTransition, useRef } from 'react'
import dynamic from 'next/dynamic'
import { submitAnswerAction } from '../actions'
import { useWebSpeech } from '@/hooks/useWebSpeech'

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
  role?: string
  adaptiveContext?: {
    adaptationType: 'baseline' | 'level_up' | 'scaffold' | 'lateral'
    previousScore?: number
    previousVerdict?: string
    previousDifficulty?: string
    targetDifficulty?: string
    rationale: string
  } | null
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface ExecutionResult {
  status: 'success' | 'error' | 'timeout'
  stdout: string
  stderr: string
  exitCode: number | null
  executionTimeMs: number
}

const LANGUAGE_TEMPLATES: Record<string, string> = {
  typescript: `// TypeScript Solution
// Write your types, implementation, and test runner:

function solution(nums: number[], target: number): number[] {
  const map = new Map<number, number>();
  for (let i = 0; i < nums.length; i++) {
    const diff = target - nums[i];
    if (map.has(diff)) {
      return [map.get(diff)!, i];
    }
    map.set(nums[i], i);
  }
  return [];
}

// Test Run:
console.log("Two Sum [2, 7, 11, 15] target 9 ->", solution([2, 7, 11, 15], 9));
`,
  javascript: `// JavaScript Solution
// Write your implementation and test runner:

function solution(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const diff = target - nums[i];
    if (map.has(diff)) {
      return [map.get(diff), i];
    }
    map.set(nums[i], i);
  }
  return [];
}

// Test Run:
console.log("Two Sum [2, 7, 11, 15] target 9 ->", solution([2, 7, 11, 15], 9));
`,
  python: `# Python Solution
# Write your implementation and test runner:

def solution(nums: list[int], target: int) -> list[int]:
    lookup = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in lookup:
            return [lookup[diff], i]
        lookup[num] = i
    return []

# Test Run:
print("Two Sum [2, 7, 11, 15] target 9 ->", solution([2, 7, 11, 15], 9))
`,
  sql: `-- PostgreSQL / SQLite Query
-- Note: 'employees' table is pre-loaded:
-- columns: (id INTEGER, name TEXT, department TEXT, salary INTEGER)

SELECT 
    department, 
    COUNT(*) AS total_employees, 
    AVG(salary) AS avg_salary
FROM 
    employees
GROUP BY 
    department
ORDER BY 
    avg_salary DESC;
`,
}

async function executeCodeSandbox(payload: {
  language: string
  code: string
  stdin?: string
}): Promise<ExecutionResult> {
  const res = await fetch('/api/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}))
    throw new Error(errorJson.stderr || errorJson.error || 'Execution request failed')
  }
  return res.json()
}

function createChatMessage(role: 'user' | 'assistant', content: string): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
  }
}

async function streamChatResponse({
  messages,
  questionContext,
  currentCode,
  onChunk,
}: {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  questionContext: { role: string; topic: string; difficulty: string; prompt: string }
  currentCode: string
  onChunk: (accumulated: string) => void
}) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      questionContext,
      currentCode,
    }),
  })

  if (!response.ok || !response.body) {
    throw new Error('Failed to connect to AI interviewer stream.')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let accumulated = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    accumulated += chunk
    onChunk(accumulated)
  }
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
  role = 'Full-Stack Engineer',
  adaptiveContext,
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

  // 4. Live AI Chat State
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I am your technical interviewer for this ${role} session. Feel free to ask clarifying questions about problem constraints, assumptions, or discuss architectural trade-offs as you design your solution.`,
    },
  ])
  const [chatInput, setChatInput] = useState('')
  const [isChatStreaming, setIsChatStreaming] = useState(false)
  const chatMessagesEndRef = useRef<HTMLDivElement>(null)

  // 5. Code Execution State
  const [isRunningCode, setIsRunningCode] = useState(false)
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null)
  const [customStdin, setCustomStdin] = useState('')
  const [consoleTab, setConsoleTab] = useState<'output' | 'stdin'>('output')
  const [isConsoleOpen, setIsConsoleOpen] = useState(true)

  // 6. Submission Transition State
  const [isPending, startTransition] = useTransition()

  // 7. Web Speech (Audio Interviewer & Dictation)
  const [autoSpeakAssistant, setAutoSpeakAssistant] = useState(false)
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null)

  // Speech synthesis player for reading questions and assistant responses
  const speechPlayer = useWebSpeech()

  // Speech-to-text dictation for Architecture Notes
  const notesSpeech = useWebSpeech({
    onTranscript: (spokenText) => {
      setTextNotes((prev) => (prev ? `${prev} ${spokenText}` : spokenText))
    },
  })

  // Speech-to-text dictation for AI Interviewer Chat Input
  const chatSpeech = useWebSpeech({
    onTranscript: (spokenText) => {
      setChatInput((prev) => (prev ? `${prev} ${spokenText}` : spokenText))
    },
  })

  // Cleanly stop audio on unmount
  useEffect(() => {
    return () => {
      speechPlayer.stopSpeaking()
      notesSpeech.stopListening()
      chatSpeech.stopListening()
    }
  }, [speechPlayer, notesSpeech, chatSpeech])

  const handleToggleQuestionAudio = () => {
    if (speechPlayer.isSpeaking && speechPlayer.currentSpeakingText?.includes(prompt)) {
      speechPlayer.stopSpeaking()
    } else {
      speechPlayer.speak(`Question ${questionNumber} of ${totalQuestions} in ${topic}. ${prompt}`)
    }
  }

  const handleToggleMessageAudio = (msgId: string, content: string) => {
    if (speechPlayer.isSpeaking && speakingMessageId === msgId) {
      speechPlayer.stopSpeaking()
      setSpeakingMessageId(null)
    } else {
      setSpeakingMessageId(msgId)
      speechPlayer.speak(content, () => setSpeakingMessageId(null))
    }
  }

  // Countdown timer effect
  useEffect(() => {
    if (isTimerPaused || secondsRemaining <= 0) return

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)

    return () => clearInterval(interval)
  }, [isTimerPaused, secondsRemaining])

  // Scroll chat to bottom when messages update
  useEffect(() => {
    if (isChatOpen) {
      chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages, isChatOpen])

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

  // Handle code execution in isolated sandbox runner
  const handleRunCode = async () => {
    if (!code.trim() || isRunningCode) return
    setIsRunningCode(true)
    setIsConsoleOpen(true)
    setConsoleTab('output')

    try {
      const res = await executeCodeSandbox({
        language: selectedLanguage,
        code,
        stdin: customStdin,
      })
      setExecutionResult(res)
    } catch (err: unknown) {
      setExecutionResult({
        status: 'error',
        stdout: '',
        stderr: err instanceof Error ? err.message : 'Execution error occurred',
        exitCode: 1,
        executionTimeMs: 0,
      })
    } finally {
      setIsRunningCode(false)
    }
  }

  // Handle sending a message to AI Interviewer
  const handleSendChatMessage = async (textToSend?: string) => {
    const messageContent = textToSend || chatInput.trim()
    if (!messageContent || isChatStreaming) return

    const userMsg = createChatMessage('user', messageContent)
    const assistantMsg = createChatMessage('assistant', '')

    const newMessages: ChatMessage[] = [...chatMessages, userMsg]

    setChatMessages([...newMessages, assistantMsg])
    setChatInput('')
    setIsChatStreaming(true)
    if (chatSpeech.isListening) {
      chatSpeech.stopListening()
    }

    let accumulatedText = ''

    try {
      await streamChatResponse({
        messages: newMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        questionContext: {
          role,
          topic,
          difficulty,
          prompt,
        },
        currentCode: code,
        onChunk: (accumulated) => {
          accumulatedText = accumulated
          setChatMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id ? { ...m, content: accumulated } : m
            )
          )
        },
      })

      if (autoSpeakAssistant && accumulatedText) {
        setSpeakingMessageId(assistantMsg.id)
        speechPlayer.speak(accumulatedText, () => setSpeakingMessageId(null))
      }
    } catch (err: unknown) {
      console.error('Chat error:', err)
      setChatMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsg.id
            ? {
                ...m,
                content:
                  'Sorry, I could not generate a response. Please check if your local Ollama server is running with model llama3.2.',
              }
            : m
        )
      )
    } finally {
      setIsChatStreaming(false)
    }
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // Aggregate code, sandbox execution output, and architectural notes
    let combinedAnswer = ''
    if (code.trim()) {
      combinedAnswer += `\`\`\`${selectedLanguage}\n${code.trim()}\n\`\`\`\n`
    }
    if (executionResult?.stdout) {
      combinedAnswer += `\n### Sandbox Test Execution Output (stdout):\n\`\`\`\n${executionResult.stdout.trim()}\n\`\`\`\n`
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
    <div className="relative space-y-6">
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

          <div className="flex items-center gap-3">
            {/* Audio Interviewer Read Aloud Button */}
            {speechPlayer.isTTSSupported && (
              <button
                type="button"
                onClick={handleToggleQuestionAudio}
                className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all flex items-center gap-1.5 shadow-sm cursor-pointer ${
                  speechPlayer.isSpeaking && speechPlayer.currentSpeakingText?.includes(prompt)
                    ? 'bg-rose-950/80 hover:bg-rose-900 border-rose-700/80 text-rose-200 animate-pulse'
                    : 'bg-zinc-800/80 hover:bg-zinc-750 border-zinc-700/70 text-zinc-300 hover:text-white'
                }`}
                title="Listen to Interviewer articulate this problem scenario"
              >
                <span>{speechPlayer.isSpeaking && speechPlayer.currentSpeakingText?.includes(prompt) ? '⏹' : '🔊'}</span>
                <span>{speechPlayer.isSpeaking && speechPlayer.currentSpeakingText?.includes(prompt) ? 'Stop Audio' : 'Listen'}</span>
              </button>
            )}

            {/* AI Interviewer Dialogue Toggle Button */}
            <button
              type="button"
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="px-3 py-1.5 rounded-xl bg-indigo-950/70 hover:bg-indigo-900/80 border border-indigo-700/60 text-xs font-medium text-indigo-200 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <span className="text-indigo-400">💬</span>
              <span>Ask Interviewer</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </button>

            {/* Real-time Timer Badge */}
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

        {/* Adaptive Calibration Callout */}
        {adaptiveContext && adaptiveContext.adaptationType !== 'baseline' && (
          <div
            className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
              adaptiveContext.adaptationType === 'level_up'
                ? 'bg-gradient-to-r from-emerald-950/40 via-indigo-950/30 to-zinc-900 border-emerald-700/60 text-emerald-200'
                : adaptiveContext.adaptationType === 'scaffold'
                ? 'bg-gradient-to-r from-amber-950/40 via-zinc-900 to-zinc-900 border-amber-700/60 text-amber-200'
                : 'bg-gradient-to-r from-sky-950/40 via-zinc-900 to-zinc-900 border-sky-700/60 text-sky-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`px-2 py-0.5 rounded-md font-mono font-bold text-[10px] uppercase border ${
                  adaptiveContext.adaptationType === 'level_up'
                    ? 'bg-emerald-900/60 border-emerald-600 text-emerald-300'
                    : adaptiveContext.adaptationType === 'scaffold'
                    ? 'bg-amber-900/60 border-amber-600 text-amber-300'
                    : 'bg-sky-900/60 border-sky-600 text-sky-300'
                }`}
              >
                {adaptiveContext.adaptationType === 'level_up' && '↗ DIFFICULTY SCALED UP'}
                {adaptiveContext.adaptationType === 'scaffold' && '🛡️ ADAPTIVE DIAGNOSTIC'}
                {adaptiveContext.adaptationType === 'lateral' && '🔄 TOPIC TRANSITION'}
              </span>
              <span className="text-zinc-200 font-medium">
                {adaptiveContext.rationale}
              </span>
            </div>
            {adaptiveContext.previousScore !== undefined && (
              <span className="text-zinc-400 font-mono text-[11px] whitespace-nowrap self-start sm:self-auto">
                Prior Score: <strong className="text-white">{adaptiveContext.previousScore}/100</strong>
              </span>
            )}
          </div>
        )}

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

          {/* Controls (Active in Code Mode) */}
          {activeTab === 'code' && (
            <div className="flex items-center gap-3">
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

              {/* Run Code in Sandbox Button */}
              <button
                type="button"
                onClick={handleRunCode}
                disabled={isRunningCode || !code.trim()}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-medium text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/40 cursor-pointer"
              >
                {isRunningCode ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Executing...</span>
                  </>
                ) : (
                  <>
                    <span className="text-emerald-200">▶</span>
                    <span>Run Code</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Tab 1: Monaco Code Editor & Execution Console */}
        {activeTab === 'code' && (
          <div className="flex flex-col">
            <div className="relative">
              <Editor
                height="400px"
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

            {/* Interactive Terminal / Execution Console */}
            <div className="border-t border-zinc-800 bg-zinc-950/95 flex flex-col font-mono">
              {/* Console Header Bar */}
              <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/60 border-b border-zinc-850 text-xs">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                    <span className="text-indigo-400">⚡</span>
                    <span>Execution Console</span>
                  </div>

                  {/* Sub-tabs: Output vs stdin */}
                  <div className="flex items-center bg-zinc-950 rounded-lg p-0.5 border border-zinc-800 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setConsoleTab('output')}
                      className={`px-2.5 py-0.5 rounded transition-colors ${
                        consoleTab === 'output' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Terminal Output
                    </button>
                    <button
                      type="button"
                      onClick={() => setConsoleTab('stdin')}
                      className={`px-2.5 py-0.5 rounded transition-colors ${
                        consoleTab === 'stdin' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Custom Input (stdin)
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Status Badge */}
                  {isRunningCode ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                      Running Sandbox
                    </span>
                  ) : executionResult ? (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${
                        executionResult.status === 'success'
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                          : executionResult.status === 'timeout'
                          ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                          : 'bg-red-950/80 text-red-300 border-red-800'
                      }`}
                    >
                      <span>
                        {executionResult.status === 'success'
                          ? 'Exit 0 (Success)'
                          : executionResult.status === 'timeout'
                          ? 'Timed Out'
                          : `Exit ${executionResult.exitCode ?? 1} (Error)`}
                      </span>
                      <span>•</span>
                      <span>{executionResult.executionTimeMs}ms</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-500">Ready to execute</span>
                  )}

                  {/* Clear Console */}
                  {executionResult && (
                    <button
                      type="button"
                      onClick={() => setExecutionResult(null)}
                      className="text-[10px] text-zinc-400 hover:text-zinc-200 px-2 py-0.5 rounded hover:bg-zinc-800 transition-colors"
                      title="Clear Console Output"
                    >
                      Clear
                    </button>
                  )}

                  {/* Collapse Toggle */}
                  <button
                    type="button"
                    onClick={() => setIsConsoleOpen(!isConsoleOpen)}
                    className="text-zinc-400 hover:text-white px-1.5 py-0.5 text-[11px] rounded hover:bg-zinc-800 transition-colors"
                    title={isConsoleOpen ? 'Collapse Console' : 'Expand Console'}
                  >
                    {isConsoleOpen ? '▼' : '▲'}
                  </button>
                </div>
              </div>

              {/* Console Body Area */}
              {isConsoleOpen && (
                <div className="p-3.5 max-h-56 min-h-28 overflow-y-auto bg-zinc-950/90 text-xs">
                  {consoleTab === 'output' ? (
                    <div>
                      {executionResult ? (
                        <div className="space-y-2">
                          {executionResult.stdout && (
                            <pre className="text-zinc-200 whitespace-pre-wrap leading-relaxed select-text">
                              {executionResult.stdout}
                            </pre>
                          )}
                          {executionResult.stderr && (
                            <pre className="text-rose-400 bg-rose-950/30 border border-rose-900/40 p-2.5 rounded-lg whitespace-pre-wrap leading-relaxed select-text">
                              {executionResult.stderr}
                            </pre>
                          )}
                          {!executionResult.stdout && !executionResult.stderr && (
                            <span className="text-zinc-500 italic">
                              (Program executed cleanly with no stdout output)
                            </span>
                          )}
                        </div>
                      ) : isRunningCode ? (
                        <div className="flex items-center gap-2 text-zinc-400 italic">
                          <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                          <span>Spawning isolated runner and executing code...</span>
                        </div>
                      ) : (
                        <div className="text-zinc-500 space-y-1">
                          <p className="text-zinc-400">$ DevInterview Isolated Runner v1.0</p>
                          <p>$ Press &quot;▶ Run Code&quot; to compile and execute in an isolated environment with a 5.0s timeout.</p>
                          <p className="text-[11px] text-zinc-600">Supports TypeScript (Node 24 strip-types), Python 3.14, and SQLite/SQL.</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <span className="text-[11px] text-zinc-400 block">
                        Standard Input (stdin) passed to your program on execution:
                      </span>
                      <textarea
                        rows={4}
                        value={customStdin}
                        onChange={(e) => setCustomStdin(e.target.value)}
                        placeholder="Type inputs line by line (e.g. 5\n1 2 3 4 5)..."
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono resize-none"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Architecture & Trade-offs Text Notes */}
        {activeTab === 'notes' && (
          <div className="p-4 space-y-3 bg-zinc-950/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs text-zinc-400 block">
                Describe your design, time/space complexity ($O(N)$), trade-offs, and failure recovery:
              </span>

              {notesSpeech.isSTTSupported && (
                <button
                  type="button"
                  onClick={notesSpeech.toggleListening}
                  className={`self-start sm:self-auto px-3 py-1.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-2 cursor-pointer shadow-sm ${
                    notesSpeech.isListening
                      ? 'bg-red-950/90 border-red-600 text-red-200 animate-pulse'
                      : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white'
                  }`}
                  title={notesSpeech.isListening ? 'Stop voice recording' : 'Dictate your architectural explanation'}
                >
                  <span className={`w-2 h-2 rounded-full ${notesSpeech.isListening ? 'bg-red-500 animate-ping' : 'bg-zinc-500'}`} />
                  <span>{notesSpeech.isListening ? 'Listening (Click to Stop)...' : '🎙️ Dictate Thoughts'}</span>
                </button>
              )}
            </div>

            {notesSpeech.isListening && (
              <div className="p-2.5 rounded-lg bg-red-950/30 border border-red-900/50 text-red-200 text-xs flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="animate-spin text-sm">🎙️</span>
                  <span>Transcribing speech in real-time... Speak your design thoughts aloud.</span>
                </span>
                <span className="text-[11px] text-red-300 font-mono">Microphone Active</span>
              </div>
            )}

            {notesSpeech.recognitionError && (
              <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs">
                {notesSpeech.recognitionError}
              </div>
            )}

            <textarea
              rows={16}
              value={textNotes}
              onChange={(e) => setTextNotes(e.target.value)}
              placeholder="Explain your approach, system boundaries, race condition handling, or complexity analysis here (or click Dictate Thoughts)..."
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
                <span>Evaluating Solution & Calibrating Follow-up...</span>
              </>
            ) : questionNumber >= totalQuestions ? (
              'Submit & Finish Interview'
            ) : (
              'Submit & Next Question →'
            )}
          </button>
        </form>
      </div>

      {/* 6. Live AI Interviewer Chat Slide-over Panel */}
      {isChatOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[450px] bg-zinc-950 border-l border-zinc-800 shadow-2xl flex flex-col backdrop-blur-xl">
          {/* Chat Header */}
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-sm font-bold text-white shadow-md">
                AI
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                  Interviewer Dialogue
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                    Live
                  </span>
                </h3>
                <p className="text-[11px] text-zinc-400 font-mono">Principal Engineer • Llama 3.2</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {speechPlayer.isTTSSupported && (
                <label className="flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-zinc-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoSpeakAssistant}
                    onChange={(e) => setAutoSpeakAssistant(e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-indigo-500 h-3 w-3"
                  />
                  <span>Auto-Voice</span>
                </label>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsChatOpen(false)
                  speechPlayer.stopSpeaking()
                  chatSpeech.stopListening()
                }}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors text-lg"
                title="Close Chat"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Quick Suggestion Chips */}
          <div className="p-3 bg-zinc-900/40 border-b border-zinc-850 flex gap-2 overflow-x-auto no-scrollbar">
            {[
              'Clarify problem constraints',
              'What edge cases to consider?',
              'Review current approach',
            ].map((chip) => (
              <button
                key={chip}
                type="button"
                disabled={isChatStreaming}
                onClick={() => handleSendChatMessage(chip)}
                className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 hover:text-white hover:border-indigo-500/60 transition-all cursor-pointer disabled:opacity-50"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {msg.role === 'user' ? 'You' : 'Interviewer'}
                  </span>
                  {msg.role === 'assistant' && msg.content && speechPlayer.isTTSSupported && (
                    <button
                      type="button"
                      onClick={() => handleToggleMessageAudio(msg.id, msg.content)}
                      className={`text-[10px] px-1 rounded transition-colors cursor-pointer ${
                        speakingMessageId === msg.id
                          ? 'text-indigo-400 bg-indigo-950/80 animate-pulse'
                          : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                      }`}
                      title={speakingMessageId === msg.id ? 'Stop Speaking' : 'Read message aloud'}
                    >
                      {speakingMessageId === msg.id ? '⏹ Stop' : '🔊 Listen'}
                    </button>
                  )}
                </div>
                <div
                  className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed max-w-[88%] ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none shadow-md'
                      : 'bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-bl-none shadow-inner'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content || (isChatStreaming ? 'Thinking...' : '')}</p>
                </div>
              </div>
            ))}
            <div ref={chatMessagesEndRef} />
          </div>

          {/* Message Input Box with Voice Dictation */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendChatMessage()
            }}
            className="p-3.5 border-t border-zinc-800 bg-zinc-900/60 flex items-center gap-2"
          >
            {chatSpeech.isSTTSupported && (
              <button
                type="button"
                onClick={chatSpeech.toggleListening}
                className={`p-2 rounded-xl border text-sm transition-all cursor-pointer flex items-center justify-center ${
                  chatSpeech.isListening
                    ? 'bg-red-950/90 border-red-600 text-red-300 animate-pulse'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                }`}
                title={chatSpeech.isListening ? 'Stop Dictating' : 'Dictate your question via microphone'}
              >
                🎙️
              </button>
            )}
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={chatSpeech.isListening ? 'Listening... Speak your question' : 'Ask a clarifying question or discuss an assumption...'}
              disabled={isChatStreaming}
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-zinc-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isChatStreaming || !chatInput.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-semibold rounded-xl text-xs sm:text-sm transition-all cursor-pointer shadow-md"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
