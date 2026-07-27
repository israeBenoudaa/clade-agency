import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, UserPlus, CheckCircle, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { useData } from '../context/DataContext'

const TYPE_PROJET_OPTIONS = [
  'Villa standard', 'Villa haut gamme', 'Logement collectif',
  'Bureaux / Tertiaire', 'Hôtel / Restaurant', 'Équipement public', 'Rénovation lourde',
]

const STATUT_OPTIONS = [
  { value: 'interet',       label: 'Intérêt' },
  { value: 'premier_appel', label: 'Premier appel' },
  { value: 'devis_envoye',  label: 'Devis envoyé' },
  { value: 'contrat_signe', label: 'Contrat signé' },
]

export default function NouveauProspectModal({ onClose, existing = null }) {
  const { prospects, addProspect, updateProspect } = useData()

  // Confirmed root prospects available as "existing clients"
  const confirmedRoots = prospects.filter(p => p.statut === 'contrat_signe' && !p.parentId)

  const [mode, setMode] = useState('nouveau')
  const [selectedParentId, setSelectedParentId] = useState('')

  const [form, setForm] = useState({
    prenom:      existing?.prenom      ?? '',
    nom:         existing?.nom         ?? '',
    telephone:   existing?.telephone   ?? '',
    email:       existing?.email       ?? '',
    typeProjet:  existing?.typeProjet  ?? 'Villa haut gamme',
    surface:     existing?.surface     ?? '',
    budget:      existing?.budget      ?? '',
    localisation:existing?.localisation ?? '',
    statut:      existing?.statut      ?? 'interet',
    notes:       existing?.notes       ?? '',
  })

  const toNameCase = (s) => s.replace(/\S+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
  const set = (k) => (e) => {
    const raw = e.target.value
    const val = (k === 'prenom' || k === 'nom') ? toNameCase(raw) : raw
    setForm(f => ({ ...f, [k]: val }))
  }
  const setStatut = (v) => setForm(f => ({ ...f, statut: v }))

  const isExistant = mode === 'existant' && !existing
  const selectedParent = confirmedRoots.find(p => p.id === selectedParentId)

  const handleParentSelect = (parentId) => {
    setSelectedParentId(parentId)
    if (!parentId) return
    const parent = confirmedRoots.find(p => p.id === parentId)
    if (!parent) return
    setForm(f => ({
      ...f,
      prenom:       parent.prenom,
      nom:          parent.nom,
      telephone:    parent.telephone || '',
      email:        parent.email || '',
      localisation: parent.localisation || '',
      // reset project fields for the new project
      typeProjet:   'Villa haut gamme',
      surface:      '',
      budget:       '',
      notes:        '',
      statut:       'interet',
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (isExistant && !selectedParentId) {
      toast.error('Sélectionnez un client existant')
      return
    }
    if (!form.prenom.trim() || !form.nom.trim()) {
      toast.error('Prénom et nom requis')
      return
    }

    const data = {
      ...form,
      surface: parseFloat(form.surface) || 0,
      budget:  parseFloat(form.budget)  || 0,
      ...(isExistant ? { parentId: selectedParentId } : {}),
    }

    if (existing) {
      updateProspect(existing.id, data)
      toast.success('Prospect mis à jour')
    } else {
      addProspect(data)
      toast.success(isExistant ? 'Nouveau projet ajouté au client' : 'Prospect ajouté')
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
          {/* Header */}
          <div className="px-6 py-5 border-b border-border flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-electric/10">
                <UserPlus size={16} className="text-electric" />
              </div>
              <div className="font-semibold text-ink text-sm">
                {existing ? 'Modifier le prospect' : 'Nouveau prospect / projet'}
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-paper-warm flex items-center justify-center text-muted">
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">

            {/* Mode toggle — only for new entries */}
            {!existing && (
              <div className="flex gap-1 bg-paper-warm border border-border rounded-xl p-1">
                <button type="button" onClick={() => setMode('nouveau')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    mode === 'nouveau' ? 'bg-white shadow-sm text-ink' : 'text-muted hover:text-ink'
                  }`}>
                  <UserPlus size={12} /> Nouveau client
                </button>
                <button type="button" onClick={() => setMode('existant')}
                  disabled={confirmedRoots.length === 0}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    mode === 'existant' ? 'bg-white shadow-sm text-ink' : 'text-muted hover:text-ink'
                  }`}>
                  <Users size={12} /> Client existant
                </button>
              </div>
            )}

            {/* Existing client selector */}
            {isExistant && (
              <div>
                <label className="label-text mb-1.5 block">Sélectionner le client *</label>
                <select className="input-field" value={selectedParentId}
                  onChange={e => handleParentSelect(e.target.value)}>
                  <option value="">Choisir un client confirmé…</option>
                  {confirmedRoots.map(p => (
                    <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>
                  ))}
                </select>

                {selectedParent && (
                  <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-xl text-xs">
                    <CheckCircle size={12} className="text-emerald-600 flex-shrink-0" />
                    <span className="text-emerald-700">
                      <strong>{selectedParent.prenom} {selectedParent.nom}</strong>
                      {selectedParent.email ? ` · ${selectedParent.email}` : ''}
                      {selectedParent.telephone ? ` · ${selectedParent.telephone}` : ''}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Identity fields — nouveau mode only */}
            {!isExistant && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label-text mb-1.5 block">Prénom *</label>
                    <input type="text" className="input-field" placeholder="Hassan"
                      value={form.prenom} onChange={set('prenom')} autoFocus />
                  </div>
                  <div>
                    <label className="label-text mb-1.5 block">Nom *</label>
                    <input type="text" className="input-field" placeholder="Berrada"
                      value={form.nom} onChange={set('nom')} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label-text mb-1.5 block">Téléphone</label>
                    <input type="tel" className="input-field" placeholder="+212 6XX XXX XXX"
                      value={form.telephone} onChange={set('telephone')} />
                  </div>
                  <div>
                    <label className="label-text mb-1.5 block">Email</label>
                    <input type="email" className="input-field" placeholder="contact@mail.ma"
                      value={form.email} onChange={set('email')} />
                  </div>
                </div>
              </>
            )}

            {/* Project fields — always visible once a client is chosen */}
            {(!isExistant || selectedParentId) && (
              <>
                {isExistant && (
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[10px] font-semibold text-muted uppercase tracking-widest">
                      Nouveau projet
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label-text mb-1.5 block">Type de projet</label>
                    <select className="input-field" value={form.typeProjet} onChange={set('typeProjet')}>
                      {TYPE_PROJET_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-text mb-1.5 block">Localisation</label>
                    <input type="text" className="input-field" placeholder="Casablanca"
                      value={form.localisation} onChange={set('localisation')} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label-text mb-1.5 block">Surface (m²)</label>
                    <input type="number" min="0" className="input-field" placeholder="0"
                      value={form.surface} onChange={set('surface')} />
                  </div>
                  <div>
                    <label className="label-text mb-1.5 block">Budget estimé (MAD)</label>
                    <input type="number" min="0" step="100000" className="input-field" placeholder="0"
                      value={form.budget} onChange={set('budget')} />
                  </div>
                </div>

                <div>
                  <label className="label-text mb-1.5 block">Statut</label>
                  <div className="flex gap-2">
                    {STATUT_OPTIONS.map(s => (
                      <button key={s.value} type="button" onClick={() => setStatut(s.value)}
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                          form.statut === s.value
                            ? s.value === 'contrat_signe'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : s.value === 'devis_envoye'
                              ? 'bg-amber-500 text-white border-amber-500'
                              : 'bg-ink text-paper border-ink'
                            : 'bg-white text-muted border-border hover:border-ink/30'
                        }`}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label-text mb-1.5 block">Notes</label>
                  <textarea className="input-field resize-none" rows={3}
                    placeholder="Informations sur le projet, attentes du client…"
                    value={form.notes} onChange={set('notes')} />
                </div>
              </>
            )}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">
                Annuler
              </button>
              <button type="submit"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-ink text-paper hover:opacity-90 transition-opacity">
                <CheckCircle size={15} />
                {existing ? 'Enregistrer' : isExistant ? 'Ajouter le projet' : 'Ajouter'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
