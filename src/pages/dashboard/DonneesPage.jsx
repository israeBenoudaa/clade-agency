import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Database, Shield, ShieldCheck, AlertTriangle, CheckCircle,
  Upload, Download, RotateCcw, Eye, EyeOff,
  DatabaseBackup, Clock, Trash2, HistoryIcon, Save, FileJson, TriangleAlert, X,
  FolderGit2, Users, Wallet, BookOpen, Link, Activity, UserCheck, Lock, ChevronDown,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { verifyDirectorPassword } from '../../lib/supabaseAuth'

const getExportKeys = () =>
  Object.keys(localStorage).filter(k => k.startsWith('clade_') && k !== 'clade_checkpoints')

const ACTION_META = {
  reset:  { icon: RotateCcw, color: 'text-rose-500',   bg: 'bg-rose-50',     label: 'Réinitialiser les données' },
  export: { icon: Download,  color: 'text-electric',    bg: 'bg-electric/10', label: 'Exporter les données'      },
  import: { icon: Upload,    color: 'text-violet-600',  bg: 'bg-violet-50',   label: 'Importer des données'      },
}

/* ── PIN validation modal ─────────────────────────────────────────────────── */
function PinModal({ title, subtitle, onConfirm, onClose }) {
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')

  const handleConfirm = async () => {
    const { data } = await supabase.rpc('verify_director_pin', { input_pin: pin })
    if (data) { onConfirm(); onClose() }
    else { setErr('Code PIN incorrect'); setPin('') }
  }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden"
        initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 12 }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Lock size={16} className="text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-ink text-sm">{title}</div>
            {subtitle && <div className="text-xs text-muted">{subtitle}</div>}
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-paper-warm text-muted">
            <X size={14} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="label-text mb-1.5 block">Code PIN Directeur</label>
            <input type="password" inputMode="numeric" maxLength={6} autoFocus
              className="input-field w-full tracking-[0.5em] text-center font-mono text-lg"
              placeholder="• • • • • •" value={pin}
              onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setErr('') }}
              onKeyDown={e => e.key === 'Enter' && handleConfirm()} />
          </div>
          {err && (
            <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 rounded-xl px-3 py-2.5">
              <AlertTriangle size={12} className="flex-shrink-0" /> {err}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="btn-ghost flex-1">Annuler</button>
            <button onClick={handleConfirm} className="btn-primary flex-1">Confirmer</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ── Confirm delete modal ─────────────────────────────────────────────────── */
function ConfirmDeleteModal({ label, onConfirm, onClose }) {
  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden"
        initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 12 }}
        onClick={e => e.stopPropagation()}>
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Trash2 size={16} className="text-rose-500" />
            </div>
            <div>
              <div className="font-semibold text-ink text-sm mb-1">Supprimer la sauvegarde ?</div>
              <div className="text-xs text-muted leading-relaxed">
                « {label} » sera définitivement supprimée. Cette action est irréversible.
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-ghost flex-1">Annuler</button>
            <button onClick={() => { onConfirm(); onClose() }}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-rose-500 text-white hover:bg-rose-600 transition-colors">
              Supprimer
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function DataActionsModal({ action, onClose }) {
  const { profile } = useAuth()
  const [step, setStep] = useState('auth')
  const [pwd, setPwd] = useState('')
  const [pin, setPin] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [authErr, setAuthErr] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [importErr, setImportErr] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const meta = ACTION_META[action]
  const Icon = meta.icon

  const handleAuth = async () => {
    const [pwdOk, { data: pinOk }] = await Promise.all([
      verifyDirectorPassword(profile.email, pwd),
      supabase.rpc('verify_director_pin', { input_pin: pin }),
    ])
    if (pwdOk && pinOk) { setStep('action') }
    else { setAuthErr('Mot de passe ou PIN incorrect') }
  }

  const doReset = () => {
    Object.keys(localStorage).filter(k => k.startsWith('clade_')).forEach(k => localStorage.removeItem(k))
    window.location.reload()
  }

  const doExport = () => {
    const data = {}
    for (const key of getExportKeys()) {
      const raw = localStorage.getItem(key)
      if (raw !== null) { try { data[key] = JSON.parse(raw) } catch { data[key] = raw } }
    }
    const backup = { version: '1.0', exportedAt: new Date().toISOString(), agency: 'CLADE', data }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `clade-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click()
    URL.revokeObjectURL(url)
    toast.success('Sauvegarde téléchargée')
    onClose()
  }

  const processImport = (file) => {
    setImportErr('')
    if (!file || !file.name.endsWith('.json')) { setImportErr('Veuillez sélectionner un fichier .json valide'); return }
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const backup = JSON.parse(e.target.result)
        if (!backup.version || !backup.data || backup.agency !== 'CLADE') {
          setImportErr('Format invalide — utilisez un fichier exporté depuis CLADE'); return
        }
        const { data } = backup
        if (Array.isArray(data['clade_employes'])) {
          data['clade_employes'] = data['clade_employes'].map(e => ({
            ...e, salaireNet: Number(e.salaireNet) || 0, salaireBrut: Number(e.salaireBrut) || 0,
          }))
        }
        if (Array.isArray(data['clade_transactions'])) {
          data['clade_transactions'] = data['clade_transactions'].map(t => ({ ...t, montant: Number(t.montant) || 0 }))
        }
        if (Array.isArray(data['clade_charges_fixes'])) {
          data['clade_charges_fixes'] = data['clade_charges_fixes'].map(c => ({ ...c, montant: Number(c.montant) || 0 }))
        }
        for (const [key, val] of Object.entries(data)) {
          if (key.startsWith('clade_')) localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val))
        }
        toast.success('Données restaurées avec succès')
        window.location.reload()
      } catch { setImportErr('Fichier corrompu ou illisible') }
    }
    reader.readAsText(file)
  }

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
        <motion.div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
          onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-3 p-5 border-b border-border">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
              <Icon size={18} className={meta.color} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-ink text-sm">
                {step === 'auth' ? 'Authentification requise' : meta.label}
              </div>
              <div className="text-xs text-muted">
                {step === 'auth' ? 'Accès réservé au Directeur Général' :
                 action === 'reset'  ? 'Action irréversible — toutes les données seront supprimées' :
                 action === 'export' ? 'Format JSON — sauvegarde complète et restaurable' :
                                      'Restaurer depuis une sauvegarde CLADE'}
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-paper-warm text-muted transition-colors flex-shrink-0">
              <X size={15} />
            </button>
          </div>

          {step === 'auth' && (
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-paper-warm border border-border">
                <ShieldCheck size={13} className="text-electric flex-shrink-0" />
                <span className="text-xs text-muted">Saisissez vos identifiants pour autoriser cette action</span>
              </div>
              <div>
                <label className="label-text mb-1.5 block">Mot de passe Directeur</label>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} className="input-field w-full pr-10"
                    placeholder="Mot de passe" value={pwd} autoFocus
                    onChange={e => { setPwd(e.target.value); setAuthErr('') }}
                    onKeyDown={e => e.key === 'Enter' && handleAuth()} />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors">
                    {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label-text mb-1.5 block">Code PIN</label>
                <input type="password" inputMode="numeric" maxLength={6}
                  className="input-field w-full tracking-[0.5em] text-center font-mono text-lg"
                  placeholder="• • • • • •" value={pin}
                  onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setAuthErr('') }}
                  onKeyDown={e => e.key === 'Enter' && handleAuth()} />
              </div>
              {authErr && (
                <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 rounded-xl px-3 py-2.5">
                  <AlertTriangle size={12} className="flex-shrink-0" /> {authErr}
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button onClick={onClose} className="btn-ghost flex-1">Annuler</button>
                <button onClick={handleAuth} className="btn-primary flex-1">Valider</button>
              </div>
            </div>
          )}

          {step === 'action' && action === 'reset' && (
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-100">
                <AlertTriangle size={16} className="text-rose-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-rose-800 mb-1">Suppression définitive</div>
                  <div className="text-xs text-rose-700 leading-relaxed">
                    Projets, employés, transactions, prospects, messages, recrutements, collaborateurs et tous les paramètres seront effacés sans possibilité de récupération.
                  </div>
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer select-none p-3 rounded-xl hover:bg-paper-warm transition-colors">
                <div onClick={() => setConfirmed(v => !v)}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${confirmed ? 'bg-rose-500 border-rose-500' : 'border-border'}`}>
                  {confirmed && <CheckCircle size={12} className="text-white" />}
                </div>
                <span className="text-sm text-ink">Je confirme vouloir supprimer toutes les données</span>
              </label>
              <div className="flex gap-2">
                <button onClick={onClose} className="btn-ghost flex-1">Annuler</button>
                <button onClick={doReset} disabled={!confirmed}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  Réinitialiser
                </button>
              </div>
            </div>
          )}

          {step === 'action' && action === 'export' && (
            <div className="p-5 space-y-4">
              <div className="rounded-xl border border-border bg-paper-warm p-4">
                <div className="text-xs font-semibold text-ink mb-3">Contenu de la sauvegarde</div>
                <div className="space-y-1.5">
                  {['Projets, missions et tâches', 'Équipe, planning et congés', 'Transactions et charges fixes',
                    'CRM, prospects et devis', 'Recrutements et candidats', 'Collaborateurs et catégories',
                    'Messages', 'Paramètres agence (taux IS, objectif CA…)'].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted">
                      <div className="w-1.5 h-1.5 rounded-full bg-electric flex-shrink-0" /> {item}
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-xs text-muted text-center">
                Le fichier sera téléchargé au format{' '}
                <code className="font-mono bg-paper-warm px-1.5 py-0.5 rounded">clade-backup-YYYY-MM-DD.json</code>
              </div>
              <div className="flex gap-2">
                <button onClick={onClose} className="btn-ghost flex-1">Annuler</button>
                <button onClick={doExport} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Download size={13} /> Télécharger
                </button>
              </div>
            </div>
          )}

          {step === 'action' && action === 'import' && (
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                <AlertTriangle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-700 leading-relaxed">
                  Les données actuelles seront remplacées par celles du fichier. Exportez d'abord si vous souhaitez conserver une copie.
                </div>
              </div>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); processImport(e.dataTransfer.files[0]) }}
                className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${dragOver ? 'border-electric bg-electric/5' : 'border-border hover:border-electric/40 hover:bg-paper-warm/50'}`}>
                <Upload size={26} className={`mx-auto mb-2 transition-colors ${dragOver ? 'text-electric' : 'text-muted'}`} />
                <div className="text-sm font-semibold text-ink mb-1">Glissez votre fichier ici</div>
                <div className="text-xs text-muted mb-3">ou cliquez pour sélectionner</div>
                <input type="file" accept=".json" className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={e => processImport(e.target.files[0])} />
                <span className="text-[10px] font-mono text-muted bg-paper-warm px-2 py-1 rounded-lg border border-border">
                  clade-backup-YYYY-MM-DD.json
                </span>
              </div>
              {importErr && (
                <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 rounded-xl px-3 py-2.5">
                  <AlertTriangle size={12} className="flex-shrink-0" /> {importErr}
                </div>
              )}
              <button onClick={onClose} className="btn-ghost w-full">Annuler</button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

const LOG_CFG = {
  project:   { icon: FolderGit2,    bg: 'bg-violet-100',  color: 'text-violet-600'  },
  employe:   { icon: Users,          bg: 'bg-blue-100',    color: 'text-blue-600'    },
  finance:   { icon: Wallet,         bg: 'bg-emerald-100', color: 'text-emerald-600' },
  formation: { icon: BookOpen,       bg: 'bg-indigo-100',  color: 'text-indigo-600'  },
  collab:    { icon: Link,           bg: 'bg-amber-100',   color: 'text-amber-600'   },
  data:      { icon: DatabaseBackup, bg: 'bg-electric/10', color: 'text-electric'    },
  client:    { icon: UserCheck,      bg: 'bg-teal-100',    color: 'text-teal-600'    },
}

function timeAgo(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "À l'instant"
  if (m < 60) return `Il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `Il y a ${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `Il y a ${d}j`
  return new Date(isoStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

const CLEAR_OPTIONS = [
  { label: 'Dernières 15 min', ms: 15 * 60 * 1000 },
  { label: 'Dernière heure',   ms: 60 * 60 * 1000 },
  { label: '8 dernières heures', ms: 8 * 60 * 60 * 1000 },
  { label: 'Tout effacer',     ms: null },
]

export default function DonneesPage() {
  const { checkpoints, createCheckpoint, deleteCheckpoint, enterDemoMode, activityLog, clearActivityLog, clearActivityLogBefore } = useData()
  const { isDirector, profile } = useAuth()
  const byName = profile?.nom || profile?.full_name || ''
  const navigate = useNavigate()
  const [dataAction, setDataAction] = useState(null)
  const [logFilter, setLogFilter] = useState('tous')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [clearPending, setClearPending] = useState(null) // { label, ms }
  const [showClearDropdown, setShowClearDropdown] = useState(false)

  const TRIGGER_CFG = {
    auto:               { label: 'Auto — démarrage',   color: 'bg-emerald-100 text-emerald-700' },
    auto_suppression:   { label: 'Auto — suppression', color: 'bg-amber-100 text-amber-700' },
    avant_restauration: { label: 'Avant restauration', color: 'bg-violet-100 text-violet-700' },
    manuel:             { label: 'Manuel',             color: 'bg-electric/10 text-electric' },
  }

  const confirmingCp = checkpoints.find(c => c.id === confirmDeleteId)

  return (
    <div className="p-4 lg:p-10 space-y-6">

      {/* ── Sauvegardes ─────────────────────────────────────────────────── */}
      <div className="card p-5 lg:p-7">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
          <div>
            <div className="label-text mb-1">Données</div>
            <div className="font-display text-xl text-ink flex items-center gap-2">
              <DatabaseBackup size={18} className="text-electric" />
              Sauvegardes
              <span className="text-sm font-normal text-muted ml-1">{checkpoints.length} / 10</span>
            </div>
            <p className="text-[11px] text-muted mt-1.5 max-w-lg">
              Inclus : projets, employés, clients, finances.
              <span className="text-muted/60"> · Non inclus : messages, photos, images concept.</span>
            </p>
          </div>
          <div className="flex items-center justify-center sm:justify-end gap-2 flex-wrap flex-shrink-0">
            {isDirector && (
              <>
                <button onClick={() => setDataAction('import')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border hover:bg-paper-warm text-ink text-xs font-semibold transition-colors">
                  <Upload size={13} /> <span className="hidden sm:inline">Importer</span>
                </button>
                <button onClick={() => setDataAction('export')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border hover:bg-paper-warm text-ink text-xs font-semibold transition-colors">
                  <Download size={13} /> <span className="hidden sm:inline">Exporter</span>
                </button>
                <button onClick={() => setDataAction('reset')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-semibold transition-colors">
                  <RotateCcw size={13} /> <span className="hidden sm:inline">Réinitialiser</span>
                </button>
              </>
            )}
            <button onClick={() => { createCheckpoint('Sauvegarde manuelle', 'manuel', byName); toast.success('Sauvegarde créée') }}
              className="btn-primary text-xs">
              <Save size={13} /> <span className="hidden sm:inline">Créer une sauvegarde</span>
            </button>
          </div>
        </div>

        {checkpoints.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-border rounded-xl">
            <div className="w-12 h-12 rounded-2xl bg-electric/10 flex items-center justify-center mx-auto mb-3">
              <DatabaseBackup size={20} className="text-electric/50" />
            </div>
            <div className="font-semibold text-ink text-sm mb-1">Aucune sauvegarde</div>
            <p className="text-xs text-muted">La première sera créée automatiquement au prochain démarrage.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {checkpoints.map((cp, i) => {
            const cfg = TRIGGER_CFG[cp.trigger] || TRIGGER_CFG.manuel
            const date = new Date(cp.createdAt)
            const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
            const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

            const exportCp = () => {
              const blob = new Blob([JSON.stringify(cp, null, 2)], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `clade_backup_${date.toISOString().slice(0, 10)}_${date.toISOString().slice(11, 16).replace(':', 'h')}.json`
              a.click()
              URL.revokeObjectURL(url)
            }

            return (
              <motion.div key={cp.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-xl bg-paper-warm hover:bg-white hover:shadow-sm transition-all overflow-hidden">
                <div className="flex items-center gap-3 p-3.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${i === 0 ? 'bg-electric/15' : 'bg-white'}`}>
                    <Clock size={14} className={i === 0 ? 'text-electric' : 'text-muted'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-sm font-semibold text-ink">{cp.label}</span>
                      {i === 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-electric text-white tracking-wide">DERNIÈRE</span>}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted flex-wrap">
                      <span>{dateStr} à {timeStr}</span>
                      <span className="text-border">·</span>
                      <span className={`px-1.5 py-0.5 rounded-full font-semibold ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-border">·</span>
                      <span>{cp.size} Ko</span>
                      {cp.by && <><span className="text-border">·</span><span className="font-semibold text-ink/60">{cp.by}</span></>}
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
                    <button onClick={exportCp}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-muted hover:text-ink hover:bg-white border border-transparent hover:border-border transition-colors">
                      <FileJson size={12} /> Exporter
                    </button>
                    <button onClick={() => { enterDemoMode(cp); navigate('/app') }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-electric hover:bg-electric/8 border border-transparent hover:border-electric/20 transition-colors">
                      <Eye size={12} /> Aperçu
                    </button>
                    <div className="w-px h-4 bg-border mx-0.5" />
                    <button onClick={() => setConfirmDeleteId(cp.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-rose-500 hover:bg-rose-50 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>

                  <button onClick={() => setConfirmDeleteId(cp.id)}
                    className="sm:hidden w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-rose-500 hover:bg-rose-50 transition-colors flex-shrink-0">
                    <Trash2 size={12} />
                  </button>
                </div>

                <div className="sm:hidden flex border-t border-border/60">
                  <button onClick={exportCp}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold text-muted hover:text-ink hover:bg-white transition-colors border-r border-border/60">
                    <FileJson size={12} /> Exporter
                  </button>
                  <button onClick={() => { enterDemoMode(cp); navigate('/app') }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold text-electric hover:bg-electric/5 transition-colors">
                    <Eye size={12} /> Aperçu
                  </button>
                </div>
              </motion.div>
            )
            })}
          </div>
        )}
      </div>

      {/* ── Activity log ─────────────────────────────────────────────────── */}
      <div className="card p-5 lg:p-7">
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="label-text mb-1">Audit</div>
              <div className="font-display text-xl text-ink flex items-center gap-2">
                <Activity size={18} className="text-electric" />
                Historique d'activité
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 mt-1">
              <div className="text-[10px] text-muted">
                <Clock size={10} className="inline mr-1 opacity-60" />
                Purge auto · 30 jours
              </div>
              {/* Clear history dropdown */}
              <div className="relative">
                <button onClick={() => setShowClearDropdown(v => !v)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-rose-500 hover:bg-rose-50 border border-rose-100 transition-colors">
                  <Trash2 size={11} /> Effacer <ChevronDown size={10} />
                </button>
                <AnimatePresence>
                  {showClearDropdown && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                      className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-border z-20 w-48 overflow-hidden">
                      {CLEAR_OPTIONS.map(opt => (
                        <button key={opt.label} onClick={() => { setClearPending(opt); setShowClearDropdown(false) }}
                          className="w-full text-left px-3.5 py-2.5 text-xs text-ink hover:bg-paper-warm transition-colors border-b border-border/50 last:border-0">
                          {opt.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Category filter — centered */}
          <div className="flex justify-center">
            <div className="flex gap-1 bg-paper-warm border border-border rounded-xl p-1 flex-shrink-0">
              {[
                { key: 'tous',    label: 'Tout'     },
                { key: 'project', label: 'Projets'  },
                { key: 'employe', label: 'RH'       },
                { key: 'client',  label: 'CRM'      },
                { key: 'finance', label: 'Finance'  },
                { key: 'data',    label: 'Data'     },
              ].map(f => (
                <button key={f.key} onClick={() => setLogFilter(f.key)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap flex-shrink-0 ${
                    logFilter === f.key ? 'bg-ink text-paper' : 'text-muted hover:text-ink'
                  }`}>{f.label}</button>
              ))}
            </div>
          </div>
        </div>

        {activityLog.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-xl">
            <Activity size={28} className="text-muted/40 mx-auto mb-3" />
            <div className="text-sm text-muted">Aucune activité enregistrée pour le moment</div>
            <div className="text-xs text-muted/70 mt-1">Les actions importantes apparaîtront ici</div>
          </div>
        ) : (() => {
          const filtered = logFilter === 'tous'
            ? activityLog
            : activityLog.filter(e => e.category === logFilter)
          return filtered.length === 0 ? (
            <div className="text-center py-8 text-muted text-sm">Aucune activité dans cette catégorie.</div>
          ) : (
            /* Fixed-height scrollable container */
            <div className="h-80 overflow-y-auto rounded-xl border border-border bg-paper-warm/40 pr-0.5">
              <div className="space-y-0.5 p-1.5">
                {filtered.slice(0, 200).map((entry, i) => {
                  const cfg = LOG_CFG[entry.category] || LOG_CFG.data
                  const Icon = cfg.icon
                  const date = new Date(entry.timestamp)
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.015, 0.3) }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white transition-colors"
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                        <Icon size={13} className={cfg.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-ink">{entry.action}</span>
                          {entry.details && (
                            <span className="text-xs text-muted truncate max-w-[220px]">{entry.details}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted mt-0.5">
                          <span className="font-semibold text-ink/70">{entry.by || 'Système'}</span>
                          <span>·</span>
                          <span title={date.toLocaleString('fr-FR')}>{timeAgo(entry.timestamp)}</span>
                          <span>·</span>
                          <span>{date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
                {filtered.length > 200 && (
                  <div className="text-center text-xs text-muted py-2">
                    + {filtered.length - 200} entrées plus anciennes
                  </div>
                )}
              </div>
            </div>
          )
        })()}
      </div>

      {dataAction && <DataActionsModal action={dataAction} onClose={() => setDataAction(null)} />}

      <AnimatePresence>
        {confirmingCp && (
          <ConfirmDeleteModal
            label={confirmingCp.label}
            onConfirm={() => { deleteCheckpoint(confirmingCp.id); toast.success('Sauvegarde supprimée') }}
            onClose={() => setConfirmDeleteId(null)}
          />
        )}
        {clearPending && (
          <PinModal
            title={clearPending.label}
            subtitle="Confirmation par PIN Directeur requise"
            onConfirm={() => {
              if (clearPending.ms === null) {
                clearActivityLog()
                toast.success('Historique effacé')
              } else {
                clearActivityLogBefore(clearPending.ms)
                toast.success(`Entrées des ${clearPending.label.toLowerCase()} effacées`)
              }
              setClearPending(null)
            }}
            onClose={() => setClearPending(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
