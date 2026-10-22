import { generateObject } from 'ai'
import { ollama } from '@/utils/ai/ollama'
import { singleQuestionSchema, SingleQuestion, AdaptiveContext } from '@/lib/validations/interview'
import { EvaluationResult } from '@/lib/validations/evaluation'

export type DifficultyLevel = 'easy' | 'medium' | 'hard'

export interface AdaptiveStepPlan {
  adaptationType: 'level_up' | 'scaffold' | 'lateral'
  nextDifficulty: DifficultyLevel
  nextTopic: string
  directive: string
  rationale: string
}

/**
 * Calculates the target number of interview questions based on duration.
 */
export function getTargetQuestionCount(durationMinutes: number): number {
  if (durationMinutes <= 15) return 2
  if (durationMinutes <= 30) return 3
  if (durationMinutes <= 45) return 4
  return 5
}

/**
 * Computes difficulty adjustments, topic selection, and adaptation directive
 * based on candidate score and previous questions.
 */
export function calculateAdaptiveStep(params: {
  previousDifficulty: DifficultyLevel
  score: number
  availableTopics: string[]
  usedTopics: string[]
}): AdaptiveStepPlan {
  const { previousDifficulty, score, availableTopics, usedTopics } = params

  // Select an unused topic if available, otherwise cycle through available topics
  const remainingTopics = availableTopics.filter((t) => !usedTopics.includes(t))
  const nextTopic = remainingTopics.length > 0
    ? remainingTopics[0]
    : availableTopics[usedTopics.length % availableTopics.length] || 'General Engineering'

  // 1. High Performance -> Level Up
  if (score >= 80) {
    let nextDifficulty: DifficultyLevel = 'medium'
    if (previousDifficulty === 'easy') nextDifficulty = 'medium'
    else if (previousDifficulty === 'medium') nextDifficulty = 'hard'
    else nextDifficulty = 'hard'

    return {
      adaptationType: 'level_up',
      nextDifficulty,
      nextTopic,
      directive: `Candidate scored ${score}/100 and demonstrated strong mastery. Escalate the technical challenge to difficulty '${nextDifficulty}' in topic '${nextTopic}'. Test deep architectural mechanics, concurrency, performance trade-offs, or complex edge cases.`,
      rationale: `Candidate demonstrated high mastery (${score}/100) on previous challenge. Scaled up to ${nextDifficulty.toUpperCase()} to evaluate upper technical boundaries.`,
    }
  }

  // 2. Low Performance -> Scaffolding / Targeted Diagnostic
  if (score < 60) {
    let nextDifficulty: DifficultyLevel = 'easy'
    if (previousDifficulty === 'hard') nextDifficulty = 'medium'
    else if (previousDifficulty === 'medium') nextDifficulty = 'easy'
    else nextDifficulty = 'easy'

    return {
      adaptationType: 'scaffold',
      nextDifficulty,
      nextTopic,
      directive: `Candidate scored ${score}/100 and encountered difficulties. Provide scaffolding by adjusting difficulty to '${nextDifficulty}' in topic '${nextTopic}'. Focus on foundational problem-solving and diagnostic verification.`,
      rationale: `Detected foundational gaps (${score}/100). Adjusted difficulty to ${nextDifficulty.toUpperCase()} to provide recovery and verify core competencies.`,
    }
  }

  // 3. Medium Performance -> Lateral Pivot (Same difficulty, alternate topic)
  return {
    adaptationType: 'lateral',
    nextDifficulty: previousDifficulty,
    nextTopic,
    directive: `Candidate scored ${score}/100 demonstrating solid baseline competency. Maintain difficulty '${previousDifficulty}' while laterally transitioning to topic '${nextTopic}' to test breadth of knowledge.`,
    rationale: `Solid baseline performance (${score}/100). Maintained ${previousDifficulty.toUpperCase()} difficulty while probing topic breadth in ${nextTopic}.`,
  }
}

/**
 * Deterministic fallback questions in case local Ollama is offline or experiences transient errors.
 */
