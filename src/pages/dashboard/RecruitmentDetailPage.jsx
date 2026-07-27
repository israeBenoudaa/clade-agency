import { useState, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Plus, X, Pencil, Trash2, FileText, Mail,
  User, CheckCircle, Clock, XCircle, CalendarCheck, Upload,
  ChevronDown, Briefcase, PhoneCall, GraduationCap, Banknote,
} from 'lucide-react'
import { useData } from '../../context/DataContext'
import toast from 'react-hot-toast'

const STATUT_CAND = {
  recu:      { label: 'Reçu',      bg: 'bg-paper-warm',    text: 'text-muted',        border: 'border-border',        icon: Clock },
  entretien: { label: 'Entretien', bg: 'bg-blue-50',       text: 'text-blue-700',     border: 'border-blue-200',      icon: CalendarCheck },
  accepte:   { label: 'Accepté',   bg: 'bg-emerald-50',    text: 'text-emerald-700',  border: 'border-emerald-200',   icon: CheckCircle },
  rejete:    { label: 'Rejeté',    bg: 'bg-rose-50',       text: 'text-rose-700',     border: 'border-rose-200',      icon: XCircle },
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
                <select className="input-field" value={form.statut} onChange={set('statut')}>
                  <option value="ouvert">Ouvert</option>
                  <option value="ferme">Fermé</option>
                  <option value="pourvu">Pourvu</option>
                </select>
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

// ── EntretienModal ────────────────────────────────────────────────────────────
function EntretienModal({ candidat, employes, onClose, onSave }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    heureDebut: '10:00',
    duree: '60',
    intervieweurId: '',
  })
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const heureFin = form.heureDebut ? addMinutesToTime(form.heureDebut, form.duree) : ''

  const submit = e => {
    e.preventDefault()
    if (!form.date || !form.intervieweurId) { toast.error('Date et intervieweur requis'); return }
    const intervieweur = employes.find(emp => String(emp.id) === form.intervieweurId)
    onSave({
      date: form.date,
      heureDebut: form.heureDebut,
      heureFin,
      duree: Number(form.duree),
      intervieweurId: form.intervieweurId,
      intervieweurNom: intervieweur?.nom || '',
      intervieweurEmail: intervieweur?.email || '',
    })
    onClose()
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm"
        onClick={e => e.target === e.currentTarget && onClose()}>
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div>
              <div className="font-semibold text-ink text-sm">Programmer un entretien</div>
              <div className="text-xs text-muted mt-0.5">{candidat.prenom} {candidat.nom}</div>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-paper-warm flex items-center justify-center text-muted"><X size={14} /></button>
          </div>
          <form onSubmit={submit} className="p-6 space-y-4">
            <div>
              <label className="label-text mb-1.5 block">Intervieweur</label>
              <select className="input-field" value={form.intervieweurId} onChange={set('intervieweurId')}>
                <option value="">Sélectionner un membre de l'équipe</option>
                {employes.filter(e => e.statut === 'actif').map(e => (
                  <option key={e.id} value={String(e.id)}>{e.nom} — {e.poste}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-text mb-1.5 block">Date</label>
              <input type="date" className="input-field" value={form.date} onChange={set('date')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-text mb-1.5 block">Heure de début</label>
                <input type="time" className="input-field" value={form.heureDebut} onChange={set('heureDebut')} />
              </div>
              <div>
                <label className="label-text mb-1.5 block">Durée (minutes)</label>
                <select className="input-field" value={form.duree} onChange={set('duree')}>
                  {[30, 45, 60, 90, 120].map(d => <option key={d} value={d}>{d} min</option>)}
                </select>
              </div>
            </div>
            {form.heureDebut && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                Entretien de <strong>{form.heureDebut}</strong> à <strong>{heureFin}</strong>
                {form.intervieweurId && (
                  <> — planifié dans le calendrier de <strong>{employes.find(e => String(e.id) === form.intervieweurId)?.nom}</strong></>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Annuler</button>
              <button type="submit" className="btn-primary flex-1 justify-center"><CalendarCheck size={13} /> Planifier</button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

// ── CandidatDetailModal ───────────────────────────────────────────────────────
function CandidatDetailModal({ candidat, poste, employes, onClose, onUpdate, onDelete }) {
  const [showEntretienModal, setShowEntretienModal] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)

  const cfg = STATUT_CAND[candidat.statut] || STATUT_CAND.recu
  const Icon = cfg.icon

  const handleStatusChange = (newStatut) => {
    setStatusOpen(false)
    if (newStatut === candidat.statut) return
    if (newStatut === 'entretien') { setShowEntretienModal(true); return }
    if (newStatut === 'accepte') {
      toast((t) => (
        <div className="flex items-center gap-3">
          <span className="text-sm">Accepter <strong>{candidat.prenom}</strong> et créer son profil employé ?</span>
          <button onClick={() => { onUpdate({ statut: 'accepte' }); toast.dismiss(t.id) }}
            className="text-xs bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-semibold">Confirmer</button>
          <button onClick={() => toast.dismiss(t.id)} className="text-xs text-muted">Annuler</button>
        </div>
      ), { duration: 8000 })
      return
    }
    onUpdate({ statut: newStatut })
  }

  const handleEntretienSave = (entretienData) => {
    onUpdate(
      { statut: 'entretien', entretien: entretienData },
      { intervieweurId: entretienData.intervieweurId, entretienEvent: {
        id: `ev${Date.now()}`, titre: `Entretien — ${candidat.prenom} ${candidat.nom}`,
        date: entretienData.date, heureDebut: entretienData.heureDebut, heureFin: entretienData.heureFin,
        couleur: '#3B82F6', type: 'entretien',
      }}
    )
    toast.success('Entretien planifié')
  }

  const notifyEmailHref = candidat.entretien?.intervieweurEmail
    ? `mailto:${candidat.entretien.intervieweurEmail}?subject=Entretien RH — ${candidat.prenom} ${candidat.nom} — ${candidat.entretien.date}&body=Bonjour,%0D%0A%0D%0AVous êtes chargé(e) de l'entretien pour le poste "${poste.intitule}" avec ${candidat.prenom} ${candidat.nom}.%0D%0A%0D%0ADate : ${candidat.entretien.date}%0D%0AHeure : ${candidat.entretien.heureDebut} — ${candidat.entretien.heureFin}%0D%0A%0D%0ACordialement`
    : null

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && onClose()}>
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-start gap-4 px-6 py-5 border-b border-border flex-shrink-0">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-ink to-electric flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">{(candidat.prenom[0] + candidat.nom[0]).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-ink">{candidat.prenom} {candidat.nom}</div>
                <div className="text-xs text-muted mt-0.5">{candidat.etudes || '—'}</div>
              </div>
              {/* Status selector */}
              <div className="relative flex-shrink-0">
                <button onClick={() => setStatusOpen(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                  <Icon size={11} /> {cfg.label} <ChevronDown size={11} />
                </button>
                {statusOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setStatusOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 bg-white border border-border rounded-xl shadow-xl z-20 overflow-hidden min-w-[140px]">
                      {Object.entries(STATUT_CAND).map(([key, s]) => {
                        const SI = s.icon
                        return (
                          <button key={key} onClick={() => handleStatusChange(key)}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-paper-warm transition-colors ${candidat.statut === key ? 'font-semibold' : ''}`}>
                            <SI size={12} className={s.text} /> {s.label}
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
              <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-paper-warm flex items-center justify-center text-muted ml-1"><X size={14} /></button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Mail, label: 'Email', value: candidat.email },
                  { icon: PhoneCall, label: 'Téléphone', value: candidat.telephone },
                  { icon: GraduationCap, label: 'Études', value: candidat.etudes },
                  { icon: Banknote, label: 'Prétention salariale', value: candidat.pretentionSalariale ? `${Number(candidat.pretentionSalariale).toLocaleString('fr-FR')} DH` : null },
                ].map(({ icon: ItemIcon, label, value }) => value ? (
                  <div key={label} className="bg-paper-warm rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <ItemIcon size={11} className="text-muted" />
                      <span className="label-text text-[10px]">{label}</span>
                    </div>
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

              {/* CV / Portfolio */}
              {(candidat.cv || candidat.portfolio) && (
                <div className="flex gap-2">
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

              {/* Entretien info */}
              {candidat.statut === 'entretien' && candidat.entretien && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <div className="label-text text-[10px] text-blue-600 mb-2">Entretien planifié</div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-blue-800">
                    <div><span className="text-blue-500">Date</span><div className="font-semibold mt-0.5">{candidat.entretien.date}</div></div>
                    <div><span className="text-blue-500">Horaire</span><div className="font-semibold mt-0.5">{candidat.entretien.heureDebut} → {candidat.entretien.heureFin}</div></div>
                    <div className="col-span-2"><span className="text-blue-500">Intervieweur</span><div className="font-semibold mt-0.5">{candidat.entretien.intervieweurNom}</div></div>
                  </div>
                  {notifyEmailHref && (
                    <a href={notifyEmailHref}
                      className="mt-3 flex items-center gap-2 text-xs font-semibold text-blue-700 hover:text-blue-900 transition-colors">
                      <Mail size={12} /> Notifier l'intervieweur par email
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-5 flex gap-2 flex-shrink-0 border-t border-border pt-4">
              <button onClick={onDelete}
                className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 px-3 py-2 rounded-xl hover:bg-rose-50 transition-colors">
                <Trash2 size={13} /> Supprimer
              </button>
              <div className="flex-1" />
              <button onClick={onClose} className="btn-ghost text-sm">Fermer</button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {showEntretienModal && (
        <EntretienModal
          candidat={candidat}
          employes={employes}
          onClose={() => setShowEntretienModal(false)}
          onSave={handleEntretienSave}
        />
      )}
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RecruitmentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { recrutements, employes, updateRecrutement, addCandidat, updateCandidat, deleteCandidat } = useData()

  const poste = recrutements.find(r => r.id === id)

  const [showEditPoste, setShowEditPoste] = useState(false)
  const [showAddCandidat, setShowAddCandidat] = useState(false)
  const [editingCandidat, setEditingCandidat] = useState(null)
  const [detailCandidat, setDetailCandidat] = useState(null)
  const [filterStatut, setFilterStatut] = useState('tous')

  const candidats = poste?.candidats || []

  const stats = useMemo(() => ({
    total: candidats.length,
    recu: candidats.filter(c => c.statut === 'recu').length,
    entretien: candidats.filter(c => c.statut === 'entretien').length,
    accepte: candidats.filter(c => c.statut === 'accepte').length,
    rejete: candidats.filter(c => c.statut === 'rejete').length,
  }), [candidats])

  const displayed = filterStatut === 'tous' ? candidats : candidats.filter(c => c.statut === filterStatut)

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
    <div className="p-4 lg:p-10 space-y-6">
      <button onClick={() => navigate('/app/hr')} className="flex items-center gap-2 text-sm text-muted hover:text-ink transition-colors">
        <ArrowLeft size={15} /> Retour à l'équipe
      </button>

      {/* Post header */}
      <div className="card p-5 lg:p-7">
        <div className="flex flex-col lg:flex-row lg:items-start gap-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-electric/20 to-electric/5 border border-electric/20 flex items-center justify-center flex-shrink-0">
            <Briefcase size={24} className="text-electric" strokeWidth={1.8} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="font-display text-2xl lg:text-3xl text-ink">{poste.intitule}</h1>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${sp.bg} ${sp.text}`}>{sp.label}</span>
            </div>
            {poste.dept && <div className="text-sm text-muted">{poste.dept}</div>}
            {(poste.salaireMin || poste.salaireMax) && (
              <div className="text-sm font-semibold text-ink mt-1">
                {fmtSalary(poste.salaireMin)} — {fmtSalary(poste.salaireMax)}
              </div>
            )}
          </div>
          <button onClick={() => setShowEditPoste(true)} className="btn-ghost text-sm flex-shrink-0">
            <Pencil size={13} /> Modifier
          </button>
        </div>

        {(poste.description || poste.missions) && (
          <div className="mt-5 pt-5 border-t border-border grid grid-cols-1 lg:grid-cols-2 gap-5">
            {poste.description && (
              <div>
                <div className="label-text text-[10px] mb-1.5">Description</div>
                <p className="text-sm text-ink whitespace-pre-line">{poste.description}</p>
              </div>
            )}
            {poste.missions && (
              <div>
                <div className="label-text text-[10px] mb-1.5">Missions</div>
                <p className="text-sm text-ink whitespace-pre-line">{poste.missions}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { key: 'tous', label: 'Total', value: stats.total, color: 'bg-paper-warm border-border' },
          { key: 'recu', label: 'Reçus', value: stats.recu, color: 'bg-paper-warm border-border' },
          { key: 'entretien', label: 'Entretiens', value: stats.entretien, color: 'bg-blue-50 border-blue-100' },
          { key: 'accepte', label: 'Acceptés', value: stats.accepte, color: 'bg-emerald-50 border-emerald-100' },
          { key: 'rejete', label: 'Rejetés', value: stats.rejete, color: 'bg-rose-50 border-rose-100' },
        ].map(s => (
          <button key={s.key} onClick={() => setFilterStatut(s.key)}
            className={`card p-4 text-left border transition-all ${s.color} ${filterStatut === s.key ? 'ring-2 ring-electric' : ''}`}>
            <div className="text-xs text-muted mb-1">{s.label}</div>
            <div className="font-display text-3xl text-ink leading-none">{s.value}</div>
          </button>
        ))}
      </div>

      {/* Candidates */}
      <div className="card p-5 lg:p-7">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="label-text mb-0.5">Candidatures</div>
            <div className="font-display text-xl text-ink">
              {displayed.length} candidat{displayed.length !== 1 ? 's' : ''}
              {filterStatut !== 'tous' && <span className="text-sm font-normal text-muted ml-2">· filtre : {STATUT_CAND[filterStatut]?.label}</span>}
            </div>
          </div>
          <button onClick={() => setShowAddCandidat(true)} className="btn-primary text-sm">
            <Plus size={14} /> Ajouter
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
              const cs = STATUT_CAND[cand.statut] || STATUT_CAND.recu
              const CI = cs.icon
              return (
                <motion.div key={cand.id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  onClick={() => setDetailCandidat(cand)}
                  className="flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-paper-warm cursor-pointer transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ink/80 to-electric flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">{(cand.prenom[0] + cand.nom[0]).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-ink">{cand.prenom} {cand.nom}</div>
                    <div className="text-xs text-muted truncate">{cand.etudes || cand.email || '—'}</div>
                  </div>
                  {cand.pretentionSalariale && (
                    <div className="text-xs font-semibold text-ink hidden sm:block">{fmtSalary(cand.pretentionSalariale)}</div>
                  )}
                  <div className="flex items-center gap-1.5">
                    {cand.cv && <FileText size={12} className="text-electric" title="CV joint" />}
                    {cand.portfolio && <FileText size={12} className="text-violet-500" title="Portfolio joint" />}
                  </div>
                  <span className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${cs.bg} ${cs.text} ${cs.border}`}>
                    <CI size={10} /> {cs.label}
                  </span>
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
