import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Mail, Phone, FolderKanban, UserPlus,
  ChevronRight, TrendingUp, Users, CheckCircle2, Pencil, Trash2, Sparkles,
  Star, Crown, Video, ExternalLink, CalendarPlus, Check, X, Calendar, MapPin,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import NouveauProspectModal from '../../components/NouveauProspectModal'

const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const MONTHS_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

const fmtMAD = (n) => {
  if (!n) return '—'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M MAD'
  if (n >= 1000) return (n / 1000).toFixed(0) + 'k MAD'
  return n + ' MAD'
}

const STATUT_CONFIG = {
  interet:       { label: 'Intérêt',       cls: 'bg-purple-100 text-purple-700' },
  premier_appel: { label: 'Premier appel', cls: 'bg-slate-100 text-slate-600' },
  devis_envoye:  { label: 'Devis envoyé',  cls: 'bg-amber-100 text-amber-700' },
  contrat_signe: { label: 'Contrat signé', cls: 'bg-emerald-100 text-emerald-700' },
}
const STATUT_ORDER = ['interet', 'premier_appel', 'devis_envoye', 'contrat_signe']

function currentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function groupByMonth(list) {
  const groups = {}
  for (const p of list) {
    const key = p.createdAt?.slice(0, 7) || 'unknown'
    if (!groups[key]) groups[key] = []
    groups[key].push(p)
  }
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, items]) => {
      const [year, month] = key.split('-')
      return { key, label: `${MONTHS_FR[parseInt(month, 10) - 1]} ${year}`, list: items }
    })
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-border rounded-xl shadow-xl px-3 py-2 text-xs pointer-events-none">
      <div className="font-semibold text-ink mb-1.5">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.fill }} />
          <span className="text-muted">{p.name} :</span>
          <span className="font-semibold text-ink">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

function getInitials(name = '') {
  return name.trim().split(' ').map(n => n[0] || '').join('').slice(0, 2).toUpperCase()
}

