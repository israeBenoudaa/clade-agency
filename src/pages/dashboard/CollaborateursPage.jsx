import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Building2, Mail, Phone, MapPin, Pencil, Trash2,
  Network, X, Check, ChevronDown,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useData } from '../../context/DataContext'
import NouveauCollaborateurModal, { VILLES_MAROC } from '../../components/NouveauCollaborateurModal'
import SelectField from '../../components/SelectField'

// Palette tournante pour les badges de catégorie
const CAT_PALETTE = [
  { bg: 'bg-blue-100',    text: 'text-blue-700',    ring: 'ring-blue-300',    active: 'bg-blue-600 text-white' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-300', active: 'bg-emerald-600 text-white' },
  { bg: 'bg-violet-100',  text: 'text-violet-700',  ring: 'ring-violet-300',  active: 'bg-violet-600 text-white' },
  { bg: 'bg-amber-100',   text: 'text-amber-700',   ring: 'ring-amber-300',   active: 'bg-amber-600 text-white' },
  { bg: 'bg-rose-100',    text: 'text-rose-700',    ring: 'ring-rose-300',    active: 'bg-rose-600 text-white' },
  { bg: 'bg-cyan-100',    text: 'text-cyan-700',    ring: 'ring-cyan-300',    active: 'bg-cyan-600 text-white' },
]

function catColor(idx) {
  return CAT_PALETTE[idx % CAT_PALETTE.length]
}

export default function CollaborateursPage() {
  const {
    categoriesCollab, collaborateurs,
    addCategorieCollab, deleteCategorieCollab,
    deleteCollaborateur,
  } = useData()

  const [selectedCatId, setSelectedCatId] = useState(null) // null = toutes
  const [filterVille, setFilterVille] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingCollab, setEditingCollab] = useState(null)

  // Inline add category
  const [addingCat, setAddingCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const catInputRef = useRef(null)

  useEffect(() => {
    if (addingCat) catInputRef.current?.focus()
  }, [addingCat])

  // ── Filtered & sorted list ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = selectedCatId
      ? collaborateurs.filter(c => c.categorieId === selectedCatId)
      : collaborateurs
    if (filterVille) list = list.filter(c => c.ville === filterVille)
    return [...list].sort((a, b) => (a.ville || '').localeCompare(b.ville || '', 'fr'))
  }, [collaborateurs, selectedCatId, filterVille])

  // Cities present in the current category filter
  const villesPresentes = useMemo(() => {
    const base = selectedCatId
      ? collaborateurs.filter(c => c.categorieId === selectedCatId)
      : collaborateurs
    return [...new Set(base.map(c => c.ville).filter(Boolean))].sort()
  }, [collaborateurs, selectedCatId])

  const selectedCat = categoriesCollab.find(c => c.id === selectedCatId)

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleAddCat = () => {
    const name = newCatName.trim()
    if (!name) { setAddingCat(false); return }
    if (categoriesCollab.some(c => c.nom.toLowerCase() === name.toLowerCase())) {
      toast.error('Cette catégorie existe déjà')
      return
    }
    addCategorieCollab(name)
    setNewCatName('')
    setAddingCat(false)
    toast.success(`Catégorie "${name}" ajoutée`)
  }

  const handleDeleteCat = (cat) => {
    const count = collaborateurs.filter(c => c.categorieId === cat.id).length
    const msg = count > 0
      ? `Supprimer "${cat.nom}" et ses ${count} collaborateur${count > 1 ? 's' : ''} ?`
      : `Supprimer la catégorie "${cat.nom}" ?`
    toast((t) => (
      <div className="flex items-center gap-3">
        <span className="text-sm">{msg}</span>
        <button
          onClick={() => {
            if (selectedCatId === cat.id) setSelectedCatId(null)
            deleteCategorieCollab(cat.id)
            toast.dismiss(t.id)
            toast.success('Catégorie supprimée')
          }}
          className="text-xs bg-rose-500 text-white px-3 py-1.5 rounded-lg font-semibold flex-shrink-0">
          Supprimer
        </button>
        <button onClick={() => toast.dismiss(t.id)} className="text-xs text-muted flex-shrink-0">
          Annuler
        </button>
      </div>
    ), { duration: 6000 })
  }

  const handleDeleteCollab = (c) => {
    toast((t) => (
      <div className="flex items-center gap-3">
        <span className="text-sm truncate max-w-[180px]">
          Supprimer <strong>{c.nomSociete}</strong> ?
        </span>
        <button
          onClick={() => { deleteCollaborateur(c.id); toast.dismiss(t.id); toast.success('Collaborateur supprimé') }}
          className="text-xs bg-rose-500 text-white px-3 py-1.5 rounded-lg font-semibold flex-shrink-0">
          Supprimer
        </button>
        <button onClick={() => toast.dismiss(t.id)} className="text-xs text-muted flex-shrink-0">
          Annuler
        </button>
      </div>
    ), { duration: 6000 })
  }

  const openEdit = (c) => { setEditingCollab(c); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditingCollab(null) }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 lg:p-10 space-y-6">

      {/* ── Catégories ── */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="font-semibold text-sm text-ink flex items-center gap-2">
            <Network size={15} className="text-muted" />
            Catégories de prestataires
          </div>

          {addingCat ? (
            <div className="flex items-center gap-2">
              <input
                ref={catInputRef}
                type="text"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); handleAddCat() }
                  if (e.key === 'Escape') { setAddingCat(false); setNewCatName('') }
                }}
                placeholder="Nom de la catégorie…"
                className="input-field py-1.5 text-xs w-44"
              />
              <button onClick={handleAddCat}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-electric/10 text-electric hover:bg-electric/20 transition-colors">
                <Check size={13} />
              </button>
              <button onClick={() => { setAddingCat(false); setNewCatName('') }}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:bg-paper-warm transition-colors">
                <X size={13} />
              </button>
            </div>
          ) : (
            <button onClick={() => setAddingCat(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-electric hover:text-electric/70 transition-colors">
              <Plus size={13} /> Nouvelle catégorie
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {/* "Toutes" chip */}
          <button
            onClick={() => { setSelectedCatId(null); setFilterVille('') }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
              selectedCatId === null
                ? 'bg-ink text-paper shadow-sm'
                : 'bg-paper-warm text-muted hover:text-ink hover:bg-white border border-border'
            }`}>
            Toutes
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
              selectedCatId === null ? 'bg-white/20' : 'bg-ink/10'
            }`}>
              {collaborateurs.length}
            </span>
          </button>

          {categoriesCollab.map((cat, idx) => {
            const count = collaborateurs.filter(c => c.categorieId === cat.id).length
            const isActive = selectedCatId === cat.id
            const pal = catColor(idx)
            return (
              <div key={cat.id} className="relative group/cat">
                <button
                  onClick={() => { setSelectedCatId(isActive ? null : cat.id); setFilterVille('') }}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all pr-8 ${
                    isActive
                      ? `${pal.active} shadow-sm`
                      : `${pal.bg} ${pal.text} hover:ring-2 ${pal.ring}`
                  }`}>
                  {cat.nom}
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                    isActive ? 'bg-white/25' : 'bg-white/60'
                  }`}>
                    {count}
                  </span>
                </button>
                {/* Delete category button */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteCat(cat) }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-md opacity-0 group-hover/cat:opacity-100 transition-opacity text-current hover:bg-black/10">
                  <X size={10} />
                </button>
              </div>
            )
          })}

          {categoriesCollab.length === 0 && !addingCat && (
            <span className="text-xs text-muted italic">
              Aucune catégorie. Cliquez sur "Nouvelle catégorie" pour commencer.
            </span>
          )}
        </div>
      </div>

      {/* ── Liste des collaborateurs ── */}
      <div className="card p-5 lg:p-7">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
          <div>
            <div className="label-text mb-0.5">
              {selectedCat ? selectedCat.nom : 'Tous les prestataires'}
            </div>
            <div className="font-display text-xl text-ink">
              {filtered.length} collaborateur{filtered.length !== 1 ? 's' : ''}
              {filterVille && <span className="text-base text-muted"> · {filterVille}</span>}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* City filter */}
            <SelectField
              value={filterVille}
              onChange={v => setFilterVille(v)}
              options={[
                { value: '', label: 'Toutes les villes' },
                ...villesPresentes.map(v => ({ value: v, label: v })),
              ]}
              className="min-w-[160px]"
            />
            <button onClick={() => { setEditingCollab(null); setShowModal(true) }} className="btn-primary">
              <Plus size={14} /> <span className="hidden sm:inline">Nouveau</span>
            </button>
          </div>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-14 text-muted text-sm border border-dashed border-border rounded-2xl">
            {collaborateurs.length === 0
              ? 'Aucun collaborateur. Cliquez sur "Nouveau collaborateur" pour commencer.'
              : 'Aucun prestataire dans cette sélection.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((c, i) => {
              const catIdx = categoriesCollab.findIndex(cat => cat.id === c.categorieId)
              const pal = catColor(catIdx >= 0 ? catIdx : 0)
              const catObj = categoriesCollab.find(cat => cat.id === c.categorieId)
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.18 }}
                  className="bg-paper-warm border border-border rounded-2xl p-4 hover:shadow-md hover:bg-white transition-all group relative"
                >
                  {/* Actions */}
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(c)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-paper-warm transition-colors">
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => handleDeleteCollab(c)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-rose-500 hover:bg-rose-50 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Header */}
                  <div className="flex items-start gap-3 mb-3 pr-14">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-base flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #0A1E3F, #3B82F6)' }}>
                      {c.nomSociete?.[0]?.toUpperCase() || <Building2 size={16} />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-ink leading-tight truncate">
                        {c.nomSociete}
                      </div>
                      {catObj && (
                        <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-md ${pal.bg} ${pal.text}`}>
                          {catObj.nom}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Contact info */}
                  <div className="space-y-1.5 mb-3">
                    {c.ville && (
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <MapPin size={12} className="flex-shrink-0 text-electric" />
                        <span className="font-medium text-ink">{c.ville}</span>
                        {c.adresse && <span className="truncate">— {c.adresse}</span>}
                      </div>
                    )}
                    {c.telephone && (
                      <a href={`tel:${c.telephone}`}
                        className="flex items-center gap-2 text-xs text-muted hover:text-ink transition-colors">
                        <Phone size={12} className="flex-shrink-0 text-electric" />
                        <span>{c.telephone}</span>
                      </a>
                    )}
                    {c.email && (
                      <a href={`mailto:${c.email}`}
                        className="flex items-center gap-2 text-xs text-muted hover:text-ink transition-colors">
                        <Mail size={12} className="flex-shrink-0 text-electric" />
                        <span className="truncate">{c.email}</span>
                      </a>
                    )}
                  </div>

                  {/* Prestations */}
                  {c.prestations && (
                    <div className="border-t border-border/60 pt-3">
                      <p className="text-xs text-muted leading-relaxed line-clamp-3">
                        {c.prestations}
                      </p>
                    </div>
                  )}

                  {/* Notes badge */}
                  {c.notes && (
                    <div className="mt-2 px-2.5 py-1.5 bg-amber-50 border border-amber-100 rounded-lg text-[10px] text-amber-700 leading-snug">
                      {c.notes}
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {showModal && (
        <NouveauCollaborateurModal existing={editingCollab} onClose={closeModal} />
      )}
    </div>
  )
}
