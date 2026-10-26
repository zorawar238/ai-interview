/**
 * Live Voice Command & Intent Parser
 * Detects real-time conversational commands spoken by the candidate.
 */

export type VoiceCommand =
  | 'repeat_question'
  | 'clear_answer'
  | 'request_hint'
  | 'submit_answer'
  | null

const REPEAT_PATTERNS = [
  'repeat the question',
  'repeat question',
  'can you repeat',
  'could you repeat',
  'say that again',
  'what was the question',
  'read the question again',
  'repeat that please',
  'repeat please',
]

const CLEAR_PATTERNS = [
  'clear my answer',
  'clear the answer',
  'clear answer',
  'start over',
  'reset answer',
  'delete my answer',
]

const HINT_PATTERNS = [
  'give me a hint',
  'can i get a hint',
  'can you give me a hint',
  'i need a hint',
  'provide a hint',
  'give a hint',
  'read hint',
  'what is the hint',
  'unlock hint',
]

const SUBMIT_PATTERNS = [
  'submit my answer',
  'submit the answer',
  'submit answer',
  'i am done with my answer',
  'i am finished with my answer',
  'that is my answer',
  'finish my answer',
  'submit and next',
]

/**
 * Detects whether the spoken phrase matches a conversational command.
 */
export function detectVoiceCommand(phrase: string): VoiceCommand {
  const normalized = phrase.toLowerCase().trim()
  if (!normalized) return null

  for (const pattern of REPEAT_PATTERNS) {
    if (normalized.includes(pattern)) {
      return 'repeat_question'
    }
  }

  for (const pattern of HINT_PATTERNS) {
    if (normalized.includes(pattern)) {
      return 'request_hint'
    }
  }

  for (const pattern of SUBMIT_PATTERNS) {
    if (normalized.includes(pattern)) {
      return 'submit_answer'
    }
  }

  for (const pattern of CLEAR_PATTERNS) {
    if (normalized.includes(pattern)) {
      return 'clear_answer'
    }
  }

  return null
}

/**
 * Strips out voice command triggers from the transcribed candidate answer
 * so conversational instructions aren't recorded as technical solution text.
 */
export function sanitizeAnswerTranscript(text: string): string {
  let cleaned = text
  const allPatterns = [
    ...REPEAT_PATTERNS,
    ...HINT_PATTERNS,
    ...SUBMIT_PATTERNS,
    ...CLEAR_PATTERNS,
  ]

  for (const pattern of allPatterns) {
    const regex = new RegExp(`\\b${pattern}\\b`, 'gi')
    cleaned = cleaned.replace(regex, '')
  }

  return cleaned.replace(/\s{2,}/g, ' ').trim()
}
