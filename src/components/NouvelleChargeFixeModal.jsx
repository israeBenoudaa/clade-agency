import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Repeat, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useData } from '../context/DataContext'

const CATEGORIES = ['Loyer', 'Logiciels', 'Abonnements', 'Services', 'Assurances', 'Utilities', 'Autre']
const PERIODICITES = [
  { value: 'hebdomadaire', label: 'Hebdomadaire' },
  { value: 'mensuel', label: 'Mensuel' },
  { value: 'trimestriel', label: 'Trimestriel' },
  { value: 'annuel', label: 'Annuel' },
]

export default function NouvelleChargeFixeModal({ onClose, existing = null }) {
  const { addChargeFixe, updateChargeFixe } = useData()
  const [form, setForm] = useState({
    libelle: existing?.libelle ?? '',
    montant: existing?.montant ?? '',
    periodicite: existing?.periodicite ?? 'mensuel',
    categorie: existing?.categorie ?? 'Loyer',
    dateDebut: existing?.dateDebut ?? new Date().toISOString().slice(0, 10),
    notes: existing?.notes ?? '',
  })

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    const montant = parseFloat(form.montant)
    if (!form.libelle.trim()) { toast.error('Libellé requis'); return }
    if (isNaN(montant) || montant <= 0) { toast.error('Montant invalide'); return }
    if (!form.dateDebut) { toast.error('Date de début requise'); return }
    const data = { ...form, montant }
    if (existing) {
      updateChargeFixe(existing.id, data)
      toast.success('Charge fixe mise à jour')
    } else {
      addChargeFixe(data)
      toast.success('Charge fixe ajoutée')
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
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-violet-50">
                <Repeat size={16} className="text-violet-600" />
              </div>
              <div className="font-semibold text-ink text-sm">
                {existing ? 'Modifier la charge fixe' : 'Nouvelle charge fixe'}
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-paper-warm flex items-center justify-center text-muted">
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="label-text mb-1.5 block">Libellé *</label>
              <input type="text" className="input-field" placeholder="Ex: Loyer bureau, Abonnement Revit…"
                value={form.libelle} onChange={set('libelle')} autoFocus />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-text mb-1.5 block">Montant (MAD) *</label>
                <input type="number" min="0" step="0.01" className="input-field" placeholder="0.00"
                  value={form.montant} onChange={set('montant')} />
              </div>
              <div>
                <label className="label-text mb-1.5 block">Périodicité</label>
                <select className="input-field" value={form.periodicite} onChange={set('periodicite')}>
                  {PERIODICITES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-text mb-1.5 block">Catégorie</label>
                <select className="input-field" value={form.categorie} onChange={set('categorie')}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label-text mb-1.5 block">Date de début</label>
                <input type="date" className="input-field" value={form.dateDebut} onChange={set('dateDebut')} />
              </div>
            </div>

            <div>
              <label className="label-text mb-1.5 block">Notes</label>
              <textarea className="input-field resize-none" rows={2} placeholder="Informations complémentaires…"
                value={form.notes} onChange={set('notes')} />
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Annuler</button>
              <button type="submit"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-colors">
                <CheckCircle size={15} /> {existing ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
