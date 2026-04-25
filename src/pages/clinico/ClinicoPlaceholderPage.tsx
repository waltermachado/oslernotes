import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'

export default function ClinicoPlaceholderPage(props: { title: string }) {
  const location = useLocation()
  const subtitle = useMemo(() => location.pathname, [location.pathname])

  return (
    <div className="p-6">
      <div className="max-w-6xl">
        <h1 className="text-2xl font-semibold tracking-tight">{props.title}</h1>
        <p className="text-gray-400 text-sm mt-1">{subtitle}</p>

        <div className="mt-6 bg-dark-card border border-gray-800 rounded-2xl p-6 text-gray-300">
          Em breve.
        </div>
      </div>
    </div>
  )
}

