export interface SpeechTranscriptEvent {
  transcript: string
  isFinal: boolean
}

type SpeechCallback = (event: SpeechTranscriptEvent) => void

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error?: string }) => void) | null
  start: () => void
  stop: () => void
}

interface SpeechRecognitionEventLike {
  resultIndex: number
  results: ArrayLike<{
    isFinal: boolean
    0: { transcript: string }
  }>
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
}

export async function startRecording(stream?: MediaStream): Promise<MediaRecorder> {
  const mediaStream =
    stream ??
    (await navigator.mediaDevices.getUserMedia({
      audio: true,
    }))
  const recorder = new MediaRecorder(mediaStream)
  recorder.start()
  return recorder
}

export function stopRecording(recorder: MediaRecorder): Promise<Blob> {
  return new Promise((resolve) => {
    const chunks: Blob[] = []
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data)
    }
    recorder.onstop = () => {
      recorder.stream.getTracks().forEach((track) => track.stop())
      resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }))
    }
    recorder.stop()
  })
}

export function createWebSpeechTranscriber(callback: SpeechCallback) {
  if (typeof window === 'undefined') return null
  const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition
  if (!Recognition) return null

  const recognition = new Recognition()
  recognition.lang = 'fr-FR'
  recognition.continuous = true
  recognition.interimResults = true
  recognition.onresult = (event) => {
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index]
      callback({ transcript: result[0].transcript, isFinal: result.isFinal })
    }
  }
  recognition.onerror = (event) => {
    console.warn('Speech recognition error:', event.error)
  }
  return recognition
}
