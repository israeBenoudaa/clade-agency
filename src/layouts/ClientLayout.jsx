import { useState, useRef, useEffect, useMemo } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home, FileText, Wallet, MessageSquare, LogOut, Menu, X, Bell, ArrowLeft, Sparkles,
  Search, CheckCircle2, Layers, LayoutGrid, ChevronRight, Calendar,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { ClientLangProvider, useClientLang, CLIENT_LANGS } from '../context/ClientLangContext'
import { Avatar } from '../components/ui'
import { CladeBrand, CladeLogo } from '../components/ui/Logo'
import OnboardingGuide from '../components/OnboardingGuide'
import toast from 'react-hot-toast'

const CLIENT_NAV = [
  { to: '/client', key: 'nav.projects', icon: Home, end: true },
  { to: '/client/concept', key: 'nav.concept', icon: Sparkles },
  { to: '/client/rdvs', key: 'nav.rdvs', icon: Calendar },
  { to: '/client/livrables', key: 'nav.livrables', icon: FileText },
  { to: '/client/depenses', key: 'nav.expenses', icon: Wallet },
  { to: '/client/messages', key: 'nav.messages', icon: MessageSquare },
]

function useClientNotifications(profile, projects) {
  return useMemo(() => {
    const notifs = []
    if (!profile?.prospectId) return notifs

    const project = projects?.find(p =>
      p.prospectId === profile.prospectId
    )
    if (!project) return notifs

    if (project.concept?.images?.length > 0) {
      notifs.push({
        id: 'concept_images',
        icon: LayoutGrid,
        color: 'text-violet-600',
        bg: 'bg-violet-50',
        title: 'Moodboard disponible',
        desc: `${project.concept.images.length} image${project.concept.images.length > 1 ? 's' : ''} dans votre concept`,
        link: '/client/concept',
      })
    }
    if (project.programme?.statut === 'partage') {
      notifs.push({
        id: 'programme',
        icon: Layers,
        color: 'text-sky-600',
        bg: 'bg-sky-50',
        title: 'Programme architectural partagé',
        desc: 'La programmation de votre projet est disponible',
        link: '/client/concept',
      })
    }
    if (project.estimation?.statut === 'partage') {
      notifs.push({
        id: 'estimation',
        icon: CheckCircle2,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        title: 'Estimation budgétaire disponible',
        desc: 'Consultez le détail de votre estimation',
        link: '/client/concept',
      })
    }
    return notifs
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.prospectId, projects])
}

