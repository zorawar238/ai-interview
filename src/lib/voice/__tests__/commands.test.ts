import { describe, it, expect } from 'vitest'
import { detectVoiceCommand, sanitizeAnswerTranscript } from '../commands'

describe('Voice Commands Engine', () => {
  it('detects repeat question intent variations', () => {
    expect(detectVoiceCommand('Can you repeat the question please?')).toBe('repeat_question')
    expect(detectVoiceCommand('Could you repeat that?')).toBe('repeat_question')
    expect(detectVoiceCommand('Please repeat question')).toBe('repeat_question')
    expect(detectVoiceCommand('Say that again for me')).toBe('repeat_question')
    expect(detectVoiceCommand('Wait what was the question')).toBe('repeat_question')
  })

  it('detects clear answer intent variations', () => {
    expect(detectVoiceCommand('Clear my answer')).toBe('clear_answer')
    expect(detectVoiceCommand('Let us start over')).toBe('clear_answer')
    expect(detectVoiceCommand('Please clear the answer')).toBe('clear_answer')
  })

  it('detects request hint intent variations', () => {
    expect(detectVoiceCommand('Can you give me a hint?')).toBe('request_hint')
    expect(detectVoiceCommand('I need a hint for this problem')).toBe('request_hint')
    expect(detectVoiceCommand('Please provide a hint')).toBe('request_hint')
  })

  it('detects submit answer intent variations', () => {
    expect(detectVoiceCommand('Submit my answer now')).toBe('submit_answer')
    expect(detectVoiceCommand('I am done with my answer')).toBe('submit_answer')
    expect(detectVoiceCommand('That is my answer, please submit')).toBe('submit_answer')
  })

  it('detects ask clarification intent variations', () => {
    expect(detectVoiceCommand('Can I ask a clarifying question?')).toBe('ask_clarification')
    expect(detectVoiceCommand('I have a clarifying question about constraints')).toBe('ask_clarification')
    expect(detectVoiceCommand('Can you clarify requirements?')).toBe('ask_clarification')
    expect(
      detectVoiceCommand(
        'I am sorry, I didn\'t get what are you trying to ask. Can you please explain your question?'
      )
    ).toBe('ask_clarification')
    expect(detectVoiceCommand('Can you please explain your question?')).toBe('ask_clarification')
    expect(detectVoiceCommand('I do not understand the question')).toBe('ask_clarification')
    expect(detectVoiceCommand('What do you mean by that?')).toBe('ask_clarification')
    expect(detectVoiceCommand('Can you give me an example?')).toBe('ask_clarification')
  })

  it('returns null for non-command technical answers', () => {
    expect(
      detectVoiceCommand('We should use a hash map with two pointers for optimal O(N) complexity')
    ).toBeNull()
    expect(
      detectVoiceCommand('I would shard the database horizontally using a consistent hashing ring')
    ).toBeNull()
  })

  it('sanitizes answer transcript by removing command phrases', () => {
    const raw = 'Can you give me a hint? I will use a Redis cache with LRU eviction'
    const cleaned = sanitizeAnswerTranscript(raw)
    expect(cleaned).not.toContain('give me a hint')
    expect(cleaned).toContain('I will use a Redis cache with LRU eviction')

    const rawClarify = 'Can I ask a clarifying question? We should assume distributed data'
    const cleanedClarify = sanitizeAnswerTranscript(rawClarify)
    expect(cleanedClarify).not.toContain('clarifying question')
    expect(cleanedClarify).toContain('We should assume distributed data')
  })
})
