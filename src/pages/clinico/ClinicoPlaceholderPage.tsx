import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'

export default function ClinicoPlaceholderPage(props: { title: string }) {
  const location = useLocation()
  const subtitle = useMemo(() => location.pathname, [location.pathname])

  return (
    <div className="p-6">
      <div className="max-w-6xl">
        <h1 className="text-2xl font-semibold tracking-tight">{props.title}</h1>
        <p className="text-ink-500 text-sm mt-1">{subtitle}</p>

        <div className="mt-6 bg-surface border border-cream-300 rounded-2xl p-6 text-ink-700">
          Em breve.
        </div>
      </div>
    </div>
  )
}

