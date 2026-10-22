export type InterviewStatus = 'created' | 'in_progress' | 'completed' | 'failed'
export type QuestionType = 'technical' | 'behavioral' | 'coding'
export type InterviewFormat = 'conversational' | 'coding'

export interface Interview {
  id: string
  user_id: string
  role: string
  experience_level: string
  difficulty: string
  topics: string[]
  duration_minutes: number
  status: InterviewStatus
  interview_mode?: 'adaptive' | 'static'
  interview_format?: InterviewFormat
  resume_text?: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export interface AdaptiveRubricPayload {
  rubric: string
  hints: string[]
  interviewMode?: 'adaptive' | 'static'
  targetQuestions?: number
  adaptiveContext?: {
    adaptationType: 'baseline' | 'level_up' | 'scaffold' | 'lateral'
    previousScore?: number
    previousVerdict?: string
    previousDifficulty?: string
    targetDifficulty?: string
    rationale: string
  }
}

export interface Question {
  id: string
  interview_id: string
  type: QuestionType
  topic: string
  prompt: string
  difficulty: string
  position: number
  rubric: string | null
  created_at: string
}

export interface Answer {
  id: string
  question_id: string
  interview_id: string
  answer_text: string
  submitted_at: string
}

export interface Evaluation {
  id: string
  answer_id: string
  interview_id: string
  score: number | null
  feedback: string
  created_at: string
}

export interface CreateInterviewInput {
  role: string
  experience_level: string
  difficulty: string
  topics: string[]
  duration_minutes?: number
}
