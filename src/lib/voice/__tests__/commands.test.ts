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

  it('returns null for non-command technical answers', () => {
    expect(
      detectVoiceCommand('We should use a hash map with two pointers for optimal O(N) complexity')
    ).toBeNull()
    expect(
      detectVoiceCommand('I would shard the database horizontally using a consistent hashing ring')
    ).toBeNull()
  })

  it('sanitizes answer transcript by removing command phrases', () => {
    const raw = 'Can you repeat the question? I will use a Redis cache with LRU eviction'
    const cleaned = sanitizeAnswerTranscript(raw)
    expect(cleaned).not.toContain('repeat the question')
    expect(cleaned).toContain('I will use a Redis cache with LRU eviction')
  })
})
