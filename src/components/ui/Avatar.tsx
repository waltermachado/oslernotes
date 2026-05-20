import { cn } from '../../lib/utils'

type Tone = 'navy' | 'gold' | 'sage' | 'clay' | 'ink'
type Status = 'online' | 'offline'

const TONE_CLASSES: Record<Tone, { bg: string; fg: string }> = {
  navy: { bg: 'bg-navy-100', fg: 'text-navy-500' },
  gold: { bg: 'bg-gold-100', fg: 'text-gold-600' },
  sage: { bg: 'bg-sage-100', fg: 'text-sage-400' },
  clay: { bg: 'bg-clay-100', fg: 'text-clay-400' },
  ink:  { bg: 'bg-ink-900',  fg: 'text-cream-50'  },
}

type Props = {
  name: string
  size?: number
  tone?: Tone
  status?: Status
  photo?: string
  className?: string
}

export default function Avatar({ name, size = 40, tone = 'navy', status, photo, className }: Props) {
  const { bg, fg } = TONE_CLASSES[tone]
  const initials = String(name ?? '')
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map((w) => w[0].toUpperCase()).join('')

  return (
    <div
      className={cn('rounded-full flex items-center justify-center flex-shrink-0 relative overflow-hidden font-bold', bg, fg, className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {photo
        ? <img src={photo} alt={name} className="w-full h-full object-cover" />
        : initials || '?'
      }
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-surface',
            status === 'online' ? 'bg-sage-400' : 'bg-cream-400',
          )}
          style={{ width: Math.max(8, size * 0.28), height: Math.max(8, size * 0.28) }}
        />
      )}
    </div>
  )
}
