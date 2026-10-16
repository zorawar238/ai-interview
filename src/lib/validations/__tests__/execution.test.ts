import { describe, it, expect } from 'vitest'
import {
  executeCodeRequestSchema,
  executeCodeResponseSchema,
  supportedLanguages,
} from '../execution'

describe('Execution Schema Validation', () => {
  describe('executeCodeRequestSchema', () => {
    it('accepts valid TypeScript execution request', () => {
      const validPayload = {
        language: 'typescript',
        code: 'const greeting: string = "Hello World"; console.log(greeting);',
        stdin: 'sample input',
      }

      const result = executeCodeRequestSchema.safeParse(validPayload)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.language).toBe('typescript')
        expect(result.data.code).toBe(validPayload.code)
        expect(result.data.stdin).toBe('sample input')
      }
    })

    it('accepts all supported languages', () => {
      for (const lang of supportedLanguages) {
        const result = executeCodeRequestSchema.safeParse({
          language: lang,
          code: 'console.log(1)',
        })
        expect(result.success).toBe(true)
      }
    })

    it('rejects unsupported languages', () => {
      const invalidPayload = {
        language: 'ruby',
        code: 'puts "Hello World"',
      }

      const result = executeCodeRequestSchema.safeParse(invalidPayload)
      expect(result.success).toBe(false)
    })

    it('rejects empty code submission', () => {
      const emptyPayload = {
        language: 'javascript',
        code: '',
      }

      const result = executeCodeRequestSchema.safeParse(emptyPayload)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Code must not be empty')
      }
    })

    it('rejects oversized code payloads (> 50KB)', () => {
      const oversizedPayload = {
        language: 'python',
        code: 'x = 1\n'.repeat(15000), // > 50,000 characters
      }

      const result = executeCodeRequestSchema.safeParse(oversizedPayload)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('exceeds 50KB limit')
      }
    })

    it('defaults stdin to empty string when omitted', () => {
      const result = executeCodeRequestSchema.safeParse({
        language: 'python',
        code: 'print("test")',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.stdin).toBe('')
      }
    })
  })

  describe('executeCodeResponseSchema', () => {
    it('validates a successful execution response', () => {
      const response = {
        status: 'success',
        stdout: 'Hello World\n',
        stderr: '',
        exitCode: 0,
        executionTimeMs: 142.5,
      }

      const result = executeCodeResponseSchema.safeParse(response)
      expect(result.success).toBe(true)
    })

    it('validates a timeout response with null exit code', () => {
      const response = {
        status: 'timeout',
        stdout: '',
        stderr: 'Process exceeded 5000ms timeout limit.',
        exitCode: null,
        executionTimeMs: 5002.1,
      }

      const result = executeCodeResponseSchema.safeParse(response)
      expect(result.success).toBe(true)
    })

    it('rejects invalid status types', () => {
      const response = {
        status: 'unknown_status',
        stdout: '',
        stderr: '',
        exitCode: 1,
        executionTimeMs: 50,
      }

      const result = executeCodeResponseSchema.safeParse(response)
      expect(result.success).toBe(false)
    })
  })
})
