import { FolderKanban, Users, Wallet, Contact2, Network, Layers, Megaphone } from 'lucide-react'

export const ALL_MODULES = [
  { id: 'projects',       label: 'Projets',          icon: FolderKanban   },
  { id: 'hr',             label: 'RH',               icon: Users           },
  { id: 'finance',        label: 'Finance',           icon: Wallet          },
  { id: 'crm',            label: 'CRM',               icon: Contact2        },
  { id: 'collaborateurs', label: 'Collaborateurs',    icon: Network         },
  { id: 'workflow',       label: 'Processus',         icon: Layers          },
  { id: 'marketing',      label: 'Marketing',         icon: Megaphone       },
]

// Maps nav item 'to' path → module id
export const PATH_MODULE_MAP = {
  '/app/projects':       'projects',
  '/app/hr':             'hr',
  '/app/finance':        'finance',
  '/app/crm':            'crm',
  '/app/collaborateurs': 'collaborateurs',
  '/app/workflow':       'workflow',
  '/app/marketing':      'marketing',
}
