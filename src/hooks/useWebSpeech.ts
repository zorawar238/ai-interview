'use client'

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react'

// Browser types for Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message?: string
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onstart: ((this: ISpeechRecognition, ev: Event) => void) | null
  onresult: ((this: ISpeechRecognition, ev: SpeechRecognitionEvent) => void) | null
  onerror: ((this: ISpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null
  onend: ((this: ISpeechRecognition, ev: Event) => void) | null
}

declare global {
  interface Window {
    SpeechRecognition?: new () => ISpeechRecognition
    webkitSpeechRecognition?: new () => ISpeechRecognition
  }
}

const emptySubscribe = () => () => {}
const emptyVoices: SpeechSynthesisVoice[] = []
let cachedVoices: SpeechSynthesisVoice[] = emptyVoices

function areVoicesEqual(a: SpeechSynthesisVoice[], b: SpeechSynthesisVoice[]): boolean {
  if (a === b) return true
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i].name !== b[i].name || a[i].lang !== b[i].lang) {
      return false
    }
  }
  return true
}

function subscribeVoices(callback: () => void) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return () => {}
  }
  window.speechSynthesis.addEventListener('voiceschanged', callback)
  return () => {
    window.speechSynthesis.removeEventListener('voiceschanged', callback)
  }
}

function getVoicesSnapshot(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return emptyVoices
  }
  const current = window.speechSynthesis.getVoices()
  if (!areVoicesEqual(current, cachedVoices)) {
    cachedVoices = current
  }
  return cachedVoices
}

const getServerVoicesSnapshot = () => emptyVoices

const getSTTSupported = () =>
  typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)

const getTTSSupported = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window

const getBooleanFalse = () => false

/**
 * Strips code blocks, markdown asterisks, backticks, and URLs so synthetic
 * speech synthesis produces natural, articulate speech.
 */
function sanitizeTextForSpeech(raw: string): string {
  return raw
    // Remove fenced code blocks
    .replace(/```[\s\S]*?```/g, ' [code implementation omitted] ')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove markdown headers, bold, italics
    .replace(/[#*_~>]/g, ' ')
    // Remove markdown links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Collapse multi-whitespace
    .replace(/\s+/g, ' ')
    .trim()
}

export interface UseWebSpeechOptions {
  onTranscript?: (text: string) => void
  preferredLanguage?: string
}

export function useWebSpeech(options: UseWebSpeechOptions = {}) {
  const { onTranscript, preferredLanguage = 'en-US' } = options

  // 1. External Store subscriptions for browser capabilities (SSR & React 19 compiler pure)
  const isSTTSupported = useSyncExternalStore(
    emptySubscribe,
    getSTTSupported,
    getBooleanFalse
  )

  const isTTSSupported = useSyncExternalStore(
    emptySubscribe,
    getTTSSupported,
    getBooleanFalse
  )

  const voices = useSyncExternalStore(
    subscribeVoices,
    getVoicesSnapshot,
    getServerVoicesSnapshot
  )

  // Recognition (STT) State
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [recognitionError, setRecognitionError] = useState<string | null>(null)

  // Synthesis (TTS) State
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [currentSpeakingText, setCurrentSpeakingText] = useState<string | null>(null)

  const recognitionRef = useRef<ISpeechRecognition | null>(null)
  const onTranscriptRef = useRef(onTranscript)

  useEffect(() => {
    onTranscriptRef.current = onTranscript
  }, [onTranscript])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {}
      }
    }
  }, [])

  // 2. Start Speech-to-Text Recognition
  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognitionClass) {
      setRecognitionError('Speech recognition is not supported in this browser. Please try Google Chrome, MS Edge, or Brave.')
      return
    }

    setRecognitionError(null)

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {}
      }

      const recognition = new SpeechRecognitionClass()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = preferredLanguage

      recognition.onstart = () => {
        setIsListening(true)
        setRecognitionError(null)
      }

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = ''
        let final = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i]
          if (item.isFinal) {
            final += item[0].transcript
          } else {
            interim += item[0].transcript
          }
        }

        const combined = (final || interim).trim()
        if (combined) {
          setTranscript(combined)
          if (final && onTranscriptRef.current) {
            onTranscriptRef.current(final)
          }
        }
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.warn('Speech recognition notice:', event.error)
        if (event.error === 'not-allowed') {
          setRecognitionError('Microphone permission denied. Please allow microphone access in your browser.')
        } else if (event.error === 'no-speech') {
          // Expected during pauses
        } else {
          setRecognitionError(`Recognition notice: ${event.error}`)
        }
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognition.start()
      recognitionRef.current = recognition
    } catch (err) {
      console.error('Failed to initialize speech recognition:', err)
      setIsListening(false)
      setRecognitionError('Could not start microphone listener. Check browser permissions.')
    }
  }, [preferredLanguage])

  // 3. Stop Speech-to-Text Recognition
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {}
      setIsListening(false)
    }
  }, [])

  // 4. Speech-to-Text Toggle
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  // 5. Speak Aloud via Text-to-Speech
  const speak = useCallback(
    (textToSpeak: string, onFinished?: () => void) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

      // Cancel previous speech immediately
      window.speechSynthesis.cancel()

      const cleaned = sanitizeTextForSpeech(textToSpeak)
      if (!cleaned) return

      const utterance = new SpeechSynthesisUtterance(cleaned)
      utterance.lang = preferredLanguage
      utterance.rate = 1.05 // natural conversational cadence
      utterance.pitch = 1.0

      // Pick preferred English voice if available
      if (voices.length > 0) {
        const naturalVoice =
          voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Neural'))) ||
          voices.find((v) => v.lang.startsWith('en')) ||
          voices[0]

        if (naturalVoice) {
          utterance.voice = naturalVoice
        }
      }

      utterance.onstart = () => {
        setIsSpeaking(true)
        setCurrentSpeakingText(textToSpeak)
      }

      utterance.onend = () => {
        setIsSpeaking(false)
        setCurrentSpeakingText(null)
        if (onFinished) onFinished()
      }

      utterance.onerror = (e) => {
        console.warn('Speech synthesis utterance error:', e)
        setIsSpeaking(false)
        setCurrentSpeakingText(null)
      }

      window.speechSynthesis.speak(utterance)
    },
    [preferredLanguage, voices]
  )

  // 6. Stop Speaking
  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      setCurrentSpeakingText(null)
    }
  }, [])

  return {
    // Recognition
    isListening,
    transcript,
    recognitionError,
    isSTTSupported,
    startListening,
    stopListening,
    toggleListening,

    // Synthesis
    isSpeaking,
    currentSpeakingText,
    isTTSSupported,
    voices,
    speak,
    stopSpeaking,
  }
}
