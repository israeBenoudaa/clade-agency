import { useState, useRef, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Plus, X, Pencil, Trash2, FileText, Mail,
  User, CheckCircle, Clock, XCircle, CalendarCheck, Upload,
  ChevronDown, Briefcase, PhoneCall, GraduationCap, Banknote, Globe, Check, Send, UserCheck,
} from 'lucide-react'
import { useData } from '../../context/DataContext'
import toast from 'react-hot-toast'
import SelectField from '../../components/SelectField'

const STATUT_CAND = {
  recu:     { label: 'Reçu',      bg: 'bg-paper-warm',  text: 'text-muted',        border: 'border-border',       icon: Clock },
  accepte:  { label: 'Accepté',   bg: 'bg-emerald-50',  text: 'text-emerald-700',  border: 'border-emerald-200',  icon: CheckCircle },
  refuse:   { label: 'Refusé',    bg: 'bg-rose-50',     text: 'text-rose-700',     border: 'border-rose-200',     icon: XCircle },
  confirme: { label: 'Confirmé',  bg: 'bg-violet-50',   text: 'text-violet-700',   border: 'border-violet-200',   icon: UserCheck },
}

const STATUT_POSTE = {
  ouvert: { label: 'Ouvert',  bg: 'bg-emerald-50', text: 'text-emerald-700' },
  ferme:  { label: 'Fermé',   bg: 'bg-paper-warm', text: 'text-muted' },
  pourvu: { label: 'Pourvu',  bg: 'bg-electric/10','text': 'text-electric' },
}

function fmtSalary(n) {
  if (!n) return '—'
  return Number(n).toLocaleString('fr-FR') + ' DH'
}

