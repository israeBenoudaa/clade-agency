import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, User, Mail, Phone, Building2, CheckCircle } from 'lucide-react'
import { useData } from '../context/DataContext'
import toast from 'react-hot-toast'
import SelectField from './SelectField'

const SECTEURS = [
  'Particulier',
  'Tertiaire',
  'Immobilier',
  'Hospitalité',
  'Public',
  'Industrie',
  'Autre',
]

const EMPTY = { prenom: '', nom: '', email: '', tel: '', secteur: 'Particulier' }

export default function NouveauClientModal({ onClose, onCreated, zIndex = 60 }) {
  const { addProspect } = useData()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})

  const set = (key) => (e) => {
    setForm(f => ({ ...f, [key]: e.target.value }))
    if (errors[key]) setErrors(err => ({ ...err, [key]: null }))
  }

  const validate = () => {
    const e = {}
    if (!form.prenom.trim()) e.prenom = 'Requis'
    if (!form.nom.trim()) e.nom = 'Requis'
    if (!form.email.trim()) e.email = 'Requis'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email invalide'
    return e
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    const nomComplet = `${form.prenom.trim()} ${form.nom.trim()}`
    const prospect = addProspect({
      prenom: form.prenom.trim(),
      nom: form.nom.trim(),
      email: form.email.trim(),
      telephone: form.tel.trim(),
      typeProjet: form.secteur,
      localisation: '',
      budget: 0,
      surface: 0,
      notes: '',
      statut: 'contrat_signe',
    })
    toast.success(`Client "${nomComplet}" ajouté au CRM`)
    onCreated?.(prospect)
    onClose()
  }

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm"
        style={{ zIndex }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-electric/10 flex items-center justify-center">
                <User size={16} className="text-electric" />
              </div>
              <div>
                <div className="font-semibold text-ink text-sm">Nouveau client</div>
                <div className="text-xs text-muted">Ajout au portefeuille CRM</div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-paper-warm flex items-center justify-center text-muted hover:text-ink transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {/* Prénom + Nom */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-text mb-1.5 block">Prénom *</label>
                <input
                  className={`input-field ${errors.prenom ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-200' : ''}`}
                  placeholder="Mohammed"
                  value={form.prenom}
                  onChange={set('prenom')}
                />
                {errors.prenom && <p className="text-xs text-rose-500 mt-1">{errors.prenom}</p>}
              </div>
              <div>
                <label className="label-text mb-1.5 block">Nom *</label>
                <input
                  className={`input-field ${errors.nom ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-200' : ''}`}
                  placeholder="Alami"
                  value={form.nom}
                  onChange={set('nom')}
                />
                {errors.nom && <p className="text-xs text-rose-500 mt-1">{errors.nom}</p>}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="label-text mb-1.5 block">
                <Mail size={11} className="inline mr-1" />
                Email *
              </label>
              <input
                type="email"
                className={`input-field ${errors.email ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-200' : ''}`}
                placeholder="contact@email.com"
                value={form.email}
                onChange={set('email')}
              />
              {errors.email && <p className="text-xs text-rose-500 mt-1">{errors.email}</p>}
            </div>

            {/* Téléphone + Secteur */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-text mb-1.5 block">
                  <Phone size={11} className="inline mr-1" />
                  Téléphone
                </label>
                <input
                  type="tel"
                  className="input-field"
                  placeholder="+212 6XX XXX XXX"
                  value={form.tel}
                  onChange={set('tel')}
                />
              </div>
              <div>
                <label className="label-text mb-1.5 block">
                  <Building2 size={11} className="inline mr-1" />
                  Secteur
                </label>
                <SelectField
                  value={form.secteur}
                  onChange={v => setForm(f => ({ ...f, secteur: v }))}
                  options={SECTEURS}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">
                Annuler
              </button>
              <button type="submit" className="btn-primary flex-1 justify-center">
                <CheckCircle size={15} />
                Créer le client
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
