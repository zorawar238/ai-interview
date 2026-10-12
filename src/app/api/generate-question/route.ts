import { generateObject } from 'ai'
import { z } from 'zod'
import { NextResponse } from 'next/server'
import { ollama } from '@/utils/ai/ollama'

export async function POST(req: Request) {
  try {
    const { topic, difficulty } = await req.json()

    if (!topic || !difficulty) {
      return NextResponse.json({ error: 'Topic and difficulty are required' }, { status: 400 })
    }

    const result = await generateObject({
      model: ollama.chat('llama3.2'), // local model via Ollama OpenAI-compatible endpoint
      schema: z.object({
        question: z.string().describe('The interview question to ask the candidate'),
        hints: z.array(z.string()).describe('A list of 2-3 hints to help the candidate if they get stuck'),
        expectedConcepts: z.array(z.string()).describe('Key concepts the candidate should mention in their answer to pass'),
      }),
      prompt: `You are an expert software engineering interviewer. 
      Generate a ${difficulty} level technical interview question about ${topic}. 
      Make it practical and challenging but solvable in 20 minutes.`,
    })

    return NextResponse.json(result.object)
  } catch (error) {
    console.error('Generate API Error:', error)
    return NextResponse.json({ error: 'Failed to generate question. Is Ollama running?' }, { status: 500 })
  }
}
