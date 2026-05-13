import { useEffect, useState } from 'react'
import { Timer } from 'lucide-react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'

export function VisitInProgress({ startedAt }: { startedAt: string | null }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])
  const start = startedAt ? new Date(startedAt).getTime() : now
  const elapsed = Math.max(0, Math.floor((now - start) / 1000))
  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60
  return (
    <Card className="border-emerald-200 bg-emerald-50/40">
      <CardHeader>
        <CardTitle icon={<Timer className="w-4 h-4" />}>Visite en cours</CardTitle>
      </CardHeader>
      <CardBody>
        <p className="font-mono text-3xl font-semibold text-emerald-800">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </p>
        <p className="mt-1 text-sm text-emerald-700">Le temps sera calcule a la validation finale.</p>
      </CardBody>
    </Card>
  )
}
