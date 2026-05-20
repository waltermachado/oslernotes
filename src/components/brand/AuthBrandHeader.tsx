import React from 'react'

import { BRAND } from '../../brand/branding'
import BrandLogo from './BrandLogo'

export default function AuthBrandHeader(props: { className?: string }) {
  return (
    <div className={props.className}>
      <div className="flex flex-col items-center">
        <BrandLogo className="h-[60px] w-auto max-w-[200px] mb-4" />
        <h1 className="text-3xl font-bold text-ink-900 mb-2 tracking-tight">{BRAND.appName}</h1>
        <p className="text-ink-500 text-sm text-center">{BRAND.tagline}</p>
      </div>
    </div>
  )
}
