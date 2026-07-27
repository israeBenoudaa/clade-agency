import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, CheckCircle, X, AlertTriangle, Clock, CheckCircle2,
  Calendar, ClipboardList, ChevronRight, BookOpen, TrendingUp,
  Mail, Phone, Sun, Star, ThumbsDown, Loader, AlertCircle,
  CalendarDays, BarChart2, ChevronDown, ChevronUp, Building2,
  MessageSquare, FolderGit2, Filter, Search,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { computeCongesBalance } from '../../utils/conges'
import FormationModal from '../../components/FormationModal'
import toast from 'react-hot-toast'

function StarPicker({ value, onChange, size = 18 }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button"
          onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n === value ? 0 : n)}
          className={`transition-colors ${(hover || value) >= n ? 'text-amber-400' : 'text-border'}`}
          style={{ fontSize: size }}>★</button>
      ))}
    </div>
  )
}

function StarDisplay({ value, size = 14 }) {
  return (
    <span className="flex gap-0.5">
      {[1,2,3,4,5].map(n => (
        <span key={n} className={value >= n ? 'text-amber-400' : 'text-border'} style={{ fontSize: size }}>★</span>
      ))}
    </span>
  )
}

/* ─── Planning grid constants ────────────────────────────────────────────── */
const PLAN_ROW_H = 40
const PLAN_HOURS = Array.from({ length: 11 }, (_, i) => i + 8) // 8h–18h
const PLAN_DAY_NAMES = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']
function planT2min(t) { const [h, m] = (t || '00:00').split(':').map(Number); return h * 60 + m }
function planDur(s, e) { return Math.max(0, planT2min(e) - planT2min(s)) }
function planEvColor(ev) {
  if (ev.isFormation) return '#7C3AED'
  switch (ev.type) {
    case 'rdv':                  return '#F97316'
    case 'rdv_prospect':         return '#0EA5E9'
    case 'autoformation':
    case 'autoformation_complete': return '#0D9488'
    case 'conge':                return '#F59E0B'
    case 'arret_maladie':        return '#F43F5E'
    default: return ev.couleur || '#3B82F6'
  }
}
function planEvPrefix(ev) {
  if (ev.isFormation) return '📚 '
  switch (ev.type) {
    case 'rdv':             return '📅 '
    case 'rdv_prospect':    return '📞 '
    case 'autoformation':
    case 'autoformation_complete': return '🎓 '
    case 'conge':           return '🌴 '
    case 'arret_maladie':   return '🏥 '
    default: return ''
  }
}

/* ─── helpers ──────────────────────────────────────────────────────────────── */
const DEMANDE_LABELS = {
  conge: 'Congé', absence: 'Absence', arret_maladie: 'Arrêt maladie',
  attestation: 'Attestation', autre: 'Autre',
}
const STATUT_CFG = {
  'Done':           { label: 'Terminé',     Icon: CheckCircle2, cls: 'text-emerald-600 bg-emerald-50' },
  'Working on it':  { label: 'En cours',    Icon: Loader,       cls: 'text-amber-600   bg-amber-50'   },
  'Stuck':          { label: 'Bloqué',      Icon: AlertCircle,  cls: 'text-rose-600    bg-rose-50'    },
  'Not Started':    { label: 'Non démarré', Icon: Clock,        cls: 'text-muted       bg-paper-warm' },
}
const APPROVAL_CFG = {
  'Approved':   { Icon: CheckCircle,  cls: 'text-emerald-600', label: 'Approuvé'  },
  'Great work': { Icon: Star,         cls: 'text-amber-500',   label: 'Excellent !' },
  'Not yet':    { Icon: ThumbsDown,   cls: 'text-rose-500',    label: 'Pas encore' },
}
function fmtDate(d) {
  return d ? new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
}
function fmtShort(d) {
  return d ? new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : '—'
}
function getInitials(nom) {
  const p = (nom || '').trim().split(' ')
  return p.length >= 2 ? (p[0][0] + p[p.length-1][0]).toUpperCase() : (nom||'??').slice(0,2).toUpperCase()
}
function StatutBadge({ statut }) {
  const m = { actif: ['bg-emerald-50 text-emerald-700','Actif'], conge: ['bg-amber-50 text-amber-700','En congé'], bloque: ['bg-rose-50 text-rose-700','Inactif'] }
  const [cls, label] = m[statut] || ['bg-paper-warm text-muted', statut]
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
}

/* ─── Modal détail employé ──────────────────────────────────────────────────── */
const MANAGER_VISIBLE_TYPES = ['conge', 'absence', 'arret_maladie', 'demission']

