import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, X, Edit2, Trash2, Eye, EyeOff, ImageIcon,
  Globe, Filter, Search, GripVertical, Save, ChevronDown, Layers,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'

const TABLE = 'portfolio_projects'

const AXES = {
  C: { label: 'Conservation', color: 'text-blue-400',   dot: 'bg-blue-400'   },
  L: { label: 'Landscape',    color: 'text-emerald-400', dot: 'bg-emerald-400' },
  A: { label: 'Architecture', color: 'text-amber-400',  dot: 'bg-amber-400'   },
  D: { label: 'Design',       color: 'text-purple-400', dot: 'bg-purple-400'  },
  E: { label: 'Éphémère',     color: 'text-orange-400', dot: 'bg-orange-400'  },
}

const STATUTS = ['En conception', 'En cours', 'Livré', 'Démonté', 'Suspendu']

const EMPTY = {
  title: '', location: '', year: new Date().getFullYear().toString(),
  description: '', axis: 'A', programme: '', surface: '',
  statut: 'En cours', maitre_ouvrage: '', story: '',
  image_url: '', gallery: ['', ''], tags: '',
  span: 'normal', display_order: 0, visible: true,
}

function AxisBadge({ axis }) {
  const a = AXES[axis] || AXES.A
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-white/5 border border-white/10 ${a.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${a.dot}`} />
      {a.label}
    </span>
  )
}

/* ── Modal d'ajout / modification ──────────────────────────────────────────── */
function ProjectModal({ project, onClose, onSave }) {
  const [form, setForm] = useState(
    project
      ? { ...project, tags: (project.tags || []).join(', '), gallery: [...(project.gallery || ['', ''])] }
      : { ...EMPTY }
  )
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Le titre est obligatoire'); return }
    setSaving(true)

    const payload = {
      title:          form.title.trim(),
      location:       form.location.trim(),
      year:           form.year.trim(),
      description:    form.description.trim(),
      axis:           form.axis,
      programme:      form.programme.trim(),
      surface:        form.surface.trim(),
      statut:         form.statut,
      maitre_ouvrage: form.maitre_ouvrage.trim(),
      story:          form.story.trim(),
      image_url:      form.image_url.trim(),
      gallery:        form.gallery.filter(Boolean),
      tags:           form.tags.split(',').map(t => t.trim()).filter(Boolean),
      span:           form.span,
      display_order:  Number(form.display_order) || 0,
      visible:        form.visible,
    }

    let error, data
    if (project?.id) {
      ;({ error, data } = await supabase.from(TABLE).update(payload).eq('id', project.id).select())
    } else {
      ;({ error, data } = await supabase.from(TABLE).insert([payload]).select())
    }

    setSaving(false)
    if (error) {
      const msg = error.message?.includes('row-level security')
        ? 'Permission RLS bloquée. Dans Supabase SQL Editor :\nCREATE POLICY "admin_all" ON portfolio_projects FOR ALL TO authenticated USING (true) WITH CHECK (true);'
        : 'Erreur : ' + error.message
      toast.error(msg, { duration: 10000 })
      return
    }
    toast.success(project?.id ? 'Projet mis à jour' : 'Projet ajouté')
    onSave(data?.[0] || null)
  }

  const label  = 'block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5'
  const input  = 'dp-input'
  const select = 'dp-select'

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-start justify-end bg-ink/60 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="relative h-full w-full max-w-xl bg-slate-900 border-l border-slate-700/50 shadow-2xl overflow-y-auto"
        initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-700/50">
          <div>
            <h2 className="font-semibold text-slate-100">{project?.id ? 'Modifier le projet' : 'Nouveau projet'}</h2>
            <p className="text-xs text-slate-400 mt-0.5">Portfolio public — {project?.id ? 'mise à jour' : 'ajout'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 bg-electric text-ink text-xs font-semibold px-3 py-2 rounded-lg hover:bg-electric/90 transition disabled:opacity-50"
            >
              <Save size={13} />
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition">
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Identité */}
          <section>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Identité</h3>
            <div className="space-y-3">
              <div>
                <label className={label}>Titre *</label>
                <input className={input} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Villa contemporaine" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>Ville</label>
                  <input className={input} value={form.location} onChange={e => set('location', e.target.value)} placeholder="Casablanca" />
                </div>
                <div>
                  <label className={label}>Année</label>
                  <input className={input} value={form.year} onChange={e => set('year', e.target.value)} placeholder="2024" />
                </div>
              </div>
              <div>
                <label className={label}>Description courte</label>
                <textarea className={input} rows={3} style={{ resize: 'vertical', minHeight: 72 }} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Une ou deux phrases résumant le projet" />
              </div>
            </div>
          </section>

          {/* Catégorie & Affichage */}
          <section>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Catégorie & Affichage</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Discipline *</label>
                <div className="relative">
                  <select className={select} value={form.axis} onChange={e => set('axis', e.target.value)}>
                    {Object.entries(AXES).map(([k, a]) => (
                      <option key={k} value={k}>{a.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className={label}>Format grille</label>
                <div className="relative">
                  <select className={select} value={form.span} onChange={e => set('span', e.target.value)}>
                    <option value="normal">Normal (4 col)</option>
                    <option value="wide">Large (8 col)</option>
                    <option value="tall">Haut (2 lignes)</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className={label}>Ordre d'affichage</label>
                <input className={input} type="number" value={form.display_order} onChange={e => set('display_order', e.target.value)} min={0} />
              </div>
              <div>
                <label className={label}>Tags (séparés par virgule)</label>
                <input className={input} value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="Architecture, Luxe, Résidentiel" />
              </div>
            </div>
            <div className="mt-3">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <button
                  type="button"
                  onClick={() => set('visible', !form.visible)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${form.visible ? 'bg-electric' : 'bg-slate-600'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.visible ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
                <span className="text-sm text-slate-300">Visible sur le site</span>
              </label>
            </div>
          </section>

          {/* Programme & Fiche */}
          <section>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Fiche technique</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Programme</label>
                <input className={input} value={form.programme} onChange={e => set('programme', e.target.value)} placeholder="Hôtellerie boutique" />
              </div>
              <div>
                <label className={label}>Surface</label>
                <input className={input} value={form.surface} onChange={e => set('surface', e.target.value)} placeholder="3 500 m²" />
              </div>
              <div>
                <label className={label}>Statut</label>
                <div className="relative">
                  <select className={select} value={form.statut} onChange={e => set('statut', e.target.value)}>
                    {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className={label}>Maître d'ouvrage</label>
                <input className={input} value={form.maitre_ouvrage} onChange={e => set('maitre_ouvrage', e.target.value)} placeholder="Client privé" />
              </div>
            </div>
          </section>

          {/* Images */}
          <section>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Images</h3>
            <div className="space-y-3">
              <div>
                <label className={label}>Image principale (URL)</label>
                <input className={input} value={form.image_url} onChange={e => set('image_url', e.target.value)} placeholder="https://images.unsplash.com/..." />
                {form.image_url && (
                  <div className="mt-2 h-28 rounded-lg overflow-hidden border border-slate-700">
                    <img src={form.image_url} alt="" className="w-full h-full object-cover" onError={e => e.target.style.display='none'} />
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={label + ' mb-0'}>Galerie ({form.gallery.length} image{form.gallery.length !== 1 ? 's' : ''})</label>
                  <button
                    type="button"
                    onClick={() => set('gallery', [...form.gallery, ''])}
                    className="flex items-center gap-1 text-xs text-electric hover:text-white transition px-2 py-1 rounded border border-electric/30 hover:border-electric/70"
                  >
                    <Plus size={11} /> Ajouter
                  </button>
                </div>
                <div className="space-y-2">
                  {form.gallery.map((url, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        className={input}
                        value={url}
                        onChange={e => {
                          const g = [...form.gallery]
                          g[i] = e.target.value
                          set('gallery', g)
                        }}
                        placeholder={`Image galerie ${i + 1} — URL`}
                      />
                      {url && (
                        <div className="w-10 h-10 rounded flex-shrink-0 overflow-hidden border border-slate-700">
                          <img src={url} alt="" className="w-full h-full object-cover" onError={e => e.target.style.display='none'} />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => set('gallery', form.gallery.filter((_, j) => j !== i))}
                        className="flex-shrink-0 w-7 h-7 rounded flex items-center justify-center text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Histoire */}
          <section>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Histoire du projet</h3>
            <div>
              <label className={label}>Récit (paragraphes séparés par une ligne vide)</label>
              <textarea
                className={input}
                rows={10}
                style={{ resize: 'vertical', minHeight: 180 }}
                value={form.story}
                onChange={e => set('story', e.target.value)}
                placeholder={"Premier paragraphe en grand (Instrument Serif).\n\nDeuxième paragraphe en texte normal.\n\nTroisième paragraphe..."}
              />
              <p className="text-xs text-slate-500 mt-1.5">Le 1er paragraphe apparaît en grand dans la page projet.</p>
            </div>
          </section>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ── Confirmation suppression ───────────────────────────────────────────────── */
function DeleteModal({ project, onConfirm, onClose }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-sm p-6"
        initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center mb-4">
          <Trash2 size={18} className="text-rose-400" />
        </div>
        <h3 className="font-semibold text-slate-100 mb-1">Supprimer le projet</h3>
        <p className="text-sm text-slate-400 mb-6">«&nbsp;{project.title}&nbsp;» sera définitivement supprimé du portfolio public.</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 text-sm text-slate-300 border border-slate-700 rounded-lg hover:bg-slate-800 transition">Annuler</button>
          <button onClick={onConfirm} className="flex-1 py-2 text-sm font-semibold text-white bg-rose-500 rounded-lg hover:bg-rose-600 transition">Supprimer</button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ── Page principale ────────────────────────────────────────────────────────── */
export default function PortfolioPage() {
  const navigate     = useNavigate()
  const [projects,   setProjects]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [axisFilter, setAxisFilter] = useState(null)
  const [modal,      setModal]      = useState(null)
  const [toDelete,   setToDelete]   = useState(null)

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('display_order', { ascending: true })
    if (!error) {
      setProjects(data || [])
    } else {
      const msg = error.code === '42P01'
        ? 'Table introuvable — exécutez le SQL dans Supabase d\'abord'
        : 'Erreur de chargement : ' + error.message
      toast.error(msg, { id: 'portfolio-load-error' })
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleDelete = async () => {
    const { error } = await supabase.from(TABLE).delete().eq('id', toDelete.id)
    if (error) { toast.error('Erreur : ' + error.message); return }
    toast.success('Projet supprimé')
    setToDelete(null)
    load()
  }

  const toggleVisible = async (project) => {
    const { error } = await supabase.from(TABLE).update({ visible: !project.visible }).eq('id', project.id)
    if (!error) {
      setProjects(ps => ps.map(p => p.id === project.id ? { ...p, visible: !p.visible } : p))
      toast.success(project.visible ? 'Projet masqué' : 'Projet visible')
    }
  }

  const filtered = projects.filter(p => {
    const matchAxis   = !axisFilter || p.axis === axisFilter
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.location?.toLowerCase().includes(search.toLowerCase())
    return matchAxis && matchSearch
  })

  const stats = {
    total:   projects.length,
    visible: projects.filter(p => p.visible).length,
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Globe size={16} className="text-electric" />
            <span className="text-xs font-semibold text-electric uppercase tracking-wider">Portfolio Public</span>
          </div>
          <h1 className="text-2xl font-bold text-ink">Projets du site</h1>
          <p className="text-sm text-muted mt-1">
            {stats.visible} visible{stats.visible > 1 ? 's' : ''} · {stats.total} au total
          </p>
        </div>
        <button
          onClick={() => setModal({ type: 'add' })}
          className="flex items-center gap-2 bg-electric text-ink text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-electric/90 active:scale-95 transition-all"
        >
          <Plus size={15} />
          Nouveau projet
        </button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3 mb-6 bg-paper-warm border border-border rounded-xl p-3">
        <div className="relative flex-1 min-w-44">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="input-field w-full pl-8 py-1.5 text-sm"
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setAxisFilter(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${!axisFilter ? 'bg-electric text-ink' : 'bg-paper border border-border text-muted hover:text-ink'}`}
          >
            Tous
          </button>
          {Object.entries(AXES).map(([k, a]) => (
            <button
              key={k}
              onClick={() => setAxisFilter(axisFilter === k ? null : k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${axisFilter === k ? 'bg-electric text-ink' : 'bg-paper border border-border text-muted hover:text-ink'}`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-muted text-sm">Chargement...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted">
          <ImageIcon size={32} className="opacity-30" />
          <p className="text-sm">{search || axisFilter ? 'Aucun résultat' : 'Aucun projet — commencez par en ajouter un.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence initial={false}>
            {filtered.map(project => (
              <motion.div
                key={project.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-paper-warm border border-border rounded-xl overflow-hidden hover:border-electric/30 transition-colors group"
              >
                {/* Thumbnail */}
                <div className="relative h-36 bg-slate-100 overflow-hidden">
                  {project.image_url ? (
                    <img
                      src={project.image_url}
                      alt={project.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon size={24} className="text-slate-300" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  {!project.visible && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-xs text-white/70 font-semibold uppercase tracking-wider">Masqué</span>
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <AxisBadge axis={project.axis} />
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => toggleVisible(project)}
                      title={project.visible ? 'Masquer' : 'Afficher'}
                      className="w-7 h-7 rounded-md bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition"
                    >
                      {project.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                    </button>
                    <button
                      onClick={() => setModal({ type: 'edit', project })}
                      title="Modifier (formulaire)"
                      className="w-7 h-7 rounded-md bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => setToDelete(project)}
                      className="w-7 h-7 rounded-md bg-rose-500/70 backdrop-blur-sm flex items-center justify-center text-white hover:bg-rose-600/80 transition"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Bouton édition visuelle */}
                  <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/60 to-transparent">
                    <button
                      onClick={() => navigate(`/app/portfolio/${project.id}/editor`)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-white/90 text-slate-900 text-[10px] font-semibold uppercase tracking-wider hover:bg-white transition"
                    >
                      <Layers size={11} />
                      Éditer visuellement
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-ink text-sm leading-tight mb-1 truncate">{project.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span>{project.location}</span>
                    {project.year && <><span>·</span><span>{project.year}</span></>}
                  </div>
                  {project.surface && (
                    <div className="mt-2 text-xs text-muted">{project.surface}</div>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      project.statut === 'Livré'        ? 'bg-emerald-50 text-emerald-600' :
                      project.statut === 'En cours'     ? 'bg-electric/10 text-electric'    :
                      project.statut === 'En conception' ? 'bg-blue-50 text-blue-600'        :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {project.statut || 'En cours'}
                    </span>
                    <span className="text-[10px] text-muted">#{project.display_order}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {modal?.type === 'add'  && <ProjectModal onClose={() => setModal(null)} onSave={(saved) => {
          setModal(null)
          if (saved) setProjects(ps => [...ps, saved])
          load()
        }} />}
        {modal?.type === 'edit' && <ProjectModal project={modal.project} onClose={() => setModal(null)} onSave={(saved) => {
          setModal(null)
          if (saved) setProjects(ps => ps.map(p => p.id === saved.id ? saved : p))
          load()
        }} />}
        {toDelete && <DeleteModal project={toDelete} onConfirm={handleDelete} onClose={() => setToDelete(null)} />}
      </AnimatePresence>
    </div>
  )
}
