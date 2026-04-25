import { useMemo, useState } from 'react'

import ConversationList from '../../components/clinico/chat/ConversationList'
import ChatThread from '../../components/clinico/chat/ChatThread'
import ChatInfoPanel from '../../components/clinico/chat/ChatInfoPanel'
import { filterContacts, getSelectedContact, type ChatDepartment } from '../../utils/clinicoChat'
import { CHAT_CONTACTS } from '../../utils/clinicoChatMock'

export default function ClinicoChatPage() {
  const [department, setDepartment] = useState<ChatDepartment>('recepcao')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const contacts = useMemo(
    () => filterContacts(CHAT_CONTACTS, { department, query }),
    [department, query],
  )

  const selected = useMemo(
    () => getSelectedContact(CHAT_CONTACTS, selectedId),
    [selectedId],
  )

  return (
    <div className="p-0">
      <div className="h-[calc(100vh-64px)]">
        <div className="h-full grid grid-cols-[360px_1fr_340px]">
          <ConversationList
            title="Mensagens Internas"
            department={department}
            onDepartmentChange={(v) => {
              setDepartment(v)
              setSelectedId(null)
            }}
            query={query}
            onQueryChange={setQuery}
            contacts={contacts}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />

          <ChatThread contact={selected} />

          <ChatInfoPanel contact={selected} />
        </div>
      </div>
    </div>
  )
}

