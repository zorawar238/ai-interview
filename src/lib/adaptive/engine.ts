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
function getDeterministicFallbackQuestion(params: {
  topic: string
  difficulty: DifficultyLevel
  role: string
  rationale: string
}): SingleQuestion {
  const { topic, difficulty, role, rationale } = params

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
  } = params

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

  try {
    const result = await generateObject({
      model: ollama.chat('llama3.2'),
      schema: singleQuestionSchema,
      prompt: `You are an expert technical interviewer conducting an adaptive interview for a ${experienceLevel} level ${role} role.

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

Generate Question ${position}:
- Focus Topic: ${plan.nextTopic}
- Difficulty: ${plan.nextDifficulty}
- Must be a realistic, practical coding or system problem.
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
    })
    return {
      question: fallback,
      adaptiveContext,
    }
  }
}
