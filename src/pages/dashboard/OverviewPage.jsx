import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, Pause, Square, RotateCcw, Plus, X, Trash2,
  ChevronLeft, ChevronRight, CheckCircle2, CheckCircle, Circle,
  TrendingDown, Users, FolderKanban, Wallet, CalendarDays, BookOpen,
  Clock, Pencil, ClipboardList, Video, Send, Paperclip, ExternalLink,
  Phone, MapPin, Search, CalendarPlus, GripHorizontal, Link as LinkIcon, ChevronDown, Download,
  Star, ThumbsDown, AlertCircle,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { ProgressBar } from '../../components/ui'
import EmployeeRequestModal from '../../components/EmployeeRequestModal'
import SelectField from '../../components/SelectField'
import toast from 'react-hot-toast'

// ─── Timer helpers ────────────────────────────────────────────────────────────
const getTodayISO = () => new Date().toISOString().slice(0, 10)

const DEFAULT_TIMER = {
  status: 'idle', startedAt: null, pausedAt: null,
  totalPausedMs: 0, endedAt: null, workDate: null,
}

function loadTimer(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return DEFAULT_TIMER
    const t = JSON.parse(raw)
    return t.workDate === getTodayISO() ? t : DEFAULT_TIMER
  } catch { return DEFAULT_TIMER }
}

function saveTimer(key, t) {
  try { localStorage.setItem(key, JSON.stringify(t)) } catch {}
}

function calcElapsed(t) {
  if (!t.startedAt) return 0
  const end = t.status === 'ended' ? (t.endedAt || Date.now()) : Date.now()
  const paused = t.totalPausedMs + (t.status === 'paused' && t.pausedAt ? Date.now() - t.pausedAt : 0)
  return Math.max(0, Math.floor((end - t.startedAt - paused) / 1000))
}

function fmtMs(ms) {
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000)
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

// ─── Planning helpers ─────────────────────────────────────────────────────────
const ROW_H = 56
const HOURS = Array.from({ length: 11 }, (_, i) => i + 8)
const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const EV_COLORS = ['#3B82F6', '#06B6D4', '#10B981', '#F59E0B', '#8B5CF6', '#F43F5E']

function getEvColor(ev) {
  if (ev.isFormation) return '#7C3AED'
  switch (ev.type) {
    case 'rdv': return '#F97316'
    case 'gantt_rdv': return ev.couleur || '#6366F1'
    case 'rdv_prospect': return '#0EA5E9'
    case 'autoformation': return '#0D9488'
    case 'autoformation_complete': return '#059669'
    case 'conge': return '#F59E0B'
    case 'arret_maladie': return '#F43F5E'
    default: return ev.couleur || '#3B82F6'
  }
}

function getInitials(nom) {
  const parts = (nom || '').trim().split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return (nom || '??').slice(0, 2).toUpperCase()
}

function getWeekDates(offset = 0) {
  const now = new Date()
  const day = now.getDay() === 0 ? 6 : now.getDay() - 1
  const mon = new Date(now)
  mon.setDate(now.getDate() - day + offset * 7)
  mon.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon); d.setDate(mon.getDate() + i); return d
  })
}

function toISO(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function t2min(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m }
function calcDur(s, e) { return Math.max(0, t2min(e) - t2min(s)) }
function eventsOverlap(a, b) {
  if (!a.heureDebut || !a.heureFin || !b.heureDebut || !b.heureFin) return false
  return t2min(a.heureDebut) < t2min(b.heureFin) && t2min(b.heureDebut) < t2min(a.heureFin)
}
function fmtDate(d) { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) }

// Extract creation date from task: prefer createdAt field, fallback to ID timestamp
const getTaskCreatedDate = (task) => {
  if (task.createdAt) return String(task.createdAt).slice(0, 10)
  if (task.id && task.id.startsWith('t')) {
    const ts = parseInt(task.id.slice(1))
    if (!isNaN(ts) && ts > 1_000_000_000_000) return toISO(new Date(ts))
  }
  return null
}

