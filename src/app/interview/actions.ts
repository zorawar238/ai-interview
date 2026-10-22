'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { generateObject } from 'ai'
import { ollama } from '@/utils/ai/ollama'
import {
  createInterviewSchema,
  generatedQuestionsSchema,
  singleQuestionSchema,
  SingleQuestion,
} from '@/lib/validations/interview'
import { evaluationSchema, EvaluationResult } from '@/lib/validations/evaluation'
import {
  getTargetQuestionCount,
  generateAdaptiveQuestion,
  generateBaselineQuestion,
  getDeterministicFallbackQuestion,
  DifficultyLevel,
} from '@/lib/adaptive/engine'
import { getCurrentUser, DEMO_USER } from '@/utils/auth'
import { mockDb } from '@/lib/storage/mockDb'
import { Question, Answer } from '@/types/database'

export async function createInterviewAction(formData: FormData) {
  const user = await getCurrentUser()
  const isGuest = user.id === DEMO_USER.id
  const supabase = isGuest ? null : await createClient()

  // 1. Parse and validate form inputs
  const rawRole = formData.get('role') as string
  const rawExperienceLevel = formData.get('experienceLevel') as string
  const rawDifficulty = formData.get('difficulty') as string
  let rawTopics = formData.getAll('topics') as string[]
  const rawCustomTopic = (formData.get('customTopic') as string)?.trim()
  if (rawCustomTopic && !rawTopics.includes(rawCustomTopic)) {
    rawTopics = [rawCustomTopic, ...rawTopics]
  }
  if (rawTopics.length === 0 && rawCustomTopic) {
    rawTopics = [rawCustomTopic]
  }
  const rawDuration = formData.get('durationMinutes') ? Number(formData.get('durationMinutes')) : 30
  const rawInterviewMode = (formData.get('interviewMode') as string) || 'adaptive'
  const rawInterviewFormat = (formData.get('interviewFormat') as string) || 'conversational'
  const rawResumeText = (formData.get('resumeText') as string) || ''

  const validation = createInterviewSchema.safeParse({
    role: rawRole,
    experienceLevel: rawExperienceLevel,
    difficulty: rawDifficulty,
    topics: rawTopics,
    durationMinutes: rawDuration,
    interviewMode: rawInterviewMode,
    interviewFormat: rawInterviewFormat,
    resumeText: rawResumeText,
  })

  if (!validation.success) {
    const errorMsg = validation.error.errors.map((e) => e.message).join(', ')
    redirect(`/interview/new?error=${encodeURIComponent(errorMsg)}`)
  }

  const { role, experienceLevel, difficulty, topics, durationMinutes, interviewMode, interviewFormat, resumeText } = validation.data
  const targetQuestions = getTargetQuestionCount(durationMinutes)

  let interviewId: string | null = null

  try {
    // 2. Insert interview record with status 'created' (with mockDb fast path for guest)
    if (isGuest) {
      const mockInterview = mockDb.createInterview({
        user_id: user.id,
        role,
        experience_level: experienceLevel,
        difficulty,
        topics,
        duration_minutes: durationMinutes,
        status: 'in_progress',
        interview_mode: interviewMode,
        interview_format: interviewFormat,
        resume_text: resumeText,
      })
      interviewId = mockInterview.id
    } else {
      try {
        const { data: interview, error: dbError } = await supabase!
          .from('interviews')
          .insert({
            user_id: user.id,
            role,
            experience_level: experienceLevel,
            difficulty,
            topics,
            duration_minutes: durationMinutes,
            status: 'created',
            interview_mode: interviewMode,
            interview_format: interviewFormat,
            resume_text: resumeText,
          })
          .select('id')
          .single()

        if (interview && !dbError) {
          interviewId = interview.id
        }
      } catch {
        // Supabase unavailable
      }

      if (!interviewId) {
        const mockInterview = mockDb.createInterview({
          user_id: user.id,
          role,
          experience_level: experienceLevel,
          difficulty,
          topics,
          duration_minutes: durationMinutes,
          status: 'in_progress',
          interview_mode: interviewMode,
          interview_format: interviewFormat,
          resume_text: resumeText,
        })
        interviewId = mockInterview.id
      }
    }

    // 3. Generate initial question(s) using local Ollama model with deterministic fallback resilience
    if (interviewMode === 'adaptive') {
      // In adaptive mode, we generate the first baseline question with automatic fallback protection
      const initialTopic = topics[0] || 'General Engineering'
      const q = await generateBaselineQuestion({
        role,
        experienceLevel,
        topic: initialTopic,
        difficulty: difficulty as DifficultyLevel,
        format: interviewFormat,
        resumeText,
      })

      const rubricPayload = JSON.stringify({
        rubric: q.rubric,
        hints: q.hints || [],
        interviewMode: 'adaptive',
        interviewFormat,
        targetQuestions,
        adaptiveContext: {
          adaptationType: 'baseline',
          targetDifficulty: difficulty,
          rationale: q.adaptationRationale || `Baseline question in ${initialTopic} to establish candidate competency.`,
        },
      })

      if (!isGuest && supabase) {
        try {
          await supabase.from('questions').insert({
            interview_id: interviewId,
            type: q.type,
            topic: q.topic || initialTopic,
            prompt: q.prompt,
            difficulty: q.difficulty || difficulty,
            position: 1,
            rubric: rubricPayload,
          })
        } catch {}
      }

      mockDb.createQuestion({
        interview_id: interviewId,
        type: q.type,
        topic: q.topic || initialTopic,
        prompt: q.prompt,
        difficulty: q.difficulty || difficulty,
        position: 1,
        rubric: rubricPayload,
      })
    } else {
      // Static fixed difficulty mode: generate all questions upfront with fallback protection
      let questions: SingleQuestion[] = []
      const isConversational = interviewFormat === 'conversational'
      const resumeSection = resumeText && resumeText.trim()
        ? `\nCandidate Resume / Project Experience:\n"""\n${resumeText.slice(0, 1500)}\n"""\n`
        : ''
      const formatInstruction = isConversational
        ? `CRITICAL FORMAT: This is a LIVE CONVERSATIONAL ORAL INTERVIEW. Do NOT ask the candidate to write code or functions. Formulate 3 conceptual, architectural, or design questions tailored to their background and topics.`
        : `Make sure questions test practical understanding and problem solving rather than simple trivia.`

      try {
        const result = await generateObject({
          model: ollama.chat('llama3.2'),
          schema: generatedQuestionsSchema,
          prompt: `You are an expert technical interviewer conducting an interview for a ${experienceLevel} level ${role} role.
          ${resumeSection}
          ${formatInstruction}
          Create 3 realistic, focused interview questions covering: ${topics.join(', ')}.
          Difficulty level: ${difficulty}.`,
        })
        questions = result.object.questions
      } catch (err) {
        console.warn('Ollama static questions batch generation failed, deploying fallbacks:', err)
        const sampleTopics = topics.length > 0 ? topics : ['System Architecture', 'Distributed Systems', 'Data Reliability']
        questions = sampleTopics.slice(0, 3).map((top, idx) =>
          getDeterministicFallbackQuestion({
            topic: top,
            difficulty: difficulty as DifficultyLevel,
            role,
            rationale: `Static difficulty question #${idx + 1} in ${top}.`,
            format: interviewFormat,
            resumeText,
          })
        )
      }

      const questionsToInsert = questions.map((q, idx) => ({
        interview_id: interviewId!,
        type: q.type,
        topic: q.topic,
        prompt: q.prompt,
        difficulty: q.difficulty,
        position: idx + 1,
        rubric: JSON.stringify({
          rubric: q.rubric,
          hints: q.hints || [],
          interviewMode: 'static',
          interviewFormat,
          targetQuestions: questions.length,
        }),
      }))

      if (!isGuest && supabase) {
        try {
          await supabase.from('questions').insert(questionsToInsert)
        } catch {}
      }

      questionsToInsert.forEach((qi) => {
        mockDb.createQuestion(qi)
      })
    }

    // 4. Update interview status to 'in_progress'
    if (!isGuest && supabase) {
      try {
        await supabase
          .from('interviews')
          .update({
            status: 'in_progress',
            started_at: new Date().toISOString(),
          })
          .eq('id', interviewId)
      } catch {}
    }

    mockDb.updateInterview(interviewId, {
      status: 'in_progress',
      started_at: new Date().toISOString(),
    })

  } catch (error: unknown) {
    console.error('Interview Generation Failed:', error)
    if (interviewId) {
      if (!isGuest && supabase) {
        try {
          await supabase
            .from('interviews')
            .update({ status: 'failed' })
            .eq('id', interviewId)
        } catch {}
      }
      mockDb.updateInterview(interviewId, { status: 'failed' })
    }
    const message = error instanceof Error ? error.message : 'Failed to generate interview.'
    redirect(`/interview/new?error=${encodeURIComponent(message)}`)
  }

  // 5. Navigate candidate to the interview session
  redirect(`/interview/${interviewId}`)
}

