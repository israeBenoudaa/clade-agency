import { useState, useRef, useEffect, useMemo } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, FolderKanban, Users, Wallet, Contact2,
  Search, LogOut, Menu, X, UserPlus, ChevronRight, Database,
  MessageSquare, ChevronDown, Network, FolderGit2, UserCircle,
  ClipboardList, Paperclip, UsersRound, Briefcase, BookOpen, Layers,
  Eye, RotateCcw, History, Globe, Bell,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { ROLE_LABELS } from '../lib/supabase'
import { PATH_MODULE_MAP, ALL_MODULES } from '../lib/modules'
import { Avatar } from '../components/ui'
import { CladeBrand } from '../components/ui/Logo'
import EmployeeRequestModal from '../components/EmployeeRequestModal'
import OnboardingGuide from '../components/OnboardingGuide'
import toast from 'react-hot-toast'

const MON_ESPACE_NAV = [
  { to: '/app', label: 'Mon Planning', icon: LayoutDashboard, end: true },
]

const GESTION_NAV = [
  { to: '/app/projects', label: 'Projets', icon: FolderKanban },
  { to: '/app/hr', label: 'Ressources Humaines', icon: Users },
  { to: '/app/finance', label: 'Finance', icon: Wallet },
  { to: '/app/crm', label: 'Relations Clients', icon: Contact2 },
  { to: '/app/collaborateurs', label: 'Collaborateurs', icon: Network },
  { to: '/app/workflow', label: 'Processus', icon: Layers },
]

const DEMO_ROLES = [
  { role: 'directeur', label: 'Directeur Général', color: 'bg-electric' },
  { role: 'chef_projet', label: 'Chef de Projet', color: 'bg-blue-500' },
  { role: 'architecte', label: 'Architecte', color: 'bg-emerald-500' },
  { role: 'rh', label: 'RH', color: 'bg-amber-500' },
  { role: 'finance', label: 'Finance', color: 'bg-purple-500' },
  { role: 'client', label: 'Portail Client', color: 'bg-rose-500' },
]

const NOTIF_CFG = {
  new_task:               { icon: '📋', accent: '#3B82F6', label: 'Nouvelle tâche' },
  task_comment:           { icon: '💬', accent: '#8B5CF6', label: 'Commentaire' },
  task_done:              { icon: '✅', accent: '#10B981', label: 'Tâche terminée' },
  task_stuck:             { icon: '🚨', accent: '#EF4444', label: 'Tâche bloquée' },
  client_feedback:        { icon: '💬', accent: '#F97316', label: 'Message client' },
  new_message:            { icon: '✉️',  accent: '#06B6D4', label: 'Message' },
  autoformation_complete: { icon: '🎓', accent: '#059669', label: 'Formation' },
  rdv:                    { icon: '📅', accent: '#F97316', label: 'RDV' },
  rdv_prospect:           { icon: '🤝', accent: '#0EA5E9', label: 'RDV client' },
  new_prospect:           { icon: '🤝', accent: '#06B6D4', label: 'Prospect' },
  new_client:             { icon: '⭐', accent: '#10B981', label: 'Client' },
  new_candidature:        { icon: '👤', accent: '#8B5CF6', label: 'Candidature' },
  new_request:            { icon: '📄', accent: '#F59E0B', label: 'Demande RH' },
  request_processed:      { icon: '✔️',  accent: '#10B981', label: 'Demande traitée' },
  transaction_in:         { icon: '💰', accent: '#10B981', label: 'Entrée financière' },
  transaction_out:        { icon: '💸', accent: '#EF4444', label: 'Sortie financière' },
}
const NOTIF_DEFAULT = { icon: '🔔', accent: '#64748B', label: 'Notification' }

