'use client'

import React, { useState } from 'react'
import { EvaluationResult } from '@/lib/validations/evaluation'

interface ReportExportActionsProps {
  interview: {
    id: string
    role: string
    experience_level: string
    difficulty: string
    duration_minutes: number
    interview_mode?: string
    created_at: string
  }
  questions: Array<{
    id: string
    position: number
    topic: string
    difficulty: string
    prompt: string
    rubric: string | null
  }>
  answers: Array<{
    id: string
    question_id: string
    answer_text: string
  }>
  evaluations: Array<{
    answer_id: string
    score: number | null
    feedback: string
  }>
  averageScore: number | null
}

export default function ReportExportActions({
  interview,
  questions,
  answers,
  evaluations,
  averageScore,
}: ReportExportActionsProps) {
  const [copied, setCopied] = useState(false)

  // 1. Build Comprehensive Markdown Report Content
  const generateMarkdownReport = (): string => {
    const formattedDate = new Date(interview.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const overallVerdict =
      averageScore !== null
        ? averageScore >= 85
          ? 'Exceptional Performance'
          : averageScore >= 70
          ? 'Strong Candidate'
          : averageScore >= 55
          ? 'Borderline — Needs Targeted Practice'
          : 'Foundational Gaps Identified'
        : 'N/A'

    let md = `# AI Technical Interview Performance Report\n\n`
    md += `> **Generated on:** ${formattedDate}  \n`
    md += `> **Role:** ${interview.role} (${interview.experience_level})  \n`
    md += `> **Starting Difficulty:** ${interview.difficulty.toUpperCase()}  \n`
    md += `> **Session Type:** ${interview.interview_mode === 'static' ? 'Fixed Difficulty' : 'Adaptive Calibration'}  \n`
    md += `> **Interview ID:** \`${interview.id}\`\n\n`

    md += `---\n\n`
    md += `## 1. Executive Summary\n\n`
    md += `- **Overall Performance Score:** **${averageScore !== null ? `${averageScore}/100` : 'N/A'}**\n`
    md += `- **Verdict:** **${overallVerdict}**\n`
    md += `- **Evaluated Questions:** ${questions.length}\n`
    md += `- **Target Duration:** ${interview.duration_minutes} minutes\n\n`

    // Adaptive Journey Path
    const hasAdaptive = questions.some((q) => {
      try {
        if (!q.rubric) return false
        const p = JSON.parse(q.rubric)
        return !!p.adaptiveContext
      } catch {
        return false
      }
    })

    if (hasAdaptive) {
      md += `### Adaptive Calibration Path\n\n`
      md += `| Phase | Topic | Difficulty | Score | Calibration Rationale |\n`
      md += `| :--- | :--- | :--- | :--- | :--- |\n`

      questions.forEach((q, idx) => {
        const ans = answers.find((a) => a.question_id === q.id)
        const ev = ans ? evaluations.find((e) => e.answer_id === ans.id) : null
        let rationale = 'Initial baseline problem'
        try {
          if (q.rubric) {
            const parsed = JSON.parse(q.rubric)
            if (parsed.adaptiveContext?.rationale) {
              rationale = parsed.adaptiveContext.rationale
            }
          }
        } catch {}

        const scoreStr = ev?.score !== null && ev?.score !== undefined ? `${ev.score}/100` : 'N/A'
        md += `| Phase ${idx + 1} | ${q.topic} | \`${q.difficulty.toUpperCase()}\` | **${scoreStr}** | ${rationale} |\n`
      })
      md += `\n---\n\n`
    }

    // Question-by-Question Deep Dive
    md += `## 2. Question-by-Question Evaluation Breakdown\n\n`

    questions.forEach((q, idx) => {
      const ans = answers.find((a) => a.question_id === q.id)
      const ev = ans ? evaluations.find((e) => e.answer_id === ans.id) : null

      let parsed: Partial<EvaluationResult> | null = null
      if (ev?.feedback) {
        try {
          parsed = JSON.parse(ev.feedback)
        } catch {
          parsed = { feedback: ev.feedback }
        }
      }

      md += `### Question ${idx + 1}: ${q.topic} (${q.difficulty.toUpperCase()})\n\n`
      md += `**Problem Statement:**\n`
      md += `${q.prompt}\n\n`

      md += `**Candidate's Submitted Answer:**\n`
      md += `\`\`\`\n`
      md += `${ans ? ans.answer_text : '(No answer recorded)'}\n`
      md += `\`\`\`\n\n`

      if (ev) {
        md += `**Score:** **${ev.score !== null ? `${ev.score}/100` : 'N/A'}**  \n`
        if (parsed?.performanceVerdict) {
          md += `**Verdict:** ${parsed.performanceVerdict}  \n`
        }
        if (parsed?.feedback) {
          md += `**Constructive Feedback:**\n${parsed.feedback}\n\n`
        }

        if (Array.isArray(parsed?.strengths) && parsed.strengths.length > 0) {
          md += `**Demonstrated Strengths:**\n`
          parsed.strengths.forEach((s) => {
            md += `- ${s}\n`
          })
          md += `\n`
        }

        if (Array.isArray(parsed?.areasForImprovement) && parsed.areasForImprovement.length > 0) {
          md += `**Areas for Improvement:**\n`
          parsed.areasForImprovement.forEach((a) => {
            md += `- ${a}\n`
          })
          md += `\n`
        }
      }

      md += `---\n\n`
    })

    md += `\n*Report compiled by DevInterview AI Platform (100% Local Inference via Ollama & PostgreSQL RLS)*\n`
    return md
  }

  // 2. Download Markdown Action
  const handleDownloadMarkdown = () => {
    const markdown = generateMarkdownReport()
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const safeRole = interview.role.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const safeDate = new Date().toISOString().split('T')[0]
    const filename = `devinterview-report-${safeRole}-${safeDate}.md`

    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // 3. Print / Save as PDF Action
  const handlePrintPDF = () => {
    window.print()
  }

  // 4. Quick Summary Clipboard Copy
  const handleCopySummary = async () => {
    const summary = [
      `🎯 DevInterview Technical Assessment Summary`,
      `• Role: ${interview.role} (${interview.experience_level})`,
      `• Overall Score: ${averageScore !== null ? `${averageScore}/100` : 'N/A'}`,
      `• Questions Evaluated: ${questions.length}`,
      `• Session Type: ${interview.interview_mode === 'static' ? 'Fixed' : 'Adaptive Calibration'}`,
    ].join('\n')

    try {
      await navigator.clipboard.writeText(summary)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  return (
    <div className="no-print flex flex-wrap items-center gap-2.5">
      {/* 1. Download Markdown */}
      <button
        type="button"
        onClick={handleDownloadMarkdown}
        className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 hover:text-white border border-zinc-700/80 text-xs font-medium transition-all flex items-center gap-2 shadow-sm cursor-pointer"
        title="Download full evaluation report as Markdown (.md)"
      >
        <span>📥</span>
        <span>Download Markdown</span>
      </button>

      {/* 2. Print / Save PDF */}
      <button
        type="button"
        onClick={handlePrintPDF}
        className="px-3.5 py-2 rounded-xl bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-700/70 text-indigo-200 hover:text-white text-xs font-medium transition-all flex items-center gap-2 shadow-sm cursor-pointer"
        title="Print or Save as PDF with ink-friendly styling"
      >
        <span>🖨️</span>
        <span>Print / Save as PDF</span>
      </button>

      {/* 3. Copy Summary */}
      <button
        type="button"
        onClick={handleCopySummary}
        className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-medium transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
        title="Copy concise text summary to clipboard"
      >
        <span>{copied ? '✓' : '📋'}</span>
        <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
      </button>
    </div>
  )
}
