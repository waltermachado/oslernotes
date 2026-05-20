import { cn } from '../../lib/utils'

type Tone = 'ok' | 'info' | 'warn' | 'bad' | 'gold' | 'gray'

const TONE_CLASSES: Record<Tone, string> = {
  ok:   'bg-sage-50  text-sage-400  border-sage-100',
  info: 'bg-navy-50  text-navy-500  border-navy-100',
  warn: 'bg-clay-50  text-clay-400  border-clay-100',
  bad:  'bg-rose-50  text-rose-400  border-rose-100',
  gold: 'bg-gold-50  text-gold-600  border-gold-100',
  gray: 'bg-cream-200 text-ink-600  border-cream-300',
}

type Props = {
  tone?: Tone
  dot?: boolean
  children: React.ReactNode
  className?: string
}

export default function StatusPill({ tone = 'info', dot = true, children, className }: Props) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold uppercase tracking-[0.18em] leading-none',
      TONE_CLASSES[tone],
      className,
    )}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />}
      {children}
    </span>
  )
}
