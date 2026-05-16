import React from 'react'

import { BRAND_ASSETS } from '../../brand/branding'

type BrandLogoProps = {
  className?: string
}

export default function BrandLogo(props: BrandLogoProps) {
  return (
    <picture>
      <source type="image/webp" srcSet={BRAND_ASSETS.logoWebp256Path} />
      <source type="image/png" srcSet={BRAND_ASSETS.logoPng256Path} />
      <img
        src={BRAND_ASSETS.logoSvgPath}
        alt="Osler Notes Logo"
        className={props.className}
        loading="eager"
        decoding="async"
      />
    </picture>
  )
}
