'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { generateObject } from 'ai'
import { ollama } from '@/utils/ai/ollama'
import { createInterviewSchema, generatedQuestionsSchema } from '@/lib/validations/interview'

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

  const validation = createInterviewSchema.safeParse({
    role: rawRole,
    experienceLevel: rawExperienceLevel,
    difficulty: rawDifficulty,
    topics: rawTopics,
    durationMinutes: rawDuration,
  })

  if (!validation.success) {
    const errorMsg = validation.error.errors.map((e) => e.message).join(', ')
    redirect(`/interview/new?error=${encodeURIComponent(errorMsg)}`)
  }

  const { role, experienceLevel, difficulty, topics, durationMinutes } = validation.data

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

    // 3. Generate structured questions using local Ollama model
    const result = await generateObject({
      model: ollama.chat('llama3.2'),
      schema: generatedQuestionsSchema,
      prompt: `You are an expert technical interviewer conducting an interview for a ${experienceLevel} level ${role} role.
      Create 3 realistic, focused interview questions covering: ${topics.join(', ')}.
      Difficulty level: ${difficulty}.
      Make sure questions test practical understanding and problem solving rather than simple trivia.`,
    })

    const questions = result.object.questions

    // 4. Insert generated questions into the questions table
    const questionsToInsert = questions.map((q, idx) => ({
      interview_id: interviewId,
      type: q.type,
      topic: q.topic,
      prompt: q.prompt,
      difficulty: q.difficulty,
      position: idx + 1,
      rubric: q.rubric,
    }))

    const { error: questionsError } = await supabase
      .from('questions')
      .insert(questionsToInsert)

    if (questionsError) {
      console.error('Questions Insert Error:', questionsError)
      throw new Error('Failed to save generated questions to database')
    }

    // 5. Update interview status to 'in_progress'
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

  // 6. Navigate candidate to the interview session
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
  const { error: answerError } = await supabase.from('answers').insert({
    interview_id: interviewId,
    question_id: questionId,
    answer_text: answerText.trim(),
  })

  if (answerError) {
    console.error('Answer Insert Error:', answerError)
    redirect(`/interview/${interviewId}?error=${encodeURIComponent('Failed to save answer.')}`)
  }

  // 2. Check if all questions have been answered
  const { data: allQuestions } = await supabase
    .from('questions')
    .select('id')
    .eq('interview_id', interviewId)

  const { data: allAnswers } = await supabase
    .from('answers')
    .select('question_id')
    .eq('interview_id', interviewId)

  const answeredCount = allAnswers ? allAnswers.length : 0
  const totalCount = allQuestions ? allQuestions.length : 0

  if (totalCount > 0 && answeredCount >= totalCount) {
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

  redirect(`/interview/${interviewId}`)
}
