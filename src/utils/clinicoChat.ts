export type ChatDepartment = 'medicos' | 'recepcao'

export type ChatMessage = {
  id: string
  direction: 'in' | 'out'
  text: string
  time: string
}

export type ChatSharedFile = {
  id: string
  name: string
  meta: string
}

export type ChatContact = {
  id: string
  department: ChatDepartment
  name: string
  roleLabel: string
  preview: string
  time: string
  online: boolean
  email: string
  ext: string
  sharedFiles: ChatSharedFile[]
  messages: ChatMessage[]
}

export function filterContacts(contacts: ChatContact[], params: { department: ChatDepartment; query: string }) {
  const q = params.query.trim().toLowerCase()
  return contacts
    .filter((c) => c.department === params.department)
    .filter((c) => {
      if (!q) return true
      const hay = `${c.name} ${c.preview} ${c.roleLabel}`.toLowerCase()
      return hay.includes(q)
    })
}

export function getSelectedContact(contacts: ChatContact[], selectedId: string | null) {
  if (!selectedId) return null
  return contacts.find((c) => c.id === selectedId) ?? null
}

