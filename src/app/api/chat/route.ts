import { streamText } from 'ai'
import { ollama } from '@/utils/ai/ollama'

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    const result = streamText({
      model: ollama.chat('llama3.2'), // Local model via Ollama OpenAI-compatible endpoint
      messages,
      system: "You are an expert technical interviewer. You ask thoughtful, concise questions and evaluate candidates fairly.",
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('Chat API Error:', error)
    return new Response(JSON.stringify({ error: 'Failed to generate response. Is Ollama running?' }), { status: 500 })
  }
}
