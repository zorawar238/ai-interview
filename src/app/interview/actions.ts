'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { generateObject } from 'ai'
import { ollama } from '@/utils/ai/ollama'
import {
  createInterviewSchema,
  generatedQuestionsSchema,
  singleQuestionSchema,
} from '@/lib/validations/interview'
import { evaluationSchema, EvaluationResult } from '@/lib/validations/evaluation'
import {
  getTargetQuestionCount,
  generateAdaptiveQuestion,
  DifficultyLevel,
} from '@/lib/adaptive/engine'

export async function createInterviewAction(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 1. Parse and validate form inputs
  const rawRole = formData.get('role') as string
  const rawExperienceLevel = formData.get('experienceLevel') as string
  const rawDifficulty = formData.get('difficulty') as string
  const rawTopics = formData.getAll('topics') as string[]
  const rawDuration = formData.get('durationMinutes') ? Number(formData.get('durationMinutes')) : 30
  const rawInterviewMode = (formData.get('interviewMode') as string) || 'adaptive'

  const validation = createInterviewSchema.safeParse({
    role: rawRole,
    experienceLevel: rawExperienceLevel,
    difficulty: rawDifficulty,
    topics: rawTopics,
    durationMinutes: rawDuration,
    interviewMode: rawInterviewMode,
  })

  if (!validation.success) {
    const errorMsg = validation.error.errors.map((e) => e.message).join(', ')
    redirect(`/interview/new?error=${encodeURIComponent(errorMsg)}`)
  }

  const { role, experienceLevel, difficulty, topics, durationMinutes, interviewMode } = validation.data
  const targetQuestions = getTargetQuestionCount(durationMinutes)

  let interviewId: string | null = null

  try {
    // 2. Insert interview record with status 'created'
    const { data: interview, error: dbError } = await supabase
      .from('interviews')
      .insert({
        user_id: user.id,
        role,
        experience_level: experienceLevel,
        difficulty,
        topics,
        duration_minutes: durationMinutes,
        status: 'created',
      })
      .select('id')
      .single()

    if (dbError || !interview) {
      console.error('Database Insert Error:', dbError)
      redirect(`/interview/new?error=${encodeURIComponent('Database error: Unable to create interview. Have you run the SQL migration?')}`)
    }

    interviewId = interview.id

    // 3. Generate initial question(s) using local Ollama model
    if (interviewMode === 'adaptive') {
      // In adaptive mode, we generate the first baseline question immediately
      const initialTopic = topics[0] || 'General Engineering'
      const result = await generateObject({
        model: ollama.chat('llama3.2'),
        schema: singleQuestionSchema,
        prompt: `You are an expert technical interviewer conducting an adaptive interview for a ${experienceLevel} level ${role} role.
        Generate the first baseline question to assess core technical competency.
        Topic: ${initialTopic}.
        Difficulty level: ${difficulty}.
        Ensure the question tests practical problem-solving and architectural judgment.
        Include 2-3 progressive hints and evaluation rubric.`,
      })

      const q = result.object

      const { error: questionError } = await supabase.from('questions').insert({
        interview_id: interviewId,
        type: q.type,
        topic: q.topic || initialTopic,
        prompt: q.prompt,
        difficulty: q.difficulty || difficulty,
        position: 1,
        rubric: JSON.stringify({
          rubric: q.rubric,
          hints: q.hints || [],
          interviewMode: 'adaptive',
          targetQuestions,
          adaptiveContext: {
            adaptationType: 'baseline',
            targetDifficulty: difficulty,
            rationale: `Baseline question in ${initialTopic} to establish candidate competency.`,
          },
        }),
      })

      if (questionError) {
        console.error('Questions Insert Error:', questionError)
        throw new Error('Failed to save baseline question to database')
      }
    } else {
      // Static fixed difficulty mode: generate all 3 questions upfront
      const result = await generateObject({
        model: ollama.chat('llama3.2'),
        schema: generatedQuestionsSchema,
        prompt: `You are an expert technical interviewer conducting an interview for a ${experienceLevel} level ${role} role.
        Create 3 realistic, focused interview questions covering: ${topics.join(', ')}.
        Difficulty level: ${difficulty}.
        Make sure questions test practical understanding and problem solving rather than simple trivia.`,
      })

      const questions = result.object.questions
      const questionsToInsert = questions.map((q, idx) => ({
        interview_id: interviewId,
        type: q.type,
        topic: q.topic,
        prompt: q.prompt,
        difficulty: q.difficulty,
        position: idx + 1,
        rubric: JSON.stringify({
          rubric: q.rubric,
          hints: q.hints || [],
          interviewMode: 'static',
          targetQuestions: questions.length,
        }),
      }))

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsToInsert)

      if (questionsError) {
        console.error('Questions Insert Error:', questionsError)
        throw new Error('Failed to save generated questions to database')
      }
    }

    // 4. Update interview status to 'in_progress'
    await supabase
      .from('interviews')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .eq('id', interviewId)

  } catch (error: unknown) {
    console.error('Interview Generation Failed:', error)
    if (interviewId) {
      await supabase
        .from('interviews')
        .update({ status: 'failed' })
        .eq('id', interviewId)
    }
    const message = error instanceof Error ? error.message : 'Failed to generate interview. Ensure Ollama is running and model llama3.2 is ready.'
    redirect(`/interview/new?error=${encodeURIComponent(message)}`)
  }

  // 5. Navigate candidate to the interview session
  redirect(`/interview/${interviewId}`)
}

