import { streamText } from 'ai'
import { ollama } from '@/utils/ai/ollama'

// Allow streaming responses up to 60 seconds
export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const { messages, questionContext, currentCode } = await req.json()

    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Messages array is required' }), { status: 400 })
    }

    const systemPrompt = `You are an expert Principal Software Engineering Interviewer conducting a live technical interview for a ${questionContext?.role || 'Software Engineer'} role.

CURRENT INTERVIEW QUESTION:
Topic: ${questionContext?.topic || 'General'}
Difficulty: ${questionContext?.difficulty || 'Medium'}
Prompt: ${questionContext?.prompt || 'N/A'}

CANDIDATE'S CURRENT WORKING CODE & NOTES:
"""
${currentCode ? currentCode.slice(0, 3000) : '(No code written yet)'}
"""

INTERVIEWER BEHAVIOR & GUIDELINES:
1. Speak in a constructive, encouraging, but rigorous professional tone.
2. If the candidate asks clarifying questions about requirements, scale, or constraints, clarify them thoughtfully as a real interviewer would.
3. If the candidate says they did not understand or asks you to explain the question, explain the problem scenario and core goal in 2 to 3 clear, simple spoken sentences. Break down what you want them to focus on without giving away the full solution.
4. If the candidate is stuck or asks for direction, guide them with progressive hints or probe their understanding.
5. CRITICAL: NEVER write the complete solution code for the candidate, even if asked directly. Challenge them to explain their logic.
6. Keep your responses concise (2 to 3 natural sentences, ideally under 60 words) so it sounds conversational and articulate when spoken aloud over live audio. Avoid markdown formatting, long lists, or code blocks.`

    const result = streamText({
      model: ollama.chat('llama3.2'),
      messages,
      system: systemPrompt,
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('Chat API Error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to generate interviewer response. Ensure Ollama is running.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