const TITLES = {
  '/app':                 { t: 'Mon Planning',        s: '◆ Mon Espace' },
  '/app/messages':        { t: 'Messages',             s: '◆ Mon Espace' },
  '/app/my-projects':     { t: 'Mes Projets',          s: '◆ Mon Espace' },
  '/app/my-team':         { t: 'Mon Équipe',           s: '◆ Mon Espace' },
  '/app/my-workflow':     { t: 'Mon Workflow',         s: '◆ Mon Espace' },
  '/app/projects':        { t: 'Projets',              s: '◆ Gestion' },
  '/app/hr':              { t: 'Ressources Humaines',  s: '◆ Gestion' },
  '/app/finance':         { t: 'Finance',              s: '◆ Gestion' },
  '/app/crm':             { t: 'Relations Clients',    s: '◆ Gestion' },
  '/app/collaborateurs':  { t: 'Collaborateurs',       s: '◆ Gestion' },
  '/app/workflow':        { t: 'Processus',             s: '◆ Gestion' },
  '/app/portfolio':         { t: 'Portfolio',             s: '◆ Gestion' },
  '/app/users':           { t: 'Utilisateurs & Accès', s: '◆ Administration' },
  '/app/donnees':         { t: 'Données',              s: '◆ Administration' },
  '/client':              { t: 'Mon Projet',           s: '◆ Portail Client' },
  '/client/livrables':    { t: 'Livrables',            s: '◆ Portail Client' },
  '/client/depenses':     { t: 'Mes Dépenses',         s: '◆ Portail Client' },
  '/client/messages':     { t: 'Messages',             s: '◆ Portail Client' },
}

