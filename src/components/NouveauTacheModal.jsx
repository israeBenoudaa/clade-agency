import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertCircle, Loader, User, Calendar, CheckSquare, Pencil, Flag } from 'lucide-react'
import { useData } from '../context/DataContext'
import toast from 'react-hot-toast'
import SelectField from './SelectField'

const STATUTS = [
  { val: 'Stuck',          label: 'Bloqué',  icon: AlertCircle, color: 'bg-rose-50 text-rose-700 border-rose-200',   activeColor: 'bg-rose-600 text-white border-rose-600' },
  { val: 'Working on it',  label: 'En cours', icon: Loader,      color: 'bg-amber-50 text-amber-700 border-amber-200', activeColor: 'bg-amber-500 text-white border-amber-500' },
  { val: 'Done',           label: 'Terminé',  icon: CheckCircle, color: 'bg-emerald-50 text-emerald-700 border-emerald-200', activeColor: 'bg-emerald-600 text-white border-emerald-600' },
]

const toForm = (tache) => tache ? {
  nom:         tache.nom || '',
  description: tache.description || '',
  statut:      tache.statut || 'Working on it',
  personnelId: tache.personnelId ? String(tache.personnelId) : '',
  personnelNom: tache.personnelNom || '',
  deadline:    tache.deadline || '',
  finishDate:  tache.finishDate || '',
  missionId:   tache.missionId || '',
  missionNom:  tache.missionNom || '',
  heures:      tache.heures || '',
} : {
  nom: '', description: '', statut: 'Working on it',
  personnelId: '', personnelNom: '', deadline: '', finishDate: '',
  missionId: '', missionNom: '', heures: '',
}

