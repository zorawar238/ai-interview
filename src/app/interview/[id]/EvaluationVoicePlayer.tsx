'use client'

import React, { useState } from 'react'
import { useWebSpeech } from '@/hooks/useWebSpeech'

interface ExecutiveBriefingPlayerProps {
  role: string
  difficulty: string
  score: number | null
  questionsCount: number
  verdict: string
}

export function ExecutiveBriefingPlayer({
  role,
  difficulty,
  score,
  questionsCount,
  verdict,
}: ExecutiveBriefingPlayerProps) {
  const speech = useWebSpeech()
  const [isPlaying, setIsPlaying] = useState(false)

  const handleToggle = () => {
    if (isPlaying) {
      speech.stopSpeaking()
      setIsPlaying(false)
      return
    }

    const textToSpeak = `Here is your executive performance briefing for the ${role} interview at ${difficulty} difficulty. Your overall score is ${
      score !== null ? `${score} out of 100` : 'not calculated'
    }. Overall verdict: ${verdict}. Evaluated across ${questionsCount} technical questions by your local AI interviewer.`

    setIsPlaying(true)
    speech.speak(textToSpeak, () => {
      setIsPlaying(false)
    })
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="no-print px-3.5 py-1.5 rounded-xl bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-200 border border-indigo-700/60 text-xs font-mono font-medium transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:text-white"
      title="Listen to executive summary aloud"
    >
      <span>{isPlaying ? '⏹️' : '🔊'}</span>
      <span>{isPlaying ? 'Stop Briefing' : 'Listen to Briefing Aloud'}</span>
    </button>
  )
}

interface QuestionEvaluationPlayerProps {
  questionNumber: number
  topic: string
  score: number | null
  feedback: string
  strengths?: string[]
  areasForImprovement?: string[]
}

export function QuestionEvaluationPlayer({
  questionNumber,
  topic,
  score,
  feedback,
  strengths = [],
  areasForImprovement = [],
}: QuestionEvaluationPlayerProps) {
  const speech = useWebSpeech()
  const [isPlaying, setIsPlaying] = useState(false)

  const handleToggle = () => {
    if (isPlaying) {
      speech.stopSpeaking()
      setIsPlaying(false)
      return
    }

    let speechScript = `Evaluation for Question ${questionNumber} on ${topic}. `
    if (score !== null) {
      speechScript += `Score: ${score} out of 100. `
    }
    speechScript += `Feedback: ${feedback}. `

    if (strengths.length > 0) {
      speechScript += `Key strengths noted: ${strengths.join('. ')}. `
    }
    if (areasForImprovement.length > 0) {
      speechScript += `Areas for improvement: ${areasForImprovement.join('. ')}. `
    }

    setIsPlaying(true)
    speech.speak(speechScript, () => {
      setIsPlaying(false)
    })
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="no-print px-3 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-indigo-200 border border-zinc-700/80 text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
      title="Listen to this question evaluation aloud"
    >
      <span>{isPlaying ? '⏹️' : '🔊'}</span>
      <span>{isPlaying ? 'Stop Audio' : 'Listen to Evaluation Aloud'}</span>
    </button>
  )
}
