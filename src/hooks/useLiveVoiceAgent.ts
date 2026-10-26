'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useWebSpeech } from './useWebSpeech'
import { detectVoiceCommand, sanitizeAnswerTranscript } from '@/lib/voice/commands'

export type VoiceAgentStatus =
  | 'idle'
  | 'speaking_question'
  | 'listening'
  | 'repeating_question'
  | 'paused'

export interface UseLiveVoiceAgentOptions {
  questionNumber: number
  totalQuestions: number
  topic: string
  prompt: string
  onTranscriptUpdate: (transcribedChunk: string) => void
  onClearAnswer: () => void
  autoStartOnMount?: boolean
}

export function useLiveVoiceAgent({
  questionNumber,
  totalQuestions,
  topic,
  prompt,
  onTranscriptUpdate,
  onClearAnswer,
  autoStartOnMount = true,
}: UseLiveVoiceAgentOptions) {
  const [agentStatus, setAgentStatus] = useState<VoiceAgentStatus>('idle')
  const [commandNotice, setCommandNotice] = useState<string | null>(null)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [isStarted, setIsStarted] = useState(false)

  // Track active question to prevent duplicate triggers
  const lastSpokenQuestionRef = useRef<number | null>(null)
  const isRepeatingRef = useRef(false)
  const onTranscriptRef = useRef(onTranscriptUpdate)
  const onClearRef = useRef(onClearAnswer)

  useEffect(() => {
    onTranscriptRef.current = onTranscriptUpdate
  }, [onTranscriptUpdate])

  useEffect(() => {
    onClearRef.current = onClearAnswer
  }, [onClearAnswer])

  // Dedicated speech synthesis player
  const speech = useWebSpeech({
    onTranscript: (spokenPhrase) => {
      handleCandidateSpokenPhrase(spokenPhrase)
    },
  })

  // Full introductory text to speak
  const questionIntroText = `Question ${questionNumber} of ${totalQuestions} in ${topic}. ${prompt}`

  // Function to begin listening hands-free
  const beginListeningHandsFree = useCallback(() => {
    setAgentStatus('listening')
    setCommandNotice(null)
    speech.startListening()
  }, [speech])

  // Articulate question and then auto-transition to listening
  const speakQuestionAndListen = useCallback(
    (isRepeat = false) => {
      // Stop any microphone recording while AI is speaking
      speech.stopListening()

      if (isRepeat) {
        setAgentStatus('repeating_question')
        setCommandNotice('Repeating question aloud...')
      } else {
        setAgentStatus('speaking_question')
        setCommandNotice('Interviewer speaking question...')
      }

      const spokenContent = isRepeat
        ? `Certainly! Let me repeat the question: ${prompt}`
        : questionIntroText

      speech.speak(spokenContent, () => {
        // Callback fired when AI finishes speaking -> Auto-open microphone!
        beginListeningHandsFree()
      })
    },
    [speech, prompt, questionIntroText, beginListeningHandsFree]
  )

  // Process candidate spoken phrase for commands or answer text
  const handleCandidateSpokenPhrase = useCallback(
    (spokenText: string) => {
      const command = detectVoiceCommand(spokenText)

      if (command === 'repeat_question') {
        if (!isRepeatingRef.current) {
          isRepeatingRef.current = true
          setCommandNotice('Command detected: "Repeat Question"')
          speakQuestionAndListen(true)
          setTimeout(() => {
            isRepeatingRef.current = false
          }, 3000)
        }
        return
      }

      if (command === 'clear_answer') {
        setCommandNotice('Command detected: "Clear Answer"')
        if (onClearRef.current) {
          onClearRef.current()
        }
        setTimeout(() => setCommandNotice(null), 2500)
        return
      }

      // If it's normal technical speech, sanitize and append to answer
      const cleaned = sanitizeAnswerTranscript(spokenText)
      if (cleaned && onTranscriptRef.current) {
        onTranscriptRef.current(cleaned)
      }
    },
    [speakQuestionAndListen]
  )

  // Start live session (can be triggered by click or auto)
  const startLiveSession = useCallback(() => {
    setHasInteracted(true)
    setIsStarted(true)
    lastSpokenQuestionRef.current = questionNumber
    speakQuestionAndListen(false)
  }, [questionNumber, speakQuestionAndListen])

  // Explicitly repeat question
  const triggerRepeat = useCallback(() => {
    speakQuestionAndListen(true)
  }, [speakQuestionAndListen])

  // Pause / resume listening
  const toggleListeningPause = useCallback(() => {
    if (agentStatus === 'listening') {
      speech.stopListening()
      setAgentStatus('paused')
    } else if (agentStatus === 'paused') {
      beginListeningHandsFree()
    }
  }, [agentStatus, speech, beginListeningHandsFree])

  // Stop everything
  const stopAll = useCallback(() => {
    speech.stopSpeaking()
    speech.stopListening()
    setAgentStatus('idle')
    setCommandNotice(null)
  }, [speech])

  // When question changes, automatically speak the new question if already started
  useEffect(() => {
    if (isStarted && lastSpokenQuestionRef.current !== questionNumber) {
      lastSpokenQuestionRef.current = questionNumber
      speakQuestionAndListen(false)
    }
  }, [questionNumber, isStarted, speakQuestionAndListen])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAll()
    }
  }, [stopAll])

  return {
    agentStatus,
    commandNotice,
    isStarted,
    hasInteracted,
    isSTTSupported: speech.isSTTSupported,
    isTTSSupported: speech.isTTSSupported,
    recognitionError: speech.recognitionError,
    transcript: speech.transcript,
    startLiveSession,
    triggerRepeat,
    toggleListeningPause,
    stopAll,
  }
}
