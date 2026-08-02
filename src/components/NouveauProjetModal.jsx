import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, FolderKanban, MapPin, Ruler, Euro, Calendar,
  Users, CheckCircle, Plus, Lock, Globe, Pencil, UserCircle, Info,
} from 'lucide-react'

import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import NouveauClientModal from './NouveauClientModal'
import SelectField from './SelectField'
import toast from 'react-hot-toast'

const TYPES = [
  'Architecture',
  'Conservation',
  'Paysage',
  'Design',
  'Éphémère',
]

const toForm = (p) => p ? {
  nom:                p.nom || '',
  type:               p.type || '',
  maitrise:           p.maitrise || 'prive',
  localisation:       (p.localisation === '—' ? '' : p.localisation) || '',
  surface:            p.surfaceRaw ?? (p.surface && p.surface !== '—' ? p.surface.replace(' m²', '') : ''),
  deadline:           p.deadlineRaw || '',
  clientId:           p.clientId ? String(p.clientId) : '',
  prospectId:         p.prospectId || '',
  architecteReferentId: p.architecteReferentId ? String(p.architecteReferentId) : '',
} : {
  nom: '', type: '', maitrise: 'prive',
  localisation: '', surface: '', deadline: '', clientId: '',
  prospectId: '',
  architecteReferentId: '',
}

function Field({ label, icon: Icon, error, children }) {
  return (
    <div>
      <label className="label-text mb-1.5 flex items-center gap-1">
        {Icon && <Icon size={11} />}
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
    </div>
  )
}