export async function submitAnswerAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser()
  const isGuest = user.id === DEMO_USER.id
  const supabase = isGuest ? null : await createClient()

  const interviewId = formData.get('interviewId') as string
  const questionId = formData.get('questionId') as string
  const answerText = formData.get('answerText') as string

  if (!interviewId || !questionId || !answerText?.trim()) {
    redirect(`/interview/${interviewId}?error=${encodeURIComponent('Please enter an answer before submitting.')}`)
  }

  // 1. Insert answer record (with mockDb fast path for guest)
  let answerId: string | null = null
  if (isGuest) {
    const mockAns = mockDb.createAnswer({
      interview_id: interviewId,
      question_id: questionId,
      answer_text: answerText.trim(),
    })
    answerId = mockAns.id
  } else {
    try {
      const { data: insertedAnswer, error: answerError } = await supabase!
        .from('answers')
        .insert({
          interview_id: interviewId,
          question_id: questionId,
          answer_text: answerText.trim(),
        })
        .select('id')
        .single()

      if (insertedAnswer && !answerError) {
        answerId = insertedAnswer.id
      }
    } catch {}

    if (!answerId) {
      const mockAns = mockDb.createAnswer({
        interview_id: interviewId,
        question_id: questionId,
        answer_text: answerText.trim(),
      })
      answerId = mockAns.id
    }
  }

  // 2. Fetch question details for evaluation context
  let questionData: any = null
  if (!isGuest && supabase) {
    try {
      const { data: qData } = await supabase
        .from('questions')
        .select('prompt, topic, difficulty, rubric')
        .eq('id', questionId)
        .single()
      if (qData) questionData = qData
    } catch {}
  }

  if (!questionData) {
    const qList = mockDb.getQuestionsByInterviewId(interviewId)
    questionData = qList.find((q) => q.id === questionId) || qList[0]
  }

  let evaluatedObject: EvaluationResult | null = null

  // 3. Generate automated AI evaluation using Ollama
  if (questionData) {
    try {
      let rubricText = questionData.rubric || 'Evaluate correctness, conceptual depth, trade-offs, and practical engineering judgment.'
      if (questionData.rubric) {
        try {
          const parsed = JSON.parse(questionData.rubric)
          if (parsed.rubric) rubricText = parsed.rubric
        } catch {
          // Plain string
        }
      }

      const evalResult = await generateObject({
        model: ollama.chat('llama3.2'),
        schema: evaluationSchema,
        prompt: `You are an expert technical interviewer assessing a candidate's answer.
        
        Question Topic: ${questionData.topic}
        Difficulty: ${questionData.difficulty}
        Question Prompt: ${questionData.prompt}
        Rubric / Target Expectations: ${rubricText}
        
        Candidate's Answer:
        """
        ${answerText.trim()}
        """
        
        Provide a fair, rigorous, and constructive evaluation according to the required schema.`,
      })

      evaluatedObject = evalResult.object

      if (!isGuest && supabase) {
        try {
          await supabase.from('evaluations').insert({
            answer_id: answerId,
            interview_id: interviewId,
            score: evalResult.object.score,
            feedback: JSON.stringify(evalResult.object),
          })
        } catch {}
      }

      mockDb.createEvaluation({
        answer_id: answerId,
        interview_id: interviewId,
        score: evalResult.object.score,
        feedback: JSON.stringify(evalResult.object),
      })
    } catch (evalErr) {
      console.error('Answer Evaluation Error:', evalErr)
      // Non-blocking: interview continues even if evaluation generation experiences latency
    }
  }

  // 4. Fetch interview & question state to determine progression
  let interviewData: any = null
  if (!isGuest && supabase) {
    try {
      const { data: iData } = await supabase
        .from('interviews')
        .select('role, experience_level, difficulty, topics, duration_minutes, interview_format, resume_text')
        .eq('id', interviewId)
        .single()
      if (iData) interviewData = iData
    } catch {}
  }

  if (!interviewData) {
    interviewData = mockDb.getInterviewById(interviewId)
  }

  let allQuestions: Question[] = []
  if (!isGuest && supabase) {
    try {
      const { data: rawAllQuestions } = await supabase
        .from('questions')
        .select('*')
        .eq('interview_id', interviewId)
        .order('position', { ascending: true })
      if (rawAllQuestions && rawAllQuestions.length > 0) {
        allQuestions = rawAllQuestions as Question[]
      }
    } catch {}
  }

  if (allQuestions.length === 0) {
    allQuestions = mockDb.getQuestionsByInterviewId(interviewId)
  }

  let allAnswers: Answer[] = []
  if (!isGuest && supabase) {
    try {
      const { data: rawAllAnswers } = await supabase
        .from('answers')
        .select('id, question_id')
        .eq('interview_id', interviewId)
      if (rawAllAnswers && rawAllAnswers.length > 0) {
        allAnswers = rawAllAnswers as Answer[]
      }
    } catch {}
  }

  if (allAnswers.length === 0) {
    allAnswers = mockDb.getAnswersByInterviewId(interviewId)
  }

  const answeredCount = allAnswers.length

  // Determine interview mode & target question count
  let targetQuestions = 3
  let interviewMode: 'adaptive' | 'static' = 'adaptive'

  if (allQuestions.length > 0 && allQuestions[0].rubric) {
    try {
      const parsed = JSON.parse(allQuestions[0].rubric)
      if (typeof parsed.targetQuestions === 'number') {
        targetQuestions = parsed.targetQuestions
      }
      if (parsed.interviewMode) {
        interviewMode = parsed.interviewMode
      }
    } catch {}
  } else if (interviewData?.duration_minutes) {
    targetQuestions = getTargetQuestionCount(interviewData.duration_minutes)
  }

  // Check if session has reached target question limit
  const isFinalQuestion = answeredCount >= targetQuestions || (interviewMode === 'static' && answeredCount >= allQuestions.length)

  if (isFinalQuestion) {
    // Complete the interview
    if (!isGuest && supabase) {
      try {
        await supabase
          .from('interviews')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', interviewId)
      } catch {}
    }

    mockDb.updateInterview(interviewId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    })

    redirect(`/interview/${interviewId}?completed=true`)
  }

  // 5. Adaptive Engine: Dynamically generate next calibrated question
  if (interviewMode === 'adaptive' && answeredCount < targetQuestions) {
    const nextPosition = answeredCount + 1
    const alreadyExists = allQuestions.some((q) => q.position === nextPosition)

    if (!alreadyExists && interviewData) {
      const usedTopics = allQuestions.map((q) => q.topic)
      const prevDifficulty = (questionData?.difficulty as DifficultyLevel) || 'medium'
      const fallbackScore = evaluatedObject?.score ?? 70

      const { question: nextQuestion, adaptiveContext } = await generateAdaptiveQuestion({
        role: interviewData.role,
        experienceLevel: interviewData.experience_level,
        availableTopics: interviewData.topics || [],
        usedTopics,
        previousQuestion: {
          prompt: questionData?.prompt || '',
          topic: questionData?.topic || '',
          difficulty: prevDifficulty,
        },
        previousAnswer: answerText.trim(),
        previousEvaluation: evaluatedObject || {
          score: fallbackScore,
          performanceVerdict: fallbackScore >= 70 ? 'Strong Pass' : 'Borderline',
          strengths: [],
          areasForImprovement: [],
        },
        position: nextPosition,
        format: interviewData.interview_format || 'conversational',
        resumeText: interviewData.resume_text || '',
      })

      const rubricPayload = JSON.stringify({
        rubric: nextQuestion.rubric,
        hints: nextQuestion.hints || [],
        interviewMode: 'adaptive',
        interviewFormat: interviewData.interview_format || 'conversational',
        targetQuestions,
        adaptiveContext,
      })

      if (!isGuest && supabase) {
        try {
          await supabase.from('questions').insert({
            interview_id: interviewId,
            type: nextQuestion.type,
            topic: nextQuestion.topic,
            prompt: nextQuestion.prompt,
            difficulty: nextQuestion.difficulty,
            position: nextPosition,
            rubric: rubricPayload,
          })
        } catch {}
      }

      mockDb.createQuestion({
        interview_id: interviewId,
        type: nextQuestion.type,
        topic: nextQuestion.topic,
        prompt: nextQuestion.prompt,
        difficulty: nextQuestion.difficulty,
        position: nextPosition,
        rubric: rubricPayload,
      })
    }
  }

  redirect(`/interview/${interviewId}`)
}