const fileName = (f) => (typeof f === 'string' ? f : f?.name ?? '')
const fileUrl  = (f) => (typeof f === 'string' ? null : f?.url ?? null)
const downloadFile = (f) => {
  const url = fileUrl(f)
  if (!url) return
  const a = document.createElement('a')
  a.href = url
  a.download = fileName(f)
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
const readFileAsDataUrl = (file) => new Promise((resolve) => {
  const r = new FileReader()
  r.onload = (e) => resolve(e.target.result)
  r.readAsDataURL(file)
})

function evStyle(ev) {
  const sm = t2min(ev.heureDebut) - 8 * 60
  const dur = calcDur(ev.heureDebut, ev.heureFin)
  return { top: (sm / 60) * ROW_H, height: Math.max((dur / 60) * ROW_H, 20) }
}

const TASK_S = {
  'Done':          'bg-emerald-100 text-emerald-700',
  'Working on it': 'bg-blue-100 text-blue-700',
  'Stuck':         'bg-rose-100 text-rose-700',
  'Not Started':   'bg-slate-100 text-slate-500',
}
const TASK_L = {
  'Done':          'Terminé',
  'Working on it': 'En cours',
  'Stuck':         'Bloqué',
  'Not Started':   'Non démarré',
}
const TASK_STATUTS = ['Working on it', 'Stuck', 'Done']

const APPROVAL_CFG = {
  'Approved':   { label: 'Approuvé',    Icon: CheckCircle, cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  'Great work': { label: 'Excellent !', Icon: Star,        cls: 'text-amber-600 bg-amber-50 border-amber-200' },
  'Not yet':    { label: 'Pas encore',  Icon: ThumbsDown,  cls: 'text-rose-500 bg-rose-50 border-rose-200' },
}
const getApprovalCfg = (approval) =>
  APPROVAL_CFG[approval] ?? { label: 'Pas encore', Icon: ThumbsDown, cls: 'text-slate-400 bg-slate-50 border-slate-200' }

// ─── Compact WorkTimer ────────────────────────────────────────────────────────
function WorkTimer({ timer, onStart, onPause, onResume, onEnd, onReset }) {
  const statusText = {
    idle: 'Prêt à démarrer',
    running: 'Journée en cours',
    paused: 'En pause',
    ended: 'Journée terminée',
  }
  const dotColor = timer.status === 'running' ? 'bg-electric' : timer.status === 'paused' ? 'bg-amber-400' : timer.status === 'ended' ? 'bg-emerald-500' : 'bg-border'

  return (
    <div className="card px-5 py-4 flex items-center justify-center gap-4 flex-wrap">
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
        <span className="text-xs text-muted font-medium">{statusText[timer.status]}</span>
      </div>
      <div className="flex gap-2 flex-wrap">
        {timer.status === 'idle' && (
          <button onClick={onStart}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-electric text-white text-xs font-semibold hover:opacity-90 transition-opacity">
            <Play size={12} fill="white" /> Commencer la journée
          </button>
        )}
        {timer.status === 'running' && (
          <>
            <button onClick={onPause}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-100 text-amber-700 text-xs font-semibold hover:bg-amber-200 transition-colors">
              <Pause size={12} /> Pause
            </button>
            <button onClick={onEnd}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 text-rose-600 text-xs font-semibold hover:bg-rose-100 transition-colors">
              <Square size={12} /> Terminer la journée
            </button>
          </>
        )}
        {timer.status === 'paused' && (
          <>
            <button onClick={onResume}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-electric text-white text-xs font-semibold hover:opacity-90 transition-opacity">
              <Play size={12} fill="white" /> Reprendre
            </button>
            <button onClick={onEnd}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 text-rose-600 text-xs font-semibold hover:bg-rose-100 transition-colors">
              <Square size={12} /> Terminer
            </button>
          </>
        )}
        {timer.status === 'ended' && (
          <button onClick={onReset}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-paper-warm text-ink text-xs font-semibold border border-border hover:bg-white transition-colors">
            <RotateCcw size={12} /> Nouvelle journée
          </button>
        )}
      </div>
    </div>
  )
}

// ─── AddEventModal ────────────────────────────────────────────────────────────
function EventModal({ event, date, onClose, onSave, onDelete }) {
  const isEdit = !!event
  const [form, setForm] = useState({
    titre: event?.titre || '',
    heureDebut: event?.heureDebut || '09:00',
    heureFin: event?.heureFin || '10:00',
    couleur: event?.couleur || EV_COLORS[0],
  })
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target?.value ?? e }))
  const displayDate = isEdit ? event.date : date

  const submit = (e) => {
    e.preventDefault()
    if (!form.titre.trim()) { toast.error('Titre requis'); return }
    onSave({ ...form, titre: form.titre.trim() })
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm z-[60]"
        onClick={e => e.target === e.currentTarget && onClose()}>
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold text-ink text-sm">
              {isEdit ? 'Modifier l\'événement' : `Nouvel événement — ${fmtDate(displayDate)}`}
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-paper-warm flex items-center justify-center text-muted">
              <X size={14} />
            </button>
          </div>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="label-text mb-1.5 block">Titre *</label>
              <input className="input-field" placeholder="Réunion client…" value={form.titre} onChange={set('titre')} autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label-text mb-1.5 block">Début</label><input type="time" className="input-field" value={form.heureDebut} onChange={set('heureDebut')} /></div>
              <div><label className="label-text mb-1.5 block">Fin</label><input type="time" className="input-field" value={form.heureFin} onChange={set('heureFin')} /></div>
            </div>
            <div>
              <label className="label-text mb-1.5 block">Couleur</label>
              <div className="flex gap-2 flex-wrap">
                {EV_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setForm(f => ({ ...f, couleur: c }))}
                    className={`w-7 h-7 rounded-full transition-all ${form.couleur === c ? 'ring-2 ring-offset-2 ring-ink scale-110' : ''}`}
                    style={{ background: c }} />
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              {isEdit && (
                <button type="button" onClick={onDelete}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors flex-shrink-0">
                  <Trash2 size={13} /> Supprimer
                </button>
              )}
              <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center text-sm">Annuler</button>
              <button type="submit" className="btn-primary flex-1 justify-center text-sm">
                {isEdit ? <><Pencil size={13} /> Enregistrer</> : <><Plus size={13} /> Ajouter</>}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

// ─── SwipeComplete ────────────────────────────────────────────────────────────
function SwipeComplete({ onComplete, onProgress, initialProgress = 0, label }) {
  const trackRef = useRef(null)
  const [progress, setProgress] = useState(initialProgress)
  const [isDragging, setIsDragging] = useState(false)
  const progressRef = useRef(initialProgress)
  const draggingRef = useRef(false)
  const startDataRef = useRef({ x: 0, base: 0 })

  useEffect(() => {
    if (!draggingRef.current) {
      setProgress(initialProgress)
      progressRef.current = initialProgress
    }
  }, [initialProgress])

  const setP = (v) => { setProgress(v); progressRef.current = v }

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    draggingRef.current = true
    setIsDragging(true)
    startDataRef.current = { x: e.clientX, base: progressRef.current }
  }

  const onPointerMove = (e) => {
    if (!draggingRef.current) return
    const track = trackRef.current
    if (!track) return
    const delta = (e.clientX - startDataRef.current.x) / track.clientWidth
    const next = Math.max(0, Math.min(1, startDataRef.current.base + delta))
    setP(next)
    if (next >= 1) {
      draggingRef.current = false
      setIsDragging(false)
      setP(1)
      onComplete()
    }
  }

  const onPointerUp = () => {
    if (!draggingRef.current) return
    draggingRef.current = false
    setIsDragging(false)
    onProgress?.(progressRef.current)
  }

  const pct = Math.round(progress * 100)
  const handleColor = progress > 0.7 ? '#059669' : progress > 0.35 ? '#0D9488' : '#14B8A6'

  return (
    <div ref={trackRef}
      className="relative h-10 rounded-xl bg-teal-50 border border-teal-200 overflow-hidden select-none touch-none cursor-grab active:cursor-grabbing"
      onPointerDown={onPointerDown} onPointerMove={onPointerMove}
      onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
      {/* Progressive fill */}
      <div
        className="absolute inset-y-0 left-0"
        style={{
          width: `${progress * 100}%`,
          background: `rgba(13,148,136,${0.18 + progress * 0.62})`,
          transition: isDragging ? 'none' : 'width 0.35s ease',
        }}
      />
      {/* Label / percentage */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {progress > 0.02 ? (
          <span className="text-sm font-bold text-teal-800 tabular-nums">{pct}%</span>
        ) : (
          <span className="text-[11px] font-semibold text-teal-600">{label || 'Glisser pour progresser →'}</span>
        )}
      </div>
      {/* Drag handle */}
      <div
        className="absolute top-1.5 bottom-1.5 w-7 rounded-lg flex items-center justify-center shadow-sm pointer-events-none"
        style={{
          left: `calc(${progress * 100}% - ${progress * 28}px + 4px)`,
          background: handleColor,
          transition: isDragging ? 'none' : 'left 0.35s ease, background 0.3s ease',
        }}
      >
        <GripHorizontal size={12} className="text-white" />
      </div>
    </div>
  )
}

// ─── AutoformationModal ───────────────────────────────────────────────────────
function AutoformationModal({ onClose, onSave, onDelete, event: existingEvent }) {
  const isEdit = !!existingEvent
  const [form, setForm] = useState({
    titre: existingEvent?.titre || '',
    date: existingEvent?.date || new Date().toISOString().slice(0, 10),
    heureDebut: existingEvent?.heureDebut || '09:00',
    heureFin: existingEvent?.heureFin || '10:00',
    description: existingEvent?.description || '',
    lien: existingEvent?.lien || '',
  })
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <AnimatePresence>
      <div className="fixed inset-0 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm z-[60]"
        onClick={e => e.target === e.currentTarget && onClose()}>
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold text-ink text-sm">{isEdit ? "Modifier l'autoformation" : 'Nouvelle autoformation'}</div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-paper-warm flex items-center justify-center text-muted"><X size={14} /></button>
          </div>
          <form onSubmit={e => { e.preventDefault(); if (!form.titre.trim()) { toast.error('Titre requis'); return }; onSave({ ...form, titre: form.titre.trim() }) }} className="space-y-3">
            <div>
              <label className="label-text mb-1.5 block">Titre *</label>
              <input className="input-field" placeholder="Formation React, Design…" value={form.titre} onChange={set('titre')} autoFocus />
            </div>
            <div>
              <label className="label-text mb-1.5 block">Date</label>
              <input type="date" className="input-field" value={form.date} onChange={set('date')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label-text mb-1.5 block">Début</label><input type="time" className="input-field" value={form.heureDebut} onChange={set('heureDebut')} /></div>
              <div><label className="label-text mb-1.5 block">Fin</label><input type="time" className="input-field" value={form.heureFin} onChange={set('heureFin')} /></div>
            </div>
            <div>
              <label className="label-text mb-1.5 block">Description <span className="text-muted font-normal">(optionnel)</span></label>
              <textarea className="input-field resize-none" rows={2} placeholder="Objectifs, contenu…" value={form.description} onChange={set('description')} />
            </div>
            <div>
              <label className="label-text mb-1.5 block">Lien ressource <span className="text-muted font-normal">(optionnel)</span></label>
              <input type="url" className="input-field" placeholder="https://…" value={form.lien} onChange={set('lien')} />
            </div>
            <div className="flex gap-2 pt-1">
              {isEdit && (
                <button type="button" onClick={onDelete}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 flex-shrink-0">
                  <Trash2 size={13} /> Supprimer
                </button>
              )}
              <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center text-sm">Annuler</button>
              <button type="submit" className="btn-primary flex-1 justify-center text-sm">
                {isEdit ? <><Pencil size={13} /> Modifier</> : <><Plus size={13} /> Ajouter</>}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

// ─── RdvPlanningModal ─────────────────────────────────────────────────────────
function RdvPlanningModal({ employes, prospects, collaborateurs, myId, onClose, onConfirm, event: existingEvent }) {
  const isEdit = !!existingEvent
  const [form, setForm] = useState({
    titre: existingEvent?.titre || '',
    date: existingEvent?.date || new Date().toISOString().slice(0, 10),
    heureDebut: existingEvent?.heureDebut || '09:00',
    heureFin: existingEvent?.heureFin || '10:00',
    format: existingEvent?.format || 'presentiel',
    adresse: existingEvent?.adresse || '',
  })
  const [teamSel, setTeamSel] = useState(() => new Set(
    existingEvent?.participants ? existingEvent.participants.map(String) : [String(myId)]
  ))
  const [search, setSearch] = useState('')
  const [extraParts, setExtraParts] = useState(
    () => [
      ...(existingEvent?.clientParticipants || []),
      ...(existingEvent?.collabParticipants || []),
    ]
  )

  const searchResults = useMemo(() => {
    if (search.length < 2) return []
    const q = search.toLowerCase()
    const clientResults = (prospects || [])
      .filter(p => p.statut === 'contrat_signe')
      .filter(p => !extraParts.some(ep => ep.type === 'client' && ep.id === p.id))
      .filter(p => `${p.prenom} ${p.nom}`.toLowerCase().includes(q))
      .slice(0, 4)
      .map(p => ({ type: 'client', id: p.id, nom: `${p.prenom} ${p.nom}` }))
    const collabResults = (collaborateurs || [])
      .filter(c => !extraParts.some(ep => ep.type === 'collab' && ep.id === c.id))
      .filter(c => `${c.prenom || ''} ${c.nom || ''}`.toLowerCase().includes(q))
      .slice(0, 4)
      .map(c => ({ type: 'collab', id: c.id, nom: `${c.prenom || ''} ${c.nom || ''}`.trim() || c.metier || '—' }))
    return [...clientResults, ...collabResults]
  }, [search, prospects, collaborateurs, extraParts])

  const toggleTeam = (id) => {
    const strId = String(id)
    setTeamSel(prev => {
      const next = new Set(prev)
      if (next.has(strId)) { if (strId !== String(myId)) next.delete(strId) }
      else next.add(strId)
      return next
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.titre.trim()) { toast.error('Titre requis'); return }
    onConfirm({
      ...form,
      titre: form.titre.trim(),
      participants: [...teamSel],
      clientParticipants: extraParts.filter(ep => ep.type === 'client'),
      collabParticipants: extraParts.filter(ep => ep.type === 'collab'),
    })
  }

  const activeEmployes = (employes || []).filter(e => e.statut === 'actif' || e.isDirecteur)

  return (
    <AnimatePresence>
      <div className="fixed inset-0 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm z-[60]"
        onClick={e => e.target === e.currentTarget && onClose()}>
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2 font-semibold text-ink text-sm">
              <CalendarPlus size={15} className="text-orange-500" />
              {isEdit ? 'Modifier le RDV' : 'Nouveau RDV'}
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-paper-warm flex items-center justify-center text-muted"><X size={16} /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className="label-text mb-1.5 block">Titre *</label>
              <input className="input-field" placeholder="Réunion de conception…" value={form.titre}
                onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} autoFocus />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label-text mb-1.5 block">Date</label>
                <input type="date" className="input-field" value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className="label-text mb-1.5 block">Début</label>
                <input type="time" className="input-field" value={form.heureDebut}
                  onChange={e => setForm(f => ({ ...f, heureDebut: e.target.value }))} />
              </div>
              <div>
                <label className="label-text mb-1.5 block">Fin</label>
                <input type="time" className="input-field" value={form.heureFin}
                  onChange={e => setForm(f => ({ ...f, heureFin: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label-text mb-1.5 block">Format</label>
              <div className="flex gap-2">
                {[
                  { v: 'presentiel', label: 'Présentiel', Icon: MapPin },
                  { v: 'telephonique', label: 'Téléphonique', Icon: Phone },
                  { v: 'meet', label: 'Google Meet', Icon: Video },
                ].map(({ v, label, Icon }) => (
                  <button key={v} type="button" onClick={() => setForm(f => ({ ...f, format: v }))}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                      form.format === v ? 'bg-ink text-paper border-ink' : 'bg-white text-muted border-border hover:border-ink/30'
                    }`}>
                    <Icon size={11} /> {label}
                  </button>
                ))}
              </div>
              {form.format === 'meet' && (
                <a href="https://meet.google.com/new" target="_blank" rel="noreferrer"
                  className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700">
                  <Video size={11} /> Ouvrir Google Meet →
                </a>
              )}
              {form.format === 'presentiel' && (
                <div className="mt-2">
                  <label className="label-text mb-1.5 block">Adresse / Localisation</label>
                  <div className="relative">
                    <MapPin size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-orange-400 pointer-events-none" />
                    <input type="text" className="input-field pl-8 text-sm"
                      placeholder="Ex : 12 Rue Mohammed V, Casablanca"
                      value={form.adresse}
                      onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))} />
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="label-text mb-1.5 block">Équipe</label>
              <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                {activeEmployes.map(e => {
                  const strId = String(e.id)
                  const isMe = strId === String(myId)
                  const sel = teamSel.has(strId)
                  return (
                    <button key={e.id} type="button" onClick={() => toggleTeam(e.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-colors ${
                        sel ? 'bg-electric/10 text-electric border border-electric/20' : 'bg-paper-warm text-muted hover:text-ink'
                      }`}>
                      <div className="w-6 h-6 rounded-full bg-ink/10 flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                        {getInitials(e.nom)}
                      </div>
                      <span className="flex-1 text-left font-medium">{e.prenom || e.nom}</span>
                      {isMe && <span className="text-[9px] text-muted">Vous</span>}
                      {sel && <CheckCircle size={12} className="text-electric flex-shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <label className="label-text mb-1.5 block">
                Client ou collaborateur <span className="font-normal text-muted">(tapez pour rechercher)</span>
              </label>
              <div className="relative">
                <input className="input-field pl-8 text-sm" placeholder="Nom du client ou collaborateur…"
                  value={search} onChange={e => setSearch(e.target.value)} />
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              </div>
              {search.length >= 2 && searchResults.length > 0 && (
                <div className="mt-1 border border-border rounded-xl overflow-hidden bg-white shadow-sm">
                  {searchResults.map(item => (
                    <button key={`${item.type}_${item.id}`} type="button"
                      onClick={() => { setExtraParts(prev => [...prev, item]); setSearch('') }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-paper-warm text-left transition-colors border-b border-border/50 last:border-0">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${item.type === 'client' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                        {item.type === 'client' ? 'Client' : 'Collab'}
                      </span>
                      {item.nom}
                    </button>
                  ))}
                </div>
              )}
              {search.length >= 2 && searchResults.length === 0 && (
                <div className="mt-1 text-xs text-muted px-2">Aucun résultat</div>
              )}
              {extraParts.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {extraParts.map(ep => (
                    <span key={`${ep.type}_${ep.id}`}
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-medium ${
                        ep.type === 'client' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                      }`}>
                      {ep.nom}
                      <button type="button"
                        onClick={() => setExtraParts(prev => prev.filter(x => !(x.type === ep.type && x.id === ep.id)))}
                        className="ml-0.5 hover:opacity-70"><X size={10} /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              {isEdit && (
                <>
                  <button type="button"
                    onClick={() => onConfirm({ _action: 'deleteForMe', groupId: existingEvent.groupId, id: existingEvent.id })}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-muted hover:text-ink border border-border flex-shrink-0">
                    <Trash2 size={11} /> Pour moi
                  </button>
                  <button type="button"
                    onClick={() => onConfirm({ _action: 'deleteAll', groupId: existingEvent.groupId })}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex-shrink-0">
                    <Trash2 size={11} /> Tous
                  </button>
                </>
              )}
              <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center text-sm">Annuler</button>
              <button type="submit" className="btn-primary flex-1 justify-center text-sm">
                <CheckCircle size={14} /> {isEdit ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

// ─── EditRdvProspectModal ─────────────────────────────────────────────────────
function EditRdvProspectModal({ event, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({
    date: event.date || '',
    heureDebut: event.heureDebut || '09:00',
    heureFin: event.heureFin || '10:00',
    format: event.format || 'telephonique',
    adresse: event.adresse || '',
  })
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <AnimatePresence>
      <div className="fixed inset-0 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm z-[60]"
        onClick={e => e.target === e.currentTarget && onClose()}>
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-semibold text-ink text-sm">Modifier le RDV prospect</div>
              <div className="text-xs text-sky-600 font-medium truncate max-w-[200px]">{event.prospectNom || event.titre}</div>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-paper-warm flex items-center justify-center text-muted"><X size={14} /></button>
          </div>
          <form onSubmit={e => { e.preventDefault(); onSave(form) }} className="space-y-3">
            <div>
              <label className="label-text mb-1.5 block">Date</label>
              <input type="date" className="input-field" value={form.date} onChange={set('date')} autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label-text mb-1.5 block">Début</label><input type="time" className="input-field" value={form.heureDebut} onChange={set('heureDebut')} /></div>
              <div><label className="label-text mb-1.5 block">Fin</label><input type="time" className="input-field" value={form.heureFin} onChange={set('heureFin')} /></div>
            </div>
            <div>
              <label className="label-text mb-1.5 block">Format</label>
              <div className="flex gap-2">
                {[
                  { v: 'telephonique', label: 'Tél.', Icon: Phone },
                  { v: 'meet', label: 'Meet', Icon: Video },
                  { v: 'presentiel', label: 'Présentiel', Icon: MapPin },
                ].map(({ v, label, Icon }) => (
                  <button key={v} type="button" onClick={() => setForm(f => ({ ...f, format: v }))}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                      form.format === v ? 'bg-ink text-paper border-ink' : 'bg-white text-muted border-border hover:border-ink/30'
                    }`}>
                    <Icon size={11} /> {label}
                  </button>
                ))}
              </div>
              {form.format === 'presentiel' && (
                <div className="mt-2 relative">
                  <MapPin size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-orange-400 pointer-events-none" />
                  <input type="text" className="input-field pl-8 text-sm"
                    placeholder="Adresse / Localisation"
                    value={form.adresse} onChange={set('adresse')} />
                </div>
              )}
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

// ─── AjouterTacheModal ────────────────────────────────────────────────────────
function AjouterTacheModal({ onClose, employe, projects, addTask, updateTask, deleteTask, editTask }) {
  const isEdit = Boolean(editTask)

  const [form, setForm] = useState(() => isEdit
    ? {
        nom:            editTask.nom || '',
        projectId:      String(editTask.projectId || ''),
        missionId:      editTask.missionId || '',
        deadline:       editTask.deadline || '',
        heuresEstimees: editTask.heuresEstimees || '',
      }
    : { nom: '', projectId: '', missionId: '', deadline: '', heuresEstimees: '' }
  )
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const [errors, setErrors] = useState({})

  const selectedProject = projects.find(p => String(p.id) === form.projectId)
  const missions = (selectedProject?.missions || []).filter(m => m.type === 'mission')

  const validate = () => {
    const e = {}
    if (!form.nom.trim()) e.nom = 'Requis'
    if (!form.projectId) e.projectId = 'Requis'
    if (!form.deadline) e.deadline = 'Requis'
    return e
  }

  const handleSubmit = (ev) => {
    ev.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    const mission = missions.find(m => m.id === form.missionId)
    const heures = form.heuresEstimees ? parseFloat(form.heuresEstimees) : null

    if (isEdit) {
      const projectChanged = String(editTask.projectId) !== form.projectId
      if (projectChanged) {
        // Move: add to new project, delete from old
        addTask(selectedProject.id, {
          ...editTask,
          nom:            form.nom.trim(),
          deadline:       form.deadline,
          heuresEstimees: heures,
          missionId:      mission?.id || null,
          missionNom:     mission?.nom || null,
          selfCreated:    true,
          editedOnce:     true,
          projectNom:     selectedProject.nom,
        })
        deleteTask(editTask.projectId, editTask.id)
      } else {
        updateTask(editTask.projectId, editTask.id, {
          nom:            form.nom.trim(),
          deadline:       form.deadline,
          heuresEstimees: heures,
          missionId:      mission?.id || null,
          missionNom:     mission?.nom || null,
          editedOnce:     true,
        })
      }
      toast.success('Tâche modifiée')
    } else {
      addTask(selectedProject.id, {
        nom:            form.nom.trim(),
        personnelId:    employe.id,
        personnelNom:   employe.nom,
        deadline:       form.deadline,
        heuresEstimees: heures,
        statut:         'Working on it',
        selfCreated:    true,
        missionId:      mission?.id || null,
        missionNom:     mission?.nom || null,
      })
      toast.success(`Tâche "${form.nom.trim()}" créée`)
    }
    onClose()
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={e => e.target === e.currentTarget && onClose()}>
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="px-6 py-5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isEdit ? 'bg-amber-50' : 'bg-electric/10'}`}>
                {isEdit ? <Pencil size={16} className="text-amber-600" /> : <Plus size={16} className="text-electric" />}
              </div>
              <div>
                <div className="font-semibold text-ink text-sm">{isEdit ? 'Modifier la tâche' : 'Nouvelle tâche'}</div>
                <div className="text-xs text-muted">{isEdit ? `"${editTask.nom}"` : 'Ajouter une tâche à un projet'}</div>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-paper-warm flex items-center justify-center text-muted hover:text-ink transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Warning banner in edit mode */}
          {isEdit && (
            <div className="mx-6 mt-5 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
              <AlertCircle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 leading-relaxed">
                <span className="font-semibold">Modification unique.</span> Cette tâche ne pourra plus être modifiée depuis votre planning après enregistrement.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div>
              <label className="label-text mb-1.5 block">Nom de la tâche *</label>
              <input className={`input-field ${errors.nom ? 'border-rose-400' : ''}`}
                placeholder="Ex: Préparer le dossier permis..." value={form.nom} onChange={set('nom')} />
              {errors.nom && <p className="text-xs text-rose-500 mt-1">{errors.nom}</p>}
            </div>

            <div>
              <label className="label-text mb-1.5 block">Projet *</label>
              <SelectField
                value={form.projectId}
                onChange={v => setForm(f => ({ ...f, projectId: v, missionId: '' }))}
                options={[{ value: '', label: 'Sélectionner un projet...' }, ...projects.map(p => ({ value: p.id, label: p.nom }))]}
                placeholder="Sélectionner un projet..."
                error={!!errors.projectId}
              />
              {errors.projectId && <p className="text-xs text-rose-500 mt-1">{errors.projectId}</p>}
              {isEdit && String(editTask.projectId) !== form.projectId && form.projectId && (
                <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
                  <AlertCircle size={10} /> La tâche sera déplacée vers ce projet
                </p>
              )}
            </div>

            {missions.length > 0 && (
              <div>
                <label className="label-text mb-1.5 block">Mission (optionnel)</label>
                <SelectField
                  value={form.missionId}
                  onChange={v => setForm(f => ({ ...f, missionId: v }))}
                  options={[{ value: '', label: 'Aucune mission' }, ...missions.map(m => ({ value: m.id, label: m.nom }))]}
                  placeholder="Aucune mission"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-text mb-1.5 block">Deadline *</label>
                <input type="date" className={`input-field ${errors.deadline ? 'border-rose-400' : ''}`}
                  value={form.deadline} onChange={set('deadline')} />
                {errors.deadline && <p className="text-xs text-rose-500 mt-1">{errors.deadline}</p>}
              </div>
              <div>
                <label className="label-text mb-1.5 block">Heures estimées</label>
                <input type="number" min="0" step="0.5" className="input-field"
                  placeholder="Ex: 4.5" value={form.heuresEstimees} onChange={set('heuresEstimees')} />
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Annuler</button>
              <button type="submit" className={`flex-1 justify-center flex items-center gap-2 ${isEdit ? 'btn-accent' : 'btn-primary'}`}>
                <CheckCircle size={15} /> {isEdit ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

// ─── TaskCard ────────────────────────────────────────────────────────────────
function TaskCard({ task, profile, employe, updateTask, addTaskComment, onEdit }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [commentDraft, setCommentDraft] = useState('')
  const [linkInput, setLinkInput] = useState('')
  const canEdit = task.selfCreated && !task.editedOnce && onEdit
  const comments = task.comments || []
  const files = task.files || []
  const links = task.links || []

  const submitComment = () => {
    const txt = commentDraft.trim()
    if (!txt) return
    addTaskComment(task.projectId, task.id, {
      authorId: String(profile?.id || ''),
      authorName: profile?.full_name || employe?.nom || 'Moi',
      content: txt,
    })
    setCommentDraft('')
  }

  const submitLink = () => {
    const url = linkInput.trim()
    if (!url || !/^https?:\/\//.test(url)) { toast.error('Lien invalide'); return }
    updateTask(task.projectId, task.id, { links: [...links, url] })
    setLinkInput('')
  }

  return (
    <div className="rounded-xl bg-paper-warm border border-border/60 overflow-hidden">
      <div className="p-3">
        {/* Row 1: [pencil] task name + approval + expand */}
        <div className="flex items-start gap-2">
          {/* Pencil — before task name, one-time only */}
          {canEdit && (
            <button onClick={() => onEdit(task)}
              className="w-5 h-5 rounded-md flex items-center justify-center text-muted hover:text-amber-600 hover:bg-amber-50 transition-colors flex-shrink-0 mt-0.5"
              title="Modifier la tâche (une seule fois)">
              <Pencil size={10} />
            </button>
          )}
          <span className="text-sm font-medium text-ink leading-tight flex-1">{task.nom}</span>
          {(() => {
            const ac = getApprovalCfg(task.approval)
            const Icon = ac.Icon
            return (
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border flex-shrink-0 ${ac.cls}`}>
                <Icon size={9} />{ac.label}
              </span>
            )
          })()}
          <button
            onClick={() => setIsExpanded(s => !s)}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-white transition-colors flex-shrink-0"
          >
            <ChevronDown size={13} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Row 2: project name + deadline + counters */}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-xs text-muted font-medium">{task.projectNom}</span>
          {task.deadline && (
            <span className="flex items-center gap-0.5 text-[10px] font-semibold text-muted/80 flex-shrink-0">
              <CalendarDays size={9} />
              {new Date(task.deadline + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
            </span>
          )}
          <span className="flex-1" />
          {comments.length > 0 && <span className="flex items-center gap-0.5 text-[11px] text-muted/70 flex-shrink-0"><Send size={9} /> {comments.length}</span>}
          {files.length > 0 && <span className="flex items-center gap-0.5 text-[11px] text-muted/70 flex-shrink-0"><Paperclip size={9} /> {files.length}</span>}
          {links.length > 0 && <span className="flex items-center gap-0.5 text-[11px] text-muted/70 flex-shrink-0"><ExternalLink size={9} /> {links.length}</span>}
        </div>
        {/* Row 3: status buttons — centered */}
        <div className="flex gap-1.5 mt-2 justify-center">
          {TASK_STATUTS.map(s => (
            <button
              key={s}
              onClick={() => updateTask(task.projectId, task.id, { statut: s })}
              className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                task.statut === s
                  ? TASK_S[s] + ' border-transparent shadow-sm'
                  : 'bg-white border-border text-muted hover:text-ink hover:border-ink/30'
              }`}
            >
              {TASK_L[s]}
            </button>
          ))}
        </div>
      </div>
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/60 px-3 pb-3 pt-3 space-y-4 bg-white">
              <div>
                <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Send size={9} /> Commentaires ({comments.length})
                </div>
                {comments.length > 0 && (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto mb-2">
                    {comments.map(c => (
                      <div key={c.id} className="bg-paper-warm rounded-xl px-3 py-2">
                        <div className="flex items-center gap-2 mb-0.5">
                          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-ink to-electric flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-[7px] font-bold">{(c.authorName || '?')[0]}</span>
                          </div>
                          <span className="text-[11px] font-semibold text-ink">{c.authorName}</span>
                          {c.createdAt && (
                            <span className="text-[10px] text-muted ml-auto">
                              {new Date(c.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-ink/80 leading-relaxed pl-6">{c.content}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    className="input-field flex-1 text-xs py-1.5"
                    placeholder="Ajouter un commentaire…"
                    value={commentDraft}
                    onChange={e => setCommentDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment() } }}
                  />
                  <button onClick={submitComment} className="w-8 h-8 rounded-xl bg-ink text-paper flex items-center justify-center hover:opacity-90 flex-shrink-0">
                    <Send size={12} />
                  </button>
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Paperclip size={9} /> Fichiers ({files.length})
                </div>
                {files.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {files.map((f, i) => (
                      <span key={i} className="flex items-center gap-1 text-[11px] bg-paper-warm border border-border rounded-lg px-2 py-1 text-ink">
                        <Paperclip size={9} className="text-muted flex-shrink-0" />
                        <span className="max-w-[140px] truncate">{fileName(f)}</span>
                        {fileUrl(f) && (
                          <button onClick={() => downloadFile(f)} title="Télécharger" className="flex items-center gap-1 text-[10px] text-electric font-semibold hover:opacity-70 transition-opacity ml-1 px-1.5 py-0.5 rounded bg-electric/10 border border-electric/20">
                            <Download size={11} />
                          </button>
                        )}
                        <button onClick={() => updateTask(task.projectId, task.id, { files: files.filter((_, j) => j !== i) })}
                          className="ml-0.5 text-muted hover:text-rose-500 transition-colors"><X size={8} /></button>
                      </span>
                    ))}
                  </div>
                )}
                <label className="flex items-center gap-1.5 text-xs text-muted hover:text-ink cursor-pointer w-fit px-3 py-1.5 rounded-xl border border-dashed border-border hover:border-ink/30 transition-colors">
                  <Paperclip size={11} /> Ajouter un fichier
                  <input type="file" className="hidden" onChange={async e => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const url = await readFileAsDataUrl(file)
                    updateTask(task.projectId, task.id, { files: [...files, { name: file.name, url }] })
                    e.target.value = ''
                  }} />
                </label>
              </div>
              <div>
                <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ExternalLink size={9} /> Liens Drive ({links.length})
                </div>
                {links.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {links.map((l, i) => (
                      <span key={i} className="flex items-center gap-1 text-[11px] bg-blue-50 border border-blue-100 rounded-lg px-2 py-1">
                        <a href={l} target="_blank" rel="noreferrer" className="text-electric hover:underline flex items-center gap-1">
                          <ExternalLink size={9} /> Drive
                        </a>
                        <button onClick={() => updateTask(task.projectId, task.id, { links: links.filter((_, j) => j !== i) })}
                          className="ml-0.5 text-muted hover:text-rose-500 transition-colors"><X size={8} /></button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    className="input-field flex-1 text-xs py-1.5"
                    placeholder="https://drive.google.com/…"
                    value={linkInput}
                    onChange={e => setLinkInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') submitLink() }}
                  />
                  <button onClick={submitLink} className="w-8 h-8 rounded-xl bg-electric text-white flex items-center justify-center hover:opacity-90 flex-shrink-0">
                    <Plus size={13} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}


// ─── Director KPI styles ──────────────────────────────────────────────────────
const KPI_STYLES = [
  { bg: 'bg-electric/10', ic: 'text-electric' },
  { bg: 'bg-emerald-50', ic: 'text-emerald-600' },
  { bg: 'bg-violet-50', ic: 'text-violet-600' },
  { bg: 'bg-amber-50', ic: 'text-amber-600' },
]

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OverviewPage() {
  const { profile, isDirectorMode, isDirector, isEmployeeMode } = useAuth()
  const {
    projects, employes, transactions, prospects, collaborateurs,
    updateEmploye, addPlanningEvent, deletePlanningEvent, updatePlanningEvent,
    updateGroupPlanningEvent, deleteGroupPlanningEvent, addProspectRdv,
    formations, updateTask, updateMission, updateFormation, addTask, deleteTask, addTaskComment, demandesRH, deleteDemandeRH, addDemandeRH, addNotification,
    joursFerier,
  } = useData()
  const [taskWeekOffset, setTaskWeekOffset] = useState(0)
  const [taskView, setTaskView] = useState('semaine')
  const [selectedDay, setSelectedDay] = useState(() => toISO(new Date()))
  const [showAddTask, setShowAddTask] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [showDemandeModal, setShowDemandeModal] = useState(false)

  const isDir = isDirectorMode || isDirector
  const firstName = profile?.full_name?.split(' ')[0] || 'vous'

  const employe = useMemo(() => {
    if (isDir) return employes.find(e => e.isDirecteur === true) ?? null
    if (isEmployeeMode) return employes.find(e => String(e.id) === String(profile?.employe_id)) ?? null
    return null
  }, [employes, profile, isEmployeeMode, isDir])

  const personalPlanning = employe ? (employe.planning || []) : []

  const myProjects = useMemo(() => {
    if (isDir) return projects
    if (!employe) return []
    return projects.filter(p =>
      String(p.architecteReferentId) === String(employe.id) ||
      (p.equipeProjet || []).map(String).includes(String(employe.id))
    )
  }, [isDir, projects, employe])

  // Formation events for this user (read-only in grid)
  const formationEvents = useMemo(() => {
    const uid = employe ? String(employe.id) : (isDir ? 'director' : null)
    if (!uid) return []
    return formations
      .filter(f => {
        if (isDir) return true
        return (f.personnes || []).map(String).includes(String(employe?.id))
      })
      .map(f => {
        // confirmedBy undefined = ancienne formation = auto-confirmée pour rétrocompatibilité
        const isInPersonnes = (f.personnes || []).map(String).includes(uid)
        const isConfirmed =
          !f.confirmedBy ||                                          // legacy
          (f.confirmedBy || []).map(String).includes(uid) ||        // confirmé explicitement
          (isDir && !isInPersonnes)                                  // DG en vue gestionnaire (pas invité)
        return {
          id: `form_${f.id}`,
          titre: f.nom,
          date: f.date,
          heureDebut: f.heureDebut || '09:00',
          heureFin: f.heureFin || '17:00',
          couleur: '#7C3AED',
          isFormation: true,
          statut: isConfirmed ? 'confirmed' : 'pending',
          formationData: f,
        }
      })
  }, [formations, employe, isDir])

  const allPlanningEvents = useMemo(() =>
    [...personalPlanning, ...formationEvents],
    [personalPlanning, formationEvents]
  )

  const pendingCount = useMemo(() =>
    allPlanningEvents.filter(ev => ev.statut === 'pending').length,
    [allPlanningEvents]
  )

  // ── Work timer ──────────────────────────────────────────────────────────────
  const TIMER_KEY = `clade_timer_${profile?.id || 'guest'}`
  const [timer, setTimer] = useState(() => loadTimer(TIMER_KEY))

  useEffect(() => {
    if (timer.status !== 'running') return
    const id = setInterval(() => {
      // just keep the elapsed running in background (saved to localStorage)
    }, 30000)
    return () => clearInterval(id)
  }, [timer])

  const updateTimer = (updates) => {
    const next = { ...timer, ...updates }
    setTimer(next); saveTimer(TIMER_KEY, next)
  }

  const startTimer = () =>
    updateTimer({ status: 'running', startedAt: Date.now(), pausedAt: null, totalPausedMs: 0, endedAt: null, workDate: getTodayISO() })

  const pauseTimer = () => updateTimer({ status: 'paused', pausedAt: Date.now() })

  const resumeTimer = () => {
    const addPause = timer.pausedAt ? Date.now() - timer.pausedAt : 0
    updateTimer({ status: 'running', pausedAt: null, totalPausedMs: timer.totalPausedMs + addPause })
  }

  const endTimer = () => {
    const now = Date.now()
    const addPause = timer.status === 'paused' && timer.pausedAt ? now - timer.pausedAt : 0
    const totalPaused = timer.totalPausedMs + addPause
    const workedMs = Math.max(0, now - (timer.startedAt || now) - totalPaused)
    const next = { ...timer, status: 'ended', endedAt: now, totalPausedMs: totalPaused }
    setTimer(next); saveTimer(TIMER_KEY, next)
    if (employe) {
      const session = {
        id: `ws${now}`, date: getTodayISO(), workedMs,
        startTime: new Date(timer.startedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        endTime: new Date(now).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      }
      updateEmploye(employe.id, { workSessions: [...(employe.workSessions || []), session] })
    }
    toast.success('Journée enregistrée !')
  }

  const resetTimer = () => {
    const fresh = { ...DEFAULT_TIMER, workDate: getTodayISO() }
    setTimer(fresh); saveTimer(TIMER_KEY, fresh)
  }

  // ── Planning ──────────────────────────────────────────────────────────────
  const [weekOffset, setWeekOffset] = useState(0)
  const [addEventDate, setAddEventDate] = useState(null)
  const [editingEvent, setEditingEvent] = useState(null)
  const [pendingEvent, setPendingEvent] = useState(null)
  const [showRdvModal, setShowRdvModal] = useState(false)
  const [editingRdv, setEditingRdv] = useState(null)
  const [showAutoformationModal, setShowAutoformationModal] = useState(false)
  const [editingAutoformation, setEditingAutoformation] = useState(null)
  const [rdvViewMode, setRdvViewMode] = useState('semaine')
  const [rdvOffset, setRdvOffset] = useState(0)
  const [editingRdvProspect, setEditingRdvProspect] = useState(null)
  const weekDays = useMemo(() => getWeekDates(weekOffset), [weekOffset])
  const weekLabel = `${weekDays[0].toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} — ${weekDays[6].toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
  const todayISO = getTodayISO()

  const handleAddEvent = (ev) => {
    if (!employe) return
    addPlanningEvent(employe.id, { id: `ev${Date.now()}`, ...ev })
  }

  const handleUpdateEvent = (updates) => {
    if (!editingEvent || !employe) return
    updatePlanningEvent(employe.id, editingEvent.id, updates)
    setEditingEvent(null)
  }

  const handleDeleteEvent = (ev) => {
    if (employe) deletePlanningEvent(employe.id, ev.id)
    setEditingEvent(null)
  }

  const handleAcceptInvite = (ev) => {
    if (!employe) return
    const isFormationEv = ev.isFormation || ev.type === 'formation'
    if (isFormationEv) {
      const f = ev.formationData || formations.find(fm => fm.id === (ev.groupId || ev.formationId))
      if (f) updateFormation(f.id, {
        confirmedBy: [...new Set([...(f.confirmedBy || []), String(employe.id)])]
      })
      // Also mark the personal planning event as confirmed (if it exists)
      if (ev.type === 'formation') updatePlanningEvent(employe.id, ev.id, { statut: 'confirmed' })
      toast.success('Formation acceptée ✓')
    } else {
      updatePlanningEvent(employe.id, ev.id, { statut: 'confirmed' })
      toast.success('Invitation acceptée ✓')
    }
    setPendingEvent(null)
  }

  const handleDeclineInvite = (ev) => {
    if (!employe) return
    const isFormationEv = ev.isFormation || ev.type === 'formation'
    if (isFormationEv) {
      const f = ev.formationData || formations.find(fm => fm.id === (ev.groupId || ev.formationId))
      if (f) updateFormation(f.id, {
        personnes: (f.personnes || []).filter(p => String(p) !== String(employe.id))
      })
      deletePlanningEvent(employe.id, ev.id)
      toast.success('Formation déclinée')
    } else {
      deletePlanningEvent(employe.id, ev.id)
      toast.success('Invitation déclinée')
    }
    setPendingEvent(null)
  }

  // ── Attendee hover tooltip ────────────────────────────────────────────────
  const [hoverInfo, setHoverInfo] = useState(null)
  const hoverLeaveTimer = useRef(null)

  const getEventAttendees = useCallback((ev) => {
    if (ev.isFormation) {
      const f = ev.formationData
      if (!f) return []
      const allIds = (f.personnes || []).map(String)
      const confirmedIds = (f.confirmedBy || []).map(String)
      return employes
        .filter(e => allIds.includes(String(e.id)))
        .map(e => ({
          nom: e.nom || '?',
          initials: getInitials(e.nom),
          status: confirmedIds.includes(String(e.id)) ? 'confirmed' : 'pending',
        }))
    }
    if (ev.type === 'rdv' && ev.groupId && (ev.participants || []).length > 1) {
      return (ev.participants || []).map(strId => {
        const emp = employes.find(e => String(e.id) === strId)
        if (!emp) return null
        const empEv = (emp.planning || []).find(pe => pe.groupId === ev.groupId)
        return {
          nom: emp.nom || '?',
          initials: getInitials(emp.nom),
          status: !empEv ? 'declined' : empEv.statut === 'confirmed' ? 'confirmed' : 'pending',
        }
      }).filter(Boolean)
    }
    return []
  }, [employes])

  // ── RDV handlers ──────────────────────────────────────────────────────────
  const myStrId = String(employe?.id || '')

  const handleCreateRdv = ({ titre, date, heureDebut, heureFin, format, participants, clientParticipants, collabParticipants }) => {
    const groupId = `rdv_grp_${Date.now()}`
    const baseEvent = { titre, date, heureDebut, heureFin, couleur: '#F97316', type: 'rdv', format, groupId, participants, clientParticipants, collabParticipants }
    participants.forEach(strId => {
      const emp = employes.find(e => String(e.id) === strId)
      const isCreator = strId === myStrId
      if (emp) addPlanningEvent(emp.id, {
        ...baseEvent,
        id: `${groupId}_${emp.id}`,
        statut: isCreator ? 'confirmed' : 'pending',
        invitedBy: isCreator ? null : myStrId,
      })
    })
    clientParticipants.forEach(cp => {
      addProspectRdv(cp.id, { ...baseEvent, id: `${groupId}_cl_${cp.id}`, nom: titre })
    })
    participants.filter(id => id !== myStrId).forEach(id => {
      addNotification({ read: false, type: 'new_rdv', message: `Nouveau RDV : "${titre}" le ${date} à ${heureDebut}`, targetUserId: id, link: '/app' })
    })
    clientParticipants.forEach(cp => {
      addNotification({ read: false, type: 'new_rdv', message: `Nouveau RDV : "${titre}" le ${date} à ${heureDebut}`, targetUserId: `client:${cp.id}`, link: '/client' })
    })
    toast.success('RDV créé')
    setShowRdvModal(false)
  }

  const handleRdvConfirm = (data) => {
    if (!employe) return
    if (data._action === 'deleteForMe') {
      deletePlanningEvent(employe.id, data.id)
      toast.success('RDV retiré de votre planning')
    } else if (data._action === 'deleteAll') {
      deleteGroupPlanningEvent(data.groupId)
      toast.success('RDV supprimé pour tous')
    } else {
      const { titre, date, heureDebut, heureFin, format } = data
      updateGroupPlanningEvent(editingRdv.groupId, { titre, date, heureDebut, heureFin, format })
      toast.success('RDV mis à jour')
    }
    setEditingRdv(null)
  }

  // ── Autoformation handlers ─────────────────────────────────────────────────
  const myAutoformations = useMemo(() =>
    (employe?.planning || [])
      .filter(ev => ev.type === 'autoformation' || ev.type === 'autoformation_complete')
      .sort((a, b) => (a.date || '').localeCompare(b.date || '')),
    [employe]
  )

  const handleCreateAutoformation = (formData) => {
    if (!employe) return
    addPlanningEvent(employe.id, {
      id: `af${Date.now()}`, type: 'autoformation', couleur: '#0D9488',
      ...formData,
    })
    toast.success('Autoformation ajoutée')
    setShowAutoformationModal(false)
  }

  const handleUpdateAutoformation = (formData) => {
    if (!employe || !editingAutoformation) return
    updatePlanningEvent(employe.id, editingAutoformation.id, formData)
    toast.success('Autoformation mise à jour')
    setEditingAutoformation(null)
  }

  const handleDeleteAutoformation = () => {
    if (!employe || !editingAutoformation) return
    deletePlanningEvent(employe.id, editingAutoformation.id)
    toast.success('Autoformation supprimée')
    setEditingAutoformation(null)
  }

  const handleAutoformationComplete = (ev) => {
    if (!employe) return
    updatePlanningEvent(employe.id, ev.id, {
      type: 'autoformation_complete',
      completedAt: new Date().toISOString(),
      afProgress: 1,
    })
    addNotification({
      type: 'autoformation_complete',
      message: `Autoformation terminée : "${ev.titre}"`,
      targetUserId: String(employe.id),
    })
  }

  const handleAutoformationProgress = (ev, pct) => {
    if (!employe) return
    updatePlanningEvent(employe.id, ev.id, { afProgress: pct })
  }

  // ── Todos ──────────────────────────────────────────────────────────────────
  const TODOS_KEY = `clade_todos_${profile?.id || 'guest'}`
  const [todos, setTodos] = useState(() => {
    try { return JSON.parse(localStorage.getItem(TODOS_KEY) || '[]') } catch { return [] }
  })
  const [newTodo, setNewTodo] = useState('')
  useEffect(() => { try { localStorage.setItem(TODOS_KEY, JSON.stringify(todos)) } catch {} }, [todos])

  const addTodo = () => {
    const text = newTodo.trim(); if (!text) return
    setTodos(prev => [...prev, { id: Date.now(), text, done: false }])
    setNewTodo('')
  }

  // ── My tasks ──────────────────────────────────────────────────────────────
  const myTasks = useMemo(() => {
    if (!employe) return []
    const myId = String(employe.id)
    return projects.flatMap(p =>
      (p.tasks || []).filter(t => String(t.personnelId) === myId).map(t => ({ ...t, projectNom: p.nom, projectId: p.id }))
    )
  }, [projects, employe])

  const taskWeekDays = useMemo(() => getWeekDates(taskWeekOffset), [taskWeekOffset])

  // Sync selected day when navigating weeks
  useEffect(() => {
    const todayISO = toISO(new Date())
    const weekStart = toISO(taskWeekDays[0])
    const weekEnd   = toISO(taskWeekDays[6])
    setSelectedDay(todayISO >= weekStart && todayISO <= weekEnd ? todayISO : weekStart)
  }, [taskWeekOffset]) // eslint-disable-line

  const taskCountForDay = useMemo(() => {
    const map = {}
    taskWeekDays.forEach(d => {
      const iso = toISO(d)
      map[iso] = myTasks.filter(t => getTaskCreatedDate(t) === iso).length
    })
    return map
  }, [myTasks, taskWeekDays])

  const selectedDayTasks = useMemo(() =>
    myTasks.filter(t => getTaskCreatedDate(t) === selectedDay),
    [myTasks, selectedDay]
  )

  // ── My RDVs ───────────────────────────────────────────────────────────────
  // projectDayRdvs: all-day chips above the calendar (project mission RDVs)
  const projectDayRdvs = useMemo(() => {
    return myProjects.flatMap(p =>
      (p.missions || [])
        .filter(m => {
          if (m.type !== 'rdv') return false
          if (isDir) return true
          if (m.personnesIds?.length) return m.personnesIds.map(String).includes(String(employe?.id))
          const nameKey = (employe?.nom || profile?.full_name || '').split(' ')[0]
          return nameKey && m.personnes?.includes(nameKey)
        })
        .map(m => ({ ...m, projectNom: p.nom }))
    )
  }, [myProjects, employe, profile, isDir])

  // projectDeadlines: Gantt deadlines from my projects (for planning display)
  const projectDeadlines = useMemo(() =>
    myProjects.flatMap(p =>
      (p.missions || [])
        .filter(m => m.type === 'deadline')
        .map(m => ({ ...m, projectId: p.id, projectNom: p.nom }))
    )
  , [myProjects])

  // myRdvs: agenda section (project RDVs + deadlines + prospect RDVs + planning rdvs)
  const myRdvs = useMemo(() => {
    const prospectRdvs = (employe?.planning || [])
      .filter(ev => ev.type === 'rdv_prospect')
      .map(ev => ({ ...ev, nom: ev.titre, projectNom: ev.prospectNom || 'Prospect' }))
    const planningRdvs = (employe?.planning || [])
      .filter(ev => ev.type === 'rdv')
      .map(ev => ({ ...ev, nom: ev.titre, projectNom: '' }))
    return [...new Map(
      [...projectDayRdvs, ...projectDeadlines, ...prospectRdvs, ...planningRdvs].map(r => [r.id, r])
    ).values()].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  }, [projectDayRdvs, projectDeadlines, employe])

  // Gantt RDVs with heureDebut/heureFin → timed calendar blocks
  const ganttRdvEvents = useMemo(() =>
    projectDayRdvs
      .filter(rdv => rdv.heureDebut && rdv.heureFin)
      .map(rdv => ({
        ...rdv,
        id: `gantt_${rdv.id}`,
        type: 'gantt_rdv',
        titre: rdv.nom,
        couleur: rdv.couleur || '#6366F1',
        statut: 'confirmed',
      })),
    [projectDayRdvs]
  )

  const rdvRange = useMemo(() => {
    if (rdvViewMode === 'semaine') {
      const days = getWeekDates(rdvOffset)
      return {
        start: toISO(days[0]),
        end: toISO(days[6]),
        label: `${days[0].toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} — ${days[6].toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`,
      }
    }
    if (rdvViewMode === 'mois') {
      const now = new Date()
      const d = new Date(now.getFullYear(), now.getMonth() + rdvOffset, 1)
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      return {
        start: toISO(d),
        end: toISO(lastDay),
        label: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      }
    }
    const year = new Date().getFullYear() + rdvOffset
    return { start: `${year}-01-01`, end: `${year}-12-31`, label: String(year) }
  }, [rdvViewMode, rdvOffset])

  const filteredRdvs = useMemo(() =>
    myRdvs.filter(rdv => rdv.date >= rdvRange.start && rdv.date <= rdvRange.end),
    [myRdvs, rdvRange]
  )

  // Task deadlines for non-approved tasks in my projects
  const taskDeadlines = useMemo(() =>
    myProjects.flatMap(p =>
      (p.tasks || [])
        .filter(t =>
          t.deadline &&
          t.approval !== 'Approved' &&
          t.approval !== 'Great work' &&
          t.statut !== 'Done'
        )
        .map(t => ({ ...t, projectId: p.id, projectNom: p.nom, _isTask: true }))
    )
  , [myProjects])

  // Deadline filter for the agenda section
  const [deadlineFilter, setDeadlineFilter] = useState('all')

  const handleRdvProspectUpdate = (updates) => {
    if (!employe || !editingRdvProspect) return
    updatePlanningEvent(employe.id, editingRdvProspect.id, updates)
    toast.success('RDV mis à jour')
    setEditingRdvProspect(null)
  }

  const handleRdvProspectDelete = () => {
    if (!employe || !editingRdvProspect) return
    deletePlanningEvent(employe.id, editingRdvProspect.id)
    toast.success('RDV supprimé')
    setEditingRdvProspect(null)
  }

  // ── My formations list (for bottom section) ───────────────────────────────
  const myFormationsList = useMemo(() => {
    if (isDir) return formations
    if (!employe) return []
    return formations.filter(f => (f.personnes || []).map(String).includes(String(employe.id)))
  }, [formations, employe, isDir])

  // ── Director KPIs ─────────────────────────────────────────────────────────
  const dirKpis = useMemo(() => {
    if (!isDir) return null
    const thisMonth = new Date().toISOString().slice(0, 7)
    const caMonth = transactions.filter(tx => tx.type === 'entree' && tx.date?.startsWith(thisMonth)).reduce((s, tx) => s + tx.montant, 0)
    const depMonth = transactions.filter(tx => tx.type === 'sortie' && tx.date?.startsWith(thisMonth)).reduce((s, tx) => s + tx.montant, 0)
    return [
      { label: 'Projets actifs', value: projects.filter(p => p.statut !== 'archive').length, sub: `sur ${projects.length} projets`, icon: FolderKanban, si: 0 },
      { label: 'Équipe active', value: employes.filter(e => e.statut === 'actif').length, sub: `sur ${employes.length} collaborateurs`, icon: Users, si: 1 },
      { label: 'CA ce mois', value: caMonth > 0 ? `${(caMonth/1000).toFixed(0)}k MAD` : '—', sub: 'Honoraires encaissés', icon: Wallet, si: 2 },
      { label: 'Dépenses', value: depMonth > 0 ? `${(depMonth/1000).toFixed(0)}k MAD` : '—', sub: 'Ce mois', icon: TrendingDown, si: 3 },
    ]
  }, [isDir, projects, employes, transactions])

  const todayFmt = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="p-4 lg:p-10 space-y-5 lg:space-y-7">

      {/* ── HERO ── */}
      <div className="bg-gradient-ink rounded-2xl lg:rounded-3xl p-6 lg:p-10 text-paper relative overflow-hidden">
        <svg className="absolute -top-12 -right-12 opacity-10" width="400" height="400" viewBox="0 0 400 400">
          <circle cx="200" cy="200" r="180" fill="none" stroke="#06B6D4" strokeWidth="1" />
          <circle cx="200" cy="200" r="130" fill="none" stroke="#06B6D4" strokeWidth="1" />
          <circle cx="200" cy="200" r="80" fill="none" stroke="#06B6D4" strokeWidth="1" />
        </svg>
        <div className="relative max-w-2xl">
          <div className="text-[10px] lg:text-xs tracking-[0.25em] uppercase text-electric mb-3">
            {todayFmt}
          </div>
          <h1 className="font-display text-3xl lg:text-5xl leading-[1.05] mb-3">
            Bonjour, <em className="text-electric">{firstName}</em>.
          </h1>
          <p className="text-paper/70 text-sm lg:text-base">
            L'agence <em>construit</em>, et vous en faites partie.
          </p>
        </div>
      </div>

      {/* ── WORK TIMER (compact bar) ── */}
      <WorkTimer
        timer={timer}
        onStart={startTimer}
        onPause={pauseTimer}
        onResume={resumeTimer}
        onEnd={endTimer}
        onReset={resetTimer}
      />

      {/* ── DIRECTOR OVERVIEW ── */}
      {isDir && dirKpis && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
            {dirKpis.map((k, i) => {
              const Icon = k.icon; const s = KPI_STYLES[k.si]
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }} className="card p-4 lg:p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.bg}`}>
                      <Icon size={16} className={s.ic} strokeWidth={1.8} />
                    </div>
                    <span className="text-xs text-muted text-right leading-tight">{k.label}</span>
                  </div>
                  <div className="font-display text-3xl lg:text-4xl text-ink leading-none mb-1">{k.value}</div>
                  <div className="text-xs text-muted">{k.sub}</div>
                </motion.div>
              )
            })}
          </div>

        </>
      )}

      {/* ── MISSIONS EN COURS + DEADLINES — director AND employee referents ── */}
      {(isDir || (isEmployeeMode && employe)) && (() => {
        const _now = new Date()
        const _in7 = new Date(_now.getTime() + 7 * 86400000)
        const _todayStr = toISO(_now)
        const _in7Str   = toISO(_in7)

        const allMyTasks = myProjects.flatMap(p =>
          (p.tasks || []).map(t => ({ ...t, projectNom: p.nom, projectId: p.id }))
        )

        const deadlineTasks = isDir
          ? allMyTasks
          : allMyTasks.filter(t => String(t.personnelId) === String(employe.id))

        const urgentTasks = deadlineTasks
          .filter(t =>
            t.statut !== 'Done' &&
            t.approval !== 'Approved' &&
            t.approval !== 'Great work' &&
            t.deadline && t.deadline >= _todayStr && t.deadline <= _in7Str
          )
          .sort((a, b) => a.deadline.localeCompare(b.deadline))

        const urgentGanttDeadlines = projectDeadlines
          .filter(dl => !dl.validated && dl.date && dl.date >= _todayStr && dl.date <= _in7Str)
          .sort((a, b) => (a.date || '').localeCompare(b.date || ''))

        const stuckTasks = (isDir ? allMyTasks : deadlineTasks).filter(t => t.statut === 'Stuck')

        const projectsWithMissions = myProjects.filter(p =>
          (p.missions || []).some(m => m.type === 'mission' && m.statut !== 'valide')
        )

        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* LEFT — Missions en cours */}
            <div className="card p-5 flex flex-col" style={{ minHeight: 240 }}>
              <div className="flex items-center gap-3 mb-4 flex-shrink-0">
                <div className="w-8 h-8 rounded-xl bg-electric/10 flex items-center justify-center flex-shrink-0">
                  <Clock size={16} className="text-electric" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="label-text mb-0.5">Suivi temps réel</div>
                  <div className="font-display text-xl text-ink leading-tight">Missions en cours</div>
                </div>
                {projectsWithMissions.length > 0 && (
                  <span className="text-xs font-bold text-electric bg-electric/10 px-2.5 py-1 rounded-full flex-shrink-0">
                    {projectsWithMissions.length}
                  </span>
                )}
              </div>

              {projectsWithMissions.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 py-6">
                  <CheckCircle size={28} className="text-emerald-400" strokeWidth={1.5} />
                  <span className="text-xs text-muted">Toutes les missions sont à jour</span>
                </div>
              ) : (
                <div className="flex-1 space-y-2 overflow-y-auto pr-0.5" style={{ maxHeight: 190 }}>
                  {projectsWithMissions.map(p => {
                    const missions = (p.missions || []).filter(m => m.type === 'mission')
                    const validated = missions.filter(m => m.statut === 'valide').length
                    const current = missions.find(m => m.statut !== 'valide')
                    return (
                      <div key={p.id} className="flex items-center gap-3 p-3 bg-paper-warm rounded-xl hover:bg-white hover:shadow-sm transition-all">
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${validated === missions.length ? 'bg-emerald-100' : 'bg-electric/10'}`}>
                          {validated === missions.length
                            ? <CheckCircle size={13} className="text-emerald-600" />
                            : <Clock size={13} className="text-electric" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-ink truncate">{p.nom}</div>
                          {current && (
                            <div className="flex items-center gap-1.5 text-xs text-muted mt-0.5">
                              <Circle size={5} className="fill-electric text-electric flex-shrink-0" />
                              <span className="truncate">{current.nom}</span>
                              {current.fin && <span className="flex-shrink-0 text-[10px]"> → {fmtDate(current.fin)}</span>}
                            </div>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-[11px] text-muted">{validated}/{missions.length}</div>
                          <div className="text-xs font-bold text-ink">{p.avancement || 0}%</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* RIGHT — Deadlines + bloquées */}
            <div className="card p-5 flex flex-col" style={{ minHeight: 240 }}>
              <div className="flex items-center gap-3 mb-4 flex-shrink-0">
                <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0">
                  <CalendarDays size={16} className="text-rose-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="label-text mb-0.5">Cette semaine</div>
                  <div className="font-display text-xl text-ink leading-tight">
                    {(urgentTasks.length + urgentGanttDeadlines.length) > 0
                      ? `${urgentTasks.length + urgentGanttDeadlines.length} deadline${urgentTasks.length + urgentGanttDeadlines.length > 1 ? 's' : ''} imminente${urgentTasks.length + urgentGanttDeadlines.length > 1 ? 's' : ''}`
                      : 'Deadlines imminentes'}
                  </div>
                </div>
                {(urgentTasks.length > 0 || urgentGanttDeadlines.length > 0 || stuckTasks.length > 0) && (
                  <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full flex-shrink-0">
                    {urgentTasks.length + urgentGanttDeadlines.length + stuckTasks.length}
                  </span>
                )}
              </div>

              {urgentTasks.length === 0 && urgentGanttDeadlines.length === 0 && stuckTasks.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 py-6">
                  <CheckCircle size={28} className="text-emerald-400" strokeWidth={1.5} />
                  <span className="text-xs text-muted">Aucune deadline imminente</span>
                </div>
              ) : (
                <div className="flex-1 space-y-2 overflow-y-auto pr-0.5" style={{ maxHeight: 190 }}>
                  {stuckTasks.map(t => (
                    <div key={t.id} className="flex items-center gap-3 p-3 bg-paper-warm rounded-xl hover:bg-white hover:shadow-sm transition-all">
                      <div className="w-7 h-7 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
                        <AlertCircle size={13} className="text-rose-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-ink truncate">{t.nom}</div>
                        <div className="text-[10px] text-muted truncate">{t.projectNom}{t.personnelNom ? ` · ${t.personnelNom}` : ''}</div>
                      </div>
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-full flex-shrink-0">Bloqué</span>
                    </div>
                  ))}
                  {urgentGanttDeadlines.map(dl => {
                    const isToday = dl.date === _todayStr
                    const dlFmt = new Date(dl.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
                    return (
                      <div key={dl.id} className="flex items-center gap-3 p-3 bg-rose-50/60 border border-rose-100 rounded-xl hover:bg-white hover:shadow-sm transition-all">
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${isToday ? 'bg-rose-200' : 'bg-rose-100'}`}>
                          <span className="text-xs">🎯</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-ink truncate">{dl.nom}</div>
                          <div className="text-[10px] text-rose-600 font-medium truncate">{dl.projectNom} · {isToday ? 'Aujourd\'hui' : dlFmt}</div>
                        </div>
                      </div>
                    )
                  })}
                  {urgentTasks.map(t => {
                    const isToday = t.deadline === _todayStr
                    const dl = new Date(t.deadline + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
                    return (
                      <div key={t.id} className="flex items-center gap-3 p-3 bg-paper-warm rounded-xl hover:bg-white hover:shadow-sm transition-all">
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${isToday ? 'bg-rose-100' : 'bg-rose-50'}`}>
                          <span className={`text-[9px] font-bold ${isToday ? 'text-rose-700' : 'text-rose-500'}`}>
                            {isToday ? 'AUJ.' : dl}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-ink truncate">{t.nom}</div>
                          <div className="text-[10px] text-muted truncate">{t.projectNom}{t.personnelNom ? ` · ${t.personnelNom}` : ''}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>
        )
      })()}

      {/* ── PLANNING GRID ── */}
      <div className="card p-5 lg:p-7">
        <div className="mb-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="label-text mb-1">Mon planning</div>
              <div className="font-display text-2xl text-ink">{weekLabel}</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setWeekOffset(w => w - 1)} className="w-8 h-8 rounded-lg hover:bg-paper-warm border border-border flex items-center justify-center text-muted"><ChevronLeft size={15} /></button>
              <button onClick={() => setWeekOffset(0)} className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-paper-warm text-muted">Aujourd'hui</button>
              <button onClick={() => setWeekOffset(w => w + 1)} className="w-8 h-8 rounded-lg hover:bg-paper-warm border border-border flex items-center justify-center text-muted"><ChevronRight size={15} /></button>
            </div>
          </div>
          {pendingCount > 0 && (
            <span className="mt-2 inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
              {pendingCount} invitation{pendingCount > 1 ? 's' : ''} en attente
            </span>
          )}
        </div>

        {/* Formation legend */}
        <div className="flex items-center gap-4 mb-3 text-xs text-muted flex-wrap">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-400 inline-block" /> Événement</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-violet-600 inline-block" /> Formation</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-orange-400 inline-block" /> RDV projet</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" /> Deadline projet</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-sky-400 inline-block" /> RDV prospect</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-teal-600 inline-block" /> Autoformation</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-300 inline-block" /> Jour férié</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm border-2 border-dashed border-orange-400 inline-block" /> Invitation en attente</span>
        </div>

        <div className="overflow-x-auto">
          <div style={{ minWidth: 700 }}>
            {/* Headers */}
            <div className="grid gap-px" style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}>
              <div />
              {weekDays.map((d, i) => {
                const iso = toISO(d)
                const isToday = iso === todayISO
                const dayRdvs = projectDayRdvs.filter(ev => ev.date === iso && !ev.heureDebut)
                const dayDls  = projectDeadlines.filter(ev => ev.date === iso)
                const dayFeriers = (joursFerier || []).filter(jf => jf.date === iso)
                const isFerie = dayFeriers.length > 0
                return (
                  <div key={i} className={`pb-1 ${isFerie ? 'bg-amber-50/60 rounded-t-lg' : ''}`}>
                    <div className="text-center pb-1">
                      <div className={`text-[10px] uppercase tracking-wide ${isFerie ? 'text-amber-500' : 'text-muted'}`}>{DAY_NAMES[i]}</div>
                      <div className={`text-sm font-semibold mt-0.5 w-7 h-7 rounded-full mx-auto flex items-center justify-center ${isToday ? 'bg-electric text-white' : isFerie ? 'text-amber-600' : 'text-ink'}`}>{d.getDate()}</div>
                    </div>
                    {/* Jours fériés chips */}
                    {dayFeriers.map(jf => (
                      <div key={jf.id} title={jf.nom}
                        className="text-[9px] bg-amber-100 text-amber-700 rounded px-1 py-0.5 truncate mb-0.5 leading-tight flex items-center gap-0.5">
                        <span>☀</span> {jf.nom}
                      </div>
                    ))}
                    {/* All-day RDV chips — only for RDVs without a specific time */}
                    {dayRdvs.filter(rdv => !rdv.heureDebut).map(rdv => (
                      <div key={rdv.id} title={`${rdv.nom} — ${rdv.projectNom}`}
                        className="text-[9px] bg-sky-100 text-sky-700 rounded px-1 py-0.5 truncate mb-0.5 leading-tight">
                        📅 {rdv.nom}
                      </div>
                    ))}
                    {/* All-day Deadline chips */}
                    {dayDls.map(dl => (
                      <div key={dl.id} title={`🎯 ${dl.nom} — ${dl.projectNom}`}
                        className="text-[9px] bg-rose-100 text-rose-700 rounded px-1 py-0.5 truncate mb-0.5 leading-tight">
                        🎯 {dl.nom}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>

            {/* Grid */}
            <div className="grid gap-px" style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}>
              <div className="flex flex-col">
                {HOURS.map(h => (
                  <div key={h} style={{ height: ROW_H }} className="flex items-start justify-end pr-2 pt-1 text-[10px] text-muted">{h}h</div>
                ))}
              </div>
              {weekDays.map((d, di) => {
                const iso = toISO(d)
                const dayEvents = [...allPlanningEvents, ...ganttRdvEvents].filter(ev => ev.date === iso)
                const isToday = iso === todayISO
                const isFerieDay = (joursFerier || []).some(jf => jf.date === iso)
                return (
                  <div key={di}
                    className={`relative border-l border-border cursor-pointer ${isToday ? 'bg-electric/[0.03]' : isFerieDay ? 'bg-amber-50/40' : ''}`}
                    style={{ height: ROW_H * HOURS.length }}
                    onClick={() => setAddEventDate(iso)}>
                    {HOURS.map((_, hi) => (
                      <div key={hi} className="absolute w-full border-t border-border/50" style={{ top: hi * ROW_H }} />
                    ))}
                    {dayEvents.map(ev => {
                      const { top, height } = evStyle(ev)
                      const isFormation = ev.isFormation || ev.type === 'formation'
                      const isRdv = ev.type === 'rdv'
                      const isGanttRdv = ev.type === 'gantt_rdv'
                      const isRdvProspect = ev.type === 'rdv_prospect'
                      const isAutoformation = ev.type === 'autoformation' || ev.type === 'autoformation_complete'
                      const isPending = ev.statut === 'pending' || (ev.type === 'formation' && ev.statut !== 'confirmed')
                      const isReadOnly = (isFormation && !isPending) || isGanttRdv
                      const evColor = getEvColor(ev)
                      const prefix = isFormation ? '📚 ' : isRdv || isGanttRdv ? '📅 ' : isRdvProspect ? '📞 ' : isAutoformation ? '🎓 ' : ''
                      const confirmedOnDay = dayEvents.filter(e => e.statut !== 'pending')
                      const hasConflict = isPending && confirmedOnDay.some(ce => eventsOverlap(ev, ce))
                      return (
                        <div key={ev.id}
                          className={`absolute left-1 right-1 rounded-md px-1.5 py-1 text-[10px] font-medium overflow-hidden transition-all cursor-pointer
                            ${isPending
                              ? 'border-2 border-dashed hover:opacity-80'
                              : `text-white ${isReadOnly ? 'opacity-90 cursor-default' : 'hover:brightness-90'}`
                            }`}
                          style={{
                            top: top + 2,
                            height: height - 4,
                            background: isPending ? `${evColor}22` : evColor,
                            borderColor: isPending ? (hasConflict ? '#F43F5E' : evColor) : undefined,
                            color: isPending ? (hasConflict ? '#F43F5E' : evColor) : 'white',
                            boxShadow: isPending && hasConflict ? `0 0 0 1px #F43F5E40` : undefined,
                          }}
                          onMouseEnter={e => {
                            clearTimeout(hoverLeaveTimer.current)
                            const attendees = getEventAttendees(ev)
                            if (!attendees.length) return
                            const rect = e.currentTarget.getBoundingClientRect()
                            setHoverInfo({ ev, rect, attendees })
                          }}
                          onMouseLeave={() => {
                            hoverLeaveTimer.current = setTimeout(() => setHoverInfo(null), 120)
                          }}
                          onClick={e => {
                            e.stopPropagation()
                            if (isPending) {
                              setPendingEvent({ ...ev, hasConflict })
                            } else if (isFormation) {
                              toast(`📚 ${ev.formationData?.nom || ev.titre} · ${ev.heureDebut}–${ev.heureFin}`, { duration: 3000 })
                            } else if (isRdv) {
                              setEditingRdv(ev)
                            } else if (isRdvProspect) {
                              setEditingRdvProspect(ev)
                            } else if (isAutoformation) {
                              setEditingAutoformation(ev)
                            } else {
                              setEditingEvent(ev)
                            }
                          }}>
                          <div className="truncate flex items-center gap-1">
                            {isPending && hasConflict && <AlertCircle size={9} className="flex-shrink-0" />}
                            {isPending ? '⏳ ' : prefix}{ev.titre}
                          </div>
                          <div className="opacity-70">{ev.heureDebut}–{ev.heureFin}</div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        <p className="text-xs text-muted mt-3">Cliquer sur un jour pour ajouter · cliquer sur un événement personnel pour modifier</p>
      </div>

      {/* ── TODOS + TASKS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <div><div className="label-text mb-1">Personnel</div><div className="font-display text-xl text-ink">Ma liste</div></div>
            {todos.some(t => t.done) && (
              <button onClick={() => setTodos(prev => prev.filter(t => !t.done))} className="text-xs text-muted hover:text-rose-500 flex items-center gap-1">
                <Trash2 size={11} /> Vider terminées
              </button>
            )}
          </div>
          <div className="flex gap-2 mb-4">
            <input type="text" className="input-field flex-1 text-sm" placeholder="Ajouter une tâche…"
              value={newTodo} onChange={e => setNewTodo(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTodo()} />
            <button onClick={addTodo} className="w-10 h-10 rounded-xl bg-ink text-paper flex items-center justify-center hover:opacity-90 flex-shrink-0"><Plus size={16} /></button>
          </div>
          {todos.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted">Aucune tâche pour l'instant</div>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              <AnimatePresence>
                {todos.map(todo => (
                  <motion.div key={todo.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-paper-warm group">
                    <button onClick={() => setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, done: !t.done } : t))}
                      className="flex-shrink-0 text-muted hover:text-electric transition-colors">
                      {todo.done ? <CheckCircle2 size={18} className="text-electric" /> : <Circle size={18} />}
                    </button>
                    <span className={`flex-1 text-sm ${todo.done ? 'line-through text-muted' : 'text-ink'}`}>{todo.text}</span>
                    <button onClick={() => setTodos(prev => prev.filter(t => t.id !== todo.id))}
                      className="text-muted hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"><X size={14} /></button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div className="card p-5 lg:p-6">
          {/* Header */}
          <div className="mb-4">
            <div className="label-text mb-0.5">Projets</div>
            <div className="flex items-center justify-between gap-2">
              <div className="font-display text-xl text-ink leading-tight">Mes tâches assignées</div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {employe && (
                  <button onClick={() => setShowAddTask(true)}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-electric text-white rounded-xl text-xs font-semibold hover:bg-electric/90 transition-colors shadow-sm">
                    <Plus size={12} />
                    <span className="hidden sm:inline">Nouvelle tâche</span>
                    <span className="sm:hidden">Tâche</span>
                  </button>
                )}
                <div className="flex gap-1 bg-paper-warm border border-border rounded-xl p-1">
                  {[['semaine','Semaine'],['liste','To Do']].map(([v,l]) => (
                    <button key={v} onClick={() => setTaskView(v)}
                      className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${taskView === v ? 'bg-white shadow-sm text-ink' : 'text-muted hover:text-ink'}`}>{l}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Semaine: day-pill nav + tasks for selected day */}
          {taskView === 'semaine' && (
            <>
              {/* Week navigation + day buttons */}
              <div className="flex items-center gap-2 mb-4">
                <button onClick={() => setTaskWeekOffset(w => w - 1)}
                  className="w-8 h-8 rounded-xl border border-border hover:bg-paper-warm flex items-center justify-center text-muted flex-shrink-0 transition-colors">
                  <ChevronLeft size={14} />
                </button>
                <div className="flex-1 flex gap-1.5 overflow-x-auto pb-0.5">
                  {taskWeekDays.map((d, i) => {
                    const iso     = toISO(d)
                    const isActive = iso === selectedDay
                    const isToday  = iso === toISO(new Date())
                    const count    = taskCountForDay[iso] || 0
                    return (
                      <button key={iso} onClick={() => setSelectedDay(iso)}
                        className={`flex-1 flex flex-col items-center py-2 px-1 rounded-xl transition-all min-w-[38px] border ${
                          isActive
                            ? 'bg-ink text-paper border-transparent shadow-md'
                            : isToday
                              ? 'bg-electric/10 text-electric border-electric/30 hover:bg-electric/20'
                              : 'bg-white border-border text-ink hover:border-ink/30 hover:bg-paper-warm'
                        }`}>
                        <span className={`text-[9px] font-bold uppercase tracking-wider mb-0.5 ${isActive ? 'text-paper/60' : isToday ? 'text-electric/70' : 'text-muted'}`}>
                          {DAY_NAMES[i]}
                        </span>
                        <span className="text-sm font-bold leading-none">{d.getDate()}</span>
                        <span className={`w-1.5 h-1.5 rounded-full mt-1 transition-all ${
                          count > 0
                            ? isActive ? 'bg-electric' : 'bg-electric/60'
                            : 'bg-transparent'
                        }`} />
                      </button>
                    )
                  })}
                </div>
                <button onClick={() => setTaskWeekOffset(w => w + 1)}
                  className="w-8 h-8 rounded-xl border border-border hover:bg-paper-warm flex items-center justify-center text-muted flex-shrink-0 transition-colors">
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* Selected day label */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold text-ink capitalize">
                  {new Date(selectedDay + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
                {selectedDay === toISO(new Date()) && (
                  <span className="text-[10px] font-bold text-electric bg-electric/10 px-2 py-0.5 rounded-full">Aujourd'hui</span>
                )}
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] text-muted">{selectedDayTasks.length} tâche{selectedDayTasks.length !== 1 ? 's' : ''}</span>
                {taskWeekOffset !== 0 && (
                  <button onClick={() => setTaskWeekOffset(0)}
                    className="text-[10px] text-electric font-semibold hover:underline">
                    Aujourd'hui
                  </button>
                )}
              </div>

              {selectedDayTasks.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted">Aucune tâche ce jour</div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {selectedDayTasks.map(task => (
                    <TaskCard key={task.id} task={task} profile={profile} employe={employe} updateTask={updateTask} addTaskComment={addTaskComment} onEdit={setEditingTask} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* To Do: all tasks not yet approved, including working/stuck */}
          {taskView === 'liste' && (() => {
            const todoTasks = myTasks.filter(t =>
              t.statut === 'Working on it' || t.statut === 'Stuck' ||
              (t.approval !== 'Approved' && t.approval !== 'Great work')
            )
            return todoTasks.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted">Aucune tâche en attente</div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {todoTasks.map(task => (
                  <TaskCard key={task.id} task={task} profile={profile} employe={employe} updateTask={updateTask} addTaskComment={addTaskComment} onEdit={setEditingTask} />
                ))}
              </div>
            )
          })()}
        </div>

        {showAddTask && employe && (
          <AjouterTacheModal
            onClose={() => setShowAddTask(false)}
            employe={employe}
            projects={projects}
            addTask={addTask}
            updateTask={updateTask}
            deleteTask={deleteTask}
          />
        )}
        {editingTask && (
          <AjouterTacheModal
            onClose={() => setEditingTask(null)}
            employe={employe}
            projects={projects}
            addTask={addTask}
            updateTask={updateTask}
            deleteTask={deleteTask}
            editTask={editingTask}
          />
        )}
      </div>

      {/* ── RDVS + FORMATIONS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="card p-5 lg:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-electric/10 flex items-center justify-center flex-shrink-0">
            <CalendarDays size={16} className="text-electric" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="label-text">Agenda</div>
            <div className="font-display text-xl text-ink">Mes RDVs & deadlines</div>
          </div>
          {employe && (
            <button onClick={() => setShowRdvModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-electric/10 text-electric border border-electric/20 rounded-xl text-xs font-semibold hover:bg-electric/15 transition-colors flex-shrink-0">
              <CalendarPlus size={13} /> + RDV
            </button>
          )}
        </div>

        {/* View mode tabs */}
        <div className="flex items-center gap-1 mb-2">
          {[['semaine', 'Semaine'], ['mois', 'Mois'], ['annee', 'Année']].map(([mode, label]) => (
            <button key={mode} onClick={() => { setRdvViewMode(mode); setRdvOffset(0) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${rdvViewMode === mode ? 'bg-ink text-white' : 'text-muted hover:text-ink hover:bg-paper-warm'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2 mb-3 bg-paper-warm rounded-xl px-3 py-2">
          <button onClick={() => setRdvOffset(o => o - 1)}
            className="w-7 h-7 rounded-lg hover:bg-white border border-border flex items-center justify-center text-muted flex-shrink-0">
            <ChevronLeft size={14} />
          </button>
          <span className="flex-1 text-xs font-medium text-ink text-center capitalize">{rdvRange.label}</span>
          <button onClick={() => setRdvOffset(0)}
            className="text-[10px] text-muted hover:text-ink px-2 font-medium flex-shrink-0">
            Auj.
          </button>
          <button onClick={() => setRdvOffset(o => o + 1)}
            className="w-7 h-7 rounded-lg hover:bg-white border border-border flex items-center justify-center text-muted flex-shrink-0">
            <ChevronRight size={14} />
          </button>
        </div>

        {(() => {
          const _rdvWeekStart = rdvRange.start
          const _rdvWeekEnd   = rdvRange.end
          const visibleItems = [
            ...filteredRdvs.filter(r => r.type !== 'deadline'),
            ...projectDeadlines.filter(dl => !dl.validated && dl.date >= _rdvWeekStart && dl.date <= _rdvWeekEnd),
            ...taskDeadlines.filter(t => t.deadline >= _rdvWeekStart && t.deadline <= _rdvWeekEnd)
              .map(t => ({ ...t, date: t.deadline, _isTask: true })),
          ].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
          if (visibleItems.length === 0) {
            const emptyLabel = rdvViewMode === 'mois' ? 'ce mois' : rdvViewMode === 'annee' ? 'cette année' : 'cette semaine'
            return <div className="py-6 text-center text-sm text-muted">Aucun élément {emptyLabel}</div>
          }
          return (
            <div className="space-y-2">
              {visibleItems.map(rdv => {
                const isTaskItem = rdv._isTask
                const isGanttDeadline = rdv.type === 'deadline' && !isTaskItem
                const canEdit = rdv.type === 'rdv' || rdv.type === 'rdv_prospect'
                const dateBg = isGanttDeadline || isTaskItem
                  ? 'bg-rose-100 text-rose-700'
                  : rdv.format === 'meet' ? 'bg-emerald-100 text-emerald-700'
                  : rdv.type === 'rdv_prospect' ? 'bg-sky-100 text-sky-700'
                  : 'bg-electric/10 text-electric'
                return (
                  <div key={rdv.id} className={`flex items-center gap-3 p-3 rounded-xl group ${isGanttDeadline || isTaskItem ? 'bg-rose-50/60 border border-rose-100' : 'bg-paper-warm'}`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold ${dateBg}`}>
                      {isGanttDeadline ? '🎯' : isTaskItem ? '📋' : new Date(rdv.date).getDate()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink truncate">{rdv.nom}</div>
                      <div className="text-xs text-muted flex items-center gap-1.5 flex-wrap">
                        {rdv.projectNom && <><span className={(isGanttDeadline || isTaskItem) ? 'text-rose-600 font-semibold' : ''}>{rdv.projectNom}</span><span>·</span></>}
                        <span>{fmtDate(rdv.date)}</span>
                        {isGanttDeadline && <span className="text-rose-600 font-semibold">· Deadline Gantt</span>}
                        {isTaskItem && <span className="text-rose-600 font-semibold">· Deadline tâche</span>}
                        {rdv.heureDebut && <><span>·</span><span>{rdv.heureDebut}</span></>}
                        {rdv.format === 'meet' && <span className="text-emerald-600 font-medium">· 📹 Meet</span>}
                        {rdv.format === 'telephonique' && <span className="text-sky-600 font-medium">· 📞 Tél.</span>}
                        {rdv.format === 'presentiel' && <span className="text-muted font-medium">· 📍 Présentiel</span>}
                      </div>
                    </div>
                    {rdv.format === 'meet' && (
                      <a href="https://meet.google.com/new" target="_blank" rel="noreferrer"
                        className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 hover:bg-emerald-200 transition-colors flex-shrink-0"
                        title="Rejoindre Google Meet">
                        <Video size={14} />
                      </a>
                    )}
                    {canEdit && (
                      <button
                        onClick={() => rdv.type === 'rdv' ? setEditingRdv(rdv) : setEditingRdvProspect(rdv)}
                        className="w-8 h-8 rounded-lg hover:bg-border/50 flex items-center justify-center text-muted hover:text-ink opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                        title="Modifier">
                        <Pencil size={13} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })()}
      </div>

      {/* ── FORMATIONS ── */}
      <div className="card p-5 lg:p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0"><BookOpen size={16} className="text-violet-600" /></div>
          <div className="flex-1 min-w-0">
            <div className="label-text">Développement professionnel</div>
            <div className="font-display text-xl text-ink">Mes formations</div>
          </div>
          {employe && (
            <button onClick={() => setShowAutoformationModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 text-violet-600 border border-violet-200 rounded-xl text-xs font-semibold hover:bg-violet-100 transition-colors flex-shrink-0">
              <Plus size={13} /> Autoformation
            </button>
          )}
        </div>
        {myFormationsList.length === 0 && myAutoformations.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted">Aucune formation programmée</div>
        ) : (
          <div className="space-y-2">
            {myFormationsList.map(f => (
              <div key={f.id} className="flex items-center gap-3 p-3 bg-paper-warm rounded-xl">
                <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0 text-violet-700 text-sm font-bold">{new Date(f.date).getDate()}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink truncate">{f.nom}</div>
                  <div className="text-xs text-muted">{fmtDate(f.date)} {f.heureDebut && `· ${f.heureDebut}–${f.heureFin}`}{f.formateurs && ` · ${f.formateurs}`}</div>
                </div>
              </div>
            ))}
            {myAutoformations.length > 0 && (
              <>
                {myFormationsList.length > 0 && (
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[10px] font-semibold text-muted uppercase tracking-widest">Autoformations</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                )}
                {myAutoformations.map(af => {
                  const isDone = af.type === 'autoformation_complete'
                  return (
                  <div key={af.id} className="p-3 border border-violet-100 bg-violet-50/40 rounded-xl space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold bg-violet-100 text-violet-700">
                        {new Date(af.date).getDate()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-ink truncate">{af.titre}</div>
                        <div className="text-xs text-muted">{fmtDate(af.date)}{af.heureDebut && ` · ${af.heureDebut}–${af.heureFin}`}</div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {isDone && (
                          <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-lg">✓ Terminée</span>
                        )}
                        <button onClick={() => setEditingAutoformation(af)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:bg-violet-100 hover:text-violet-700 transition-colors flex-shrink-0">
                          <Pencil size={12} />
                        </button>
                      </div>
                    </div>
                    {af.description && (
                      <div className="text-xs text-muted pl-11">{af.description}</div>
                    )}
                    {af.lien && (
                      <a href={af.lien} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 text-xs text-electric hover:underline pl-11">
                        <LinkIcon size={11} /> Lien ressource
                      </a>
                    )}
                    {!isDone && (
                      <SwipeComplete
                        label="Glisser pour progresser →"
                        initialProgress={af.afProgress || 0}
                        onProgress={(pct) => handleAutoformationProgress(af, pct)}
                        onComplete={() => handleAutoformationComplete(af)}
                      />
                    )}
                  </div>
                  )
                })}
              </>
            )}
          </div>
        )}
      </div>
      </div>{/* end grid rdvs+formations */}

      {/* ── MES DEMANDES (employee only) ── */}
      {!isDir && employe && (() => {
        const myDems = (demandesRH || []).filter(d => String(d.employeId) === String(employe.id))
        const DL = { conge: 'Congé', absence: 'Absence', arret_maladie: 'Arrêt maladie', attestation: 'Attestation de travail', autre: 'Autre demande' }
        const SC = { en_attente: 'bg-amber-50 text-amber-700 border-amber-200', approuve: 'bg-emerald-50 text-emerald-700 border-emerald-200', refuse: 'bg-rose-50 text-rose-700 border-rose-200' }
        const SL = { en_attente: 'En attente', approuve: 'Approuvée', refuse: 'Refusée' }
        return (
          <div className="card p-5 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <ClipboardList size={16} className="text-amber-600" />
                </div>
                <div><div className="label-text">RH</div><div className="font-display text-xl text-ink">Mes demandes</div></div>
              </div>
              <button
                onClick={() => setShowDemandeModal(true)}
                className="w-7 h-7 rounded-lg border border-border text-muted hover:text-amber-600 hover:border-amber-300 hover:bg-amber-50 flex items-center justify-center transition-colors"
                title="Nouvelle demande RH"
              >
                <Plus size={14} />
              </button>
            </div>
            {myDems.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted">
                Aucune demande en cours.
              </div>
            ) : (
              <div className="space-y-2">
                {myDems.map(d => (
                  <div key={d.id} className="flex items-start gap-3 p-3 bg-paper-warm rounded-xl">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-ink">{DL[d.type] || d.type}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${SC[d.statut] || SC.en_attente}`}>{SL[d.statut] || d.statut}</span>
                      </div>
                      {(d.dateDebut || d.dateFin) && (
                        <div className="text-xs text-muted mt-0.5">
                          {d.dateDebut && fmtDate(d.dateDebut)}{d.dateFin && ` → ${fmtDate(d.dateFin)}`}
                        </div>
                      )}
                      {d.commentaireRH && (
                        <div className="text-xs text-ink mt-1 px-2 py-1 bg-white rounded-lg border border-border">
                          RH : {d.commentaireRH}
                        </div>
                      )}
                    </div>
                    {d.statut === 'en_attente' && (
                      <button
                        onClick={() => deleteDemandeRH(d.id)}
                        className="w-7 h-7 rounded-lg text-muted hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-colors flex-shrink-0"
                        title="Annuler la demande"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })()}

      {/* ── Modals ── */}
      <AnimatePresence>
        {showDemandeModal && (
          <EmployeeRequestModal
            profile={profile}
            onClose={() => setShowDemandeModal(false)}
            onSubmit={(data) => {
              addDemandeRH(data)
              toast.success('Demande envoyée')
              setShowDemandeModal(false)
            }}
          />
        )}
      </AnimatePresence>

      {/* Attendee hover tooltip */}
      {hoverInfo && (() => {
        const { rect, attendees } = hoverInfo
        const confirmed = attendees.filter(a => a.status === 'confirmed')
        const pending   = attendees.filter(a => a.status === 'pending')
        const declined  = attendees.filter(a => a.status === 'declined')
        if (!confirmed.length && !pending.length && !declined.length) return null
        const tooltipW = 192
        const left = rect.right + 10 + tooltipW > window.innerWidth
          ? rect.left - tooltipW - 6
          : rect.right + 6
        const top = Math.max(8, Math.min(rect.top, window.innerHeight - (attendees.length * 26 + 80)))
        const Section = ({ label, color, items }) => items.length === 0 ? null : (
          <div className="mb-2 last:mb-0">
            <div className={`text-[9px] font-bold uppercase tracking-wider mb-1.5 ${color}`}>
              {label} · {items.length}
            </div>
            {items.map((a, i) => (
              <div key={i} className="flex items-center gap-1.5 mb-1 last:mb-0">
                <div className={`w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center flex-shrink-0
                  ${a.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                    a.status === 'pending'   ? 'bg-amber-100 text-amber-700' :
                                              'bg-rose-100 text-rose-500'}`}>
                  {a.initials}
                </div>
                <span className={`text-[11px] truncate ${a.status === 'declined' ? 'line-through text-muted' : 'text-ink'}`}>
                  {a.nom}
                </span>
              </div>
            ))}
          </div>
        )
        return (
          <div
            className="fixed z-[80] bg-white rounded-xl shadow-2xl border border-border p-3 pointer-events-none"
            style={{ left, top, width: tooltipW }}
          >
            <Section label="Présents"  color="text-emerald-600" items={confirmed} />
            <Section label="En attente" color="text-amber-600"  items={pending}   />
            <Section label="Déclinés"  color="text-rose-500"   items={declined}  />
          </div>
        )
      })()}

      {/* Pending invite modal */}
      <AnimatePresence>
        {pendingEvent && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && setPendingEvent(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 12 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${getEvColor(pendingEvent)}18` }}>
                      <Clock size={16} style={{ color: getEvColor(pendingEvent) }} />
                    </div>
                    <div>
                      <div className="text-[10px] text-muted uppercase tracking-wider font-semibold">Invitation en attente</div>
                      <div className="font-semibold text-ink text-sm">{pendingEvent.titre}</div>
                    </div>
                  </div>
                  <button onClick={() => setPendingEvent(null)} className="w-7 h-7 rounded-lg hover:bg-paper-warm flex items-center justify-center text-muted">
                    <X size={14} />
                  </button>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <CalendarDays size={12} className="flex-shrink-0" />
                    {new Date(pendingEvent.date).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' })}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <Clock size={12} className="flex-shrink-0" />
                    {pendingEvent.heureDebut} – {pendingEvent.heureFin}
                  </div>
                  {pendingEvent.hasConflict && (
                    <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 rounded-xl px-3 py-2 mt-1">
                      <AlertCircle size={12} className="flex-shrink-0" />
                      Conflit avec un événement déjà planifié à ce créneau
                    </div>
                  )}
                </div>
              </div>

              <div className="px-5 pb-5 flex gap-2">
                <button
                  onClick={() => handleDeclineInvite(pendingEvent)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  Décliner
                </button>
                <button
                  onClick={() => handleAcceptInvite(pendingEvent)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-electric text-white hover:bg-electric/90 transition-colors"
                >
                  Accepter
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {addEventDate && (
        <EventModal
          date={addEventDate}
          onClose={() => setAddEventDate(null)}
          onSave={(form) => { handleAddEvent({ ...form, date: addEventDate }); setAddEventDate(null) }}
        />
      )}
      {editingEvent && (
        <EventModal
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
          onSave={handleUpdateEvent}
          onDelete={() => handleDeleteEvent(editingEvent)}
        />
      )}
      {(showRdvModal || editingRdv) && (
        <RdvPlanningModal
          employes={employes}
          prospects={prospects}
          collaborateurs={collaborateurs}
          myId={employe?.id || ''}
          event={editingRdv}
          onClose={() => { setShowRdvModal(false); setEditingRdv(null) }}
          onConfirm={editingRdv ? handleRdvConfirm : handleCreateRdv}
        />
      )}
      {(showAutoformationModal || editingAutoformation) && (
        <AutoformationModal
          event={editingAutoformation}
          onClose={() => { setShowAutoformationModal(false); setEditingAutoformation(null) }}
          onSave={editingAutoformation ? handleUpdateAutoformation : handleCreateAutoformation}
          onDelete={handleDeleteAutoformation}
        />
      )}
      {editingRdvProspect && (
        <EditRdvProspectModal
          event={editingRdvProspect}
          onClose={() => setEditingRdvProspect(null)}
          onSave={handleRdvProspectUpdate}
          onDelete={handleRdvProspectDelete}
        />
      )}

      {/* ── Bouton demande RH — employés uniquement ── */}
      {!isDir && isEmployeeMode && (
        <div className="flex justify-center py-6">
          <button
            onClick={() => setShowDemandeModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-semibold hover:bg-amber-100 transition-colors"
          >
            <ClipboardList size={15} />
            Faire une demande RH
          </button>
        </div>
      )}
    </div>
  )
}
