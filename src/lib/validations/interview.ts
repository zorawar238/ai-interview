import { z } from 'zod'

export const createInterviewSchema = z.object({
  role: z.string().min(2, 'Role is required'),
  experienceLevel: z.enum(['junior', 'mid', 'senior']),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  topics: z.array(z.string()).min(1, 'Select at least one topic'),
  durationMinutes: z.number().int().min(15).max(60).default(30),
  interviewMode: z.enum(['adaptive', 'static']).default('adaptive'),
  interviewFormat: z.enum(['conversational', 'coding']).default('conversational'),
  resumeText: z.string().optional().default(''),
})

export type CreateInterviewInput = z.infer<typeof createInterviewSchema>

export const singleQuestionSchema = z.object({
  topic: z.string().describe('The primary topic of this question, e.g. React, SQL, Algorithms'),
  prompt: z.string().describe('The full interview question text or coding problem prompt'),
  difficulty: z.enum(['easy', 'medium', 'hard']).describe('Difficulty level of the question'),
  type: z.enum(['technical', 'behavioral', 'coding']).default('technical'),
  rubric: z.string().describe('Evaluation criteria and key expected points the candidate should address'),
  hints: z.array(z.string()).describe('2-3 progressive hints if the candidate is stuck'),
  adaptationRationale: z.string().optional().describe('1-sentence rationale explaining why this difficulty and topic were chosen based on preceding candidate answers'),
})

export type SingleQuestion = z.infer<typeof singleQuestionSchema>

export interface AdaptiveContext {
  previousScore?: number
  previousVerdict?: string
  adaptationType: 'baseline' | 'level_up' | 'scaffold' | 'lateral'
  previousDifficulty?: string
  targetDifficulty?: string
  rationale: string
}

export const generatedQuestionsSchema = z.object({
  questions: z.array(singleQuestionSchema).min(1).max(5).describe('List of interview questions to ask the candidate'),
})

export type GeneratedQuestions = z.infer<typeof generatedQuestionsSchema>

