import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import {
  Calendar, MapPin, Lock, Globe, ArrowRight, CheckCircle, ChevronDown,
  Building2, FolderGit2, Target, Briefcase, Users, Flag, X,
  BadgeCheck, AlertCircle, Loader, Clock, CheckCircle2,
  Paperclip, Link2, Pencil, Trash2, ExternalLink, Plus, Filter, Search,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { ProgressBar } from '../../components/ui'
import LivrableModal from '../../components/LivrableModal'
import toast from 'react-hot-toast'

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const fmtDate  = d => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
const fmtShort = d => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : '—'
const daysDiff = (a, b) => Math.round((b - a) / 86400000)

const STATUT_STYLES = {
  'En cours':        { bg: 'bg-electric/10', text: 'text-electric',    dot: 'bg-electric' },
  'Projet livré':    { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'Projet suspendu': { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500' },
}
const ALL_STATUTS = ['En cours', 'Projet livré', 'Projet suspendu']

const TASK_STAT = {
  'Done':          { label: 'Terminé',     Icon: CheckCircle2, cls: 'text-emerald-600' },
  'Working on it': { label: 'En cours',    Icon: Loader,       cls: 'text-amber-600' },
  'Stuck':         { label: 'Bloqué',      Icon: AlertCircle,  cls: 'text-rose-600' },
  'Not Started':   { label: 'Non démarré', Icon: Clock,        cls: 'text-muted' },
}

/* ─── Statut dropdown (copié de ProjectsPage) ─────────────────────────────── */
function StatutDropdown({ statut, projectId, onUpdate }) {
  const [open, setOpen] = useState(false)
  const [dropPos, setDropPos] = useState(null)
  const [ref, setRef] = useState(null)
  const s = STATUT_STYLES[statut] || STATUT_STYLES['En cours']

  const handleOpen = (e) => {
    e.stopPropagation()
    if (!open && ref) {
      const rect = ref.getBoundingClientRect()
      setDropPos({ top: rect.bottom + 4, left: rect.left })
    }
    setOpen(v => !v)
  }

  return (
    <div onClick={e => e.stopPropagation()}>
      <button ref={setRef} onClick={handleOpen}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide ${s.bg} ${s.text} hover:opacity-80 transition-opacity`}>
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
        {statut || 'En cours'}
        <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && dropPos && createPortal(
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
      )}
    </div>
  )
}

/* ─── Mini Gantt read-only ──────────────────────────────────────────────────── */
function GanttReadOnly({ missions }) {
  const gantt = useMemo(() => {
    const dates = missions.flatMap(m => [m.debut, m.fin, m.date].filter(Boolean)).map(d => new Date(d))
    if (!dates.length) {
      const now = new Date()
      return { start: new Date(now.getTime() - 30 * 86400000), end: new Date(now.getTime() + 150 * 86400000), days: 180 }
    }
    const min = new Date(Math.min(...dates))
    const max = new Date(Math.max(...dates))
    const start = new Date(min.getTime() - 14 * 86400000)
    const end   = new Date(max.getTime() + 14 * 86400000)
    return { start, end, days: daysDiff(start, end) }
  }, [missions])

  const toLeft  = d => Math.max(0, Math.min(100, (daysDiff(gantt.start, new Date(d)) / gantt.days) * 100))
  const toWidth = (s, e) => Math.max(0.8, (daysDiff(new Date(s), new Date(e)) / gantt.days) * 100)

  const months = useMemo(() => {
    const labels = []
    const c = new Date(gantt.start); c.setDate(1)
    while (c <= gantt.end) {
      labels.push({ left: toLeft(c), label: c.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }) })
      c.setMonth(c.getMonth() + 1)
    }
    return labels
  }, [gantt])

  const todayLeft = toLeft(new Date())
  const showToday = todayLeft > 0 && todayLeft < 100
  const rowMissions  = missions.filter(m => m.type === 'mission')
  const rowDeadlines = missions.filter(m => m.type === 'deadline')
  const rowRdv       = missions.filter(m => m.type === 'rdv')
  const currentMissionId = rowMissions.find(m => m.statut !== 'valide')?.id

  if (missions.length === 0) return <div className="text-center py-8 text-sm text-muted">Aucun élément de planning.</div>

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        <div className="grid mb-2" style={{ gridTemplateColumns: '180px 1fr' }}>
          <div className="text-[10px] text-muted font-semibold uppercase tracking-wide px-2">Élément</div>
          <div className="relative h-5">
            {months.map((m, i) => (
              <span key={i} className="absolute text-[10px] text-muted font-medium whitespace-nowrap"
                style={{ left: `${m.left}%`, transform: 'translateX(-50%)' }}>{m.label}</span>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          {rowMissions.map(m => {
            const isValide  = m.statut === 'valide'
            const isCurrent = m.id === currentMissionId
            return (
              <div key={m.id} className="grid items-center gap-2" style={{ gridTemplateColumns: '180px 1fr' }}>
                <div className="pr-2 flex items-center gap-1.5">
                  {isValide  && <BadgeCheck size={11} className="text-emerald-500 flex-shrink-0" />}
                  {isCurrent && !isValide && <span className="w-1.5 h-1.5 rounded-full bg-electric flex-shrink-0 animate-pulse" />}
                  <span className={`text-xs truncate ${isValide ? 'text-emerald-600 line-through opacity-70' : isCurrent ? 'text-electric font-semibold' : 'text-ink'}`}>{m.nom}</span>
                </div>
                <div className="relative h-8 bg-paper-warm rounded-lg">
                  {showToday && <div className="absolute top-0 bottom-0 w-px bg-electric/40 z-10" style={{ left: `${todayLeft}%` }} />}
                  <div className="absolute top-1 bottom-1 rounded flex items-center px-2 text-white text-[10px] font-semibold overflow-hidden shadow-sm"
                    style={{ left: `${toLeft(m.debut)}%`, width: `${toWidth(m.debut, m.fin)}%`, background: isValide ? 'linear-gradient(90deg,#10B981,#10B98199)' : `linear-gradient(90deg,${m.couleur||'#3B7BF6'},${(m.couleur||'#3B7BF6')}cc)`, opacity: isValide ? 0.7 : 1 }}>
                    <span className="truncate">{fmtShort(m.debut)} → {fmtShort(m.fin)}</span>
                  </div>
                </div>
              </div>
            )
          })}
          {rowDeadlines.map(m => (
            <div key={m.id} className="grid items-center gap-2" style={{ gridTemplateColumns: '180px 1fr' }}>
              <div className="pr-2 flex items-center gap-1.5">
                <Flag size={11} className="text-rose-500 flex-shrink-0" />
                <span className="text-xs text-rose-600 font-semibold truncate">{m.nom}</span>
              </div>
              <div className="relative h-8 bg-paper-warm rounded-lg">
                <div className="absolute top-0 bottom-0 flex flex-col items-center" style={{ left: `${toLeft(m.date)}%`, transform: 'translateX(-50%)' }}>
                  <div className="w-px flex-1" style={{ borderLeft: '2px dashed #F43F5E' }} />
                  <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1 rounded whitespace-nowrap">{fmtShort(m.date)}</span>
                </div>
              </div>
            </div>
          ))}
          {rowRdv.map(m => (
            <div key={m.id} className="grid items-center gap-2" style={{ gridTemplateColumns: '180px 1fr' }}>
              <div className="pr-2 flex items-center gap-1.5">
                <Calendar size={11} className="text-violet-500 flex-shrink-0" />
                <span className="text-xs text-ink truncate">{m.nom}</span>
              </div>
              <div className="relative h-8 bg-paper-warm rounded-lg">
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5" style={{ left: `${toLeft(m.date)}%` }}>
                  <div className="w-3 h-3 rotate-45 border-2 border-violet-500" style={{ background: '#8B5CF620' }} />
                  <span className="text-[9px] text-violet-600 font-bold whitespace-nowrap">{fmtShort(m.date)}</span>
                </div>
              </div>
            </div>
          ))}
          {showToday && (
            <div className="grid gap-2 mt-1" style={{ gridTemplateColumns: '180px 1fr' }}>
              <div />
              <div className="relative h-4">
                <div className="absolute flex items-center gap-1" style={{ left: `${todayLeft}%`, transform: 'translateX(-50%)' }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-electric" />
                  <span className="text-[10px] text-electric font-semibold whitespace-nowrap">Aujourd'hui</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Modal vue personnel read-only ────────────────────────────────────────── */
function PersonnelModal({ project, myId, myNom, onClose }) {
  const { addLivrable, updateLivrable, deleteLivrable } = useData()
  const [tab, setTab] = useState('gantt')
  const [livrableModal, setLivrableModal] = useState(null) // null | 'new' | livrable object
  const myTasks  = (project.tasks || []).filter(t => String(t.personnelId) === String(myId))
  const deadlines = (project.missions || []).filter(m => m.type === 'deadline').sort((a, b) => new Date(a.date) - new Date(b.date))
  const rdvs      = (project.missions || []).filter(m => m.type === 'rdv').sort((a, b) => new Date(a.date) - new Date(b.date))
  const livrables = (project.livrables || [])
  const cfg = STATUT_STYLES[project.statut] || STATUT_STYLES['En cours']

  const tabs = [
    { id: 'gantt',     label: 'Gantt' },
    { id: 'deadlines', label: `Deadlines (${deadlines.length})` },
    { id: 'rdv',       label: `RDV (${rdvs.length})` },
    { id: 'mestaches', label: `Mes tâches (${myTasks.length})` },
    { id: 'livrables', label: `Livrables (${livrables.length})` },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">

        <div className="px-6 py-5 border-b border-border flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  {project.statut || 'En cours'}
                </span>
              </div>
              <h2 className="font-display text-2xl text-ink">{project.nom}</h2>
              {project.client && <div className="text-sm text-muted mt-0.5">{project.client}</div>}
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-paper-warm flex items-center justify-center text-muted flex-shrink-0">
              <X size={15} />
            </button>
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-muted flex-wrap">
            {project.localisation && project.localisation !== '—' && (
              <span className="flex items-center gap-1"><MapPin size={11} /> {project.localisation}</span>
            )}
            {project.deadline && project.deadline !== '—' && (
              <span className="flex items-center gap-1"><Calendar size={11} /> {project.deadline}</span>
            )}
            {project.architecteReferentNom && (
              <span className="flex items-center gap-1 text-electric font-medium">Référent : {project.architecteReferentNom}</span>
            )}
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted">Avancement global</span>
              <span className="font-semibold text-ink">{project.avancement}%</span>
            </div>
            <div className="h-2 bg-paper-warm rounded-full overflow-hidden">
              <div className="h-full bg-electric rounded-full" style={{ width: `${project.avancement}%` }} />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5 w-fit">
            <AlertCircle size={11} />
            Vue lecture seule — contactez votre responsable pour toute modification
          </div>
        </div>

        <div className="flex border-b border-border flex-shrink-0 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors ${tab === t.id ? 'text-electric border-b-2 border-electric -mb-px' : 'text-muted hover:text-ink'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'gantt' && <GanttReadOnly missions={project.missions || []} />}

          {tab === 'deadlines' && (
            <div className="space-y-2">
              {deadlines.length === 0 && <div className="text-center py-8 text-sm text-muted">Aucune deadline.</div>}
              {deadlines.map(d => {
                const isPast = new Date(d.date) < new Date()
                return (
                  <div key={d.id} className={`flex items-center gap-3 p-3 rounded-xl border ${isPast ? 'border-rose-200 bg-rose-50' : 'border-border bg-paper-warm'}`}>
                    <Flag size={14} className={isPast ? 'text-rose-500' : 'text-amber-500'} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink">{d.nom}</div>
                      {d.description && <div className="text-xs text-muted">{d.description}</div>}
                    </div>
                    <span className={`text-xs font-semibold ${isPast ? 'text-rose-600' : 'text-muted'}`}>{fmtDate(d.date)}</span>
                  </div>
                )
              })}
            </div>
          )}

          {tab === 'rdv' && (
            <div className="space-y-2">
              {rdvs.length === 0 && <div className="text-center py-8 text-sm text-muted">Aucun rendez-vous.</div>}
              {rdvs.map(r => {
                const isPast = new Date(r.date) < new Date()
                return (
                  <div key={r.id} className={`flex items-center gap-3 p-3 rounded-xl border ${isPast ? 'border-muted/20 opacity-60' : 'border-border bg-paper-warm'}`}>
                    <Calendar size={14} className="text-violet-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink">{r.nom}</div>
                      {r.personnes && <div className="text-xs text-muted">{r.personnes}</div>}
                    </div>
                    <span className="text-xs font-semibold text-muted">{fmtDate(r.date)}</span>
                  </div>
                )
              })}
            </div>
          )}

          {tab === 'mestaches' && (
            <div className="space-y-2">
              {myTasks.length === 0 && <div className="text-center py-8 text-sm text-muted">Aucune tâche assignée.</div>}
              {myTasks.map(t => {
                const cfg = TASK_STAT[t.statut] || TASK_STAT['Not Started']
                const Icon = cfg.Icon
                return (
                  <div key={t.id} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-paper-warm">
                    <Icon size={13} className={`${cfg.cls} mt-0.5 flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-ink">{t.nom}</div>
                      {t.deadline && (
                        <div className={`text-[10px] mt-0.5 ${new Date(t.deadline) < new Date() && t.statut !== 'Done' ? 'text-rose-500 font-semibold' : 'text-muted'}`}>
                          Deadline : {fmtDate(t.deadline)}
                        </div>
                      )}
                    </div>
                    <span className={`text-[10px] font-semibold ${cfg.cls}`}>{cfg.label}</span>
                  </div>
                )
              })}
            </div>
          )}

          {tab === 'livrables' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  onClick={() => setLivrableModal('new')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-electric text-white hover:opacity-90 transition-opacity"
                >
                  <Plus size={13} /> Ajouter un livrable
                </button>
              </div>
              {livrables.length === 0 && (
                <div className="text-center py-8 text-sm text-muted">Aucun livrable pour ce projet.</div>
              )}
              {livrables.map(l => {
                const isMine = String(l.addedById) === String(myId)
                return (
                  <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-paper-warm hover:bg-white transition-colors">
                    <div className="w-9 h-9 rounded-xl bg-electric/10 flex items-center justify-center flex-shrink-0">
                      {l.type === 'link' ? <Link2 size={15} className="text-electric" /> : <Paperclip size={15} className="text-electric" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-ink truncate">{l.nom}</div>
                      <div className="text-[10px] text-muted">
                        {l.addedByNom}
                        {l.addedAt && ` · Ajouté le ${new Date(l.addedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`}
                        {l.updatedAt && <span className="text-muted/70"> · Modifié le {new Date(l.updatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-electric hover:bg-electric/10 transition-colors"
                        title="Ouvrir"
                      >
                        <ExternalLink size={13} />
                      </a>
                      {isMine && (
                        <>
                          <button
                            onClick={() => setLivrableModal(l)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-paper-warm transition-colors"
                            title="Modifier"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => { deleteLivrable(project.id, l.id); toast.success('Livrable supprimé') }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-rose-500 hover:bg-rose-50 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* Livrable modal */}
      <AnimatePresence>
        {livrableModal && (
          <LivrableModal
            initial={livrableModal === 'new' ? null : livrableModal}
            onClose={() => setLivrableModal(null)}
            onSave={(data) => {
              if (livrableModal === 'new') {
                addLivrable(project.id, { ...data, addedById: myId, addedByNom: myNom })
                toast.success('Livrable ajouté')
              } else {
                updateLivrable(project.id, livrableModal.id, data)
                toast.success('Livrable modifié')
              }
              setLivrableModal(null)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Page principale ─────────────────────────────────────────────────────── */
export default function MyProjectsPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { projects, updateProject } = useData()

  const [statusFilter, setStatusFilter] = useState('Tous')
  const [activeTab, setActiveTab] = useState('externe')
  const [selectedAssigned, setSelectedAssigned] = useState(null)
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const myId  = String(profile?.employe_id || profile?.id || '')
  const myNom = profile?.full_name || profile?.nom || ''

  // Projets dont je suis le référent
  const myReferentProjects = useMemo(() =>
    projects.filter(p => String(p.architecteReferentId) === myId),
    [projects, myId]
  )

  // Projets où je suis membre d'équipe (pas référent) — lecture seule
  const myAssignedProjects = useMemo(() =>
    projects.filter(p =>
      (p.equipeProjet || []).map(String).includes(myId) &&
      String(p.architecteReferentId) !== myId
    ),
    [projects, myId]
  )

  // Référent : projets externes vs internes
  const refExternal = myReferentProjects.filter(p => p.typeProjet !== 'interne')
  const refInternal = myReferentProjects.filter(p => p.typeProjet === 'interne')

  // Effective tab: fallback si le type actif n'a pas de projets
  const effectiveTab = (activeTab === 'externe' && refExternal.length === 0) ? 'interne'
    : (activeTab === 'interne' && refInternal.length === 0) ? 'externe'
    : activeTab

  const filteredExternal = (statusFilter === 'Tous' ? refExternal : refExternal.filter(p => (p.statut || 'En cours') === statusFilter))
    .filter(p => !searchQuery || p.nom.toLowerCase().includes(searchQuery.toLowerCase()))
  const filteredInternal = (statusFilter === 'Tous' ? refInternal : refInternal.filter(p => (p.statut || 'En cours') === statusFilter))
    .filter(p => !searchQuery || p.nom.toLowerCase().includes(searchQuery.toLowerCase()))

  const hasNothing = myReferentProjects.length === 0 && myAssignedProjects.length === 0

  return (
    <div className="p-4 lg:p-10 space-y-8">

      {hasNothing ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-electric/10 flex items-center justify-center mx-auto mb-4">
            <Briefcase size={28} className="text-electric/60" />
          </div>
          <div className="font-display text-2xl text-ink mb-2">Aucun projet</div>
          <p className="text-sm text-muted">Vous n'êtes référent d'aucun projet et n'avez pas encore été assigné à une équipe.</p>
        </div>
      ) : (
        <div className="space-y-10">

          {/* ── SECTION RÉFÉRENT ─────────────────────────────────────────── */}
          {myReferentProjects.length > 0 && (
            <section>

              {/* Bandeau de filtres unifié */}
              {(() => {
                const src = effectiveTab === 'externe' ? refExternal : refInternal
                const hasBothTypes = refExternal.length > 0 && refInternal.length > 0
                return (
                  <div className="mb-5 space-y-2">

                    {/* ── Mobile ── */}
                    <div className="lg:hidden space-y-2">
                      {/* Ligne 1 : onglets type (seulement si les deux existent) */}
                      {hasBothTypes && (
                        <div className="flex items-center gap-2">
                          <button onClick={() => { setActiveTab('externe'); setStatusFilter('Tous') }}
                            className={`flex flex-1 justify-center items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${effectiveTab === 'externe' ? 'bg-ink text-paper shadow-sm' : 'text-muted hover:text-ink hover:bg-paper-warm'}`}>
                            <Building2 size={14} />
                            Projets externes
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${effectiveTab === 'externe' ? 'bg-white/20 text-white' : 'bg-border text-muted'}`}>{refExternal.length}</span>
                          </button>
                          <button onClick={() => { setActiveTab('interne'); setStatusFilter('Tous') }}
                            className={`flex flex-1 justify-center items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${effectiveTab === 'interne' ? 'bg-violet-600 text-white shadow-sm' : 'text-muted hover:text-ink hover:bg-paper-warm'}`}>
                            <FolderGit2 size={14} />
                            Projets internes
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${effectiveTab === 'interne' ? 'bg-white/20 text-white' : 'bg-border text-muted'}`}>{refInternal.length}</span>
                          </button>
                        </div>
                      )}
                      {/* Ligne 2 : recherche + filtre */}
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                          <input
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Rechercher un projet..."
                            className="w-full pl-8 pr-3 py-2 text-sm bg-paper-warm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-electric/30 placeholder:text-muted"
                          />
                        </div>
                        <div className="relative flex-shrink-0">
                          {showFilterMenu && <div className="fixed inset-0 z-10" onClick={() => setShowFilterMenu(false)} />}
                          <button
                            onClick={() => setShowFilterMenu(o => !o)}
                            className={`flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold border transition-all ${statusFilter !== 'Tous' ? 'bg-ink text-paper border-transparent' : 'bg-paper-warm border-border text-muted hover:text-ink'}`}
                          >
                            <Filter size={13} />
                            {statusFilter !== 'Tous' && <span className="max-w-[64px] truncate">{statusFilter}</span>}
                          </button>
                          <AnimatePresence>
                            {showFilterMenu && (
                              <motion.div
                                initial={{ opacity: 0, y: -6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -6, scale: 0.96 }} transition={{ duration: 0.13 }}
                                className="absolute top-full right-0 mt-1.5 bg-white border border-border rounded-2xl shadow-xl overflow-hidden z-20 w-52"
                              >
                                {(['Tous', ...ALL_STATUTS]).map(s => {
                                  const ss = s !== 'Tous' ? STATUT_STYLES[s] : null
                                  const isActive = statusFilter === s
                                  return (
                                    <button key={s}
                                      onClick={() => { setStatusFilter(s); setShowFilterMenu(false) }}
                                      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold transition-colors text-left ${isActive ? 'bg-ink text-paper' : 'hover:bg-paper-warm text-ink'}`}
                                    >
                                      {ss && <span className={`w-2 h-2 rounded-full ${ss.dot}`} />}
                                      {s}
                                    </button>
                                  )
                                })}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>

                    {/* ── Desktop ── */}
                    <div className="hidden lg:flex flex-wrap items-center gap-2">
                      {refExternal.length > 0 && (
                        <button onClick={() => { setActiveTab('externe'); setStatusFilter('Tous') }}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${effectiveTab === 'externe' ? 'bg-ink text-paper shadow-sm' : 'text-muted hover:text-ink hover:bg-paper-warm'}`}>
                          <Building2 size={15} />
                          Projets externes
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${effectiveTab === 'externe' ? 'bg-white/20 text-white' : 'bg-border text-muted'}`}>{refExternal.length}</span>
                        </button>
                      )}
                      {refInternal.length > 0 && (
                        <button onClick={() => { setActiveTab('interne'); setStatusFilter('Tous') }}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${effectiveTab === 'interne' ? 'bg-violet-600 text-white shadow-sm' : 'text-muted hover:text-ink hover:bg-paper-warm'}`}>
                          <FolderGit2 size={15} />
                          Projets internes
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${effectiveTab === 'interne' ? 'bg-white/20 text-white' : 'bg-border text-muted'}`}>{refInternal.length}</span>
                        </button>
                      )}
                      {(refExternal.length > 0 || refInternal.length > 0) && <div className="w-px h-6 bg-border flex-shrink-0" />}
                      {(['Tous', ...ALL_STATUTS]).map(s => {
                        const ss = s !== 'Tous' ? STATUT_STYLES[s] : null
                        const isActive = statusFilter === s
                        return (
                          <button key={s} onClick={() => setStatusFilter(s)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                              isActive
                                ? s === 'Tous' ? 'bg-ink text-paper shadow-sm' : `${ss.bg} ${ss.text} ring-2 ring-current/30`
                                : 'bg-paper-warm text-muted hover:text-ink hover:bg-white border border-border'
                            }`}>
                            {ss && <span className={`w-1.5 h-1.5 rounded-full ${ss.dot}`} />}
                            {s}
                            {s !== 'Tous' && (
                              <span className={`text-[10px] ${isActive ? 'opacity-60' : 'opacity-50'}`}>
                                {src.filter(p => (p.statut || 'En cours') === s).length}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>

                  </div>
                )
              })()}

              {/* Projets externes — même table que ProjectsPage */}
              {effectiveTab === 'externe' && (
                <div className="card p-5 lg:p-7">
                  {/* Desktop */}
                  <div className="hidden lg:block space-y-3">
                    {filteredExternal.map((p, i) => {
                      const missionsList = (p.missions || []).filter(m => m.type === 'mission')
                      const curMission   = missionsList.find(m => m.statut !== 'valide')
                      const missionLabel = curMission?.nom ?? (missionsList.length > 0 ? 'Terminé' : (p.phase ? `Phase ${p.phase}` : 'En cours'))
                      const missionFinDate = curMission?.fin
                        ? new Date(curMission.fin).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                        : p.deadline
                      const totalTasks = (p.tasks || []).length
                      const doneTasks  = (p.tasks || []).filter(t => t.statut === 'Done').length
                      return (
                        <div key={p.id}
                          onClick={() => navigate(`/app/my-projects/${p.id}`)}
                          className="grid grid-cols-[3fr_2.5fr_140px_130px_160px_auto] gap-4 items-center p-4 bg-paper-warm rounded-xl hover:bg-white hover:shadow-md transition-all cursor-pointer"
                          style={{ animationDelay: `${i * 60}ms` }}>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-semibold text-ink truncate">{p.nom}</div>
                              {p.maitrise === 'public'
                                ? <Globe size={12} className="text-electric flex-shrink-0" />
                                : <Lock size={12} className="text-muted flex-shrink-0" />}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted mt-0.5">
                              <span className="truncate">{p.client}</span>
                              {p.localisation && p.localisation !== '—' && (
                                <><span>·</span><span className="flex items-center gap-1 flex-shrink-0"><MapPin size={11} /> {p.localisation}</span></>
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
                            {totalTasks === 0 ? <span className="text-muted font-normal">—</span> : (
                              <><span className="text-emerald-600">{doneTasks}</span><span className="text-muted font-normal"> / {totalTasks} tâche{totalTasks !== 1 ? 's' : ''}</span></>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted whitespace-nowrap">
                            <Calendar size={12} /> {missionFinDate}
                          </div>
                          <ArrowRight size={16} className="text-muted" />
                        </div>
                      )
                    })}
                    {filteredExternal.length === 0 && (
                      <div className="text-center py-16 text-muted text-sm">
                        {statusFilter !== 'Tous' ? `Aucun projet avec le statut "${statusFilter}".` : 'Aucun projet externe.'}
                      </div>
                    )}
                  </div>

                  {/* Mobile */}
                  <div className="lg:hidden space-y-3">
                    {filteredExternal.map((p, i) => {
                      const missionsList = (p.missions || []).filter(m => m.type === 'mission')
                      const curMission   = missionsList.find(m => m.statut !== 'valide')
                      const missionLabel = curMission?.nom ?? (missionsList.length > 0 ? 'Terminé' : (p.phase ? `Phase ${p.phase}` : 'En cours'))
                      const finLabel     = curMission?.fin
                        ? new Date(curMission.fin).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
                        : String(p.deadline).split(' ').slice(0, 2).join(' ')
                      const totalTasks = (p.tasks || []).length
                      const doneTasks  = (p.tasks || []).filter(t => t.statut === 'Done').length
                      return (
                        <div key={p.id} onClick={() => navigate(`/app/my-projects/${p.id}`)}
                          className="bg-paper-warm rounded-2xl p-4 cursor-pointer hover:bg-white hover:shadow-md transition-all"
                          style={{ animationDelay: `${i * 60}ms` }}>
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <div className="text-sm font-semibold text-ink">{p.nom}</div>
                                {p.maitrise === 'public' ? <Globe size={11} className="text-electric flex-shrink-0" /> : <Lock size={11} className="text-muted flex-shrink-0" />}
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
                          <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-border">
                            <div><div className="text-muted text-[10px]">Tâches</div><div className="text-ink font-semibold">{totalTasks === 0 ? '—' : <><span className="text-emerald-600">{doneTasks}</span>/{totalTasks}</>}</div></div>
                            <div><div className="text-muted text-[10px]">Fin mission</div><div className="text-ink font-semibold">{finLabel}</div></div>
                          </div>
                        </div>
                      )
                    })}
                    {filteredExternal.length === 0 && <div className="text-center py-12 text-muted text-sm">Aucun projet externe.</div>}
                  </div>
                </div>
              )}

              {/* Projets internes */}
              {effectiveTab === 'interne' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredInternal.map((p, i) => {
                    const taskCount = (p.tasks || []).length
                    const doneTasks = (p.tasks || []).filter(t => t.statut === 'Done').length
                    return (
                      <div key={p.id} onClick={() => navigate(`/app/my-projects/${p.id}`)}
                        className="card p-5 cursor-pointer hover:shadow-md transition-all group"
                        style={{ animationDelay: `${i * 60}ms` }}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                            <FolderGit2 size={18} className="text-violet-600" />
                          </div>
                        </div>
                        <div className="font-semibold text-ink text-sm mb-1 leading-snug">{p.nom}</div>
                        {p.description && <div className="text-xs text-muted mb-3 line-clamp-2 leading-relaxed">{p.description}</div>}
                        {p.objectif && (
                          <div className="flex items-start gap-1.5 text-xs text-muted mb-4">
                            <Target size={11} className="flex-shrink-0 mt-0.5 text-violet-400" />
                            <span className="line-clamp-1">{p.objectif}</span>
                          </div>
                        )}
                        <div className="border-t border-border pt-3 mt-auto space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted">
                              {taskCount === 0 ? '—' : <><span className="text-emerald-600 font-semibold">{doneTasks}</span><span className="text-muted"> / {taskCount} tâche{taskCount !== 1 ? 's' : ''}</span></>}
                            </span>
                            <StatutDropdown statut={p.statut || 'En cours'} projectId={p.id} onUpdate={updateProject} />
                          </div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted">Avancement</span>
                            <span className="font-semibold text-ink">{p.avancement}%</span>
                          </div>
                          <ProgressBar value={p.avancement} color="#7C3AED" />
                        </div>
                      </div>
                    )
                  })}
                  {filteredInternal.length === 0 && <div className="col-span-full text-center py-12 text-muted text-sm">Aucun projet interne avec ce statut.</div>}
                </div>
              )}
            </section>
          )}

          {/* ── SECTION PERSONNEL ASSIGNÉ ─────────────────────────────────── */}
          {myAssignedProjects.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center">
                  <Users size={15} className="text-violet-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-ink">Projets assignés</h2>
                  <p className="text-xs text-muted">{myAssignedProjects.length} projet{myAssignedProjects.length > 1 ? 's' : ''} — vue lecture seule</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {myAssignedProjects.map((p, i) => {
                  const cfg = STATUT_STYLES[p.statut] || STATUT_STYLES['En cours']
                  const tasks = p.tasks || []
                  const done  = tasks.filter(t => t.statut === 'Done').length
                  const missions = (p.missions || []).filter(m => m.type === 'mission')
                  const nextDeadline = (p.missions || [])
                    .filter(m => m.type === 'deadline' && m.date && new Date(m.date) > new Date())
                    .sort((a, b) => new Date(a.date) - new Date(b.date))[0]
                  return (
                    <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => setSelectedAssigned(p)}
                      className="card p-5 cursor-pointer hover:shadow-lg transition-shadow group relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-violet-400" />
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                              {p.statut || 'En cours'}
                            </span>
                          </div>
                          <h3 className="font-semibold text-ink text-sm leading-tight truncate">{p.nom}</h3>
                          {p.client && <div className="text-xs text-muted mt-0.5">{p.client}</div>}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-display text-2xl text-ink leading-none">{p.avancement}%</div>
                          <div className="text-[10px] text-muted">avancement</div>
                        </div>
                      </div>
                      <div className="h-1.5 bg-paper-warm rounded-full mb-3 overflow-hidden">
                        <div className="h-full bg-violet-400 rounded-full" style={{ width: `${p.avancement}%` }} />
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted flex-wrap">
                        {tasks.length > 0 && (
                          <span className="flex items-center gap-1"><CheckCircle size={11} className="text-emerald-500" />{done}/{tasks.length} tâches</span>
                        )}
                        {nextDeadline && (
                          <span className="flex items-center gap-1 text-rose-600 font-medium"><Flag size={11} />{fmtShort(nextDeadline.date)}</span>
                        )}
                        {p.architecteReferentNom && (
                          <span className="text-electric">Réf : {p.architecteReferentNom}</span>
                        )}
                      </div>
                      <ArrowRight size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted/40 group-hover:text-violet-500 transition-colors" />
                    </motion.div>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Modal personnel read-only */}
      <AnimatePresence>
        {selectedAssigned && (
          <PersonnelModal
            project={selectedAssigned}
            myId={myId}
            myNom={myNom}
            onClose={() => setSelectedAssigned(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
