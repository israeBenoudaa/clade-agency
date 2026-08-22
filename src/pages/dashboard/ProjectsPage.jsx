import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  Calendar, Plus, MapPin, Lock, Globe, ArrowRight, Trash2,
  Building2, FolderGit2, Target, X, CheckCircle, ChevronDown, Search, Filter, UserCircle,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { ProgressBar } from '../../components/ui'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import NouveauProjetModal from '../../components/NouveauProjetModal'
import toast from 'react-hot-toast'

// ─── Statut config for external projects ─────────────────────────────────────
const STATUT_STYLES = {
  'En cours':        { bg: 'bg-electric/10',  text: 'text-electric',     dot: 'bg-electric' },
  'Projet livré':    { bg: 'bg-emerald-100',   text: 'text-emerald-700',  dot: 'bg-emerald-500' },
  'Projet suspendu': { bg: 'bg-amber-100',     text: 'text-amber-700',    dot: 'bg-amber-500' },
}
const ALL_STATUTS = ['En cours', 'Projet livré', 'Projet suspendu']

function ProjetStatutBadge({ statut }) {
  const s = STATUT_STYLES[statut] || STATUT_STYLES['En cours']
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {statut || 'En cours'}
    </span>
  )
}

function StatutDropdown({ statut, projectId, onUpdate }) {
  const [open, setOpen] = useState(false)
  const [dropPos, setDropPos] = useState(null)
  const btnRef = useRef(null)
  const s = STATUT_STYLES[statut] || STATUT_STYLES['En cours']

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close) }
  }, [open])

  const handleOpen = (e) => {
    e.stopPropagation()
    if (!open) {
      const rect = btnRef.current?.getBoundingClientRect()
      if (rect) setDropPos({ top: rect.bottom + 4, left: rect.left })
    }
    setOpen(v => !v)
  }

  const dropdown = open && dropPos && createPortal(
    <>
      <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
      <div className="fixed z-[9999] bg-white border border-border rounded-xl shadow-2xl overflow-hidden min-w-[170px]"
        style={{ top: dropPos.top, left: dropPos.left }}>
        {ALL_STATUTS.map(sv => {
          const ss = STATUT_STYLES[sv]
          return (
            <button key={sv} onClick={() => { onUpdate(projectId, { statut: sv }); setOpen(false) }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-paper-warm transition-colors text-left ${statut === sv ? 'font-semibold bg-paper-warm' : ''}`}>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ss.dot}`} />
              <span className={ss.text}>{sv}</span>
              {statut === sv && <CheckCircle size={10} className="ml-auto text-emerald-500" />}
            </button>
          )
        })}
      </div>
    </>,
    document.body
  )

  return (
    <div onClick={e => e.stopPropagation()}>
      <button
        ref={btnRef}
        onClick={handleOpen}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide ${s.bg} ${s.text} hover:opacity-80 transition-opacity`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
        {statut || 'En cours'}
        <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {dropdown}
    </div>
  )
}

// ─── Nouveau Projet Interne Modal ─────────────────────────────────────────────
function NouveauProjetInterneModal({ onClose }) {
  const { addProject, employes } = useData()
  const [form, setForm] = useState({ nom: '', description: '', objectif: '', architecteReferentId: '' })
  const [errors, setErrors] = useState({})

  const set = (key) => (e) => {
    setForm(f => ({ ...f, [key]: e.target.value }))
    if (errors[key]) setErrors(er => ({ ...er, [key]: null }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.nom.trim()) errs.nom = 'Le nom est requis'
    if (Object.keys(errs).length) { setErrors(errs); return }

    const archRef = employes.find(e => String(e.id) === form.architecteReferentId)
    addProject({
      nom: form.nom.trim(),
      description: form.description.trim(),
      objectif: form.objectif.trim(),
      typeProjet: 'interne',
      statut: 'En cours',
      missions: [],
      tasks: [],
      avancement: 0,
      client: '—',
      architecteReferentId: archRef?.id || null,
      architecteReferentNom: archRef?.nom || '',
    })
    toast.success(`Projet interne "${form.nom.trim()}" créé`)
    onClose()
  }

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm z-50"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-border flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
                <FolderGit2 size={16} className="text-violet-600" />
              </div>
              <div>
                <div className="font-semibold text-ink">Nouveau projet interne</div>
                <div className="text-xs text-muted">Projet R&amp;D, outil ou initiative interne</div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-paper-warm flex items-center justify-center text-muted hover:text-ink transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {/* Nom */}
            <div>
              <label className="label-text mb-1.5 block">Nom du projet *</label>
              <input
                className={`input-field w-full ${errors.nom ? 'border-rose-400' : ''}`}
                placeholder="Site vitrine, outil interne..."
                value={form.nom}
                onChange={set('nom')}
              />
              {errors.nom && <p className="text-xs text-rose-500 mt-1">{errors.nom}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="label-text mb-1.5 block">Description</label>
              <textarea
                rows={2}
                className="input-field w-full resize-none"
                placeholder="Décris brièvement ce projet..."
                value={form.description}
                onChange={set('description')}
              />
            </div>

            {/* Objectif */}
            <div>
              <label className="label-text mb-1.5 flex items-center gap-1">
                <Target size={11} /> Objectif
              </label>
              <input
                className="input-field w-full"
                placeholder="Améliorer le workflow, automatiser X..."
                value={form.objectif}
                onChange={set('objectif')}
              />
            </div>

            {/* Référent */}
            <div>
              <label className="label-text mb-1.5 flex items-center gap-1">
                <UserCircle size={11} /> Personnel référent
              </label>
              <select
                className="input-field w-full"
                value={form.architecteReferentId}
                onChange={set('architecteReferentId')}
              >
                <option value="">— Aucun référent —</option>
                {employes.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.nom}{e.isDirecteur ? ' — Directeur Général' : e.poste ? ` — ${e.poste}` : ''}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-muted mt-1">Responsable principal du projet interne</p>
            </div>
          </form>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border flex gap-3 flex-shrink-0 bg-paper/50">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 justify-center flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <CheckCircle size={15} />
              Créer le projet
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProjectsPage() {
  const { projects, deleteProject, updateProject } = useData()
  const { profile } = useAuth()
  const byName = profile?.nom || profile?.full_name || ''
  const [showModal, setShowModal] = useState(false)
  const [showInterneModal, setShowInterneModal] = useState(false)
  const [activeTab, setActiveTab] = useState('externe')
  const [statusFilter, setStatusFilter] = useState('Tous')
  const [statusFilterInterne, setStatusFilterInterne] = useState('Tous')
  const [search, setSearch] = useState('')
  const [searchInterne, setSearchInterne] = useState('')
  const [showExtFilterMenu, setShowExtFilterMenu] = useState(false)
  const [showIntFilterMenu, setShowIntFilterMenu] = useState(false)
  const navigate = useNavigate()

  const externalProjects = projects.filter(p => p.typeProjet !== 'interne')
  const filteredExternal = externalProjects
    .filter(p => statusFilter === 'Tous' || (p.statut || 'En cours') === statusFilter)
    .filter(p => !search.trim() || p.nom?.toLowerCase().includes(search.toLowerCase()) || p.client?.toLowerCase().includes(search.toLowerCase()))
  const internalProjects = projects.filter(p => p.typeProjet === 'interne')
  const filteredInternal = internalProjects
    .filter(p => statusFilterInterne === 'Tous' || (p.statut || 'En cours') === statusFilterInterne)
    .filter(p => !searchInterne.trim() || p.nom?.toLowerCase().includes(searchInterne.toLowerCase()))

  const handleDelete = (e, p) => {
    e.stopPropagation()
    toast((t) => (
      <div className="flex items-center gap-3">
        <span className="text-sm">Supprimer <strong>{p.nom}</strong> ?</span>
        <button
          onClick={() => { deleteProject(p.id, byName); toast.dismiss(t.id); toast.success('Projet supprimé') }}
          className="text-xs bg-rose-500 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-rose-600"
        >
          Supprimer
        </button>
        <button onClick={() => toast.dismiss(t.id)} className="text-xs text-muted hover:text-ink">
          Annuler
        </button>
      </div>
    ), { duration: 6000 })
  }

  return (
    <div className="p-4 lg:p-10">

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setActiveTab('externe')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'externe'
              ? 'bg-ink text-paper shadow-sm'
              : 'text-muted hover:text-ink hover:bg-paper-warm'
          }`}
        >
          <Building2 size={15} />
          Projets externes
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
            activeTab === 'externe' ? 'bg-white/20 text-white' : 'bg-border text-muted'
          }`}>
            {externalProjects.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('interne')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'interne'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-muted hover:text-ink hover:bg-paper-warm'
          }`}
        >
          <FolderGit2 size={15} />
          Projets internes
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
            activeTab === 'interne' ? 'bg-white/20 text-white' : 'bg-border text-muted'
          }`}>
            {internalProjects.length}
          </span>
        </button>
      </div>

      {/* ── External projects tab ─────────────────────────────────────────── */}
      {activeTab === 'externe' && (
        <div className="card p-5 lg:p-7">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-5">
            {/* Mobile: filter icon + search + button on one line */}
            <div className="flex lg:hidden items-center gap-2">
              {/* Filter icon dropdown */}
              <div className="relative">
                {showExtFilterMenu && (
                  <div className="fixed inset-0 z-10" onClick={() => setShowExtFilterMenu(false)} />
                )}
                <button
                  onClick={() => setShowExtFilterMenu(o => !o)}
                  className={`flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold border transition-all flex-shrink-0 ${
                    statusFilter !== 'Tous'
                      ? 'bg-ink text-paper border-transparent'
                      : 'bg-paper-warm border-border text-muted hover:text-ink'
                  }`}
                >
                  <Filter size={13} />
                  {statusFilter !== 'Tous' && <span className="max-w-[64px] truncate">{statusFilter}</span>}
                </button>
                <AnimatePresence>
                  {showExtFilterMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.96 }}
                      transition={{ duration: 0.13 }}
                      className="absolute top-full left-0 mt-1.5 bg-white border border-border rounded-2xl shadow-xl overflow-hidden z-20 w-44"
                    >
                      {['Tous', ...ALL_STATUTS].map(s => {
                        const ss = s !== 'Tous' ? STATUT_STYLES[s] : null
                        return (
                          <button
                            key={s}
                            onClick={() => { setStatusFilter(s); setShowExtFilterMenu(false) }}
                            className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                              statusFilter === s ? 'bg-paper-warm font-semibold text-ink' : 'text-muted hover:bg-paper-warm/60 hover:text-ink'
                            }`}
                          >
                            {ss && <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ss.dot}`} />}
                            <span className="flex-1 text-left">{s}</span>
                            {s !== 'Tous' && (
                              <span className="text-[10px] text-muted">
                                {externalProjects.filter(p => (p.statut || 'En cours') === s).length}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {/* Search */}
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher…"
                  className="w-full pl-8 pr-3 py-2 text-sm bg-paper-warm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-electric/30 transition-all"
                />
              </div>
              <button onClick={() => setShowModal(true)} className="btn-primary flex-shrink-0 !px-2.5">
                <Plus size={15} />
              </button>
            </div>
            {/* Desktop: chips left, search+button right */}
            <div className="hidden lg:flex items-center gap-2 flex-wrap flex-1">
              {['Tous', ...ALL_STATUTS].map(s => {
                const ss = s !== 'Tous' ? STATUT_STYLES[s] : null
                const isActive = statusFilter === s
                return (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      isActive
                        ? s === 'Tous' ? 'bg-ink text-paper' : `${ss.bg} ${ss.text} ring-2 ring-current/30`
                        : 'bg-paper-warm text-muted hover:text-ink hover:bg-white border border-border'
                    }`}
                  >
                    {ss && <span className={`w-1.5 h-1.5 rounded-full ${ss.dot}`} />}
                    {s}
                    {s !== 'Tous' && (
                      <span className="text-[10px] opacity-70">
                        {externalProjects.filter(p => (p.statut || 'En cours') === s).length}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher…"
                  className="w-44 pl-9 pr-3 py-2 text-sm bg-paper-warm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-electric/30 focus:border-electric/50 transition-all"
                />
              </div>
              <button onClick={() => setShowModal(true)} className="btn-primary flex-shrink-0">
                <Plus size={15} /> Nouveau projet
              </button>
            </div>
          </div>

          {/* Desktop : table */}
          <div className="hidden lg:block space-y-3">
            {filteredExternal.map((p, i) => {
              const missionsList = (p.missions || []).filter(m => m.type === 'mission')
              const curMission = missionsList.find(m => m.statut !== 'valide')
              const missionLabel = curMission?.nom ?? (missionsList.length > 0 ? 'Terminé' : `Phase ${p.phase}`)
              const missionFinDate = curMission?.fin
                ? new Date(curMission.fin).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : p.deadline
              const totalTasks = (p.tasks || []).length
              const doneTasks = (p.tasks || []).filter(t => t.statut === 'Done').length
              return (
                <div
                  key={p.id}
                  onClick={() => navigate(`/app/projects/${p.id}`)}
                  className="grid grid-cols-[3fr_2.5fr_140px_130px_160px_auto_auto] gap-4 items-center p-4 bg-paper-warm rounded-xl hover:bg-white hover:shadow-md transition-all cursor-pointer animate-slide-up"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold text-ink truncate">{p.nom}</div>
                      {p.maitrise && (
                        <span className="flex-shrink-0">
                          {p.maitrise === 'public'
                            ? <Globe size={12} className="text-electric" />
                            : <Lock size={12} className="text-muted" />}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted mt-0.5">
                      <span className="truncate">{p.client}</span>
                      {p.localisation && p.localisation !== '—' && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1 flex-shrink-0">
                            <MapPin size={11} /> {p.localisation}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted truncate">{missionLabel}</span>
                      <span className="font-semibold text-ink ml-2 flex-shrink-0">{p.avancement}%</span>
                    </div>
                    <ProgressBar value={p.avancement} />
                  </div>
                  <StatutDropdown statut={p.statut || 'En cours'} projectId={p.id} onUpdate={updateProject} />
                  <div className="text-xs text-ink font-semibold whitespace-nowrap">
                    {totalTasks === 0 ? (
                      <span className="text-muted font-normal">—</span>
                    ) : (
                      <>
                        <span className="text-emerald-600">{doneTasks}</span>
                        <span className="text-muted font-normal"> / {totalTasks} tâche{totalTasks !== 1 ? 's' : ''}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted whitespace-nowrap">
                    <Calendar size={12} /> {missionFinDate}
                  </div>
                  <ArrowRight size={16} className="text-muted" />
                  <button
                    onClick={(e) => handleDelete(e, p)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-rose-500 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
            {filteredExternal.length === 0 && (
              <div className="text-center py-16 text-muted text-sm">
                {search.trim() ? `Aucun résultat pour "${search}".` : statusFilter !== 'Tous' ? `Aucun projet avec le statut "${statusFilter}".` : 'Aucun projet externe pour l\'instant.'}
              </div>
            )}
          </div>

          {/* Mobile : cards */}
          <div className="lg:hidden space-y-3">
            {filteredExternal.map((p, i) => {
              const missionsList = (p.missions || []).filter(m => m.type === 'mission')
              const curMission = missionsList.find(m => m.statut !== 'valide')
              const missionLabel = curMission?.nom ?? (missionsList.length > 0 ? 'Terminé' : `Phase ${p.phase}`)
              const finLabel = curMission?.fin
                ? new Date(curMission.fin).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
                : String(p.deadline).split(' ').slice(0, 2).join(' ')
              const totalTasks = (p.tasks || []).length
              const doneTasks = (p.tasks || []).filter(t => t.statut === 'Done').length
              return (
                <div
                  key={p.id}
                  onClick={() => navigate(`/app/projects/${p.id}`)}
                  className="bg-paper-warm rounded-2xl p-4 animate-slide-up cursor-pointer hover:bg-white hover:shadow-md transition-all"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <div className="text-sm font-semibold text-ink">{p.nom}</div>
                        {p.maitrise === 'public'
                          ? <Globe size={11} className="text-electric flex-shrink-0" />
                          : <Lock size={11} className="text-muted flex-shrink-0" />}
                      </div>
                      <div className="text-xs text-muted mt-0.5">{p.client}</div>
                    </div>
                    <StatutDropdown statut={p.statut || 'En cours'} projectId={p.id} onUpdate={updateProject} />
                  </div>
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted truncate">{missionLabel}</span>
                      <span className="font-semibold text-ink ml-2">{p.avancement}%</span>
                    </div>
                    <ProgressBar value={p.avancement} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs pt-3 border-t border-border">
                    <div>
                      <div className="text-muted text-[10px]">Surface</div>
                      <div className="text-ink font-semibold">{p.surface}</div>
                    </div>
                    <div>
                      <div className="text-muted text-[10px]">Tâches réalisées</div>
                      <div className="text-ink font-semibold">
                        {totalTasks === 0 ? '—' : <><span className="text-emerald-600">{doneTasks}</span>/{totalTasks}</>}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted text-[10px]">Fin mission</div>
                      <div className="text-ink font-semibold">{finLabel}</div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, p)}
                    className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-rose-500 border border-rose-200 rounded-xl py-2 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 size={12} /> Supprimer
                  </button>
                </div>
              )
            })}
            {filteredExternal.length === 0 && (
              <div className="text-center py-12 text-muted text-sm">
                {search.trim() ? `Aucun résultat pour "${search}".` : statusFilter !== 'Tous' ? `Aucun projet avec le statut "${statusFilter}".` : 'Aucun projet externe pour l\'instant.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Internal projects tab ─────────────────────────────────────────── */}
      {activeTab === 'interne' && (
        <div className="card p-5 lg:p-7">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-5">
            {/* Mobile: filter icon + search + button on one line */}
            <div className="flex lg:hidden items-center gap-2">
              <div className="relative">
                {showIntFilterMenu && (
                  <div className="fixed inset-0 z-10" onClick={() => setShowIntFilterMenu(false)} />
                )}
                <button
                  onClick={() => setShowIntFilterMenu(o => !o)}
                  className={`flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold border transition-all flex-shrink-0 ${
                    statusFilterInterne !== 'Tous'
                      ? 'bg-violet-600 text-white border-transparent'
                      : 'bg-paper-warm border-border text-muted hover:text-ink'
                  }`}
                >
                  <Filter size={13} />
                  {statusFilterInterne !== 'Tous' && <span className="max-w-[64px] truncate">{statusFilterInterne}</span>}
                </button>
                <AnimatePresence>
                  {showIntFilterMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.96 }}
                      transition={{ duration: 0.13 }}
                      className="absolute top-full left-0 mt-1.5 bg-white border border-border rounded-2xl shadow-xl overflow-hidden z-20 w-44"
                    >
                      {['Tous', ...ALL_STATUTS].map(s => {
                        const ss = s !== 'Tous' ? STATUT_STYLES[s] : null
                        return (
                          <button
                            key={s}
                            onClick={() => { setStatusFilterInterne(s); setShowIntFilterMenu(false) }}
                            className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                              statusFilterInterne === s ? 'bg-paper-warm font-semibold text-ink' : 'text-muted hover:bg-paper-warm/60 hover:text-ink'
                            }`}
                          >
                            {ss && <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ss.dot}`} />}
                            <span className="flex-1 text-left">{s}</span>
                            {s !== 'Tous' && (
                              <span className="text-[10px] text-muted">
                                {internalProjects.filter(p => (p.statut || 'En cours') === s).length}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input
                  value={searchInterne}
                  onChange={e => setSearchInterne(e.target.value)}
                  placeholder="Rechercher…"
                  className="w-full pl-8 pr-3 py-2 text-sm bg-paper-warm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400/30 transition-all"
                />
              </div>
              <button
                onClick={() => setShowInterneModal(true)}
                className="flex items-center justify-center w-9 h-9 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm flex-shrink-0"
              >
                <Plus size={15} />
              </button>
            </div>
            {/* Desktop: chips left, search+button right */}
            <div className="hidden lg:flex items-center gap-2 flex-wrap flex-1">
              {['Tous', ...ALL_STATUTS].map(s => {
                const ss = s !== 'Tous' ? STATUT_STYLES[s] : null
                const isActive = statusFilterInterne === s
                return (
                  <button
                    key={s}
                    onClick={() => setStatusFilterInterne(s)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      isActive
                        ? s === 'Tous' ? 'bg-violet-600 text-white' : `${ss.bg} ${ss.text} ring-2 ring-current/30`
                        : 'bg-paper-warm text-muted hover:text-ink hover:bg-white border border-border'
                    }`}
                  >
                    {ss && <span className={`w-1.5 h-1.5 rounded-full ${ss.dot}`} />}
                    {s}
                    {s !== 'Tous' && (
                      <span className="text-[10px] opacity-70">
                        {internalProjects.filter(p => (p.statut || 'En cours') === s).length}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input
                  value={searchInterne}
                  onChange={e => setSearchInterne(e.target.value)}
                  placeholder="Rechercher…"
                  className="w-44 pl-9 pr-3 py-2 text-sm bg-paper-warm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400/50 transition-all"
                />
              </div>
              <button
                onClick={() => setShowInterneModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm flex-shrink-0"
              >
                <Plus size={15} /> Nouveau projet
              </button>
            </div>
          </div>

          {internalProjects.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-4">
                <FolderGit2 size={24} className="text-violet-500" />
              </div>
              <div className="font-semibold text-ink mb-1">Aucun projet interne</div>
              <div className="text-sm text-muted mb-5">Créez un premier projet interne pour l'agence.</div>
              <button
                onClick={() => setShowInterneModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                <Plus size={14} /> Créer un projet interne
              </button>
            </div>
          ) : (
            <>
              {/* Desktop : table */}
              <div className="hidden lg:block space-y-3">
                {filteredInternal.map((p, i) => {
                  const taskCount = (p.tasks || []).length
                  const doneTasks = (p.tasks || []).filter(t => t.statut === 'Done').length
                  return (
                    <div
                      key={p.id}
                      onClick={() => navigate(`/app/projects/${p.id}`)}
                      className="grid grid-cols-[3fr_2.5fr_160px_130px_auto_auto] gap-4 items-center p-4 bg-paper-warm rounded-xl hover:bg-white hover:shadow-md transition-all cursor-pointer animate-slide-up"
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                            <FolderGit2 size={13} className="text-violet-600" />
                          </div>
                          <div className="text-sm font-semibold text-ink truncate">{p.nom}</div>
                        </div>
                        {p.objectif && (
                          <div className="flex items-center gap-1.5 text-xs text-muted mt-0.5 pl-9">
                            <Target size={10} className="text-violet-400 flex-shrink-0" />
                            <span className="truncate">{p.objectif}</span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-muted truncate">{p.description ? p.description.slice(0, 40) + (p.description.length > 40 ? '…' : '') : '—'}</span>
                          <span className="font-semibold text-ink ml-2 flex-shrink-0">{p.avancement}%</span>
                        </div>
                        <ProgressBar value={p.avancement} color="#7C3AED" />
                      </div>
                      <StatutDropdown statut={p.statut || 'En cours'} projectId={p.id} onUpdate={updateProject} />
                      <div className="text-xs text-ink font-semibold whitespace-nowrap">
                        {taskCount === 0 ? (
                          <span className="text-muted font-normal">—</span>
                        ) : (
                          <>
                            <span className="text-emerald-600">{doneTasks}</span>
                            <span className="text-muted font-normal"> / {taskCount} tâche{taskCount !== 1 ? 's' : ''}</span>
                          </>
                        )}
                      </div>
                      <ArrowRight size={16} className="text-muted" />
                      <button
                        onClick={(e) => handleDelete(e, p)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-rose-500 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )
                })}
                {filteredInternal.length === 0 && (
                  <div className="text-center py-16 text-muted text-sm">
                    {searchInterne.trim() ? `Aucun résultat pour "${searchInterne}".` : 'Aucun projet interne avec ce statut.'}
                  </div>
                )}
              </div>

              {/* Mobile : cards */}
              <div className="lg:hidden space-y-3">
                {filteredInternal.map((p, i) => {
                  const taskCount = (p.tasks || []).length
                  const doneTasks = (p.tasks || []).filter(t => t.statut === 'Done').length
                  return (
                    <div
                      key={p.id}
                      onClick={() => navigate(`/app/projects/${p.id}`)}
                      className="bg-paper-warm rounded-2xl p-4 animate-slide-up cursor-pointer hover:bg-white hover:shadow-md transition-all"
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                            <FolderGit2 size={14} className="text-violet-600" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-ink truncate">{p.nom}</div>
                            {p.objectif && <div className="text-xs text-muted truncate mt-0.5">{p.objectif}</div>}
                          </div>
                        </div>
                        <StatutDropdown statut={p.statut || 'En cours'} projectId={p.id} onUpdate={updateProject} />
                      </div>
                      <div className="mb-3">
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-muted truncate">{p.description ? p.description.slice(0, 35) + (p.description.length > 35 ? '…' : '') : 'Avancement'}</span>
                          <span className="font-semibold text-ink ml-2">{p.avancement}%</span>
                        </div>
                        <ProgressBar value={p.avancement} color="#7C3AED" />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-border">
                        <div>
                          <div className="text-muted text-[10px]">Tâches réalisées</div>
                          <div className="text-ink font-semibold">
                            {taskCount === 0 ? '—' : <><span className="text-emerald-600">{doneTasks}</span>/{taskCount}</>}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted text-[10px]">Avancement</div>
                          <div className="text-violet-600 font-semibold">{p.avancement}%</div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDelete(e, p)}
                        className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-rose-500 border border-rose-200 rounded-xl py-2 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 size={12} /> Supprimer
                      </button>
                    </div>
                  )
                })}
                {filteredInternal.length === 0 && (
                  <div className="text-center py-12 text-muted text-sm">
                    {searchInterne.trim() ? `Aucun résultat pour "${searchInterne}".` : 'Aucun projet interne avec ce statut.'}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      {showModal && <NouveauProjetModal onClose={() => setShowModal(false)} />}
      {showInterneModal && <NouveauProjetInterneModal onClose={() => setShowInterneModal(false)} />}
    </div>
  )
}
