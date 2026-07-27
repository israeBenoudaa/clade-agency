import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Building2, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useData } from '../context/DataContext'

export const VILLES_MAROC = [
  'Agadir', 'Al Hoceïma', 'Asilah', 'Béni Mellal', 'Berkane', 'Berrechid',
  'Casablanca', 'Chefchaouen', 'Dakhla', 'El Jadida', 'El Kelâa des Sraghna',
  'Errachidia', 'Essaouira', 'Fès', 'Fnideq', 'Guelmim', 'Ifrane',
  'Kénitra', 'Khémisset', 'Khénifra', 'Khouribga', 'Ksar el-Kébir',
  'Laâyoune', 'Larache', 'Marrakech', 'Meknès', 'Mohammedia',
  'Nador', 'Ouarzazate', 'Oujda', 'Rabat', 'Safi', 'Salé', 'Settat',
  'Tanger', 'Taroudant', 'Taza', 'Tétouan', 'Tiznit', 'Zagora',
]

export default function NouveauCollaborateurModal({ onClose, existing = null }) {
  const { categoriesCollab, addCollaborateur, updateCollaborateur } = useData()

  const [form, setForm] = useState({
    nomSociete:  existing?.nomSociete  ?? '',
    categorieId: existing?.categorieId ?? (categoriesCollab[0]?.id ?? ''),
    email:       existing?.email       ?? '',
    telephone:   existing?.telephone   ?? '',
    ville:       existing?.ville       ?? '',
    adresse:     existing?.adresse     ?? '',
    prestations: existing?.prestations ?? '',
    notes:       existing?.notes       ?? '',
  })
  const [errors, setErrors] = useState({})

  const set = (k) => (e) => {
    setForm(f => ({ ...f, [k]: e.target.value }))
    if (errors[k]) setErrors(e => ({ ...e, [k]: null }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.nomSociete.trim()) errs.nomSociete = 'Requis'
    if (!form.categorieId) errs.categorieId = 'Requis'
    if (Object.keys(errs).length) { setErrors(errs); return }

    if (existing) {
      updateCollaborateur(existing.id, form)
      toast.success('Collaborateur mis à jour')
    } else {
      addCollaborateur(form)
      toast.success('Collaborateur ajouté')
    }
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
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col"
        >
          <div className="px-6 py-5 border-b border-border flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-electric/10">
                <Building2 size={16} className="text-electric" />
              </div>
              <div className="font-semibold text-ink text-sm">
                {existing ? 'Modifier le collaborateur' : 'Nouveau collaborateur'}
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-paper-warm flex items-center justify-center text-muted">
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">

            {/* Nom société + Catégorie */}
            <div>
              <label className="label-text mb-1.5 block">Nom de la société *</label>
              <input type="text" className={`input-field ${errors.nomSociete ? 'border-rose-400' : ''}`}
                placeholder="Bureau d'études XYZ" value={form.nomSociete} onChange={set('nomSociete')} autoFocus />
              {errors.nomSociete && <p className="text-xs text-rose-500 mt-1">{errors.nomSociete}</p>}
            </div>

            <div>
              <label className="label-text mb-1.5 block">Catégorie *</label>
              <select className={`input-field ${errors.categorieId ? 'border-rose-400' : ''}`}
                value={form.categorieId} onChange={set('categorieId')}>
                <option value="">Choisir une catégorie…</option>
                {categoriesCollab.map(c => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
              {errors.categorieId && <p className="text-xs text-rose-500 mt-1">{errors.categorieId}</p>}
            </div>

            {/* Contact */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-text mb-1.5 block">Email</label>
                <input type="email" className="input-field" placeholder="contact@société.ma"
                  value={form.email} onChange={set('email')} />
              </div>
              <div>
                <label className="label-text mb-1.5 block">Téléphone</label>
                <input type="tel" className="input-field" placeholder="+212 5XX XXX XXX"
                  value={form.telephone} onChange={set('telephone')} />
              </div>
            </div>

            {/* Localisation */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-text mb-1.5 block">Ville</label>
                <select className="input-field" value={form.ville} onChange={set('ville')}>
                  <option value="">Sélectionner…</option>
                  {VILLES_MAROC.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="label-text mb-1.5 block">Adresse</label>
                <input type="text" className="input-field" placeholder="Rue, quartier…"
                  value={form.adresse} onChange={set('adresse')} />
              </div>
            </div>

            {/* Prestations */}
            <div>
              <label className="label-text mb-1.5 block">Prestations</label>
              <textarea className="input-field resize-none" rows={3}
                placeholder="Description des services proposés, spécialités, domaines d'intervention…"
                value={form.prestations} onChange={set('prestations')} />
            </div>

            {/* Notes */}
            <div>
              <label className="label-text mb-1.5 block">Notes internes</label>
              <textarea className="input-field resize-none" rows={2}
                placeholder="Remarques, historique de collaboration…"
                value={form.notes} onChange={set('notes')} />
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">
                Annuler
              </button>
              <button type="submit"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-ink text-paper hover:opacity-90 transition-opacity">
                <CheckCircle size={15} />
                {existing ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
