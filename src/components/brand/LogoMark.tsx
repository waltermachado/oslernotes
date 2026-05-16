import React from 'react'

export type LogoMarkProps = {
  title?: string
  className?: string
  variant?: 'mark' | 'seal'
}

export default function LogoMark(props: LogoMarkProps) {
  const title = String(props.title ?? 'Osler Notes')
  const variant = props.variant ?? 'mark'
  const sealId = React.useId()
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      className={props.className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <circle cx="32" cy="32" r="29" fill="none" stroke="#B8A16A" strokeWidth="1.6" />
      <circle cx="32" cy="32" r="27" fill="none" stroke="#0B2034" strokeWidth="2.2" />
      <circle cx="32" cy="32" r="23.5" fill="none" stroke="#B8A16A" strokeWidth="1.3" opacity="0.9" />

      {variant === 'seal' && (
        <>
          <path id={`${sealId}-top`} d="M8 32a24 24 0 0 1 48 0" fill="none" />
          <path id={`${sealId}-bottom`} d="M56 32a24 24 0 0 1-48 0" fill="none" />
          <text fill="#0B2034" fontSize="5.4" fontWeight="700" letterSpacing="0.18em">
            <textPath href={`#${sealId}-top`} startOffset="50%" textAnchor="middle">
              OSLER NOTES
            </textPath>
          </text>
          <text fill="#0B2034" fontSize="4.2" fontWeight="700" letterSpacing="0.14em">
            <textPath href={`#${sealId}-bottom`} startOffset="50%" textAnchor="middle">
              ELECTRONIC MEDICAL RECORD
            </textPath>
          </text>
        </>
      )}

      <path
        d="M32 45.5c-6.2-4.3-12.5-9.5-12.5-16.2 0-3.6 2.7-6.6 6.4-6.6 2.7 0 4.8 1.5 6.1 3.4 1.3-1.9 3.4-3.4 6.1-3.4 3.7 0 6.4 3 6.4 6.6 0 6.7-6.3 11.9-12.5 16.2Z"
        fill="none"
        stroke="#0B2034"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <path
        d="M10.5 32h10.2m22.6 0h5.7l3.6-3.6m-3.6 3.6 3.6 3.6"
        fill="none"
        stroke="#0B2034"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10.5" cy="32" r="2.1" fill="#0B2034" />
      <circle cx="55.9" cy="28.4" r="2.1" fill="#0B2034" />
      <circle cx="55.9" cy="35.6" r="2.1" fill="#0B2034" />
    </svg>
  )
}
