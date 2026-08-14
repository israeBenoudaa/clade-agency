import { useState, useEffect, useRef, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, Users, MessageSquare, Search, PenSquare,
  Circle, Trash2, Pencil, Radio, UserCheck, Globe,
  Paperclip, FileText, X, UserPlus, ArrowLeft, Plus, Check,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'

const fmtTime = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const diffDays = Math.floor((now - d) / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Hier'
  if (diffDays < 7) return d.toLocaleDateString('fr-FR', { weekday: 'short' })
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  return (parts[0]?.[0] || '') + (parts[1]?.[0] || '')
}

const fmtSize = (bytes) => {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

const AVATAR_COLORS = [
  'from-blue-500 to-blue-700',
  'from-emerald-500 to-emerald-700',
  'from-violet-500 to-violet-700',
  'from-amber-500 to-amber-600',
  'from-rose-500 to-rose-700',
  'from-cyan-500 to-cyan-700',
]

function getAvatarColor(id) {
  const idx = String(id).split('').reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_COLORS.length
  return AVATAR_COLORS[idx]
}

function StaffGroupModal({ employes, prospects, myId, onClose, onCreate }) {
  const [groupName, setGroupName] = useState('')
  const [selected, setSelected] = useState([]) // emp IDs or `client:${prospectId}`
  const [gSearch, setGSearch] = useState('')
  const [tab, setTab] = useState('equipe') // 'equipe' | 'client'

  const q = gSearch.toLowerCase()
  const empCandidates = employes.filter(e =>
    String(e.id) !== myId &&
    (e.nom.toLowerCase().includes(q) || (e.poste || '').toLowerCase().includes(q))
  )
  const clientCandidates = prospects.filter(p =>
    (`${p.prenom} ${p.nom}`).toLowerCase().includes(q)
  )

  const toggle = (id) => setSelected(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  )

  const MemberRow = ({ id, name, sub, color }) => {
    const isSelected = selected.includes(id)
    return (
      <button onClick={() => toggle(id)}
        className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left
          ${isSelected ? 'bg-electric/10 border border-electric/30' : 'hover:bg-paper-warm border border-transparent'}`}>
        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>
          {getInitials(name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-ink truncate">{name}</div>
          <div className="text-xs text-muted truncate">{sub}</div>
        </div>
        {isSelected && <Check size={14} className="text-electric flex-shrink-0" />}
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="font-semibold text-ink text-sm">Nouveau groupe</div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-paper-warm flex items-center justify-center text-muted">
            <X size={14} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="label-text mb-1.5 block">Nom du groupe</label>
            <input autoFocus value={groupName} onChange={e => setGroupName(e.target.value)}
              placeholder="Ex: Équipe chantier, Suivi projet..." className="input-field" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label-text">Membres</label>
              {selected.length > 0 && (
                <span className="text-[10px] text-electric font-semibold">{selected.length} sélectionné{selected.length > 1 ? 's' : ''}</span>
              )}
            </div>
            {/* Tab toggle */}
            <div className="flex gap-1 p-1 bg-paper-warm rounded-xl border border-border mb-2">
              <button onClick={() => setTab('equipe')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${tab === 'equipe' ? 'bg-white shadow-sm text-ink' : 'text-muted hover:text-ink'}`}>
                Équipe
              </button>
              <button onClick={() => setTab('client')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${tab === 'client' ? 'bg-white shadow-sm text-ink' : 'text-muted hover:text-ink'}`}>
                Clients {prospects.length > 0 && <span className="ml-1 opacity-60">({prospects.length})</span>}
              </button>
            </div>
            <div className="flex items-center gap-2 bg-paper-warm px-3 py-1.5 rounded-lg border border-border mb-2">
              <Search size={11} className="text-muted" />
              <input value={gSearch} onChange={e => setGSearch(e.target.value)}
                placeholder="Rechercher..." className="bg-transparent outline-none text-xs flex-1" />
            </div>
            <div className="space-y-1 max-h-44 overflow-y-auto">
              {tab === 'equipe' ? (
                empCandidates.length === 0
                  ? <div className="py-4 text-center text-xs text-muted">Aucun membre trouvé</div>
                  : empCandidates.map(emp => (
                    <MemberRow key={emp.id} id={String(emp.id)} name={emp.nom} sub={emp.poste || 'Collaborateur'} color={getAvatarColor(emp.id)} />
                  ))
              ) : (
                clientCandidates.length === 0
                  ? <div className="py-4 text-center text-xs text-muted">Aucun client trouvé</div>
                  : clientCandidates.map(p => (
                    <MemberRow key={p.id} id={`client:${p.id}`} name={`${p.prenom} ${p.nom}`} sub={p.typeProjet || 'Client'} color={getAvatarColor(p.id)} />
                  ))
              )}
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="btn-ghost flex-1 justify-center text-xs">Annuler</button>
            <button onClick={() => onCreate(groupName.trim() || 'Groupe', selected)}
              disabled={selected.length === 0}
              className="btn-primary flex-1 justify-center text-xs disabled:opacity-40">
              <Plus size={13} /> Créer
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function AddMembersModal({ employes, prospects, myId, existingMembers, onClose, onAdd }) {
  const [selected, setSelected] = useState([])
  const [gSearch, setGSearch] = useState('')
  const [tab, setTab] = useState('equipe')

  const q = gSearch.toLowerCase()
  const empCandidates = employes.filter(e =>
    String(e.id) !== myId &&
    !existingMembers.includes(String(e.id)) &&
    (e.nom.toLowerCase().includes(q) || (e.poste || '').toLowerCase().includes(q))
  )
  const clientCandidates = prospects.filter(p =>
    !existingMembers.includes(`client:${p.id}`) &&
    (`${p.prenom} ${p.nom}`).toLowerCase().includes(q)
  )

  const toggle = (id) => setSelected(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  )

  const MemberRow = ({ id, name, sub, color }) => {
    const isSel = selected.includes(id)
    return (
      <button onClick={() => toggle(id)}
        className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left
          ${isSel ? 'bg-electric/10 border border-electric/30' : 'hover:bg-paper-warm border border-transparent'}`}>
        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>
          {getInitials(name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-ink truncate">{name}</div>
          <div className="text-xs text-muted truncate">{sub}</div>
        </div>
        {isSel && <Check size={14} className="text-electric flex-shrink-0" />}
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="font-semibold text-ink text-sm">Ajouter des membres</div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-paper-warm flex items-center justify-center text-muted">
            <X size={14} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex gap-1 p-1 bg-paper-warm rounded-xl border border-border">
            <button onClick={() => setTab('equipe')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${tab === 'equipe' ? 'bg-white shadow-sm text-ink' : 'text-muted hover:text-ink'}`}>
              Équipe
            </button>
            <button onClick={() => setTab('client')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${tab === 'client' ? 'bg-white shadow-sm text-ink' : 'text-muted hover:text-ink'}`}>
              Clients
            </button>
          </div>
          <div className="flex items-center gap-2 bg-paper-warm px-3 py-1.5 rounded-lg border border-border">
            <Search size={11} className="text-muted" />
            <input autoFocus value={gSearch} onChange={e => setGSearch(e.target.value)}
              placeholder="Rechercher..." className="bg-transparent outline-none text-xs flex-1" />
          </div>
          {selected.length > 0 && (
            <div className="text-[10px] text-electric font-semibold">{selected.length} sélectionné{selected.length > 1 ? 's' : ''}</div>
          )}
          <div className="space-y-1 max-h-44 overflow-y-auto">
            {tab === 'equipe' ? (
              empCandidates.length === 0
                ? <div className="py-4 text-center text-xs text-muted">Tous les membres sont déjà dans le groupe</div>
                : empCandidates.map(emp => (
                  <MemberRow key={emp.id} id={String(emp.id)} name={emp.nom} sub={emp.poste || 'Collaborateur'} color={getAvatarColor(emp.id)} />
                ))
            ) : (
              clientCandidates.length === 0
                ? <div className="py-4 text-center text-xs text-muted">Aucun client disponible</div>
                : clientCandidates.map(p => (
                  <MemberRow key={p.id} id={`client:${p.id}`} name={`${p.prenom} ${p.nom}`} sub={p.typeProjet || 'Client'} color={getAvatarColor(p.id)} />
                ))
            )}
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="btn-ghost flex-1 justify-center text-xs">Annuler</button>
            <button onClick={() => onAdd(selected)} disabled={selected.length === 0}
              className="btn-primary flex-1 justify-center text-xs disabled:opacity-40">
              <UserPlus size={13} /> Ajouter
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default function MessagesPage() {
  const { profile, isDirector, isDirectorMode } = useAuth()
  const {
    messages, addMessage, editMessage, deleteMessage, deleteConversation,
    hiddenMessages, hiddenConvs, msgReadState, markConvRead,
    prospects, employes, projects,
  } = useData()
  const location = useLocation()

  const isDir = isDirector || isDirectorMode
  const myId    = String(profile?.id || 'unknown')
  const myEmpId = String(profile?.employe_id || profile?.id || '')
  const myName  = profile?.full_name || 'Moi'

  const [activeConv, setActiveConv] = useState('team')
  const [mobileView, setMobileView] = useState('list')
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')
  const [convFilter, setConvFilter] = useState('equipe') // 'equipe' | 'client'
  const [showNewDm, setShowNewDm] = useState(false)
  const [dmSearch, setDmSearch] = useState('')
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [showAddMembers, setShowAddMembers] = useState(false)
  const [renamingGroup, setRenamingGroup] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [forcedDmConv, setForcedDmConv] = useState(null)
  const [forcedClientConv, setForcedClientConv] = useState(null)
  const [editingMsgId, setEditingMsgId] = useState(null)
  const [editDraft, setEditDraft] = useState('')
  const [deleteModal, setDeleteModal] = useState(null)
  const [showBroadcast, setShowBroadcast] = useState(false)
  const [stagedFiles, setStagedFiles] = useState([])

  const messagesEndRef = useRef(null)
  const newDmRef = useRef(null)
  const broadcastRef = useRef(null)
  const fileInputRef = useRef(null)
  const dmInitRef = useRef(false)

  // Ouvrir directement une DM depuis une autre page (ex: Mon Équipe)
  // Retries when employes load from Supabase (may be empty on first mount)
  useEffect(() => {
    if (dmInitRef.current || !location.state?.openDm || !employes.length) return
    dmInitRef.current = true
    const empId  = String(location.state.openDm)
    const convId = `dm_${empId}`
    const emp    = employes.find(e => String(e.id) === empId)
    if (emp) {
      setForcedDmConv({
        id:   convId,
        name: emp.nom,
        sub:  emp.poste || 'Message direct',
        icon: 'dm',
        empId,
      })
    }
    setActiveConv(convId)
    setConvFilter('equipe')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employes])

  useEffect(() => {
    const handler = (e) => {
      if (newDmRef.current && !newDmRef.current.contains(e.target)) setShowNewDm(false)
      if (broadcastRef.current && !broadcastRef.current.contains(e.target)) setShowBroadcast(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const userHiddenMsgs = useMemo(() => new Set(hiddenMessages?.[myId] || []), [hiddenMessages, myId])
  const userHiddenConvs = useMemo(() => hiddenConvs?.[myId] || [], [hiddenConvs, myId])

  const conversations = useMemo(() => {
    const list = [
      {
        id: 'team',
        name: 'Équipe CLADE',
        sub: "Canal général — toute l'équipe",
        icon: 'team',
        lastMsg: [...messages].filter(m => m.conversationId === 'team').slice(-1)[0] || null,
        deletable: true,
      },
    ]

    const dmConvIds = [...new Set(messages.filter(m => m.conversationId.startsWith('dm_')).map(m => m.conversationId))]
    dmConvIds.forEach(convId => {
      const empId = convId.replace('dm_', '')
      const msgs  = messages.filter(m => m.conversationId === convId)
      let displayName, displaySub, displayEmpId

      if (myEmpId && empId === myEmpId) {
        // Cette conv me cible comme destinataire — afficher l'expéditeur
        const otherMsg = msgs.find(m => String(m.senderId) !== myId)
        const otherEmp = employes.find(e => {
          const full = [e.prenom, e.nom].filter(Boolean).join(' ')
          return full === otherMsg?.senderName || e.nom === otherMsg?.senderName
        })
        displayName  = otherEmp?.nom || otherMsg?.senderName || 'Collaborateur'
        displaySub   = otherEmp?.poste || 'Message direct'
        displayEmpId = otherEmp ? String(otherEmp.id) : empId
      } else {
        const emp   = employes.find(e => String(e.id) === empId)
        displayName  = emp?.nom || msgs.slice(-1)[0]?.senderName || 'Collaborateur'
        displaySub   = emp?.poste || 'Message direct'
        displayEmpId = empId
      }

      list.push({
        id: convId,
        name: displayName,
        sub: displaySub,
        icon: 'dm',
        empId: displayEmpId,
        lastMsg: msgs[msgs.length - 1] || null,
        deletable: true,
      })
    })

    // Staff groups: grp_{groupId}
    const grpConvIds = [...new Set(messages.filter(m => m.conversationId.startsWith('grp_')).map(m => m.conversationId))]
    grpConvIds.forEach(convId => {
      const msgs = messages.filter(m => m.conversationId === convId)
      const systemMsg = msgs.find(m => m.type === 'group_created')
      const addedMsgs = msgs.filter(m => m.type === 'member_added')
      const memberIds = [...new Set([
        ...(systemMsg?.members || []),
        ...addedMsgs.flatMap(m => m.members || []),
      ])]
      const renamedMsg = [...msgs].reverse().find(m => m.type === 'group_renamed')
      const groupName = renamedMsg?.groupName || systemMsg?.groupName || 'Groupe'
      const memberNames = memberIds
        .filter(id => !id.startsWith('client:'))
        .map(id => employes.find(e => String(e.id) === id)?.nom?.split(' ')[0] || '')
        .filter(Boolean)
      list.push({
        id: convId,
        name: groupName,
        sub: `${memberIds.length + 1} membres${memberNames.length ? ' · ' + memberNames.slice(0, 2).join(', ') : ''}`,
        icon: 'group',
        members: memberIds,
        lastMsg: msgs.filter(m => m.type !== 'group_created').slice(-1)[0] || null,
        deletable: true,
      })
    })

    if (forcedDmConv && !list.find(c => c.id === forcedDmConv.id)) {
      list.push({ ...forcedDmConv, lastMsg: null })
    }

    if (forcedClientConv && !list.find(c => c.id === forcedClientConv.id)) {
      list.push({ ...forcedClientConv, lastMsg: null })
    }

    const clientConvIds = new Set(messages.filter(m => m.conversationId.startsWith('client_')).map(m => m.conversationId))
    prospects.filter(p => p.clientCredentials).forEach(p => {
      const convId = `client_${p.id}`
      if (!list.find(c => c.id === convId)) {
        const msgs = messages.filter(m => m.conversationId === convId)
        list.push({
          id: convId,
          name: `${p.prenom} ${p.nom}`,
          sub: p.typeProjet || 'Client',
          icon: 'client',
          prospectId: p.id,
          lastMsg: msgs[msgs.length - 1] || null,
          deletable: true,
        })
      }
    })
    clientConvIds.forEach(convId => {
      if (!list.find(c => c.id === convId)) {
        const msgs = messages.filter(m => m.conversationId === convId)
        const prospectId = convId.replace('client_', '')
        const prospect = prospects.find(p => String(p.id) === prospectId)
        list.push({
          id: convId,
          name: prospect
            ? `${prospect.prenom} ${prospect.nom}`
            : (msgs.find(m => m.senderRole === 'client')?.senderName || 'Client'),
          sub: prospect?.typeProjet || 'Client',
          icon: 'client',
          prospectId: prospect?.id,
          lastMsg: msgs[msgs.length - 1] || null,
          deletable: true,
        })
      }
    })

    // Client DMs: cdm_{prospectId}_{staffId}
    // Only show to the targeted staff member (or director who sees all)
    const cdmConvIds = [...new Set(
      messages
        .filter(m => {
          if (!m.conversationId.startsWith('cdm_')) return false
          if (isDir) return true // director sees all client DMs
          return m.conversationId.endsWith(`_${myId}`)
        })
        .map(m => m.conversationId)
    )]
    cdmConvIds.forEach(convId => {
      if (list.find(c => c.id === convId)) return
      const clientProspect = prospects.find(p => convId.startsWith(`cdm_${p.id}_`))
      const msgs = messages.filter(m => m.conversationId === convId)
      const clientMsg = msgs.find(m => m.senderRole === 'client')
      list.push({
        id: convId,
        name: clientProspect
          ? `${clientProspect.prenom} ${clientProspect.nom}`
          : (clientMsg?.senderName || 'Client'),
        sub: 'Message direct — Client',
        icon: 'client',
        prospectId: clientProspect?.id,
        lastMsg: msgs[msgs.length - 1] || null,
        deletable: true,
      })
    })

    // Client groups: cgrp_{prospectId}_{groupId}
    // Only show to staff members who are in the group's member list (or director)
    const cgrpConvIds = [...new Set(messages.filter(m => m.conversationId.startsWith('cgrp_')).map(m => m.conversationId))]
    cgrpConvIds.forEach(convId => {
      if (list.find(c => c.id === convId)) return
      const clientProspect = prospects.find(p => convId.startsWith(`cgrp_${p.id}_`))
      const msgs = messages.filter(m => m.conversationId === convId)
      const systemMsg = msgs.find(m => m.type === 'group_created')
      const members = systemMsg?.members || []

      // Access check: director sees all, others only if they're a member
      if (!isDir && !members.includes(myId)) return

      const clientMsg = msgs.find(m => m.senderRole === 'client')
      const groupName = systemMsg?.groupName || 'Groupe'
      const clientName = clientProspect
        ? `${clientProspect.prenom} ${clientProspect.nom}`
        : (clientMsg?.senderName || 'Client')
      list.push({
        id: convId,
        name: groupName,
        sub: `Groupe · ${clientName}`,
        icon: 'group_client',
        prospectId: clientProspect?.id,
        members,
        lastMsg: msgs.filter(m => m.type !== 'group_created').slice(-1)[0] || null,
        deletable: true,
      })
    })

    return list.filter(c => {
      const entry = userHiddenConvs.find(h => h.convId === c.id)
      if (!entry) return true
      const lastMsg = messages.filter(m => m.conversationId === c.id).slice(-1)[0]
      return lastMsg && lastMsg.timestamp > entry.hiddenAt
    })
  }, [messages, prospects, employes, forcedDmConv, forcedClientConv, userHiddenConvs])

  // Prospects visible selon les droits du collaborateur
  const visibleProspects = useMemo(() => {
    if (isDir) return prospects
    // Uniquement les clients dont l'utilisateur est le personnel référent du projet
    const myProspectIds = new Set(
      projects
        .filter(p => String(p.architecteReferentId) === myId)
        .map(p => p.prospectId)
        .filter(Boolean)
    )
    return prospects.filter(p => myProspectIds.has(p.id))
  }, [isDir, prospects, projects, myId])

  // Unread counts per conversation
  const unreadCounts = useMemo(() => {
    const readTimes = msgReadState?.[myId] || {}
    const counts = {}
    for (const conv of conversations) {
      const lastRead = readTimes[conv.id]
      const convMsgs = messages.filter(m =>
        m.conversationId === conv.id &&
        String(m.senderId) !== myId &&
        (!lastRead || m.timestamp > lastRead)
      )
      counts[conv.id] = convMsgs.length
    }
    return counts
  }, [conversations, messages, msgReadState, myId])

  const CLIENT_ICONS = new Set(['client', 'group_client'])
  const TEAM_ICONS = new Set(['team', 'dm', 'group'])

  const teamUnreadTotal = conversations
    .filter(c => TEAM_ICONS.has(c.icon))
    .reduce((s, c) => s + (unreadCounts[c.id] || 0), 0)

  const clientUnreadTotal = conversations
    .filter(c => CLIENT_ICONS.has(c.icon))
    .reduce((s, c) => s + (unreadCounts[c.id] || 0), 0)

  const filteredConvs = useMemo(() => {
    const q = search.toLowerCase()
    let base = q ? conversations.filter(c => c.name.toLowerCase().includes(q)) : conversations
    // Apply category filter
    base = base.filter(c =>
      convFilter === 'client' ? CLIENT_ICONS.has(c.icon) : TEAM_ICONS.has(c.icon)
    )
    return [...base].sort((a, b) => {
      // Pin team at top of equipe filter
      if (a.id === 'team') return -1
      if (b.id === 'team') return 1
      const aUnread = unreadCounts[a.id] || 0
      const bUnread = unreadCounts[b.id] || 0
      if (aUnread > 0 && bUnread === 0) return -1
      if (bUnread > 0 && aUnread === 0) return 1
      return (b.lastMsg?.timestamp || '').localeCompare(a.lastMsg?.timestamp || '')
    })
  }, [conversations, search, unreadCounts, convFilter])

  // Prospects not yet in conversations list, matching search (only for client filter)
  const prospectSuggestions = useMemo(() => {
    if (!search.trim() || convFilter !== 'client') return []
    const q = search.toLowerCase()
    return visibleProspects.filter(p => {
      const name = `${p.prenom} ${p.nom}`.toLowerCase()
      return name.includes(q) && !conversations.find(c => c.id === `cdm_${p.id}_${myId}`)
    }).slice(0, 4)
  }, [search, visibleProspects, conversations, convFilter, myId])

  const dmableEmployes = useMemo(() => employes.filter(e => String(e.id) !== myId), [employes, myId])
  const filteredDmEmployes = useMemo(() => {
    const q = dmSearch.toLowerCase()
    return q ? dmableEmployes.filter(e => e.nom.toLowerCase().includes(q) || (e.poste || '').toLowerCase().includes(q)) : dmableEmployes
  }, [dmableEmployes, dmSearch])

  const filteredDmProspects = useMemo(() => {
    const q = dmSearch.toLowerCase()
    return q
      ? visibleProspects.filter(p => `${p.prenom} ${p.nom}`.toLowerCase().includes(q))
      : visibleProspects
  }, [visibleProspects, dmSearch])

  const activeMessages = useMemo(() =>
    messages.filter(m => m.conversationId === activeConv && !userHiddenMsgs.has(m.id)),
    [messages, activeConv, userHiddenMsgs]
  )

  const activeConvInfo = conversations.find(c => c.id === activeConv)

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [activeMessages])

  const handleSend = (e) => {
    e.preventDefault()
    if (!draft.trim() && stagedFiles.length === 0) return
    addMessage({
      conversationId: activeConv,
      senderId: myId,
      senderName: myName,
      senderRole: 'staff',
      content: draft.trim(),
      attachments: stagedFiles.length > 0 ? stagedFiles : undefined,
    })
    setDraft('')
    setStagedFiles([])
    if (forcedDmConv?.id === activeConv) setForcedDmConv(null)
    if (forcedClientConv?.id === activeConv) setForcedClientConv(null)
  }

  const handleFileSelect = (e) => {
    const MAX = 300 * 1024
    Array.from(e.target.files).forEach(file => {
      if (file.size > MAX) {
        toast.error(`${file.name} dépasse la limite de 300 Ko`)
        return
      }
      const isImage = file.type.startsWith('image/')
      if (isImage) {
        const reader = new FileReader()
        reader.onload = (ev) => {
          setStagedFiles(prev => [...prev, {
            id: `f${Date.now()}${Math.random()}`,
            name: file.name,
            size: file.size,
            type: file.type,
            dataUrl: ev.target.result,
          }])
        }
        reader.readAsDataURL(file)
      } else {
        setStagedFiles(prev => [...prev, {
          id: `f${Date.now()}${Math.random()}`,
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl: null,
        }])
      }
    })
    e.target.value = ''
  }

  const openConv = (id) => {
    setActiveConv(id)
    setMobileView('chat')
    markConvRead(myId, id)
  }

  // Auto-open conversation from notification link (?conv=...)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const convParam = params.get('conv')
    if (convParam) {
      const isClient = CLIENT_ICONS.has(conversations.find(c => c.id === convParam)?.icon)
      setConvFilter(isClient ? 'client' : 'equipe')
      openConv(convParam)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search])

  const handleRenameGroup = () => {
    const trimmed = renameValue.trim()
    setRenamingGroup(false)
    if (!trimmed || !activeConv?.startsWith('grp_') || trimmed === activeConvInfo?.name) return
    addMessage({
      conversationId: activeConv,
      senderId: myId,
      senderName: myName,
      senderRole: 'staff',
      content: `${myName} a renommé le groupe en "${trimmed}"`,
      type: 'group_renamed',
      groupName: trimmed,
    })
  }

  const handleAddMembers = (newMemberIds) => {
    if (newMemberIds.length === 0) return
    const names = newMemberIds.map(id => {
      if (id.startsWith('client:')) {
        const p = prospects.find(p => p.id === id.replace('client:', ''))
        return p ? `${p.prenom} ${p.nom}` : id
      }
      return employes.find(e => String(e.id) === id)?.nom || id
    }).join(', ')
    addMessage({
      conversationId: activeConv,
      senderId: myId,
      senderName: myName,
      senderRole: 'staff',
      content: `${myName} a ajouté ${names} au groupe`,
      type: 'member_added',
      members: newMemberIds,
    })
    setShowAddMembers(false)
    toast.success(`${newMemberIds.length} membre${newMemberIds.length > 1 ? 's' : ''} ajouté${newMemberIds.length > 1 ? 's' : ''}`)
  }

  const handleCreateStaffGroup = (name, memberIds) => {
    if (memberIds.length === 0) return
    const groupId = `grp_${Date.now()}`
    const names = memberIds.map(id => {
      if (id.startsWith('client:')) {
        const p = prospects.find(p => p.id === id.replace('client:', ''))
        return p ? `${p.prenom} ${p.nom}` : id
      }
      return employes.find(e => String(e.id) === id)?.nom || id
    }).join(', ')
    addMessage({
      conversationId: groupId,
      senderId: myId,
      senderName: myName,
      senderRole: 'staff',
      content: `Groupe "${name}" créé avec : ${names}`,
      type: 'group_created',
      groupName: name,
      members: memberIds,
    })
    setShowGroupModal(false)
    openConv(groupId)
    toast.success(`Groupe "${name}" créé`)
  }

  const handleStartDm = (emp) => {
    const convId = `dm_${emp.id}`
    if (!messages.some(m => m.conversationId === convId)) {
      setForcedDmConv({
        id: convId,
        name: emp.nom,
        sub: emp.poste || 'Message direct',
        icon: 'dm',
        empId: String(emp.id),
        deletable: true,
      })
    }
    openConv(convId)
    setShowNewDm(false)
    setDmSearch('')
  }

  const handleOpenProspect = (p) => {
    const convId = `cdm_${p.id}_${myId}`
    if (!conversations.find(c => c.id === convId)) {
      setForcedClientConv({
        id: convId,
        name: `${p.prenom} ${p.nom}`,
        sub: p.typeProjet || 'Client',
        icon: 'client',
        prospectId: p.id,
        deletable: true,
      })
    }
    openConv(convId)
    setSearch('')
  }

  const handleDeleteConfirm = (forAll) => {
    if (!deleteModal) return
    if (deleteModal.type === 'message') {
      deleteMessage(deleteModal.id, forAll, myId)
      toast.success(forAll ? 'Message supprimé pour tout le monde' : 'Message masqué pour vous')
    } else {
      deleteConversation(deleteModal.id, forAll, myId)
      if (activeConv === deleteModal.id) setActiveConv('team')
      toast.success(forAll ? 'Conversation supprimée' : 'Conversation masquée pour vous')
    }
    setDeleteModal(null)
  }

  const handleSaveEdit = () => {
    if (!editDraft.trim() || !editingMsgId) return
    editMessage(editingMsgId, editDraft.trim())
    setEditingMsgId(null)
    toast.success('Message modifié')
  }

  const handleBroadcast = (targets) => {
    if (!draft.trim() && stagedFiles.length === 0) return
    const content = draft.trim()
    const convIds = []
    if (targets === 'team' || targets === 'all') {
      employes.filter(e => String(e.id) !== myId).forEach(emp => convIds.push(`dm_${emp.id}`))
    }
    if (targets === 'all') {
      prospects.filter(p => p.clientCredentials).forEach(p => convIds.push(`client_${p.id}`))
    }
    convIds.forEach(convId => {
      addMessage({
        conversationId: convId, senderId: myId, senderName: myName, senderRole: 'staff',
        content,
        attachments: stagedFiles.length > 0 ? stagedFiles : undefined,
      })
    })
    setDraft('')
    setStagedFiles([])
    setShowBroadcast(false)
    toast.success(`Diffusé à ${convIds.length} conversation${convIds.length > 1 ? 's' : ''}`)
  }

  return (
    <div className="p-4 lg:p-6 h-[calc(100vh-88px)] flex gap-4">

      {/* Sidebar */}
      <div className={`w-full lg:w-80 flex-shrink-0 flex-col bg-white rounded-2xl border border-border overflow-hidden ${mobileView === 'chat' ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-4 border-b border-border space-y-3">
          {/* Filter tabs */}
          <div className="flex gap-1 p-1 bg-paper-warm rounded-xl border border-border">
            <button
              onClick={() => setConvFilter('equipe')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${convFilter === 'equipe' ? 'bg-white shadow-sm text-ink' : 'text-muted hover:text-ink'}`}
            >
              Équipe
              {teamUnreadTotal > 0 && (
                <span className="min-w-[16px] h-4 bg-electric text-white text-[9px] font-bold rounded-full px-1 flex items-center justify-center leading-none">
                  {teamUnreadTotal > 99 ? '99+' : teamUnreadTotal}
                </span>
              )}
            </button>
            <button
              onClick={() => setConvFilter('client')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${convFilter === 'client' ? 'bg-white shadow-sm text-ink' : 'text-muted hover:text-ink'}`}
            >
              Clients
              {clientUnreadTotal > 0 && (
                <span className="min-w-[16px] h-4 bg-electric text-white text-[9px] font-bold rounded-full px-1 flex items-center justify-center leading-none">
                  {clientUnreadTotal > 99 ? '99+' : clientUnreadTotal}
                </span>
              )}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div className="font-semibold text-ink text-sm">{convFilter === 'equipe' ? 'Équipe' : 'Clients'}</div>
            <div ref={newDmRef} className="relative">
              <button
                onClick={() => setShowNewDm(v => !v)}
                className="w-8 h-8 rounded-xl bg-electric/10 hover:bg-electric/20 flex items-center justify-center text-electric transition-colors"
                title="Nouvelle conversation"
              >
                <PenSquare size={15} />
              </button>
              <AnimatePresence>
                {showNewDm && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.97 }}
                    className="absolute top-full right-0 mt-2 w-64 bg-white border border-border rounded-xl shadow-xl overflow-hidden z-50"
                  >
                    {/* Créer un groupe */}
                    <button
                      onClick={() => { setShowGroupModal(true); setShowNewDm(false) }}
                      className="w-full flex items-center gap-3 px-3 py-3 hover:bg-paper-warm transition-colors text-left border-b border-border"
                    >
                      <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                        <Users size={14} className="text-violet-600" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-ink">Créer un groupe</div>
                        <div className="text-[10px] text-muted">Choisir des membres</div>
                      </div>
                    </button>
                    {/* Message direct */}
                    <div className="p-3 border-b border-border">
                      <div className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-2">
                        {convFilter === 'client' ? 'Message direct — Client' : 'Message direct'}
                      </div>
                      <div className="flex items-center gap-2 bg-paper-warm px-3 py-1.5 rounded-lg border border-border">
                        <Search size={12} className="text-muted" />
                        <input
                          autoFocus
                          className="bg-transparent outline-none text-xs flex-1"
                          value={dmSearch}
                          onChange={e => setDmSearch(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {convFilter === 'client' ? (
                        filteredDmProspects.length === 0 ? (
                          <div className="py-6 text-center text-xs text-muted">Aucun client trouvé</div>
                        ) : filteredDmProspects.map(p => (
                          <button
                            key={p.id}
                            onClick={() => { handleOpenProspect(p); setShowNewDm(false); setDmSearch('') }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-paper-warm transition-colors text-left"
                          >
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getAvatarColor(p.id)} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>
                              {getInitials(`${p.prenom} ${p.nom}`)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold text-ink truncate">{p.prenom} {p.nom}</div>
                              <div className="text-[10px] text-muted truncate">{p.typeProjet || 'Client'}</div>
                            </div>
                          </button>
                        ))
                      ) : (
                        filteredDmEmployes.length === 0 ? (
                          <div className="py-6 text-center text-xs text-muted">Aucun membre trouvé</div>
                        ) : filteredDmEmployes.map(emp => (
                          <button
                            key={emp.id}
                            onClick={() => handleStartDm(emp)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-paper-warm transition-colors text-left"
                          >
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getAvatarColor(emp.id)} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>
                              {getInitials(emp.nom)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold text-ink truncate">{emp.nom}</div>
                              <div className="text-[10px] text-muted truncate">{emp.poste}</div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-paper-warm px-3 py-2 rounded-xl border border-border">
            <Search size={13} className="text-muted" />
            <input
              placeholder="Rechercher..."
              className="bg-transparent outline-none text-sm flex-1 min-w-0"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-muted hover:text-ink">
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConvs.map(conv => {
            const isActive = conv.id === activeConv
            const unread = unreadCounts[conv.id] || 0
            const hasUnread = unread > 0 && !isActive
            return (
              <div
                key={conv.id}
                className={`relative flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0 group transition-colors ${
                  isActive ? 'bg-electric/5' : hasUnread ? 'bg-blue-50/40 hover:bg-blue-50/60' : 'hover:bg-paper-warm'
                }`}
              >
                <button
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  onClick={() => openConv(conv.id)}
                >
                  <div className="relative flex-shrink-0">
                    {conv.icon === 'team' ? (
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ink to-electric flex items-center justify-center">
                        <Users size={16} className="text-white" />
                      </div>
                    ) : conv.icon === 'group_client' ? (
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAvatarColor(conv.id)} flex items-center justify-center`}>
                        <Users size={15} className="text-white" />
                      </div>
                    ) : (
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAvatarColor(conv.id)} flex items-center justify-center text-white text-xs font-bold`}>
                        {getInitials(conv.name)}
                      </div>
                    )}
                    {hasUnread && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-electric text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm truncate ${
                      isActive ? 'text-electric font-semibold' : hasUnread ? 'text-ink font-bold' : 'text-ink font-semibold'
                    }`}>
                      {conv.name}
                    </div>
                    <div className={`text-xs truncate mt-0.5 ${hasUnread ? 'text-ink font-medium' : 'text-muted'}`}>
                      {conv.lastMsg?.content || conv.sub}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {conv.lastMsg && (
                      <div className={`text-[10px] ${hasUnread ? 'text-electric font-semibold' : 'text-muted'}`}>
                        {fmtTime(conv.lastMsg.timestamp)}
                      </div>
                    )}
                  </div>
                </button>

                {conv.deletable && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteModal({ type: 'conv', id: conv.id }) }}
                    className="w-7 h-7 rounded-lg text-muted hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-colors opacity-100 lg:opacity-0 lg:group-hover:opacity-100 flex-shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            )
          })}

          {/* Prospect suggestions */}
          {prospectSuggestions.length > 0 && (
            <>
              <div className="px-4 py-2 text-[10px] text-muted font-semibold uppercase tracking-widest bg-paper-warm border-b border-border">
                Clients — démarrer une conv.
              </div>
              {prospectSuggestions.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleOpenProspect(p)}
                  className="w-full flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0 hover:bg-paper-warm transition-colors text-left"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAvatarColor(p.id)} flex items-center justify-center flex-shrink-0 text-white text-xs font-bold`}>
                    {getInitials(`${p.prenom} ${p.nom}`)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-ink truncate">{p.prenom} {p.nom}</div>
                    <div className="text-xs text-muted truncate">{p.typeProjet || 'Prospect'}</div>
                  </div>
                  <UserPlus size={14} className="text-electric flex-shrink-0" />
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Chat panel */}
      <div className={`flex-1 min-w-0 flex-col bg-white rounded-2xl border border-border overflow-hidden ${mobileView === 'list' ? 'hidden lg:flex' : 'flex'}`}>
        <div className="px-5 py-4 border-b border-border flex items-center gap-3">
          <button
            onClick={() => setMobileView('list')}
            className="lg:hidden w-8 h-8 rounded-xl hover:bg-paper-warm flex items-center justify-center text-muted hover:text-ink transition-colors flex-shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
          {activeConvInfo?.icon === 'team' ? (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-ink to-electric flex items-center justify-center flex-shrink-0">
              <Users size={15} className="text-white" />
            </div>
          ) : activeConvInfo?.icon === 'group_client' ? (
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getAvatarColor(activeConvInfo?.id)} flex items-center justify-center flex-shrink-0`}>
              <Users size={14} className="text-white" />
            </div>
          ) : (
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getAvatarColor(activeConvInfo?.id)} flex items-center justify-center flex-shrink-0 text-white text-xs font-bold`}>
              {getInitials(activeConvInfo?.name)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {renamingGroup && activeConv?.startsWith('grp_') ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleRenameGroup()
                    if (e.key === 'Escape') setRenamingGroup(false)
                  }}
                  onBlur={handleRenameGroup}
                  className="font-semibold text-ink text-sm bg-paper-warm border border-electric rounded-lg px-2 py-0.5 outline-none max-w-[200px]"
                />
              ) : (
                <>
                  <div className="font-semibold text-ink text-sm truncate">{activeConvInfo?.name || 'Conversation'}</div>
                  {activeConv?.startsWith('grp_') && (
                    <button
                      onClick={() => { setRenameValue(activeConvInfo?.name || ''); setRenamingGroup(true) }}
                      className="w-5 h-5 rounded-md hover:bg-paper-warm flex items-center justify-center text-muted hover:text-ink flex-shrink-0 transition-colors"
                    >
                      <Pencil size={11} />
                    </button>
                  )}
                </>
              )}
            </div>
            <div className="text-xs text-muted flex items-center gap-1">
              <Circle size={7} className="fill-emerald-400 text-emerald-400" />
              {activeConvInfo?.icon === 'team'
                ? `${employes.length} membres`
                : activeConvInfo?.icon === 'dm'
                  ? 'Message direct'
                  : activeConvInfo?.icon === 'group' || activeConvInfo?.icon === 'group_client'
                    ? activeConvInfo.sub
                    : 'Client'}
            </div>
          </div>
          {activeConv?.startsWith('grp_') && (
            <button
              onClick={() => setShowAddMembers(true)}
              className="w-8 h-8 rounded-xl hover:bg-paper-warm flex items-center justify-center text-muted hover:text-electric transition-colors flex-shrink-0"
              title="Ajouter des membres"
            >
              <UserPlus size={15} />
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-1">
          {activeMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-14 h-14 rounded-2xl bg-electric/10 flex items-center justify-center mb-4">
                <MessageSquare size={22} className="text-electric" />
              </div>
              <div className="font-semibold text-ink mb-1">
                {activeConvInfo?.icon === 'dm'
                  ? `Démarrer une conversation avec ${activeConvInfo?.name}`
                  : activeConvInfo?.icon === 'group'
                    ? `Groupe "${activeConvInfo?.name}" créé`
                    : 'Aucun message'}
              </div>
              <p className="text-xs text-muted">
                {activeConvInfo?.icon === 'dm'
                  ? 'Écrivez un message ci-dessous pour démarrer la conversation.'
                  : 'Soyez le premier à écrire dans cette conversation.'}
              </p>
            </div>
          ) : activeMessages.map((msg, i) => {
            if (msg.type === 'member_added' || msg.type === 'group_renamed') {
              return (
                <div key={msg.id} className="flex items-center gap-3 my-2">
                  <div className="flex-1 h-px bg-border/50" />
                  <span className="text-[10px] text-muted px-2 text-center max-w-[60%]">{msg.content}</span>
                  <div className="flex-1 h-px bg-border/50" />
                </div>
              )
            }
            const isMe = String(msg.senderId) === myId
              || (isDirectorMode && msg.senderId === 'director-achraf')
            const canEdit = isMe
            const canDelete = isMe || isDir
            const prevMsg = activeMessages[i - 1]
            const showSender = !prevMsg || prevMsg.senderId !== msg.senderId
            const showDateSep = !prevMsg
              || new Date(msg.timestamp).toDateString() !== new Date(prevMsg.timestamp).toDateString()
            const isEditing = editingMsgId === msg.id

            return (
              <div key={msg.id}>
                {showDateSep && (
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[10px] text-muted font-semibold uppercase tracking-widest">
                      {new Date(msg.timestamp).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                )}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`group flex gap-3 py-0.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {!isMe && showSender && (
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(msg.senderId)} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5`}>
                      {getInitials(msg.senderName)}
                    </div>
                  )}
                  {!isMe && !showSender && <div className="w-8 flex-shrink-0" />}

                  <div className={`max-w-[70%] flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                    {showSender && !isMe && (
                      <span className="text-xs font-semibold text-muted px-1">{msg.senderName}</span>
                    )}

                    <div className={`flex items-end gap-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      {isEditing ? (
                        <div className="flex flex-col gap-2 min-w-[220px]">
                          <textarea
                            autoFocus
                            value={editDraft}
                            onChange={e => setEditDraft(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit() }
                              if (e.key === 'Escape') setEditingMsgId(null)
                            }}
                            rows={2}
                            className="w-full resize-none outline-none text-sm bg-paper-warm border-2 border-electric rounded-xl px-4 py-3"
                          />
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setEditingMsgId(null)} className="text-xs px-3 py-1.5 rounded-lg text-muted hover:text-ink border border-border hover:bg-paper-warm transition-colors">
                              Annuler
                            </button>
                            <button onClick={handleSaveEdit} className="text-xs px-3 py-1.5 rounded-lg bg-electric text-white hover:opacity-90 transition-opacity">
                              Enregistrer
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className={`rounded-2xl text-sm leading-relaxed overflow-hidden ${
                          isMe
                            ? 'bg-gradient-to-br from-ink to-electric text-white rounded-tr-sm'
                            : 'bg-paper-warm text-ink rounded-tl-sm border border-border'
                        }`}>
                          {msg.content && (
                            <div className="px-4 py-2.5">
                              {msg.content}
                              {msg.editedAt && (
                                <span className={`text-[10px] ml-2 ${isMe ? 'text-white/50' : 'text-muted'}`}>modifié</span>
                              )}
                            </div>
                          )}
                          {msg.attachments?.length > 0 && (
                            <div className={`${msg.content ? 'border-t' : ''} ${isMe ? 'border-white/20' : 'border-border'} p-2 flex flex-wrap gap-2`}>
                              {msg.attachments.map(att => (
                                att.type?.startsWith('image/') && att.dataUrl ? (
                                  <img
                                    key={att.id}
                                    src={att.dataUrl}
                                    alt={att.name}
                                    className="max-w-[200px] max-h-[200px] object-cover rounded-xl"
                                  />
                                ) : (
                                  <div key={att.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl ${isMe ? 'bg-white/15' : 'bg-white border border-border'}`}>
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isMe ? 'bg-white/20' : 'bg-paper-warm'}`}>
                                      <FileText size={14} className={isMe ? 'text-white' : 'text-electric'} />
                                    </div>
                                    <div>
                                      <div className={`text-xs font-semibold truncate max-w-[120px] ${isMe ? 'text-white' : 'text-ink'}`}>{att.name}</div>
                                      <div className={`text-[10px] ${isMe ? 'text-white/60' : 'text-muted'}`}>{fmtSize(att.size)}</div>
                                    </div>
                                  </div>
                                )
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {(canEdit || canDelete) && !isEditing && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 flex-shrink-0 mb-1">
                          {canEdit && (
                            <button
                              onClick={() => { setEditingMsgId(msg.id); setEditDraft(msg.content) }}
                              className="w-6 h-6 rounded-lg bg-white border border-border text-muted hover:text-electric hover:border-electric flex items-center justify-center shadow-sm transition-colors"
                            >
                              <Pencil size={11} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => setDeleteModal({ type: 'message', id: msg.id })}
                              className="w-6 h-6 rounded-lg bg-white border border-border text-muted hover:text-rose-500 hover:border-rose-300 flex items-center justify-center shadow-sm transition-colors"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <span className="text-[10px] text-muted px-1">{fmtTime(msg.timestamp)}</span>
                  </div>
                </motion.div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Composer */}
        <div className="border-t border-border p-4">
          {/* Staged file previews */}
          {stagedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-border">
              {stagedFiles.map(f => (
                <div key={f.id} className="relative group">
                  {f.dataUrl ? (
                    <img src={f.dataUrl} alt={f.name} className="w-16 h-16 object-cover rounded-xl border border-border" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl border border-border bg-paper-warm flex flex-col items-center justify-center gap-1 px-1">
                      <FileText size={18} className="text-electric" />
                      <span className="text-[8px] text-muted text-center truncate w-full px-1 leading-tight">{f.name}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setStagedFiles(prev => prev.filter(x => x.id !== f.id))}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={9} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSend}>
            <div className="flex items-end gap-3">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.dwg,.zip"
                className="hidden"
                onChange={handleFileSelect}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-9 h-9 rounded-xl text-muted hover:text-electric hover:bg-electric/10 flex items-center justify-center transition-colors flex-shrink-0"
                title="Joindre un fichier"
              >
                <Paperclip size={16} />
              </button>

              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) }
                }}
                placeholder="Écrivez un message..."
                rows={1}
                className="flex-1 resize-none outline-none text-sm placeholder:text-muted bg-paper-warm border border-border rounded-xl px-4 py-3 min-h-[44px] max-h-32"
                style={{ overflowY: 'auto' }}
              />

              <div className="flex gap-2 flex-shrink-0">
                {isDir && (
                  <div ref={broadcastRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setShowBroadcast(v => !v)}
                      disabled={!draft.trim() && stagedFiles.length === 0}
                      title="Diffuser"
                      className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition-opacity"
                    >
                      <Radio size={16} />
                    </button>
                    <AnimatePresence>
                      {showBroadcast && (
                        <motion.div
                          initial={{ opacity: 0, y: 4, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.97 }}
                          className="absolute bottom-full right-0 mb-2 w-52 bg-white border border-border rounded-xl shadow-xl overflow-hidden z-50"
                        >
                          <div className="text-xs font-semibold text-ink px-3 py-2.5 border-b border-border">
                            Diffuser le message
                          </div>
                          <button
                            type="button"
                            onClick={() => handleBroadcast('team')}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-paper-warm text-left"
                          >
                            <Users size={14} className="text-electric flex-shrink-0" />
                            <div>
                              <div className="text-xs font-semibold text-ink">Toute l'équipe</div>
                              <div className="text-[10px] text-muted">{employes.filter(e => String(e.id) !== myId).length} membres</div>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBroadcast('all')}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-amber-50 text-left border-t border-border"
                          >
                            <Globe size={14} className="text-amber-500 flex-shrink-0" />
                            <div>
                              <div className="text-xs font-semibold text-amber-600">Tout le monde</div>
                              <div className="text-[10px] text-muted">Équipe + Clients</div>
                            </div>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={!draft.trim() && stagedFiles.length === 0}
                  className="w-11 h-11 rounded-xl bg-gradient-to-br from-ink to-electric text-white flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition-opacity"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Delete modal */}
      <AnimatePresence>
        {deleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setDeleteModal(null) }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl p-6 shadow-2xl w-80"
            >
              <div className="font-display text-lg text-ink mb-1">
                {deleteModal.type === 'message' ? 'Supprimer ce message ?' : 'Supprimer la conversation ?'}
              </div>
              <p className="text-sm text-muted mb-5">Choisissez qui est affecté par cette suppression.</p>
              <div className="space-y-2 mb-4">
                <button
                  onClick={() => handleDeleteConfirm(false)}
                  className="w-full flex items-start gap-3 p-3 rounded-xl border border-border hover:bg-paper-warm transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-paper-warm border border-border flex items-center justify-center flex-shrink-0 mt-0.5">
                    <UserCheck size={15} className="text-ink" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-ink">Supprimer pour moi</div>
                    <div className="text-xs text-muted">Reste visible pour les autres participants</div>
                  </div>
                </button>
                <button
                  onClick={() => handleDeleteConfirm(true)}
                  className="w-full flex items-start gap-3 p-3 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Globe size={15} className="text-rose-500" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-rose-600">Supprimer pour tout le monde</div>
                    <div className="text-xs text-rose-400">Définitif — supprimé pour tous les participants</div>
                  </div>
                </button>
              </div>
              <button onClick={() => setDeleteModal(null)} className="w-full py-2 text-sm text-muted hover:text-ink transition-colors">
                Annuler
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Staff group creation modal */}
      <AnimatePresence>
        {showGroupModal && (
          <StaffGroupModal
            employes={employes}
            prospects={visibleProspects}
            myId={myId}
            onClose={() => setShowGroupModal(false)}
            onCreate={handleCreateStaffGroup}
          />
        )}
      </AnimatePresence>

      {/* Add members modal */}
      <AnimatePresence>
        {showAddMembers && (
          <AddMembersModal
            employes={employes}
            prospects={visibleProspects}
            myId={myId}
            existingMembers={activeConvInfo?.members || []}
            onClose={() => setShowAddMembers(false)}
            onAdd={handleAddMembers}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