export default function StaffLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [demoConfirmOpen, setDemoConfirmOpen] = useState(false)
  const searchRef = useRef(null)
  const notifRef = useRef(null)
  const sessionStartRef = useRef(Date.now())

  const { profile, signOut, isDirector, isDemoMode, isEmployeeMode, isDirectorMode } = useAuth()
  const { employes, projects, prospects, notifications, markAllNotificationsRead, deleteNotification, addDemandeRH, messages, msgReadState, demoCheckpoint, exitDemoMode, confirmDemoRestore, supaLoaded } = useData()
  const navigate = useNavigate()
  const location = useLocation()

  const myId = String(profile?.id || 'unknown')
  const myEmpId = String(profile?.employe_id || profile?.id || 'unknown')
  const isEmployee = isEmployeeMode && !isDirectorMode && !isDemoMode
  const hasTeam = useMemo(() =>
    projects.some(p => {
      const equipeIds = (p.equipeProjet || []).map(String)
      // Referent: has at least one team member
      if (String(p.architecteReferentId) === myEmpId) return equipeIds.length > 0
      // Team member: project has at least one other member (not just self)
      return equipeIds.includes(myEmpId) && equipeIds.some(id => id !== myEmpId)
    }),
    [projects, myEmpId]
  )

  const hasMyProjects = useMemo(() =>
    projects.some(p =>
      String(p.architecteReferentId) === myEmpId ||
      (p.equipeProjet || []).map(String).includes(myEmpId)
    ),
    [projects, myEmpId]
  )

  const unreadMsgCount = useMemo(() => {
    if (!messages?.length) return 0
    const isDir = isDirector || isDirectorMode || isDemoMode
    const myReadState = (msgReadState || {})[myId] || {}
    const allConvIds = [...new Set(messages.map(m => m.conversationId))]

    // Apply the same access rules as MessagesPage
    const accessibleConvIds = allConvIds.filter(convId => {
      if (convId.startsWith('cdm_')) return isDir || convId.endsWith(`_${myId}`)
      if (convId.startsWith('cgrp_')) {
        if (isDir) return true
        const systemMsg = messages.find(m => m.conversationId === convId && m.type === 'group_created')
        return (systemMsg?.members || []).includes(myId)
      }
      return true // team, dm, client_, broadcast — accessible to all
    })

    let count = 0
    for (const convId of accessibleConvIds) {
      const lastRead = myReadState[convId] || null
      count += messages.filter(
        m => m.conversationId === convId &&
             String(m.senderId) !== myId &&
             (!lastRead || m.timestamp > lastRead)
      ).length
    }
    return count
  }, [messages, msgReadState, myId, isDirector, isDirectorMode, isDemoMode])

  const visibleNotifications = useMemo(() => {
    const isDir = isDirector || isDirectorMode || isDemoMode

    // Compute which modules this user has access to
    let mods = null // null = access to all
    if (!isDir && isEmployeeMode && !isDemoMode) {
      const emp = employes.find(e => String(e.id) === String(profile?.employe_id))
      if (emp?.permissions?.modules) {
        const validIds = new Set(ALL_MODULES.map(m => m.id))
        mods = emp.permissions.modules.filter(id => validIds.has(id))
      }
    }
    const hasModule = (mod) => isDir || !mods || mods.includes(mod)

    return (notifications || []).filter(n => {
      if (n.targetUserId) {
        // Legacy director-achraf target
        if (n.targetUserId === 'director-achraf') return isDir
        // Module-based: visible to anyone with access to that page
        if (n.targetUserId.startsWith('mod:')) return hasModule(n.targetUserId.slice(4))
        // Individual user target
        return String(n.targetUserId) === myId || String(n.targetUserId) === myEmpId
      }
      // Legacy HR broadcast (forHR: true on old notifications)
      if (n.forHR) return profile?.role === 'rh' || isDir
      // No target = director / demo only (system-level)
      return isDir
    })
  }, [notifications, myId, myEmpId, isDirector, isDirectorMode, isDemoMode, isEmployeeMode, employes, profile])

  const crmBadgeCount = useMemo(() =>
    visibleNotifications.filter(n => !n.read && (n.type === 'new_prospect' || n.type === 'new_client')).length,
    [visibleNotifications]
  )

  let allowedModules = null
  let allowedProjects = null // null = access to all
  if (isEmployeeMode && !isDemoMode && !isDirector && !isDirectorMode) {
    const emp = employes.find(e => String(e.id) === String(profile?.employe_id))
    if (emp?.permissions?.modules) {
      const validIds = new Set(ALL_MODULES.map(m => m.id))
      allowedModules = emp.permissions.modules.filter(id => validIds.has(id))
    }
    if (emp?.permissions?.allowedProjects !== undefined) allowedProjects = emp.permissions.allowedProjects
  }

  const currentEmp = employes.find(e => String(e.id) === String(profile?.employe_id))
  if (!isDemoMode && supaLoaded && currentEmp?.statut === 'bloque') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper p-8">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-5">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F43F5E" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
          </div>
          <h2 className="font-display text-2xl text-ink mb-2">Identifiant introuvable</h2>
          <p className="text-muted text-sm leading-relaxed">Nous ne reconnaissons pas cet identifiant. Vérifiez vos informations ou contactez votre responsable.</p>
          <button onClick={async () => { await signOut(); navigate('/login') }} className="mt-6 text-xs text-muted underline hover:text-ink transition-colors">Se déconnecter</button>
        </div>
      </div>
    )
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
      toast.success('Déconnecté')
    } catch {
      toast.error('Erreur lors de la déconnexion')
    }
  }

  const initials = profile
    ? `${profile.full_name?.[0] || ''}${profile.full_name?.split(' ')[1]?.[0] || ''}`.toUpperCase()
    : '??'

  const path = location.pathname
  const currentTitle = TITLES[path]
    || (path.startsWith('/app/projects/') ? { t: 'Projet', s: '◆ Gestion' } : null)
    || (path.startsWith('/app/my-projects/') ? { t: 'Mon Projet', s: '◆ Mon Espace' } : null)
    || (path.startsWith('/app/my-workflow/') ? { t: 'Éditeur', s: '◆ Mon Workflow' } : null)
    || (path.startsWith('/app/workflow/') ? { t: 'Note', s: '◆ Processus' } : null)
    || (path.startsWith('/app/hr/') ? { t: 'Ressources Humaines', s: '◆ Gestion' } : null)
    || (path.startsWith('/app/crm/') ? { t: 'Relations Clients', s: '◆ Gestion' } : null)
    || (path.startsWith('/app/finance/') ? { t: 'Finance', s: '◆ Gestion' } : null)
    || (path.startsWith('/app/portfolio/') ? { t: 'Portfolio', s: '◆ Gestion' } : null)
    || TITLES['/app']

  // Search results — filtered by user permissions
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q || q.length < 2) return []

    // Is this a regular employee (not director, not demo)?
    const isRestricted = isEmployee
    // Check if user has access to a given module
    const hasModule = (mod) => !isRestricted || !allowedModules || allowedModules.includes(mod)
    // Projects this user is allowed to see
    const accessibleProjects = isRestricted && allowedProjects !== null
      ? projects.filter(p => (allowedProjects || []).map(String).includes(String(p.id)))
      : projects

    const groups = []

    // Projects — respects module + allowedProjects
    if (hasModule('projects')) {
      const matchedProjects = accessibleProjects
        .filter(p => p.nom?.toLowerCase().includes(q))
        .slice(0, 4)
      if (matchedProjects.length > 0) {
        groups.push({
          label: 'Projets',
          items: matchedProjects.map(p => ({
            label: p.nom,
            sub: p.typeProjet === 'interne' ? 'Projet interne' : (p.type || 'Projet'),
            to: `/app/projects/${p.id}`,
            icon: FolderGit2,
            accent: '#06B6D4',
          })),
        })
      }
    }

    // Tasks — employees see only their own tasks; managers see all in accessible projects
    if (hasModule('projects')) {
      const matchedTasks = []
      for (const p of accessibleProjects) {
        for (const t of (p.tasks || [])) {
          if (isRestricted && String(t.personnelId) !== myEmpId) continue
          if (t.nom?.toLowerCase().includes(q)) {
            matchedTasks.push({ task: t, project: p })
            if (matchedTasks.length >= 4) break
          }
        }
        if (matchedTasks.length >= 4) break
      }
      if (matchedTasks.length > 0) {
        groups.push({
          label: isRestricted ? 'Mes tâches' : 'Tâches',
          items: matchedTasks.map(({ task, project }) => ({
            label: task.nom,
            sub: project.nom + (!isRestricted && task.personnelNom ? ` — ${task.personnelNom}` : ''),
            to: `/app/projects/${project.id}`,
            icon: ClipboardList,
            accent: '#8B5CF6',
          })),
        })
      }
    }

    // Employees — confidential, only directors/managers can see profiles
    if (!isRestricted && hasModule('hr')) {
      const matchedEmployes = employes.filter(e => e.nom?.toLowerCase().includes(q)).slice(0, 3)
      if (matchedEmployes.length > 0) {
        groups.push({
          label: 'Équipe',
          items: matchedEmployes.map(e => ({
            label: e.nom,
            sub: e.poste || 'Collaborateur',
            to: `/app/hr/${e.id}`,
            icon: UserCircle,
            accent: '#10B981',
          })),
        })
      }
    }

    // Prospects — only if user has CRM module
    if (hasModule('crm')) {
      const matchedProspects = prospects
        .filter(p => `${p.prenom} ${p.nom}`.toLowerCase().includes(q))
        .slice(0, 3)
      if (matchedProspects.length > 0) {
        groups.push({
          label: 'Clients / Prospects',
          items: matchedProspects.map(p => ({
            label: `${p.prenom} ${p.nom}`,
            sub: p.typeProjet || 'Prospect',
            to: `/app/crm/prospect/${p.id}`,
            icon: Contact2,
            accent: '#F97316',
          })),
        })
      }
    }

    return groups
  }, [searchQuery, projects, employes, prospects, isEmployee, allowedModules, allowedProjects, myId])

  const unreadCount = visibleNotifications.filter(n => !n.read).length

  // ── localStorage usage ────────────────────────────────────────────────────
  const storageUsage = useMemo(() => {
    try {
      let total = 0
      for (const key in localStorage) {
        if (!localStorage.hasOwnProperty(key)) continue
        total += (localStorage.getItem(key) || '').length * 2 // UTF-16: 2 bytes/char
      }
      const mb = total / (1024 * 1024)
      const pct = Math.min(100, Math.round((mb / 10) * 100)) // ~10MB limit
      return { mb: mb.toFixed(1), pct }
    } catch { return { mb: '?', pct: 0 } }
  }, [projects]) // recompute when data changes

  const storageColor = storageUsage.pct >= 80 ? 'text-rose-500' : storageUsage.pct >= 50 ? 'text-amber-500' : 'text-emerald-500'
  const storageBg   = storageUsage.pct >= 80 ? 'bg-rose-50 border-rose-200' : storageUsage.pct >= 50 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'

  // ── Global notification bubble ────────────────────────────────────────────
  const seenNotifIds = useRef(null)
  useEffect(() => {
    if (seenNotifIds.current === null) {
      seenNotifIds.current = new Set((visibleNotifications || []).map(n => n.id))
      return
    }
    const newOnes = (visibleNotifications || []).filter(n =>
      !seenNotifIds.current.has(n.id) &&
      new Date(n.createdAt || 0).getTime() > sessionStartRef.current
    )
    newOnes.slice(0, 3).forEach(n => {
      seenNotifIds.current.add(n.id)
      const cfg = NOTIF_CFG[n.type] || NOTIF_DEFAULT
      toast.custom((t) => (
        <motion.div
          key={n.id}
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: t.visible ? 1 : 0, y: t.visible ? 0 : -12, scale: t.visible ? 1 : 0.95 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          onClick={() => toast.dismiss(t.id)}
          className="flex items-stretch bg-white/96 backdrop-blur-xl rounded-2xl overflow-hidden cursor-pointer"
          style={{
            width: 'min(calc(100vw - 28px), 340px)',
            boxShadow: `0 4px 28px rgba(0,0,0,0.09), 0 0 0 1px rgba(0,0,0,0.05), inset 0 0 0 1px rgba(255,255,255,0.7)`,
          }}
        >
          {/* Colored accent strip */}
          <div className="w-1 flex-shrink-0" style={{ background: cfg.accent }} />
          {/* Icon bubble */}
          <div className="flex items-center justify-center w-10 flex-shrink-0 my-2.5 ml-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
              style={{ background: `${cfg.accent}18` }}>
              {cfg.icon}
            </div>
          </div>
          {/* Text */}
          <div className="flex-1 min-w-0 py-2.5 pl-2 pr-3">
            <div className="text-[9.5px] font-bold uppercase tracking-[0.1em] leading-none mb-1"
              style={{ color: cfg.accent }}>{cfg.label}</div>
            <div className="text-xs font-medium text-ink leading-snug line-clamp-2">{n.message}</div>
          </div>
        </motion.div>
      ), { duration: 4000, position: 'top-center' })
    })
  }, [visibleNotifications])

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  if (!supaLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="animate-pulse">
          <CladeBrand size="lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-paper">
      {/* SIDEBAR DESKTOP — hidden on mobile, handled by drawer */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar
          onSignOut={handleSignOut}
          isDirector={isDirector}
          profile={profile}
          initials={initials}
          navigate={navigate}
          allowedModules={allowedModules}
          isEmployee={isEmployee}
          hasTeam={hasTeam}
          hasMyProjects={hasMyProjects}
          unreadMsgCount={unreadMsgCount}
          crmBadgeCount={crmBadgeCount}
          onRequestClick={() => setShowRequestModal(true)}
        />
      </div>

      {/* OVERLAY + DRAWER MOBILE */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden fixed inset-0 bg-ink/40 backdrop-blur-sm z-40"
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="lg:hidden fixed inset-y-0 left-0 z-50 w-72"
            >
              <Sidebar
                mobile
                onClose={() => setSidebarOpen(false)}
                onSignOut={handleSignOut}
                isDirector={isDirector}
                profile={profile}
                initials={initials}
                navigate={navigate}
                allowedModules={allowedModules}
                isEmployee={isEmployee}
                hasTeam={hasTeam}
                hasMyProjects={hasMyProjects}
                unreadMsgCount={unreadMsgCount}
                crmBadgeCount={crmBadgeCount}
                onRequestClick={() => { setShowRequestModal(true); setSidebarOpen(false) }}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* CONTENU PRINCIPAL */}
      <main className="flex-1 min-w-0 flex flex-col">

        {/* Demo mode banner */}
        <AnimatePresence>
          {demoCheckpoint && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden flex-shrink-0 z-40 relative"
            >
              <div className="bg-amber-500 text-white px-4 lg:px-10 py-2.5 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Eye size={14} className="flex-shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider">Mode aperçu</span>
                  <span className="text-amber-200 text-xs hidden sm:inline">—</span>
                  <span className="text-xs text-amber-100 truncate hidden sm:inline">
                    {demoCheckpoint.label} · {new Date(demoCheckpoint.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })} à {new Date(demoCheckpoint.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={exitDemoMode}
                    className="text-xs px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 font-semibold transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => setDemoConfirmOpen(true)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-white text-amber-700 hover:bg-amber-50 font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <RotateCcw size={11} /> Restaurer définitivement
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Demo restore confirmation modal */}
        <AnimatePresence>
          {demoConfirmOpen && demoCheckpoint && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm"
              onClick={e => e.target === e.currentTarget && setDemoConfirmOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 12 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
              >
                <div className="p-6">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
                    <History size={22} className="text-amber-600" />
                  </div>
                  <div className="font-semibold text-ink mb-1">Restaurer cette version ?</div>
                  <p className="text-xs text-muted leading-relaxed mb-1">
                    <span className="font-semibold text-ink">{demoCheckpoint.label}</span><br />
                    {new Date(demoCheckpoint.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })} à {new Date(demoCheckpoint.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                    <span className="font-semibold">Attention :</span> les données actuelles seront remplacées. Une sauvegarde automatique sera créée juste avant.
                  </div>
                </div>
                <div className="px-6 pb-5 flex gap-2">
                  <button onClick={() => setDemoConfirmOpen(false)} className="btn-ghost flex-1 justify-center text-xs">Annuler</button>
                  <button
                    onClick={() => { confirmDemoRestore(); setDemoConfirmOpen(false) }}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <History size={13} /> Confirmer la restauration
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <header className="sticky top-0 z-30 bg-paper/80 backdrop-blur-lg border-b border-border">
          <div className="px-4 lg:px-10 py-4 lg:py-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 -ml-2 text-ink"
                aria-label="Menu"
              >
                <Menu size={22} />
              </button>
              <div className="min-w-0">
                <div className="text-[10px] lg:text-xs text-muted tracking-widest uppercase mb-1 truncate">
                  {currentTitle.s}
                </div>
                <h1 className="font-display text-2xl lg:text-4xl text-ink leading-none truncate">
                  {currentTitle.t}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
              {/* Search */}
              <div ref={searchRef} className="relative hidden md:block">
                <div className="flex items-center gap-2 bg-paper-warm px-4 py-2.5 rounded-xl border border-border w-64">
                  <Search size={15} className="text-muted flex-shrink-0" />
                  <input
                    placeholder="Rechercher..."
                    className="bg-transparent outline-none text-sm flex-1 min-w-0"
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true) }}
                    onFocus={() => setSearchOpen(true)}
                    onKeyDown={e => {
                      if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery('') }
                      if (e.key === 'Enter' && searchResults.length > 0) {
                        const first = searchResults[0]?.items?.[0]
                        if (first) { navigate(first.to); setSearchOpen(false); setSearchQuery('') }
                      }
                    }}
                  />
                  {searchQuery && (
                    <button onClick={() => { setSearchQuery(''); setSearchOpen(false) }} className="text-muted hover:text-ink">
                      <X size={13} />
                    </button>
                  )}
                </div>
                <AnimatePresence>
                  {searchOpen && searchResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full mt-2 left-0 w-80 bg-white border border-border rounded-2xl shadow-2xl overflow-hidden z-50"
                    >
                      {searchResults.map((group, gi) => (
                        <div key={gi}>
                          <div className="px-4 pt-3 pb-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">{group.label}</span>
                          </div>
                          {group.items.map((r, i) => {
                            const Icon = r.icon
                            return (
                              <button
                                key={i}
                                onClick={() => { navigate(r.to); setSearchOpen(false); setSearchQuery('') }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-paper-warm transition-colors text-left"
                              >
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                                  style={{ background: `${r.accent}18` }}>
                                  <Icon size={13} style={{ color: r.accent }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-semibold text-ink truncate">{r.label}</div>
                                  {r.sub && <div className="text-[11px] text-muted truncate">{r.sub}</div>}
                                </div>
                              </button>
                            )
                          })}
                          {gi < searchResults.length - 1 && <div className="mx-4 border-t border-border my-1" />}
                        </div>
                      ))}
                      <div className="px-4 py-2.5 border-t border-border bg-paper-warm/60">
                        <span className="text-[10px] text-muted">Appuyez sur Entrée pour naviguer · Échap pour fermer</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Storage indicator — director only, shows when > 30% */}
              {(isDirector || isDirectorMode) && storageUsage.pct >= 30 && (
                <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold ${storageBg} ${storageColor}`}
                  title={`Stockage local : ${storageUsage.mb} MB utilisés (~10 MB max)`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>
                  </svg>
                  {storageUsage.mb} MB
                  {storageUsage.pct >= 80 && <span className="ml-0.5">⚠️</span>}
                </div>
              )}

              {/* Notifications */}
              <div ref={notifRef} className="relative">
                <button
                  onClick={() => { setNotifOpen(v => !v); if (!notifOpen) markAllNotificationsRead?.() }}
                  className="relative w-10 h-10 rounded-xl flex items-center justify-center hover:bg-black/5 transition-colors"
                >
                  <Bell size={17} className="text-ink/60" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 flex items-center justify-center text-[9px] font-bold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                <AnimatePresence>
                  {notifOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full right-0 mt-2 w-80 rounded-2xl overflow-hidden z-50"
                      style={{ background: '#ffffff', boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.08)' }}
                    >
                      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                        <span className="font-semibold text-sm text-ink">Notifications</span>
                        {unreadCount > 0 && <span className="text-xs text-muted">{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</span>}
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {visibleNotifications.length === 0 ? (
                          <div className="py-12 text-center flex flex-col items-center gap-2">
                            <Bell size={22} className="text-ink/20" />
                            <div className="text-sm font-medium text-muted">Aucune notification</div>
                          </div>
                        ) : (
                          visibleNotifications.slice(0, 15).map((n) => {
                            const cfg = NOTIF_CFG[n.type] || NOTIF_DEFAULT
                            return (
                              <div key={n.id}
                                onClick={() => { if (n.link) { navigate(n.link); setNotifOpen(false) } }}
                                className={`flex items-stretch transition-colors group overflow-hidden ${!n.read ? 'bg-electric/[0.04]' : ''} ${n.link ? 'cursor-pointer hover:bg-black/[0.03]' : ''}`}
                                style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                {/* Accent strip */}
                                <div className="w-[3px] flex-shrink-0 self-stretch" style={{ background: !n.read ? cfg.accent : 'transparent' }} />
                                {/* Icon bubble */}
                                <div className="flex items-center justify-center w-10 flex-shrink-0 py-3 pl-1.5">
                                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{ background: `${cfg.accent}18` }}>
                                    {cfg.icon}
                                  </div>
                                </div>
                                {/* Content */}
                                <div className="flex-1 min-w-0 py-2.5 pl-2 pr-1">
                                  <div className="text-[9px] font-bold uppercase tracking-[0.08em] leading-none mb-0.5" style={{ color: cfg.accent }}>{cfg.label}</div>
                                  <div className="text-xs font-medium text-ink leading-snug line-clamp-2">{n.message}</div>
                                  <div className="text-[10px] text-muted mt-1">
                                    {n.createdAt ? new Date(n.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                                  </div>
                                </div>
                                {/* Delete */}
                                <button
                                  onClick={e => { e.stopPropagation(); deleteNotification(n.id) }}
                                  className="opacity-0 group-hover:opacity-100 flex-shrink-0 self-center mr-2 w-6 h-6 rounded flex items-center justify-center text-muted hover:text-rose-500 hover:bg-rose-50 transition-all"
                                  title="Supprimer"
                                >
                                  <X size={11} />
                                </button>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button className="lg:hidden w-10 h-10 rounded-xl overflow-hidden">
                <Avatar initials={initials} size={40} />
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1">
          {!supaLoaded ? (
            <div className="flex items-center justify-center" style={{ minHeight: 320 }}>
              <div className="w-7 h-7 rounded-full border-2 border-electric border-t-transparent animate-spin" />
            </div>
          ) : (
            <Outlet />
          )}
        </div>
      </main>

      <OnboardingGuide />

      {/* Employee request modal */}
      <AnimatePresence>
        {showRequestModal && (
          <EmployeeRequestModal
            profile={profile}
            onClose={() => setShowRequestModal(false)}
            onSubmit={(data) => { addDemandeRH(data); toast.success('Demande envoyée'); setShowRequestModal(false) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function NavItem({ item, mobile, onClose, badge }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={mobile ? onClose : undefined}
      className={({ isActive }) =>
        `relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
          isActive
            ? 'bg-electric/10 text-paper font-semibold'
            : 'text-paper/70 hover:bg-white/5'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-5 bg-electric rounded-r" />
          )}
          <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
          <span className="flex-1">{item.label}</span>
          {badge > 0 && !isActive && (
            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-electric/80 text-[10px] font-bold text-paper flex items-center justify-center leading-none">
              {badge > 9 ? '9+' : badge}
            </span>
          )}
          {isActive && <ChevronRight size={13} className="ml-auto" />}
        </>
      )}
    </NavLink>
  )
}