function EmployeeDetailModal({ employe: initialEmploye, projects, demandesRH, formations, raterId, raterNom, onClose }) {
  const { addEvaluation, updateEvaluation, deleteEvaluation, employes } = useData()
  const employe = useMemo(() =>
    employes.find(e => String(e.id) === String(initialEmploye.id)) || initialEmploye,
    [employes, initialEmploye]
  )
  const [tab, setTab] = useState('projets')
  const [weekOffset, setWeekOffset] = useState(0)
  const [evalForm, setEvalForm] = useState({ projetId: '', note: 0, pointsForts: '', pointsFaibles: '' })
  const [showEvalForm, setShowEvalForm] = useState(false)
  const [editingEvalId, setEditingEvalId] = useState(null)

  const today = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}`

  const allTasks = useMemo(() =>
    projects.flatMap(p => (p.tasks||[]).map(t => ({...t, projectNom: p.nom, projectId: p.id})))
  , [projects])
  const myTasks = allTasks.filter(t => String(t.personnelId) === String(employe.id))

  // Projets où l'employé est impliqué (équipe OU tâches assignées)
  const myProjects = useMemo(() =>
    projects.filter(p =>
      (p.equipeProjet || []).map(String).includes(String(employe.id)) ||
      (p.tasks || []).some(t => String(t.personnelId) === String(employe.id))
    ), [projects, employe.id]
  )

  const myDemandes = (demandesRH||[]).filter(d =>
    String(d.employeId) === String(employe.id) &&
    MANAGER_VISIBLE_TYPES.includes(d.type)
  )
  const myFormations = (formations||[]).filter(f => (f.personnes||[]).map(String).includes(String(employe.id)))

  // Stats globales
  const tasksDone     = myTasks.filter(t => t.statut === 'Done').length
  const tasksStuck    = myTasks.filter(t => t.statut === 'Stuck').length
  const tasksApproved = myTasks.filter(t => t.approval==='Approved'||t.approval==='Great work').length
  const approvalRate  = tasksDone > 0 ? Math.round((tasksApproved/tasksDone)*100) : null
  const tasksLate = myTasks.filter(t => t.statut!=='Done' && t.deadline && t.deadline < today).length

  // Évaluations par projet
  const evals = useMemo(() =>
    (employe.evaluations || []).slice().sort((a, b) => b.date.localeCompare(a.date)),
    [employe.evaluations]
  )
  const avgNote = evals.length > 0
    ? (evals.reduce((s, ev) => s + (ev.note || 0), 0) / evals.length).toFixed(1)
    : null

  const openEditEval = (ev) => {
    setEvalForm({ projetId: String(ev.projetId), note: ev.note, pointsForts: ev.pointsForts || '', pointsFaibles: ev.pointsFaibles || '' })
    setEditingEvalId(ev.id)
    setShowEvalForm(true)
  }

  const cancelEvalForm = () => {
    setShowEvalForm(false)
    setEditingEvalId(null)
    setEvalForm({ projetId: '', note: 0, pointsForts: '', pointsFaibles: '' })
  }

  const submitEval = () => {
    if (!evalForm.projetId || !evalForm.note) { toast.error('Sélectionnez un projet et une note'); return }
    const proj = myProjects.find(p => String(p.id) === String(evalForm.projetId))
    const data = {
      projetId:      String(evalForm.projetId),
      projetNom:     proj?.nom || '—',
      note:          evalForm.note,
      pointsForts:   evalForm.pointsForts.trim(),
      pointsFaibles: evalForm.pointsFaibles.trim(),
    }
    if (editingEvalId) {
      updateEvaluation(employe.id, editingEvalId, data)
      toast.success('Évaluation modifiée')
    } else {
      addEvaluation(employe.id, { ...data, managerId: String(raterId), managerNom: raterNom, date: today })
      toast.success('Évaluation enregistrée')
    }
    cancelEvalForm()
  }

  // Planning week helpers
  const weekDates = useMemo(() => {
    const now = new Date()
    const day = now.getDay() === 0 ? 6 : now.getDay() - 1
    const mon = new Date(now)
    mon.setDate(now.getDate() - day + weekOffset * 7)
    mon.setHours(0, 0, 0, 0)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mon); d.setDate(mon.getDate() + i); return d
    })
  }, [weekOffset])

  const myPlanningEvents = employe.planning || []

  const toISO = (d) => {
    const y = d.getFullYear()
    const m = String(d.getMonth()+1).padStart(2,'0')
    const day = String(d.getDate()).padStart(2,'0')
    return `${y}-${m}-${day}`
  }

  const tabs = [
    { id: 'projets',     label: 'Projets',         count: myProjects.length || null },
    { id: 'performance', label: 'Performance',      count: null },
    { id: 'planning',    label: 'Planning',         count: null },
    { id: 'taches',      label: 'Tâches',           count: myTasks.length || null },
    { id: 'formations',  label: 'Formations',       count: myFormations.length || null },
    { id: 'demandes',    label: 'Demandes RH',     count: myDemandes.filter(d=>d.statut==='en_attente').length || null },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4"
      onClick={e => e.target===e.currentTarget && onClose()}>
      <motion.div
        initial={{ opacity:0, scale:0.95, y:12 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.95, y:8 }}
        transition={{ type:'spring', stiffness:300, damping:28 }}
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center gap-4 px-5 py-4 border-b border-border flex-shrink-0">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{ background: employe.couleur || '#3B7BF6' }}>
            {getInitials(employe.nom)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-ink">{employe.nom}</div>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <span className="text-xs text-muted">{employe.poste || '—'}</span>
              {employe.dept && employe.dept !== '—' && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-electric/10 text-electric">{employe.dept}</span>
              )}
              <StatutBadge statut={employe.statut} />
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {employe.email && <span className="flex items-center gap-1 text-[10px] text-muted"><Mail size={9}/>{employe.email}</span>}
              {employe.telephone && <span className="flex items-center gap-1 text-[10px] text-muted"><Phone size={9}/>{employe.telephone}</span>}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-paper-warm flex items-center justify-center text-muted flex-shrink-0">
            <X size={16}/>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-5 flex-shrink-0 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-3 text-xs font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors ${
                tab===t.id ? 'border-electric text-electric' : 'border-transparent text-muted hover:text-ink'
              }`}>
              {t.label}
              {t.count != null && t.count > 0 && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${tab===t.id ? 'bg-electric/10 text-electric' : 'bg-paper-warm text-muted'}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">

          {/* Planning */}
          {tab === 'planning' && (
            <div className="space-y-3">

              {/* Week navigator */}
              <div className="flex items-center justify-between">
                <button onClick={() => setWeekOffset(o => o-1)}
                  className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted hover:text-ink hover:bg-paper-warm transition-colors">
                  <ChevronDown size={13} className="rotate-90" />
                </button>
                <div className="text-center">
                  <div className="text-sm font-semibold text-ink">
                    {weekDates[0].toLocaleDateString('fr-FR',{day:'numeric',month:'short'})} – {weekDates[6].toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})}
                  </div>
                  {weekOffset !== 0 && (
                    <button onClick={() => setWeekOffset(0)} className="text-[10px] text-electric hover:underline">
                      Semaine actuelle
                    </button>
                  )}
                </div>
                <button onClick={() => setWeekOffset(o => o+1)}
                  className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted hover:text-ink hover:bg-paper-warm transition-colors">
                  <ChevronDown size={13} className="-rotate-90" />
                </button>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 text-[10px] text-muted flex-wrap">
                {[
                  {color:'#3B82F6', label:'Événement'},
                  {color:'#7C3AED', label:'Formation'},
                  {color:'#F97316', label:'RDV'},
                  {color:'#0EA5E9', label:'RDV prospect'},
                  {color:'#0D9488', label:'Autoformation'},
                  {color:'#F59E0B', label:'Congé'},
                  {color:'#F43F5E', label:'Arrêt maladie'},
                ].map(l => (
                  <span key={l.label} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-sm inline-block flex-shrink-0" style={{background:l.color}} />
                    {l.label}
                  </span>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="overflow-x-auto rounded-xl border border-border bg-white">
                <div style={{ minWidth: 560 }}>

                  {/* Day headers */}
                  <div className="grid border-b border-border" style={{ gridTemplateColumns: `40px repeat(7, 1fr)` }}>
                    <div className="border-r border-border/50" />
                    {weekDates.map((d, di) => {
                      const iso = toISO(d)
                      const isToday = iso === toISO(new Date())
                      const allDayEvs = myPlanningEvents.filter(ev => ev.date === iso && !ev.heureDebut)
                      return (
                        <div key={di} className="border-l border-border/30 px-0.5 pt-1.5 pb-1">
                          <div className="text-center mb-1">
                            <div className="text-[9px] uppercase text-muted tracking-wide">{PLAN_DAY_NAMES[di]}</div>
                            <div className={`text-xs font-semibold w-6 h-6 rounded-full mx-auto flex items-center justify-center mt-0.5 ${isToday ? 'bg-electric text-white' : 'text-ink'}`}>
                              {d.getDate()}
                            </div>
                          </div>
                          {allDayEvs.map(ev => (
                            <div key={ev.id} title={ev.titre || ''}
                              className="text-[8px] rounded px-1 py-0.5 truncate mb-0.5 text-white leading-tight"
                              style={{background: planEvColor(ev)}}>
                              {planEvPrefix(ev)}{ev.titre}
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>

                  {/* Time grid */}
                  <div className="grid" style={{ gridTemplateColumns: `40px repeat(7, 1fr)` }}>
                    {/* Hour labels */}
                    <div className="flex flex-col border-r border-border/50">
                      {PLAN_HOURS.map(h => (
                        <div key={h} style={{ height: PLAN_ROW_H }}
                          className="flex items-start justify-end pr-1.5 pt-1 text-[9px] text-muted border-t border-border/30 first:border-t-0">
                          {h}h
                        </div>
                      ))}
                    </div>

                    {/* Day columns */}
                    {weekDates.map((d, di) => {
                      const iso = toISO(d)
                      const isToday = iso === toISO(new Date())
                      const dayEvents = myPlanningEvents.filter(ev => ev.date === iso && ev.heureDebut)
                      return (
                        <div key={di}
                          className={`relative border-l border-border/30 ${isToday ? 'bg-electric/[0.03]' : ''}`}
                          style={{ height: PLAN_ROW_H * PLAN_HOURS.length }}>
                          {PLAN_HOURS.map((_, hi) => (
                            <div key={hi} className="absolute w-full border-t border-border/30"
                              style={{ top: hi * PLAN_ROW_H }} />
                          ))}
                          {dayEvents.map(ev => {
                            const sm = planT2min(ev.heureDebut) - 8 * 60
                            const dur = planDur(ev.heureDebut, ev.heureFin)
                            const top = (sm / 60) * PLAN_ROW_H
                            const height = Math.max((dur / 60) * PLAN_ROW_H, 14)
                            const color = planEvColor(ev)
                            const prefix = planEvPrefix(ev)
                            return (
                              <div key={ev.id}
                                className="absolute left-0.5 right-0.5 rounded px-1 py-0.5 text-white overflow-hidden cursor-default"
                                style={{ top: top + 1, height: height - 2, background: color }}
                                title={`${prefix}${ev.titre || ''} · ${ev.heureDebut}–${ev.heureFin}${ev.description ? '\n' + ev.description : ''}`}>
                                <div className="text-[9px] font-semibold leading-tight truncate">{prefix}{ev.titre}</div>
                                {height > 24 && (
                                  <div className="text-[8px] opacity-80 leading-tight">{ev.heureDebut}–{ev.heureFin}</div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>

                </div>
              </div>

              {myPlanningEvents.length === 0 && (
                <div className="text-center py-4 text-xs text-muted">Aucun événement dans le planning de {employe.nom?.split(' ')[0] || 'ce membre'}</div>
              )}
            </div>
          )}

          {/* Tâches */}
          {tab === 'taches' && (
            <div className="space-y-2">
              {myTasks.length === 0
                ? <div className="text-center py-10 text-sm text-muted">Aucune tâche assignée.</div>
                : myTasks.map(t => {
                    const s = STATUT_CFG[t.statut] || STATUT_CFG['Not Started']
                    const Icon = s.Icon
                    const apCfg = t.approval ? APPROVAL_CFG[t.approval] : null
                    return (
                      <div key={t.id} className="flex items-center gap-3 p-3 bg-paper-warm rounded-xl">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${s.cls}`}>
                          <Icon size={13}/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-ink truncate">{t.nom}</div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[10px] text-muted truncate">{t.projectNom}</span>
                            {t.missionNom && <span className="text-[10px] text-muted">· {t.missionNom}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {t.deadline && (
                            <span className="text-[10px] text-muted flex items-center gap-0.5">
                              <CalendarDays size={9}/>{fmtShort(t.deadline)}
                            </span>
                          )}
                          {apCfg && <apCfg.Icon size={13} className={apCfg.cls}/>}
                        </div>
                      </div>
                    )
                  })
              }
            </div>
          )}

          {/* Projets */}
          {tab === 'projets' && (
            <div className="space-y-5">

              {/* Récap global */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: 'Projets',           value: myProjects.length,                                                                         cls: 'text-electric' },
                  { label: 'Tâches terminées',  value: `${tasksDone}/${myTasks.length}`,                                                          cls: tasksDone>0?'text-emerald-600':'text-muted' },
                  { label: 'Taux approbation',  value: approvalRate!==null?`${approvalRate}%`:'—',                                                cls: approvalRate===null?'text-muted':approvalRate>=80?'text-emerald-600':approvalRate>=50?'text-amber-600':'text-rose-600' },
                  { label: 'En retard',          value: tasksLate,                                                                                cls: tasksLate>0?'text-amber-600':'text-muted' },
                ].map((k,i) => (
                  <div key={i} className="bg-paper-warm rounded-xl p-3 text-center border border-border">
                    <div className={`font-display text-xl leading-none mb-1 ${k.cls}`}>{k.value}</div>
                    <div className="text-[10px] text-muted">{k.label}</div>
                  </div>
                ))}
              </div>

              {/* Par projet */}
              {myProjects.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted">Aucun projet assigné.</div>
              ) : (
                <div className="space-y-3">
                  <div className="label-text">Détail par projet</div>
                  {myProjects.map(proj => {
                    const pTasks = (proj.tasks||[]).filter(t => String(t.personnelId) === String(employe.id))
                    const pDone   = pTasks.filter(t => t.statut==='Done').length
                    const pStuck  = pTasks.filter(t => t.statut==='Stuck').length
                    const pLate   = pTasks.filter(t => t.statut!=='Done' && t.deadline && t.deadline < today).length
                    const pInProg = pTasks.filter(t => t.statut==='Working on it').length
                    const pRate   = pTasks.length > 0 ? Math.round((pDone/pTasks.length)*100) : null
                    const avancement = proj.avancement || 0
                    const inEquipe = (proj.equipeProjet||[]).map(String).includes(String(employe.id))
                    return (
                      <div key={proj.id} className="border border-border rounded-xl overflow-hidden">
                        {/* Header projet */}
                        <div className="flex items-center gap-3 px-4 py-3 bg-paper-warm border-b border-border/60">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-ink truncate">{proj.nom}</span>
                              {inEquipe && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-electric/10 text-electric">Équipe</span>
                              )}
                              {proj.statut && (
                                <span className="text-[10px] text-muted">{proj.statut}</span>
                              )}
                            </div>
                            {proj.client && <div className="text-[10px] text-muted mt-0.5">{proj.client}</div>}
                          </div>
                          {/* Avancement global projet */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="w-16 bg-border rounded-full h-1.5 overflow-hidden">
                              <div className="h-full bg-electric rounded-full transition-all" style={{ width: `${avancement}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-ink w-8 text-right">{avancement}%</span>
                          </div>
                        </div>
                        {/* Stats tâches du projet */}
                        <div className="px-4 py-3">
                          {pTasks.length === 0 ? (
                            <div className="text-xs text-muted">Membre de l'équipe sans tâche assignée sur ce projet.</div>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-xs text-muted">Tâches :</span>
                                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                                  <CheckCircle2 size={12}/> {pDone} terminée{pDone>1?'s':''}
                                </span>
                                {pInProg > 0 && (
                                  <span className="flex items-center gap-1 text-xs font-semibold text-amber-600">
                                    <Loader size={12}/> {pInProg} en cours
                                  </span>
                                )}
                                {pStuck > 0 && (
                                  <span className="flex items-center gap-1 text-xs font-semibold text-rose-600">
                                    <AlertCircle size={12}/> {pStuck} bloquée{pStuck>1?'s':''}
                                  </span>
                                )}
                                {pLate > 0 && (
                                  <span className="flex items-center gap-1 text-xs font-semibold text-amber-700">
                                    <Clock size={12}/> {pLate} en retard
                                  </span>
                                )}
                                <span className="text-[10px] text-muted ml-auto">{pTasks.length} au total</span>
                              </div>
                              {pRate !== null && (
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-paper rounded-full h-1.5 overflow-hidden">
                                    <div className={`h-full rounded-full ${pRate>=80?'bg-emerald-500':pRate>=50?'bg-amber-400':'bg-rose-400'}`} style={{width:`${pRate}%`}}/>
                                  </div>
                                  <span className={`text-xs font-bold w-8 text-right ${pRate>=80?'text-emerald-600':pRate>=50?'text-amber-600':'text-rose-600'}`}>{pRate}%</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

            </div>
          )}

          {/* Performance */}
          {tab === 'performance' && (
            <div className="space-y-4">

              {/* Header résumé + bouton ajouter */}
              <div className="flex items-center justify-between">
                <div>
                  {avgNote ? (
                    <div className="flex items-center gap-2">
                      <span className="font-display text-2xl text-amber-600 leading-none">{avgNote}</span>
                      <span className="text-xs text-muted">/5 · {evals.length} évaluation{evals.length > 1 ? 's' : ''}</span>
                      <StarDisplay value={Math.round(parseFloat(avgNote))} />
                    </div>
                  ) : (
                    <span className="text-sm text-muted">Aucune évaluation</span>
                  )}
                </div>
                <button
                  onClick={() => showEvalForm ? cancelEvalForm() : setShowEvalForm(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    showEvalForm ? 'bg-paper-warm text-muted border border-border' : 'bg-amber-500 text-white hover:bg-amber-600'
                  }`}
                >
                  {showEvalForm ? <><X size={12} /> Annuler</> : <><Star size={12} /> Évaluer</>}
                </button>
              </div>

              {/* Formulaire nouvelle évaluation */}
              {showEvalForm && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
                  <div className="text-xs font-semibold text-amber-800 mb-1">
                    {editingEvalId ? 'Modifier l\'évaluation' : 'Nouvelle évaluation'}
                  </div>

                  {/* Projet + Note sur la même ligne */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label-text mb-1.5 block">Projet *</label>
                      <select
                        className="input-field text-sm w-full"
                        value={evalForm.projetId}
                        onChange={e => setEvalForm(f => ({ ...f, projetId: e.target.value }))}
                      >
                        <option value="">Sélectionner…</option>
                        {myProjects.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label-text mb-1.5 block">Note *</label>
                      <div className="flex items-center gap-2 h-9">
                        <StarPicker value={evalForm.note} onChange={note => setEvalForm(f => ({ ...f, note }))} size={22} />
                        {evalForm.note > 0 && <span className="text-xs font-bold text-amber-700">{evalForm.note}/5</span>}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label-text mb-1.5 flex items-center gap-1"><TrendingUp size={10} className="text-emerald-500" /> Points forts</label>
                      <textarea
                        rows={3} className="input-field text-sm w-full resize-none"
                        placeholder="Qualités observées, réussites…"
                        value={evalForm.pointsForts}
                        onChange={e => setEvalForm(f => ({ ...f, pointsForts: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="label-text mb-1.5 flex items-center gap-1"><AlertTriangle size={10} className="text-amber-500" /> Points à améliorer</label>
                      <textarea
                        rows={3} className="input-field text-sm w-full resize-none"
                        placeholder="Axes de progression…"
                        value={evalForm.pointsFaibles}
                        onChange={e => setEvalForm(f => ({ ...f, pointsFaibles: e.target.value }))}
                      />
                    </div>
                  </div>

                  <button onClick={submitEval}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors">
                    <Star size={13} /> {editingEvalId ? 'Enregistrer les modifications' : 'Enregistrer l\'évaluation'}
                  </button>
                </div>
              )}

              {/* Liste des évaluations */}
              {evals.length === 0 && !showEvalForm && (
                <div className="text-center py-8 text-sm text-muted">
                  Aucune évaluation. Cliquez sur "Évaluer" pour en ajouter une.
                </div>
              )}
              {evals.map(ev => (
                <div key={ev.id} className="border border-border rounded-2xl p-4 space-y-2.5 hover:border-amber-200 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-ink">{ev.projetNom}</span>
                        <StarDisplay value={ev.note} size={13} />
                        <span className="text-xs font-bold text-amber-700">{ev.note}/5</span>
                      </div>
                      <div className="text-[10px] text-muted mt-0.5">
                        {ev.managerNom} · {ev.date ? new Date(ev.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                      </div>
                    </div>
                    {String(ev.managerId) === String(raterId) && (
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => openEditEval(ev)}
                          className="w-6 h-6 flex items-center justify-center rounded-lg text-muted hover:text-amber-600 hover:bg-amber-50 transition-colors"
                          title="Modifier"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                        </button>
                        <button
                          onClick={() => { deleteEvaluation(employe.id, ev.id); toast.success('Évaluation supprimée') }}
                          className="w-6 h-6 flex items-center justify-center rounded-lg text-muted hover:text-rose-500 hover:bg-rose-50 transition-colors"
                          title="Supprimer"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                  {ev.pointsForts && (
                    <div className="flex items-start gap-2 bg-emerald-50 rounded-xl px-3 py-2">
                      <TrendingUp size={11} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-emerald-800 leading-relaxed">{ev.pointsForts}</p>
                    </div>
                  )}
                  {ev.pointsFaibles && (
                    <div className="flex items-start gap-2 bg-amber-50 rounded-xl px-3 py-2">
                      <AlertTriangle size={11} className="text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800 leading-relaxed">{ev.pointsFaibles}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Formations */}
          {tab === 'formations' && (
            <div className="space-y-2">
              {myFormations.length === 0
                ? <div className="text-center py-10 text-sm text-muted">Aucune formation enregistrée.</div>
                : myFormations.map(f => (
                    <div key={f.id} className="flex items-center gap-3 p-3 bg-paper-warm rounded-xl">
                      <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                        <BookOpen size={14} className="text-violet-600"/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-ink truncate">{f.nom}</div>
                        {f.formateurs && <div className="text-[10px] text-muted">Par {f.formateurs}</div>}
                      </div>
                      {f.date && <span className="text-xs text-muted flex-shrink-0">{fmtShort(f.date)}</span>}
                    </div>
                  ))
              }
            </div>
          )}

          {/* Demandes RH */}
          {tab === 'demandes' && (
            <div className="space-y-2">
              {myDemandes.length === 0
                ? <div className="text-center py-10 text-sm text-muted">Aucune demande RH.</div>
                : myDemandes.map(d => {
                    const SC = { en_attente:'bg-amber-50 text-amber-700 border-amber-200', approuve:'bg-emerald-50 text-emerald-700 border-emerald-200', refuse:'bg-rose-50 text-rose-700 border-rose-200' }
                    const SL = { en_attente:'En attente', approuve:'Approuvée', refuse:'Refusée' }
                    return (
                      <div key={d.id} className="p-3 bg-paper-warm rounded-xl">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-ink">{DEMANDE_LABELS[d.type]||d.type}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${SC[d.statut]||SC.en_attente}`}>{SL[d.statut]||d.statut}</span>
                        </div>
                        {(d.dateDebut||d.dateFin) && (
                          <div className="text-xs text-muted mt-0.5">{fmtDate(d.dateDebut)}{d.dateFin&&d.dateFin!==d.dateDebut?` → ${fmtDate(d.dateFin)}`:''}</div>
                        )}
                        {d.motif && <div className="text-xs text-muted/70 mt-1 italic">"{d.motif}"</div>}
                      </div>
                    )
                  })
              }
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

/* ─── Page principale ───────────────────────────────────────────────────────── */
export default function MyTeamPage() {
  const { profile, isDirector, isDirectorMode } = useAuth()
  const { employes, projects, demandesRH, formations, approveDemandeRHManager, archiveDemandeForManager } = useData()
  const [activeTab, setActiveTab] = useState('equipe')
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [decideModal, setDecideModal] = useState(null)
  const [comment, setComment] = useState('')
  const [showFormationModal, setShowFormationModal] = useState(false)
  const [editingFormation, setEditingFormation] = useState(null)
  const [typeTab, setTypeTab] = useState('externe') // 'externe' | 'interne'
  const [statusFilter, setStatusFilter] = useState('Tous')
  const [selectedProjects, setSelectedProjects] = useState(new Set()) // multi-select project IDs
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false)
  const [showTeamFilterMenu, setShowTeamFilterMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const toggleProject = (id) => setSelectedProjects(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })

  const navigate = useNavigate()
  const myId = String(profile?.id || '')
  const me = employes.find(e => String(e.id) === myId)

  // Projects where I'm the référent OR a team member — directors see all projects
  const myReferentProjects = useMemo(() => {
    if (isDirector || isDirectorMode) return projects
    return projects.filter(p =>
      String(p.architecteReferentId) === myId ||
      (p.equipeProjet || []).map(String).includes(myId)
    )
  }, [projects, myId, isDirector, isDirectorMode])

  // Union of all equipeProjet members + task assignees across my projects (deduplicated)
  const projectTeamMembers = useMemo(() => {
    const ids = new Set()
    const all = []
    myReferentProjects.forEach(p => {
      ;(p.equipeProjet || []).forEach(id => ids.add(String(id)))
      ;(p.tasks || []).forEach(t => { if (t.personnelId) ids.add(String(t.personnelId)) })
    })
    ids.forEach(id => {
      const emp = employes.find(e => String(e.id) === id)
      if (emp && !emp.isDirecteur && String(emp.id) !== myId) all.push(emp)
    })
    return all
  }, [myReferentProjects, employes, myId])

  // Mon Équipe = uniquement les membres des équipes projet
  const myTeam = projectTeamMembers

  // Visible team: filter by selected projects (multi-select)
  const visibleTeam = useMemo(() => {
    if (selectedProjects.size === 0) return myTeam
    const ids = new Set()
    selectedProjects.forEach(projId => {
      const proj = projects.find(p => p.id === projId)
      if (!proj) return
      ;(proj.equipeProjet || []).forEach(id => ids.add(String(id)))
      ;(proj.tasks || []).forEach(t => { if (t.personnelId) ids.add(String(t.personnelId)) })
    })
    return myTeam.filter(e => ids.has(String(e.id)))
  }, [selectedProjects, projects, myTeam])

  const allTasks = useMemo(() =>
    projects.flatMap(p => (p.tasks||[])),
    [projects]
  )

  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
  const mon = (() => { const d = new Date(now); d.setDate(d.getDate()-(d.getDay()===0?6:d.getDay()-1)); d.setHours(0,0,0,0); return d })()
  const sun = (() => { const d = new Date(mon); d.setDate(d.getDate()+6); d.setHours(23,59,59,999); return d })()

  const pendingDemandes = useMemo(() =>
    demandesRH.filter(d =>
      visibleTeam.some(e => String(e.id) === String(d.employeId)) &&
      MANAGER_VISIBLE_TYPES.includes(d.type) &&
      (
        (d.managerApproval === 'en_attente' && ['conge','absence','arret_maladie'].includes(d.type)) ||
        (d.type === 'demission' && d.statut === 'en_attente')
      )
    ), [demandesRH, visibleTeam]
  )

  // Perf data
  const perfData = useMemo(() =>
    visibleTeam.map(e => {
      const eTasks = allTasks.filter(t => String(t.personnelId) === String(e.id))
      const done = eTasks.filter(t => t.statut==='Done').length
      const stuck = eTasks.filter(t => t.statut==='Stuck').length
      const approved = eTasks.filter(t => t.approval==='Approved'||t.approval==='Great work').length
      const late = eTasks.filter(t => t.statut!=='Done' && t.deadline && t.deadline < today).length
      const rate = done > 0 ? Math.round((approved/done)*100) : null
      return { e, total: eTasks.length, done, stuck, late, rate }
    }).sort((a,b) => (b.rate??-1)-(a.rate??-1)),
    [visibleTeam, allTasks, today]
  )

  const handleDecide = (decision) => {
    if (!decideModal) return
    approveDemandeRHManager(decideModal.id, decision, comment.trim()||null)
    toast.success(decision==='approuve' ? 'Congé approuvé — transmis au RH' : 'Congé refusé')
    setDecideModal(null); setComment('')
  }

  const TABS = [
    { id: 'equipe',       label: 'Équipe',      count: visibleTeam.length },
    { id: 'formations',   label: 'Formations',  count: null },
    { id: 'demandes',     label: 'Demandes RH', count: pendingDemandes.length || null },
  ]

  if (myTeam.length === 0) {
    return (
      <div className="p-4 lg:p-10">
        <div className="mb-6">
          <div className="label-text mb-1">Management</div>
          <h1 className="font-display text-3xl lg:text-4xl text-ink">Mon Équipe</h1>
        </div>
        <div className="card p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-electric/10 flex items-center justify-center mx-auto mb-4">
            <Users size={28} className="text-electric/60"/>
          </div>
          <div className="font-semibold text-ink mb-2">Aucun membre assigné</div>
          <p className="text-sm text-muted max-w-xs mx-auto">Le responsable hiérarchique doit vous assigner des collaborateurs depuis l'organigramme RH.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-10 space-y-5">

      {/* Bandeau de filtres */}
      {myReferentProjects.length > 0 && (() => {
        const externes = myReferentProjects.filter(p => p.typeProjet !== 'interne')
        const internes = myReferentProjects.filter(p => p.typeProjet === 'interne')
        // Effective tab: fallback si le type actif n'a pas de projets
        const effectiveTypeTab = (typeTab === 'externe' && externes.length === 0) ? 'interne'
          : (typeTab === 'interne' && internes.length === 0) ? 'externe'
          : typeTab
        const typeProjects = effectiveTypeTab === 'interne' ? internes : externes

        // Projects visible in dropdown: filtered by status
        const dropdownProjects = statusFilter === 'Tous'
          ? typeProjects
          : typeProjects.filter(p => (p.projetStatut || 'En cours') === statusFilter)

        const STATUT_FILTER = [
          { key: 'Tous', dot: null },
          { key: 'En cours', dot: 'bg-electric' },
          { key: 'Projet livré', dot: 'bg-emerald-500' },
          { key: 'Projet suspendu', dot: 'bg-amber-500' },
        ]

        return (
          <div className="space-y-2">

            {/* ── Mobile ── */}
            <div className="lg:hidden space-y-2">
              {/* Ligne 1 : onglets type (seulement si les deux existent) */}
              {externes.length > 0 && internes.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setTypeTab('externe'); setSelectedProjects(new Set()) }}
                    className={`flex flex-1 justify-center items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${effectiveTypeTab === 'externe' ? 'bg-ink text-paper shadow-sm' : 'text-muted hover:text-ink hover:bg-paper-warm'}`}
                  >
                    <Building2 size={14} />
                    Projets externes
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${effectiveTypeTab === 'externe' ? 'bg-white/20 text-white' : 'bg-border text-muted'}`}>{externes.length}</span>
                  </button>
                  <button
                    onClick={() => { setTypeTab('interne'); setSelectedProjects(new Set()) }}
                    className={`flex flex-1 justify-center items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${effectiveTypeTab === 'interne' ? 'bg-violet-600 text-white shadow-sm' : 'text-muted hover:text-ink hover:bg-paper-warm'}`}
                  >
                    <FolderGit2 size={14} />
                    Projets internes
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${effectiveTypeTab === 'interne' ? 'bg-white/20 text-white' : 'bg-border text-muted'}`}>{internes.length}</span>
                  </button>
                </div>
              )}
              {/* Ligne 2 : recherche + filtre statut + filtre projet */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Rechercher un membre..."
                    className="w-full pl-8 pr-3 py-2 text-sm bg-paper-warm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-electric/30 placeholder:text-muted"
                  />
                </div>
                <div className="relative flex-shrink-0">
                  {showTeamFilterMenu && <div className="fixed inset-0 z-10" onClick={() => setShowTeamFilterMenu(false)} />}
                  <button
                    onClick={() => setShowTeamFilterMenu(o => !o)}
                    className={`flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold border transition-all ${statusFilter !== 'Tous' ? 'bg-ink text-paper border-transparent' : 'bg-paper-warm border-border text-muted hover:text-ink'}`}
                  >
                    <Filter size={13} />
                    {statusFilter !== 'Tous' && <span className="max-w-[64px] truncate">{statusFilter}</span>}
                  </button>
                  <AnimatePresence>
                    {showTeamFilterMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.96 }} transition={{ duration: 0.13 }}
                        className="absolute top-full right-0 mt-1.5 bg-white border border-border rounded-2xl shadow-xl overflow-hidden z-20 w-48"
                      >
                        {STATUT_FILTER.map(({ key, dot }) => {
                          const isActive = statusFilter === key
                          return (
                            <button key={key}
                              onClick={() => { setStatusFilter(key); setSelectedProjects(new Set()); setShowTeamFilterMenu(false) }}
                              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold transition-colors text-left ${isActive ? 'bg-ink text-paper' : 'hover:bg-paper-warm text-ink'}`}
                            >
                              {dot && <span className={`w-2 h-2 rounded-full ${dot}`} />}
                              {key}
                            </button>
                          )
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => setProjectDropdownOpen(o => !o)}
                    className={`flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold border transition-all ${selectedProjects.size > 0 ? 'bg-ink text-paper border-transparent' : 'bg-paper-warm border-border text-muted hover:text-ink'}`}
                  >
                    <Users size={13} />
                    {selectedProjects.size > 0 && (
                      <>
                        <span>{selectedProjects.size}</span>
                        <span role="button" tabIndex={0} onClick={e => { e.stopPropagation(); setSelectedProjects(new Set()) }} onKeyDown={e => e.key === 'Enter' && (e.stopPropagation(), setSelectedProjects(new Set()))} className="hover:opacity-70"><X size={10} /></span>
                      </>
                    )}
                  </button>
                  {projectDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setProjectDropdownOpen(false)} />
                      <div className="absolute right-0 top-full mt-2 z-20 bg-paper border border-border rounded-2xl shadow-xl py-2 min-w-[220px] max-w-[280px] max-h-72 overflow-y-auto">
                        {dropdownProjects.length === 0 ? (
                          <p className="text-xs text-muted px-4 py-3 italic">Aucun projet pour ce filtre</p>
                        ) : (
                          dropdownProjects.map(p => {
                            const checked = selectedProjects.has(p.id)
                            const memberCount = (() => {
                              const ids = new Set((p.equipeProjet||[]).map(String))
                              ;(p.tasks||[]).forEach(t => { if (t.personnelId) ids.add(String(t.personnelId)) })
                              return employes.filter(e => ids.has(String(e.id)) && !e.isDirecteur && String(e.id) !== myId).length
                            })()
                            return (
                              <label key={p.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-paper-warm cursor-pointer transition-colors">
                                <input type="checkbox" checked={checked} onChange={() => toggleProject(p.id)} className="w-3.5 h-3.5 accent-ink rounded" />
                                <span className="flex-1 text-xs font-medium text-ink truncate">{p.nom}</span>
                                {memberCount > 0 && <span className="text-[10px] text-muted bg-paper-warm rounded-full px-1.5 py-0.5 flex-shrink-0">{memberCount}</span>}
                              </label>
                            )
                          })
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* ── Desktop ── */}
            <div className="hidden lg:flex flex-wrap items-center gap-2">
              {externes.length > 0 && (
                <button
                  onClick={() => { setTypeTab('externe'); setSelectedProjects(new Set()) }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${effectiveTypeTab === 'externe' ? 'bg-ink text-paper shadow-sm' : 'text-muted hover:text-ink hover:bg-paper-warm'}`}
                >
                  <Building2 size={15} />
                  Projets externes
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${effectiveTypeTab === 'externe' ? 'bg-white/20 text-white' : 'bg-border text-muted'}`}>{externes.length}</span>
                </button>
              )}
              {internes.length > 0 && (
                <button
                  onClick={() => { setTypeTab('interne'); setSelectedProjects(new Set()) }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${effectiveTypeTab === 'interne' ? 'bg-violet-600 text-white shadow-sm' : 'text-muted hover:text-ink hover:bg-paper-warm'}`}
                >
                  <FolderGit2 size={15} />
                  Projets internes
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${effectiveTypeTab === 'interne' ? 'bg-white/20 text-white' : 'bg-border text-muted'}`}>{internes.length}</span>
                </button>
              )}
              <div className="w-px h-6 bg-border flex-shrink-0" />
              <div className="flex items-center gap-1.5 flex-wrap">
                {STATUT_FILTER.map(({ key, dot }) => {
                  const isActive = statusFilter === key
                  return (
                    <button key={key}
                      onClick={() => { setStatusFilter(key); setSelectedProjects(new Set()) }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${isActive ? 'bg-ink text-paper shadow-sm' : 'bg-paper-warm text-muted hover:text-ink hover:bg-white border border-border'}`}
                    >
                      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot} ${isActive ? 'opacity-80' : ''}`} />}
                      {key}
                      {key !== 'Tous' && (
                        <span className={`text-[10px] ${isActive ? 'opacity-60' : 'opacity-50'}`}>
                          {typeProjects.filter(p => (p.projetStatut || 'En cours') === key).length}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              <div className="w-px h-6 bg-border flex-shrink-0" />
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setProjectDropdownOpen(o => !o)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${selectedProjects.size > 0 ? 'bg-ink text-paper border-ink shadow-sm' : 'bg-paper-warm text-muted hover:text-ink hover:bg-white border-border'}`}
                >
                  <ChevronDown size={11} className={`transition-transform ${projectDropdownOpen ? 'rotate-180' : ''}`} />
                  {selectedProjects.size > 0 ? `${selectedProjects.size} projet${selectedProjects.size > 1 ? 's' : ''}` : 'Filtrer par projet'}
                  {selectedProjects.size > 0 && (
                    <span role="button" tabIndex={0} onClick={e => { e.stopPropagation(); setSelectedProjects(new Set()) }} onKeyDown={e => e.key === 'Enter' && (e.stopPropagation(), setSelectedProjects(new Set()))} className="ml-0.5 hover:opacity-70">
                      <X size={10} />
                    </span>
                  )}
                </button>
                {projectDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setProjectDropdownOpen(false)} />
                    <div className="absolute left-0 top-full mt-2 z-20 bg-paper border border-border rounded-2xl shadow-xl py-2 min-w-[220px] max-w-[280px] max-h-72 overflow-y-auto">
                      {dropdownProjects.length === 0 ? (
                        <p className="text-xs text-muted px-4 py-3 italic">Aucun projet pour ce filtre</p>
                      ) : (
                        dropdownProjects.map(p => {
                          const checked = selectedProjects.has(p.id)
                          const memberCount = (() => {
                            const ids = new Set((p.equipeProjet||[]).map(String))
                            ;(p.tasks||[]).forEach(t => { if (t.personnelId) ids.add(String(t.personnelId)) })
                            return employes.filter(e => ids.has(String(e.id)) && !e.isDirecteur && String(e.id) !== myId).length
                          })()
                          return (
                            <label key={p.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-paper-warm cursor-pointer transition-colors">
                              <input type="checkbox" checked={checked} onChange={() => toggleProject(p.id)} className="w-3.5 h-3.5 accent-ink rounded" />
                              <span className="flex-1 text-xs font-medium text-ink truncate">{p.nom}</span>
                              {memberCount > 0 && <span className="text-[10px] text-muted bg-paper-warm rounded-full px-1.5 py-0.5 flex-shrink-0">{memberCount}</span>}
                            </label>
                          )
                        })
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>
        )
      })()}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label:'Membres',            value: visibleTeam.length,                                          color:'#06B6D4', icon:Users      },
          { label:'Actifs',             value: visibleTeam.filter(e=>e.statut==='actif').length,            color:'#10B981', icon:CheckCircle2},
          { label:'En congé',           value: visibleTeam.filter(e=>e.statut==='conge').length,            color:'#F59E0B', icon:Sun        },
          { label:'Approbations en att',value: pendingDemandes.length, color: pendingDemandes.length>0?'#F43F5E':'#10B981', icon:ClipboardList},
        ].map((k,i) => {
          const Icon = k.icon
          return (
            <div key={i} className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:`${k.color}18`}}>
                <Icon size={18} style={{color:k.color}} strokeWidth={1.8}/>
              </div>
              <div>
                <div className="text-xs text-muted leading-tight">{k.label}</div>
                <div className="font-display text-2xl text-ink leading-none">{k.value}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Tabs */}
      <div className="card overflow-hidden">
        <div className="flex border-b border-border overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-5 py-3.5 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors ${
                activeTab===t.id ? 'border-electric text-electric' : 'border-transparent text-muted hover:text-ink'
              }`}>
              {t.label}
              {t.count!=null&&t.count>0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab===t.id?'bg-electric/10 text-electric':'bg-paper-warm text-muted'}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-5">

          {/* Tab Équipe */}
          {activeTab === 'equipe' && (
            <div className="space-y-2">
              {visibleTeam.filter(e => !searchQuery || e.nom.toLowerCase().includes(searchQuery.toLowerCase())).map(e => {
                const tToday = allTasks.filter(t=>String(t.personnelId)===String(e.id)&&t.deadline===today).length
                const tWeek  = allTasks.filter(t=>{
                  if(String(t.personnelId)!==String(e.id)||!t.deadline) return false
                  const d=new Date(t.deadline+'T00:00:00'); return d>=mon&&d<=sun
                }).length
                const total = allTasks.filter(t=>String(t.personnelId)===String(e.id)).length
                const done  = allTasks.filter(t=>String(t.personnelId)===String(e.id)&&t.statut==='Done').length
                const bal = computeCongesBalance(e, demandesRH)
                return (
                  <div key={e.id} onClick={() => setSelectedEmployee(e)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-paper-warm transition-colors cursor-pointer border border-transparent hover:border-border">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{background:e.couleur||'#3B7BF6'}}>
                      {getInitials(e.nom)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-ink">{e.nom}</span>
                        <StatutBadge statut={e.statut}/>
                      </div>
                      <div className="text-xs text-muted">{e.poste}{e.dept&&e.dept!=='—'?` · ${e.dept}`:''}</div>
                    </div>
                    <div className="hidden sm:flex items-center gap-4 flex-shrink-0 text-center">
                      <div>
                        <div className="text-xs font-semibold text-ink">{done}/{total}</div>
                        <div className="text-[9px] text-muted">Tâches</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-ink">{tToday}</div>
                        <div className="text-[9px] text-muted">Auj.</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-ink">{tWeek}</div>
                        <div className="text-[9px] text-muted">Sem.</div>
                      </div>
                      <div>
                        <div className={`text-xs font-semibold ${!bal?'text-muted':bal.balance<5?'text-rose-600':bal.balance<10?'text-amber-600':'text-emerald-600'}`}>
                          {bal?`${bal.balance} j`:'—'}
                        </div>
                        <div className="text-[9px] text-muted">Congés</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={ev => { ev.stopPropagation(); navigate('/app/messages', { state: { openDm: String(e.id) } }) }}
                        className="w-7 h-7 rounded-lg hover:bg-electric/10 flex items-center justify-center text-muted hover:text-electric transition-colors"
                        title={`Message à ${e.prenom || e.nom}`}
                      >
                        <MessageSquare size={13}/>
                      </button>
                      <ChevronRight size={14} className="text-muted"/>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Tab Performance */}
          {activeTab === 'performance' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left label-text pb-3 font-medium">Collaborateur</th>
                    <th className="text-center label-text pb-3 font-medium">Tâches</th>
                    <th className="text-center label-text pb-3 font-medium">Terminées</th>
                    <th className="text-center label-text pb-3 font-medium">Taux approbation</th>
                    <th className="text-center label-text pb-3 font-medium">Bloquées</th>
                    <th className="text-center label-text pb-3 font-medium">En retard</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {perfData.map(({ e, total, done, stuck, late, rate }) => (
                    <tr key={e.id} className="hover:bg-paper-warm transition-colors cursor-pointer"
                      onClick={() => setSelectedEmployee(e)}>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                            style={{background:e.couleur||'#3B7BF6'}}>
                            {getInitials(e.nom)}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-ink">{e.nom}</div>
                            <div className="text-[10px] text-muted">{e.poste}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-center py-3 text-sm font-semibold text-ink">{total}</td>
                      <td className="text-center py-3"><span className={`text-sm font-semibold ${done>0?'text-emerald-600':'text-muted'}`}>{done}</span></td>
                      <td className="text-center py-3">
                        {rate!==null ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 bg-paper rounded-full h-1.5 overflow-hidden">
                              <div className={`h-full rounded-full ${rate>=80?'bg-emerald-500':rate>=50?'bg-amber-400':'bg-rose-400'}`} style={{width:`${rate}%`}}/>
                            </div>
                            <span className={`text-xs font-bold ${rate>=80?'text-emerald-600':rate>=50?'text-amber-600':'text-rose-600'}`}>{rate}%</span>
                          </div>
                        ) : <span className="text-xs text-muted">—</span>}
                      </td>
                      <td className="text-center py-3">
                        {stuck>0?<span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">{stuck}</span>:<span className="text-xs text-muted">0</span>}
                      </td>
                      <td className="text-center py-3">
                        {late>0?<span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">{late}</span>:<span className="text-xs text-muted">0</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab Formations */}
          {activeTab === 'formations' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  onClick={() => { setEditingFormation(null); setShowFormationModal(true) }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-colors"
                >
                  <BookOpen size={13} /> Nouvelle formation
                </button>
              </div>

              {formations.filter(f =>
                visibleTeam.some(e => (f.personnes||[]).map(String).includes(String(e.id)))
              ).length === 0
                ? <div className="text-center py-8 text-sm text-muted">Aucune formation pour votre équipe.</div>
                : formations
                    .filter(f => visibleTeam.some(e => (f.personnes||[]).map(String).includes(String(e.id))))
                    .map(f => {
                      const participants = visibleTeam.filter(e => (f.personnes||[]).map(String).includes(String(e.id)))
                      return (
                        <div key={f.id} className="p-4 bg-paper-warm rounded-xl border border-border hover:border-violet-200 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                              <BookOpen size={14} className="text-violet-600"/>
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-semibold text-ink">{f.nom}</div>
                              {f.formateurs&&<div className="text-xs text-muted">Par {f.formateurs}</div>}
                              {f.date&&<div className="text-xs text-muted">{fmtDate(f.date)}{f.heureDebut?` · ${f.heureDebut}–${f.heureFin||''}`:''}</div>}
                              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                {participants.map(e => (
                                  <span key={e.id} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-electric/10 text-electric">
                                    {e.prenom||e.nom}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <button
                              onClick={() => { setEditingFormation(f); setShowFormationModal(true) }}
                              className="w-7 h-7 rounded-lg hover:bg-violet-100 flex items-center justify-center text-muted hover:text-violet-600 transition-colors flex-shrink-0"
                            >
                              <BookOpen size={13}/>
                            </button>
                          </div>
                        </div>
                      )
                    })
              }
            </div>
          )}

          {/* Tab Demandes RH */}
          {activeTab === 'demandes' && (
            <div className="space-y-2">
              {(() => {
                const visibleDemandes = demandesRH.filter(d =>
                  visibleTeam.some(e => String(e.id)===String(d.employeId)) &&
                  MANAGER_VISIBLE_TYPES.includes(d.type) &&
                  !(d.archivedByManagers||[]).includes(myId)
                )
                if (visibleDemandes.length === 0) return (
                  <div className="text-center py-10 text-sm text-muted">Aucune demande pour votre équipe.</div>
                )
                const SC = { en_attente:'bg-amber-50 text-amber-700 border-amber-200', approuve:'bg-emerald-50 text-emerald-700 border-emerald-200', refuse:'bg-rose-50 text-rose-700 border-rose-200' }
                const SL = { en_attente:'En attente', approuve:'Approuvée', refuse:'Refusée' }
                return visibleDemandes.map(d => {
                  const emp = visibleTeam.find(e => String(e.id)===String(d.employeId))
                  const isLeave = ['conge','absence','arret_maladie'].includes(d.type)
                  const isDemission = d.type === 'demission'
                  const managerDecided = d.managerApproval === 'approuve' || d.managerApproval === 'refuse'
                  const managerPending = d.managerApproval === 'en_attente' && isLeave
                  return (
                    <div key={d.id} className={`p-3 rounded-xl border ${managerPending?'border-amber-200 bg-amber-50/20':'border-border bg-paper-warm'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                          style={{background:emp?.couleur||'#06B6D4'}}>
                          {getInitials(emp?.nom||d.employeNom)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-ink">{emp?.nom||d.employeNom}</span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${isDemission?'bg-rose-50 text-rose-700 border-rose-200':SC[d.statut]||SC.en_attente}`}>
                              {isDemission ? 'Démission' : (DEMANDE_LABELS[d.type]||d.type)}
                            </span>
                            {!isDemission && (
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${SC[d.managerApproval==='approuve'?'approuve':d.managerApproval==='refuse'?'refuse':'en_attente']}`}>
                                {d.managerApproval==='approuve'?'Approuvé par vous':d.managerApproval==='refuse'?'Refusé par vous':'En attente'}
                              </span>
                            )}
                          </div>
                          {(d.dateDebut||d.dateFin) && (
                            <div className="text-[10px] text-muted mt-0.5">{fmtDate(d.dateDebut)}{d.dateFin&&d.dateFin!==d.dateDebut?` → ${fmtDate(d.dateFin)}`:''}</div>
                          )}
                          {d.motif && <div className="text-[10px] text-muted/70 italic mt-0.5">"{d.motif}"</div>}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {/* Approve/Refuse pour congés — toujours visibles pour permettre de changer d'avis */}
                          {isLeave && (
                            <>
                              <button
                                onClick={() => { approveDemandeRHManager(d.id, 'approuve', null); toast.success('Approuvé — transmis au RH') }}
                                className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-colors ${d.managerApproval === 'approuve' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-200'}`}
                                title="Approuver"
                              ><CheckCircle size={13}/></button>
                              <button
                                onClick={() => { approveDemandeRHManager(d.id, 'refuse', null); toast.success('Refusé') }}
                                className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-colors ${d.managerApproval === 'refuse' ? 'bg-rose-500 text-white border-rose-600' : 'bg-rose-50 text-rose-600 hover:bg-rose-100 border-rose-200'}`}
                                title="Refuser"
                              ><X size={13}/></button>
                            </>
                          )}
                          {isDemission && (
                            <span className="text-[10px] font-semibold text-muted">RH requis</span>
                          )}
                          {/* Archiver */}
                          <button
                            onClick={() => { archiveDemandeForManager(d.id, myId); toast.success('Demande archivée') }}
                            className="w-7 h-7 rounded-lg text-muted hover:text-ink hover:bg-paper-warm flex items-center justify-center transition-colors"
                            title="Archiver (masquer)"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Modal détail employé */}
      <AnimatePresence>
        {selectedEmployee && (
          <EmployeeDetailModal
            employe={selectedEmployee}
            projects={projects}
            demandesRH={demandesRH}
            formations={formations}
            raterId={myId}
            raterNom={me?.nom || profile?.full_name || 'Responsable'}
            onClose={() => setSelectedEmployee(null)}
          />
        )}
      </AnimatePresence>

      {/* Modal formation */}
      <AnimatePresence>
        {showFormationModal && (
          <FormationModal
            employes={employes}
            formation={editingFormation}
            onClose={() => { setShowFormationModal(false); setEditingFormation(null) }}
          />
        )}
      </AnimatePresence>

      {/* Modal décision congé */}
      <AnimatePresence>
        {decideModal && (() => {
          const emp = myTeam.find(e => String(e.id)===String(decideModal.employeId))
          return (
            <motion.div
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
              onClick={e => e.target===e.currentTarget && setDecideModal(null)}>
              <motion.div
                initial={{ scale:0.95, y:10 }} animate={{ scale:1, y:0 }} exit={{ scale:0.95, y:10 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <div className="font-semibold text-ink text-sm">Décision sur la demande</div>
                  <button onClick={() => setDecideModal(null)} className="w-8 h-8 rounded-lg hover:bg-paper-warm flex items-center justify-center text-muted"><X size={15}/></button>
                </div>
                <div className="p-5 space-y-4">
                  <div className="p-3 bg-paper-warm rounded-xl">
                    <div className="text-sm font-semibold text-ink">{emp?.nom||decideModal.employeNom}</div>
                    <div className="text-xs text-muted mt-0.5">{DEMANDE_LABELS[decideModal.type]} · {fmtDate(decideModal.dateDebut)}{decideModal.dateFin&&decideModal.dateFin!==decideModal.dateDebut?` → ${fmtDate(decideModal.dateFin)}`:''}</div>
                    {decideModal.motif&&<div className="text-xs text-muted/70 mt-1 italic">"{decideModal.motif}"</div>}
                  </div>
                  <div>
                    <label className="label-text mb-1.5 block">Commentaire (optionnel)</label>
                    <textarea className="input-field resize-none text-sm" rows={2} placeholder="Motif de votre décision…" value={comment} onChange={e=>setComment(e.target.value)}/>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted bg-electric/5 border border-electric/20 rounded-xl px-3 py-2">
                    Votre approbation sera transmise au RH pour validation finale.
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleDecide('refuse')}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200">
                      <X size={13}/> Refuser
                    </button>
                    <button onClick={() => handleDecide('approuve')}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200">
                      <CheckCircle size={13}/> Approuver
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )
        })()}
      </AnimatePresence>
    </div>
  )
}