export default function NouveauProjetModal({ onClose, projet }) {
  const { clients, employes, prospects, addProject, updateProject } = useData()
  const { profile } = useAuth()
  const byName = profile?.nom || profile?.full_name || ''
  const confirmedProspects = (prospects || []).filter(p => p.statut === 'contrat_signe')
  // Exclude clients already shown via CRM (those created from a prospect)
  const pureClients = (clients || []).filter(c => !confirmedProspects.find(p => p.id === c.prospectId))
  const isEdit = Boolean(projet)
  const [form, setForm] = useState(() => toForm(projet))
  const [errors, setErrors] = useState({})
  const [showClientModal, setShowClientModal] = useState(false)

  const set = (key) => (val) => {
    const value = typeof val === 'string' ? val : val?.target?.value ?? val
    setForm(f => ({ ...f, [key]: value }))
    if (errors[key]) setErrors(e => ({ ...e, [key]: null }))
  }

  const validate = () => {
    const e = {}
    if (!form.nom.trim()) e.nom = 'Requis'
    if (!form.type) e.type = 'Requis'
    if (!form.clientId && !form.prospectId) e.clientId = 'Sélectionnez ou créez un client'
    return e
  }

  const handleClientSelect = (e) => {
    const val = e.target.value
    if (val.startsWith('prospect:')) {
      setForm(f => ({ ...f, prospectId: val.replace('prospect:', ''), clientId: '' }))
    } else {
      setForm(f => ({ ...f, clientId: val, prospectId: '' }))
    }
    if (errors.clientId) setErrors(er => ({ ...er, clientId: null }))
  }

  const clientSelectValue = form.prospectId
    ? `prospect:${form.prospectId}`
    : form.clientId || ''

  // Honoraires = sum of all mission honoraires set in Finance
  const computedHonoraires = isEdit
    ? (projet.missions || [])
        .filter(m => m.type === 'mission')
        .reduce((s, m) => s + (Number(projet.finances?.honoraires?.[m.id]) || 0), 0)
    : 0

  const buildPayload = () => {
    const archRef = employes.find(e => String(e.id) === form.architecteReferentId)
    const selectedProspect = form.prospectId
      ? confirmedProspects.find(p => p.id === form.prospectId)
      : null
    const selectedClient = !selectedProspect
      ? clients.find(c => c.id === Number(form.clientId) || c.id === form.clientId)
      : null
    return {
      nom:          form.nom.trim(),
      typeProjet:   'externe',
      type:         form.type,
      maitrise:     form.maitrise,
      localisation: form.localisation.trim() || '—',
      surface:      form.surface ? `${form.surface} m²` : '—',
      surfaceRaw:   form.surface || '',
      budget:       computedHonoraires > 0
        ? `${computedHonoraires.toLocaleString('fr-FR')} DH`
        : '—',
      honoraires:   computedHonoraires,
      deadline:     form.deadline
        ? new Date(form.deadline).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : '—',
      deadlineRaw:  form.deadline || '',
      clientId:     selectedClient?.id || null,
      prospectId:   selectedProspect?.id || null,
      client:       selectedProspect
        ? `${selectedProspect.prenom} ${selectedProspect.nom}`
        : selectedClient?.nom || '—',
      architecteReferentId: archRef?.id || null,
      architecteReferentNom: archRef?.nom || '',
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    const payload = buildPayload()
    if (isEdit) {
      updateProject(projet.id, payload)
      toast.success(`Projet "${payload.nom}" modifié`)
    } else {
      addProject(payload, byName)
      toast.success(`Projet "${payload.nom}" créé`)
    }
    onClose()
  }

  const handleClientCreated = (prospect) => {
    setForm(f => ({ ...f, prospectId: prospect.id, clientId: '' }))
    if (errors.clientId) setErrors(e => ({ ...e, clientId: null }))
  }

  const selectedClient = form.clientId
    ? clients.find(c => c.id === Number(form.clientId) || c.id === form.clientId)
    : null
  const selectedProspect = form.prospectId
    ? confirmedProspects.find(p => p.id === form.prospectId)
    : null
  const selectedLabel = selectedProspect
    ? `${selectedProspect.prenom} ${selectedProspect.nom}`
    : selectedClient?.nom || null

  return (
    <>
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
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-border flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isEdit ? 'bg-electric/10' : 'bg-ink/5'}`}>
                  {isEdit ? <Pencil size={16} className="text-electric" /> : <FolderKanban size={16} className="text-ink" />}
                </div>
                <div>
                  <div className="font-semibold text-ink">{isEdit ? 'Modifier le projet' : 'Nouveau projet'}</div>
                  <div className="text-xs text-muted">
                    {isEdit ? `Modifier "${projet.nom}"` : 'Renseigne les informations du projet'}
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-paper-warm flex items-center justify-center text-muted hover:text-ink transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

              {/* Toggle Public / Privé */}
              <div>
                <div className="label-text mb-2">Maîtrise d'ouvrage</div>
                <div className="inline-flex rounded-xl border border-border bg-paper-warm p-1 gap-1">
                  {[{ val: 'prive', label: 'Privé', Icon: Lock }, { val: 'public', label: 'Public', Icon: Globe }].map(({ val, label, Icon }) => (
                    <button key={val} type="button" onClick={() => set('maitrise')(val)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${form.maitrise === val ? 'bg-ink text-paper shadow-sm' : 'text-muted hover:text-ink'}`}>
                      <Icon size={13} />{label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nom + Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Nom du projet *" error={errors.nom}>
                  <input className={`input-field ${errors.nom ? 'border-rose-400' : ''}`} placeholder="Villa Contemporaine..." value={form.nom} onChange={set('nom')} />
                </Field>
                <Field label="Type de projet *" error={errors.type}>
                  <SelectField
                    value={form.type}
                    onChange={v => set('type')({ target: { value: v } })}
                    options={TYPES}
                    placeholder="— Sélectionner —"
                    error={!!errors.type}
                  />
                </Field>
              </div>

              {/* Localisation + Surface */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Localisation" icon={MapPin}>
                  <input className="input-field" placeholder="Casablanca, Anfa" value={form.localisation} onChange={set('localisation')} />
                </Field>
                <Field label="Surface" icon={Ruler}>
                  <div className="relative">
                    <input type="number" min="0" className="input-field pr-12" placeholder="480" value={form.surface} onChange={set('surface')} />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted text-sm">m²</span>
                  </div>
                </Field>
              </div>

              {/* Honoraires (computed) + Deadline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label-text mb-1.5 flex items-center gap-1">
                    <Euro size={11} /> Honoraires HT
                  </label>
                  {isEdit && computedHonoraires > 0 ? (
                    <div className="flex items-center justify-between px-4 py-2.5 bg-electric/5 border border-electric/20 rounded-xl">
                      <span className="text-sm font-bold text-electric">
                        {computedHonoraires.toLocaleString('fr-FR')} DH
                      </span>
                      <span className="text-[10px] text-electric/70 font-medium">Depuis Finance</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-paper-warm border border-dashed border-border rounded-xl">
                      <Info size={12} className="text-muted flex-shrink-0" />
                      <span className="text-xs text-muted">
                        {isEdit ? 'Aucune mission financée' : 'Défini via Finance après création'}
                      </span>
                    </div>
                  )}
                </div>
                <Field label="Deadline" icon={Calendar}>
                  <input type="date" className="input-field" value={form.deadline} onChange={set('deadline')} />
                </Field>
              </div>

              <div className="border-t border-border" />

              {/* Client */}
              <div>
                <div className="label-text mb-2"><Users size={11} className="inline mr-1" />Client du projet *</div>
                <div className="space-y-2">
                  <SelectField
                    value={clientSelectValue}
                    onChange={v => {
                      if (String(v).startsWith('__sep__')) return
                      handleClientSelect({ target: { value: v } })
                    }}
                    options={[
                      ...(confirmedProspects.length > 0 ? [
                        { value: '__sep__crm', label: '── Clients CRM ──' },
                        ...confirmedProspects.map(p => ({
                          value: `prospect:${p.id}`,
                          label: `${p.prenom} ${p.nom} — ${p.typeProjet || ''}`,
                        })),
                      ] : []),
                      ...(pureClients.length > 0 ? [
                        { value: '__sep__clients', label: '── Clients existants ──' },
                        ...pureClients.map(c => ({ value: String(c.id), label: c.nom })),
                      ] : []),
                    ]}
                    placeholder="— Sélectionner un client —"
                    error={!!errors.clientId}
                  />

                  {selectedLabel && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-electric/5 border border-electric/20 rounded-lg">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-ink to-electric flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-[9px] font-bold">{selectedLabel[0]}</span>
                      </div>
                      <span className="text-xs font-semibold text-ink">{selectedLabel}</span>
                      {selectedProspect && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-semibold ml-1">Portail actif</span>
                      )}
                    </div>
                  )}

                  {errors.clientId && <p className="text-xs text-rose-500">{errors.clientId}</p>}

                  <button type="button" onClick={() => setShowClientModal(true)}
                    className="flex items-center gap-2 text-xs text-electric hover:text-ink font-medium transition-colors py-1">
                    <div className="w-5 h-5 rounded-full border border-electric flex items-center justify-center"><Plus size={11} /></div>
                    Créer un nouveau client
                  </button>
                </div>
              </div>

              {/* Architecte référent */}
              <div>
                <label className="label-text mb-2 flex items-center gap-1">
                  <UserCircle size={11} className="inline mr-1" />Personnel référent
                </label>
                <SelectField
                  value={form.architecteReferentId}
                  onChange={v => set('architecteReferentId')({ target: { value: v } })}
                  options={[
                    { value: '', label: '— Aucun référent —' },
                    ...employes.map(e => ({
                      value: e.id,
                      label: `${e.nom}${e.isDirecteur ? ' — Directeur Général' : e.poste ? ` — ${e.poste}` : ''}`,
                    })),
                  ]}
                />
                <p className="text-[10px] text-muted mt-1">Interlocuteur principal avec le client</p>
              </div>
            </form>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border flex gap-3 flex-shrink-0 bg-paper/50">
              <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Annuler</button>
              <button onClick={handleSubmit} className={`flex-1 justify-center ${isEdit ? 'btn-accent' : 'btn-primary'} flex items-center gap-2`}>
                <CheckCircle size={15} />
                {isEdit ? 'Enregistrer les modifications' : 'Créer le projet'}
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {showClientModal && (
        <NouveauClientModal zIndex={70} onClose={() => setShowClientModal(false)} onCreated={handleClientCreated} />
      )}
    </>
  )
}
