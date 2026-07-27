import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, UserPlus, CheckCircle } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const CONTRATS = ['CDI', 'CDD', 'Freelance', 'Stage']


const emptyForm = {
  prenom: '',
  nomFamille: '',
  poste: '',
  dept: '',
  email: '',
  telephone: '',
  cin: '',
  adresse: '',
  contrat: 'CDI',
  salaireNet: '',
  salaireBrut: '',
  dateEmbauche: '',
}

export default function NouveauEmployeModal({ onClose }) {
  const { addEmploye, employes } = useData()
  const { profile } = useAuth()
  const byName = profile?.nom || profile?.full_name || ''
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const allDepts = useMemo(() =>
    Array.from(new Set(employes.map(e => e.dept).filter(d => d && d !== '—'))).sort()
  , [employes])

  const toNameCase = (s) => s.replace(/\S+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
  const capFirst = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s
  const NAME_KEYS = ['prenom', 'nomFamille']
  const CAP_KEYS  = ['poste', 'dept', 'adresse']

  const set = (key) => (e) => {
    const raw = e?.target?.value ?? e
    const val = NAME_KEYS.includes(key) ? toNameCase(raw)
              : CAP_KEYS.includes(key)  ? capFirst(raw)
              : raw
    setForm(f => ({ ...f, [key]: val }))
    if (errors[key]) setErrors(er => ({ ...er, [key]: null }))
  }

  const validate = () => {
    const e = {}
    if (!form.prenom.trim()) e.prenom = 'Requis'
    if (!form.nomFamille.trim()) e.nomFamille = 'Requis'
    if (!form.email.trim()) e.email = 'Requis'
    return e
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    const nom = `${form.prenom.trim()} ${form.nomFamille.trim()}`
    const initials = (form.prenom[0] + form.nomFamille[0]).toUpperCase()

    addEmploye({
      nom,
      prenom: form.prenom.trim(),
      nomFamille: form.nomFamille.trim(),
      avatar: initials,
      poste: form.poste.trim() || '—',
      dept: form.dept.trim() || '—',
      email: form.email.trim(),
      telephone: form.telephone.trim(),
      cin: form.cin.trim(),
      adresse: form.adresse.trim(),
      dateEmbauche: form.dateEmbauche || null,
      contrat: form.contrat,
      salaireNet: form.salaireNet ? Number(form.salaireNet) : 0,
      salaireBrut: form.salaireBrut ? Number(form.salaireBrut) : 0,
      presence: 100,
      projets: 0,
    }, byName)
    toast.success(`Employé "${nom}" ajouté`)
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
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-border flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-ink/5 flex items-center justify-center">
                <UserPlus size={16} className="text-ink" />
              </div>
              <div>
                <div className="font-semibold text-ink text-sm">Nouvel employé</div>
                <div className="text-xs text-muted">Renseigner les informations du collaborateur</div>
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
          <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
            {/* Prénom + Nom */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-text mb-1.5 block">Prénom *</label>
                <input
                  className={`input-field ${errors.prenom ? 'border-rose-400' : ''}`}
                  placeholder="Yasmine"
                  value={form.prenom}
                  onChange={set('prenom')}
                />
                {errors.prenom && <p className="text-xs text-rose-500 mt-1">{errors.prenom}</p>}
              </div>
              <div>
                <label className="label-text mb-1.5 block">Nom de famille *</label>
                <input
                  className={`input-field ${errors.nomFamille ? 'border-rose-400' : ''}`}
                  placeholder="Benali"
                  value={form.nomFamille}
                  onChange={set('nomFamille')}
                />
                {errors.nomFamille && <p className="text-xs text-rose-500 mt-1">{errors.nomFamille}</p>}
              </div>
            </div>

            {/* Poste + Département */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-text mb-1.5 block">Poste</label>
                <input
                  className="input-field"
                  placeholder="Architecte Senior"
                  value={form.poste}
                  onChange={set('poste')}
                />
              </div>
              <div>
                <label className="label-text mb-1.5 block">Département</label>
                <input
                  list="dept-list"
                  className="input-field"
                  placeholder="Ex : Conception"
                  value={form.dept}
                  onChange={set('dept')}
                />
                <datalist id="dept-list">
                  {allDepts.map(d => <option key={d} value={d} />)}
                </datalist>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="label-text mb-1.5 block">Email *</label>
              <input
                type="email"
                className={`input-field ${errors.email ? 'border-rose-400' : ''}`}
                placeholder="collaborateur@clade.ma"
                value={form.email}
                onChange={set('email')}
              />
              {errors.email && <p className="text-xs text-rose-500 mt-1">{errors.email}</p>}
            </div>

            {/* Téléphone + CIN */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-text mb-1.5 block">Téléphone</label>
                <input
                  className="input-field"
                  placeholder="+212 6 61 23 45 67"
                  value={form.telephone}
                  onChange={set('telephone')}
                />
              </div>
              <div>
                <label className="label-text mb-1.5 block">CIN</label>
                <input
                  className="input-field"
                  placeholder="BK123456"
                  value={form.cin}
                  onChange={set('cin')}
                />
              </div>
            </div>

            {/* Date d'embauche */}
            <div>
              <label className="label-text mb-1.5 block">Date d'embauche</label>
              <input
                type="date"
                className="input-field"
                value={form.dateEmbauche}
                onChange={set('dateEmbauche')}
              />
            </div>

            {/* Contrat */}
            <div>
              <label className="label-text mb-1.5 block">Type de contrat</label>
              <select className="input-field" value={form.contrat} onChange={set('contrat')}>
                {CONTRATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Salaires */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-text mb-1.5 block">Salaire net (MAD)</label>
                <input
                  type="number"
                  min="0"
                  className="input-field"
                  placeholder="12000"
                  value={form.salaireNet}
                  onChange={set('salaireNet')}
                />
              </div>
              <div>
                <label className="label-text mb-1.5 block">Salaire brut (MAD)</label>
                <input
                  type="number"
                  min="0"
                  className="input-field"
                  placeholder="15600"
                  value={form.salaireBrut}
                  onChange={set('salaireBrut')}
                />
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border flex gap-3 flex-shrink-0">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              className="btn-primary flex-1 justify-center flex items-center gap-2"
            >
              <CheckCircle size={15} />
              Ajouter l'employé
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
