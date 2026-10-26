/**
 * Candidate Verbal Communication & Speech Analytics Engine
 * Computes speaking pace (WPM), verbal filler word counts, clarity score,
 * and actionable delivery feedback for oral engineering interviews.
 */

export interface SpeechAnalytics {
  wordCount: number
  elapsedMinutes: number
  wordsPerMinute: number
  pacingRating: 'Deliberate / Hesitant' | 'Confident & Articulate' | 'Rapid / Rushed'
  fillerWordCounts: Record<string, number>
  totalFillerCount: number
  fillerDensityPercentage: number
  clarityScore: number
  actionableFeedback: string
}

export const COMMON_FILLER_WORDS = [
  'um',
  'uh',
  'like',
  'you know',
  'basically',
  'actually',
  'literally',
  'sort of',
  'kind of',
]

/**
 * Computes verbal speech analytics from candidate transcript and elapsed seconds.
 */
export function analyzeSpeechDelivery(transcript: string, elapsedSeconds: number): SpeechAnalytics {
  const clean = transcript.trim()
  if (!clean || elapsedSeconds <= 5) {
    return {
      wordCount: clean ? clean.split(/\s+/).length : 0,
      elapsedMinutes: Math.max(elapsedSeconds / 60, 0.1),
      wordsPerMinute: 0,
      pacingRating: 'Confident & Articulate',
      fillerWordCounts: {},
      totalFillerCount: 0,
      fillerDensityPercentage: 0,
      clarityScore: 100,
      actionableFeedback: 'Speak at a steady, articulate pace to begin analysis.',
    }
  }

  const words = clean.split(/\s+/)
  const wordCount = words.length
  const elapsedMinutes = Math.max(elapsedSeconds / 60, 0.1)
  const wordsPerMinute = Math.round(wordCount / elapsedMinutes)

  // Pacing evaluation
  let pacingRating: SpeechAnalytics['pacingRating'] = 'Confident & Articulate'
  if (wordsPerMinute < 95) {
    pacingRating = 'Deliberate / Hesitant'
  } else if (wordsPerMinute > 165) {
    pacingRating = 'Rapid / Rushed'
  }

  // Count filler words
  const fillerWordCounts: Record<string, number> = {}
  let totalFillerCount = 0
  const lowerTranscript = clean.toLowerCase()

  for (const filler of COMMON_FILLER_WORDS) {
    const regex = new RegExp(`\\b${filler}\\b`, 'gi')
    const matches = lowerTranscript.match(regex)
    if (matches && matches.length > 0) {
      fillerWordCounts[filler] = matches.length
      totalFillerCount += matches.length
    }
  }

  const fillerDensityPercentage = Math.round((totalFillerCount / Math.max(wordCount, 1)) * 100)

  // Clarity score calculation (out of 100)
  // Deductions for high filler word density and pacing extremes
  let clarityScore = 100

  // Deduct 4 points per 1% filler density (capped at -40)
  clarityScore -= Math.min(fillerDensityPercentage * 4, 40)

  // Deduct up to 20 points for extreme pacing
  if (wordsPerMinute < 80) {
    clarityScore -= 15
  } else if (wordsPerMinute > 180) {
    clarityScore -= 15
  }

  clarityScore = Math.max(Math.min(clarityScore, 100), 20)

  // Generate actionable feedback
  let actionableFeedback = 'Strong, articulate verbal cadence with clear architectural explanations.'
  if (totalFillerCount >= 3) {
    const topFiller = Object.entries(fillerWordCounts).sort((a, b) => b[1] - a[1])[0]
    actionableFeedback = `Try pausing deliberately for 1 second instead of saying "${topFiller[0]}" when thinking through trade-offs.`
  } else if (pacingRating === 'Rapid / Rushed') {
    actionableFeedback = 'Your delivery is fast. Slow down slightly when describing complex failure recovery to ensure maximum clarity.'
  } else if (pacingRating === 'Deliberate / Hesitant') {
    actionableFeedback = 'Good deliberation. Structure your points using an explicit framework (e.g. system flow -> scale -> edge cases) for fluid momentum.'
  }

  return {
    wordCount,
    elapsedMinutes: Number(elapsedMinutes.toFixed(1)),
    wordsPerMinute,
    pacingRating,
    fillerWordCounts,
    totalFillerCount,
    fillerDensityPercentage,
    clarityScore,
    actionableFeedback,
  }
}
