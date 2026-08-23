import { useState, useEffect, useRef, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, MessageSquare, Users, ArrowLeft, PenSquare,
  Search, X, Plus, Check, FileText, Paperclip, Trash2,
} from 'lucide-react'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

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

const fmtDateLabel = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const diffDays = Math.floor((now - d) / 86400000)
  if (diffDays === 0) return "Aujourd'hui"
  if (diffDays === 1) return 'Hier'
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  return (parts[0]?.[0] || '') + (parts[1]?.[0] || '')
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

// Modal to create a new group conversation
function NewGroupModal({ employes, onClose, onCreate }) {
  const [groupName, setGroupName] = useState('')
  const [selected, setSelected] = useState([])

  const toggle = (id) => setSelected(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  )

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
            <input
              autoFocus
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              placeholder="Ex: Suivi chantier..."
              className="input-field"
            />
          </div>
          <div>
            <label className="label-text mb-2 block">Membres de l'équipe</label>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {employes.map(emp => (
                <button key={emp.id} onClick={() => toggle(String(emp.id))}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left
                    ${selected.includes(String(emp.id)) ? 'bg-electric/10 border border-electric/30' : 'hover:bg-paper-warm border border-transparent'}`}>
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(emp.id)} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>
                    {getInitials(emp.nom)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-ink truncate">{emp.nom}</div>
                    <div className="text-xs text-muted truncate">{emp.poste}</div>
                  </div>
                  {selected.includes(String(emp.id)) && (
                    <Check size={14} className="text-electric flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="btn-ghost flex-1 justify-center text-xs">Annuler</button>
            <button
              onClick={() => onCreate(groupName.trim() || 'Groupe', selected)}
              disabled={selected.length === 0}
              className="btn-primary flex-1 justify-center text-xs disabled:opacity-40"
            >
              <Plus size={13} /> Créer
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default function ClientMessagesPage() {
  const { profile, prospectId } = useAuth()
  const { messages, addMessage, prospects, employes, projects, msgReadState, markConvRead, mergeReadStateForUser, deleteConversation } = useData()
  const location = useLocation()

  const myId = String(profile?.id || 'client')
  const myName = profile?.full_name || 'Client'

  const prospect = useMemo(() =>
    prospectId ? prospects.find(p => p.id === prospectId) : null
    , [prospectId, prospects])

  const [activeConv, setActiveConv] = useState(null)
  const [deleteModal, setDeleteModal] = useState(null)
  const [mobileView, setMobileView] = useState('list')
  const [draft, setDraft] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [search, setSearch] = useState('')
  const newRef = useRef(null)
  const messagesEndRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (newRef.current && !newRef.current.contains(e.target)) setShowNew(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Build conversations list
  const conversations = useMemo(() => {
    const list = []

    // 1. Messages directs : cdm_{prospectId}_{staffId}
    const prefix = `cdm_${prospect?.id || 'demo'}_`
    const dmConvIds = [...new Set(
      messages.filter(m => m.conversationId.startsWith(prefix)).map(m => m.conversationId)
    )]
    dmConvIds.forEach(convId => {
      const staffId = convId.replace(prefix, '')
      const emp = employes.find(e => String(e.id) === staffId)
      const convMsgs = messages.filter(m => m.conversationId === convId)
      list.push({
        id: convId,
        name: emp?.nom || convMsgs.find(m => m.senderRole === 'staff')?.senderName || 'Membre',
        sub: emp?.poste || 'Message direct',
        icon: 'dm',
        empId: staffId,
        lastMsg: convMsgs[convMsgs.length - 1] || null,
      })
    })

    // 2. Canal staff générique : client_{prospectId} (messages envoyés depuis l'espace staff)
    const legacyConvId = `client_${prospect?.id || 'demo'}`
    const legacyMsgs = messages.filter(m => m.conversationId === legacyConvId)
    if (legacyMsgs.length > 0) {
      const lastStaff = [...legacyMsgs].reverse().find(m => m.senderRole === 'staff')
      list.push({
        id: legacyConvId,
        name: lastStaff?.senderName || 'Équipe CLADE',
        sub: 'Message direct',
        icon: 'dm',
        empId: lastStaff?.senderId,
        lastMsg: legacyMsgs[legacyMsgs.length - 1] || null,
      })
    }

    // 3. Groupes créés par le client : cgrp_{prospectId}_{groupId}
    const grpPrefix = `cgrp_${prospect?.id || 'demo'}_`
    const cgrpConvIds = [...new Set(
      messages.filter(m => m.conversationId.startsWith(grpPrefix)).map(m => m.conversationId)
    )]
    cgrpConvIds.forEach(convId => {
      const convMsgs = messages.filter(m => m.conversationId === convId)
      const systemMsg = convMsgs.find(m => m.type === 'group_created')
      list.push({
        id: convId,
        name: systemMsg?.groupName || 'Groupe',
        sub: `${(systemMsg?.members?.length || 0) + 1} membres`,
        icon: 'group',
        members: systemMsg?.members || [],
        lastMsg: convMsgs.filter(m => m.type !== 'group_created').slice(-1)[0] || null,
      })
    })

    // 4. Groupes mixtes staff (grp_) où ce client est membre via client:{prospectId}
    const clientMemberKey = `client:${prospect?.id || 'demo'}`
    const staffGrpConvIds = [...new Set(
      messages.filter(m => m.conversationId.startsWith('grp_')).map(m => m.conversationId)
    )]
    staffGrpConvIds.forEach(convId => {
      if (list.find(c => c.id === convId)) return
      const convMsgs = messages.filter(m => m.conversationId === convId)
      const systemMsg = convMsgs.find(m => m.type === 'group_created')
      if (!systemMsg?.members?.includes(clientMemberKey)) return
      list.push({
        id: convId,
        name: systemMsg?.groupName || 'Groupe',
        sub: `${(systemMsg?.members?.length || 0) + 1} membres`,
        icon: 'group',
        members: systemMsg?.members || [],
        lastMsg: convMsgs.filter(m => m.type !== 'group_created').slice(-1)[0] || null,
      })
    })

    return list
  }, [messages, prospect, employes])

  // Unread counts
  const unreadCounts = useMemo(() => {
    const readTimes = msgReadState?.[myId] || {}
    const counts = {}
    for (const conv of conversations) {
      const lastRead = readTimes[conv.id]
      counts[conv.id] = messages.filter(m =>
        m.conversationId === conv.id &&
        String(m.senderId) !== myId &&
        m.type !== 'group_created' &&
        (!lastRead || m.timestamp > lastRead)
      ).length
    }
    return counts
  }, [conversations, messages, msgReadState, myId])

  // Sort: unread first, then by last message time
  const sortedConvs = useMemo(() => {
    const q = search.toLowerCase()
    const base = q ? conversations.filter(c => c.name.toLowerCase().includes(q)) : conversations
    return [...base].sort((a, b) => {
      const aU = unreadCounts[a.id] || 0
      const bU = unreadCounts[b.id] || 0
      if (aU > 0 && bU === 0) return -1
      if (bU > 0 && aU === 0) return 1
      return (b.lastMsg?.timestamp || '').localeCompare(a.lastMsg?.timestamp || '')
    })
  }, [conversations, search, unreadCounts])

  const activeConvInfo = useMemo(() => {
    const found = conversations.find(c => c.id === activeConv)
    if (found) return found
    // Fallback for a brand-new DM that has no messages yet
    if (!activeConv) return null
    const prefix = `cdm_${prospect?.id || 'demo'}_`
    if (activeConv.startsWith(prefix)) {
      const empId = activeConv.replace(prefix, '')
      const emp = employes.find(e => String(e.id) === empId)
      if (emp) return { id: activeConv, name: emp.nom, sub: emp.poste || 'Message direct', icon: 'dm', empId, lastMsg: null }
    }
    return null
  }, [conversations, activeConv, prospect, employes])
  const activeMessages = useMemo(() =>
    messages.filter(m => m.conversationId === activeConv && m.type !== 'group_created'),
    [messages, activeConv]
  )

  // Auto-open conversation from notification link (?conv=...)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const convParam = params.get('conv')
    if (convParam) openConv(convParam)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [activeMessages])

  useEffect(() => {
    if (activeConv && activeMessages.length > 0) markConvRead(myId, activeConv)
  }, [activeMessages, activeConv])

  // Cross-device read-state sync via Supabase
  useEffect(() => {
    if (!supabase || !myId || myId === 'client') return
    supabase.from('user_msg_read').select('state').eq('user_id', myId).single()
      .then(({ data }) => { if (data?.state) mergeReadStateForUser(myId, data.state) })
    const channel = supabase
      .channel(`msg_read_${myId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'user_msg_read',
        filter: `user_id=eq.${myId}`,
      }, ({ new: row }) => { if (row?.state) mergeReadStateForUser(myId, row.state) })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [myId]) // eslint-disable-line

  const openConv = (id) => {
    setActiveConv(id)
    setMobileView('chat')
    markConvRead(myId, id)
  }

  const handleSend = (e) => {
    e.preventDefault()
    if (!draft.trim() || !activeConv) return
    addMessage({
      conversationId: activeConv,
      senderId: myId,
      senderName: myName,
      senderRole: 'client',
      content: draft.trim(),
    })
    setDraft('')
  }

  const handleStartDm = (emp) => {
    const convId = `cdm_${prospect?.id || 'demo'}_${emp.id}`
    openConv(convId)
    setShowNew(false)
  }

  const handleCreateGroup = (name, memberIds) => {
    const groupId = `${Date.now()}`
    const convId = `cgrp_${prospect?.id || 'demo'}_${groupId}`
    const empNames = memberIds.map(id => employes.find(e => String(e.id) === id)?.nom || id).join(', ')
    addMessage({
      conversationId: convId,
      senderId: myId,
      senderName: myName,
      senderRole: 'client',
      content: `Groupe "${name}" créé avec : ${empNames}`,
      type: 'group_created',
      groupName: name,
      members: memberIds,
    })
    setShowGroupModal(false)
    openConv(convId)
  }

  // Client can only DM their personnel référent + DG
  const staffForDm = useMemo(() => {
    const prefix = `cdm_${prospect?.id || 'demo'}_`
    const existingDmIds = new Set(
      messages.filter(m => m.conversationId.startsWith(prefix))
        .map(m => m.conversationId.replace(prefix, ''))
    )
    // Find staff assigned to this client's project
    const myProject = projects?.find(p =>
      p.prospectId === prospect?.id || p.clientId === profile?.id
    )
    const referentIds = new Set()
    if (myProject) {
      ;(myProject.tasks || []).forEach(t => t.personnelId && referentIds.add(String(t.personnelId)))
      ;(myProject.missions || []).forEach(m => m.personnelId && referentIds.add(String(m.personnelId)))
    }
    return employes.filter(e => {
      if (existingDmIds.has(String(e.id))) return false
      return e.isDirecteur || referentIds.has(String(e.id))
    })
  }, [employes, messages, prospect, projects, profile])

  return (
    <div className="h-[calc(100vh-88px)] lg:h-[calc(100vh-120px)] flex gap-4">

      {/* Sidebar */}
      <div className={`w-full lg:w-72 flex-shrink-0 flex-col bg-white rounded-2xl border border-border overflow-hidden ${mobileView === 'chat' ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-ink text-sm">Messages</div>
            <div ref={newRef} className="relative">
              <button
                onClick={() => setShowNew(v => !v)}
                className="w-8 h-8 rounded-xl bg-electric/10 hover:bg-electric/20 flex items-center justify-center text-electric transition-colors"
              >
                <PenSquare size={15} />
              </button>
              <AnimatePresence>
                {showNew && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.97 }}
                    className="absolute top-full right-0 mt-2 w-56 bg-white border border-border rounded-xl shadow-xl overflow-hidden z-50"
                  >
                    <div className="p-2 space-y-0.5">
                      <div className="text-[10px] font-semibold text-muted uppercase tracking-widest px-2 py-1.5">
                        Nouvelle conversation
                      </div>
                      <button
                        onClick={() => { setShowGroupModal(true); setShowNew(false) }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-paper-warm transition-colors text-left"
                      >
                        <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                          <Users size={13} className="text-violet-600" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-ink">Créer un groupe</div>
                          <div className="text-[10px] text-muted">Choisir des membres</div>
                        </div>
                      </button>
                      {staffForDm.length > 0 && (
                        <>
                          <div className="text-[10px] font-semibold text-muted uppercase tracking-widest px-2 py-1.5 mt-1">
                            Message direct
                          </div>
                          {staffForDm.slice(0, 4).map(emp => (
                            <button key={emp.id} onClick={() => handleStartDm(emp)}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-paper-warm transition-colors text-left">
                              <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${getAvatarColor(emp.id)} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>
                                {getInitials(emp.nom)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold text-ink truncate">{emp.nom}</div>
                                <div className="text-[10px] text-muted truncate">{emp.poste}</div>
                              </div>
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-paper-warm px-3 py-2 rounded-xl border border-border">
            <Search size={12} className="text-muted" />
            <input
              placeholder="Rechercher..."
              className="bg-transparent outline-none text-xs flex-1 min-w-0"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && <button onClick={() => setSearch('')} className="text-muted hover:text-ink"><X size={12} /></button>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {sortedConvs.map(conv => {
            const isActive = conv.id === activeConv
            const unread = unreadCounts[conv.id] || 0
            const hasUnread = unread > 0 && !isActive
            return (
              <div
                key={conv.id}
                className={`group relative flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0 transition-colors ${
                  isActive ? 'bg-electric/5' : hasUnread ? 'bg-blue-50/40' : 'hover:bg-paper-warm'
                }`}
              >
              <button
                onClick={() => openConv(conv.id)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left"
              >
                <div className="relative flex-shrink-0">
                  {conv.icon === 'team' ? (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ink to-electric flex items-center justify-center">
                      <Users size={16} className="text-white" />
                    </div>
                  ) : conv.icon === 'group' ? (
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAvatarColor(conv.id)} flex items-center justify-center`}>
                      <Users size={15} className="text-white" />
                    </div>
                  ) : (
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAvatarColor(conv.empId || conv.id)} flex items-center justify-center text-white text-xs font-bold`}>
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
                  <div className={`text-sm truncate ${isActive ? 'text-electric font-semibold' : hasUnread ? 'text-ink font-bold' : 'text-ink font-semibold'}`}>
                    {conv.name}
                  </div>
                  <div className={`text-xs truncate mt-0.5 ${hasUnread ? 'text-ink font-medium' : 'text-muted'}`}>
                    {conv.lastMsg?.content || conv.sub}
                  </div>
                </div>
                {conv.lastMsg && (
                  <div className={`text-[10px] flex-shrink-0 ${hasUnread ? 'text-electric font-semibold' : 'text-muted'}`}>
                    {fmtTime(conv.lastMsg.timestamp)}
                  </div>
                )}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteModal(conv.id) }}
                className="w-7 h-7 rounded-lg text-muted hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-colors opacity-100 lg:opacity-0 lg:group-hover:opacity-100 flex-shrink-0"
              >
                <Trash2 size={13} />
              </button>
            </div>
            )
          })}
        </div>
      </div>

      {/* Chat panel */}
      <div className={`flex-1 min-w-0 flex-col bg-white rounded-2xl border border-border overflow-hidden ${mobileView === 'list' ? 'hidden lg:flex' : 'flex'}`}>
        {!activeConv ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-14 h-14 rounded-2xl bg-electric/10 flex items-center justify-center mb-4">
              <MessageSquare size={22} className="text-electric" />
            </div>
            <div className="font-semibold text-ink mb-1 text-sm">Sélectionnez une conversation</div>
            <p className="text-xs text-muted max-w-xs">
              Choisissez un contact dans la liste ou démarrez une nouvelle conversation.
            </p>
          </div>
        ) : (<>
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => setMobileView('list')}
            className="lg:hidden w-8 h-8 rounded-xl hover:bg-paper-warm flex items-center justify-center text-muted flex-shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
          {activeConvInfo?.icon === 'team' ? (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-ink to-electric flex items-center justify-center flex-shrink-0">
              <Users size={15} className="text-white" />
            </div>
          ) : activeConvInfo?.icon === 'group' ? (
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getAvatarColor(activeConv)} flex items-center justify-center flex-shrink-0`}>
              <Users size={14} className="text-white" />
            </div>
          ) : (
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getAvatarColor(activeConvInfo?.empId || activeConv)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
              {getInitials(activeConvInfo?.name)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-ink text-sm truncate">{activeConvInfo?.name || 'Conversation'}</div>
            <div className="text-xs text-muted">
              {activeConvInfo?.icon === 'team' ? 'Canal général' : activeConvInfo?.icon === 'group' ? activeConvInfo.sub : 'Message direct'}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {activeMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-14 h-14 rounded-2xl bg-electric/10 flex items-center justify-center mb-4">
                <MessageSquare size={22} className="text-electric" />
              </div>
              <div className="font-semibold text-ink mb-1 text-sm">
                {activeConvInfo?.icon === 'dm'
                  ? `Démarrez une conversation avec ${activeConvInfo?.name}`
                  : 'Aucun message pour l\'instant'}
              </div>
              <p className="text-xs text-muted max-w-xs">
                Écrivez un message ci-dessous pour contacter votre équipe projet.
              </p>
            </div>
          ) : (
            activeMessages.map((msg, i) => {
              const isMe = String(msg.senderId) === myId
              const prevMsg = activeMessages[i - 1]
              const showDate = !prevMsg || fmtDateLabel(prevMsg.timestamp) !== fmtDateLabel(msg.timestamp)
              const showSender = !prevMsg || prevMsg.senderId !== msg.senderId

              return (
                <div key={msg.id || i}>
                  {showDate && (
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-[10px] text-muted font-semibold uppercase tracking-widest">
                        {fmtDateLabel(msg.timestamp)}
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

                    <div className={`max-w-[75%] flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                      {showSender && !isMe && (
                        <span className="text-xs font-semibold text-muted px-1">{msg.senderName}</span>
                      )}
                      <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isMe
                          ? 'bg-gradient-to-br from-ink to-electric text-white rounded-tr-sm'
                          : 'bg-paper-warm text-ink rounded-tl-sm border border-border'
                      }`}>
                        {msg.content}
                        {msg.editedAt && (
                          <span className={`text-[10px] ml-2 ${isMe ? 'text-white/50' : 'text-muted'}`}>modifié</span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted px-1">{fmtTime(msg.timestamp)}</span>
                    </div>
                  </motion.div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Composer */}
        <div className="border-t border-border p-4 flex-shrink-0">
          <form onSubmit={handleSend}>
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) }
                }}
                placeholder="Écrivez un message..."
                rows={1}
                className="flex-1 resize-none outline-none text-sm placeholder:text-muted bg-paper-warm border border-border rounded-xl px-4 py-3 min-h-[44px] max-h-28"
                style={{ overflowY: 'auto' }}
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                className="w-11 h-11 rounded-xl bg-gradient-to-br from-ink to-electric text-white flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition-opacity flex-shrink-0"
              >
                <Send size={16} />
              </button>
            </div>
          </form>
        </div>
      </>)}
      </div>

      {/* Group creation modal */}
      <AnimatePresence>
        {showGroupModal && (
          <NewGroupModal
            employes={employes}
            onClose={() => setShowGroupModal(false)}
            onCreate={handleCreateGroup}
          />
        )}
      </AnimatePresence>

      {/* Delete conversation modal */}
      <AnimatePresence>
        {deleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && setDeleteModal(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden"
            >
              <div className="px-5 pt-5 pb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center mb-3">
                  <Trash2 size={18} className="text-rose-500" />
                </div>
                <div className="font-semibold text-ink text-sm mb-1">Supprimer la conversation</div>
                <p className="text-xs text-muted">Cette conversation sera supprimée de votre liste. Les autres participants ne seront pas affectés.</p>
              </div>
              <div className="px-5 pb-5 flex gap-2">
                <button onClick={() => setDeleteModal(null)} className="btn-ghost flex-1 justify-center text-xs">Annuler</button>
                <button
                  onClick={() => {
                    deleteConversation(deleteModal, false, myId)
                    if (activeConv === deleteModal) { setActiveConv(null); setMobileView('list') }
                    setDeleteModal(null)
                  }}
                  className="flex-1 bg-rose-500 text-white px-4 py-2.5 rounded-xl font-medium text-xs hover:bg-rose-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 size={13} /> Supprimer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
