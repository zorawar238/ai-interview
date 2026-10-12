import { createOpenAI } from '@ai-sdk/openai'

// Ollama provides an OpenAI-compatible API endpoint at /v1
// By using @ai-sdk/openai, we get first-party Vercel AI SDK v7 compatibility
// with 0 extra cloud costs and 100% local execution.
export const ollama = createOpenAI({
  baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
  apiKey: 'ollama', // Ollama does not require an API key; placeholder required by client
})