export function getDeterministicFallbackQuestion(params: {
  topic: string
  difficulty: DifficultyLevel
  role: string
  rationale: string
  format?: 'conversational' | 'coding'
  resumeText?: string
}): SingleQuestion {
  const { topic, difficulty, role, rationale, format = 'conversational', resumeText } = params

  if (format === 'conversational') {
    const resumeContext = resumeText && resumeText.trim()
      ? ` Drawing directly from your background (${resumeText.slice(0, 120)}...), explain the specific architecture choices, trade-offs, and scaling bottlenecks you managed.`
      : ` Walk me through your design process, high-availability strategy, database transaction choices, and how you diagnose unexpected production latency.`

    return {
      topic,
      difficulty,
      type: 'technical',
      prompt: `[Live Architecture & Concept Discussion] As a ${role}, how would you architect, evaluate, or optimize an end-to-end system involving ${topic} at a ${difficulty} level?${resumeContext}`,
      rubric: `Evaluate architectural breadth, operational foresight (availability, latency, data integrity), communication clarity (STAR/System design structure), and depth of engineering judgment without code writing.`,
      hints: [
        `Clarify requirements, scope, scale (e.g. read/write ratio), and core bottlenecks first.`,
        `Articulate concrete trade-offs (e.g. CAP theorem, caching strategy, sync vs async messaging).`,
        `Describe failure modes and how your design handles service crashes, network partitions, or data corruption.`,
      ],
      adaptationRationale: rationale,
    }
  }

  return {
    topic,
    difficulty,
    type: 'coding',
    prompt: `[Adaptive Challenge] As a ${role}, implement an efficient solution addressing ${topic} at a ${difficulty} level. Consider memory constraints, time complexity, and defensive edge-case handling.`,
    rubric: `Evaluate architectural reasoning, code clarity, edge cases, and algorithmic efficiency ($O(N)$ vs $O(N^2)$).`,
    hints: [
      `Break down the problem into smaller sub-tasks before writing the main logic.`,
      `Consider what happens with empty inputs, null pointers, or unexpected types.`,
      `Analyze the time vs space trade-off of using additional memory (e.g. hash map).`,
    ],
    adaptationRationale: rationale,
  }
}

/**
 * Generates the first baseline question with automatic deterministic fallback resilience.
 */
export async function generateBaselineQuestion(params: {
  role: string
  experienceLevel: string
  topic: string
  difficulty: DifficultyLevel
  format?: 'conversational' | 'coding'
  resumeText?: string
}): Promise<SingleQuestion> {
  const { role, experienceLevel, topic, difficulty, format = 'conversational', resumeText } = params
  const isConversational = format === 'conversational'

  const resumeSection = resumeText && resumeText.trim()
    ? `\nCandidate's Resume & Background Highlights:\n"""\n${resumeText.slice(0, 1500)}\n"""\n`
    : ''

  const formatInstruction = isConversational
    ? `CRITICAL FORMAT REQUIREMENT: This is a LIVE CONVERSATIONAL ORAL INTERVIEW.
DO NOT ask the candidate to write code, implement algorithms, or write functions.
Instead, formulate a deep, thought-provoking technical, architectural, or behavioral scenario question about: ${topic}.
${resumeText ? `Specifically incorporate and drill into their background/projects from their resume above to test real-world depth.` : ''}
Focus on system architecture, operational decisions, data consistency, scalability trade-offs, and debugging war stories.`
    : `Generate a realistic, focused practical coding challenge assessing hands-on implementation.`

  try {
    const result = await generateObject({
      model: ollama.chat('llama3.2'),
      schema: singleQuestionSchema,
      prompt: `You are an expert technical interviewer conducting an interview for a ${experienceLevel} level ${role} role.
      ${resumeSection}
      ${formatInstruction}
      Topic: ${topic}.
      Difficulty level: ${difficulty}.
      Ensure the question evaluates engineering judgment and deep technical comprehension.
      Include 2-3 progressive hints and an evaluation rubric.`,
    })

    return result.object
  } catch (error) {
    console.warn('Ollama baseline generation encountered an issue, deploying deterministic fallback:', error)
    return getDeterministicFallbackQuestion({
      topic,
      difficulty,
      role,
      rationale: `Baseline question in ${topic} to establish candidate competency.`,
      format,
      resumeText,
    })
  }
}

