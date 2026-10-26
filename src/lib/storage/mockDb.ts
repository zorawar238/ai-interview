import { Interview, Question, Answer, Evaluation } from '@/types/database'

export const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'

export const DEMO_USER = {
  id: DEMO_USER_ID,
  email: 'guest@candidate.dev',
  user_metadata: { name: 'Guest Developer' },
}

// Initial pre-seeded interviews so the dashboard immediately displays rich analytics
const initialInterviews: Interview[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    user_id: DEMO_USER_ID,
    role: 'Full-Stack Engineer',
    experience_level: 'senior',
    difficulty: 'hard',
    topics: ['React & Next.js', 'PostgreSQL & SQL', 'TypeScript & Modern JS'],
    duration_minutes: 30,
    status: 'completed',
    interview_mode: 'adaptive',
    started_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    completed_at: new Date(Date.now() - 86400000 * 2 + 1800000).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    user_id: DEMO_USER_ID,
    role: 'Backend Systems Engineer',
    experience_level: 'mid',
    difficulty: 'medium',
    topics: ['System Design', 'Node.js & Express'],
    duration_minutes: 30,
    status: 'completed',
    interview_mode: 'adaptive',
    started_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    completed_at: new Date(Date.now() - 86400000 * 5 + 1800000).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    user_id: DEMO_USER_ID,
    role: 'Principal Cloud Architect',
    experience_level: 'lead',
    difficulty: 'hard',
    topics: ['System Design', 'Distributed Systems'],
    duration_minutes: 30,
    status: 'in_progress',
    interview_mode: 'adaptive',
    interview_format: 'conversational',
    started_at: new Date().toISOString(),
    completed_at: null,
    created_at: new Date().toISOString(),
  },
]

const initialQuestions: Question[] = [
  {
    id: 'q-101',
    interview_id: '11111111-1111-1111-1111-111111111111',
    type: 'coding',
    topic: 'React & Next.js',
    prompt: 'Explain the rendering and hydration lifecycle differences between Server Components and Client Components in Next.js 16. How do you prevent layout shifts and streaming race conditions?',
    difficulty: 'medium',
    position: 1,
    rubric: JSON.stringify({
      rubric: 'Assess understanding of React Server Components, hydration boundaries, Suspense boundaries, and non-blocking streaming SSR.',
      hints: ['Consider which components execute on the server only and ship zero JavaScript to the browser.'],
      interviewMode: 'adaptive',
      targetQuestions: 3,
    }),
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'q-102',
    interview_id: '11111111-1111-1111-1111-111111111111',
    type: 'coding',
    topic: 'PostgreSQL & SQL',
    prompt: 'In PostgreSQL, why are foreign keys not indexed by default? Detail the locking behavior (e.g. ShareRowExclusiveLock) and sequential scan penalties that occur during an ON DELETE CASCADE on an unindexed foreign key.',
    difficulty: 'hard',
    position: 2,
    rubric: JSON.stringify({
      rubric: 'Assess knowledge of B-Tree indexes on foreign keys, sequential scans on child tables, and lock escalation.',
      hints: ['Think about what happens to concurrent transactions modifying the referencing table.'],
      interviewMode: 'adaptive',
      targetQuestions: 3,
    }),
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'q-103',
    interview_id: '11111111-1111-1111-1111-111111111111',
    type: 'coding',
    topic: 'TypeScript & Modern JS',
    prompt: 'Implement a strongly-typed debounce function in TypeScript supporting immediate invocation (leading edge) and trailing edge execution with clean cancellation.',
    difficulty: 'hard',
    position: 3,
    rubric: JSON.stringify({
      rubric: 'Assess generic typing <T extends (...args: any[]) => any>, ReturnType inference, setTimeout handle management, and closure boundaries.',
      hints: ['Use generics to infer argument tuples and return values.'],
      interviewMode: 'adaptive',
      targetQuestions: 3,
    }),
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'q-201',
    interview_id: '22222222-2222-2222-2222-222222222222',
    type: 'technical',
    topic: 'System Design',
    prompt: 'Design a distributed rate limiter supporting 50,000 requests/sec across regional clusters with Redis sliding window logs.',
    difficulty: 'medium',
    position: 1,
    rubric: JSON.stringify({ rubric: 'Assess Redis sorted sets, Lua script atomicity, and clock skew mitigation.', hints: [] }),
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'q-202',
    interview_id: '22222222-2222-2222-2222-222222222222',
    type: 'coding',
    topic: 'Node.js & Express',
    prompt: 'Explain backpressure handling in Node.js streams when reading high-velocity data from a socket and writing to a slower disk sink.',
    difficulty: 'medium',
    position: 2,
    rubric: JSON.stringify({ rubric: 'Assess .pipe(), drain events, pause/resume mechanics, and memory buffer limits.', hints: [] }),
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'q-301',
    interview_id: '33333333-3333-3333-3333-333333333333',
    type: 'technical',
    topic: 'System Design',
    prompt: 'You are designing a globally distributed real-time collaborative workspace supporting 5 million active users with sub-50ms peer synchronization. Detail your replication topology, conflict resolution model (CRDTs vs OT), and how you prevent partition splits during trans-oceanic network degrades.',
    difficulty: 'hard',
    position: 1,
    rubric: JSON.stringify({
      rubric: 'Assess state-based vs operation-based CRDTs, causal consistency, vector clocks, multi-region Raft/Paxos clusters, and edge CDN termination.',
      hints: [
        'Consider State-based vs Operation-based CRDTs and their bandwidth overhead over WebSockets.',
        'Evaluate how vector clocks detect concurrent edits without central coordination.'
      ],
      interviewMode: 'adaptive',
      targetQuestions: 3,
    }),
    created_at: new Date().toISOString(),
  },
]

