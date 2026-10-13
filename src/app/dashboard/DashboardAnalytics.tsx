'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { Interview, Evaluation, Question } from '@/types/database'

interface DashboardAnalyticsProps {
  interviews: Interview[]
  evaluations: Evaluation[]
  questions: Question[]
  dbError: boolean
}

export default function DashboardAnalytics({
  interviews,
  evaluations,
  questions,
  dbError,
}: DashboardAnalyticsProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in_progress'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // 1. Calculate per-interview scores
  const interviewScoreMap = useMemo(() => {
    const map = new Map<string, { avgScore: number; count: number }>()
    for (const interview of interviews) {
      const evals = evaluations.filter(
        (e) => e.interview_id === interview.id && typeof e.score === 'number'
      )
      if (evals.length > 0) {
        const total = evals.reduce((sum, e) => sum + (e.score || 0), 0)
        map.set(interview.id, {
          avgScore: Math.round(total / evals.length),
          count: evals.length,
        })
      }
    }
    return map
  }, [interviews, evaluations])

  // 2. Global KPIs
  const kpis = useMemo(() => {
    const validScores = evaluations
      .map((e) => e.score)
      .filter((s): s is number => typeof s === 'number')

    const overallAvg =
      validScores.length > 0
        ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
        : null

    const completedCount = interviews.filter((i) => i.status === 'completed').length
    const inProgressCount = interviews.filter((i) => i.status === 'in_progress').length

    return {
      totalSessions: interviews.length,
      completedCount,
      inProgressCount,
      overallAvg,
      questionsAnswered: evaluations.length,
    }
  }, [interviews, evaluations])

  // 3. Topic Mastery Breakdown
  const topicStats = useMemo(() => {
    const questionTopicMap = new Map<string, string>()
    for (const q of questions) {
      questionTopicMap.set(q.id, q.topic)
    }

    const topicScores: Record<string, { sum: number; count: number }> = {}

    for (const ev of evaluations) {
      if (typeof ev.score !== 'number') continue
      // Find question topic or fallback
      const q = questions.find((item) => item.id === (ev as unknown as { question_id?: string }).question_id)
      const topic = q?.topic || 'General'

      if (!topicScores[topic]) {
        topicScores[topic] = { sum: 0, count: 0 }
      }
      topicScores[topic].sum += ev.score
      topicScores[topic].count += 1
    }

    // Also include topics selected across interviews if no evaluations yet
    for (const interview of interviews) {
      if (Array.isArray(interview.topics)) {
        for (const t of interview.topics) {
          if (!topicScores[t]) {
            topicScores[t] = { sum: 0, count: 0 }
          }
        }
      }
    }

    return Object.entries(topicScores)
      .map(([topic, data]) => ({
        topic,
        count: data.count,
        avgScore: data.count > 0 ? Math.round(data.sum / data.count) : null,
      }))
      .sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0))
  }, [questions, evaluations, interviews])

  // 4. Trajectory Data points (for SVG Trendline)
  const trajectoryPoints = useMemo(() => {
    // Reverse chronologically to show left-to-right progression
    const completedList = [...interviews]
      .filter((i) => i.status === 'completed' && interviewScoreMap.has(i.id))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    return completedList.map((i, idx) => ({
      index: idx + 1,
      date: new Date(i.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      score: interviewScoreMap.get(i.id)?.avgScore || 0,
      role: i.role,
    }))
  }, [interviews, interviewScoreMap])

  // 5. Filtered Interviews List
  const filteredInterviews = useMemo(() => {
    return interviews.filter((item) => {
      const matchesStatus =
        statusFilter === 'all' || item.status === statusFilter

      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        item.role.toLowerCase().includes(q) ||
        item.difficulty.toLowerCase().includes(q) ||
        item.experience_level.toLowerCase().includes(q) ||
        (item.topics && item.topics.some((t) => t.toLowerCase().includes(q)))

      return matchesStatus && matchesSearch
    })
  }, [interviews, statusFilter, searchQuery])

  // Trendline SVG Calculations
  const chartHeight = 120
  const chartWidth = 560
  const paddingX = 40
  const paddingY = 20

  const svgCoordinates = useMemo(() => {
    if (trajectoryPoints.length < 2) return null
    const xStep = (chartWidth - paddingX * 2) / (trajectoryPoints.length - 1)
    const points = trajectoryPoints.map((p, i) => {
      const x = paddingX + i * xStep
      // Score is 0 to 100
      const y = chartHeight - paddingY - (p.score / 100) * (chartHeight - paddingY * 2)
      return { x, y, score: p.score, date: p.date }
    })

    const pathData = points.reduce(
      (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
      ''
    )

    // Closed path for subtle gradient fill
    const fillData = `${pathData} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`

    return { points, pathData, fillData }
  }, [trajectoryPoints])

  return (
    <div className="space-y-10">
      {/* Database Warning */}
      {dbError && (
        <div className="rounded-2xl bg-amber-950/40 p-6 border border-amber-800/60 text-amber-200 space-y-2">
          <h3 className="font-semibold text-base text-amber-300 flex items-center gap-2">
            ⚠️ Database Tables Not Found
          </h3>
          <p className="text-sm text-amber-200/90 leading-relaxed">
            Your Supabase database needs the initial tables created. Please run the migration script located at:
          </p>
          <code className="block bg-black/50 p-2.5 rounded-lg text-xs font-mono text-amber-300 border border-amber-800/40">
            supabase/migrations/20261012000000_create_interview_tables.sql
          </code>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Overall Average */}
        <div className="bg-gradient-to-br from-indigo-950/40 via-zinc-900/70 to-zinc-900/90 border border-indigo-900/40 rounded-2xl p-5 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs text-indigo-400 uppercase font-semibold font-mono tracking-wider">
              Mean Performance
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-900/50 text-indigo-300 border border-indigo-700/50">
              {kpis.overallAvg !== null
                ? kpis.overallAvg >= 80
                  ? 'Tier 1'
                  : kpis.overallAvg >= 70
                  ? 'Strong'
                  : 'Developing'
                : 'N/A'}
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {kpis.overallAvg !== null ? `${kpis.overallAvg}%` : '—'}
            </span>
            {kpis.overallAvg !== null && (
              <span className="text-xs text-zinc-400">
                ({kpis.questionsAnswered} graded questions)
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-500 mt-2">
            Evaluated against Principal Engineer rubrics
          </p>
        </div>

        {/* KPI 2: Completed Sessions */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 shadow-lg">
          <span className="text-xs text-emerald-400 uppercase font-semibold font-mono tracking-wider">
            Completed Interviews
          </span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-400">
              {kpis.completedCount}
            </span>
            <span className="text-xs text-zinc-400">of {kpis.totalSessions} total</span>
          </div>
          <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{
                width: `${kpis.totalSessions > 0 ? (kpis.completedCount / kpis.totalSessions) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        {/* KPI 3: In Progress Sessions */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 shadow-lg">
          <span className="text-xs text-amber-400 uppercase font-semibold font-mono tracking-wider">
            Active / In Progress
          </span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-300">
              {kpis.inProgressCount}
            </span>
            <span className="text-xs text-zinc-400">sessions pending</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-3">
            Resume anytime without losing questions
          </p>
        </div>

        {/* KPI 4: Top Skill or Focus Area */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 shadow-lg">
          <span className="text-xs text-purple-400 uppercase font-semibold font-mono tracking-wider">
            Top Rated Topic
          </span>
          <div className="mt-2.5">
            {topicStats.length > 0 && topicStats[0].avgScore !== null ? (
              <>
                <p className="text-base font-bold text-white truncate">
                  {topicStats[0].topic}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-xs font-bold text-purple-400">
                    {topicStats[0].avgScore}% avg
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    ({topicStats[0].count} questions)
                  </span>
                </div>
              </>
            ) : (
              <>
                <p className="text-base font-medium text-zinc-400">No scored topics</p>
                <p className="text-[11px] text-zinc-600 mt-1">Complete your first session</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Analytics Grid: Trajectory Chart & Topic Proficiency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trajectory Trendline Card */}
        <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-6 space-y-4 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>📈</span>
                  <span>Performance Trajectory</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Chronological score progression across completed sessions
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                0–100 Scale
              </span>
            </div>

            {/* SVG Chart Area */}
            <div className="mt-6">
              {svgCoordinates ? (
                <div className="relative w-full overflow-x-auto no-scrollbar">
                  <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    className="w-full h-36 overflow-visible"
                  >
                    <defs>
                      <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Guideline: 70% Strong Pass */}
                    <line
                      x1={paddingX}
                      y1={chartHeight - paddingY - 0.7 * (chartHeight - paddingY * 2)}
                      x2={chartWidth - paddingX}
                      y2={chartHeight - paddingY - 0.7 * (chartHeight - paddingY * 2)}
                      stroke="#374151"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <text
                      x={chartWidth - paddingX + 5}
                      y={chartHeight - paddingY - 0.7 * (chartHeight - paddingY * 2) + 3}
                      fill="#6b7280"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      70% (Pass)
                    </text>

                    {/* Fill Area */}
                    <path d={svgCoordinates.fillData} fill="url(#scoreGradient)" />

                    {/* Stroke Line */}
                    <path
                      d={svgCoordinates.pathData}
                      fill="none"
                      stroke="#818cf8"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />

                    {/* Data Points */}
                    {svgCoordinates.points.map((pt, i) => (
                      <g key={i}>
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="4.5"
                          fill="#4f46e5"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                        <text
                          x={pt.x}
                          y={pt.y - 9}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="10"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          {pt.score}%
                        </text>
                        <text
                          x={pt.x}
                          y={chartHeight - 4}
                          textAnchor="middle"
                          fill="#71717a"
                          fontSize="9"
                          fontFamily="monospace"
                        >
                          {pt.date}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
              ) : trajectoryPoints.length === 1 ? (
                <div className="py-8 text-center bg-zinc-950/40 rounded-xl border border-zinc-800/60 space-y-2">
                  <span className="text-2xl">🌱</span>
                  <p className="text-xs text-zinc-300 font-medium">First session recorded: {trajectoryPoints[0].score}%</p>
                  <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                    Complete at least two interview sessions to plot your progressive score trajectory.
                  </p>
                </div>
              ) : (
                <div className="py-8 text-center bg-zinc-950/40 rounded-xl border border-zinc-800/60 space-y-2">
                  <span className="text-2xl">📊</span>
                  <p className="text-xs text-zinc-300 font-medium">No completed sessions yet</p>
                  <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                    Complete an interview session to unlock historical trajectory tracking.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
            <span>Target Benchmark: 80%+</span>
            <span>Evaluated via Local Llama 3.2</span>
          </div>
        </div>

        {/* Topic Proficiency Breakdown Card */}
        <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-6 space-y-4 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>🎯</span>
                  <span>Topic Mastery Radar</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Mean performance across core technical competencies
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                {topicStats.length} Competencies
              </span>
            </div>

            {/* Topic List with Gradient Bars */}
            <div className="mt-5 space-y-3.5 max-h-56 overflow-y-auto pr-1">
              {topicStats.length === 0 ? (
                <p className="text-xs text-zinc-500 py-6 text-center">
                  Launch an interview to generate your topic mastery breakdown.
                </p>
              ) : (
                topicStats.map((item) => {
                  const score = item.avgScore
                  const barWidth = score !== null ? `${score}%` : '0%'
                  const isHigh = score !== null && score >= 80
                  const isMedium = score !== null && score >= 70 && score < 80
                  const isDeveloping = score !== null && score < 70

                  return (
                    <div key={item.topic} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-zinc-200 truncate max-w-[200px]">
                          {item.topic}
                        </span>
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          {score !== null ? (
                            <>
                              <span
                                className={`font-bold ${
                                  isHigh
                                    ? 'text-emerald-400'
                                    : isMedium
                                    ? 'text-indigo-400'
                                    : 'text-amber-400'
                                }`}
                              >
                                {score}%
                              </span>
                              <span className="text-zinc-600">({item.count} q)</span>
                            </>
                          ) : (
                            <span className="text-zinc-600">Not graded yet</span>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-zinc-800/80 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isHigh
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                              : isMedium
                              ? 'bg-gradient-to-r from-indigo-500 to-purple-400'
                              : isDeveloping
                              ? 'bg-gradient-to-r from-amber-500 to-orange-400'
                              : 'bg-zinc-700'
                          }`}
                          style={{ width: barWidth }}
                        />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>&ge;80% Strong</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              <span>70–79% Competent</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>&lt;70% Focus Area</span>
            </span>
          </div>
        </div>
      </div>

      {/* Interview Sessions History Table / Cards */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">Your Interview Sessions</h2>
            <p className="text-xs text-zinc-400">
              Filtered and persisted under PostgreSQL Row-Level Security
            </p>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Pills */}
            <div className="flex bg-zinc-900 rounded-xl p-1 border border-zinc-800 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-zinc-800 text-white font-medium'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                All ({interviews.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('completed')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  statusFilter === 'completed'
                    ? 'bg-emerald-950/80 text-emerald-300 font-medium'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Completed ({kpis.completedCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('in_progress')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  statusFilter === 'in_progress'
                    ? 'bg-indigo-950/80 text-indigo-300 font-medium'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                In Progress ({kpis.inProgressCount})
              </button>
            </div>

            {/* Search Input */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search role or topic..."
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono w-44"
            />
          </div>
        </div>

        {/* Sessions List */}
        {filteredInterviews.length === 0 ? (
          <div className="text-center py-16 bg-zinc-900/30 border border-zinc-800/60 rounded-2xl space-y-4">
            <div className="text-4xl">🔍</div>
            <h3 className="text-lg font-semibold text-zinc-200">
              {searchQuery ? 'No matching interview sessions' : 'No interview sessions yet'}
            </h3>
            <p className="text-sm text-zinc-400 max-w-md mx-auto">
              {searchQuery
                ? 'Try searching for a different role, difficulty, or topic keyword.'
                : 'Ready to practice? Launch a new session to get customized technical questions generated by your local Ollama AI model.'}
            </p>
            {!searchQuery && (
              <Link
                href="/interview/new"
                className="inline-block mt-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-white shadow-md transition-all text-sm"
              >
                Launch First Interview
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/80 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl">
            {filteredInterviews.map((item) => {
              const scoreInfo = interviewScoreMap.get(item.id)

              return (
                <div
                  key={item.id}
                  className="p-5 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-zinc-800/20 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-semibold text-white text-base">{item.role}</span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700/60 capitalize font-mono">
                        {item.experience_level}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700/60 capitalize font-mono">
                        {item.difficulty}
                      </span>

                      {/* Status Tag */}
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                          item.status === 'completed'
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                            : item.status === 'in_progress'
                            ? 'bg-indigo-950/60 text-indigo-400 border border-indigo-800/60'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {item.status === 'in_progress' ? 'In Progress' : item.status}
                      </span>

                      {/* Score Badge if completed */}
                      {scoreInfo && (
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-bold font-mono border ${
                            scoreInfo.avgScore >= 80
                              ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700/60'
                              : scoreInfo.avgScore >= 70
                              ? 'bg-indigo-900/40 text-indigo-300 border-indigo-700/60'
                              : 'bg-amber-900/40 text-amber-300 border-amber-700/60'
                          }`}
                        >
                          Score: {scoreInfo.avgScore}%
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-zinc-400">
                      Topics: {item.topics?.join(', ') || 'General'} • Created:{' '}
                      {new Date(item.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>

                  <Link
                    href={`/interview/${item.id}`}
                    className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                      item.status === 'completed'
                        ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                    }`}
                  >
                    {item.status === 'completed' ? 'Review Report →' : 'Continue Session →'}
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
