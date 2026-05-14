import { useMemo, useRef, useState } from 'react'
import { Mic, Square, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Field'
import { createWebSpeechTranscriber } from '@/lib/voiceRecording'
import { structureVisitTranscript, type StructuredVisitTranscript } from '@/server/voiceTranscription.functions'

export function VoiceRecorder({
  transcript,
  onTranscriptChange,
  onStructured,
}: {
  transcript: string
  onTranscriptChange: (value: string) => void
  onStructured: (value: StructuredVisitTranscript) => void
}) {
  const recognitionRef = useRef<ReturnType<typeof createWebSpeechTranscriber>>(null)
  const [listening, setListening] = useState(false)
  const [structuring, setStructuring] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supported = useMemo(() => typeof window !== 'undefined' && Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition), [])

  function start() {
    setError(null)
    const recognition = createWebSpeechTranscriber((event) => {
      if (event.isFinal) onTranscriptChange(`${transcript} ${event.transcript}`.trim())
    })
    if (!recognition) {
      setError('Dictee vocale indisponible sur ce navigateur.')
      return
    }
    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  function stop() {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setListening(false)
  }

  async function structure() {
    if (!transcript.trim()) return
    setStructuring(true)
    setError(null)
    try {
      const result = await structureVisitTranscript({ data: { transcript } })
      onStructured(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setStructuring(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {!listening ? (
          <Button type="button" size="sm" iconLeft={<Mic className="w-4 h-4" />} onClick={start} disabled={!supported}>
            Dicter le CR
          </Button>
        ) : (
          <Button type="button" size="sm" variant="danger" iconLeft={<Square className="w-4 h-4" />} onClick={stop}>
            Arreter
          </Button>
        )}
        <Button type="button" size="sm" variant="secondary" iconLeft={<Wand2 className="w-4 h-4" />} onClick={structure} disabled={structuring || !transcript.trim()}>
          {structuring ? 'Structuration...' : 'Structurer avec IA'}
        </Button>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <Textarea value={transcript} onChange={(event) => onTranscriptChange(event.target.value)} placeholder="Dictee ou notes brutes de visite..." className="min-h-32" />
    </div>
  )
}
