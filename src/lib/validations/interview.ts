import { z } from 'zod'

export const createInterviewSchema = z.object({
  role: z.string().min(2, 'Role is required'),
  experienceLevel: z.enum(['junior', 'mid', 'senior']),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  topics: z.array(z.string()).min(1, 'Select at least one topic'),
  durationMinutes: z.number().int().min(15).max(60).default(30),
})

export type CreateInterviewInput = z.infer<typeof createInterviewSchema>

export const generatedQuestionsSchema = z.object({
  questions: z.array(
    z.object({
      topic: z.string().describe('The primary topic of this question, e.g. React, SQL, Algorithms'),
      prompt: z.string().describe('The full interview question text or coding problem prompt'),
      difficulty: z.enum(['easy', 'medium', 'hard']).describe('Difficulty level of the question'),
      type: z.enum(['technical', 'behavioral', 'coding']).default('technical'),
      rubric: z.string().describe('Evaluation criteria and key expected points the candidate should address'),
      hints: z.array(z.string()).describe('2-3 progressive hints if the candidate is stuck'),
    })
  ).min(1).max(5).describe('List of interview questions to ask the candidate'),
})

export type GeneratedQuestions = z.infer<typeof generatedQuestionsSchema>
