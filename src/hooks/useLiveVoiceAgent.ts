'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useWebSpeech } from './useWebSpeech'
import { detectVoiceCommand, sanitizeAnswerTranscript } from '@/lib/voice/commands'

export type VoiceAgentStatus =
  | 'idle'
  | 'speaking_question'
  | 'listening'
  | 'repeating_question'
  | 'speaking_hint'
  | 'speaking_clarification'
  | 'submitting'
  | 'paused'

export interface UseLiveVoiceAgentOptions {
  questionNumber: number
  totalQuestions: number
  topic: string
  prompt: string
  onTranscriptUpdate: (transcribedChunk: string) => void
  onClearAnswer: () => void
  onRequestHint?: () => void
  onSubmitAnswer?: () => void
  onAskClarification?: (spokenQuery: string) => void
  speechRate?: number
  speechPitch?: number
  selectedVoiceName?: string
  autoStartOnMount?: boolean
}

export function useLiveVoiceAgent({
  questionNumber,
  totalQuestions,
  topic,
  prompt,
  onTranscriptUpdate,
  onClearAnswer,
  onRequestHint,
  onSubmitAnswer,
  onAskClarification,
  speechRate = 1.05,
  speechPitch = 1.0,
  selectedVoiceName,
  autoStartOnMount = true,
}: UseLiveVoiceAgentOptions) {
  const [agentStatus, setAgentStatus] = useState<VoiceAgentStatus>('idle')
  const [commandNotice, setCommandNotice] = useState<string | null>(null)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [isStarted, setIsStarted] = useState(false)
  const [micVolume, setMicVolume] = useState<number>(0) // 0 to 100 real volume

  // Track active question to prevent duplicate triggers
  const lastSpokenQuestionRef = useRef<number | null>(null)
  const isRepeatingRef = useRef(false)
  const isHintingRef = useRef(false)
  const isClarifyingRef = useRef(false)
  const onTranscriptRef = useRef(onTranscriptUpdate)
  const onClearRef = useRef(onClearAnswer)
  const onRequestHintRef = useRef(onRequestHint)
  const onSubmitAnswerRef = useRef(onSubmitAnswer)
  const onAskClarificationRef = useRef(onAskClarification)

  // Web Audio API refs for real microphone volume sampling
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number | null>(null)

  useEffect(() => {
    onTranscriptRef.current = onTranscriptUpdate
  }, [onTranscriptUpdate])

  useEffect(() => {
    onClearRef.current = onClearAnswer
  }, [onClearAnswer])

  useEffect(() => {
    onRequestHintRef.current = onRequestHint
  }, [onRequestHint])

  useEffect(() => {
    onSubmitAnswerRef.current = onSubmitAnswer
  }, [onSubmitAnswer])

  useEffect(() => {
    onAskClarificationRef.current = onAskClarification
  }, [onAskClarification])

  // Dedicated speech synthesis player
  const speech = useWebSpeech({
    defaultRate: speechRate,
    defaultPitch: speechPitch,
    preferredVoiceName: selectedVoiceName,
    onTranscript: (spokenPhrase) => {
      handleCandidateSpokenPhrase(spokenPhrase)
    },
  })

  // Full introductory text to speak
  const questionIntroText = `Question ${questionNumber} of ${totalQuestions} in ${topic}. ${prompt}`

  // Stop real microphone volume sampling
  const stopAudioVolumeMonitoring = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close()
      } catch {}
      audioContextRef.current = null
    }
    setMicVolume(0)
  }, [])

  // Start real microphone volume sampling via Web Audio AnalyserNode
  const startAudioVolumeMonitoring = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) return

    stopAudioVolumeMonitoring()

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        mediaStreamRef.current = stream
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        if (!AudioContextClass) return

        const audioCtx = new AudioContextClass()
        audioContextRef.current = audioCtx

        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 64
        analyserRef.current = analyser

        const source = audioCtx.createMediaStreamSource(stream)
        source.connect(analyser)

        const dataArray = new Uint8Array(analyser.frequencyBinCount)

        const updateVolume = () => {
          if (!analyserRef.current) return
          analyserRef.current.getByteFrequencyData(dataArray)

          let sum = 0
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i]
          }
          const average = sum / dataArray.length
          // Normalize to 0 - 100 scale
          const normalized = Math.min(Math.round((average / 128) * 100), 100)
          setMicVolume(normalized)

          animFrameRef.current = requestAnimationFrame(updateVolume)
        }

        updateVolume()
      })
      .catch(() => {
        // Fallback gracefully without throwing
        setMicVolume(0)
      })
  }, [stopAudioVolumeMonitoring])

  // Function to begin listening hands-free
  const beginListeningHandsFree = useCallback(() => {
    setAgentStatus('listening')
    setCommandNotice(null)
    speech.startListening()
    startAudioVolumeMonitoring()
  }, [speech, startAudioVolumeMonitoring])

  // Speak Socratic hint aloud
  const speakHintAloud = useCallback(
    (hintText: string) => {
      speech.stopListening()
      stopAudioVolumeMonitoring()
      setAgentStatus('speaking_hint')
      setCommandNotice('Interviewer reading Socratic hint aloud...')

      speech.speak(`Here is a hint: ${hintText}`, () => {
        beginListeningHandsFree()
      })
    },
    [speech, stopAudioVolumeMonitoring, beginListeningHandsFree]
  )

  // Speak clarifying response aloud
  const speakClarificationAloud = useCallback(
    (clarificationText: string) => {
      speech.stopListening()
      stopAudioVolumeMonitoring()
      setAgentStatus('speaking_clarification')
      setCommandNotice('Interviewer answering clarification...')

      speech.speak(clarificationText, () => {
        beginListeningHandsFree()
      })
    },
    [speech, stopAudioVolumeMonitoring, beginListeningHandsFree]
  )

  // Articulate question and then auto-transition to listening
  const speakQuestionAndListen = useCallback(
    (isRepeat = false) => {
      speech.stopListening()
      stopAudioVolumeMonitoring()

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
        beginListeningHandsFree()
      })
    },
    [speech, prompt, questionIntroText, stopAudioVolumeMonitoring, beginListeningHandsFree]
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

      if (command === 'request_hint') {
        if (!isHintingRef.current && onRequestHintRef.current) {
          isHintingRef.current = true
          setCommandNotice('Command detected: "Provide Hint"')
          onRequestHintRef.current()
          setTimeout(() => {
            isHintingRef.current = false
          }, 4000)
        }
        return
      }

      if (command === 'ask_clarification') {
        if (!isClarifyingRef.current && onAskClarificationRef.current) {
          isClarifyingRef.current = true
          setCommandNotice('Command detected: "Clarifying Question"')
          onAskClarificationRef.current(spokenText)
          setTimeout(() => {
            isClarifyingRef.current = false
          }, 4000)
        }
        return
      }

      if (command === 'submit_answer') {
        setCommandNotice('Command detected: "Submit Answer"')
        speech.stopListening()
        stopAudioVolumeMonitoring()
        setAgentStatus('submitting')
        speech.speak('Submitting your verbal answer for evaluation.', () => {
          if (onSubmitAnswerRef.current) {
            onSubmitAnswerRef.current()
          }
        })
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
    [speakQuestionAndListen, speech, stopAudioVolumeMonitoring]
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
      stopAudioVolumeMonitoring()
      setAgentStatus('paused')
    } else if (agentStatus === 'paused') {
      beginListeningHandsFree()
    }
  }, [agentStatus, speech, stopAudioVolumeMonitoring, beginListeningHandsFree])

  // Stop everything
  const stopAll = useCallback(() => {
    speech.stopSpeaking()
    speech.stopListening()
    stopAudioVolumeMonitoring()
    setAgentStatus('idle')
    setCommandNotice(null)
  }, [speech, stopAudioVolumeMonitoring])

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
    micVolume,
    isSTTSupported: speech.isSTTSupported,
    isTTSSupported: speech.isTTSSupported,
    recognitionError: speech.recognitionError,
    transcript: speech.transcript,
    voices: speech.voices,
    startLiveSession,
    triggerRepeat,
    speakHintAloud,
    speakClarificationAloud,
    toggleListeningPause,
    stopAll,
  }
}
