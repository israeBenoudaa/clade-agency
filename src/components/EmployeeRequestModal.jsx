import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { ClipboardList, X, Paperclip } from 'lucide-react'
import SelectField from './SelectField'

export default function EmployeeRequestModal({ profile, onClose, onSubmit }) {
  const [form, setForm] = useState({ type: 'conge', dateDebut: '', dateFin: '', motif: '' })
  const [file, setFile] = useState(null)
  const fileRef = useRef(null)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    if (f.size > 500 * 1024) { alert('Fichier max 500 Ko'); return }
    const reader = new FileReader()
    reader.onload = ev => setFile({ name: f.name, size: f.size, dataUrl: ev.target.result })
    reader.readAsDataURL(f)
    e.target.value = ''
  }

  const submit = (e) => {
    e.preventDefault()
    if (!form.type) return
    onSubmit({
      employeId: String(profile?.employe_id || profile?.id || ''),
      employeNom: profile?.full_name || '',
      type: form.type,
      dateDebut: form.dateDebut || null,
      dateFin: form.dateFin || null,
      motif: form.motif.trim() || null,
      fichierJoint: file || null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <ClipboardList size={16} className="text-amber-600" />
            </div>
            <div className="font-semibold text-ink text-sm">Soumettre une demande RH</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-paper-warm flex items-center justify-center text-muted">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="label-text mb-1.5 block">Type de demande *</label>
            <SelectField
              value={form.type}
              onChange={v => setForm(f => ({ ...f, type: v }))}
              options={[
                { value: 'conge', label: 'Congé' },
                { value: 'absence', label: 'Absence' },
                { value: 'arret_maladie', label: 'Arrêt maladie' },
                { value: 'attestation', label: 'Attestation de travail' },
                { value: 'attestation_salaire', label: 'Attestation de salaire' },
                { value: 'autre', label: 'Autre' },
                { value: 'demission', label: 'Démission' },
              ]}
            />
          </div>
          {['conge', 'absence', 'arret_maladie'].includes(form.type) && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-text mb-1.5 block">Date début *</label>
                <input type="date" className="input-field" value={form.dateDebut} onChange={set('dateDebut')} required />
              </div>
              <div>
                <label className="label-text mb-1.5 block">Date fin</label>
                <input type="date" className="input-field" value={form.dateFin} onChange={set('dateFin')} />
              </div>
            </div>
          )}
          <div>
            <label className="label-text mb-1.5 block">Motif / description</label>
            <textarea className="input-field resize-none" rows={2} placeholder="Décrivez votre demande…" value={form.motif} onChange={set('motif')} />
          </div>
          {form.type === 'arret_maladie' && (
            <div>
              <input ref={fileRef} type="file" className="hidden" onChange={handleFile} accept=".pdf,image/*" />
              {file ? (
                <div className="flex items-center gap-2 p-3 bg-paper-warm rounded-xl border border-border text-xs">
                  <span className="text-ink font-medium flex-1 truncate">{file.name}</span>
                  <button type="button" onClick={() => setFile(null)} className="text-muted hover:text-rose-500"><X size={12} /></button>
                </div>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 text-xs text-muted hover:text-electric transition-colors">
                  <Paperclip size={13} /> Joindre un justificatif (optionnel)
                </button>
              )}
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Annuler</button>
            <button type="submit" className="flex-1 btn-primary justify-center">Envoyer</button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
