import { useEffect, useRef, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface SignatureCanvasProps {
  value: string | null
  onChange: (value: string | null) => void
}

export function SignatureCanvas({ value, onChange }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)
  const [hasInk, setHasInk] = useState(Boolean(value))

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.lineWidth = 2.5
    context.strokeStyle = '#0f172a'
    if (value) {
      const image = new Image()
      image.onload = () => context.drawImage(image, 0, 0, canvas.width, canvas.height)
      image.src = value
    }
  }, [value])

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * event.currentTarget.width,
      y: ((event.clientY - rect.top) / rect.height) * event.currentTarget.height,
    }
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget
    const context = canvas.getContext('2d')
    if (!context) return
    const p = point(event)
    drawingRef.current = true
    canvas.setPointerCapture(event.pointerId)
    context.beginPath()
    context.moveTo(p.x, p.y)
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return
    const context = event.currentTarget.getContext('2d')
    if (!context) return
    const p = point(event)
    context.lineTo(p.x, p.y)
    context.stroke()
    setHasInk(true)
  }

  function end(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return
    drawingRef.current = false
    event.currentTarget.releasePointerCapture(event.pointerId)
    onChange(event.currentTarget.toDataURL('image/png'))
  }

  function clear() {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    setHasInk(false)
    onChange(null)
  }

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-lg border border-[var(--color-border-strong)] bg-white">
        <canvas
          ref={canvasRef}
          width={640}
          height={180}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          className="block h-36 w-full touch-none bg-[linear-gradient(to_bottom,transparent_86%,#cbd5e1_86%,#cbd5e1_87%,transparent_87%)]"
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-[var(--color-text-muted)]">
          Dessinez votre signature au doigt ou a la souris.
        </p>
        <Button type="button" size="sm" variant="secondary" iconLeft={<RotateCcw className="w-3.5 h-3.5" />} onClick={clear} disabled={!hasInk}>
          Effacer
        </Button>
      </div>
    </div>
  )
}
