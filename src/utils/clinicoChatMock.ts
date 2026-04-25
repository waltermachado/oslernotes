import type { ChatContact } from './clinicoChat'

export const CHAT_CONTACTS: ChatContact[] = [
  {
    id: 'c1',
    department: 'recepcao',
    name: 'Atendente Paula',
    roleLabel: 'Recepção',
    preview: 'Boa tarde Doutora, o paciente das 15h já chegou…',
    time: '14:20',
    online: true,
    email: 'paula.recepcao@osler.com',
    ext: 'Ramal: 402',
    sharedFiles: [
      { id: 'f1', name: 'relatorio_diario.pdf', meta: '12 MB - Ontem' },
      { id: 'f2', name: 'comprovante_pix.png', meta: '450 KB - Ontem' },
    ],
    messages: [
      {
        id: 'm1',
        direction: 'in',
        text: 'Olá Doutora, boa tarde! O paciente Sr. Roberto (15:00) já chegou e está aguardando na recepção principal.',
        time: '14:18',
      },
      {
        id: 'm2',
        direction: 'out',
        text: 'Boa tarde, Paula! Perfeito. Pode pedir para ele aguardar só 5 minutinhos enquanto finalizo um prontuário?',
        time: '14:19',
      },
      {
        id: 'm3',
        direction: 'in',
        text: 'Boa tarde Doutora, o paciente das 15h já confirmou que aguardará sem problemas.',
        time: '14:20',
      },
    ],
  },
  {
    id: 'c2',
    department: 'recepcao',
    name: 'Marcos - Recepção Central',
    roleLabel: 'Recepção Central',
    preview: 'Os exames do Sr. João chegaram por e-mail…',
    time: 'Ontem',
    online: true,
    email: 'marcos.recepcao@osler.com',
    ext: 'Ramal: 407',
    sharedFiles: [],
    messages: [
      {
        id: 'm1',
        direction: 'in',
        text: 'Os exames chegaram e já estão no sistema. Posso encaminhar para a doutora?',
        time: '16:02',
      },
    ],
  },
  {
    id: 'c3',
    department: 'recepcao',
    name: 'Julia - Balcão 02',
    roleLabel: 'Balcão 02',
    preview: 'Cliente, estarei enviando a guia agora.',
    time: 'Ontem',
    online: true,
    email: 'julia.balcao@osler.com',
    ext: 'Ramal: 410',
    sharedFiles: [],
    messages: [
      {
        id: 'm1',
        direction: 'in',
        text: 'Vou enviar a guia no chat assim que finalizar o cadastro.',
        time: '11:42',
      },
    ],
  },
  {
    id: 'c4',
    department: 'medicos',
    name: 'Dr. Henrique Vieira',
    roleLabel: 'Cardiologista',
    preview: 'Pode me confirmar o encaixe de amanhã?',
    time: '09:12',
    online: false,
    email: 'henrique@osler.com',
    ext: 'Ramal: 301',
    sharedFiles: [],
    messages: [
      {
        id: 'm1',
        direction: 'in',
        text: 'Pode me confirmar o encaixe de amanhã?',
        time: '09:12',
      },
    ],
  },
]

