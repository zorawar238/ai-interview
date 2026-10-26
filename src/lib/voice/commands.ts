/**
 * Live Voice Command & Intent Parser
 * Detects real-time conversational commands spoken by the candidate.
 */

export type VoiceCommand =
  | 'repeat_question'
  | 'clear_answer'
  | 'request_hint'
  | 'submit_answer'
  | 'ask_clarification'
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
  'can you say that again',
  'could you say that again',
  'what did you ask',
  'come again',
  'pardon me',
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
  'i am stuck',
  'i am completely stuck',
  'give me a clue',
  'can you help me start',
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

const CLARIFY_PHRASE_PATTERNS = [
  'clarifying question',
  'clarify the question',
  'can i ask a clarifying question',
  'can i ask a question',
  'i have a clarifying question',
  'i have a question',
  'clarify the constraints',
  'clarify requirements',
  'quick question for you',
  'quick question',
  'explain your question',
  'explain the question',
  'explain this question',
  'explain the problem',
  'explain this problem',
  'can you explain your question',
  'could you explain your question',
  'can you please explain your question',
  'could you please explain your question',
  'can you please explain',
  'could you please explain',
  'can you explain the problem',
  'what are you trying to ask',
  'what are you asking',
  'what do you mean by that',
  'what do you mean',
  'what does that mean',
  'what does this mean',
  'i do not understand the question',
  'i do not understand',
  'i don\'t understand',
  'i didn\'t understand',
  'i did not understand',
  'i didn\'t get what you are trying to ask',
  'i didn\'t get what you are asking',
  'i didn\'t get what you\'re asking',
  'didn\'t get what are you trying to ask',
  'didn\'t get what you are trying to ask',
  'didn\'t get what you are asking',
  'didn\'t get what you\'re asking',
  'i didn\'t get it',
  'i don\'t get it',
  'can you clarify',
  'could you clarify',
  'please clarify',
  'can you elaborate',
  'could you elaborate',
  'please elaborate',
  'can you give me an example',
  'can you give an example',
  'give me an example',
  'give an example',
  'what are the constraints',
  'what are the requirements',
  'can we assume',
  'should i assume',
  'should we assume',
  'what is the expected input',
  'what is the expected output',
  'help me understand the question',
  'help me understand',
]

const CLARIFY_REGEX_PATTERNS = [
  /(didn't|don't|did not|do not)\s+(get|understand|comprehend|catch)\s+(what|the)/i,
  /(can|could|would|will)\s+you\s+(please\s+)?(explain|clarify|elaborate|describe)/i,
  /(please\s+)?(explain|clarify|elaborate\s+on)\s+(the|your|this)\s+(question|problem|scenario|requirements?|constraints?)/i,
  /(what|how)\s+(do|did)\s+you\s+mean/i,
  /what\s+are\s+you\s+(trying\s+to\s+)?ask/i,
  /(can\s+you\s+)?(give|provide)\s+(me\s+)?(an?\s+)?example/i,
  /what('s|\s+are|\s+is)\s+the\s+(constraints?|requirements?|inputs?|outputs?)/i,
  /(can|should|may)\s+(i|we)\s+(assume|use)\b/i,
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

  for (const pattern of CLARIFY_PHRASE_PATTERNS) {
    if (normalized.includes(pattern)) {
      return 'ask_clarification'
    }
  }

  for (const regex of CLARIFY_REGEX_PATTERNS) {
    if (regex.test(normalized)) {
      return 'ask_clarification'
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
    ...CLARIFY_PHRASE_PATTERNS,
    ...CLEAR_PATTERNS,
  ]

  for (const pattern of allPatterns) {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi')
    cleaned = cleaned.replace(regex, '')
  }

  return cleaned.replace(/\s{2,}/g, ' ').trim()
}
