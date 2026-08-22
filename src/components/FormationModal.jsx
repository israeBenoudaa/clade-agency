import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, X, Calendar, Clock, Users, User, AlignLeft } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

function initials(nom) {
  const p = (nom || '').trim().split(' ')
  return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : (nom || '??').slice(0, 2).toUpperCase()
}

export default function FormationModal({ onClose, employes, formation }) {
  const { addFormation, updateFormation, addPlanningEvent, deletePlanningEvent, updateGroupPlanningEvent } = useData()
  const { profile } = useAuth()
  const byName = profile?.nom || profile?.full_name || ''
  const isEdit = Boolean(formation)

  const [form, setForm] = useState({
    nom:         formation?.nom         || '',
    description: formation?.description || '',
    formateurs:  formation?.formateurs  || '',
    date:        formation?.date        || '',
    heureDebut:  formation?.heureDebut  || '09:00',
    heureFin:    formation?.heureFin    || '17:00',
    personnes:   formation?.personnes   || [],
  })
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const togglePerson = (id) => {
    setForm(f => ({
      ...f,
      personnes: f.personnes.includes(id)
        ? f.personnes.filter(p => p !== id)
        : [...f.personnes, id],
    }))
  }

  const submit = (e) => {
    e.preventDefault()
    if (!form.nom.trim() || !form.date) { toast.error('Nom et date requis'); return }
    const data = { ...form, nom: form.nom.trim(), personnes: form.personnes.map(String) }

    if (isEdit) {
      updateFormation(formation.id, data)
      // Sync planning events: update details for all participants
      updateGroupPlanningEvent(formation.id, {
        titre: data.nom,
        date: data.date,
        heureDebut: data.heureDebut,
        heureFin: data.heureFin,
        description: data.description,
      })
      // Add event for newly added participants
      const prevIds = (formation.personnes || []).map(String)
      const newIds = data.personnes.filter(id => !prevIds.includes(id))
      newIds.forEach(empId => {
        addPlanningEvent(empId, {
          id: `formation_${formation.id}_${empId}`,
          groupId: formation.id,
          titre: data.nom,
          type: 'formation',
          date: data.date,
          heureDebut: data.heureDebut,
          heureFin: data.heureFin,
          description: data.description,
        })
      })
      // Remove event for removed participants
      const removedIds = prevIds.filter(id => !data.personnes.includes(id))
      removedIds.forEach(empId => {
        deletePlanningEvent(empId, `formation_${formation.id}_${empId}`)
      })
      toast.success('Formation modifiée')
    } else {
      const f = addFormation({ ...data, confirmedBy: [] }, byName)
      // Add planning event for each participant
      data.personnes.forEach(empId => {
        addPlanningEvent(empId, {
          id: `formation_${f.id}_${empId}`,
          groupId: f.id,
          titre: data.nom,
          type: 'formation',
          date: data.date,
          heureDebut: data.heureDebut,
          heureFin: data.heureFin,
          description: data.description,
        })
      })
      toast.success('Formation ajoutée')
    }
    onClose()
  }

  const selectedCount = form.personnes.length

  return (
    <AnimatePresence>
      <div className="fixed inset-0 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm z-50"
        onClick={e => e.target === e.currentTarget && onClose()}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                <BookOpen size={16} className="text-violet-600" />
              </div>
              <div>
                <div className="font-semibold text-ink text-sm">{isEdit ? 'Modifier la formation' : 'Nouvelle formation'}</div>
                <div className="text-[10px] text-muted">Planifiez et assignez une formation à votre équipe</div>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-paper-warm flex items-center justify-center text-muted flex-shrink-0">
              <X size={15} />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={submit} className="flex-1 overflow-y-auto">
            <div className="px-6 py-5 space-y-5">

              {/* Nom */}
              <div>
                <label className="label-text mb-1.5 flex items-center gap-1.5">
                  <BookOpen size={11} className="text-violet-500" /> Nom de la formation *
                </label>
                <input
                  className="input-field text-sm font-medium"
                  placeholder="Ex : Formation BIM Revit 2026"
                  value={form.nom}
                  onChange={set('nom')}
                  autoFocus
                />
              </div>

              {/* Description + Formateurs côte à côte */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-text mb-1.5 flex items-center gap-1.5">
                    <AlignLeft size={11} className="text-muted" /> Description
                  </label>
                  <textarea
                    className="input-field resize-none text-sm w-full"
                    rows={3}
                    placeholder="Objectifs, contenu…"
                    value={form.description}
                    onChange={set('description')}
                  />
                </div>
                <div>
                  <label className="label-text mb-1.5 flex items-center gap-1.5">
                    <User size={11} className="text-muted" /> Formateur(s)
                  </label>
                  <input
                    className="input-field text-sm"
                    placeholder="Ex : Sophie Lambert"
                    value={form.formateurs}
                    onChange={set('formateurs')}
                  />
                </div>
              </div>

              {/* Date + Horaires */}
              <div>
                <label className="label-text mb-2 flex items-center gap-1.5">
                  <Calendar size={11} className="text-muted" /> Date & horaires
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <div className="text-[10px] text-muted mb-1">Date *</div>
                    <input type="date" className="input-field text-sm" value={form.date} onChange={set('date')} />
                  </div>
                  <div>
                    <div className="text-[10px] text-muted mb-1 flex items-center gap-1"><Clock size={9} /> Début</div>
                    <input type="time" className="input-field text-sm" value={form.heureDebut} onChange={set('heureDebut')} />
                  </div>
                  <div>
                    <div className="text-[10px] text-muted mb-1 flex items-center gap-1"><Clock size={9} /> Fin</div>
                    <input type="time" className="input-field text-sm" value={form.heureFin} onChange={set('heureFin')} />
                  </div>
                </div>
              </div>

              {/* Participants */}
              <div>
                <label className="label-text mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Users size={11} className="text-muted" /> Participants</span>
                  {selectedCount > 0 && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                      {selectedCount} sélectionné{selectedCount > 1 ? 's' : ''}
                    </span>
                  )}
                </label>
                {employes.length === 0 ? (
                  <div className="text-xs text-muted text-center py-4 bg-paper-warm rounded-xl border border-border">
                    Aucun employé disponible
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-0.5">
                    {employes.map(emp => {
                      const checked = form.personnes.includes(String(emp.id))
                      return (
                        <button key={emp.id} type="button" onClick={() => togglePerson(String(emp.id))}
                          className={`flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-all border ${
                            checked
                              ? 'bg-violet-50 border-violet-200 text-violet-900'
                              : 'bg-paper-warm border-transparent hover:border-border text-ink'
                          }`}>
                          <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold transition-colors ${
                            checked ? 'bg-violet-600 text-white' : 'bg-border/60 text-muted'
                          }`}>
                            {checked ? '✓' : initials(emp.nom)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold truncate">{emp.nom}</div>
                            {emp.poste && <div className="text-[10px] text-muted truncate">{emp.poste}</div>}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border flex gap-3 flex-shrink-0">
              <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center text-sm">
                Annuler
              </button>
              <button type="submit"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-colors">
                <BookOpen size={14} />
                {isEdit ? 'Enregistrer les modifications' : 'Ajouter la formation'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