const initialAnswers: Answer[] = [
  {
    id: 'a-101',
    question_id: 'q-101',
    interview_id: '11111111-1111-1111-1111-111111111111',
    answer_text: 'Server Components execute exclusively on the server and emit serialized flight payload without client bundle weight. Client Components hydrate interactively via Suspense boundaries.',
    submitted_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'a-102',
    question_id: 'q-102',
    interview_id: '11111111-1111-1111-1111-111111111111',
    answer_text: 'Without an index on the child referencing column, deleting a row in the parent table forces PostgreSQL to scan the entire child table sequentially, acquiring ShareRowExclusiveLock and blocking concurrent writes.',
    submitted_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'a-103',
    question_id: 'q-103',
    interview_id: '11111111-1111-1111-1111-111111111111',
    answer_text: 'Implemented generic debounce with Parameters<F> and ReturnType<F> using NodeJS.Timeout tracking and leading/trailing conditional branches.',
    submitted_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'a-201',
    question_id: 'q-201',
    interview_id: '22222222-2222-2222-2222-222222222222',
    answer_text: 'Used Redis ZADD with Unix timestamps as scores, ZREMRANGEBYSCORE to prune expired events, and ZCARD inside an atomic Lua script.',
    submitted_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'a-202',
    question_id: 'q-202',
    interview_id: '22222222-2222-2222-2222-222222222222',
    answer_text: 'Handled highWaterMark limits on writable streams, listening for the drain event before resuming readable stream ingestion.',
    submitted_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
]

const initialEvaluations: Evaluation[] = [
  {
    id: 'e-101',
    answer_id: 'a-101',
    interview_id: '11111111-1111-1111-1111-111111111111',
    score: 88,
    feedback: JSON.stringify({
      score: 88,
      verdict: 'hire',
      performanceVerdict: 'Strong Pass',
      feedback: 'Excellent explanation of React Server Components and flight payload streaming.',
      strengths: ['Clear differentiation between server execution and client hydration', 'Understands bundle size advantages'],
      improvements: ['Could elaborate on streaming SSR with Suspense error boundaries'],
    }),
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'e-102',
    answer_id: 'a-102',
    interview_id: '11111111-1111-1111-1111-111111111111',
    score: 95,
    feedback: JSON.stringify({
      score: 95,
      verdict: 'strong_hire',
      performanceVerdict: 'Exceptional',
      feedback: 'Exceptional depth. Accurately highlighted sequential table scans and lock escalation penalties.',
      strengths: ['Identified ShareRowExclusiveLock', 'Understands production high-concurrency implications'],
      improvements: [],
    }),
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'e-103',
    answer_id: 'a-103',
    interview_id: '11111111-1111-1111-1111-111111111111',
    score: 92,
    feedback: JSON.stringify({
      score: 92,
      verdict: 'strong_hire',
      performanceVerdict: 'Exceptional',
      feedback: 'Clean generic implementation with defensive parameter typing.',
      strengths: ['Type-safe generics', 'Proper handle clearance'],
      improvements: [],
    }),
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'e-201',
    answer_id: 'a-201',
    interview_id: '22222222-2222-2222-2222-222222222222',
    score: 78,
    feedback: JSON.stringify({
      score: 78,
      verdict: 'hire',
      performanceVerdict: 'Pass',
      feedback: 'Solid rate limiter architecture with atomic Lua scripts.',
      strengths: ['Lua script atomicity', 'Redis sorted set sliding window'],
      improvements: ['Could address cross-region synchronization latency'],
    }),
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'e-202',
    answer_id: 'a-202',
    interview_id: '22222222-2222-2222-2222-222222222222',
    score: 82,
    feedback: JSON.stringify({
      score: 82,
      verdict: 'hire',
      performanceVerdict: 'Strong Pass',
      feedback: 'Correct understanding of stream backpressure and highWaterMark.',
      strengths: ['Drain event handling', 'Memory buffer defense'],
      improvements: ['Consider pipeline() utility for auto-cleanup'],
    }),
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
]

// Global singleton to persist state in Node.js dev server memory
const globalStore = globalThis as unknown as {
  __mockStore?: {
    interviews: Interview[]
    questions: Question[]
    answers: Answer[]
    evaluations: Evaluation[]
  }
}

if (!globalStore.__mockStore) {
  globalStore.__mockStore = {
    interviews: [...initialInterviews],
    questions: [...initialQuestions],
    answers: [...initialAnswers],
    evaluations: [...initialEvaluations],
  }
}

export const mockDb = {
  getInterviews(userId?: string): Interview[] {
    const list = globalStore.__mockStore?.interviews || []
    if (!userId) return list
    return list.filter((i) => i.user_id === userId || i.user_id === DEMO_USER_ID)
  },

  getInterviewById(id: string): Interview | null {
    return globalStore.__mockStore?.interviews.find((i) => i.id === id) || null
  },

  createInterview(data: Partial<Interview> & { role: string; difficulty: string; topics: string[] }): Interview {
    const newInterview: Interview = {
      id: crypto.randomUUID(),
      user_id: data.user_id || DEMO_USER_ID,
      role: data.role,
      experience_level: data.experience_level || 'mid',
      difficulty: data.difficulty,
      topics: data.topics,
      duration_minutes: data.duration_minutes || 30,
      status: (data.status as any) || 'in_progress',
      interview_mode: data.interview_mode || 'adaptive',
      interview_format: data.interview_format || 'conversational',
      resume_text: data.resume_text || null,
      started_at: new Date().toISOString(),
      completed_at: null,
      created_at: new Date().toISOString(),
    }
    globalStore.__mockStore?.interviews.unshift(newInterview)
    return newInterview
  },

  updateInterview(id: string, updates: Partial<Interview>): Interview | null {
    const interview = globalStore.__mockStore?.interviews.find((i) => i.id === id)
    if (!interview) return null
    Object.assign(interview, updates)
    return interview
  },

  getQuestionsByInterviewId(interviewId: string): Question[] {
    return (globalStore.__mockStore?.questions || [])
      .filter((q) => q.interview_id === interviewId)
      .sort((a, b) => a.position - b.position)
  },

  createQuestion(data: Partial<Question> & { interview_id: string; prompt: string; topic: string; difficulty: string }): Question {
    const newQuestion: Question = {
      id: crypto.randomUUID(),
      interview_id: data.interview_id,
      type: (data.type as any) || 'coding',
      topic: data.topic,
      prompt: data.prompt,
      difficulty: data.difficulty,
      position: data.position || 1,
      rubric: data.rubric || null,
      created_at: new Date().toISOString(),
    }
    globalStore.__mockStore?.questions.push(newQuestion)
    return newQuestion
  },

  getAnswersByInterviewId(interviewId: string): Answer[] {
    return (globalStore.__mockStore?.answers || []).filter((a) => a.interview_id === interviewId)
  },

  createAnswer(data: { interview_id: string; question_id: string; answer_text: string }): Answer {
    const newAnswer: Answer = {
      id: crypto.randomUUID(),
      interview_id: data.interview_id,
      question_id: data.question_id,
      answer_text: data.answer_text,
      submitted_at: new Date().toISOString(),
    }
    globalStore.__mockStore?.answers.push(newAnswer)
    return newAnswer
  },

  getEvaluationsByInterviewId(interviewId: string): Evaluation[] {
    return (globalStore.__mockStore?.evaluations || []).filter((e) => e.interview_id === interviewId)
  },

  getEvaluationsByInterviewIds(interviewIds: string[]): Evaluation[] {
    return (globalStore.__mockStore?.evaluations || []).filter((e) => interviewIds.includes(e.interview_id))
  },

  getQuestionsByInterviewIds(interviewIds: string[]): Question[] {
    return (globalStore.__mockStore?.questions || []).filter((q) => interviewIds.includes(q.interview_id))
  },

  createEvaluation(data: { interview_id: string; answer_id: string; score: number; feedback: string }): Evaluation {
    const newEval: Evaluation = {
      id: crypto.randomUUID(),
      interview_id: data.interview_id,
      answer_id: data.answer_id,
      score: data.score,
      feedback: data.feedback,
      created_at: new Date().toISOString(),
    }
    globalStore.__mockStore?.evaluations.push(newEval)
    return newEval
  },
}
