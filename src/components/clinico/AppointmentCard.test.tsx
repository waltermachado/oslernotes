import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

import AppointmentCard, { type Appointment } from './AppointmentCard'

function render(appt: Appointment, height: number) {
  return renderToStaticMarkup(<AppointmentCard appt={appt} top={0} height={height} />)
}

describe('AppointmentCard', () => {
  const base: Appointment = {
    id: 'a1',
    patientName: 'Maria Silvia Santos',
    patientInitials: 'MS',
    description: 'Eletrocardiograma (ECG)',
    status: 'AGUARDANDO',
    startMinutes: 10 * 60,
    durationMinutes: 45,
  }

  it('renders compact layout when height is small', () => {
    const html = render(base, 60)
    expect(html).toContain('Maria Silvia Santos')
    expect(html).not.toContain('Eletrocardiograma')
    expect(html).not.toContain('45 min')
  })

  it('renders full layout when height is sufficient', () => {
    const html = render(base, 120)
    expect(html).toContain('Maria Silvia Santos')
    expect(html).toContain('Eletrocardiograma')
    expect(html).toContain('45 min')
  })
})