export default function NouveauTacheModal({ onClose, onAdd, onEdit, tache, missions }) {
  const { employes } = useData()
  const isEdit = Boolean(tache)
  const [form, setForm] = useState(() => toForm(tache))
  const [errors, setErrors] = useState({})

  const set = (k) => (e) => {
    const val = e?.target?.value ?? e
    setForm(f => ({ ...f, [k]: val }))
    if (errors[k]) setErrors(er => ({ ...er, [k]: null }))
  }

  const handlePersonnel = (e) => {
    const emp = employes.find(p => String(p.id) === e.target.value)
    setForm(f => ({ ...f, personnelId: emp?.id ?? '', personnelNom: emp?.nom ?? '' }))
    if (errors.personnelId) setErrors(er => ({ ...er, personnelId: null }))
  }

  const validate = () => {
    const e = {}
    if (!form.nom.trim()) e.nom = 'Requis'
    if (!form.personnelId) e.personnelId = 'Sélectionnez un collaborateur'
    if (!form.deadline) e.deadline = 'Requis'
    return e
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    const payload = {
      nom:          form.nom.trim(),
      description:  form.description.trim(),
      statut:       form.statut,
      personnelId:  form.personnelId,
      personnelNom: form.personnelNom,
      deadline:     form.deadline,
      finishDate:   form.finishDate || null,
      missionId:    form.missionId || null,
      missionNom:   form.missionNom || '',
      heures:       form.heures ? Number(form.heures) : 0,
    }

    if (isEdit) {
      onEdit(payload)
      toast.success(`Tâche "${payload.nom}" modifiée`)
    } else {
      onAdd(payload)
      toast.success(`Tâche "${payload.nom}" créée`)
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
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-border flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isEdit ? 'bg-electric/10' : 'bg-ink/5'}`}>
                {isEdit ? <Pencil size={16} className="text-electric" /> : <CheckSquare size={16} className="text-ink" />}
              </div>
              <div>
                <div className="font-semibold text-ink text-sm">
                  {isEdit ? 'Modifier la tâche' : 'Nouvelle tâche'}
                </div>
                <div className="text-xs text-muted">
                  {isEdit ? `Modifier "${tache.nom}"` : 'Assigner et définir une tâche projet'}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-paper-warm flex items-center justify-center text-muted hover:text-ink transition-colors">
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
            {/* Nom */}
            <div>
              <label className="label-text mb-1.5 block">Nom de la tâche *</label>
              <input
                className={`input-field ${errors.nom ? 'border-rose-400' : ''}`}
                placeholder="Plans RDC — Vue 2D..."
                value={form.nom}
                onChange={set('nom')}
              />
              {errors.nom && <p className="text-xs text-rose-500 mt-1">{errors.nom}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="label-text mb-1.5 block">Description</label>
              <textarea
                className="input-field resize-none"
                rows={3}
                placeholder="Décrivez le travail attendu, les critères d'acceptation..."
                value={form.description}
                onChange={set('description')}
              />
            </div>

            {/* Mission associée */}
            {missions?.length > 0 && (
              <div>
                <div className="label-text mb-2 flex items-center gap-1">
                  <Flag size={11} /> Mission associée
                </div>
                <div className="flex flex-wrap gap-2">
                  {/* Aucune */}
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, missionId: '', missionNom: '' }))}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      !form.missionId
                        ? 'bg-ink text-paper border-ink'
                        : 'border-border text-muted hover:text-ink hover:border-ink/30'
                    }`}
                  >
                    Aucune
                  </button>

                  {/* Une carte par mission */}
                  {missions.map((m) => {
                    const isSelected  = form.missionId === m.id
                    const isValidated = m.statut === 'valide'
                    const isCurrent   = !isValidated && missions.find(x => x.statut !== 'valide')?.id === m.id
                    const shortName   = m.nom.split(' — ')[0] || m.nom
                    return (
                      <button
                        key={m.id}
                        type="button"
                        title={m.nom}
                        onClick={() => setForm(f => ({ ...f, missionId: m.id, missionNom: m.nom }))}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                          isSelected
                            ? 'text-white border-transparent shadow-sm'
                            : isValidated
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-paper-warm text-ink border-border hover:border-ink/30 hover:bg-white'
                        }`}
                        style={isSelected ? { background: m.couleur, borderColor: m.couleur } : {}}
                      >
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: isSelected ? 'rgba(255,255,255,0.65)' : m.couleur }}
                        />
                        <span className="max-w-[110px] truncate">{shortName}</span>
                        {isCurrent && !isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-electric animate-pulse flex-shrink-0" />
                        )}
                        {isValidated && (
                          <CheckCircle size={10} className={`flex-shrink-0 ${isSelected ? 'text-white/70' : 'text-emerald-500'}`} />
                        )}
                      </button>
                    )
                  })}
                </div>

                {form.missionId && (
                  <p className="text-[10px] text-muted mt-1.5">
                    Rattachée à <span className="font-semibold text-ink">{form.missionNom}</span>
                  </p>
                )}
              </div>
            )}


            {/* Personnel */}
            <div>
              <label className="label-text mb-1.5 flex items-center gap-1 block">
                <User size={11} /> Personnel chargé *
              </label>
              <SelectField
                value={form.personnelId}
                onChange={v => handlePersonnel({ target: { value: String(v) } })}
                options={employes.map(e => ({ value: e.id, label: `${e.nom} — ${e.poste}` }))}
                placeholder="— Sélectionner un collaborateur —"
                error={!!errors.personnelId}
              />
              {errors.personnelId && <p className="text-xs text-rose-500 mt-1">{errors.personnelId}</p>}
            </div>

            {/* Heures estimées */}
            <div>
              <label className="label-text mb-1.5 block">Heures estimées</label>
              <div className="relative">
                <input type="number" min="0" step="0.5" className="input-field pr-10"
                  placeholder="0" value={form.heures} onChange={set('heures')} />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted text-sm">h</span>
              </div>
              <p className="text-[10px] text-muted mt-1">Utilisé pour calculer l'investissement des projets internes</p>
            </div>

            {/* Deadline + Finish date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-text mb-1.5 flex items-center gap-1 block">
                  <Calendar size={11} /> Deadline *
                </label>
                <input
                  type="date"
                  className={`input-field ${errors.deadline ? 'border-rose-400' : ''}`}
                  value={form.deadline}
                  onChange={set('deadline')}
                />
                {errors.deadline && <p className="text-xs text-rose-500 mt-1">{errors.deadline}</p>}
              </div>
              <div>
                <label className="label-text mb-1.5 flex items-center gap-1 block">
                  <CheckCircle size={11} /> Date de fin réelle
                </label>
                <input
                  type="date"
                  className="input-field"
                  value={form.finishDate || ''}
                  onChange={set('finishDate')}
                />
                <p className="text-[10px] text-muted mt-1">Quand la tâche est concrètement finie</p>
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border flex gap-3 flex-shrink-0">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">
              Annuler
            </button>
            <button onClick={handleSubmit} className={`flex-1 justify-center ${isEdit ? 'btn-accent' : 'btn-primary'} flex items-center gap-2`}>
              <CheckCircle size={15} />
              {isEdit ? 'Enregistrer' : 'Créer la tâche'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
