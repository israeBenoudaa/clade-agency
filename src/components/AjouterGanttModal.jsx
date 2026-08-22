import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Flag, Calendar, Users, CheckCircle, Pencil, Upload, Link2, Trash2, FileText, Search, ChevronDown, Check, MapPin, Phone, Video, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

const COULEURS = [
  { val: '#3B82F6', label: 'Bleu' },
  { val: '#06B6D4', label: 'Cyan' },
  { val: '#10B981', label: 'Vert' },
  { val: '#F59E0B', label: 'Ambre' },
  { val: '#F43F5E', label: 'Rose' },
  { val: '#8B5CF6', label: 'Violet' },
  { val: '#0A1E3F', label: 'Ink' },
]

const TYPES = [
  { val: 'mission',  label: 'Mission',     desc: 'Tâche ou phase avec durée', icon: '▬' },
  { val: 'deadline', label: 'Deadline',    desc: 'Date butoir',               icon: '🎯' },
  { val: 'rdv',      label: 'Rendez-vous', desc: 'Réunion ou événement',      icon: '📅' },
]

const readFileAsDataUrl = (file) => new Promise((resolve) => {
  const r = new FileReader()
  r.onload = (e) => resolve(e.target.result)
  r.readAsDataURL(file)
})

const FORMAT_RDV = [
  { val: 'presentiel',   label: 'Présentiel',   Icon: MapPin },
  { val: 'telephonique', label: 'Téléphonique', Icon: Phone },
  { val: 'meet',         label: 'Google Meet',  Icon: Video },
]

const toForm = (item) => item ? {
  nom:                item.nom || '',
  debut:              item.debut || '',
  fin:                item.fin || '',
  date:               item.date || '',
  heureDebut:         item.heureDebut || '09:00',
  heureFin:           item.heureFin || '10:00',
  format:             item.format || '',
  couleur:            item.couleur || '#06B6D4',
  equipe:             item.equipe || '',
  personnesIds:       item.personnesIds || [],
  clientIds:          item.clientIds || [],
  collabIds:          item.collabIds || [],
  personnesExtra:     item.personnesExtra || (item.personnesIds?.length ? '' : (item.personnes || '')),
  description:        item.description || '',
  livrablesFiles:     item.livrables?.files || [],
  livrablesLinks:     item.livrables?.links || [],
  livrablesFromProject: item.livrables?.fromProject || [],
  livrablesLinkInput: '',
  lieu: item?.lieu || '',
} : {
  nom: '', debut: '', fin: '', date: '',
  heureDebut: '09:00', heureFin: '10:00',
  format: '',
  couleur: '#06B6D4', equipe: '',
  personnesIds: [], clientIds: [], collabIds: [], personnesExtra: '',
  description: '',
  livrablesFiles: [], livrablesLinks: [], livrablesFromProject: [],
  livrablesLinkInput: '',
  lieu: '',
}

