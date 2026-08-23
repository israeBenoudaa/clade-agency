import { useState, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Pencil, X, CheckCircle,
  Lock, Unlock, Trash2, Plus, ChevronLeft, ChevronRight,
  Clock, Briefcase, TrendingUp, ShieldCheck, Eye, EyeOff, ExternalLink, BookOpen,
  AlertTriangle, CalendarDays, TrendingDown,
} from 'lucide-react'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { verifyDirectorPassword } from '../../lib/supabaseAuth'
import { computeCongesBalance } from '../../utils/conges'
import toast from 'react-hot-toast'
import SelectField from '../../components/SelectField'
import PayslipSection from '../../components/PayslipSection'
import PrimesSection from '../../components/PrimesSection'

const OT_THRESHOLD_MS = 10 * 3600 * 1000

function fmtMs(ms) {
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000)
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

// ── helpers ──────────────────────────────────────────────────────────────────
const EVENT_COLORS = ['#3B82F6', '#06B6D4', '#10B981', '#F59E0B', '#8B5CF6', '#F43F5E']

function getInitials(nom) {
  const parts = (nom || '').trim().split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return (nom || '??').slice(0, 2).toUpperCase()
}

function statutBadge(statut) {
  if (statut === 'actif') return 'bg-emerald-50 text-emerald-700'
  if (statut === 'bloque') return 'bg-rose-50 text-rose-700'
  if (statut === 'conge') return 'bg-amber-50 text-amber-700'
  return 'bg-paper-warm text-muted'
}

function statutLabel(statut) {
  if (statut === 'actif') return 'Actif'
  if (statut === 'bloque') return 'Bloqué'
  if (statut === 'conge') return 'En congé'
  return statut
}

function getWeekDates(weekOffset = 0) {
  const now = new Date()
  const day = now.getDay() === 0 ? 6 : now.getDay() - 1
  const mon = new Date(now)
  mon.setDate(now.getDate() - day + weekOffset * 7)
  mon.setHours(0, 0, 0, 0)
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon)
    d.setDate(mon.getDate() + i)
    days.push(d)
  }
  return days
}

