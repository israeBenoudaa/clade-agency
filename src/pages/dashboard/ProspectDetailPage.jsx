import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Phone, Mail, MapPin, Building2, Ruler, Wallet,
  Calculator, FileText, Plus, Trash2, Download, Loader,
  CheckCircle2, Clock, AlertTriangle, Info, RotateCcw, ChevronDown,
  Pencil, X, CheckCircle, GripVertical,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useData } from '../../context/DataContext'
import { generateDevisPdf } from '../../utils/generateDevisPdf'
import { computeTJH, calcSimulateur } from '../../lib/simulator-engine'
import SelectField from '../../components/SelectField'

function generateUsername(prenom, nom) {
  const p = (prenom || '').toLowerCase().replace(/[^a-z]/g, '')
  const n = (nom || '').toLowerCase().replace(/[^a-z]/g, '')
  return `${p[0] || ''}${n}`.slice(0, 16)
}

const fmtMAD = (n) =>
  Number(n || 0).toLocaleString('fr-MA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' MAD'

const fmtN = (n) => Number(n || 0).toLocaleString('fr-FR')

// ── Simulator constants ──
const TYPE_OPTIONS = [
  { value: '1.0', label: 'Architecture' },
  { value: '1.5', label: 'Conservation' },
  { value: '0.8', label: 'Paysage' },
  { value: '1.2', label: 'Design' },
  { value: '1.3', label: 'Éphémère' },
]

const COMPLEXITE_OPTIONS = [
  { value: '1.0', label: 'Standard (×1.0)' },
  { value: '1.1', label: 'Modérée (×1.1)' },
  { value: '1.3', label: 'Complexe (×1.3) — BIM, HQE' },
  { value: '1.6', label: 'Très complexe (×1.6) — patrimoine' },
]

const RISQUE_OPTIONS = [
  { value: '1.0', label: 'Faible (×1.00) — client connu' },
  { value: '1.15', label: 'Modéré (×1.15)' },
  { value: '1.30', label: 'Élevé (×1.30) — nouveau client' },
  { value: '1.50', label: 'Critique (×1.50)' },
]

const STATUT_CONFIG = {
  premier_appel: { label: 'Premier appel', cls: 'bg-ink/10 text-ink' },
  devis_envoye:  { label: 'Devis envoyé',  cls: 'bg-amber-100 text-amber-700' },
  contrat_signe: { label: 'Contrat signé', cls: 'bg-emerald-100 text-emerald-700' },
}

const TYPE_PROJET_OPTIONS = [
  'Architecture', 'Conservation', 'Paysage', 'Design', 'Éphémère',
]

function EditClientModal({ prospect, onClose, onSave }) {
  const [form, setForm] = useState({
    prenom:      prospect.prenom      || '',
    nom:         prospect.nom         || '',
    email:       prospect.email       || '',
    telephone:   prospect.telephone   || '',
    localisation:prospect.localisation|| '',
    typeProjet:  prospect.typeProjet  || '',
    budget:      prospect.budget      || '',
    surface:     prospect.surface     || '',
    notes:       prospect.notes       || '',
  })
  const [errors, setErrors] = useState({})

  const toNameCase = (s) => s.replace(/\S+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
  const set = (key) => (e) => {
    const raw = e.target.value
    const val = (key === 'prenom' || key === 'nom') ? toNameCase(raw) : raw
    setForm(f => ({ ...f, [key]: val }))
    if (errors[key]) setErrors(er => ({ ...er, [key]: null }))
  }

  const handleSave = () => {
    const errs = {}
    if (!form.prenom.trim()) errs.prenom = 'Requis'
    if (!form.nom.trim()) errs.nom = 'Requis'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Email invalide'
    if (Object.keys(errs).length) { setErrors(errs); return }
    onSave({
      prenom:       form.prenom.trim(),
      nom:          form.nom.trim(),
      email:        form.email.trim(),
      telephone:    form.telephone.trim(),
      localisation: form.localisation.trim(),
      typeProjet:   form.typeProjet,
      budget:       form.budget !== '' ? Number(form.budget) || 0 : 0,
      surface:      form.surface !== '' ? Number(form.surface) || 0 : 0,
      notes:        form.notes.trim(),
    })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-electric/10 flex items-center justify-center">
              <Pencil size={15} className="text-electric" />
            </div>
            <div>
              <div className="font-semibold text-ink text-sm">Modifier le client</div>
              <div className="text-xs text-muted">{prospect.prenom} {prospect.nom}</div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-paper-warm flex items-center justify-center text-muted hover:text-ink transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {/* Prénom + Nom */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text mb-1.5 block">Prénom *</label>
              <input className={`input-field ${errors.prenom ? 'border-rose-400' : ''}`}
                value={form.prenom} onChange={set('prenom')} placeholder="Mohammed" />
              {errors.prenom && <p className="text-xs text-rose-500 mt-1">{errors.prenom}</p>}
            </div>
            <div>
              <label className="label-text mb-1.5 block">Nom *</label>
              <input className={`input-field ${errors.nom ? 'border-rose-400' : ''}`}
                value={form.nom} onChange={set('nom')} placeholder="Alami" />
              {errors.nom && <p className="text-xs text-rose-500 mt-1">{errors.nom}</p>}
            </div>
          </div>

          {/* Email + Téléphone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text mb-1.5 flex items-center gap-1"><Mail size={10} /> Email</label>
              <input type="email" className={`input-field ${errors.email ? 'border-rose-400' : ''}`}
                value={form.email} onChange={set('email')} placeholder="contact@email.com" />
              {errors.email && <p className="text-xs text-rose-500 mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="label-text mb-1.5 flex items-center gap-1"><Phone size={10} /> Téléphone</label>
              <input type="tel" className="input-field"
                value={form.telephone} onChange={set('telephone')} placeholder="+212 6XX XXX XXX" />
            </div>
          </div>

          {/* Localisation */}
          <div>
            <label className="label-text mb-1.5 flex items-center gap-1"><MapPin size={10} /> Localisation</label>
            <input className="input-field" value={form.localisation} onChange={set('localisation')} placeholder="Casablanca" />
          </div>

          {/* Type de projet + Surface */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text mb-1.5 flex items-center gap-1"><Building2 size={10} /> Type de projet</label>
              <SelectField
                value={form.typeProjet}
                onChange={v => set('typeProjet')({ target: { value: v } })}
                options={[
                  { value: '', label: '— Sélectionner —' },
                  ...TYPE_PROJET_OPTIONS.map(t => ({ value: t, label: t })),
                ]}
              />
            </div>
            <div>
              <label className="label-text mb-1.5 flex items-center gap-1"><Ruler size={10} /> Surface (m²)</label>
              <input type="number" min="0" className="input-field"
                value={form.surface} onChange={set('surface')} placeholder="0" />
            </div>
          </div>

          {/* Budget */}
          <div>
            <label className="label-text mb-1.5 flex items-center gap-1"><Wallet size={10} /> Budget (MAD)</label>
            <input type="number" min="0" step="10000" className="input-field"
              value={form.budget} onChange={set('budget')} placeholder="0" />
          </div>

          {/* Notes */}
          <div>
            <label className="label-text mb-1.5 block">Notes</label>
            <textarea rows={3} className="input-field resize-none"
              value={form.notes} onChange={set('notes')} placeholder="Informations complémentaires…" />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex gap-3 flex-shrink-0 bg-paper/50">
          <button onClick={onClose} className="btn-ghost flex-1 justify-center">Annuler</button>
          <button onClick={handleSave} className="btn-primary flex-1 justify-center flex items-center gap-2">
            <CheckCircle size={15} /> Enregistrer
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function EditableCell({ value, onSave, placeholder = '', type = 'text', className = '', autoEdit = false }) {
  const [editing, setEditing] = useState(autoEdit)
  const [val, setVal] = useState('')
  const start = () => { setVal(String(value ?? '')); setEditing(true) }
  const commit = () => {
    setEditing(false)
    const parsed = type === 'number' ? parseFloat(val) || 0 : val.trim()
    if (String(parsed) !== String(value ?? '')) onSave(parsed)
  }
  if (editing) return (
    <input autoFocus type={type} value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
      className={`w-full bg-electric/5 border border-electric/40 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-electric/30 text-xs ${className}`}
    />
  )
  return (
    <div onClick={start}
      className={`cursor-text px-1.5 py-0.5 rounded hover:bg-black/[0.04] transition-colors relative group/ec min-h-[22px] ${className}`}>
      {(value !== '' && value !== null && value !== undefined)
        ? String(value)
        : <span className="text-muted/30 text-[10px] italic">{placeholder}</span>}
      <Pencil size={7} className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/ec:opacity-20 text-ink transition-opacity" />
    </div>
  )
}

export default function ProspectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { prospects, updateProspect, chargesFixe, employes, agenceSettings } = useData()
  const prospect = prospects.find(p => p.id === id)

  // ── TJH auto-calculé depuis les charges réelles ──────────────────────────
  const tjhEngine = useMemo(
    () => computeTJH({ chargesFixe, employes, agenceSettings }),
    [chargesFixe, employes, agenceSettings]
  )
  const DEFAULT_TJH = 250 // valeur de repli si les charges ne sont pas renseignées
  const autoTJH = tjhEngine.hasData ? tjhEngine.tjh : DEFAULT_TJH

  const [showEdit, setShowEdit] = useState(false)
  const [tab, setTab] = useState('simulateur')
  const [sim, setSim] = useState(prospect?.sim ?? { typeProjet: '1.2', coutM2: 12000, complexite: '1.1', risque: '1.30', marge: 30 })
  const [surface, setSurface] = useState(prospect?.surface ?? 0)
  // TJH : null = mode auto, sinon valeur manuelle saisie par l'utilisateur
  const [tjhManuel, setTjhManuel] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const [missions, setMissions] = useState(prospect?.devisMissions ?? [])
  const [generating, setGenerating] = useState(false)
  const [addingLivrable, setAddingLivrable] = useState(null) // missionId
  const [addingLivrableVal, setAddingLivrableVal] = useState('')
  const [newRowId, setNewRowId] = useState(null) // auto-focus newly added mission
  const [dragIdx, setDragIdx] = useState(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)

  if (!prospect) {
    return (
      <div className="p-10 text-center">
        <div className="font-display text-2xl text-ink mb-3">Prospect introuvable</div>
        <button onClick={() => navigate('/app/crm')} className="btn-ghost"><ArrowLeft size={15} /> Retour</button>
      </div>
    )
  }

  // TJH effectif = manuel si override, sinon auto
  const tjhEffectif = tjhManuel !== null ? parseFloat(tjhManuel) || 0 : autoTJH
  const isManualTJH = tjhManuel !== null

  const result = useMemo(() => calcSimulateur({
    surface:    parseFloat(surface) || 0,
    typeProjet: sim.typeProjet,
    complexite: sim.complexite,
    risque:     sim.risque,
    tjh:        tjhEffectif,
    marge:      sim.marge,
    coutM2:     sim.coutM2,
  }), [sim, surface, tjhEffectif])

  const statut = STATUT_CONFIG[prospect.statut] || STATUT_CONFIG.premier_appel

  const setSim_ = (k) => (e) => {
    const updated = { ...sim, [k]: e.target.value }
    setSim(updated)
    updateProspect(prospect.id, { sim: updated })
  }

  const handleSurfaceChange = (val) => {
    setSurface(val)
    updateProspect(prospect.id, { surface: parseFloat(val) || 0 })
  }

  const handleStatutChange = (newStatut) => {
    updateProspect(prospect.id, { statut: newStatut })
  }

  const handleAddEmptyMission = () => {
    const id = `dm${Date.now()}`
    const m = { id, nom: '', description: '', prixTTC: 0, livrables: [] }
    const updated = [...missions, m]
    setMissions(updated)
    updateProspect(prospect.id, { devisMissions: updated })
    setNewRowId(id)
  }

  const handleDragStart = (i) => setDragIdx(i)
  const handleDragOver = (e, i) => { e.preventDefault(); setDragOverIdx(i) }
  const handleDrop = (e, i) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === i) { setDragIdx(null); setDragOverIdx(null); return }
    const updated = [...missions]
    const [item] = updated.splice(dragIdx, 1)
    updated.splice(i, 0, item)
    setMissions(updated)
    updateProspect(prospect.id, { devisMissions: updated })
    setDragIdx(null)
    setDragOverIdx(null)
  }
  const handleDragEnd = () => { setDragIdx(null); setDragOverIdx(null) }

  const handleDeleteMission = (mId) => {
    const updated = missions.filter(m => m.id !== mId)
    setMissions(updated)
    updateProspect(prospect.id, { devisMissions: updated })
  }

  const handleUpdateMission = (mId, updates) => {
    const updated = missions.map(m => String(m.id) === String(mId) ? { ...m, ...updates } : m)
    setMissions(updated)
    updateProspect(prospect.id, { devisMissions: updated })
  }
  const handleUpdateLivrable = (mId, lvId, nom) => {
    const updated = missions.map(m => String(m.id) === String(mId)
      ? { ...m, livrables: (m.livrables||[]).map(lv => String(lv.id) === String(lvId) ? { ...lv, nom } : lv) }
      : m)
    setMissions(updated)
    updateProspect(prospect.id, { devisMissions: updated })
  }
  const handleDeleteLivrable = (mId, lvId) => {
    const updated = missions.map(m => String(m.id) === String(mId)
      ? { ...m, livrables: (m.livrables||[]).filter(lv => String(lv.id) !== String(lvId)) }
      : m)
    setMissions(updated)
    updateProspect(prospect.id, { devisMissions: updated })
  }
  const handleAddLivrableToMission = (mId) => {
    if (!addingLivrableVal.trim()) { setAddingLivrable(null); return }
    const newLv = { id: `lv${Date.now()}`, nom: addingLivrableVal.trim() }
    const updated = missions.map(m => String(m.id) === String(mId)
      ? { ...m, livrables: [...(m.livrables||[]), newLv] }
      : m)
    setMissions(updated)
    updateProspect(prospect.id, { devisMissions: updated })
    setAddingLivrable(null)
    setAddingLivrableVal('')
  }

  const handleExportPdf = async () => {
    if (missions.length === 0) { toast.error('Ajoutez au moins une mission'); return }
    setGenerating(true)
    try {
      await generateDevisPdf({ prospect, missions })
      toast.success('Devis PDF généré')
    } catch { toast.error('Erreur lors de la génération') }
    finally { setGenerating(false) }
  }

  const totalTTC = missions.reduce((s, m) => s + (m.prixTTC || 0), 0)

  return (
    <div className="p-4 lg:p-10 space-y-6">
      <button onClick={() => navigate('/app/crm')}
        className="flex items-center gap-2 text-sm text-muted hover:text-ink transition-colors">
        <ArrowLeft size={15} /> Retour au CRM
      </button>

      {/* ── Header ── */}
      <div className="card p-5 lg:p-7">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #0A1E3F, #3B82F6)' }}>
              {prospect.prenom?.[0]}{prospect.nom?.[0]}
            </div>
            <div>
              <div className="font-display text-2xl text-ink">{prospect.prenom} {prospect.nom}</div>
              <div className="flex flex-wrap items-center gap-3 mt-1.5">
                {prospect.email && (
                  <a href={`mailto:${prospect.email}`} className="flex items-center gap-1 text-xs text-muted hover:text-ink transition-colors">
                    <Mail size={12} />{prospect.email}
                  </a>
                )}
                {prospect.telephone && (
                  <span className="flex items-center gap-1 text-xs text-muted">
                    <Phone size={12} />{prospect.telephone}
                  </span>
                )}
                {prospect.localisation && (
                  <span className="flex items-center gap-1 text-xs text-muted">
                    <MapPin size={12} />{prospect.localisation}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {Object.entries(STATUT_CONFIG).map(([val, cfg]) => (
              <button key={val} onClick={() => handleStatutChange(val)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  prospect.statut === val ? cfg.cls + ' ring-2 ring-offset-1 ring-current' : 'bg-paper-warm text-muted hover:text-ink'
                }`}>{cfg.label}</button>
            ))}
            <button
              onClick={() => setShowEdit(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-paper-warm border border-border text-muted hover:text-ink hover:border-ink/30 transition-colors"
            >
              <Pencil size={12} /> Modifier
            </button>
          </div>
        </div>

        {/* Project summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {[
            { icon: Building2, label: 'Type', value: prospect.typeProjet || '—' },
            { icon: Ruler, label: 'Surface', value: prospect.surface ? `${prospect.surface} m²` : '—' },
            { icon: Wallet, label: 'Budget', value: prospect.budget ? (isNaN(Number(prospect.budget)) ? String(prospect.budget) : fmtMAD(prospect.budget)) : '—' },
            { icon: MapPin, label: 'Localisation', value: prospect.localisation || '—' },
          ].map((item, i) => {
            const Icon = item.icon
            return (
              <div key={i} className="bg-paper-warm rounded-xl px-4 py-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={13} className="text-muted" />
                  <span className="label-text">{item.label}</span>
                </div>
                <div className="text-sm font-semibold text-ink truncate">{item.value}</div>
              </div>
            )
          })}
        </div>

        {prospect.notes && (
          <div className="mt-4 text-sm text-muted bg-paper-warm rounded-xl px-4 py-3 leading-relaxed whitespace-pre-line">
            {prospect.notes}
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-paper-warm border border-border rounded-2xl p-1 w-full">
        {[
          { key: 'simulateur', label: 'Simulateur d\'honoraires', icon: Calculator },
          { key: 'devis', label: 'Création de devis', icon: FileText },
        ].map(t => {
          const Icon = t.icon
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex-1 justify-center text-center leading-tight ${
                tab === t.key ? 'bg-white shadow-sm text-ink' : 'text-muted hover:text-ink'
              }`}>
              <Icon size={14} className="flex-shrink-0" /> <span>{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* ── Simulateur ── */}
      <AnimatePresence mode="wait">
        {tab === 'simulateur' && (
          <motion.div key="sim" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }} className="space-y-4">

            <div className="card p-5 lg:p-7">
              <div className="label-text mb-1">Simulateur</div>
              <div className="font-display text-xl text-ink mb-5">Estimateur d'honoraires</div>

              {/* Section 1 : Projet */}
              <div className="space-y-4 mb-6">
                <div className="text-xs font-semibold text-muted uppercase tracking-widest">Informations projet</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="label-text mb-1.5 block">Type de projet</label>
                    <SelectField
                      value={sim.typeProjet}
                      onChange={v => setSim_('typeProjet')({ target: { value: v } })}
                      options={TYPE_OPTIONS}
                    />
                  </div>
                  <div>
                    <label className="label-text mb-1.5 block">Surface (m²)</label>
                    <input type="number" min="0" className="input-field" value={surface}
                      onChange={e => handleSurfaceChange(e.target.value)} />
                  </div>
                  <div>
                    <label className="label-text mb-1.5 block">Coût travaux (MAD/m²)</label>
                    <input type="number" min="0" step="500" className="input-field" value={sim.coutM2}
                      onChange={setSim_('coutM2')} />
                  </div>
                </div>
              </div>

              {/* Section 2 : Complexité */}
              <div className="space-y-3 mb-6">
                <div className="text-xs font-semibold text-muted uppercase tracking-widest">Complexité & risque</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label-text mb-1.5 block">Complexité technique</label>
                    <SelectField
                      value={sim.complexite}
                      onChange={v => setSim_('complexite')({ target: { value: v } })}
                      options={COMPLEXITE_OPTIONS}
                    />
                  </div>
                  <div>
                    <label className="label-text mb-1.5 block">Niveau de risque</label>
                    <SelectField
                      value={sim.risque}
                      onChange={v => setSim_('risque')({ target: { value: v } })}
                      options={RISQUE_OPTIONS}
                    />
                  </div>
                </div>
              </div>

              {/* Section 3 : Coûts internes — TJH auto + marge */}
              <div className="space-y-3 mb-6">
                <div className="text-xs font-semibold text-muted uppercase tracking-widest">Coûts internes agence</div>

                {/* Alerte si données insuffisantes */}
                {!tjhEngine.hasData && (
                  <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
                    <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                    <span>
                      TJH par défaut utilisé ({DEFAULT_TJH} MAD/h).{' '}
                      <strong>Renseignez vos charges réelles dans le module Finance</strong> pour un calcul personnalisé.
                    </span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  {/* TJH avec badge auto + override */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="label-text">TJH interne (MAD/h)</label>
                      {isManualTJH ? (
                        <button
                          onClick={() => setTjhManuel(null)}
                          className="flex items-center gap-1 text-[10px] font-semibold text-electric hover:text-electric/80 transition-colors"
                          title="Revenir au calcul automatique"
                        >
                          <RotateCcw size={10} /> Auto
                        </button>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                          <CheckCircle2 size={10} />
                          {tjhEngine.hasData ? 'Depuis vos charges' : 'Par défaut'}
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      min="0"
                      className={`input-field ${!isManualTJH ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800 font-semibold' : ''}`}
                      value={isManualTJH ? tjhManuel : tjhEffectif}
                      onChange={e => setTjhManuel(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="label-text mb-1.5 block">Marge cible (%)</label>
                    <input type="number" min="0" max="100" className="input-field" value={sim.marge} onChange={setSim_('marge')} />
                  </div>
                </div>

                {/* Bouton "Voir le détail du calcul" */}
                {tjhEngine.hasData && (
                  <button
                    onClick={() => setShowDetail(v => !v)}
                    className="flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors"
                  >
                    <Info size={12} />
                    ⓘ Voir le détail du calcul
                    <ChevronDown size={12} className={`transition-transform ${showDetail ? 'rotate-180' : ''}`} />
                  </button>
                )}

                {/* Panneau détail TJH */}
                <AnimatePresence initial={false}>
                  {showDetail && tjhEngine.hasData && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-paper-warm border border-border rounded-xl p-4 space-y-3 text-xs">
                        <div className="font-semibold text-ink text-sm">Détail du calcul TJH</div>

                        {/* Salaires */}
                        {tjhEngine.breakdown.salaires.length > 0 && (
                          <div>
                            <div className="label-text mb-1.5">Masse salariale annuelle</div>
                            <div className="space-y-1">
                              {tjhEngine.breakdown.salaires.map((s, i) => (
                                <div key={i} className="flex justify-between text-muted">
                                  <span>{s.libelle}{s.poste ? ` — ${s.poste}` : ''}</span>
                                  <span className="font-medium text-ink">{fmtMAD(s.montantAnnuel)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Charges fixes */}
                        {tjhEngine.breakdown.charges.length > 0 && (
                          <div>
                            <div className="label-text mb-1.5">Charges fixes annualisées</div>
                            <div className="space-y-1">
                              {tjhEngine.breakdown.charges.map((c, i) => (
                                <div key={i} className="flex justify-between text-muted">
                                  <span>{c.libelle}{c.categorie ? ` (${c.categorie})` : ''}</span>
                                  <span className="font-medium text-ink">{fmtMAD(c.montantAnnuel)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Totaux et formule */}
                        <div className="border-t border-border pt-3 space-y-1.5">
                          <div className="flex justify-between font-semibold text-ink">
                            <span>Total charges annuelles</span>
                            <span>{fmtMAD(tjhEngine.totalChargesAnnuelles)}</span>
                          </div>
                          <div className="flex justify-between text-muted">
                            <span>Heures productives</span>
                            <span>{fmtN(tjhEngine.nbCollaborateurs)} collab. × {fmtN(tjhEngine.heuresParAn)} h = {fmtN(tjhEngine.totalHeuresProductives)} h/an</span>
                          </div>
                          <div className="flex justify-between font-bold text-electric border-t border-border pt-1.5">
                            <span>TJH calculé</span>
                            <span>{fmtMAD(tjhEngine.totalChargesAnnuelles)} ÷ {fmtN(tjhEngine.totalHeuresProductives)} h = {tjhEngine.tjh} MAD/h</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Results */}
              <div className="bg-gradient-to-br from-ink/5 to-electric/5 border border-border rounded-2xl p-5">
                <div className="label-text mb-4">Résultats calculés</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: 'Heures estimées', value: result.heures.toLocaleString('fr-FR'), sub: `${result.jours} jours` },
                    { label: 'Coût interne', value: result.coutInterne.toLocaleString('fr-FR'), sub: 'MAD' },
                    { label: 'Prix calculé', value: result.prix.toLocaleString('fr-FR'), sub: 'MAD HT', highlight: true },
                    { label: 'Ratio honoraires', value: result.ratio.toFixed(1) + '%', sub: `vs barème ${result.bareme.label}` },
                  ].map((r, i) => (
                    <div key={i} className={`rounded-xl p-3 ${r.highlight ? 'bg-electric/10 border border-electric/20' : 'bg-white'}`}>
                      <div className="text-xs text-muted mb-1">{r.label}</div>
                      <div className={`font-display text-2xl ${r.highlight ? 'text-electric' : 'text-ink'}`}>{r.value}</div>
                      <div className="text-[10px] text-muted">{r.sub}</div>
                    </div>
                  ))}
                </div>

                {result.alerte && (
                  <div className={`flex items-start gap-2.5 rounded-xl px-4 py-3 text-xs ${
                    result.alerte.type === 'success' ? 'bg-emerald-50 text-emerald-700' :
                    result.alerte.type === 'warning' ? 'bg-amber-50 text-amber-700' :
                    'bg-rose-50 text-rose-700'
                  }`}>
                    {result.alerte.type === 'success' ? <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" /> :
                     result.alerte.type === 'warning' ? <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" /> :
                     <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />}
                    <span>{result.alerte.msg}</span>
                  </div>
                )}

                <div className="mt-3 text-[11px] text-muted bg-white rounded-lg px-3 py-2">
                  <strong className="text-ink">Formule :</strong> Heures × TJH × Risque × (1 + Marge) = {result.heures} × {tjhEffectif} × {sim.risque} × {(1 + parseFloat(sim.marge) / 100).toFixed(2)} = <strong>{result.prix.toLocaleString('fr-FR')} MAD</strong>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Devis ── */}
        {tab === 'devis' && (
          <motion.div key="devis" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }} className="space-y-4">

            <div className="card p-5 lg:p-7">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="label-text mb-1">Devis</div>
                  <div className="font-display text-xl text-ink">Missions & Prestations</div>
                </div>
                <button onClick={handleExportPdf} disabled={generating}
                  className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl bg-ink text-paper hover:opacity-90 transition-opacity disabled:opacity-50">
                  {generating ? <Loader size={13} className="animate-spin" /> : <Download size={13} />}
                  Exporter PDF
                </button>
              </div>

              {/* Missions list */}
              {/* ── Tableau missions ── */}
              <div className="overflow-x-auto -mx-5 lg:-mx-7 px-5 lg:px-7">
              <div className="border border-border rounded-2xl overflow-hidden min-w-[580px]">

                {/* Header */}
                <div className="flex bg-[#0A1E3F] text-white text-[9px] font-semibold uppercase tracking-widest select-none">
                  <div className="w-7 flex-shrink-0" />
                  <div className="w-9 flex-shrink-0 px-2 py-3 text-center">#</div>
                  <div className="w-44 flex-shrink-0 border-l border-white/10 px-3 py-3">Mission</div>
                  <div className="flex-1 border-l border-white/10 px-3 py-3">Livrables inclus</div>
                  <div className="w-44 flex-shrink-0 border-l border-white/10 px-3 py-3">Description</div>
                  <div className="w-32 flex-shrink-0 border-l border-white/10 px-3 py-3 text-right">Montant TTC</div>
                  <div className="w-9 flex-shrink-0" />
                </div>

                {missions.length === 0 && (
                  <div className="flex items-center justify-center py-8 text-sm text-muted border-t border-border">
                    Cliquez sur « + Nouvelle mission » pour commencer
                  </div>
                )}

                {missions.map((m, mi) => {
                  const isDragging = dragIdx === mi
                  const isOver = dragOverIdx === mi && dragIdx !== mi
                  return (
                    <div key={m.id}
                      onDragOver={e => handleDragOver(e, mi)}
                      onDrop={e => handleDrop(e, mi)}
                      className={`flex border-t border-border group/row transition-all
                        ${isDragging ? 'opacity-40 bg-electric/5' : mi % 2 === 1 ? 'bg-paper-warm/40' : 'bg-white'}
                        ${isOver ? 'ring-2 ring-inset ring-electric/40' : ''}
                      `}
                    >
                      {/* Drag handle */}
                      <div
                        draggable
                        onDragStart={() => handleDragStart(mi)}
                        onDragEnd={handleDragEnd}
                        className="w-7 flex-shrink-0 flex items-center justify-center cursor-grab active:cursor-grabbing border-r border-border hover:bg-paper-warm transition-colors"
                        title="Glisser pour réordonner"
                      >
                        <GripVertical size={13} className="text-muted/25 group-hover/row:text-muted/50 transition-colors" />
                      </div>

                      {/* N° — auto-calculé */}
                      <div className="w-9 flex-shrink-0 border-r border-border flex items-start justify-center pt-3">
                        <span className="text-[10px] font-bold text-muted/40">{String(mi + 1).padStart(2, '0')}</span>
                      </div>

                      {/* Mission nom */}
                      <div className="w-44 flex-shrink-0 border-r border-border flex items-start p-1.5">
                        <EditableCell
                          value={m.nom} placeholder="Nom de la mission"
                          autoEdit={m.id === newRowId}
                          onSave={val => { handleUpdateMission(m.id, { nom: val }); setNewRowId(null) }}
                          className="w-full text-sm font-semibold text-ink"
                        />
                      </div>

                      {/* Livrables */}
                      <div className="flex-1 border-r border-border flex flex-col min-h-[46px]">
                        {(m.livrables || []).map(lv => (
                          <div key={lv.id}
                            className="flex items-center gap-2 border-b border-border/40 px-3 py-1.5 group/lv hover:bg-electric/5 transition-colors">
                            <span className="w-1.5 h-1.5 rounded-full bg-electric/40 flex-shrink-0" />
                            <EditableCell value={lv.nom} placeholder="Livrable"
                              onSave={val => handleUpdateLivrable(m.id, lv.id, val)}
                              className="flex-1 text-xs text-ink" />
                            <button onClick={() => handleDeleteLivrable(m.id, lv.id)}
                              className="w-4 h-4 flex items-center justify-center text-muted hover:text-rose-500 transition-colors opacity-0 group-hover/lv:opacity-100 flex-shrink-0">
                              <X size={9} />
                            </button>
                          </div>
                        ))}
                        {addingLivrable === m.id ? (
                          <div className="flex items-center gap-2 px-3 py-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-electric/30 flex-shrink-0" />
                            <input autoFocus type="text" value={addingLivrableVal}
                              onChange={e => setAddingLivrableVal(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleAddLivrableToMission(m.id)
                                if (e.key === 'Escape') { setAddingLivrable(null); setAddingLivrableVal('') }
                              }}
                              onBlur={() => handleAddLivrableToMission(m.id)}
                              placeholder="Nom du livrable…"
                              className="flex-1 text-xs bg-transparent border-b border-electric/40 outline-none py-0.5 placeholder:text-muted/40"
                            />
                          </div>
                        ) : (
                          <button onClick={() => { setAddingLivrable(m.id); setAddingLivrableVal('') }}
                            className="flex items-center gap-1.5 px-3 py-2 text-[10px] text-muted/40 hover:text-electric transition-colors w-full text-left">
                            <Plus size={9} /> Ajouter un livrable
                          </button>
                        )}
                      </div>

                      {/* Description */}
                      <div className="w-44 flex-shrink-0 border-r border-border flex items-start p-1.5">
                        <EditableCell value={m.description || ''} placeholder="Description…"
                          onSave={val => handleUpdateMission(m.id, { description: val })}
                          className="w-full text-xs text-muted" />
                      </div>

                      {/* Prix */}
                      <div className="w-32 flex-shrink-0 border-r border-border flex items-start justify-end p-1.5">
                        <EditableCell value={m.prixTTC || ''} type="number" placeholder="0"
                          onSave={val => handleUpdateMission(m.id, { prixTTC: Number(val) })}
                          className="text-sm font-bold text-ink text-right w-full" />
                      </div>

                      {/* Supprimer */}
                      <div className="w-9 flex-shrink-0 flex items-start justify-center pt-2">
                        <button onClick={() => handleDeleteMission(m.id)}
                          className="w-6 h-6 flex items-center justify-center rounded text-muted hover:text-rose-500 hover:bg-rose-50 transition-colors opacity-0 group-hover/row:opacity-100">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  )
                })}

                {/* Ajouter une mission — inline dans le tableau */}
                <button onClick={handleAddEmptyMission}
                  className="w-full flex items-center gap-2 px-4 py-2.5 border-t border-dashed border-border/60 hover:bg-paper-warm/60 transition-colors group/add text-left">
                  <div className="w-7 flex-shrink-0 flex justify-center">
                    <Plus size={11} className="text-muted/30 group-hover/add:text-electric transition-colors" />
                  </div>
                  <span className="text-xs text-muted/40 group-hover/add:text-electric transition-colors">Nouvelle mission…</span>
                </button>

                {/* Total */}
                {missions.length > 0 && (
                  <div className="flex bg-[#0A1E3F] text-white border-t border-[#0A1E3F]/20">
                    <div className="w-7 flex-shrink-0" />
                    <div className="w-9 flex-shrink-0" />
                    <div className="w-44 flex-shrink-0 border-l border-white/10 px-3 py-3 text-sm font-semibold tracking-wide">Total TTC</div>
                    <div className="flex-1 border-l border-white/10" />
                    <div className="w-44 flex-shrink-0 border-l border-white/10" />
                    <div className="w-32 flex-shrink-0 border-l border-white/10 px-3 py-3 text-right font-display text-lg">{fmtMAD(totalTTC)}</div>
                    <div className="w-9 flex-shrink-0" />
                  </div>
                )}
              </div>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      <AnimatePresence>
        {showEdit && (
          <EditClientModal
            prospect={prospect}
            onClose={() => setShowEdit(false)}
            onSave={(updates) => {
              updateProspect(prospect.id, updates)
              toast.success('Informations mises à jour')
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