export default function AjouterGanttModal({ onClose, onAdd, onEdit, item, projectLivrables = [], employes = [], clients = [], collaborateurs = [] }) {
  const isEdit = Boolean(item)
  const [type, setType]   = useState(item?.type || 'mission')
  const [form, setForm]   = useState(() => toForm(item))
  const [errors, setErrors] = useState({})
  const [lvOpen, setLvOpen]   = useState(false)
  const [lvSearch, setLvSearch] = useState('')
  const fileRef = useRef()

  const set = (k) => (e) => {
    setForm(f => ({ ...f, [k]: e.target.value }))
    if (errors[k]) setErrors(er => ({ ...er, [k]: null }))
  }

  const handleLivrablesFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await readFileAsDataUrl(file)
    setForm(f => ({ ...f, livrablesFiles: [...f.livrablesFiles, { name: file.name, url }] }))
    e.target.value = ''
    toast.success(`"${file.name}" ajouté`)
  }

  const handleAddLink = () => {
    const url = form.livrablesLinkInput.trim()
    if (!url) return
    if (!/^https?:\/\//.test(url)) { toast.error('Entrez un lien valide (https://...)'); return }
    setForm(f => ({ ...f, livrablesLinks: [...f.livrablesLinks, url], livrablesLinkInput: '' }))
  }

  const toggleProjectLivrable = (pl) => {
    setForm(f => {
      const isSel = f.livrablesFromProject.some(fp => fp.id === pl.id)
      return {
        ...f,
        livrablesFromProject: isSel
          ? f.livrablesFromProject.filter(fp => fp.id !== pl.id)
          : [...f.livrablesFromProject, { id: pl.id, nom: pl.nom, type: pl.type, url: pl.url, fileName: pl.fileName }],
      }
    })
  }

  const validate = () => {
    const e = {}
    if (!form.nom.trim()) e.nom = 'Requis'
    if (type === 'mission') {
      if (!form.debut) e.debut = 'Requis'
      if (!form.fin)   e.fin   = 'Requis'
      if (form.debut && form.fin && form.fin <= form.debut) e.fin = 'Doit être après le début'
    } else {
      if (!form.date) e.date = 'Requis'
    }
    return e
  }

  const handleSubmit = () => {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    const payload = {
      type,
      nom:     form.nom.trim(),
      couleur: type === 'deadline' ? '#F43F5E' : form.couleur,
      ...(type === 'mission' && {
        debut:       form.debut,
        fin:         form.fin,
        equipe:      form.equipe.trim(),
        description: form.description.trim(),
        livrables:   {
          files:       form.livrablesFiles,
          links:       form.livrablesLinks,
          fromProject: form.livrablesFromProject,
        },
      }),
      ...(type !== 'mission' && { date: form.date }),
      ...(type === 'rdv'     && {
        heureDebut:  form.heureDebut || '09:00',
        heureFin:    form.heureFin   || '10:00',
        format:      form.format || null,
        lieu:        form.lieu.trim() || null,
        description: form.description.trim() || null,
        personnesIds: form.personnesIds,
        clientIds: form.clientIds,
        collabIds: form.collabIds,
        personnesExtra: form.personnesExtra.trim(),
        personnes: [
          ...employes.filter(e => form.personnesIds.map(String).includes(String(e.id)))
            .map(e => e.nom || ''),
          ...clients.filter(c => form.clientIds.map(String).includes(String(c.id)))
            .map(c => `${c.prenom || ''} ${c.nom || ''}`.trim()),
          ...collaborateurs.filter(c => form.collabIds.map(String).includes(String(c.id)))
            .map(c => c.nom || ''),
          form.personnesExtra.trim(),
        ].filter(Boolean).join(', '),
      }),
    }

    if (isEdit) {
      onEdit(payload)
      toast.success(`"${payload.nom}" modifié`)
    } else {
      onAdd(payload)
      toast.success(`${({ mission: 'Mission', deadline: 'Deadline', rdv: 'RDV' })[type]} "${payload.nom}" ajouté`)
    }
    onClose()
  }

  const filteredLv = projectLivrables.filter(pl =>
    !lvSearch || pl.nom.toLowerCase().includes(lvSearch.toLowerCase())
  )

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
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-border flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isEdit ? 'bg-electric/10' : 'bg-ink/5'}`}>
                {isEdit ? <Pencil size={16} className="text-electric" /> : <Flag size={16} className="text-ink" />}
              </div>
              <div>
                <div className="font-semibold text-ink text-sm">
                  {isEdit ? "Modifier l'élément" : 'Ajouter au Gantt'}
                </div>
                <div className="text-xs text-muted">
                  {isEdit ? `Modifier "${item.nom}"` : 'Mission, deadline ou rendez-vous'}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-paper-warm flex items-center justify-center text-muted hover:text-ink transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Body scrollable */}
          <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">

            {!isEdit && (
              <div>
                <div className="label-text mb-2">Type d'élément</div>
                <div className="grid grid-cols-3 gap-2">
                  {TYPES.map(t => (
                    <button key={t.val} type="button" onClick={() => setType(t.val)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        type === t.val ? 'border-ink bg-ink text-paper' : 'border-border hover:border-ink/30 text-ink'
                      }`}>
                      <div className="text-base mb-1">{t.icon}</div>
                      <div className="text-xs font-semibold">{t.label}</div>
                      <div className={`text-[10px] mt-0.5 ${type === t.val ? 'text-paper/60' : 'text-muted'}`}>{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="label-text mb-1.5 block">Nom *</label>
              <input
                className={`input-field ${errors.nom ? 'border-rose-400' : ''}`}
                placeholder={
                  type === 'mission'  ? 'APD — Avant-Projet Détaillé' :
                  type === 'deadline' ? 'Rendu dossier client' :
                  'Réunion validation maquette'
                }
                value={form.nom}
                onChange={set('nom')}
              />
              {errors.nom && <p className="text-xs text-rose-500 mt-1">{errors.nom}</p>}
            </div>

            {type === 'mission' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label-text mb-1.5 flex items-center gap-1 block"><Calendar size={11} /> Début *</label>
                    <input type="date" className={`input-field ${errors.debut ? 'border-rose-400' : ''}`} value={form.debut} onChange={set('debut')} />
                    {errors.debut && <p className="text-xs text-rose-500 mt-1">{errors.debut}</p>}
                  </div>
                  <div>
                    <label className="label-text mb-1.5 flex items-center gap-1 block"><Calendar size={11} /> Fin *</label>
                    <input type="date" className={`input-field ${errors.fin ? 'border-rose-400' : ''}`} value={form.fin} onChange={set('fin')} />
                    {errors.fin && <p className="text-xs text-rose-500 mt-1">{errors.fin}</p>}
                  </div>
                </div>

                <div>
                  <label className="label-text mb-1.5 block">Couleur</label>
                  <div className="flex gap-2 flex-wrap">
                    {COULEURS.map(c => (
                      <button key={c.val} type="button"
                        onClick={() => setForm(f => ({ ...f, couleur: c.val }))}
                        className={`w-8 h-8 rounded-lg transition-all ${form.couleur === c.val ? 'ring-2 ring-offset-2 ring-ink scale-110' : 'hover:scale-105'}`}
                        style={{ background: c.val }} title={c.label}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label-text mb-1.5 flex items-center gap-1 block"><Users size={11} /> Équipe / Intervenants</label>
                  <input className="input-field" placeholder="Yasmine Benali, Karim Tazi..." value={form.equipe} onChange={set('equipe')} />
                </div>

                <div>
                  <label className="label-text mb-1.5 block">Description</label>
                  <textarea className="input-field resize-none" rows={3} placeholder="Objectifs et livrables attendus…" value={form.description} onChange={set('description')} />
                </div>

                {/* ── Livrables ── */}
                <div>
                  <label className="label-text mb-2 block">Livrables</label>

                  {/* Suggestions depuis le projet — panel inline, pas d'absolute */}
                  {projectLivrables.length > 0 && (
                    <div className="mb-3 rounded-xl border border-border overflow-hidden">
                      {/* Trigger */}
                      <button type="button"
                        onClick={() => { setLvOpen(o => !o); setLvSearch('') }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 bg-paper-warm hover:bg-border/30 transition-colors text-left">
                        <Search size={12} className="text-muted flex-shrink-0" />
                        <span className="text-xs text-muted flex-1">
                          {form.livrablesFromProject.length > 0
                            ? `${form.livrablesFromProject.length} livrable${form.livrablesFromProject.length > 1 ? 's' : ''} sélectionné${form.livrablesFromProject.length > 1 ? 's' : ''} depuis le projet`
                            : 'Ajouter depuis les livrables du projet…'}
                        </span>
                        <ChevronDown size={12} className={`text-muted flex-shrink-0 transition-transform duration-200 ${lvOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Panel inline — s'étend dans le flux normal */}
                      {lvOpen && (
                        <>
                          <div className="border-t border-border px-2 pt-2 pb-1 bg-white">
                            <div className="relative">
                              <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                              <input
                                type="text"
                                placeholder="Rechercher…"
                                value={lvSearch}
                                onChange={e => setLvSearch(e.target.value)}
                                className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg border border-border bg-paper-warm focus:outline-none focus:border-electric transition-colors"
                                autoFocus
                              />
                            </div>
                          </div>
                          <div className="max-h-40 overflow-y-auto bg-white">
                            {filteredLv.length === 0 ? (
                              <div className="px-3 py-3 text-xs text-muted text-center">Aucun résultat</div>
                            ) : filteredLv.map(pl => {
                              const isSel = form.livrablesFromProject.some(fp => fp.id === pl.id)
                              return (
                                <button key={pl.id} type="button"
                                  onClick={() => toggleProjectLivrable(pl)}
                                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-left border-t border-border/40 transition-colors ${isSel ? 'bg-electric/5' : 'hover:bg-paper-warm'}`}>
                                  {pl.type === 'link'
                                    ? <Link2 size={11} className={isSel ? 'text-electric flex-shrink-0' : 'text-muted flex-shrink-0'} />
                                    : <FileText size={11} className={isSel ? 'text-electric flex-shrink-0' : 'text-muted flex-shrink-0'} />
                                  }
                                  <span className={`flex-1 truncate ${isSel ? 'text-electric font-semibold' : 'text-ink'}`}>{pl.nom}</span>
                                  {isSel && <Check size={11} className="text-electric flex-shrink-0" />}
                                </button>
                              )
                            })}
                          </div>
                        </>
                      )}

                      {/* Chips des éléments sélectionnés */}
                      {form.livrablesFromProject.length > 0 && (
                        <div className="border-t border-border/60 px-3 py-2 flex flex-wrap gap-1.5 bg-electric/5">
                          {form.livrablesFromProject.map(fp => (
                            <span key={fp.id} className="flex items-center gap-1 pl-2 pr-1 py-0.5 bg-white border border-electric/30 rounded-lg text-[11px] text-electric font-medium shadow-sm">
                              {fp.type === 'link' ? <Link2 size={9} /> : <FileText size={9} />}
                              <span className="max-w-[120px] truncate">{fp.nom}</span>
                              <button type="button"
                                onClick={() => setForm(f => ({ ...f, livrablesFromProject: f.livrablesFromProject.filter(x => x.id !== fp.id) }))}
                                className="ml-0.5 w-4 h-4 flex items-center justify-center rounded hover:text-rose-500 transition-colors">
                                <X size={9} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Fichiers uploadés */}
                  {form.livrablesFiles.length > 0 && (
                    <div className="space-y-1 mb-2">
                      {form.livrablesFiles.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 bg-paper-warm border border-border rounded-lg px-3 py-2">
                          <FileText size={13} className="text-muted flex-shrink-0" />
                          <span className="text-xs text-ink flex-1 truncate">{f.name}</span>
                          <button type="button"
                            onClick={() => setForm(fm => ({ ...fm, livrablesFiles: fm.livrablesFiles.filter((_, j) => j !== i) }))}
                            className="text-muted hover:text-rose-500 flex-shrink-0 transition-colors">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Liens manuels */}
                  {form.livrablesLinks.length > 0 && (
                    <div className="space-y-1 mb-2">
                      {form.livrablesLinks.map((l, i) => (
                        <div key={i} className="flex items-center gap-2 bg-electric/5 border border-electric/20 rounded-lg px-3 py-2">
                          <Link2 size={13} className="text-electric flex-shrink-0" />
                          <span className="text-xs text-electric flex-1 truncate">{l}</span>
                          <button type="button"
                            onClick={() => setForm(fm => ({ ...fm, livrablesLinks: fm.livrablesLinks.filter((_, j) => j !== i) }))}
                            className="text-muted hover:text-rose-500 flex-shrink-0 transition-colors">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload + lien */}
                  <div className="flex gap-2">
                    <input ref={fileRef} type="file" className="hidden" onChange={handleLivrablesFile} />
                    <button type="button" onClick={() => fileRef.current?.click()}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-border hover:border-ink/30 text-muted hover:text-ink transition-all bg-paper-warm flex-shrink-0">
                      <Upload size={12} /> Fichier
                    </button>
                    <div className="flex flex-1 gap-1.5">
                      <input
                        className="input-field flex-1 text-xs py-2"
                        placeholder="https://drive.google.com/..."
                        value={form.livrablesLinkInput}
                        onChange={set('livrablesLinkInput')}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddLink() } }}
                      />
                      <button type="button" onClick={handleAddLink}
                        className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg bg-electric/10 border border-electric/20 text-electric hover:bg-electric/20 transition-all flex-shrink-0">
                        <Link2 size={12} /> Ajouter
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {type !== 'mission' && (
              <div>
                <label className="label-text mb-1.5 flex items-center gap-1 block"><Calendar size={11} /> Date *</label>
                <input type="date" className={`input-field ${errors.date ? 'border-rose-400' : ''}`} value={form.date} onChange={set('date')} />
                {errors.date && <p className="text-xs text-rose-500 mt-1">{errors.date}</p>}
              </div>
            )}

            {type === 'rdv' && (
              <>
                {/* Format */}
                <div>
                  <label className="label-text mb-2 block">Format</label>
                  <div className="flex gap-2">
                    {FORMAT_RDV.map(f => (
                      <button key={f.val} type="button"
                        onClick={() => setForm(fm => ({ ...fm, format: fm.format === f.val ? '' : f.val }))}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                          form.format === f.val
                            ? 'border-ink bg-ink text-white'
                            : 'border-border text-muted hover:text-ink hover:border-ink/30'
                        }`}>
                        <f.Icon size={13} /> {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Heures */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label-text mb-1.5 block">Heure début</label>
                    <input type="time" className="input-field" value={form.heureDebut} onChange={set('heureDebut')} />
                  </div>
                  <div>
                    <label className="label-text mb-1.5 block">Heure fin</label>
                    <input type="time" className="input-field" value={form.heureFin} onChange={set('heureFin')} />
                  </div>
                </div>

                {/* Lieu — adaptatif selon le format */}
                {form.format !== 'telephonique' && (
                  <div>
                    <label className="label-text mb-1.5 flex items-center gap-1 block">
                      {form.format === 'meet' ? <Video size={11} /> : <MapPin size={11} />}
                      {form.format === 'meet' ? 'Lien Google Meet' : 'Adresse / Localisation'}
                    </label>
                    <div className="flex gap-2">
                      <input
                        className="input-field flex-1"
                        placeholder={form.format === 'meet' ? 'https://meet.google.com/abc-defg-hij' : 'Salle de réunion, adresse…'}
                        value={form.lieu}
                        onChange={set('lieu')}
                      />
                      {form.format === 'meet' && (
                        <a
                          href="https://meet.google.com/new"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition-colors flex-shrink-0"
                        >
                          <ExternalLink size={12} /> Ouvrir Meet
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Description */}
                <div>
                  <label className="label-text mb-1.5 block">Description</label>
                  <textarea className="input-field resize-none" rows={2} placeholder="Ordre du jour, contexte de la réunion…" value={form.description} onChange={set('description')} />
                </div>
              </>
            )}

            {type === 'rdv' && (
              <div>
                <label className="label-text mb-1.5 flex items-center gap-1 block"><Users size={11} /> Personnes impliquées</label>

                {/* Chips des employés sélectionnés */}
                {form.personnesIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {form.personnesIds.map(id => {
                      const emp = employes.find(e => String(e.id) === String(id))
                      if (!emp) return null
                      return (
                        <span key={id} className="flex items-center gap-1 pl-2 pr-1 py-0.5 bg-electric/10 border border-electric/20 rounded-lg text-[11px] text-electric font-medium">
                          {emp.nom}
                          <button type="button"
                            onClick={() => setForm(f => ({ ...f, personnesIds: f.personnesIds.filter(i => String(i) !== String(id)) }))}
                            className="w-4 h-4 flex items-center justify-center rounded hover:text-rose-500 transition-colors">
                            <X size={9} />
                          </button>
                        </span>
                      )
                    })}
                  </div>
                )}

                {/* Dropdown membres de l'équipe */}
                {employes.length > 0 && (
                  <select
                    className="input-field mb-2"
                    value=""
                    onChange={e => {
                      const id = e.target.value
                      if (!id || form.personnesIds.map(String).includes(id)) return
                      setForm(f => ({ ...f, personnesIds: [...f.personnesIds, id] }))
                    }}
                  >
                    <option value="">Ajouter un membre de l'équipe…</option>
                    {employes
                      .filter(e => e.statut !== 'inactif' && !form.personnesIds.map(String).includes(String(e.id)))
                      .map(e => (
                        <option key={e.id} value={String(e.id)}>
                          {e.nom}{e.poste ? ` — ${e.poste}` : ''}
                        </option>
                      ))
                    }
                  </select>
                )}

                {/* Chips des clients sélectionnés */}
                {form.clientIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {form.clientIds.map(id => {
                      const cl = clients.find(c => String(c.id) === String(id))
                      if (!cl) return null
                      return (
                        <span key={id} className="flex items-center gap-1 pl-2 pr-1 py-0.5 bg-sky-50 border border-sky-200 rounded-lg text-[11px] text-sky-700 font-medium">
                          {cl.prenom} {cl.nom}
                          <button type="button"
                            onClick={() => setForm(f => ({ ...f, clientIds: f.clientIds.filter(i => String(i) !== String(id)) }))}
                            className="w-4 h-4 flex items-center justify-center rounded hover:text-rose-500 transition-colors">
                            <X size={9} />
                          </button>
                        </span>
                      )
                    })}
                  </div>
                )}

                {/* Dropdown clients (prospects) */}
                {clients.length > 0 && (
                  <select
                    className="input-field mb-2"
                    value=""
                    onChange={e => {
                      const id = e.target.value
                      if (!id || form.clientIds.map(String).includes(id)) return
                      setForm(f => ({ ...f, clientIds: [...f.clientIds, id] }))
                    }}
                  >
                    <option value="">Ajouter un client…</option>
                    {clients
                      .filter(c => !form.clientIds.map(String).includes(String(c.id)))
                      .map(c => (
                        <option key={c.id} value={String(c.id)}>
                          {c.prenom} {c.nom}
                        </option>
                      ))
                    }
                  </select>
                )}

                {/* Chips des collaborateurs sélectionnés */}
                {form.collabIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {form.collabIds.map(id => {
                      const co = collaborateurs.find(c => String(c.id) === String(id))
                      if (!co) return null
                      return (
                        <span key={id} className="flex items-center gap-1 pl-2 pr-1 py-0.5 bg-violet-50 border border-violet-200 rounded-lg text-[11px] text-violet-700 font-medium">
                          {co.nom}
                          <button type="button"
                            onClick={() => setForm(f => ({ ...f, collabIds: f.collabIds.filter(i => String(i) !== String(id)) }))}
                            className="w-4 h-4 flex items-center justify-center rounded hover:text-rose-500 transition-colors">
                            <X size={9} />
                          </button>
                        </span>
                      )
                    })}
                  </div>
                )}

                {/* Dropdown collaborateurs */}
                {collaborateurs.length > 0 && (
                  <select
                    className="input-field mb-2"
                    value=""
                    onChange={e => {
                      const id = e.target.value
                      if (!id || form.collabIds.map(String).includes(id)) return
                      setForm(f => ({ ...f, collabIds: [...f.collabIds, id] }))
                    }}
                  >
                    <option value="">Ajouter un collaborateur externe…</option>
                    {collaborateurs
                      .filter(c => !form.collabIds.map(String).includes(String(c.id)))
                      .map(c => (
                        <option key={c.id} value={String(c.id)}>
                          {c.nom}{c.specialite ? ` — ${c.specialite}` : ''}
                        </option>
                      ))
                    }
                  </select>
                )}

                {/* Texte libre pour autres participants */}
                <input
                  className="input-field"
                  placeholder="Autres participants (texte libre)"
                  value={form.personnesExtra}
                  onChange={e => setForm(f => ({ ...f, personnesExtra: e.target.value }))}
                />
              </div>
            )}

          </div>

          {/* Footer fixe — toujours visible */}
          <div className="px-6 py-4 border-t border-border flex gap-3 flex-shrink-0">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">
              Annuler
            </button>
            <button type="button" onClick={handleSubmit}
              className={`flex-1 justify-center ${isEdit ? 'btn-accent' : 'btn-primary'} flex items-center gap-2`}>
              <CheckCircle size={15} />
              {isEdit ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
