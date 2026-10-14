import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createInterviewAction } from '../actions'

export default async function NewInterviewPage(props: {
  searchParams: Promise<{ error?: string }>
}) {
  const searchParams = await props.searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const roleOptions = [
    { id: 'Frontend Engineer', label: 'Frontend Engineer' },
    { id: 'Backend Engineer', label: 'Backend Engineer' },
    { id: 'Full-Stack Engineer', label: 'Full-Stack Engineer' },
    { id: 'DevOps & Cloud Engineer', label: 'DevOps & Cloud Engineer' },
    { id: 'Systems Engineer', label: 'Systems Engineer' },
  ]

  const topicOptions = [
    'React & Next.js',
    'Node.js & Express',
    'PostgreSQL & SQL',
    'Data Structures & Algorithms',
    'System Design',
    'REST APIs & Microservices',
    'TypeScript & Modern JS',
    'Authentication & Security',
  ]

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 sm:p-12">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Navigation / Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            ← Back to Dashboard
          </Link>
          <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-950/60 text-indigo-300 border border-indigo-800/60 font-mono">
            Powered by Ollama (Local AI)
          </span>
        </div>

        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Configure New Interview</h1>
          <p className="mt-2 text-zinc-400">
            Customize your role, topics, and difficulty. Our local AI interviewer will generate custom questions tailored to your profile.
          </p>
        </div>

        {searchParams?.error && (
          <div className="rounded-xl bg-red-950/40 p-4 border border-red-800/60 text-red-200 text-sm flex gap-3 items-start">
            <span className="text-red-400 font-bold">Error:</span>
            <span>{searchParams.error}</span>
          </div>
        )}

        <form action={createInterviewAction} className="space-y-8 bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-6 sm:p-8 backdrop-blur-sm">
          {/* Target Role */}
          <div className="space-y-3">
            <label htmlFor="role" className="block text-sm font-semibold text-zinc-200">
              1. Target Role
            </label>
            <select
              id="role"
              name="role"
              required
              className="w-full bg-zinc-800/80 border border-zinc-700/80 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
              defaultValue="Full-Stack Engineer"
            >
              {roleOptions.map((role) => (
                <option key={role.id} value={role.id} className="bg-zinc-900 text-white">
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          {/* Experience Level */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-zinc-200">
              2. Experience Level
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'junior', label: 'Junior', desc: '0 - 2 yrs' },
                { id: 'mid', label: 'Mid-Level', desc: '2 - 5 yrs' },
                { id: 'senior', label: 'Senior', desc: '5+ yrs' },
              ].map((lvl) => (
                <label
                  key={lvl.id}
                  className="flex flex-col items-center justify-center p-3 rounded-xl border border-zinc-700/70 bg-zinc-800/40 hover:bg-zinc-800 cursor-pointer has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-950/30 transition-all text-center"
                >
                  <input
                    type="radio"
                    name="experienceLevel"
                    value={lvl.id}
                    defaultChecked={lvl.id === 'mid'}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium text-white">{lvl.label}</span>
                  <span className="text-xs text-zinc-400 mt-0.5">{lvl.desc}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-zinc-200">
                3. Starting Difficulty (Baseline)
              </label>
              <span className="text-[11px] text-zinc-400 font-mono">Calibrated for Question 1</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'easy', label: 'Easy', badge: 'Foundational' },
                { id: 'medium', label: 'Medium', badge: 'Standard' },
                { id: 'hard', label: 'Hard', badge: 'Advanced' },
              ].map((diff) => (
                <label
                  key={diff.id}
                  className="flex flex-col items-center justify-center p-3 rounded-xl border border-zinc-700/70 bg-zinc-800/40 hover:bg-zinc-800 cursor-pointer has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-950/30 transition-all text-center"
                >
                  <input
                    type="radio"
                    name="difficulty"
                    value={diff.id}
                    defaultChecked={diff.id === 'medium'}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium text-white">{diff.label}</span>
                  <span className="text-xs text-zinc-400 mt-0.5">{diff.badge}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Interview Calibration Mode */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-zinc-200">
                4. Calibration Mode
              </label>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-mono">
                Adaptive Engine
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="relative flex flex-col p-4 rounded-xl border border-zinc-700/70 bg-zinc-800/40 hover:bg-zinc-800 cursor-pointer has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-950/30 transition-all">
                <input
                  type="radio"
                  name="interviewMode"
                  value="adaptive"
                  defaultChecked
                  className="sr-only"
                />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white flex items-center gap-2">
                    <span>⚡ Adaptive Calibration</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 font-mono border border-indigo-800/60">
                      Recommended
                    </span>
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  AI actively scales difficulty and topics in real-time based on your submitted code and rubric scores.
                </p>
              </label>
              <label className="relative flex flex-col p-4 rounded-xl border border-zinc-700/70 bg-zinc-800/40 hover:bg-zinc-800 cursor-pointer has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-950/30 transition-all">
                <input
                  type="radio"
                  name="interviewMode"
                  value="static"
                  className="sr-only"
                />
                <span className="text-sm font-semibold text-white">Fixed Difficulty</span>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  All questions are locked at your selected starting difficulty without dynamic adjustments.
                </p>
              </label>
            </div>
          </div>

          {/* Topics Multi-Select */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-zinc-200">
              5. Focus Topics <span className="text-xs font-normal text-zinc-400">(Pick at least 1)</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {topicOptions.map((topic, idx) => (
                <label
                  key={topic}
                  className="flex items-center gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-800/30 hover:bg-zinc-800/60 cursor-pointer has-[:checked]:border-indigo-500/80 has-[:checked]:bg-indigo-950/20 transition-all"
                >
                  <input
                    type="checkbox"
                    name="topics"
                    value={topic}
                    defaultChecked={idx < 2}
                    className="rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span className="text-sm text-zinc-200">{topic}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-3">
            <label htmlFor="durationMinutes" className="block text-sm font-semibold text-zinc-200">
              6. Expected Duration
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { mins: 15, label: '15 Mins' },
                { mins: 30, label: '30 Mins' },
                { mins: 45, label: '45 Mins' },
              ].map((dur) => (
                <label
                  key={dur.mins}
                  className="flex items-center justify-center p-3 rounded-xl border border-zinc-700/70 bg-zinc-800/40 hover:bg-zinc-800 cursor-pointer has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-950/30 transition-all text-sm font-medium"
                >
                  <input
                    type="radio"
                    name="durationMinutes"
                    value={dur.mins}
                    defaultChecked={dur.mins === 30}
                    className="sr-only"
                  />
                  {dur.label}
                </label>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-zinc-800/80 flex justify-end">
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
            >
              Start Interview Session →
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