function RdvModal({ prospect, employes, myId, onClose, onConfirm }) {
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)
  const [heure, setHeure] = useState('10:00')
  const [format, setFormat] = useState('telephonique')
  const [adresse, setAdresse] = useState('')
  const [participants, setParticipants] = useState(
    employes.some(e => String(e.id) === String(myId)) ? [String(myId)] : []
  )

  const togglePart = (id) => setParticipants(prev =>
    prev.includes(id) ? (prev.length > 1 ? prev.filter(x => x !== id) : prev) : [...prev, id]
  )

  const handleConfirm = () => {
    if (!date) return
    const [h, m] = heure.split(':').map(Number)
    const endH = String((h + 1) % 24).padStart(2, '0')
    const heureFin = `${endH}:${String(m).padStart(2, '0')}`
    onConfirm({ date, heure, heureFin, format, adresse: format === 'presentiel' ? adresse : '', participants })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <div>
            <div className="font-semibold text-ink text-sm">Programmer un rendez-vous</div>
            <div className="text-xs text-muted mt-0.5">{prospect.prenom} {prospect.nom}</div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-paper-warm flex items-center justify-center text-muted">
            <X size={14} />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Date + Heure */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text mb-1.5 block">Date</label>
              <input type="date" value={date} min={today}
                onChange={e => setDate(e.target.value)}
                className="input-field text-sm" />
            </div>
            <div>
              <label className="label-text mb-1.5 block">Heure</label>
              <input type="time" value={heure}
                onChange={e => setHeure(e.target.value)}
                className="input-field text-sm" />
            </div>
          </div>

          {/* Format */}
          <div>
            <label className="label-text mb-2 block">Format</label>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setFormat('telephonique')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                  format === 'telephonique'
                    ? 'border-electric bg-electric/5 text-electric'
                    : 'border-border text-muted hover:border-electric/40'
                }`}>
                <Phone size={15} className="flex-shrink-0" /> Tél.
              </button>
              <button onClick={() => setFormat('meet')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                  format === 'meet'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-border text-muted hover:border-emerald-400/40'
                }`}>
                <Video size={15} className="flex-shrink-0" /> Meet
              </button>
              <button onClick={() => setFormat('presentiel')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                  format === 'presentiel'
                    ? 'border-orange-400 bg-orange-50 text-orange-700'
                    : 'border-border text-muted hover:border-orange-300/60'
                }`}>
                <MapPin size={15} className="flex-shrink-0" /> Présentiel
              </button>
            </div>
            {format === 'meet' && (
              <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-emerald-800">Créer la réunion maintenant</div>
                  <div className="text-[10px] text-emerald-600">Copiez le lien et partagez-le avec le client</div>
                </div>
                <a href="https://meet.google.com/new" target="_blank" rel="noreferrer"
                  className="text-xs bg-emerald-600 text-white px-3 py-2 rounded-xl font-semibold flex items-center gap-1.5 hover:bg-emerald-700 transition-colors flex-shrink-0">
                  <ExternalLink size={11} /> Ouvrir Meet
                </a>
              </div>
            )}
            {format === 'presentiel' && (
              <div className="mt-2">
                <label className="label-text mb-1.5 block">Adresse / Localisation</label>
                <div className="relative">
                  <MapPin size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-orange-400 pointer-events-none" />
                  <input type="text" className="input-field pl-8 text-sm"
                    placeholder="Ex : 12 Rue Mohammed V, Casablanca"
                    value={adresse} onChange={e => setAdresse(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          {/* Participants */}
          <div>
            <label className="label-text mb-2 block">
              Participants — {participants.length} sélectionné{participants.length > 1 ? 's' : ''}
            </label>
            <div className="space-y-1 max-h-44 overflow-y-auto">
              {employes.map(emp => {
                const id = String(emp.id)
                const isSel = participants.includes(id)
                return (
                  <button key={emp.id} onClick={() => togglePart(id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left ${
                      isSel ? 'bg-electric/10 border border-electric/30' : 'hover:bg-paper-warm border border-transparent'
                    }`}>
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-ink to-electric flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                      {getInitials(emp.nom)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink truncate">{emp.nom}</div>
                      <div className="text-xs text-muted truncate">{emp.poste || 'Collaborateur'}</div>
                    </div>
                    {isSel && <Check size={14} className="text-electric flex-shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 pt-3 flex gap-3 border-t border-border">
          <button onClick={onClose} className="btn-ghost flex-1 justify-center text-sm">Annuler</button>
          <button onClick={handleConfirm} disabled={!date || participants.length === 0}
            className="btn-primary flex-1 justify-center text-sm disabled:opacity-40">
            <CalendarPlus size={15} /> Programmer
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function ConfirmDeleteModal({ prospect, onCancel, onConfirm }) {
  const isConfirmed = prospect.statut === 'contrat_signe'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onCancel()}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
      >
        <div className="p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4">
            <Trash2 size={20} className="text-rose-500" />
          </div>
          <div className="font-semibold text-ink text-base mb-1">Supprimer {isConfirmed ? 'le client' : 'le prospect'} ?</div>
          <div className="text-sm text-muted mb-1">
            <span className="font-semibold text-ink">{prospect.prenom} {prospect.nom}</span>
          </div>
          {isConfirmed && (
            <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 mt-3">
              Ce client a un contrat signé. La suppression est irréversible.
            </div>
          )}
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onCancel} className="btn-ghost flex-1 justify-center">Annuler</button>
          <button onClick={onConfirm}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-rose-500 text-white hover:bg-rose-600 transition-colors">
            <Trash2 size={14} /> Supprimer
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default function CRMPage() {
  const { prospects, updateProspect, deleteProspect, employes, addPlanningEvent } = useData()
  const { profile } = useAuth()
  const navigate = useNavigate()

  const myId = String(profile?.id || '')

  const [showProspectModal, setShowProspectModal] = useState(false)
  const [editingProspect, setEditingProspect] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null) // prospect to delete
  const [rdvModal, setRdvModal] = useState(null) // prospect object

  const [expandedProspect, setExpandedProspect] = useState(() => ({
    [currentMonthKey()]: true,
  }))
  const [expandedConfirmed, setExpandedConfirmed] = useState(() => ({
    [currentMonthKey()]: true,
  }))

  // ── Derived data ──────────────────────────────────────────────────────────
  const activeProspects   = useMemo(() => prospects.filter(p => p.statut !== 'contrat_signe'), [prospects])
  const confirmedProspects = useMemo(() => prospects.filter(p => p.statut === 'contrat_signe'), [prospects])

  // Count of confirmed projects per root prospect (root = no parentId)
  const projectCountMap = useMemo(() => {
    const map = {}
    for (const p of confirmedProspects) {
      const rootId = p.parentId || p.id
      map[rootId] = (map[rootId] || 0) + 1
    }
    return map
  }, [confirmedProspects])

  const rootConfirmed = useMemo(() =>
    confirmedProspects.filter(p => !p.parentId),
    [confirmedProspects]
  )

  // Strategic = 2 or 3 confirmed projects
  const strategicClients = useMemo(() =>
    rootConfirmed.filter(p => {
      const n = projectCountMap[p.id] || 1
      return n >= 2 && n < 4
    }),
    [rootConfirmed, projectCountMap]
  )

  // Fidèle = 4+ confirmed projects
  const fideleClients = useMemo(() =>
    rootConfirmed.filter(p => (projectCountMap[p.id] || 1) >= 4),
    [rootConfirmed, projectCountMap]
  )

  const conversionRate = prospects.length > 0
    ? Math.round((confirmedProspects.length / prospects.length) * 100)
    : 0

  const prospectsByMonth  = useMemo(() => groupByMonth(activeProspects),   [activeProspects])
  const confirmedByMonth  = useMemo(() => groupByMonth(confirmedProspects), [confirmedProspects])

  const chartData = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 6 }, (_, i) => {
      const d   = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return {
        name:        MONTHS_SHORT[d.getMonth()],
        'Prospects': prospects.filter(p => p.createdAt?.startsWith(key)).length,
        'Confirmés': prospects.filter(p => p.createdAt?.startsWith(key) && p.statut === 'contrat_signe').length,
      }
    })
  }, [prospects])

  const encouragement = conversionRate >= 30
    ? { text: `Excellent taux de conversion à ${conversionRate}% !`, sub: 'Votre pipeline commercial est très performant. Au-dessus de la moyenne du secteur AEC.' }
    : conversionRate >= 15
    ? { text: `Bon pipeline à ${conversionRate}% de conversion.`, sub: 'Continuez à qualifier vos prospects pour améliorer le taux de signature.' }
    : conversionRate > 0
    ? { text: `${conversionRate}% de taux de conversion.`, sub: 'Développez la relation prospect avec des rendez-vous de suivi et des propositions adaptées.' }
    : { text: 'Pipeline en construction.', sub: 'Chaque prospect qualifié est une opportunité d\'affaires. Ajoutez vos premiers contacts.' }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const handleDeleteProspect = (p, e) => {
    e?.stopPropagation()
    setConfirmDelete(p)
  }

  const confirmDeleteAction = () => {
    if (!confirmDelete) return
    const label = confirmDelete.statut === 'contrat_signe' ? 'Client supprimé' : 'Prospect supprimé'
    deleteProspect(confirmDelete.id)
    setConfirmDelete(null)
    toast.success(label)
  }

  const handleStatutChange = (p, newStatut) => {
    if (newStatut === 'premier_appel' && p.statut !== 'premier_appel') {
      setRdvModal(p)
    } else {
      updateProspect(p.id, { statut: newStatut })
    }
  }

  const handleRdvConfirm = ({ date, heure, heureFin, format, adresse, participants }) => {
    if (!rdvModal) return
    const prospect = rdvModal
    const baseId = `rdvp_${Date.now()}`
    const event = {
      titre: `RDV — ${prospect.prenom} ${prospect.nom}`,
      date,
      heureDebut: heure,
      heureFin,
      couleur: format === 'meet' ? '#10B981' : format === 'presentiel' ? '#F97316' : '#0EA5E9',
      type: 'rdv_prospect',
      format,
      adresse: format === 'presentiel' ? adresse : '',
      prospectNom: `${prospect.prenom} ${prospect.nom}`,
      prospectId: prospect.id,
    }
    participants.forEach((strId, i) => {
      const emp = employes.find(e => String(e.id) === strId)
      if (emp) addPlanningEvent(emp.id, { ...event, id: `${baseId}_${i}` })
    })
    updateProspect(prospect.id, { statut: 'premier_appel' })
    setRdvModal(null)
    toast.success('Rendez-vous programmé et ajouté aux plannings ✓')
  }

  const openModal = (p = null, e) => { e?.stopPropagation(); setEditingProspect(p); setShowProspectModal(true) }
  const closeModal = () => { setShowProspectModal(false); setEditingProspect(null) }
  const toggleProspect  = (key) => setExpandedProspect(prev => ({ ...prev, [key]: !prev[key] }))
  const toggleConfirmed = (key) => setExpandedConfirmed(prev => ({ ...prev, [key]: !prev[key] }))

  // ── Row renderers ─────────────────────────────────────────────────────────
  const renderActiveRow = (p) => {
    const cfg = STATUT_CONFIG[p.statut]
    const parent = p.parentId ? prospects.find(r => r.id === p.parentId) : null
    return (
      <div key={p.id}
        className="flex gap-3 px-4 py-3 hover:bg-paper-warm/60 transition-colors group">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5"
          style={{ background: 'linear-gradient(135deg, #0A1E3F, #3B82F6)' }}>
          {p.prenom?.[0]}{p.nom?.[0]}
        </div>

        {/* Contenu cliquable */}
        <button className="flex-1 min-w-0 text-left" onClick={() => navigate(`/app/crm/prospect/${p.id}`)}>
          <div className="text-sm font-semibold text-ink hover:text-electric transition-colors">
            {p.prenom} {p.nom}
            {parent && (
              <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-electric/10 text-electric">
                Nouveau projet
              </span>
            )}
          </div>
          <div className="mt-0.5">
            <span className="text-xs text-muted">
              {[p.typeProjet, p.localisation, p.surface > 0 && `${p.surface} m²`, p.budget > 0 && fmtMAD(p.budget)].filter(Boolean).join(' · ')}
            </span>
          </div>
          <div className="mt-1.5">
            <select value={p.statut}
              onChange={e => { e.stopPropagation(); handleStatutChange(p, e.target.value) }}
              onClick={e => e.stopPropagation()}
              className={`w-auto shrink-0 text-[10px] font-semibold px-2 py-1 rounded-lg border-0 cursor-pointer appearance-none ${cfg.cls}`}>
              {STATUT_ORDER.map(s => (
                <option key={s} value={s}>{STATUT_CONFIG[s].label}</option>
              ))}
            </select>
          </div>
        </button>

        {/* Actions : modifier en haut, supprimer en bas */}
        <div className="flex flex-col justify-between items-center flex-shrink-0 py-0.5">
          <button onClick={(e) => openModal(p, e)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-paper-warm transition-colors">
            <Pencil size={12} />
          </button>
          <button onClick={(e) => handleDeleteProspect(p, e)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-rose-500 hover:bg-rose-50 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    )
  }

  const renderConfirmedRow = (p) => {
    const isChild = !!p.parentId
    const count = !isChild ? (projectCountMap[p.id] || 1) : null
    return (
      <div key={p.id}
        onClick={() => navigate(`/app/crm/prospect/${p.id}`)}
        className="flex items-center gap-3 px-4 py-3 hover:bg-emerald-50/40 cursor-pointer transition-colors group">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #059669, #10B981)' }}>
          {p.prenom?.[0]}{p.nom?.[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-ink">{p.prenom} {p.nom}</span>
            {isChild && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-electric/10 text-electric">
                Projet additionnel
              </span>
            )}
            {!isChild && count >= 2 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700">
                {count} projets
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-xs text-muted">{p.typeProjet}</span>
            {p.localisation && <span className="text-xs text-muted">{p.localisation}</span>}
            {p.surface > 0 && <span className="text-xs text-emerald-600 font-medium">{p.surface} m²</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {p.budget > 0 && (
            <span className="text-sm font-semibold text-emerald-700 mr-1">{fmtMAD(p.budget)}</span>
          )}
          <button onClick={(e) => openModal(p, e)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-white transition-colors opacity-0 group-hover:opacity-100">
            <Pencil size={12} />
          </button>
          <button onClick={(e) => handleDeleteProspect(p, e)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-rose-500 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100">
            <Trash2 size={13} />
          </button>
          <ChevronRight size={14} className="text-muted group-hover:text-ink transition-colors" />
        </div>
      </div>
    )
  }

  const renderMonthGroup = (groups, expanded, toggle, renderRow, emptyText) => {
    if (groups.length === 0) {
      return (
        <div className="text-center py-10 text-muted text-sm border border-dashed border-border rounded-xl">
          {emptyText}
        </div>
      )
    }
    return (
      <div className="space-y-2">
        {groups.map(({ key, label, list }) => {
          const isOpen = !!expanded[key]
          return (
            <div key={key} className="border border-border rounded-xl overflow-hidden">
              <button onClick={() => toggle(key)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-paper-warm transition-colors">
                <div className="flex items-center gap-3">
                  <ChevronRight size={15}
                    className={`text-muted transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                  <span className="font-semibold text-sm text-ink">{label}</span>
                  <span className="text-xs text-muted">
                    {list.length} client{list.length > 1 ? 's' : ''}
                  </span>
                </div>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-border divide-y divide-border/50">
                      {list.map(p => renderRow(p))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    )
  }

  const renderTierCard = (p, tier) => {
    const count = projectCountMap[p.id] || 1
    const children = confirmedProspects.filter(c => c.parentId === p.id)
    const allProjects = [p, ...children]
    const totalBudget = allProjects.reduce((s, proj) => s + (proj.budget || 0), 0)
    const isFidele = tier === 'fidele'

    return (
      <div key={p.id}
        onClick={() => navigate(`/app/crm/prospect/${p.id}`)}
        className={`p-4 lg:p-5 rounded-2xl cursor-pointer hover:shadow-md transition-all group ${
          isFidele
            ? 'bg-amber-50 border border-amber-200 hover:bg-amber-50/70'
            : 'bg-paper-warm border border-border hover:bg-white'
        }`}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ background: isFidele
                ? 'linear-gradient(135deg, #D97706, #F59E0B)'
                : 'linear-gradient(135deg, #0A1E3F, #3B82F6)'
              }}>
              {p.prenom?.[0]}{p.nom?.[0]}
            </div>
            <div>
              <div className="text-sm font-semibold text-ink">{p.prenom} {p.nom}</div>
              <div className="text-xs text-muted">
                {p.email || p.telephone || p.localisation || '—'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
              isFidele ? 'bg-amber-200 text-amber-800' : 'bg-blue-100 text-blue-700'
            }`}>
              {isFidele ? <Crown size={10} /> : <Star size={10} />}
              {count} projets
            </div>
            <button onClick={(e) => openModal(p, e)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-white transition-colors opacity-0 group-hover:opacity-100">
              <Pencil size={12} />
            </button>
            <button onClick={(e) => handleDeleteProspect(p, e)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-rose-500 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100">
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        <div className="space-y-1.5 mb-3">
          {allProjects.map((proj) => (
            <div key={proj.id} className="flex items-center gap-2 text-xs text-muted">
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                isFidele ? 'bg-amber-400' : 'bg-electric'
              }`} />
              <span className="font-medium text-ink/80">{proj.typeProjet}</span>
              {proj.surface > 0 && <span>— {proj.surface} m²</span>}
              {proj.localisation && <span>· {proj.localisation}</span>}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border/60">
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <FolderKanban size={12} />
            {count} projet{count > 1 ? 's' : ''} signés
          </div>
          {totalBudget > 0 && (
            <span className={`text-sm font-semibold ${isFidele ? 'text-amber-700' : 'text-ink'}`}>
              {fmtMAD(totalBudget)}
            </span>
          )}
        </div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 lg:p-10 space-y-6">

      {/* ══ CHART + KPIs ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2 flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="label-text mb-0.5">Pipeline commercial</div>
              <div className="font-display text-xl text-ink leading-none">
                {prospects.length} prospects · {confirmedProspects.length} confirmés
              </div>
            </div>
            <button onClick={() => openModal(null)} className="btn-primary text-xs flex-shrink-0">
              <UserPlus size={13} /> Nouveau
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles size={12} className="text-electric" />
            <span className="text-xs font-semibold text-ink">{encouragement.text}</span>
          </div>
          <p className="text-[11px] text-muted -mt-1">{encouragement.sub}</p>
          <div className="h-[130px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={3} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis hide allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                <Bar dataKey="Prospects" fill="#3B82F6" radius={[3, 3, 0, 0]} maxBarSize={18} />
                <Bar dataKey="Confirmés" fill="#10B981" radius={[3, 3, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-blue-600 font-semibold">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" /> Prospects
            </span>
            <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Confirmés
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {[
            { label: 'Prospects actifs',   value: activeProspects.length, icon: Users,       color: '#3B82F6', sub: `${activeProspects.filter(p => p.statut === 'devis_envoye').length} devis envoyés` },
            { label: 'Clients confirmés',  value: confirmedProspects.length, icon: CheckCircle2, color: '#10B981', sub: 'Contrats signés' },
            { label: 'Taux de conversion', value: `${conversionRate}%`, icon: TrendingUp,    color: conversionRate >= 20 ? '#10B981' : '#F59E0B', sub: 'Prospect → Signé' },
          ].map((k, i) => {
            const Icon = k.icon
            return (
              <div key={i} className="card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${k.color}18` }}>
                  <Icon size={16} color={k.color} />
                </div>
                <div>
                  <div className="font-display text-2xl text-ink leading-none">{k.value}</div>
                  <div className="text-xs text-muted mt-0.5">{k.label}</div>
                  <div className="text-[10px] text-muted/70">{k.sub}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ══ PROSPECTS ACTIFS ══ */}
      <div className="card p-5 lg:p-7">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="label-text mb-1">Prospection</div>
            <div className="font-display text-xl text-ink">Clients potentiels</div>
          </div>
          <button onClick={() => openModal(null)} className="btn-primary text-xs">
            <Plus size={13} /> Ajouter
          </button>
        </div>
        {renderMonthGroup(
          prospectsByMonth,
          expandedProspect,
          toggleProspect,
          renderActiveRow,
          'Aucun prospect actif. Cliquez sur "Ajouter" pour commencer.'
        )}
      </div>

      {/* ══ CLIENTS CONFIRMÉS — mois par mois ══ */}
      {confirmedProspects.length > 0 && (
        <div className="card p-5 lg:p-7">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-50">
              <CheckCircle2 size={15} className="text-emerald-600" />
            </div>
            <div>
              <div className="label-text mb-0.5">Contractualisés</div>
              <div className="font-display text-xl text-ink">Clients confirmés</div>
            </div>
          </div>
          {renderMonthGroup(
            confirmedByMonth,
            expandedConfirmed,
            toggleConfirmed,
            renderConfirmedRow,
            ''
          )}
        </div>
      )}

      {/* ══ CLIENTS STRATÉGIQUES (2–3 projets signés) ══ */}
      {strategicClients.length > 0 && (
        <div className="card p-5 lg:p-7">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-blue-50">
              <Star size={15} className="text-blue-600" />
            </div>
            <div>
              <div className="label-text mb-0.5">Récurrence</div>
              <div className="font-display text-xl text-ink">Clients stratégiques</div>
              <div className="text-xs text-muted">2 à 3 projets signés avec l'agence</div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {strategicClients.map(p => renderTierCard(p, 'strategic'))}
          </div>
        </div>
      )}

      {/* ══ CLIENTS FIDÈLES (4+ projets signés) ══ */}
      {fideleClients.length > 0 && (
        <div className="card p-5 lg:p-7 border-amber-200">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-amber-50">
              <Crown size={15} className="text-amber-600" />
            </div>
            <div>
              <div className="label-text mb-0.5">Fidélité</div>
              <div className="font-display text-xl text-ink">Clients fidèles</div>
              <div className="text-xs text-muted">4 projets ou plus — partenaires de long terme</div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {fideleClients.map(p => renderTierCard(p, 'fidele'))}
          </div>
        </div>
      )}

      {showProspectModal && (
        <NouveauProspectModal existing={editingProspect} onClose={closeModal} />
      )}

      <AnimatePresence>
        {confirmDelete && (
          <ConfirmDeleteModal
            prospect={confirmDelete}
            onCancel={() => setConfirmDelete(null)}
            onConfirm={confirmDeleteAction}
          />
        )}
        {rdvModal && (
          <RdvModal
            prospect={rdvModal}
            employes={employes}
            myId={myId}
            onClose={() => setRdvModal(null)}
            onConfirm={handleRdvConfirm}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