function NotificationsDropdown({ notifs, onClose, navigate, onMarkRead }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-border shadow-xl z-50 overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="font-semibold text-sm text-ink">Notifications</span>
        <button onClick={onClose} className="text-muted hover:text-ink">
          <X size={14} />
        </button>
      </div>
      {notifs.length === 0 ? (
        <div className="px-4 py-8 text-center text-muted text-sm">
          Aucune notification
        </div>
      ) : (
        <div className="divide-y divide-border/50 max-h-96 overflow-y-auto">
          {notifs.map(n => {
            const Icon = n.icon
            const unread = n.read === false
            return (
              <button
                key={n.id}
                onClick={() => { navigate(n.link); onMarkRead?.(); onClose() }}
                className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-paper-warm/60 transition-colors text-left ${unread ? 'bg-electric/5' : ''}`}
              >
                <div className={`w-8 h-8 rounded-xl ${n.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  <Icon size={14} className={n.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm leading-tight ${unread ? 'font-bold text-ink' : 'font-semibold text-ink/70'}`}>{n.title}</div>
                  <div className="text-xs text-muted mt-0.5 leading-snug">{n.desc}</div>
                </div>
                {unread
                  ? <span className="w-2 h-2 rounded-full bg-electric flex-shrink-0 mt-1.5" />
                  : <ChevronRight size={13} className="text-muted mt-1.5 flex-shrink-0" />
                }
              </button>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}

function SearchOverlay({ onClose, navigate }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)
  const { t } = useClientLang()

  const PAGES = [
    { label: t('nav.projects'), desc: 'Vue d\'ensemble de votre projet', link: '/client', keywords: 'projet accueil home projects overview' },
    { label: t('nav.concept'), desc: 'Moodboard, programme et estimation', link: '/client/concept', keywords: 'concept programme estimation moodboard images inspiration' },
    { label: t('nav.rdvs'), desc: 'Vos rendez-vous avec l\'équipe', link: '/client/rdvs', keywords: 'rdv rendez-vous réunion meeting calendar agenda' },
    { label: t('nav.livrables'), desc: 'Documents et plans livrés par l\'équipe', link: '/client/livrables', keywords: 'livrables documents plans fichiers documents files' },
    { label: t('nav.expenses'), desc: 'Suivi de vos dépenses et factures', link: '/client/depenses', keywords: 'dépenses factures budget finances expenses' },
    { label: t('nav.messages'), desc: 'Échangez avec l\'équipe CLADE', link: '/client/messages', keywords: 'messages messagerie communication équipe' },
  ]

  const results = query.trim().length < 1
    ? PAGES
    : PAGES.filter(p =>
        p.label.toLowerCase().includes(query.toLowerCase()) ||
        p.desc.toLowerCase().includes(query.toLowerCase()) ||
        p.keywords.toLowerCase().includes(query.toLowerCase())
      )

  useEffect(() => {
    inputRef.current?.focus()
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-start justify-center pt-20 px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: -16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16, scale: 0.97 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
          <Search size={16} className="text-muted flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('search.placeholder')}
            className="flex-1 text-sm text-ink outline-none placeholder-muted/50 bg-transparent"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-muted hover:text-ink">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="py-2 max-h-72 overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-muted text-sm">{t('search.no_results')}</div>
          ) : (
            results.map(r => (
              <button
                key={r.link}
                onClick={() => { navigate(r.link); onClose() }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-paper-warm/60 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-ink">{r.label}</div>
                  <div className="text-xs text-muted">{r.desc}</div>
                </div>
                <ChevronRight size={13} className="text-muted flex-shrink-0" />
              </button>
            ))
          )}
        </div>
        <div className="px-4 py-2.5 border-t border-border bg-paper-warm/30">
          <span className="text-[10px] text-muted">Press <kbd className="px-1 py-0.5 rounded bg-border/60 font-mono text-[10px]">Esc</kbd> {t('search.close')}</span>
        </div>
      </motion.div>
    </motion.div>
  )
}

function ClientLayoutInner() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const bellRef = useRef(null)
  const { profile, signOut, isDemoMode } = useAuth()
  const { projects, notifications, markNotificationsReadForTarget, supaLoaded } = useData()
  const { lang, setLang, t } = useClientLang()
  const navigate = useNavigate()

  // Track new livrables — count stored in localStorage, badge if count grew
  const livrableCount = useMemo(() => {
    if (!profile?.prospectId) return 0
    const clientProjects = projects.filter(p =>
      p.prospectId === profile.prospectId || p.clientId === profile.id
    )
    return clientProjects.reduce((s, p) => {
      const taskFiles = (p.tasks || []).reduce((ts, t) => ts + (t.files?.length || 0), 0)
      const missionFiles = (p.missions || []).filter(m => m.type === 'mission')
        .reduce((ms, m) => ms + (m.livrables?.files?.length || 0) + (m.livrables?.links?.length || 0), 0)
      const taskLinks = (p.tasks || []).reduce((ts, t) => ts + (t.links?.length || 0), 0)
      return s + taskFiles + missionFiles + taskLinks
    }, 0)
  }, [projects, profile])

  const livStorageKey = `clade_livrables_seen_${profile?.prospectId}`
  const seenCount = useMemo(() => {
    try { return parseInt(localStorage.getItem(livStorageKey) || '0', 10) } catch { return 0 }
  }, [livStorageKey])
  const hasNewLivrables = livrableCount > seenCount

  const markLivrablesRead = () => {
    try { localStorage.setItem(livStorageKey, String(livrableCount)) } catch {}
  }

  const projectNotifs = useClientNotifications(profile, projects)

  const msgNotifs = useMemo(() => {
    if (!profile?.prospectId) return []
    const targetId = `client:${profile.prospectId}`
    return notifications
      .filter(n => n.targetUserId === targetId && n.type === 'new_message')
      .slice(0, 8)
      .map(n => ({
        id: n.id,
        icon: MessageSquare,
        color: n.read ? 'text-muted' : 'text-electric',
        bg: n.read ? 'bg-paper-warm' : 'bg-electric/10',
        title: 'Nouveau message',
        desc: n.message,
        link: n.link || '/client/messages',
        read: n.read,
      }))
  }, [notifications, profile?.prospectId])

  const notifs = [...projectNotifs, ...msgNotifs]
  const unreadMsgCount = msgNotifs.filter(n => !n.read).length

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
      toast.success('Déconnecté')
    } catch (err) {
      toast.error('Erreur lors de la déconnexion')
    }
  }

  // Close bell dropdown on outside click
  useEffect(() => {
    if (!bellOpen) return
    const handle = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [bellOpen])

  const initials = profile
    ? `${profile.full_name?.[0] || ''}${profile.full_name?.split(' ')[1]?.[0] || ''}`.toUpperCase()
    : '??'

  if (!supaLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="animate-pulse">
          <CladeLogo size={56} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper bg-grid">
      {/* ===== BANNIÈRE DÉMO ===== */}
      {isDemoMode && (
        <div className="sticky top-0 z-50 bg-electric/10 border-b border-electric/20 px-4 py-2 flex items-center gap-3">
          <button
            onClick={() => navigate('/app')}
            className="flex items-center gap-1.5 text-xs font-semibold text-electric hover:text-electric/80 transition-colors"
          >
            <ArrowLeft size={13} />
            Retour Dashboard Staff
          </button>
          <span className="text-electric/40">·</span>
          <span className="text-xs text-electric/70">Mode démo — Vue Portail Client</span>
        </div>
      )}

      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-30 bg-paper/85 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center">
            <CladeBrand size="md" />
          </div>

          {/* Nav desktop */}
          <nav className="hidden lg:flex items-center gap-1">
            {CLIENT_NAV.map((item) => {
              const Icon = item.icon
              const isLivrables = item.to === '/client/livrables'
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={isLivrables ? markLivrablesRead : undefined}
                  className={({ isActive }) =>
                    `relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-colors ${
                      isActive
                        ? 'bg-ink text-paper font-semibold'
                        : 'text-muted hover:bg-paper-warm hover:text-ink'
                    }`
                  }
                >
                  <Icon size={15} />
                  {t(item.key)}
                  {isLivrables && hasNewLivrables && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
                  )}
                </NavLink>
              )
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">

            {/* Language switcher — desktop only */}
            <div className="hidden lg:flex items-center rounded-xl border border-border bg-white overflow-hidden">
              {CLIENT_LANGS.map((l, i) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`h-9 px-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                    lang === l
                      ? 'bg-ink text-white'
                      : 'text-muted hover:text-ink hover:bg-paper-warm'
                  } ${i > 0 ? 'border-l border-border' : ''}`}
                >
                  {l}
                </button>
              ))}
            </div>

            {/* Search button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="w-10 h-10 rounded-xl bg-white border border-border flex items-center justify-center hover:bg-paper-warm transition-colors"
              title="Rechercher"
            >
              <Search size={15} className="text-ink" />
            </button>

            {/* Bell */}
            <div className="relative" ref={bellRef}>
              <button
                onClick={() => setBellOpen(v => !v)}
                className="relative w-10 h-10 rounded-xl bg-white border border-border flex items-center justify-center hover:bg-paper-warm transition-colors"
                title="Notifications"
              >
                <Bell size={15} className="text-ink" />
                {notifs.length > 0 && (
                  unreadMsgCount > 0
                    ? <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-electric text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none ring-2 ring-white">
                        {unreadMsgCount > 9 ? '9+' : unreadMsgCount}
                      </span>
                    : <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-electric ring-2 ring-white" />
                )}
              </button>
              <AnimatePresence>
                {bellOpen && (
                  <NotificationsDropdown
                    notifs={notifs}
                    onClose={() => setBellOpen(false)}
                    navigate={navigate}
                    onMarkRead={() => markNotificationsReadForTarget(`client:${profile?.prospectId}`)}
                  />
                )}
              </AnimatePresence>
            </div>

            <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-border">
              <Avatar initials={initials} size={36} />
              <div className="hidden md:block">
                <div className="text-sm font-semibold text-ink leading-tight">
                  {profile?.full_name || 'Client'}
                </div>
                <button
                  onClick={handleSignOut}
                  className="text-xs text-muted hover:text-ink"
                >
                  Déconnexion
                </button>
              </div>
            </div>
            <button
              onClick={() => setMenuOpen(true)}
              className="lg:hidden w-10 h-10 rounded-xl bg-white border border-border flex items-center justify-center"
            >
              <Menu size={18} className="text-ink" />
            </button>
          </div>
        </div>
      </header>

      {/* ===== DRAWER MOBILE ===== */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="lg:hidden fixed inset-0 bg-ink/40 backdrop-blur-sm z-40"
            />
            <motion.aside
              initial={{ x: 300 }}
              animate={{ x: 0 }}
              exit={{ x: 300 }}
              transition={{ type: 'spring', damping: 25 }}
              className="lg:hidden fixed inset-y-0 right-0 z-50 w-72 bg-ink-deep text-paper p-6 flex flex-col"
            >
              <div className="flex justify-between items-center mb-8">
                <CladeBrand light size="sm" />
                <button onClick={() => setMenuOpen(false)}><X size={20} /></button>
              </div>
              <nav className="flex-1 flex flex-col gap-1">
                {CLIENT_NAV.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={() => setMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition ${
                          isActive ? 'bg-electric/15 font-semibold' : 'text-paper/70'
                        }`
                      }
                    >
                      <Icon size={18} />
                      {t(item.key)}
                    </NavLink>
                  )
                })}
              </nav>
              <div className="border-t border-white/10 pt-4 mt-4 space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar initials={initials} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{profile?.full_name}</div>
                    <div className="text-xs text-paper/50">{t('client')}</div>
                  </div>
                </div>
                {/* Language switcher in drawer */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5">
                  {CLIENT_LANGS.map(l => (
                    <button
                      key={l}
                      onClick={() => setLang(l)}
                      className={`flex-1 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors ${
                        lang === l ? 'bg-white text-ink' : 'text-paper/50 hover:text-paper'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 bg-white/5 py-2.5 rounded-xl text-sm"
                >
                  <LogOut size={15} /> {t('signout')}
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ===== SEARCH OVERLAY ===== */}
      <AnimatePresence>
        {searchOpen && (
          <SearchOverlay onClose={() => setSearchOpen(false)} navigate={navigate} />
        )}
      </AnimatePresence>

      {/* ===== PAGE CONTENT ===== */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-10">
        <Outlet />
      </main>

      {/* ===== BOTTOM NAV MOBILE ===== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border z-30">
        <div className="flex">
          {CLIENT_NAV.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center gap-1 py-3 text-[10px] ${
                    isActive ? 'text-ink font-semibold' : 'text-muted'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={20} strokeWidth={isActive ? 2.2 : 1.7} />
                    <span>{t(item.key)}</span>
                    {isActive && <span className="absolute top-0 w-8 h-0.5 bg-electric rounded-b" />}
                  </>
                )}
              </NavLink>
            )
          })}
        </div>
      </nav>

      {/* Spacer mobile pour la bottom-nav */}
      <div className="lg:hidden h-16" />

      <OnboardingGuide />
    </div>
  )
}

export default function ClientLayout() {
  return (
    <ClientLangProvider>
      <ClientLayoutInner />
    </ClientLangProvider>
  )
}