function Sidebar({ mobile, onClose, onSignOut, isDirector, profile, initials, navigate, allowedModules, isEmployee, hasTeam, hasMyProjects, unreadMsgCount, crmBadgeCount, onRequestClick }) {
  const { isDemoMode, switchDemoRole } = useAuth()
  const [rolesOpen, setRolesOpen] = useState(false)

  const monEspaceItems = [
    ...MON_ESPACE_NAV,
    ...(hasMyProjects ? [{ to: '/app/my-projects', label: 'Mes Projets', icon: Briefcase }] : []),
    ...(hasTeam ? [{ to: '/app/my-team', label: 'Mon Équipe', icon: UsersRound }] : []),
    { to: '/app/my-workflow', label: 'Mon Workflow', icon: BookOpen },
    { to: '/app/messages', label: 'Messages', icon: MessageSquare },
  ]

  const gestionItems = allowedModules
    ? GESTION_NAV.filter(item => {
        const moduleId = PATH_MODULE_MAP[item.to]
        return !moduleId || allowedModules.includes(moduleId)
      })
    : GESTION_NAV

  const handleRoleSwitch = (role) => {
    switchDemoRole(role)
    setRolesOpen(false)
    if (role === 'client') {
      navigate('/client')
    } else {
      navigate('/app')
    }
    if (mobile && onClose) onClose()
  }

  return (
    <div className="w-72 lg:w-64 bg-ink-deep text-paper flex flex-col py-7 px-4 lg:sticky lg:top-0" style={{ height: '100dvh' }}>
      {/* Branding */}
      <div className="flex items-center justify-between mb-8 px-2 flex-shrink-0">
        <div className="flex items-center">
          <CladeBrand light size="md" />
        </div>
        {mobile && (
          <button onClick={onClose} className="text-paper/60">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Nav Staff */}
      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col sidebar-scroll">
      <nav className="flex flex-col gap-1">

        {/* ── Mon espace ── */}
        <div className="text-[10px] uppercase tracking-[0.15em] text-paper/40 px-3 pb-3">
          Mon espace
        </div>
        {monEspaceItems.map(item => (
          <NavItem
            key={item.to}
            item={item}
            mobile={mobile}
            onClose={onClose}
            badge={item.to === '/app/messages' ? unreadMsgCount : 0}
          />
        ))}

        {/* ── Gestion ── */}
        {gestionItems.length > 0 && (
          <>
            <div className="text-[10px] uppercase tracking-[0.15em] text-paper/40 px-3 pt-5 pb-3">
              Gestion
            </div>
            {gestionItems.map(item => (
              <NavItem
                key={item.to}
                item={item}
                mobile={mobile}
                onClose={onClose}
                badge={item.to === '/app/messages' ? unreadMsgCount : item.to === '/app/crm' ? crmBadgeCount : 0}
              />
            ))}
          </>
        )}

        {/* ── Administration — DG uniquement ── */}
        {(isDirector || isDemoMode) && (
          <>
            <div className="text-[10px] uppercase tracking-[0.15em] text-paper/40 px-3 pt-5 pb-3">
              Administration
            </div>
            <NavItem
              item={{ to: '/app/portfolio', label: 'Portfolio', icon: Globe }}
              mobile={mobile}
              onClose={onClose}
            />
            <NavItem
              item={{ to: '/app/users', label: 'Utilisateurs & Accès', icon: UserPlus }}
              mobile={mobile}
              onClose={onClose}
            />
            <NavItem
              item={{ to: '/app/donnees', label: 'Données', icon: Database }}
              mobile={mobile}
              onClose={onClose}
            />
          </>
        )}

      </nav>

      <div className="flex-1" />


      {/* Sélecteur de profil démo */}
      {isDemoMode && (
        <div className="mt-4 flex-shrink-0">
          <button
            onClick={() => setRolesOpen(!rolesOpen)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-electric/10 border border-electric/20 text-electric text-xs font-semibold"
          >
            <span>Mode démo — changer de profil</span>
            <ChevronDown
              size={14}
              className={`transition-transform ${rolesOpen ? 'rotate-180' : ''}`}
            />
          </button>

          <AnimatePresence>
            {rolesOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-1 flex flex-col gap-0.5">
                  {DEMO_ROLES.map(({ role, label, color }) => {
                    const isActive = profile?.role === role
                    return (
                      <button
                        key={role}
                        onClick={() => handleRoleSwitch(role)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors text-left ${
                          isActive
                            ? 'bg-white/10 text-paper font-semibold'
                            : 'text-paper/60 hover:bg-white/5 hover:text-paper'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />
                        {label}
                        {isActive && <span className="ml-auto text-electric text-[10px]">actif</span>}
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      </div>{/* end scrollable nav area */}

      {/* Profil */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-3 mt-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Avatar initials={initials} size={38} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">
              {profile?.full_name || 'Utilisateur'}
            </div>
            <div className="text-[11px] text-paper/50 truncate">
              {ROLE_LABELS[profile?.role] || 'Collaborateur'}
            </div>
          </div>
          <button
            onClick={onSignOut}
            className="text-paper/50 hover:text-paper transition-colors p-1"
            title="Déconnexion"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}
