import { useState } from 'react'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'

const EMPTY = { libelle: '', montant: '', date: new Date().toISOString().slice(0, 10) }

function fmtMAD(n) {
  return Number(n || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MAD'
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function PrimesSection({ employe, addTransaction, removeTransaction, updateEmploye }) {
  const primes = employe.primes || []
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const openAdd = () => {
    setEditingId(null)
    setForm(EMPTY)
    setShowForm(true)
  }

  const openEdit = (prime) => {
    setEditingId(prime.id)
    setForm({ libelle: prime.libelle, montant: String(prime.montant), date: prime.date })
    setShowForm(true)
  }

  const cancel = () => { setShowForm(false); setEditingId(null); setForm(EMPTY) }

  const handleSave = () => {
    const montant = parseFloat(form.montant)
    if (!form.libelle.trim()) { toast.error('Libellé requis'); return }
    if (!montant || montant <= 0) { toast.error('Montant invalide'); return }
    if (!form.date) { toast.error('Date requise'); return }

    if (editingId) {
      // Modifier : retirer l'ancienne transaction, ajouter la nouvelle avec le même ID
      removeTransaction(editingId)
      addTransaction({
        id:        editingId,
        type:      'sortie',
        libelle:   `Prime – ${employe.nom} : ${form.libelle.trim()}`,
        montant,
        categorie: 'Primes',
        date:      form.date,
      })
      updateEmploye(employe.id, {
        primes: primes.map(p => p.id === editingId
          ? { ...p, libelle: form.libelle.trim(), montant, date: form.date }
          : p
        ),
      })
      toast.success('Prime mise à jour')
    } else {
      // Ajouter
      const id = `prim_${Date.now()}`
      addTransaction({
        id,
        type:      'sortie',
        libelle:   `Prime – ${employe.nom} : ${form.libelle.trim()}`,
        montant,
        categorie: 'Primes',
        date:      form.date,
      })
      updateEmploye(employe.id, {
        primes: [...primes, { id, libelle: form.libelle.trim(), montant, date: form.date }],
      })
      toast.success('Prime ajoutée')
    }

    cancel()
  }

  const handleDelete = (prime) => {
    removeTransaction(prime.id)
    updateEmploye(employe.id, { primes: primes.filter(p => p.id !== prime.id) })
    toast.success('Prime supprimée')
  }

  const totalPrimes = primes.reduce((s, p) => s + (p.montant || 0), 0)

  return (
    <div className="card p-5 lg:p-7">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="label-text mb-1">Rémunération variable</div>
          <div className="font-display text-xl text-ink">Primes &amp; Bonus</div>
        </div>
        {!showForm && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-ink text-white text-sm font-semibold hover:bg-ink/90 transition-colors"
          >
            <Plus size={14} /> Ajouter
          </button>
        )}
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="bg-paper-warm rounded-2xl p-4 border border-border mb-4 space-y-3">
          <div className="text-sm font-semibold text-ink mb-1">
            {editingId ? 'Modifier la prime' : 'Nouvelle prime'}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="label-text mb-1.5 block">Libellé</label>
              <input
                type="text"
                placeholder="Ex : Prime Ramadan"
                className="input-field text-sm"
                value={form.libelle}
                onChange={set('libelle')}
              />
            </div>
            <div>
              <label className="label-text mb-1.5 block">Montant (MAD)</label>
              <input
                type="number"
                min="0"
                step="100"
                placeholder="0"
                className="input-field text-sm"
                value={form.montant}
                onChange={set('montant')}
              />
            </div>
            <div>
              <label className="label-text mb-1.5 block">Date de versement</label>
              <input
                type="date"
                className="input-field text-sm"
                value={form.date}
                onChange={set('date')}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-ink text-white text-sm font-semibold hover:bg-ink/90 transition-colors"
            >
              <Check size={13} /> {editingId ? 'Mettre à jour' : 'Ajouter'}
            </button>
            <button
              onClick={cancel}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm font-semibold text-muted hover:text-ink hover:bg-paper-warm transition-colors"
            >
              <X size={13} /> Annuler
            </button>
          </div>
        </div>
      )}

      {/* Primes list */}
      {primes.length === 0 && !showForm ? (
        <div className="text-center py-8 text-muted text-xs border border-dashed border-border rounded-xl">
          Aucune prime enregistrée — cliquez sur <span className="font-semibold text-ink">Ajouter</span> pour en saisir une
        </div>
      ) : primes.length > 0 ? (
        <div className="space-y-2">
          {[...primes].sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(prime => (
            <div
              key={prime.id}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                editingId === prime.id
                  ? 'border-electric bg-electric/5'
                  : 'border-border bg-paper-warm hover:border-electric/30'
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0 text-amber-600 font-bold text-sm">
                ★
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-ink truncate">{prime.libelle}</div>
                <div className="text-xs text-muted">{fmtDate(prime.date)}</div>
              </div>
              <div className="font-bold text-amber-700 text-sm flex-shrink-0">{fmtMAD(prime.montant)}</div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => openEdit(prime)}
                  className="w-7 h-7 rounded-lg hover:bg-electric/10 text-muted hover:text-electric flex items-center justify-center transition-colors"
                  title="Modifier"
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={() => handleDelete(prime)}
                  className="w-7 h-7 rounded-lg hover:bg-rose-50 text-muted hover:text-rose-600 flex items-center justify-center transition-colors"
                  title="Supprimer"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Total */}
      {primes.length > 0 && (
        <div className="mt-4 flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-100">
          <span className="text-sm text-amber-800">Total primes versées</span>
          <span className="font-bold text-amber-800">{fmtMAD(totalPrimes)}</span>
        </div>
      )}
    </div>
  )
}
