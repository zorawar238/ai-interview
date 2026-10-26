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
// Retain module-level active utterance reference to prevent Chromium V8 garbage collection
let globalActiveUtterance: SpeechSynthesisUtterance | null = null

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
  defaultRate?: number
  defaultPitch?: number
  preferredVoiceName?: string
}

export function useWebSpeech(options: UseWebSpeechOptions = {}) {
  const {
    onTranscript,
    preferredLanguage = 'en-US',
    defaultRate = 1.05,
    defaultPitch = 1.0,
    preferredVoiceName,
  } = options

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
    (
      textToSpeak: string,
      onFinished?: () => void,
      customOptions?: { rate?: number; pitch?: number; voiceName?: string }
    ) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        if (onFinished) onFinished()
        return
      }

      // Resume if previously stuck in paused state
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume()
        }
        window.speechSynthesis.cancel()
      } catch {}

      const cleaned = sanitizeTextForSpeech(textToSpeak)
      if (!cleaned) {
        if (onFinished) onFinished()
        return
      }

      const utterance = new SpeechSynthesisUtterance(cleaned)
      utterance.lang = preferredLanguage
      utterance.rate = customOptions?.rate ?? defaultRate
      utterance.pitch = customOptions?.pitch ?? defaultPitch

      // Pick selected or preferred English voice if available
      const availableVoices = voices.length > 0 ? voices : window.speechSynthesis.getVoices()
      if (availableVoices && availableVoices.length > 0) {
        const targetVoiceName = customOptions?.voiceName || preferredVoiceName
        let selectedVoice: SpeechSynthesisVoice | undefined
        if (targetVoiceName) {
          selectedVoice = availableVoices.find((v) => v.name === targetVoiceName)
        }
        if (!selectedVoice) {
          selectedVoice =
            availableVoices.find(
              (v) =>
                v.lang.startsWith('en') &&
                (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Neural'))
            ) ||
            availableVoices.find((v) => v.lang.startsWith('en')) ||
            availableVoices[0]
        }

        if (selectedVoice) {
          utterance.voice = selectedVoice
        }
      }

      globalActiveUtterance = utterance

      let hasCleanedUp = false
      let resumeInterval: ReturnType<typeof setInterval> | null = null

      const cleanup = () => {
        if (hasCleanedUp) return
        hasCleanedUp = true
        if (resumeInterval) {
          clearInterval(resumeInterval)
          resumeInterval = null
        }
        globalActiveUtterance = null
        setIsSpeaking(false)
        setCurrentSpeakingText(null)
      }

      utterance.onstart = () => {
        setIsSpeaking(true)
        setCurrentSpeakingText(textToSpeak)

        // Workaround for Chromium timer issue on long utterances
        resumeInterval = setInterval(() => {
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            if (window.speechSynthesis.speaking) {
              window.speechSynthesis.pause()
              window.speechSynthesis.resume()
            } else if (resumeInterval) {
              clearInterval(resumeInterval)
              resumeInterval = null
            }
          }
        }, 12000)
      }

      utterance.onend = () => {
        cleanup()
        if (onFinished) onFinished()
      }

      utterance.onerror = (e) => {
        cleanup()
        console.warn('Speech synthesis utterance event notice:', e)
        if (onFinished) onFinished()
      }

      try {
        window.speechSynthesis.speak(utterance)
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume()
        }
      } catch (err) {
        console.error('Failed to speak utterance:', err)
        cleanup()
        if (onFinished) onFinished()
      }
    },
    [preferredLanguage, defaultRate, defaultPitch, preferredVoiceName, voices]
  )

  // 6. Stop Speaking
  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      globalActiveUtterance = null
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
