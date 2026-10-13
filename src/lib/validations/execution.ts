import { z } from 'zod'

export const supportedLanguages = ['typescript', 'javascript', 'python', 'sql'] as const
export type SupportedLanguage = (typeof supportedLanguages)[number]

export const executeCodeRequestSchema = z.object({
  language: z.enum(supportedLanguages),
  code: z.string().min(1, 'Code must not be empty').max(50000, 'Code exceeds 50KB limit'),
  stdin: z.string().max(10000).optional().default(''),
})

export type ExecuteCodeRequest = z.infer<typeof executeCodeRequestSchema>

export const executeCodeResponseSchema = z.object({
  status: z.enum(['success', 'error', 'timeout']),
  stdout: z.string(),
  stderr: z.string(),
  exitCode: z.number().nullable(),
  executionTimeMs: z.number(),
})

export type ExecuteCodeResponse = z.infer<typeof executeCodeResponseSchema>
