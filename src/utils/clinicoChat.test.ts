import { describe, expect, it } from 'vitest'

import { filterContacts, getSelectedContact, type ChatContact } from './clinicoChat'

const base: ChatContact = {
  id: '1',
  department: 'recepcao',
  name: 'Atendente Paula',
  roleLabel: 'Recepção',
  preview: 'Boa tarde',
  time: '14:20',
  online: true,
  email: 'a@a.com',
  ext: 'Ramal: 1',
  sharedFiles: [],
  messages: [],
}

describe('clinicoChat utils', () => {
  it('filters by department', () => {
    const contacts: ChatContact[] = [base, { ...base, id: '2', department: 'medicos', name: 'Dr. X' }]
    expect(filterContacts(contacts, { department: 'recepcao', query: '' }).map((c) => c.id)).toEqual(['1'])
    expect(filterContacts(contacts, { department: 'medicos', query: '' }).map((c) => c.id)).toEqual(['2'])
  })

  it('filters by query across name/preview/roleLabel', () => {
    const contacts: ChatContact[] = [
      base,
      { ...base, id: '2', name: 'Marcos', preview: 'Exames chegaram', roleLabel: 'Recepção Central' },
    ]
    expect(filterContacts(contacts, { department: 'recepcao', query: 'exames' }).map((c) => c.id)).toEqual(['2'])
    expect(filterContacts(contacts, { department: 'recepcao', query: 'paula' }).map((c) => c.id)).toEqual(['1'])
  })

  it('returns null when no selection', () => {
    expect(getSelectedContact([base], null)).toBe(null)
  })
})