export async function submitAnswerAction(formData: FormData): Promise<void> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const interviewId = formData.get('interviewId') as string
  const questionId = formData.get('questionId') as string
  const answerText = formData.get('answerText') as string

  if (!interviewId || !questionId || !answerText?.trim()) {
    redirect(`/interview/${interviewId}?error=${encodeURIComponent('Please enter an answer before submitting.')}`)
  }

  // 1. Insert answer record
  const { data: insertedAnswer, error: answerError } = await supabase
    .from('answers')
    .insert({
      interview_id: interviewId,
      question_id: questionId,
      answer_text: answerText.trim(),
    })
    .select('id')
    .single()

  if (answerError || !insertedAnswer) {
    console.error('Answer Insert Error:', answerError)
    redirect(`/interview/${interviewId}?error=${encodeURIComponent('Failed to save answer.')}`)
  }

  // 2. Fetch question details for evaluation context
  const { data: questionData } = await supabase
    .from('questions')
    .select('prompt, topic, difficulty, rubric')
    .eq('id', questionId)
    .single()

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

      await supabase.from('evaluations').insert({
        answer_id: insertedAnswer.id,
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
  const { data: interviewData } = await supabase
    .from('interviews')
    .select('role, experience_level, difficulty, topics, duration_minutes')
    .eq('id', interviewId)
    .single()

  const { data: rawAllQuestions } = await supabase
    .from('questions')
    .select('*')
    .eq('interview_id', interviewId)
    .order('position', { ascending: true })

  const allQuestions = rawAllQuestions ?? []

  const { data: rawAllAnswers } = await supabase
    .from('answers')
    .select('id, question_id')
    .eq('interview_id', interviewId)

  const allAnswers = rawAllAnswers ?? []

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
    await supabase
      .from('interviews')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', interviewId)

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
      })

      await supabase.from('questions').insert({
        interview_id: interviewId,
        type: nextQuestion.type,
        topic: nextQuestion.topic,
        prompt: nextQuestion.prompt,
        difficulty: nextQuestion.difficulty,
        position: nextPosition,
        rubric: JSON.stringify({
          rubric: nextQuestion.rubric,
          hints: nextQuestion.hints || [],
          interviewMode: 'adaptive',
          targetQuestions,
          adaptiveContext,
        }),
      })
    }
  }

  redirect(`/interview/${interviewId}`)
}