function addMinutesToTime(time, minutes) {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + Number(minutes)
  const hh = Math.floor(total / 60) % 24
  const mm = total % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

// ── EditPosteModal ────────────────────────────────────────────────────────────
function EditPosteModal({ poste, onClose, onSave }) {
  const [form, setForm] = useState({
    intitule: poste.intitule || '',
    description: poste.description || '',
    missions: poste.missions || '',
    salaireMin: poste.salaireMin || '',
    salaireMax: poste.salaireMax || '',
    dept: poste.dept || '',
    statut: poste.statut || 'ouvert',
  })
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = e => {
    e.preventDefault()
    if (!form.intitule.trim()) { toast.error('Intitulé requis'); return }
    onSave(form)
    onClose()
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm"
        onClick={e => e.target === e.currentTarget && onClose()}>
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
            <div className="font-semibold text-ink">Modifier le poste</div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-paper-warm flex items-center justify-center text-muted"><X size={14} /></button>
          </div>
          <form onSubmit={submit} className="p-6 space-y-4 overflow-y-auto">
            <div>
              <label className="label-text mb-1.5 block">Intitulé du poste *</label>
              <input className="input-field" value={form.intitule} onChange={set('intitule')} autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-text mb-1.5 block">Département</label>
                <input className="input-field" placeholder="Architecture" value={form.dept} onChange={set('dept')} />
              </div>
              <div>
                <label className="label-text mb-1.5 block">Statut</label>
                <SelectField
                  value={form.statut}
                  onChange={v => set('statut')({ target: { value: v } })}
                  options={[
                    { value: 'ouvert', label: 'Ouvert' },
                    { value: 'ferme', label: 'Fermé' },
                    { value: 'pourvu', label: 'Pourvu' },
                  ]}
                />
              </div>
            </div>
            <div>
              <label className="label-text mb-1.5 block">Description</label>
              <textarea className="input-field resize-none" rows={3} value={form.description} onChange={set('description')} />
            </div>
            <div>
              <label className="label-text mb-1.5 block">Missions principales</label>
              <textarea className="input-field resize-none" rows={3} placeholder="- Concevoir et coordonner..." value={form.missions} onChange={set('missions')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-text mb-1.5 block">Salaire min (DH)</label>
                <input type="number" className="input-field" value={form.salaireMin} onChange={set('salaireMin')} />
              </div>
              <div>
                <label className="label-text mb-1.5 block">Salaire max (DH)</label>
                <input type="number" className="input-field" value={form.salaireMax} onChange={set('salaireMax')} />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Annuler</button>
              <button type="submit" className="btn-primary flex-1 justify-center">Enregistrer</button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

// ── AddCandidatModal ──────────────────────────────────────────────────────────
function AddCandidatModal({ onClose, onAdd, existing }) {
  const cvRef = useRef(null)
  const portRef = useRef(null)
  const [form, setForm] = useState(existing || {
    prenom: '', nom: '', email: '', telephone: '',
    etudes: '', pretentionSalariale: '', notes: '',
    cv: null, portfolio: null,
  })
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleFile = (key, e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('Fichier max 2 Mo'); return }
    const reader = new FileReader()
    reader.onload = ev => setForm(f => ({ ...f, [key]: { name: file.name, dataUrl: ev.target.result, size: file.size } }))
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const submit = e => {
    e.preventDefault()
    if (!form.prenom.trim() || !form.nom.trim()) { toast.error('Prénom et nom requis'); return }
    onAdd({ ...form, prenom: form.prenom.trim(), nom: form.nom.trim() })
    onClose()
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm"
        onClick={e => e.target === e.currentTarget && onClose()}>
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
            <div className="font-semibold text-ink">{existing ? 'Modifier le candidat' : 'Ajouter un candidat'}</div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-paper-warm flex items-center justify-center text-muted"><X size={14} /></button>
          </div>
          <form onSubmit={submit} className="p-6 space-y-4 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-text mb-1.5 block">Prénom *</label>
                <input className="input-field" value={form.prenom} onChange={set('prenom')} autoFocus />
              </div>
              <div>
                <label className="label-text mb-1.5 block">Nom *</label>
                <input className="input-field" value={form.nom} onChange={set('nom')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-text mb-1.5 block">Email</label>
                <input type="email" className="input-field" value={form.email} onChange={set('email')} />
              </div>
              <div>
                <label className="label-text mb-1.5 block">Téléphone</label>
                <input className="input-field" value={form.telephone} onChange={set('telephone')} />
              </div>
            </div>
            <div>
              <label className="label-text mb-1.5 block">Études / Diplômes</label>
              <input className="input-field" placeholder="Master Architecture ENAU Rabat" value={form.etudes} onChange={set('etudes')} />
            </div>
            <div>
              <label className="label-text mb-1.5 block">Prétention salariale (DH)</label>
              <input type="number" className="input-field" value={form.pretentionSalariale} onChange={set('pretentionSalariale')} />
            </div>
            <div>
              <label className="label-text mb-1.5 block">Notes</label>
              <textarea className="input-field resize-none" rows={2} placeholder="Remarques, points d'attention..." value={form.notes} onChange={set('notes')} />
            </div>
            {/* File uploads */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-text mb-1.5 block">CV</label>
                <input ref={cvRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={e => handleFile('cv', e)} />
                {form.cv ? (
                  <div className="flex items-center gap-2 p-2.5 bg-paper-warm rounded-xl border border-border text-xs">
                    <FileText size={13} className="text-electric flex-shrink-0" />
                    <span className="flex-1 truncate font-medium text-ink">{form.cv.name}</span>
                    <button type="button" onClick={() => setForm(f => ({ ...f, cv: null }))} className="text-muted hover:text-rose-500"><X size={11} /></button>
                  </div>
                ) : (
                  <button type="button" onClick={() => cvRef.current?.click()}
                    className="flex items-center gap-2 w-full p-2.5 rounded-xl border border-dashed border-border text-xs text-muted hover:border-electric hover:text-electric transition-colors">
                    <Upload size={13} /> Joindre CV
                  </button>
                )}
              </div>
              <div>
                <label className="label-text mb-1.5 block">Portfolio</label>
                <input ref={portRef} type="file" accept=".pdf,.zip,.jpg,.png" className="hidden" onChange={e => handleFile('portfolio', e)} />
                {form.portfolio ? (
                  <div className="flex items-center gap-2 p-2.5 bg-paper-warm rounded-xl border border-border text-xs">
                    <FileText size={13} className="text-violet-600 flex-shrink-0" />
                    <span className="flex-1 truncate font-medium text-ink">{form.portfolio.name}</span>
                    <button type="button" onClick={() => setForm(f => ({ ...f, portfolio: null }))} className="text-muted hover:text-rose-500"><X size={11} /></button>
                  </div>
                ) : (
                  <button type="button" onClick={() => portRef.current?.click()}
                    className="flex items-center gap-2 w-full p-2.5 rounded-xl border border-dashed border-border text-xs text-muted hover:border-violet-400 hover:text-violet-600 transition-colors">
                    <Upload size={13} /> Joindre portfolio
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Annuler</button>
              <button type="submit" className="btn-primary flex-1 justify-center"><Plus size={13} /> {existing ? 'Enregistrer' : 'Ajouter'}</button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

// ── EmailPanel shared styles ──────────────────────────────────────────────────
const PANEL_THEME = {
  blue:    { bar: 'bg-blue-500',    light: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700',    btn: 'bg-blue-600 hover:bg-blue-700',    label: 'text-blue-500' },
  emerald: { bar: 'bg-emerald-500', light: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', btn: 'bg-emerald-600 hover:bg-emerald-700', label: 'text-emerald-500' },
  rose:    { bar: 'bg-rose-500',    light: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-700',    btn: 'bg-rose-500 hover:bg-rose-600',    label: 'text-rose-500' },
}

function PanelHeader({ theme, title, onBack }) {
  const t = PANEL_THEME[theme]
  return (
    <div className="flex-shrink-0">
      <div className={`h-1 w-full ${t.bar}`} />
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border">
        <button onClick={onBack} className="flex items-center gap-1 text-xs text-muted hover:text-ink transition-colors">
          <ArrowLeft size={12} /> Retour
        </button>
        <div className="flex-1 text-center text-sm font-semibold text-ink">{title}</div>
        <div className="w-12" />
      </div>
    </div>
  )
}

// ── EntretienEmailPanel ───────────────────────────────────────────────────────
function EntretienEmailPanel({ candidat, poste, employes, onBack, onSend }) {
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), heureDebut: '10:00', duree: '60', intervieweurId: '' })
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const heureFin = form.heureDebut ? addMinutesToTime(form.heureDebut, form.duree) : ''
  const interviewer = employes.find(e => String(e.id) === form.intervieweurId)
  const fullName = `${candidat.prenom} ${candidat.nom}`
  const t = PANEL_THEME.blue

  const autoBody = form.date
    ? `Bonjour ${fullName},\n\nNous avons examiné votre candidature pour le poste de « ${poste.intitule} » avec un vif intérêt et nous serions ravis de vous rencontrer.\n\nNous vous proposons un entretien :\n• Date : ${new Date(form.date).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}\n• Horaire : ${form.heureDebut} – ${heureFin}${interviewer ? `\n• Interlocuteur : ${interviewer.prenom} ${interviewer.nom}` : ''}\n\nMerci de confirmer votre disponibilité en répondant à cet e-mail.\n\nCordialement,\nL'équipe CLADE Architecture`
    : ''

  const [body, setBody] = useState(autoBody)
  const prevKey = useRef('')
  const formKey = `${form.date}|${form.heureDebut}|${form.duree}|${form.intervieweurId}`
  if (formKey !== prevKey.current) { prevKey.current = formKey; if (autoBody) setBody(autoBody) }

  const handleSend = () => {
    if (!candidat.email) { toast.error('Aucun email pour ce candidat'); return }
    window.open(`mailto:${candidat.email}?subject=${encodeURIComponent(`Invitation à un entretien — ${poste.intitule} — CLADE Architecture`)}&body=${encodeURIComponent(body)}`, '_blank')
    if (form.intervieweurId && form.date) {
      onSend({ intervieweurId: form.intervieweurId, entretienEvent: {
        id: `ev${Date.now()}`, titre: `Entretien — ${fullName}`,
        date: form.date, heureDebut: form.heureDebut, heureFin,
        couleur: '#3B82F6', type: 'entretien',
      }})
    }
    onBack()
    toast.success('Email ouvert dans votre client mail')
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <PanelHeader theme="blue" title="Proposer un entretien" onBack={onBack} />
      <div className="overflow-y-auto p-6 space-y-4 flex-1">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={`text-[10px] font-semibold uppercase tracking-widest mb-1.5 block ${t.label}`}>Date</label>
            <input type="date" className="input w-full" value={form.date} onChange={set('date')} />
          </div>
          <div>
            <label className={`text-[10px] font-semibold uppercase tracking-widest mb-1.5 block ${t.label}`}>Heure de début</label>
            <input type="time" className="input w-full" value={form.heureDebut} onChange={set('heureDebut')} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={`text-[10px] font-semibold uppercase tracking-widest mb-1.5 block ${t.label}`}>Durée</label>
            <SelectField
              value={form.duree}
              onChange={v => set('duree')({ target: { value: v } })}
              options={[30, 45, 60, 90, 120].map(d => ({ value: String(d), label: `${d} min` }))}
              className="w-full"
            />
          </div>
          <div>
            <label className={`text-[10px] font-semibold uppercase tracking-widest mb-1.5 block ${t.label}`}>Intervieweur</label>
            <SelectField
              value={form.intervieweurId}
              onChange={v => set('intervieweurId')({ target: { value: v } })}
              options={[
                { value: '', label: '— Choisir —' },
                ...employes.filter(e => e.statut === 'actif').map(e => ({ value: String(e.id), label: `${e.prenom} ${e.nom}` })),
              ]}
              className="w-full"
            />
          </div>
        </div>
        <div>
          <label className={`text-[10px] font-semibold uppercase tracking-widest mb-1.5 block ${t.label}`}>Corps de l'email</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={10}
            className={`input w-full resize-none text-xs leading-relaxed font-mono focus:border-blue-300 focus:ring-1 focus:ring-blue-100`} />
        </div>
      </div>
      <div className="px-6 pb-5 flex gap-3 border-t border-border pt-4 flex-shrink-0">
        <button onClick={onBack} className="btn-ghost text-sm flex-1 justify-center">Annuler</button>
        <button onClick={handleSend} disabled={!body}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-40 ${t.btn}`}>
          <Send size={13} /> Envoyer par email
        </button>
      </div>
    </div>
  )
}

// ── RefusEmailPanel ───────────────────────────────────────────────────────────
function RefusEmailPanel({ candidat, poste, onBack, onConfirm }) {
  const fullName = `${candidat.prenom} ${candidat.nom}`
  const t = PANEL_THEME.rose
  const [body, setBody] = useState(
    `Bonjour ${fullName},\n\nNous vous remercions de l'intérêt que vous portez à notre cabinet et pour le temps consacré à votre candidature pour le poste de « ${poste.intitule} ».\n\nAprès examen attentif de votre dossier, nous ne sommes pas en mesure de donner suite à votre demande pour ce poste. Cette décision ne remet pas en question vos compétences, et nous conservons votre profil pour de futures opportunités.\n\nNous vous souhaitons beaucoup de succès dans vos recherches.\n\nCordialement,\nL'équipe CLADE Architecture`
  )

  const handleSend = () => {
    if (!candidat.email) { onConfirm(); return }
    window.open(`mailto:${candidat.email}?subject=${encodeURIComponent(`Votre candidature — ${poste.intitule} — CLADE Architecture`)}&body=${encodeURIComponent(body)}`, '_blank')
    onConfirm()
    toast.success('Email ouvert — candidature refusée')
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <PanelHeader theme="rose" title="Refuser la candidature" onBack={onBack} />
      <div className="overflow-y-auto p-6 space-y-4 flex-1">
        <div className={`${t.light} ${t.border} border rounded-xl p-3 flex items-center gap-2`}>
          <XCircle size={14} className={t.text} />
          <span className={`text-xs font-medium ${t.text}`}>Un email de refus sera envoyé à {candidat.email || 'ce candidat'}</span>
        </div>
        <div>
          <label className={`text-[10px] font-semibold uppercase tracking-widest mb-1.5 block ${t.label}`}>Corps de l'email</label>
          <textarea rows={11} value={body} onChange={e => setBody(e.target.value)}
            className={`input w-full resize-none text-xs leading-relaxed font-mono focus:border-rose-200 focus:ring-1 focus:ring-rose-50`} />
        </div>
      </div>
      <div className="px-6 pb-5 flex gap-3 border-t border-border pt-4 flex-shrink-0">
        <button onClick={onBack} className="btn-ghost text-sm flex-1 justify-center">Annuler</button>
        <button onClick={handleSend}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors ${t.btn}`}>
          <Send size={13} /> Envoyer par email
        </button>
      </div>
    </div>
  )
}

// ── CandidatDetailModal ───────────────────────────────────────────────────────
function CandidatDetailModal({ candidat, poste, employes, onClose, onUpdate, onDelete }) {
  const [mode, setMode] = useState(null) // null | 'entretien' | 'refuse'
  const cfg = STATUT_CAND[candidat.statut] || STATUT_CAND.recu
  const Icon = cfg.icon

  const handleAccepte = () => {
    toast((t) => (
      <div className="flex items-center gap-3">
        <span className="text-sm">Accepter <strong>{candidat.prenom}</strong> et créer son profil employé ?</span>
        <button onClick={() => { onUpdate({ statut: 'accepte' }); toast.dismiss(t.id) }}
          className="text-xs bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-semibold">Confirmer</button>
        <button onClick={() => toast.dismiss(t.id)} className="text-xs text-muted">Annuler</button>
      </div>
    ), { duration: 8000 })
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm"
        onClick={e => e.target === e.currentTarget && onClose()}>
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
          {/* Header — always visible */}
          <div className="flex items-start gap-4 px-6 py-5 border-b border-border flex-shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-ink to-electric flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">{((candidat.prenom?.[0] || '') + (candidat.nom?.[0] || '')).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-ink">{candidat.prenom} {candidat.nom}</div>
              <div className="text-xs text-muted mt-0.5">{candidat.etudes || '—'}</div>
            </div>
            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border flex-shrink-0 ${cfg.bg} ${cfg.text} ${cfg.border}`}>
              <Icon size={11} /> {cfg.label}
            </span>
            <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-paper-warm flex items-center justify-center text-muted ml-1"><X size={14} /></button>
          </div>

          {mode === null && (
            <>
              <div className="overflow-y-auto p-6 space-y-4 flex-1">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Mail, label: 'Email', value: candidat.email },
                    { icon: PhoneCall, label: 'Téléphone', value: candidat.telephone },
                    { icon: GraduationCap, label: 'Études', value: candidat.etudes },
                    { icon: Banknote, label: 'Prétention salariale', value: candidat.pretentionSalariale ? `${Number(candidat.pretentionSalariale).toLocaleString('fr-FR')} DH` : null },
                  ].map(({ icon: ItemIcon, label, value }) => value ? (
                    <div key={label} className="bg-paper-warm rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-1"><ItemIcon size={11} className="text-muted" /><span className="label-text text-[10px]">{label}</span></div>
                      <div className="text-sm font-medium text-ink truncate">{value}</div>
                    </div>
                  ) : null)}
                </div>
                {candidat.notes && (
                  <div className="bg-paper-warm rounded-xl p-3">
                    <div className="label-text text-[10px] mb-1">Notes</div>
                    <p className="text-sm text-ink">{candidat.notes}</p>
                  </div>
                )}
                {(candidat.cv || candidat.portfolio) && (
                  <div className="flex gap-2 flex-wrap">
                    {candidat.cv && (
                      <a href={candidat.cv.dataUrl} download={candidat.cv.name}
                        className="flex items-center gap-2 px-3 py-2 bg-electric/10 text-electric border border-electric/20 rounded-xl text-xs font-semibold hover:bg-electric/20 transition-colors">
                        <FileText size={13} /> CV — {candidat.cv.name}
                      </a>
                    )}
                    {candidat.portfolio && (
                      <a href={candidat.portfolio.dataUrl} download={candidat.portfolio.name}
                        className="flex items-center gap-2 px-3 py-2 bg-violet-50 text-violet-700 border border-violet-200 rounded-xl text-xs font-semibold hover:bg-violet-100 transition-colors">
                        <FileText size={13} /> Portfolio — {candidat.portfolio.name}
                      </a>
                    )}
                  </div>
                )}
              </div>
              <div className="px-6 pb-5 flex items-center gap-2 flex-shrink-0 border-t border-border pt-4">
                <button onClick={onDelete} className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 px-3 py-2 rounded-xl hover:bg-rose-50 transition-colors">
                  <Trash2 size={13} /> Supprimer
                </button>
                <div className="flex-1" />
                {candidat.statut !== 'refuse' && (
                  <button onClick={() => setMode('refuse')} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-rose-200 text-rose-600 text-sm font-semibold hover:bg-rose-50 transition-colors">
                    <XCircle size={14} /> Refuser
                  </button>
                )}
                {candidat.statut !== 'accepte' && (
                  <button onClick={handleAccepte} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold hover:bg-emerald-100 transition-colors">
                    <CheckCircle size={14} /> Accepter
                  </button>
                )}
                <button onClick={() => setMode('entretien')} className="btn-primary text-sm">
                  <CalendarCheck size={14} /> Entretien
                </button>
              </div>
            </>
          )}

          {mode === 'entretien' && (
            <EntretienEmailPanel
              candidat={candidat} poste={poste} employes={employes}
              onBack={() => setMode(null)}
              onSend={(opts) => onUpdate({}, opts)}
            />
          )}

          {mode === 'refuse' && (
            <RefusEmailPanel
              candidat={candidat} poste={poste}
              onBack={() => setMode(null)}
              onConfirm={() => { onUpdate({ statut: 'refuse' }); onClose() }}
            />
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

// ── AcceptEmailPanel ──────────────────────────────────────────────────────────
function AcceptEmailPanel({ candidat, poste, onBack, onConfirm }) {
  const [salaire, setSalaire] = useState('')
  const fullName = `${candidat.prenom || ''} ${candidat.nom || ''}`.trim()
  const t = PANEL_THEME.emerald

  const buildBody = (sal) =>
    `Bonjour ${fullName},\n\nNous avons le plaisir de vous informer que votre candidature pour le poste de ${poste?.intitule || ''} au sein de CLADE Architecture a retenu toute notre attention et que nous souhaitons vous accueillir dans notre équipe.${sal ? `\n\nNous vous proposons une rémunération mensuelle de ${Number(sal).toLocaleString('fr-FR')} DH.` : ''}\n\nNous vous contacterons très prochainement pour les formalités d'intégration et vous transmettrons toutes les informations pratiques.\n\nNous sommes ravis de vous compter parmi nous.\n\nCordialement,\nL'équipe CLADE Architecture`

  const [body, setBody] = useState(() => buildBody(''))
  useEffect(() => { setBody(buildBody(salaire)) }, [salaire])

  const handleSend = () => {
    const subject = encodeURIComponent(`Votre candidature — ${poste?.intitule || ''} — CLADE Architecture`)
    window.open(`mailto:${candidat.email}?subject=${subject}&body=${encodeURIComponent(body)}`, '_blank')
    onConfirm()
    toast.success('Email ouvert — candidature acceptée')
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <PanelHeader theme="emerald" title="Email d'acceptation" onBack={onBack} />
      <div className="overflow-y-auto p-6 space-y-4 flex-1">
        <div className={`${t.light} ${t.border} border rounded-xl p-3 flex items-center gap-2`}>
          <CheckCircle size={14} className={t.text} />
          <span className={`text-xs font-medium ${t.text}`}>Un email d'acceptation sera envoyé à {candidat.email}</span>
        </div>
        <div>
          <label className={`text-[10px] font-semibold uppercase tracking-widest mb-1.5 block ${t.label}`}>Salaire proposé (DH / mois)</label>
          <input type="number" value={salaire} onChange={e => setSalaire(e.target.value)}
            placeholder="Ex : 8 000"
            className={`input w-full focus:border-emerald-300 focus:ring-1 focus:ring-emerald-50`} />
          {salaire && (
            <p className={`text-[10px] mt-1 ${t.text}`}>✓ Le salaire sera automatiquement intégré dans l'email</p>
          )}
        </div>
        <div>
          <label className={`text-[10px] font-semibold uppercase tracking-widest mb-1.5 block ${t.label}`}>Corps de l'email</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={10}
            className={`input w-full resize-none text-xs leading-relaxed font-mono focus:border-emerald-200 focus:ring-1 focus:ring-emerald-50`} />
        </div>
      </div>
      <div className="px-6 pb-5 flex gap-3 border-t border-border pt-4 flex-shrink-0">
        <button onClick={onBack} className="btn-ghost text-sm flex-1 justify-center">Annuler</button>
        <button onClick={handleSend}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors ${t.btn}`}>
          <Send size={13} /> Envoyer par email
        </button>
      </div>
    </div>
  )
}

// ── PortfolioApplicantModal ───────────────────────────────────────────────────
const PORTFOLIO_TO_DISPLAY = { nouveau: 'recu', entretien_planifie: 'recu', classe: 'refuse', recu: 'recu', accepte: 'accepte', refuse: 'refuse', confirme: 'confirme' }
const DISPLAY_TO_PORTFOLIO = { recu: 'recu', accepte: 'accepte', refuse: 'refuse', confirme: 'confirme' }

function PortfolioApplicantModal({ candidature, poste, employes, onClose, onUpdate, onDelete }) {
  const [mode, setMode] = useState(null) // null | 'entretien' | 'classe'
  const displayStatut = PORTFOLIO_TO_DISPLAY[candidature.statut] || 'recu'
  const cfg = STATUT_CAND[displayStatut] || STATUT_CAND.recu
  const Icon = cfg.icon

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm"
        onClick={e => e.target === e.currentTarget && onClose()}>
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-4 px-6 py-5 border-b border-border flex-shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-ink/80 to-electric flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">{(candidature.prenom?.[0] || '?') + (candidature.nom?.[0] || '?')}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-ink">{candidature.prenom} {candidature.nom}</div>
              {candidature.departement && <div className="text-xs text-muted mt-0.5">{candidature.departement}</div>}
            </div>
            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border flex-shrink-0 ${cfg.bg} ${cfg.text} ${cfg.border}`}>
              <Icon size={11} /> {cfg.label}
            </span>
            <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-paper-warm flex items-center justify-center text-muted"><X size={14} /></button>
          </div>

          {mode === null && (
            <>
              <div className="overflow-y-auto p-6 space-y-5 flex-1">
                {/* Contact */}
                <div className="flex flex-wrap gap-5">
                  {candidature.email && (
                    <div className="flex items-center gap-2 text-xs text-ink">
                      <Mail size={13} className="text-muted flex-shrink-0" />
                      <span>{candidature.email}</span>
                    </div>
                  )}
                  {candidature.telephone && (
                    <div className="flex items-center gap-2 text-xs text-ink">
                      <PhoneCall size={13} className="text-muted flex-shrink-0" />
                      <span>{candidature.telephone}</span>
                    </div>
                  )}
                </div>

                {/* CV + Portfolio centered */}
                {(candidature.cvUrl || candidature.portfolioUrl) && (
                  <div className="flex justify-center gap-3 flex-wrap">
                    {candidature.cvUrl && (
                      <a href={candidature.cvUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-paper-warm text-ink border border-border rounded-xl text-xs font-semibold hover:bg-paper transition-colors">
                        <FileText size={13} /> Voir le CV
                      </a>
                    )}
                    {candidature.portfolioUrl && (
                      <a href={candidature.portfolioUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-paper-warm text-ink border border-border rounded-xl text-xs font-semibold hover:bg-paper transition-colors">
                        <Globe size={13} /> Voir le portfolio
                      </a>
                    )}
                  </div>
                )}

                {/* Message */}
                {candidature.message && (
                  <div className="bg-paper-warm rounded-xl p-4">
                    <div className="label-text text-[10px] mb-1.5">Lettre de motivation</div>
                    <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">{candidature.message}</p>
                  </div>
                )}

                {candidature.dateReception && (
                  <div className="text-[10px] text-muted">Reçue le {new Date(candidature.dateReception).toLocaleDateString('fr-FR')}</div>
                )}
              </div>

              <div className="px-6 pb-5 flex-shrink-0 border-t border-border pt-4 space-y-3">
                <div className="flex gap-3">
                  <button onClick={() => setMode('classe')}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors">
                    <Check size={15} /> Classer
                  </button>
                  <button onClick={() => setMode('entretien')}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-ink hover:bg-ink/90 text-white text-sm font-medium transition-colors">
                    <CalendarCheck size={15} /> Proposer un entretien
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <button onClick={onDelete} className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 px-2 py-1.5 rounded-xl hover:bg-rose-50 transition-colors">
                    <Trash2 size={13} /> Supprimer
                  </button>
                  <button onClick={onClose} className="btn-ghost text-sm">Fermer</button>
                </div>
              </div>
            </>
          )}

          {mode === 'entretien' && (
            <EntretienEmailPanel
              candidat={candidature} poste={poste} employes={employes}
              onBack={() => setMode(null)}
              onSend={(opts) => onUpdate({}, opts)}
            />
          )}

          {mode === 'classe' && (
            <RefusEmailPanel
              candidat={candidature} poste={poste}
              onBack={() => setMode(null)}
              onConfirm={() => { onUpdate({ statut: 'refuse' }); onClose() }}
            />
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RecruitmentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { recrutements, employes, updateRecrutement, addCandidat, updateCandidat, deleteCandidat,
    candidaturesSpont, updateCandidatureSpont, deleteCandidatureSpont, addEmploye } = useData()

  const poste = recrutements.find(r => r.id === id)

  const [showEditPoste, setShowEditPoste] = useState(false)
  const [showAddCandidat, setShowAddCandidat] = useState(false)
  const [editingCandidat, setEditingCandidat] = useState(null)
  const [detailCandidat, setDetailCandidat] = useState(null)
  const [detailPortfolio, setDetailPortfolio] = useState(null)
  const [filterStatut, setFilterStatut] = useState('tous')
  const [openBadge, setOpenBadge] = useState(null)
  const [badgePanel, setBadgePanel] = useState(null) // { cand, type: 'accepte'|'refuse' }
  const [confirmModal, setConfirmModal] = useState(null) // cand to confirm

  const candidats = poste?.candidats || []

  const handleBadgeAccepter = (e, cand) => {
    e.stopPropagation(); setOpenBadge(null)
    setBadgePanel({ cand, type: 'accepte' })
  }

  const handleBadgeRefuser = (e, cand) => {
    e.stopPropagation(); setOpenBadge(null)
    setBadgePanel({ cand, type: 'refuse' })
  }

  const handleBadgeConfirmer = (e, cand) => {
    e.stopPropagation(); setOpenBadge(null)
    setConfirmModal(cand)
  }

  const doConfirmer = (cand) => {
    addEmploye({
      prenom: cand.prenom, nom: cand.nom, email: cand.email,
      telephone: cand.telephone || '', poste: poste.intitule,
      dept: cand.departement || poste.dept || '', statut: 'Actif',
      dateEntree: new Date().toISOString().split('T')[0],
    })
    if (cand._source === 'portfolio') updateCandidatureSpont(cand.id, { statut: 'confirme' })
    else updateCandidat(poste.id, cand.id, { statut: 'confirme' })
    setConfirmModal(null)
    toast.success(`${cand.prenom} ${cand.nom} a rejoint l'équipe !`)
    navigate('/app/team')
  }

  const portfolioCandidats = useMemo(() =>
    (candidaturesSpont || [])
      .filter(c => c.offreId === id)
      .map(c => ({ ...c, _source: 'portfolio', _statutDisplay: PORTFOLIO_TO_DISPLAY[c.statut] || 'recu' })),
    [candidaturesSpont, id]
  )

  const allCandidats = useMemo(() => [
    ...candidats.map(c => ({ ...c, _source: 'interne', _statutDisplay: c.statut })),
    ...portfolioCandidats,
  ], [candidats, portfolioCandidats])

  const stats = useMemo(() => ({
    total: allCandidats.length,
    recu: allCandidats.filter(c => c._statutDisplay === 'recu').length,
    accepte: allCandidats.filter(c => c._statutDisplay === 'accepte').length,
    refuse: allCandidats.filter(c => c._statutDisplay === 'refuse').length,
    confirme: allCandidats.filter(c => c._statutDisplay === 'confirme').length,
  }), [allCandidats])

  const displayed = filterStatut === 'tous' ? allCandidats : allCandidats.filter(c => c._statutDisplay === filterStatut)

  if (!poste) {
    return (
      <div className="p-10 text-center">
        <div className="font-display text-3xl text-ink mb-3">Poste introuvable</div>
        <button onClick={() => navigate('/app/hr')} className="btn-ghost"><ArrowLeft size={15} /> Retour RH</button>
      </div>
    )
  }

  const sp = STATUT_POSTE[poste.statut] || STATUT_POSTE.ouvert

  return (
    <div className="p-3 lg:p-10 space-y-3 lg:space-y-6">
      <button onClick={() => navigate('/app/hr')} className="flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors">
        <ArrowLeft size={13} /> Retour à l'équipe
      </button>

      {/* Post header — compact on mobile */}
      <div className="card p-4 lg:p-7">
        <div className="flex items-start gap-3 lg:gap-5">
          <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl bg-gradient-to-br from-electric/20 to-electric/5 border border-electric/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Briefcase size={18} className="text-electric" strokeWidth={1.8} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <h1 className="font-display text-xl lg:text-3xl text-ink leading-tight">{poste.intitule}</h1>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sp.bg} ${sp.text}`}>{sp.label}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {poste.dept && <span className="text-xs text-muted">{poste.dept}</span>}
              {(poste.salaireMin || poste.salaireMax) && (
                <>
                  <span className="text-muted text-xs">·</span>
                  <span className="text-xs font-semibold text-ink">{fmtSalary(poste.salaireMin)} — {fmtSalary(poste.salaireMax)}</span>
                </>
              )}
            </div>
          </div>
          <button onClick={() => setShowEditPoste(true)} className="flex items-center gap-1 text-xs text-muted hover:text-ink px-2 py-1.5 rounded-lg hover:bg-paper-warm transition-colors flex-shrink-0">
            <Pencil size={12} /> <span className="hidden sm:inline">Modifier</span>
          </button>
        </div>

        {(poste.description || poste.missions) && (
          <div className="mt-3 pt-3 border-t border-border grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-5">
            {poste.description && (
              <div>
                <div className="label-text text-[10px] mb-1">Description</div>
                <p className="text-xs text-ink whitespace-pre-line leading-relaxed">{poste.description}</p>
              </div>
            )}
            {poste.missions && (
              <div>
                <div className="label-text text-[10px] mb-1">Missions</div>
                <p className="text-xs text-ink whitespace-pre-line leading-relaxed">{poste.missions}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 lg:gap-3">
        {[
          { key: 'tous',     label: 'Reçus',     value: stats.total,    color: 'bg-paper-warm border-border' },
          { key: 'accepte',  label: 'Acceptés',  value: stats.accepte,  color: 'bg-emerald-50 border-emerald-100' },
          { key: 'confirme', label: 'Confirmés', value: stats.confirme, color: 'bg-violet-50 border-violet-100' },
          { key: 'refuse',   label: 'Refusés',   value: stats.refuse,   color: 'bg-rose-50 border-rose-100' },
        ].map(s => (
          <button key={s.key} onClick={() => setFilterStatut(s.key)}
            className={`card p-3 lg:p-4 text-left border transition-all ${s.color} ${filterStatut === s.key ? 'ring-2 ring-electric' : ''}`}>
            <div className="text-[10px] lg:text-[11px] text-muted mb-1 leading-tight">{s.label}</div>
            <div className="font-display text-2xl lg:text-3xl text-ink leading-none">{s.value}</div>
          </button>
        ))}
      </div>

      {/* Candidates */}
      <div className="card p-4 lg:p-7">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="label-text text-[10px] mb-0.5">Candidatures</div>
            <div className="font-display text-lg lg:text-xl text-ink leading-tight">
              {displayed.length} candidat{displayed.length !== 1 ? 's' : ''}
              {filterStatut !== 'tous' && <span className="text-xs font-normal text-muted ml-2">· {STATUT_CAND[filterStatut]?.label}</span>}
            </div>
          </div>
          <button onClick={() => setShowAddCandidat(true)} className="btn-primary text-xs lg:text-sm">
            <Plus size={13} /> Ajouter
          </button>
        </div>

        {displayed.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-xl">
            <User size={24} className="text-muted mx-auto mb-3" />
            <div className="text-sm font-semibold text-ink mb-1">Aucun candidat</div>
            <p className="text-xs text-muted">Cliquez sur Ajouter pour enregistrer la première candidature.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {[...displayed].reverse().map(cand => {
              const cs = STATUT_CAND[cand._statutDisplay] || STATUT_CAND.recu
              const CI = cs.icon
              const isPortfolio = cand._source === 'portfolio'
              return (
                <motion.div key={cand.id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  onClick={() => isPortfolio ? setDetailPortfolio(cand) : setDetailCandidat(cand)}
                  className="flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-paper-warm cursor-pointer transition-colors group">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isPortfolio ? 'bg-gradient-to-br from-violet-600 to-violet-400' : 'bg-gradient-to-br from-ink/80 to-electric'}`}>
                    <span className="text-white text-xs font-bold">{((cand.prenom?.[0] || '') + (cand.nom?.[0] || '')).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold text-ink">{cand.prenom} {cand.nom}</div>
                      {isPortfolio && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-600">Portfolio</span>}
                    </div>
                    <div className="text-xs text-muted truncate">{cand.etudes || cand.departement || cand.email || '—'}</div>
                  </div>
                  {cand.pretentionSalariale && (
                    <div className="text-xs font-semibold text-ink hidden sm:block">{fmtSalary(cand.pretentionSalariale)}</div>
                  )}
                  <div className="flex items-center gap-1.5">
                    {(cand.cv || cand.cvUrl) && <FileText size={12} className="text-electric" title="CV joint" />}
                    {(cand.portfolio || cand.portfolioUrl) && <Globe size={12} className="text-violet-500" title="Portfolio" />}
                  </div>
                  <div className="relative" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={e => { e.stopPropagation(); setOpenBadge(openBadge === cand.id ? null : cand.id) }}
                      className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${cs.bg} ${cs.text} ${cs.border} hover:brightness-95 transition-all`}>
                      <CI size={10} /> {cs.label} <ChevronDown size={9} />
                    </button>
                    {openBadge === cand.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setOpenBadge(null)} />
                        <div className="absolute right-0 top-full mt-1 bg-white border border-border rounded-xl shadow-xl z-20 overflow-hidden min-w-[140px]">
                          <button onClick={e => handleBadgeAccepter(e, cand)}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-emerald-50 text-emerald-700 transition-colors border-b border-border/40">
                            <CheckCircle size={12} /> Accepter
                          </button>
                          <button onClick={e => handleBadgeConfirmer(e, cand)}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-violet-50 text-violet-700 transition-colors border-b border-border/40">
                            <UserCheck size={12} /> Confirmer
                          </button>
                          <button onClick={e => handleBadgeRefuser(e, cand)}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-rose-50 text-rose-600 transition-colors">
                            <XCircle size={12} /> Refuser
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {showEditPoste && (
        <EditPosteModal
          poste={poste}
          onClose={() => setShowEditPoste(false)}
          onSave={data => { updateRecrutement(poste.id, data); toast.success('Poste mis à jour') }}
        />
      )}

      {showAddCandidat && (
        <AddCandidatModal
          onClose={() => setShowAddCandidat(false)}
          onAdd={data => { addCandidat(poste.id, data); toast.success('Candidat ajouté') }}
        />
      )}

      {editingCandidat && (
        <AddCandidatModal
          existing={editingCandidat}
          onClose={() => setEditingCandidat(null)}
          onAdd={data => { updateCandidat(poste.id, editingCandidat.id, data); toast.success('Candidat modifié'); setEditingCandidat(null) }}
        />
      )}

      {detailPortfolio && (
        <PortfolioApplicantModal
          candidature={(candidaturesSpont || []).find(c => c.id === detailPortfolio.id) || detailPortfolio}
          poste={poste}
          employes={employes}
          onClose={() => setDetailPortfolio(null)}
          onUpdate={updates => updateCandidatureSpont(detailPortfolio.id, updates)}
          onDelete={() => {
            toast((t) => (
              <div className="flex items-center gap-3">
                <span className="text-sm">Supprimer cette candidature ?</span>
                <button onClick={() => { deleteCandidatureSpont(detailPortfolio.id); toast.dismiss(t.id); setDetailPortfolio(null) }}
                  className="text-xs bg-rose-500 text-white px-3 py-1.5 rounded-lg font-semibold">Supprimer</button>
                <button onClick={() => toast.dismiss(t.id)} className="text-xs text-muted">Annuler</button>
              </div>
            ), { duration: 6000 })
          }}
        />
      )}

      {confirmModal && (
        <AnimatePresence>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              {/* Accent top */}
              <div className="h-1.5 w-full bg-gradient-to-r from-violet-500 to-violet-400" />
              {/* Body */}
              <div className="p-8 text-center">
                {/* Avatar */}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-400 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-violet-200">
                  <span className="text-white text-xl font-bold">
                    {((confirmModal.prenom?.[0] || '') + (confirmModal.nom?.[0] || '')).toUpperCase()}
                  </span>
                </div>
                <div className="text-lg font-bold text-ink mb-1">{confirmModal.prenom} {confirmModal.nom}</div>
                <div className="text-xs text-muted mb-1">{confirmModal.email}</div>
                {(confirmModal.departement || poste.dept) && (
                  <div className="text-xs font-semibold text-violet-600 mb-5">{confirmModal.departement || poste.dept}</div>
                )}
                <div className="bg-violet-50 border border-violet-100 rounded-xl px-4 py-3 mb-6">
                  <p className="text-sm text-violet-800 leading-relaxed">
                    Intégrer <strong>{confirmModal.prenom}</strong> à l'équipe en tant que{' '}
                    <strong>{poste.intitule}</strong> ?
                  </p>
                  <p className="text-[11px] text-violet-500 mt-1.5">Un profil employé sera automatiquement créé.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmModal(null)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted hover:bg-paper-warm transition-colors">
                    Annuler
                  </button>
                  <button onClick={() => doConfirmer(confirmModal)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                    <UserCheck size={14} /> Confirmer
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </AnimatePresence>
      )}

      {badgePanel && (
        <AnimatePresence>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && setBadgePanel(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
              {/* Candidate header */}
              <div className="flex items-center gap-3 px-6 py-4 border-b border-border flex-shrink-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ink/80 to-electric flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">
                    {((badgePanel.cand.prenom?.[0] || '') + (badgePanel.cand.nom?.[0] || '')).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink text-sm">{badgePanel.cand.prenom} {badgePanel.cand.nom}</div>
                  <div className="text-xs text-muted">{badgePanel.cand.email}</div>
                </div>
                <button onClick={() => setBadgePanel(null)} className="w-7 h-7 rounded-lg hover:bg-paper-warm flex items-center justify-center text-muted">
                  <X size={14} />
                </button>
              </div>
              {badgePanel.type === 'accepte' && (
                <AcceptEmailPanel
                  candidat={badgePanel.cand}
                  poste={poste}
                  onBack={() => setBadgePanel(null)}
                  onConfirm={() => {
                    const c = badgePanel.cand
                    if (c._source === 'portfolio') updateCandidatureSpont(c.id, { statut: 'accepte' })
                    else updateCandidat(poste.id, c.id, { statut: 'accepte' })
                    setBadgePanel(null)
                    toast.success(`${c.prenom} accepté(e)`)
                  }}
                />
              )}
              {badgePanel.type === 'refuse' && (
                <RefusEmailPanel
                  candidat={badgePanel.cand}
                  poste={poste}
                  onBack={() => setBadgePanel(null)}
                  onConfirm={() => {
                    const c = badgePanel.cand
                    if (c._source === 'portfolio') updateCandidatureSpont(c.id, { statut: 'refuse' })
                    else updateCandidat(poste.id, c.id, { statut: 'refuse' })
                    setBadgePanel(null)
                  }}
                />
              )}
            </motion.div>
          </div>
        </AnimatePresence>
      )}

      {detailCandidat && (
        <CandidatDetailModal
          key={detailCandidat.id}
          candidat={poste.candidats.find(c => c.id === detailCandidat.id) || detailCandidat}
          poste={poste}
          employes={employes}
          onClose={() => setDetailCandidat(null)}
          onUpdate={(updates, opts) => {
            updateCandidat(poste.id, detailCandidat.id, updates, opts)
            if (updates.statut === 'accepte') { toast.success('Candidat accepté — profil employé créé'); setDetailCandidat(null) }
            else if (updates.statut) toast.success('Statut mis à jour')
          }}
          onDelete={() => {
            toast((t) => (
              <div className="flex items-center gap-3">
                <span className="text-sm">Supprimer ce candidat ?</span>
                <button onClick={() => { deleteCandidat(poste.id, detailCandidat.id); toast.dismiss(t.id); setDetailCandidat(null) }}
                  className="text-xs bg-rose-500 text-white px-3 py-1.5 rounded-lg font-semibold">Supprimer</button>
                <button onClick={() => toast.dismiss(t.id)} className="text-xs text-muted">Annuler</button>
              </div>
            ), { duration: 6000 })
          }}
        />
      )}
    </div>
  )
}
