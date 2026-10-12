export type InterviewStatus = 'created' | 'in_progress' | 'completed' | 'failed'
export type QuestionType = 'technical' | 'behavioral' | 'coding'

export interface Interview {
  id: string
  user_id: string
  role: string
  experience_level: string
  difficulty: string
  topics: string[]
  duration_minutes: number
  status: InterviewStatus
  started_at: string | null
  completed_at: string | null
  created_at: string
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
