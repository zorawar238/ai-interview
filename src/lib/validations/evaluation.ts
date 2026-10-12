import { z } from 'zod'

export const evaluationSchema = z.object({
  score: z.number().int().min(0).max(100).describe('Score from 0 to 100 based on accuracy, depth, and best practices'),
  performanceVerdict: z.enum(['Exceptional', 'Strong Pass', 'Borderline', 'Needs Improvement']),
  feedback: z.string().describe('Detailed, constructive technical feedback on the answer'),
  strengths: z.array(z.string()).describe('Specific strong points demonstrated by the candidate'),
  areasForImprovement: z.array(z.string()).describe('Specific gaps, inaccuracies, or missed optimizations'),
  idealKeyPoints: z.array(z.string()).describe('Core concepts that an ideal answer would address'),
})

export type EvaluationResult = z.infer<typeof evaluationSchema>
