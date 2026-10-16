import { describe, it, expect, vi } from 'vitest'
import * as aiModule from 'ai'
import {
  getTargetQuestionCount,
  calculateAdaptiveStep,
  generateAdaptiveQuestion,
  DifficultyLevel,
} from '../engine'

vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof aiModule>()
  return {
    ...actual,
    generateObject: vi.fn().mockRejectedValue(new Error('Simulated Ollama connection timeout')),
  }
})

describe('Adaptive Engine: getTargetQuestionCount', () => {
  it('returns 2 questions for 15-minute interviews', () => {
    expect(getTargetQuestionCount(15)).toBe(2)
    expect(getTargetQuestionCount(10)).toBe(2)
  })

  it('returns 3 questions for 30-minute interviews', () => {
    expect(getTargetQuestionCount(30)).toBe(3)
    expect(getTargetQuestionCount(20)).toBe(3)
  })

  it('returns 4 questions for 45-minute interviews', () => {
    expect(getTargetQuestionCount(45)).toBe(4)
    expect(getTargetQuestionCount(40)).toBe(4)
  })

  it('returns 5 questions for 60-minute interviews', () => {
    expect(getTargetQuestionCount(60)).toBe(5)
    expect(getTargetQuestionCount(90)).toBe(5)
  })
})

describe('Adaptive Engine: calculateAdaptiveStep', () => {
  const topics = ['Algorithms', 'System Design', 'React']

  describe('High Performance (Score >= 80) -> level_up', () => {
    it('scales up from easy to medium', () => {
      const plan = calculateAdaptiveStep({
        previousDifficulty: 'easy',
        score: 85,
        availableTopics: topics,
        usedTopics: ['Algorithms'],
      })

      expect(plan.adaptationType).toBe('level_up')
      expect(plan.nextDifficulty).toBe('medium')
      expect(plan.nextTopic).toBe('System Design')
      expect(plan.rationale).toContain('85/100')
    })

    it('scales up from medium to hard', () => {
      const plan = calculateAdaptiveStep({
        previousDifficulty: 'medium',
        score: 95,
        availableTopics: topics,
        usedTopics: ['Algorithms'],
      })

      expect(plan.adaptationType).toBe('level_up')
      expect(plan.nextDifficulty).toBe('hard')
    })

    it('caps difficulty at hard if already at hard', () => {
      const plan = calculateAdaptiveStep({
        previousDifficulty: 'hard',
        score: 100,
        availableTopics: topics,
        usedTopics: ['Algorithms'],
      })

      expect(plan.adaptationType).toBe('level_up')
      expect(plan.nextDifficulty).toBe('hard')
    })
  })

  describe('Low Performance (Score < 60) -> scaffold', () => {
    it('reduces difficulty from hard to medium', () => {
      const plan = calculateAdaptiveStep({
        previousDifficulty: 'hard',
        score: 45,
        availableTopics: topics,
        usedTopics: ['Algorithms'],
      })

      expect(plan.adaptationType).toBe('scaffold')
      expect(plan.nextDifficulty).toBe('medium')
      expect(plan.rationale).toContain('45/100')
    })

    it('reduces difficulty from medium to easy', () => {
      const plan = calculateAdaptiveStep({
        previousDifficulty: 'medium',
        score: 55,
        availableTopics: topics,
        usedTopics: ['Algorithms'],
      })

      expect(plan.adaptationType).toBe('scaffold')
      expect(plan.nextDifficulty).toBe('easy')
    })

    it('stays at easy if already at easy', () => {
      const plan = calculateAdaptiveStep({
        previousDifficulty: 'easy',
        score: 30,
        availableTopics: topics,
        usedTopics: ['Algorithms'],
      })

      expect(plan.adaptationType).toBe('scaffold')
      expect(plan.nextDifficulty).toBe('easy')
    })
  })

  describe('Moderate Performance (60 <= Score < 80) -> lateral pivot', () => {
    it('maintains the current difficulty level and transitions topic', () => {
      const plan = calculateAdaptiveStep({
        previousDifficulty: 'medium',
        score: 72,
        availableTopics: topics,
        usedTopics: ['Algorithms'],
      })

      expect(plan.adaptationType).toBe('lateral')
      expect(plan.nextDifficulty).toBe('medium')
      expect(plan.nextTopic).toBe('System Design')
      expect(plan.rationale).toContain('72/100')
    })

    it('cycles back across available topics when all are used', () => {
      const plan = calculateAdaptiveStep({
        previousDifficulty: 'hard',
        score: 70,
        availableTopics: ['Algorithms', 'React'],
        usedTopics: ['Algorithms', 'React'],
      })

      expect(plan.nextTopic).toBe('Algorithms')
    })
  })
})

describe('Adaptive Engine: generateAdaptiveQuestion fallback resilience', () => {
  it('deploys deterministic fallback question gracefully when model generation encounters an error', async () => {
    // When Ollama fails or throws, generateAdaptiveQuestion should catch and return deterministic fallback
    const result = await generateAdaptiveQuestion({
      role: 'Full-Stack Developer',
      experienceLevel: 'mid',
      availableTopics: ['TypeScript', 'Node.js'],
      usedTopics: ['TypeScript'],
      previousQuestion: {
        prompt: 'Implement a binary search tree in TypeScript.',
        topic: 'TypeScript',
        difficulty: 'medium',
      },
      previousAnswer: 'function bst() { ... }',
      previousEvaluation: {
        score: 40,
        performanceVerdict: 'Needs Improvement',
        strengths: ['Basic syntax'],
        areasForImprovement: ['Missed edge cases', 'Did not implement delete'],
      },
      position: 2,
    })

    expect(result).toBeDefined()
    expect(result.question).toBeDefined()
    expect(result.question.topic).toBe('Node.js')
    expect(result.question.difficulty).toBe('easy') // Scaffolding applied (medium -> easy)
    expect(result.question.hints.length).toBeGreaterThan(0)
    expect(result.adaptiveContext.adaptationType).toBe('scaffold')
    expect(result.adaptiveContext.targetDifficulty).toBe('easy')
  })
})