/**
 * Generates the next adaptive question using Ollama or graceful fallback.
 */
export async function generateAdaptiveQuestion(params: {
  role: string
  experienceLevel: string
  availableTopics: string[]
  usedTopics: string[]
  previousQuestion: {
    prompt: string
    topic: string
    difficulty: DifficultyLevel
  }
  previousAnswer: string
  previousEvaluation: Partial<EvaluationResult> & { score: number }
  position: number
  format?: 'conversational' | 'coding'
  resumeText?: string
}): Promise<{ question: SingleQuestion; adaptiveContext: AdaptiveContext }> {
  const {
    role,
    experienceLevel,
    availableTopics,
    usedTopics,
    previousQuestion,
    previousAnswer,
    previousEvaluation,
    position,
    format = 'conversational',
    resumeText,
  } = params

  const isConversational = format === 'conversational'

  const plan = calculateAdaptiveStep({
    previousDifficulty: previousQuestion.difficulty,
    score: previousEvaluation.score,
    availableTopics,
    usedTopics,
  })

  const adaptiveContext: AdaptiveContext = {
    previousScore: previousEvaluation.score,
    previousVerdict: previousEvaluation.performanceVerdict || 'Evaluated',
    adaptationType: plan.adaptationType,
    previousDifficulty: previousQuestion.difficulty,
    targetDifficulty: plan.nextDifficulty,
    rationale: plan.rationale,
  }

  const resumeSection = resumeText && resumeText.trim()
    ? `\nCandidate's Background:\n"""\n${resumeText.slice(0, 1000)}\n"""\n`
    : ''

  const formatInstruction = isConversational
    ? `CRITICAL FORMAT REQUIREMENT: This is an ORAL DISCUSSION interview.
DO NOT ask the candidate to write code or functions.
Formulate a probing architectural, technical concept, or scenario question about '${plan.nextTopic}'.
Probe their engineering judgment, trade-offs, and operational decisions.`
    : `Must be a realistic, practical coding or system problem.`

  try {
    const result = await generateObject({
      model: ollama.chat('llama3.2'),
      schema: singleQuestionSchema,
      prompt: `You are an expert technical interviewer conducting an adaptive interview for a ${experienceLevel} level ${role} role.
${resumeSection}
Context from Question ${position - 1}:
- Topic: ${previousQuestion.topic} (${previousQuestion.difficulty})
- Prompt: ${previousQuestion.prompt}
- Candidate's Answer:
"""
${previousAnswer.slice(0, 1500)}
"""
- Evaluation Score: ${previousEvaluation.score}/100 (${previousEvaluation.performanceVerdict || 'N/A'})
- Strengths: ${previousEvaluation.strengths?.slice(0, 3).join('; ') || 'N/A'}
- Areas for Improvement: ${previousEvaluation.areasForImprovement?.slice(0, 3).join('; ') || 'N/A'}

Adaptive Calibration Directive:
${plan.directive}

${formatInstruction}

Generate Question ${position}:
- Focus Topic: ${plan.nextTopic}
- Difficulty: ${plan.nextDifficulty}
- Include 2-3 progressive hints.
- Include an adaptationRationale summarizing why this question was calibrated for the candidate.`,
    })

    const question = result.object
    return {
      question: {
        ...question,
        topic: plan.nextTopic,
        difficulty: plan.nextDifficulty,
        adaptationRationale: question.adaptationRationale || plan.rationale,
      },
      adaptiveContext: {
        ...adaptiveContext,
        rationale: question.adaptationRationale || plan.rationale,
      },
    }
  } catch (error) {
    console.warn('Ollama adaptive generation encountered an issue, deploying deterministic fallback:', error)
    const fallback = getDeterministicFallbackQuestion({
      topic: plan.nextTopic,
      difficulty: plan.nextDifficulty,
      role,
      rationale: plan.rationale,
      format,
      resumeText,
    })
    return {
      question: fallback,
      adaptiveContext,
    }
  }
}
