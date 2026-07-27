import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'

const CATS_ENTREE = ['Honoraires', 'Acompte', 'Remboursement', 'Subvention', 'Autre']
const CATS_SORTIE = ['Logiciels', 'Fournitures', 'Déplacements', 'Formation', 'Loyer', 'Salaires', 'Sous-traitance', 'Autre']

export default function NouvelleTransactionModal({ onClose, defaultType = 'entree' }) {
  const { addTransaction } = useData()
  const { profile } = useAuth()
  const byName = profile?.nom || profile?.full_name || ''
  const [form, setForm] = useState({
    type: defaultType,
    montant: '',
    libelle: '',
    categorie: defaultType === 'entree' ? 'Honoraires' : 'Fournitures',
    date: new Date().toISOString().slice(0, 10),
  })

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const switchType = (type) => setForm(f => ({
    ...f, type,
    categorie: type === 'entree' ? 'Honoraires' : 'Fournitures',
  }))

  const handleSubmit = (e) => {
    e.preventDefault()
    const montant = parseFloat(form.montant)
    if (!form.libelle.trim()) { toast.error('Libellé requis'); return }
    if (isNaN(montant) || montant <= 0) { toast.error('Montant invalide'); return }
    addTransaction({ ...form, montant }, byName)
    toast.success(form.type === 'entree' ? 'Entrée enregistrée' : 'Sortie enregistrée')
    onClose()
  }

  const isE = form.type === 'entree'

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
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isE ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                {isE ? <TrendingUp size={16} className="text-emerald-600" /> : <TrendingDown size={16} className="text-rose-600" />}
              </div>
              <div className="font-semibold text-ink text-sm">Nouvelle transaction</div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-paper-warm flex items-center justify-center text-muted">
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Type toggle */}
            <div className="relative bg-paper-warm rounded-2xl p-1 flex border border-border">
              <motion.div
                className="absolute inset-y-1 rounded-xl"
                style={{ background: isE ? '#D1FAE5' : '#FEE2E2' }}
                animate={{ left: isE ? '0.25rem' : '50%', right: isE ? '50%' : '0.25rem' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
              <button type="button" onClick={() => switchType('entree')}
                className={`relative z-10 flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 rounded-xl transition-colors ${isE ? 'text-emerald-700' : 'text-muted'}`}>
                <TrendingUp size={13} /> Entrée
              </button>
              <button type="button" onClick={() => switchType('sortie')}
                className={`relative z-10 flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 rounded-xl transition-colors ${!isE ? 'text-rose-700' : 'text-muted'}`}>
                <TrendingDown size={13} /> Sortie
              </button>
            </div>

            <div>
              <label className="label-text mb-1.5 block">Montant (MAD HT) *</label>
              <input type="number" min="0" step="0.01" className="input-field" placeholder="0.00"
                value={form.montant} onChange={set('montant')} autoFocus />
            </div>

            <div>
              <label className="label-text mb-1.5 block">Libellé *</label>
              <input type="text" className="input-field" placeholder="Description de la transaction…"
                value={form.libelle} onChange={set('libelle')} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-text mb-1.5 block">Catégorie</label>
                <select className="input-field" value={form.categorie} onChange={set('categorie')}>
                  {(isE ? CATS_ENTREE : CATS_SORTIE).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label-text mb-1.5 block">Date</label>
                <input type="date" className="input-field" value={form.date} onChange={set('date')} />
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Annuler</button>
              <button type="submit" className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                isE ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-rose-500 text-white hover:bg-rose-600'
              }`}>
                <CheckCircle size={15} /> Enregistrer
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