function toISO(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function calcDuration(start, end) {
  return Math.max(0, timeToMinutes(end) - timeToMinutes(start))
}

function formatHours(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

function groupByProject(tasks) {
  const map = {}
  tasks.forEach(t => {
    if (!map[t.projectNom]) map[t.projectNom] = []
    map[t.projectNom].push(t)
  })
  return Object.entries(map).map(([nom, tasks]) => ({ nom, tasks }))
}

function taskStatutStyle(s) {
  if (s === 'Done') return 'bg-emerald-100 text-emerald-700'
  if (s === 'Working on it') return 'bg-blue-100 text-blue-700'
  if (s === 'Stuck') return 'bg-rose-100 text-rose-700'
  return 'bg-amber-100 text-amber-700'
}

function taskStatutLabel(s) {
  if (s === 'Done') return 'Terminé'
  if (s === 'Working on it') return 'En cours'
  if (s === 'Stuck') return 'Bloqué'
  return s
}


function getISOWeekKey(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay() || 7
  d.setDate(d.getDate() + 4 - day)
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

function fmtH(h) {
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  if (mins === 0) return `${hrs}h`
  return `${hrs}h${String(mins).padStart(2, '0')}`
}

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8) // 8..18
const ROW_HEIGHT = 56 // px per hour

// ── Small modal to add planning event ────────────────────────────────────────
function AddEventModal({ date, onClose, onAdd }) {
  const [form, setForm] = useState({
    titre: '',
    heureDebut: '09:00',
    heureFin: '10:00',
    couleur: EVENT_COLORS[0],
  })

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target?.value ?? e }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.titre.trim()) { toast.error('Titre requis'); return }
    onAdd({
      id: `ev${Date.now()}`,
      titre: form.titre.trim(),
      date,
      heureDebut: form.heureDebut,
      heureFin: form.heureFin,
      couleur: form.couleur,
    })
    onClose()
  }

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm z-[60]"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold text-ink text-sm">Nouvel événement</div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-paper-warm flex items-center justify-center text-muted">
              <X size={14} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="label-text mb-1.5 block">Titre *</label>
              <input className="input-field" placeholder="Réunion client..." value={form.titre} onChange={set('titre')} autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-text mb-1.5 block">Début</label>
                <input type="time" className="input-field" value={form.heureDebut} onChange={set('heureDebut')} />
              </div>
              <div>
                <label className="label-text mb-1.5 block">Fin</label>
                <input type="time" className="input-field" value={form.heureFin} onChange={set('heureFin')} />
              </div>
            </div>
            <div>
              <label className="label-text mb-1.5 block">Couleur</label>
              <div className="flex gap-2 flex-wrap">
                {EVENT_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, couleur: c }))}
                    className={`w-7 h-7 rounded-full transition-all ${form.couleur === c ? 'ring-2 ring-offset-2 ring-ink scale-110' : ''}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center text-sm">Annuler</button>
              <button type="submit" className="btn-primary flex-1 justify-center text-sm">
                <Plus size={13} /> Ajouter
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

// ── DirectorPinGate ───────────────────────────────────────────────────────────
function DirectorPinGate({ onUnlock }) {
  const { profile } = useAuth()
  const [step, setStep] = useState('password') // 'password' | 'pin'
  const [pwd, setPwd] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [pins, setPins] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const pinRefs = useRef([])

  const submitPassword = async (e) => {
    e.preventDefault()
    const ok = await verifyDirectorPassword(profile.email, pwd)
    if (ok) {
      setError('')
      setStep('pin')
      setTimeout(() => pinRefs.current[0]?.focus(), 100)
    } else {
      setError('Mot de passe incorrect')
      setPwd('')
    }
  }

  const handlePinChange = (i, val) => {
    const digit = val.replace(/\D/, '').slice(-1)
    const next = [...pins]
    next[i] = digit
    setPins(next)
    if (digit && i < 5) pinRefs.current[i + 1]?.focus()
    if (i === 5 && digit) {
      const code = [...next].join('')
      supabase.rpc('verify_director_pin', { input_pin: code }).then(({ data }) => {
        if (data) {
          setError('')
          onUnlock()
        } else {
          setError('PIN incorrect')
          setPins(['', '', '', '', '', ''])
          setTimeout(() => pinRefs.current[0]?.focus(), 100)
        }
      })
    }
  }

  const handlePinKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !pins[i] && i > 0) pinRefs.current[i - 1]?.focus()
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl border border-border w-full max-w-sm p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-electric/10 flex items-center justify-center mb-4">
            <ShieldCheck size={28} className="text-electric" strokeWidth={1.8} />
          </div>
          <h2 className="font-display text-2xl text-ink text-center">Accès sécurisé</h2>
          <p className="text-sm text-muted text-center mt-1">
            {step === 'password' ? 'Saisir le mot de passe du directeur' : 'Saisir le code PIN (6 chiffres)'}
          </p>
        </div>

        {step === 'password' && (
          <form onSubmit={submitPassword} className="space-y-4">
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                className="input-field pr-10"
                placeholder="Mot de passe"
                value={pwd}
                onChange={e => setPwd(e.target.value)}
                autoFocus
              />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink">
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
            <button type="submit" className="btn-primary w-full justify-center">Continuer</button>
          </form>
        )}

        {step === 'pin' && (
          <div className="space-y-4">
            <div className="flex justify-center gap-2">
              {pins.map((digit, i) => (
                <input
                  key={i}
                  ref={el => (pinRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handlePinChange(i, e.target.value)}
                  onKeyDown={e => handlePinKeyDown(i, e)}
                  className={`w-11 h-12 text-center text-xl font-bold rounded-xl border-2 outline-none transition-colors bg-paper-warm
                    ${digit ? 'border-electric text-electric' : 'border-border text-ink'}
                    focus:border-electric`}
                />
              ))}
            </div>
            {error && <p className="text-xs text-rose-600 font-medium text-center">{error}</p>}
            <button onClick={() => { setStep('password'); setPwd(''); setPins(['', '', '', '', '', '']); setError('') }}
              className="w-full text-xs text-muted hover:text-ink text-center transition-colors">
              ← Retour au mot de passe
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}

// ── AddHeureSupModal ─────────────────────────────────────────────────────────
function AddHeureSupModal({ onClose, onAdd }) {
  const [form, setForm] = useState({
    type: 'jour',
    date: new Date().toISOString().slice(0, 10),
    description: '',
    customHours: '',
  })
  const set = k => e => setForm(f => ({ ...f, [k]: e.target?.value ?? e }))
  const value = form.type === 'jour' ? 8.5 : form.type === 'demi' ? 4.25 : parseFloat(form.customHours) || 0

  const handleSubmit = e => {
    e.preventDefault()
    if (!form.date) { toast.error('Date requise'); return }
    if (value <= 0) { toast.error('Valeur invalide'); return }
    const defaultDesc = form.type === 'jour' ? 'Journée supplémentaire' : form.type === 'demi' ? 'Demi-journée supplémentaire' : 'Heures supplémentaires'
    onAdd({ date: form.date, description: form.description.trim() || defaultDesc, value, type: form.type })
    onClose()
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm z-[60]"
        onClick={e => e.target === e.currentTarget && onClose()}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }} transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold text-ink text-sm">Heures supplémentaires</div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-paper-warm flex items-center justify-center text-muted"><X size={14} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="label-text mb-1.5 block">Type</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { k: 'jour',   label: 'Journée',      sub: '8h30' },
                  { k: 'demi',   label: 'Demi-journée', sub: '4h15' },
                  { k: 'custom', label: 'Personnalisé', sub: 'en heures' },
                ].map(opt => (
                  <button key={opt.k} type="button" onClick={() => setForm(f => ({ ...f, type: opt.k }))}
                    className={`p-3 rounded-xl border text-center transition-colors ${form.type === opt.k ? 'border-electric bg-electric/5' : 'border-border hover:border-electric/40'}`}>
                    <div className="text-xs font-semibold text-ink">{opt.label}</div>
                    <div className="text-[10px] text-muted">{opt.sub}</div>
                  </button>
                ))}
              </div>
            </div>
            {form.type === 'custom' && (
              <div>
                <label className="label-text mb-1.5 block">Heures</label>
                <input type="number" step="0.5" min="0.5" className="input-field" placeholder="ex. 2.5"
                  value={form.customHours} onChange={set('customHours')} autoFocus />
              </div>
            )}
            <div>
              <label className="label-text mb-1.5 block">Date</label>
              <input type="date" className="input-field" value={form.date} onChange={set('date')} />
            </div>
            <div>
              <label className="label-text mb-1.5 block">Description <span className="text-muted font-normal">(optionnel)</span></label>
              <input type="text" className="input-field" placeholder="ex. Chantier exceptionnel"
                value={form.description} onChange={set('description')} />
            </div>
            {value > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                <span className="text-xs text-amber-700 font-semibold">+ {fmtH(value)} ajoutées au total HS</span>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Annuler</button>
              <button type="submit" className="btn-primary flex-1 justify-center"><Plus size={13} /> Ajouter</button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function EmployeDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    employes, updateEmploye, deleteEmploye,
    addPlanningEvent, deletePlanningEvent, updatePlanningEvent, addCongeEmploye,
    addHeureSupManuelle, deleteHeureSupManuelle,
    projects, formations, demandesRH, updateDemandeRH, updateTask,
    addTransaction, removeTransaction,
  } = useData()

  const employe = employes.find(e => String(e.id) === id)

  const [unlocked, setUnlocked] = useState(!employe?.isDirecteur)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState(null)
  const [weekOffset, setWeekOffset] = useState(0)
  const [addEventDate, setAddEventDate] = useState(null)
  const [editingEvent, setEditingEvent] = useState(null)
  const [showCongeForm, setShowCongeForm] = useState(false)
  const [congeForm, setCongeForm] = useState({ type: 'Congés annuels', debut: '', fin: '' })
  const [taskStatusDropdown, setTaskStatusDropdown] = useState(null)
  const [showAddHeureSup, setShowAddHeureSup] = useState(false)
  const [sessionWeekOffset, setSessionWeekOffset] = useState(0)

  const autoOtHours = useMemo(() => {
    const allSessions = employe?.workSessions || []
    if (allSessions.length === 0) return 0
    const WEEKLY_MS = 44 * 3600000
    const weeklyMs = {}
    allSessions.forEach(s => {
      if (!s.date) return
      const k = getISOWeekKey(s.date)
      weeklyMs[k] = (weeklyMs[k] || 0) + (s.workedMs || 0)
    })
    return Object.values(weeklyMs).reduce((sum, ms) => sum + Math.max(0, ms - WEEKLY_MS), 0) / 3600000
  }, [employe])

  // Formation events for this employee
  const formationEvents = useMemo(() =>
    formations
      .filter(f => (f.personnes || []).map(String).includes(String(employe?.id)))
      .map(f => ({
        id: `form_${f.id}`,
        titre: f.nom,
        date: f.date,
        heureDebut: f.heureDebut || '09:00',
        heureFin: f.heureFin || '17:00',
        couleur: '#7C3AED',
        isFormation: true,
        formationData: f,
      })),
    [formations, employe]
  )

  const weekDays = useMemo(() => getWeekDates(weekOffset), [weekOffset])

  if (!employe) {
    return (
      <div className="p-10 text-center">
        <div className="font-display text-3xl text-ink mb-3">Employé introuvable</div>
        <button onClick={() => navigate('/app/hr')} className="btn-ghost">
          <ArrowLeft size={15} /> Retour à l'équipe
        </button>
      </div>
    )
  }

  if (employe.isDirecteur && !unlocked) {
    return (
      <div className="p-4 lg:p-10">
        <button onClick={() => navigate('/app/hr')} className="flex items-center gap-2 text-sm text-muted hover:text-ink transition-colors mb-6">
          <ArrowLeft size={15} /> Retour à l'équipe
        </button>
        <DirectorPinGate onUnlock={() => setUnlocked(true)} />
      </div>
    )
  }

  const allTasks = projects.flatMap(p => (p.tasks || []).map(t => ({ ...t, projectNom: p.nom, projectId: p.id })))
  const empTasks = allTasks.filter(t => t.personnelId === employe.id)

  const empDemandes = (demandesRH || []).filter(d => String(d.employeId) === String(employe.id))
  const approvedLeaves = empDemandes.filter(d => d.statut === 'approuve' && ['conge', 'arret_maladie', 'absence'].includes(d.type))
  const congesBalance = computeCongesBalance(employe, demandesRH)

  const isOnLeave = (iso) => approvedLeaves.some(d => {
    const start = d.dateDebut || ''
    const end = d.dateFin || d.dateDebut || ''
    return iso >= start && iso <= end
  })

  const today = new Date()
  const todayISO = toISO(today)

  // current week (no offset)
  const currentWeekDays = getWeekDates(0)
  const currentMonISO = toISO(currentWeekDays[0])
  const currentSunISO = toISO(currentWeekDays[6])

  // current month
  const thisYear = today.getFullYear()
  const thisMonth = today.getMonth()

  const planningWeekEvents = (employe.planning || []).filter(ev => {
    const d = ev.date
    return d >= currentMonISO && d <= currentSunISO
  })
  const planningMonthEvents = (employe.planning || []).filter(ev => {
    const d = new Date(ev.date)
    return d.getFullYear() === thisYear && d.getMonth() === thisMonth
  })

  const weekHours = planningWeekEvents.reduce((acc, ev) => acc + calcDuration(ev.heureDebut, ev.heureFin), 0)
  const monthHours = planningMonthEvents.reduce((acc, ev) => acc + calcDuration(ev.heureDebut, ev.heureFin), 0)

  const weekTasks = empTasks.filter(t => {
    if (!t.deadline) return false
    return t.deadline >= currentMonISO && t.deadline <= currentSunISO
  })
  const weekProjectGroups = groupByProject(weekTasks)

  const monthTasks = empTasks.filter(t => {
    if (!t.deadline) return false
    const d = new Date(t.deadline)
    return d.getFullYear() === thisYear && d.getMonth() === thisMonth
  })
  const monthProjectGroups = groupByProject(monthTasks)

  // ── Overtime breakdown (8h30/jour, no rounding) ──
  const HOURS_PER_DAY = 8.5
  const HOURS_PER_HALF_DAY = 4.25
  const manualHsEntries = [...(employe.heuresSupManual || [])].sort((a, b) => b.date.localeCompare(a.date))
  const manualOtHours = manualHsEntries.reduce((s, e) => s + (e.value || 0), 0)
  const totalOtHours = autoOtHours + manualOtHours
  const otFullDays = Math.floor(totalOtHours / HOURS_PER_DAY)
  const otRem1 = totalOtHours - otFullDays * HOURS_PER_DAY
  const otHalfDays = Math.floor(otRem1 / HOURS_PER_HALF_DAY)
  const otRemHours = otRem1 - otHalfDays * HOURS_PER_HALF_DAY

  // ── handlers ──
  const handleToggleBlock = () => {
    const next = employe.statut === 'bloque' ? 'actif' : 'bloque'
    updateEmploye(employe.id, { statut: next })
    toast(next === 'bloque' ? 'Accès bloqué' : 'Accès rétabli', { icon: next === 'bloque' ? '🔒' : '🔓' })
  }

  const handleDelete = () => {
    toast((t) => (
      <div className="flex items-center gap-3">
        <span className="text-sm">Supprimer <strong>{employe.nom}</strong> ?</span>
        <button
          onClick={() => {
            deleteEmploye(employe.id)
            toast.dismiss(t.id)
            toast.success('Employé supprimé')
            navigate('/app/hr')
          }}
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

  const handleEditSave = () => {
    const nom = `${(editForm.prenom || '').trim()} ${(editForm.nomFamille || '').trim()}`.trim() || employe.nom
    const av = ((editForm.prenom?.[0] || '') + (editForm.nomFamille?.[0] || '')).toUpperCase()
    updateEmploye(employe.id, {
      ...editForm,
      nom,
      avatar: av || employe.avatar,
      salaireNet: editForm.salaireNet !== '' ? Number(editForm.salaireNet) || 0 : 0,
      salaireBrut: editForm.salaireBrut !== '' ? Number(editForm.salaireBrut) || 0 : 0,
      modeRemuneration: editForm.modeRemuneration || 'mensuel',
    })
    setEditMode(false)
    setEditForm(null)
    toast.success('Informations mises à jour')
  }

  const handleEditCancel = () => {
    setEditMode(false)
    setEditForm(null)
  }

  const startEdit = () => {
    setEditForm({
      prenom: employe.prenom || '',
      nomFamille: employe.nomFamille || '',
      email: employe.email || '',
      telephone: employe.telephone || '',
      adresse: employe.adresse || '',
      cin: employe.cin || '',
      contrat: employe.contrat || 'CDI',
      modeRemuneration: employe.modeRemuneration || 'mensuel',
      salaireNet: employe.salaireNet || '',
      salaireBrut: employe.salaireBrut || '',
      poste: employe.poste || '',
      dept: employe.dept || '',
      dateEmbauche: employe.dateEmbauche || '',
    })
    setEditMode(true)
  }

  const setEF = (k) => (e) => setEditForm(f => ({ ...f, [k]: e?.target?.value ?? e }))

  const handleAddConge = (e) => {
    e.preventDefault()
    if (!congeForm.debut || !congeForm.fin) { toast.error('Dates requises'); return }
    const d1 = new Date(congeForm.debut)
    const d2 = new Date(congeForm.fin)
    const duree = Math.max(1, Math.round((d2 - d1) / 86400000) + 1)
    addCongeEmploye(employe.id, {
      id: `c${Date.now()}`,
      type: congeForm.type,
      debut: congeForm.debut,
      fin: congeForm.fin,
      duree,
      statut: 'En attente',
    })
    setCongeForm({ type: 'Congés annuels', debut: '', fin: '' })
    setShowCongeForm(false)
    toast.success('Absence ajoutée')
  }

  const handleDeleteEvent = (ev) => {
    deletePlanningEvent(employe.id, ev.id)
    setEditingEvent(null)
  }

  const handleUpdateEvent = (updates) => {
    if (!editingEvent) return
    updatePlanningEvent(employe.id, editingEvent.id, updates)
    setEditingEvent(null)
  }

  // Planning grid helpers
  const startHour = 8
  const endHour = 18
  const totalHours = endHour - startHour

  const eventStyle = (ev) => {
    const startMin = timeToMinutes(ev.heureDebut) - startHour * 60
    const duration = calcDuration(ev.heureDebut, ev.heureFin)
    const top = (startMin / 60) * ROW_HEIGHT
    const height = Math.max((duration / 60) * ROW_HEIGHT, 20)
    return { top, height }
  }

  const weekLabel = `${weekDays[0].toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} au ${weekDays[6].toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`

  const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

  const congeStatutBadge = (s) => {
    if (s === 'Approuvé') return 'bg-emerald-50 text-emerald-700'
    if (s === 'Refusé') return 'bg-rose-50 text-rose-700'
    return 'bg-amber-50 text-amber-700'
  }

  return (
    <div className="p-4 lg:p-10 space-y-6">
      {/* Breadcrumb */}
      <button
        onClick={() => navigate('/app/hr')}
        className="flex items-center gap-2 text-sm text-muted hover:text-ink transition-colors"
      >
        <ArrowLeft size={15} /> Retour à l'équipe
      </button>

      {/* ── Header card ── */}
      <div className="card p-5 lg:p-7">
        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
          {/* Avatar + info */}
          <div className="flex items-start gap-4 flex-1">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-ink to-electric flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xl font-bold">{getInitials(employe.nom)}</span>
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-display text-2xl lg:text-3xl text-ink">{employe.nom}</h1>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statutBadge(employe.statut)}`}>
                  {statutLabel(employe.statut)}
                </span>
              </div>
              <div className="text-sm text-muted mt-1">{employe.poste}</div>
              <div className="text-xs text-muted mt-0.5">{employe.dept} · {employe.contrat}</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 flex-shrink-0">
            {!employe.isDirecteur && (
              <div className="flex gap-2 flex-wrap">
                {employe.statut === 'bloque' ? (
                  <button
                    onClick={handleToggleBlock}
                    className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                  >
                    <Unlock size={13} /> Débloquer
                  </button>
                ) : (
                  <button
                    onClick={handleToggleBlock}
                    className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
                  >
                    <Lock size={13} /> Bloquer l'accès
                  </button>
                )}
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
                >
                  <Trash2 size={13} /> Supprimer l'employé
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Info générale ── */}
      <div className="card p-5 lg:p-7">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="label-text mb-1">Dossier</div>
            <div className="font-display text-xl text-ink">Informations générales</div>
          </div>
          {!editMode ? (
            <button onClick={startEdit} className="btn-ghost text-sm">
              <Pencil size={13} /> Modifier
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={handleEditCancel} className="btn-ghost text-sm">Annuler</button>
              <button onClick={handleEditSave} className="btn-primary text-sm">
                <CheckCircle size={13} /> Enregistrer
              </button>
            </div>
          )}
        </div>

        {editMode ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: 'Prénom', key: 'prenom' },
              { label: 'Nom de famille', key: 'nomFamille' },
              { label: 'Poste', key: 'poste' },
              { label: 'Département', key: 'dept' },
              { label: 'Email', key: 'email', type: 'email' },
              { label: 'Téléphone', key: 'telephone' },
              { label: 'CIN', key: 'cin' },
              { label: 'Adresse', key: 'adresse' },
              { label: 'Salaire net', key: 'salaireNet', type: 'number' },
              { label: 'Salaire brut', key: 'salaireBrut', type: 'number' },
              { label: "Date d'embauche", key: 'dateEmbauche', type: 'date' },
            ].map(({ label, key, type = 'text' }) => (
              <div key={key}>
                <label className="label-text mb-1.5 block">{label}</label>
                <input
                  type={type}
                  className="input-field"
                  value={editForm[key]}
                  onChange={setEF(key)}
                />
              </div>
            ))}
            <div>
              <label className="label-text mb-1.5 block">Type de contrat</label>
              <SelectField
                value={editForm.contrat}
                onChange={setEF('contrat')}
                options={['CDI', 'CDD', 'Freelance', 'Stage']}
              />
            </div>
            <div>
              <label className="label-text mb-1.5 block">Mode de rémunération</label>
              <SelectField
                value={editForm.modeRemuneration}
                onChange={setEF('modeRemuneration')}
                options={[
                  { value: 'mensuel', label: 'Mensuel fixe' },
                  { value: 'horaire', label: 'Horaire (sessions)' },
                ]}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-8">
            {[
              { label: 'Prénom', value: employe.prenom },
              { label: 'Nom de famille', value: employe.nomFamille },
              { label: 'Poste', value: employe.poste },
              { label: 'Département', value: employe.dept },
              { label: 'Email', value: employe.email },
              { label: 'Téléphone', value: employe.telephone },
              { label: 'CIN', value: employe.cin },
              { label: 'Adresse', value: employe.adresse },
              { label: 'Type de contrat', value: employe.contrat },
              { label: 'Mode de rémunération', value: employe.modeRemuneration === 'horaire' ? 'Horaire (sessions)' : 'Mensuel fixe' },
              { label: 'Salaire net', value: employe.salaireNet ? `${Number(employe.salaireNet).toLocaleString('fr-FR')} MAD` : '—' },
              { label: 'Salaire brut', value: employe.salaireBrut ? `${Number(employe.salaireBrut).toLocaleString('fr-FR')} MAD` : '—' },
              { label: "Date d'embauche", value: employe.dateEmbauche ? new Date(employe.dateEmbauche + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="label-text mb-0.5">{label}</div>
                <div className="text-sm text-ink font-medium">{value || '—'}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Planning hebdomadaire ── */}
      <div className="card p-5 lg:p-7">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="label-text mb-1">Calendrier</div>
            <div className="font-display text-xl text-ink">Planning de la semaine</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekOffset(w => w - 1)}
              className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted hover:text-ink hover:bg-paper-warm transition-colors"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="text-xs font-medium text-ink whitespace-nowrap px-2">{weekLabel}</span>
            <button
              onClick={() => setWeekOffset(w => w + 1)}
              className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted hover:text-ink hover:bg-paper-warm transition-colors"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            {/* Day headers */}
            <div className="grid gap-0" style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
              <div />
              {weekDays.map((d, i) => {
                const iso = toISO(d)
                const isToday = iso === todayISO
                // Project RDVs for this day
                const allTasks2 = projects.flatMap(p => (p.missions || []).filter(m => m.type === 'rdv' && m.personnes?.includes(employe.nom?.split(' ')[0])).map(m => ({ ...m, projectNom: p.nom })))
                const dayRdvs = allTasks2.filter(m => m.date === iso)
                return (
                  <div key={i} className="pb-1">
                    <div className={`text-center pb-1 ${isToday ? 'text-electric' : 'text-muted'}`}>
                      <div className="text-[10px] font-semibold uppercase">{DAY_NAMES[i]}</div>
                      <div className={`text-sm font-bold ${isToday ? 'text-electric' : 'text-ink'}`}>{d.getDate()}</div>
                    </div>
                    {dayRdvs.map(rdv => (
                      <div key={rdv.id} title={`${rdv.nom} — ${rdv.projectNom}`}
                        className="text-[9px] bg-sky-100 text-sky-700 rounded px-1 py-0.5 truncate mb-0.5 leading-tight">
                        {rdv.nom}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>

            {/* Grid */}
            <div className="grid gap-0 border border-border rounded-xl overflow-hidden" style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
              {/* Time column */}
              <div>
                {HOURS.map(h => (
                  <div key={h} className="border-b border-border flex items-start justify-end pr-2 pt-1" style={{ height: ROW_HEIGHT }}>
                    <span className="text-[10px] text-muted">{h}:00</span>
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {weekDays.map((d, di) => {
                const dayISO = toISO(d)
                const isToday = dayISO === todayISO
                const personalEvs = (employe.planning || []).filter(ev => ev.date === dayISO)
                const formEvs = formationEvents.filter(ev => ev.date === dayISO)
                const dayEvents = [...personalEvs, ...formEvs]

                const onLeave = isOnLeave(dayISO)

                return (
                  <div key={di}
                    className={`relative border-l border-border cursor-pointer ${isToday ? 'bg-electric/5' : onLeave ? 'bg-amber-50/60' : ''}`}
                    style={{ height: HOURS.length * ROW_HEIGHT }}
                    onClick={() => setAddEventDate(dayISO)}>
                    {/* Congé band */}
                    {onLeave && (
                      <div className="absolute inset-x-0 top-0 z-20 bg-amber-400/20 border-b border-amber-300 flex items-center justify-center py-0.5 pointer-events-none">
                        <span className="text-[9px] font-bold text-amber-700 truncate px-1">🏖 Congé</span>
                      </div>
                    )}
                    {/* Hour lines */}
                    {HOURS.map((h, hi) => (
                      <div key={h} className="absolute w-full border-b border-border/50" style={{ top: hi * ROW_HEIGHT }} />
                    ))}

                    {/* Events */}
                    {dayEvents.map(ev => {
                      const { top, height } = eventStyle(ev)
                      if (top < 0 || top > HOURS.length * ROW_HEIGHT) return null
                      const isForm = ev.isFormation
                      return (
                        <div key={ev.id}
                          className={`absolute left-1 right-1 rounded-lg px-1.5 py-1 overflow-hidden z-10 transition-opacity ${isForm ? 'opacity-90 cursor-default' : 'cursor-pointer hover:opacity-80'}`}
                          style={{ top, height, background: ev.couleur }}
                          onClick={e => {
                            e.stopPropagation()
                            if (isForm) {
                              toast(`📚 ${ev.titre}\n${ev.heureDebut}–${ev.heureFin}`, { duration: 2500 })
                            } else {
                              setEditingEvent(ev)
                            }
                          }}
                          title={isForm ? `Formation: ${ev.titre}` : `${ev.titre} — cliquer pour modifier`}>
                          <div className="text-white text-[10px] font-semibold leading-tight truncate">{isForm ? `📚 ${ev.titre}` : ev.titre}</div>
                          <div className="text-white/70 text-[9px]">{ev.heureDebut}–{ev.heureFin}</div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        <p className="text-[10px] text-muted mt-2">Cliquer sur un jour pour ajouter un événement · Cliquer sur un événement pour le supprimer</p>
      </div>

      {/* ── Heures de travail (timer) ── */}
      {(employe.workSessions || []).length > 0 && (() => {
        const allSessions = employe.workSessions || []
        const todayISO2 = new Date().toISOString().slice(0, 10)
        const weekStart = (() => {
          const now = new Date(); const day = now.getDay() === 0 ? 6 : now.getDay() - 1
          const mon = new Date(now); mon.setDate(now.getDate() - day); mon.setHours(0,0,0,0); return mon.toISOString().slice(0,10)
        })()
        const todayMs = allSessions.filter(s => s.date === todayISO2).reduce((sum, s) => sum + (s.workedMs || 0), 0)
        const weekMs = allSessions.filter(s => s.date >= weekStart).reduce((sum, s) => sum + (s.workedMs || 0), 0)

        // Monthly stats
        const byMonth = allSessions.reduce((acc, s) => {
          const m = s.date?.slice(0, 7)
          if (!m) return acc
          if (!acc[m]) acc[m] = { totalMs: 0, otMs: 0 }
          acc[m].totalMs += s.workedMs || 0
          acc[m].otMs += Math.max(0, (s.workedMs || 0) - OT_THRESHOLD_MS)
          return acc
        }, {})
        const monthStats = Object.entries(byMonth).sort(([a], [b]) => b.localeCompare(a))
        const MONTH_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Août','Sep','Oct','Nov','Déc']
        const fmtMonth = (ym) => { const [y, m] = ym.split('-'); return `${MONTH_FR[parseInt(m)-1]} ${y}` }

        const todayOt = Math.max(0, todayMs - OT_THRESHOLD_MS)

        // Week navigator for sessions
        const getSessionWeek = (offset) => {
          const now = new Date()
          const day = now.getDay() === 0 ? 6 : now.getDay() - 1
          const mon = new Date(now)
          mon.setDate(now.getDate() - day + offset * 7)
          mon.setHours(0, 0, 0, 0)
          const sun = new Date(mon)
          sun.setDate(mon.getDate() + 6)
          return { start: mon.toISOString().slice(0, 10), end: sun.toISOString().slice(0, 10), mon, sun }
        }
        const sessionWeek = getSessionWeek(sessionWeekOffset)
        const sessionWeekLabel = `${sessionWeek.mon.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} — ${sessionWeek.sun.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
        const weekSessions = allSessions
          .filter(s => s.date >= sessionWeek.start && s.date <= sessionWeek.end)
          .sort((a, b) => b.date.localeCompare(a.date))

        return (
          <div className="card p-5 lg:p-7">
            <div className="flex items-center justify-between mb-5">
              <div><div className="label-text mb-1">Pointage</div><div className="font-display text-xl text-ink">Heures de travail</div></div>
              <div className="flex gap-4">
                <div className="text-right">
                  <div className="label-text text-[10px]">Aujourd'hui</div>
                  <div className="font-display text-2xl text-electric leading-none">{fmtMs(todayMs)}</div>
                  {todayOt > 0 && <div className="text-[10px] text-amber-600 font-semibold mt-0.5">{fmtMs(todayOt)} HS</div>}
                </div>
                <div className="text-right">
                  <div className="label-text text-[10px]">Cette semaine</div>
                  <div className="font-display text-2xl text-ink leading-none">{fmtMs(weekMs)}</div>
                </div>
              </div>
            </div>

            {/* Monthly summary */}
            <div className="mb-4">
              <div className="label-text text-[10px] mb-2">Par mois</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {monthStats.slice(0, 6).map(([ym, s]) => (
                  <div key={ym} className="bg-paper-warm rounded-xl p-3">
                    <div className="text-[10px] text-muted mb-1">{fmtMonth(ym)}</div>
                    <div className="text-sm font-bold text-ink">{fmtMs(s.totalMs)}</div>
                    {s.otMs > 0 && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <TrendingUp size={10} className="text-amber-500" />
                        <span className="text-[10px] text-amber-600 font-semibold">{fmtMs(s.otMs)} HS</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Sessions with week navigator */}
            <div className="label-text text-[10px] mb-2">Détail des sessions</div>
            <div className="flex items-center gap-2 mb-3 bg-paper-warm rounded-xl px-3 py-2">
              <button onClick={() => setSessionWeekOffset(o => o - 1)}
                className="w-7 h-7 rounded-lg hover:bg-white border border-border flex items-center justify-center text-muted flex-shrink-0">
                <ChevronLeft size={14} />
              </button>
              <span className="flex-1 text-xs font-medium text-ink text-center">{sessionWeekLabel}</span>
              <button onClick={() => setSessionWeekOffset(0)}
                className="text-[10px] text-muted hover:text-ink px-2 font-medium flex-shrink-0">
                Auj.
              </button>
              <button onClick={() => setSessionWeekOffset(o => o + 1)}
                className="w-7 h-7 rounded-lg hover:bg-white border border-border flex items-center justify-center text-muted flex-shrink-0">
                <ChevronRight size={14} />
              </button>
            </div>
            {weekSessions.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted">Aucune session cette semaine</div>
            ) : (
              <div className="space-y-1.5">
                {weekSessions.map(s => {
                  const ot = Math.max(0, (s.workedMs || 0) - OT_THRESHOLD_MS)
                  return (
                    <div key={s.id} className="flex items-center gap-3 p-2.5 bg-paper-warm rounded-xl text-sm">
                      <Clock size={13} className="text-muted flex-shrink-0" />
                      <span className="text-muted text-xs flex-shrink-0 w-20">{s.date}</span>
                      <span className="text-ink font-medium">{fmtMs(s.workedMs || 0)}</span>
                      {ot > 0 && <span className="text-[10px] text-amber-600 font-semibold px-1.5 py-0.5 bg-amber-50 rounded-md">{fmtMs(ot)} HS</span>}
                      {s.startTime && s.endTime && (
                        <span className="text-xs text-muted ml-auto">{s.startTime} → {s.endTime}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })()}

      {/* ── Heures supplémentaires ── */}
      <div className="card p-5 lg:p-7">
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="label-text mb-1">RH</div>
            <div className="font-display text-xl text-ink">Heures supplémentaires</div>
          </div>
          <button onClick={() => setShowAddHeureSup(true)} className="btn-primary text-sm">
            <Plus size={13} /> Ajouter
          </button>
        </div>

        {/* Stats totaux */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
            <div className="text-[10px] text-amber-600 font-semibold uppercase tracking-wide mb-1">Total HS</div>
            <div className="font-display text-2xl text-amber-700 leading-none">{fmtH(totalOtHours)}</div>
          </div>
          <div className="bg-paper-warm border border-border rounded-xl p-4 text-center">
            <div className="text-[10px] text-muted font-semibold uppercase tracking-wide mb-1">Timer (auto)</div>
            <div className="font-display text-2xl text-ink leading-none">{fmtH(autoOtHours)}</div>
          </div>
          <div className="bg-paper-warm border border-border rounded-xl p-4 text-center">
            <div className="text-[10px] text-muted font-semibold uppercase tracking-wide mb-1">Manuel</div>
            <div className="font-display text-2xl text-ink leading-none">{fmtH(manualOtHours)}</div>
          </div>
        </div>

        {/* Décomposition en journées */}
        {totalOtHours > 0 && (
          <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-4 mb-4">
            <div className="label-text text-[10px] mb-3">Équivalent en journées (1 jour = 8h30)</div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="text-center">
                <div className="font-display text-3xl text-ink leading-none">{otFullDays}</div>
                <div className="text-[10px] text-muted mt-1">jour{otFullDays !== 1 ? 's' : ''}</div>
              </div>
              <div className="text-muted text-lg font-light">+</div>
              <div className="text-center">
                <div className="font-display text-3xl text-ink leading-none">{otHalfDays}</div>
                <div className="text-[10px] text-muted mt-1">demi-journée{otHalfDays !== 1 ? 's' : ''}</div>
              </div>
              {otRemHours > 0.005 && (
                <>
                  <div className="text-muted text-lg font-light">+</div>
                  <div className="text-center">
                    <div className="font-display text-3xl text-ink leading-none">{fmtH(otRemHours)}</div>
                    <div className="text-[10px] text-muted mt-1">restant</div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Entrées manuelles */}
        {manualHsEntries.length > 0 ? (
          <div>
            <div className="label-text text-[10px] mb-2">Entrées manuelles</div>
            <div className="space-y-2">
              {manualHsEntries.map(entry => (
                <div key={entry.id} className="flex items-center gap-3 p-3 bg-paper-warm rounded-xl border border-border/50">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0">
                    <TrendingUp size={14} className="text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-ink truncate">{entry.description}</div>
                    <div className="text-xs text-muted">{entry.date}</div>
                  </div>
                  <div className="text-sm font-bold text-amber-700 flex-shrink-0 mr-1">+{fmtH(entry.value)}</div>
                  <button
                    onClick={() => { deleteHeureSupManuelle(employe.id, entry.id); toast.success('Entrée supprimée') }}
                    className="w-7 h-7 rounded-lg hover:bg-rose-50 text-muted hover:text-rose-600 flex items-center justify-center transition-colors flex-shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-muted text-xs border border-dashed border-border rounded-xl">
            Aucune entrée manuelle — cliquez sur <span className="font-semibold text-ink">Ajouter</span> pour enregistrer des heures supplémentaires
          </div>
        )}
      </div>

      {/* ── Statistiques ── */}
      <div className="card p-5 lg:p-7">
        <div className="label-text mb-1">Activité</div>
        <div className="font-display text-xl text-ink mb-5">Tâches &amp; Projets</div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Cette semaine */}
          <div className="bg-paper-warm rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-electric/10 flex items-center justify-center flex-shrink-0">
                  <Clock size={15} className="text-electric" />
                </div>
                <div className="font-semibold text-ink text-sm">Cette semaine</div>
              </div>
              <span className="text-xs text-muted font-medium">{formatHours(weekHours)} travaillées</span>
            </div>
            {weekProjectGroups.length === 0 ? (
              <p className="text-xs text-muted py-2">Aucune tâche cette semaine</p>
            ) : (
              <div className="space-y-3">
                {weekProjectGroups.map(({ nom, tasks }) => (
                  <div key={nom}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Briefcase size={11} className="text-muted flex-shrink-0" />
                      <span className="text-[11px] font-semibold text-ink truncate">{nom}</span>
                      <span className="text-[10px] text-muted ml-auto flex-shrink-0">{tasks.length} tâche{tasks.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="space-y-1 pl-4">
                      {tasks.map(t => (
                        <div key={t.id} className="flex items-center gap-2">
                          <div className="relative flex-shrink-0">
                            <button
                              onClick={e => { e.stopPropagation(); setTaskStatusDropdown(taskStatusDropdown === t.id ? null : t.id) }}
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md hover:opacity-80 transition-opacity ${taskStatutStyle(t.statut)}`}
                            >
                              {taskStatutLabel(t.statut)}
                            </button>
                            {taskStatusDropdown === t.id && (
                              <>
                                <div className="fixed inset-0 z-20" onClick={() => setTaskStatusDropdown(null)} />
                                <div className="absolute left-0 top-full mt-1 bg-white border border-border rounded-xl shadow-xl z-30 overflow-hidden min-w-[140px]">
                                  {['Not Started', 'Working on it', 'Stuck', 'Done'].map(s => (
                                    <button key={s} onClick={() => { updateTask(t.projectId, t.id, { statut: s }); setTaskStatusDropdown(null) }}
                                      className={`w-full text-left flex items-center gap-2 px-3 py-2 text-xs hover:bg-paper-warm transition-colors ${t.statut === s ? 'font-semibold' : ''}`}>
                                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${taskStatutStyle(s)}`}>{taskStatutLabel(s)}</span>
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                          <span className="text-xs text-ink truncate flex-1">{t.nom}</span>
                          {t.deadline && (
                            <span className="text-[10px] text-muted flex-shrink-0">
                              {new Date(t.deadline).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ce mois */}
          <div className="bg-paper-warm rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-ink/5 flex items-center justify-center flex-shrink-0">
                  <Briefcase size={15} className="text-ink" />
                </div>
                <div className="font-semibold text-ink text-sm">Ce mois</div>
              </div>
              <span className="text-xs text-muted font-medium">{formatHours(monthHours)} travaillées</span>
            </div>
            {monthProjectGroups.length === 0 ? (
              <p className="text-xs text-muted py-2">Aucune tâche ce mois</p>
            ) : (
              <div className="space-y-3">
                {monthProjectGroups.map(({ nom, tasks }) => (
                  <div key={nom}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Briefcase size={11} className="text-muted flex-shrink-0" />
                      <span className="text-[11px] font-semibold text-ink truncate">{nom}</span>
                      <span className="text-[10px] text-muted ml-auto flex-shrink-0">{tasks.length} tâche{tasks.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="space-y-1 pl-4">
                      {tasks.map(t => (
                        <div key={t.id} className="flex items-center gap-2">
                          <div className="relative flex-shrink-0">
                            <button
                              onClick={e => { e.stopPropagation(); setTaskStatusDropdown(taskStatusDropdown === t.id ? null : t.id) }}
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md hover:opacity-80 transition-opacity ${taskStatutStyle(t.statut)}`}
                            >
                              {taskStatutLabel(t.statut)}
                            </button>
                            {taskStatusDropdown === t.id && (
                              <>
                                <div className="fixed inset-0 z-20" onClick={() => setTaskStatusDropdown(null)} />
                                <div className="absolute left-0 top-full mt-1 bg-white border border-border rounded-xl shadow-xl z-30 overflow-hidden min-w-[140px]">
                                  {['Not Started', 'Working on it', 'Stuck', 'Done'].map(s => (
                                    <button key={s} onClick={() => { updateTask(t.projectId, t.id, { statut: s }); setTaskStatusDropdown(null) }}
                                      className={`w-full text-left flex items-center gap-2 px-3 py-2 text-xs hover:bg-paper-warm transition-colors ${t.statut === s ? 'font-semibold' : ''}`}>
                                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${taskStatutStyle(s)}`}>{taskStatutLabel(s)}</span>
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                          <span className="text-xs text-ink truncate flex-1">{t.nom}</span>
                          {t.deadline && (
                            <span className="text-[10px] text-muted flex-shrink-0">
                              {new Date(t.deadline).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Congés ── */}
      <div className="card p-5 lg:p-7">
        <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
          <div>
            <div className="label-text mb-1">Absences</div>
            <div className="font-display text-xl text-ink">Gestion des congés</div>
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-end">
            {/* Date d'embauche — toujours synchronisée avec la fiche */}
            <div className="flex flex-col items-end gap-1">
              <label className="label-text text-[10px]">Date d'embauche</label>
              <input
                type="date"
                className="input-field text-xs py-1.5 px-2.5 h-8 w-40"
                value={employe.dateEmbauche || ''}
                onChange={e => {
                  const val = e.target.value
                  updateEmploye(employe.id, { dateEmbauche: val || null })
                  if (val) toast.success('Date d\'embauche mise à jour')
                }}
              />
            </div>

            {congesBalance ? (
              <div className="flex items-center gap-4 bg-paper-warm rounded-2xl px-4 py-3 border border-border">
                <div className="text-right">
                  <div className="label-text text-[10px]">Solde disponible</div>
                  <div className={`font-display text-3xl leading-none ${congesBalance.balance < 5 ? 'text-rose-600' : congesBalance.balance < 10 ? 'text-amber-600' : 'text-ink'}`}>
                    {congesBalance.balance}
                  </div>
                  <div className="text-[10px] text-muted">jours</div>
                </div>
                <div className="w-px h-10 bg-border" />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted">
                    <TrendingUp size={9} className="text-electric" />
                    Acquis : <span className="font-semibold text-ink">{congesBalance.totalAccrued} j</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted">
                    <CalendarDays size={9} className="text-amber-500" />
                    Pris : <span className="font-semibold text-ink">{congesBalance.totalUsed} j</span>
                  </div>
                  {congesBalance.totalExpired > 0 && (
                    <div className="flex items-center gap-1.5 text-[10px] text-rose-600">
                      <TrendingDown size={9} />
                      Expirés : <span className="font-semibold">{congesBalance.totalExpired} j</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-[10px] text-muted">
                    <Clock size={9} className="text-emerald-500" />
                    +1,5 j/mois en cours
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                <AlertTriangle size={13} className="text-amber-600 flex-shrink-0" />
                <span className="text-xs text-amber-800">Saisissez la date d'embauche pour calculer le solde</span>
              </div>
            )}

            <button onClick={() => setShowCongeForm(v => !v)} className="btn-primary text-sm">
              <Plus size={13} /> Ajouter une absence
            </button>
          </div>
        </div>

        {/* Alertes d'expiration */}
        {congesBalance?.expiringSoon?.length > 0 && (
          <div className="mb-4 flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertTriangle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 leading-relaxed">
              <span className="font-bold">Attention — Expiration imminente : </span>
              {congesBalance.expiringSoon.map(e => (
                <span key={e.year}>
                  {e.remaining} jour{e.remaining > 1 ? 's' : ''} de l'année {e.year} expirent
                  le {new Date(e.expiryDate + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  {' '}(dans {e.daysToExpiry} jours).{' '}
                </span>
              ))}
              Ces jours seront annulés conformément aux art. 240 &amp; 245 du Code du Travail.
            </div>
          </div>
        )}

        {/* Add leave form */}
        <AnimatePresence>
          {showCongeForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleAddConge}
              className="overflow-hidden mb-5"
            >
              <div className="bg-paper-warm rounded-xl p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="label-text mb-1.5 block">Type</label>
                  <SelectField
                    value={congeForm.type}
                    onChange={v => setCongeForm(f => ({ ...f, type: v }))}
                    options={['Congés annuels', 'RTT', 'Maladie', 'Autre']}
                  />
                </div>
                <div>
                  <label className="label-text mb-1.5 block">Début</label>
                  <input
                    type="date"
                    className="input-field"
                    value={congeForm.debut}
                    onChange={e => setCongeForm(f => ({ ...f, debut: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label-text mb-1.5 block">Fin</label>
                  <input
                    type="date"
                    className="input-field"
                    value={congeForm.fin}
                    onChange={e => setCongeForm(f => ({ ...f, fin: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowCongeForm(false)} className="btn-ghost flex-1 justify-center text-sm">
                    Annuler
                  </button>
                  <button type="submit" className="btn-primary flex-1 justify-center text-sm">
                    <CheckCircle size={12} /> Ajouter
                  </button>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* History table — affiche toutes les demandes de congé (quelle que soit l'étape d'approbation) */}
        {(() => {
          const DL = { conge: 'Congé', absence: 'Absence', arret_maladie: 'Arrêt maladie' }
          const manualRows = (employe.conges?.history || [])
            .filter(c => !c.fromDemande)
            .map(c => ({ ...c, _kind: 'manual', _statut: 'approuve' }))

          const demandeRows = empDemandes
            .filter(d => ['conge', 'arret_maladie', 'absence'].includes(d.type))
            .map(d => {
              const d1 = d.dateDebut ? new Date(d.dateDebut) : null
              const d2 = d.dateFin   ? new Date(d.dateFin)   : d1
              const duree = d1 && d2 ? Math.max(1, Math.round((d2-d1)/86400000)+1) : null
              // Statut affiché : si RH a validé → Approuvé ; si manager a approuvé → En attente RH ; sinon statut brut
              const displayStatut = d.statut === 'approuve' ? 'Approuvé'
                : d.statut === 'refuse' ? 'Refusé'
                : d.managerApproval === 'approuve' ? 'En attente validation RH'
                : d.managerApproval === 'non_requis' ? 'En attente RH'
                : 'En attente responsable'
              return {
                id: d.id, type: DL[d.type]||d.type, debut: d.dateDebut, fin: d.dateFin, duree,
                displayStatut, _kind: 'demande', _rawStatut: d.statut,
                _managerApproval: d.managerApproval, _rhApproval: d.rhApproval, _demandeId: d.id,
              }
            })

          const allRows = [...demandeRows, ...manualRows]
            .sort((a, b) => (b.debut||'').localeCompare(a.debut||''))

          const badge = (s) => {
            if (s==='Approuvé') return 'bg-emerald-50 text-emerald-700'
            if (s==='Refusé')   return 'bg-rose-50 text-rose-700'
            if (s.includes('RH')) return 'bg-electric/10 text-electric'
            return 'bg-amber-50 text-amber-700'
          }

          if (allRows.length === 0) return (
            <div className="text-center py-8 text-muted text-sm border border-dashed border-border rounded-xl">
              Aucun congé enregistré
            </div>
          )
          return (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left label-text pb-3 pr-4 font-medium">Type</th>
                    <th className="text-left label-text pb-3 pr-4 font-medium">Début</th>
                    <th className="text-left label-text pb-3 pr-4 font-medium">Fin</th>
                    <th className="text-left label-text pb-3 pr-4 font-medium">Durée</th>
                    <th className="text-left label-text pb-3 font-medium">Statut</th>
                    <th className="text-left label-text pb-3 pl-3 font-medium">Actions RH</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {allRows.map(c => {
                    // RH peut valider si : rhApproval === 'en_attente' et pas encore refusé
                    const canRHValidate = c._kind==='demande' && c._rawStatut!=='approuve' && c._rawStatut!=='refuse' && c._rhApproval==='en_attente'
                    return (
                      <tr key={c.id} className="hover:bg-paper-warm/50 transition-colors">
                        <td className="py-3 pr-4 text-sm font-medium text-ink">{c.type}</td>
                        <td className="py-3 pr-4 text-sm text-ink">
                          {c.debut ? new Date(c.debut).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'}) : '—'}
                        </td>
                        <td className="py-3 pr-4 text-sm text-ink">
                          {c.fin ? new Date(c.fin).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'}) : '—'}
                        </td>
                        <td className="py-3 pr-4 text-sm text-ink">
                          {c.duree ? `${c.duree} j` : '—'}
                        </td>
                        <td className="py-3 pr-2">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge(c.displayStatut||c._statut||'')}`}>
                            {c.displayStatut || 'Approuvé'}
                          </span>
                        </td>
                        <td className="py-3 pl-3">
                          {canRHValidate && (
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => { updateDemandeRH(c._demandeId, { statut: 'approuve' }); toast.success('Congé validé') }}
                                className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center border border-emerald-200 transition-colors"
                                title="Valider (RH)"
                              ><CheckCircle size={13}/></button>
                              <button
                                onClick={() => { updateDemandeRH(c._demandeId, { statut: 'refuse' }); toast.success('Congé refusé') }}
                                className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center border border-rose-200 transition-colors"
                                title="Refuser (RH)"
                              ><X size={13}/></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        })()}
      </div>

      {/* ── Demandes RH ── */}
      {(() => {
        const empDemandes = (demandesRH || []).filter(d => String(d.employeId) === String(employe.id))
        if (empDemandes.length === 0) return null
        const DEM_LABELS = { conge: 'Congé', absence: 'Absence', arret_maladie: 'Arrêt maladie', attestation: 'Attestation de travail', autre: 'Autre demande' }
        const STAT_LABELS = { en_attente: 'En attente', approuve: 'Approuvée', refuse: 'Refusée' }
        const STAT_COLORS = {
          en_attente: 'bg-amber-50 text-amber-700 border border-amber-200',
          approuve: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
          refuse: 'bg-rose-50 text-rose-700 border border-rose-200',
        }
        return (
          <div className="card p-5 lg:p-7">
            <div className="label-text mb-1">Historique</div>
            <div className="font-display text-xl text-ink mb-5">Demandes RH</div>
            <div className="space-y-2">
              {empDemandes.map(d => (
                <div key={d.id} className="flex items-start gap-4 p-4 bg-paper-warm rounded-xl border border-border">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-ink">{DEM_LABELS[d.type] || d.type}</span>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STAT_COLORS[d.statut]}`}>
                        {STAT_LABELS[d.statut]}
                      </span>
                    </div>
                    {(d.dateDebut || d.dateFin) && (
                      <div className="text-xs text-muted mt-1">
                        {d.dateDebut && new Date(d.dateDebut).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        {d.dateFin && ` → ${new Date(d.dateFin).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`}
                      </div>
                    )}
                    {d.motif && <div className="text-xs text-muted mt-0.5 italic">"{d.motif}"</div>}
                    {d.commentaireRH && (
                      <div className="text-xs text-ink mt-1 p-2 bg-white rounded-lg border border-border">
                        RH: {d.commentaireRH}
                      </div>
                    )}
                    <div className="text-[10px] text-muted mt-1">
                      {new Date(d.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  {d.statut === 'en_attente' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => { updateDemandeRH(d.id, { statut: 'approuve', processedAt: new Date().toISOString() }); toast.success('Demande approuvée') }}
                        className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center border border-emerald-200 transition-colors"
                        title="Approuver"
                      >
                        <CheckCircle size={14} />
                      </button>
                      <button
                        onClick={() => { updateDemandeRH(d.id, { statut: 'refuse', processedAt: new Date().toISOString() }); toast.success('Demande refusée') }}
                        className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center border border-rose-200 transition-colors"
                        title="Refuser"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* ── Formations & Développement ── */}
      {(() => {
        const assignedFormations = formations.filter(f => (f.personnes || []).map(String).includes(String(employe.id)))
        const allAutoformations = (employe.planning || [])
          .filter(ev => ev.type === 'autoformation' || ev.type === 'autoformation_complete')
          .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
        if (assignedFormations.length === 0 && allAutoformations.length === 0) return null
        const fmtShort = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
        return (
          <div className="card p-5 lg:p-7">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                <BookOpen size={16} className="text-violet-600" />
              </div>
              <div>
                <div className="label-text mb-0.5">Développement</div>
                <div className="font-display text-xl text-ink">Formations &amp; Autoformations</div>
              </div>
            </div>

            {assignedFormations.length > 0 && (
              <div className="mb-4">
                <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                  <div className="flex-1 h-px bg-border" />
                  Formations affectées ({assignedFormations.length})
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="space-y-2">
                  {assignedFormations.map(f => (
                    <div key={f.id} className="flex items-center gap-3 p-3 bg-violet-50/40 border border-violet-100 rounded-xl">
                      <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0 text-violet-700 text-sm font-bold">
                        {f.date ? new Date(f.date).getDate() : '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-ink truncate">{f.nom}</div>
                        <div className="text-xs text-muted">
                          {fmtShort(f.date)}{f.heureDebut && ` · ${f.heureDebut}–${f.heureFin}`}{f.formateurs && ` · ${f.formateurs}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {allAutoformations.length > 0 && (
              <div>
                {assignedFormations.length > 0 && (
                  <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                    <div className="flex-1 h-px bg-border" />
                    Autoformations ({allAutoformations.length})
                    <div className="flex-1 h-px bg-border" />
                  </div>
                )}
                <div className="space-y-2">
                  {allAutoformations.map(af => {
                    const isDone = af.type === 'autoformation_complete'
                    const progress = af.afProgress || 0
                    return (
                      <div key={af.id} className={`p-3 border rounded-xl space-y-2 ${isDone ? 'bg-emerald-50/40 border-emerald-100' : 'bg-teal-50/30 border-teal-100'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold ${isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-teal-100 text-teal-700'}`}>
                            {af.date ? new Date(af.date).getDate() : '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-ink truncate">{af.titre}</div>
                            <div className="text-xs text-muted">
                              {fmtShort(af.date)}{af.heureDebut && ` · ${af.heureDebut}–${af.heureFin}`}
                            </div>
                          </div>
                          {isDone ? (
                            <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-lg flex-shrink-0">✓ Terminée</span>
                          ) : progress > 0 ? (
                            <span className="text-[10px] font-semibold text-teal-700 flex-shrink-0">{Math.round(progress * 100)}%</span>
                          ) : null}
                        </div>
                        {af.description && <div className="text-xs text-muted pl-12">{af.description}</div>}
                        {af.lien && (
                          <a href={af.lien} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1 text-xs text-electric hover:underline pl-12">
                            <ExternalLink size={11} /> Lien ressource
                          </a>
                        )}
                        {isDone && af.completedAt && (
                          <div className="text-[10px] text-emerald-600 font-medium pl-12">
                            Terminée le {new Date(af.completedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </div>
                        )}
                        {!isDone && (
                          <div className="pl-12">
                            <div className="relative h-2.5 rounded-full bg-teal-100 overflow-hidden">
                              <div className="absolute inset-y-0 left-0 rounded-full bg-teal-500 transition-all"
                                style={{ width: `${Math.round(progress * 100)}%` }} />
                            </div>
                            {progress === 0 && <div className="text-[10px] text-muted mt-1">Non démarrée</div>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* ── Évaluations par projet ── */}
      {(() => {
        const evals = (employe.evaluations || []).slice().sort((a, b) => b.date.localeCompare(a.date))
        const avgNote = evals.length > 0
          ? (evals.reduce((s, ev) => s + (ev.note || 0), 0) / evals.length).toFixed(1)
          : null

        return (
          <div className="card p-5 lg:p-7">
            {/* Header */}
            <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
              <div>
                <div className="label-text mb-1">Suivi qualitatif</div>
                <div className="font-display text-xl text-ink">Évaluations managers</div>
                {evals.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className="text-xs text-muted">Évalué par :</span>
                    {[...new Map(evals.map(ev => [ev.managerId, ev.managerNom])).entries()].map(([id, nom]) => (
                      <span key={id} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">{nom}</span>
                    ))}
                  </div>
                )}
              </div>
              {avgNote && (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                  <div className="text-right">
                    <div className="text-[10px] text-amber-700 font-semibold uppercase tracking-wide mb-0.5">Moyenne</div>
                    <div className="font-display text-3xl text-amber-600 leading-none">{avgNote}<span className="text-sm font-normal text-amber-700/60">/5</span></div>
                    <div className="text-[10px] text-amber-700/70 mt-0.5">{evals.length} évaluation{evals.length > 1 ? 's' : ''}</div>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {[5,4,3,2,1].map(n => (
                      <span key={n} className={parseFloat(avgNote) >= n ? 'text-amber-400 text-base leading-none' : 'text-border text-base leading-none'}>★</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {evals.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted">
                Aucune évaluation enregistrée pour ce collaborateur.
              </div>
            ) : (
              <div className="space-y-4">
                {evals.map(ev => (
                  <div key={ev.id} className="border border-border rounded-2xl p-4 space-y-3">
                    {/* En-tête évaluation */}
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-ink">{ev.projetNom}</span>
                          <span className="flex gap-0.5">
                            {[1,2,3,4,5].map(n => (
                              <span key={n} className={ev.note >= n ? 'text-amber-400' : 'text-border'} style={{ fontSize: 14 }}>★</span>
                            ))}
                          </span>
                          <span className="text-sm font-bold text-amber-700">{ev.note}/5</span>
                        </div>
                        <div className="text-xs text-muted mt-0.5">
                          par <span className="font-medium text-ink">{ev.managerNom}</span>
                          {' · '}
                          {ev.date ? new Date(ev.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                        </div>
                      </div>
                    </div>

                    {/* Commentaires */}
                    {(ev.pointsForts || ev.pointsFaibles) ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {ev.pointsForts && (
                          <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5">
                            <TrendingUp size={12} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <div className="text-[9px] font-bold text-emerald-700 uppercase tracking-wide mb-0.5">Points forts</div>
                              <p className="text-xs text-emerald-800 leading-relaxed">{ev.pointsForts}</p>
                            </div>
                          </div>
                        )}
                        {ev.pointsFaibles && (
                          <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                            <AlertTriangle size={12} className="text-amber-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <div className="text-[9px] font-bold text-amber-700 uppercase tracking-wide mb-0.5">À améliorer</div>
                              <p className="text-xs text-amber-800 leading-relaxed">{ev.pointsFaibles}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted italic">Aucun commentaire.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })()}

      {/* ── Primes & Bonus ── */}
      <PrimesSection
        employe={employe}
        addTransaction={addTransaction}
        removeTransaction={removeTransaction}
        updateEmploye={updateEmploye}
      />

      {/* ── Fiches de paie ── */}
      <PayslipSection
        employe={employe}
        addTransaction={addTransaction}
        updateEmploye={updateEmploye}
      />

      {/* Add heure sup modal */}
      {showAddHeureSup && (
        <AddHeureSupModal
          onClose={() => setShowAddHeureSup(false)}
          onAdd={entry => { addHeureSupManuelle(employe.id, entry); toast.success('Heures supplémentaires ajoutées') }}
        />
      )}

      {/* Add event modal */}
      {addEventDate && (
        <AddEventModal
          date={addEventDate}
          onClose={() => setAddEventDate(null)}
          onAdd={(event) => {
            addPlanningEvent(employe.id, event)
            setAddEventDate(null)
          }}
        />
      )}

      {/* Edit event modal */}
      {editingEvent && (
        <EditEventModal
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
          onSave={handleUpdateEvent}
          onDelete={() => handleDeleteEvent(editingEvent)}
        />
      )}
    </div>
  )
}

// ── EditEventModal ────────────────────────────────────────────────────────────
function EditEventModal({ event, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({
    titre: event.titre,
    heureDebut: event.heureDebut,
    heureFin: event.heureFin,
    couleur: event.couleur,
  })
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target?.value ?? e }))

  return (
    <AnimatePresence>
      <div className="fixed inset-0 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm z-[60]"
        onClick={e => e.target === e.currentTarget && onClose()}>
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold text-ink text-sm">Modifier l'événement</div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-paper-warm flex items-center justify-center text-muted"><X size={14} /></button>
          </div>
          <form onSubmit={e => { e.preventDefault(); if (form.titre.trim()) onSave({ ...form, titre: form.titre.trim() }) }} className="space-y-3">
            <div>
              <label className="label-text mb-1.5 block">Titre *</label>
              <input className="input-field" value={form.titre} onChange={set('titre')} autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label-text mb-1.5 block">Début</label><input type="time" className="input-field" value={form.heureDebut} onChange={set('heureDebut')} /></div>
              <div><label className="label-text mb-1.5 block">Fin</label><input type="time" className="input-field" value={form.heureFin} onChange={set('heureFin')} /></div>
            </div>
            <div>
              <label className="label-text mb-1.5 block">Couleur</label>
              <div className="flex gap-2 flex-wrap">
                {EVENT_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setForm(f => ({ ...f, couleur: c }))}
                    className={`w-7 h-7 rounded-full transition-all ${form.couleur === c ? 'ring-2 ring-offset-2 ring-ink scale-110' : ''}`}
                    style={{ background: c }} />
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onDelete}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 flex-shrink-0">
                <Trash2 size={13} /> Supprimer
              </button>
              <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center text-sm">Annuler</button>
              <button type="submit" className="btn-primary flex-1 justify-center text-sm">
                <Pencil size={13} /> Enregistrer
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
