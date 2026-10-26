import { describe, it, expect } from 'vitest'
import { analyzeSpeechDelivery } from '../analytics'

describe('Speech Delivery Analytics Engine', () => {
  it('handles empty or short transcripts gracefully', () => {
    const res = analyzeSpeechDelivery('', 2)
    expect(res.wordCount).toBe(0)
    expect(res.clarityScore).toBe(100)
    expect(res.pacingRating).toBe('Confident & Articulate')
  })

  it('calculates optimal words per minute and confident pacing', () => {
    // 130 words in 1 minute (60 seconds) -> 130 WPM (Optimal)
    const words = Array(130).fill('system').join(' ')
    const res = analyzeSpeechDelivery(words, 60)
    expect(res.wordCount).toBe(130)
    expect(res.wordsPerMinute).toBe(130)
    expect(res.pacingRating).toBe('Confident & Articulate')
  })

  it('detects deliberate / hesitant pacing when speech is slow', () => {
    // 40 words in 60 seconds -> 40 WPM (Deliberate)
    const words = Array(40).fill('database').join(' ')
    const res = analyzeSpeechDelivery(words, 60)
    expect(res.wordsPerMinute).toBe(40)
    expect(res.pacingRating).toBe('Deliberate / Hesitant')
  })

  it('detects rapid / rushed pacing when candidate speaks very fast', () => {
    // 200 words in 60 seconds -> 200 WPM (Rapid)
    const words = Array(200).fill('cache').join(' ')
    const res = analyzeSpeechDelivery(words, 60)
    expect(res.wordsPerMinute).toBe(200)
    expect(res.pacingRating).toBe('Rapid / Rushed')
  })

  it('counts verbal filler words and provides actionable reduction feedback', () => {
    const transcript =
      'Basically we will like use a redis cache and um you know store session keys actually'
    const res = analyzeSpeechDelivery(transcript, 30)

    expect(res.totalFillerCount).toBeGreaterThanOrEqual(4)
    expect(res.fillerWordCounts['basically']).toBe(1)
    expect(res.fillerWordCounts['like']).toBe(1)
    expect(res.fillerWordCounts['um']).toBe(1)
    expect(res.fillerWordCounts['you know']).toBe(1)
    expect(res.actionableFeedback).toContain('Try pausing deliberately')
  })
})
