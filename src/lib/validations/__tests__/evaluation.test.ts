import { describe, it, expect } from 'vitest'
import { evaluationSchema } from '../evaluation'
import { createInterviewSchema, singleQuestionSchema } from '../interview'

describe('Evaluation & Interview Schema Validation', () => {
  describe('evaluationSchema', () => {
    it('validates a comprehensive, valid evaluation result', () => {
      const evaluation = {
        score: 88,
        performanceVerdict: 'Strong Pass',
        feedback: 'The candidate demonstrated strong understanding of asynchronous programming and error handling.',
        strengths: ['Clean code modularity', 'Handled edge cases with try-catch'],
        areasForImprovement: ['Could optimize memory usage by streaming data'],
        idealKeyPoints: ['Use streams for large payloads', 'Set appropriate timeouts'],
      }

      const result = evaluationSchema.safeParse(evaluation)
      expect(result.success).toBe(true)
    })

    it('rejects scores outside 0-100 bounds', () => {
      const negativeScore = {
        score: -5,
        performanceVerdict: 'Needs Improvement',
        feedback: 'Poor',
        strengths: [],
        areasForImprovement: ['Everything'],
        idealKeyPoints: ['Basic logic'],
      }
      expect(evaluationSchema.safeParse(negativeScore).success).toBe(false)

      const excessiveScore = {
        ...negativeScore,
        score: 105,
      }
      expect(evaluationSchema.safeParse(excessiveScore).success).toBe(false)
    })

    it('enforces known performanceVerdict values', () => {
      const invalidVerdict = {
        score: 75,
        performanceVerdict: 'Super Good', // Not in enum
        feedback: 'Decent',
        strengths: [],
        areasForImprovement: [],
        idealKeyPoints: [],
      }

      const result = evaluationSchema.safeParse(invalidVerdict)
      expect(result.success).toBe(false)
    })
  })

  describe('createInterviewSchema', () => {
    it('validates a standard interview setup payload', () => {
      const payload = {
        role: 'Frontend Engineer',
        experienceLevel: 'junior',
        difficulty: 'medium',
        topics: ['React', 'CSS', 'JavaScript'],
        durationMinutes: 30,
        interviewMode: 'adaptive',
      }

      const result = createInterviewSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('rejects interview setup without topics', () => {
      const payload = {
        role: 'Frontend Engineer',
        experienceLevel: 'junior',
        difficulty: 'medium',
        topics: [],
        durationMinutes: 30,
      }

      const result = createInterviewSchema.safeParse(payload)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Select at least one topic')
      }
    })

    it('defaults interviewMode to adaptive', () => {
      const payload = {
        role: 'Backend Engineer',
        experienceLevel: 'senior',
        difficulty: 'hard',
        topics: ['Node.js', 'PostgreSQL'],
        durationMinutes: 45,
      }

      const result = createInterviewSchema.safeParse(payload)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.interviewMode).toBe('adaptive')
      }
    })
  })

  describe('singleQuestionSchema', () => {
    it('validates a valid technical coding question', () => {
      const question = {
        topic: 'Algorithms',
        prompt: 'Implement an LRU Cache with $O(1)$ get and put operations.',
        difficulty: 'hard',
        type: 'coding',
        rubric: 'Must utilize Doubly Linked List + Hash Map.',
        hints: ['Consider which data structure gives $O(1)$ removal and insertion.'],
        adaptationRationale: 'Candidate excelled on hash map problem; testing complex data structure composition.',
      }

      const result = singleQuestionSchema.safeParse(question)
      expect(result.success).toBe(true)
    })
  })
})
