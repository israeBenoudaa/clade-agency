import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Building2, Mail, Phone, MapPin, Pencil, Trash2,
  Network, X, Check, ChevronDown, Globe, Search, SlidersHorizontal,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useData } from '../../context/DataContext'
import NouveauCollaborateurModal from '../../components/NouveauCollaborateurModal'
import SelectField from '../../components/SelectField'

const CAT_COLORS = [
  { dot: '#3B82F6', pill: 'bg-blue-100',    text: 'text-blue-700' },
  { dot: '#10B981', pill: 'bg-emerald-100', text: 'text-emerald-700' },
  { dot: '#8B5CF6', pill: 'bg-violet-100',  text: 'text-violet-700' },
  { dot: '#F59E0B', pill: 'bg-amber-100',   text: 'text-amber-700' },
  { dot: '#EF4444', pill: 'bg-rose-100',    text: 'text-rose-700' },
  { dot: '#06B6D4', pill: 'bg-cyan-100',    text: 'text-cyan-700' },
]
function catColor(idx) { return CAT_COLORS[idx % CAT_COLORS.length] }

function norm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// ── Category dropdown ──────────────────────────────────────────────────────────
function CatDropdown({ categories, collaborateurs, value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const selectedIdx = value ? categories.findIndex(c => c.id === value) : -1
  const selected = selectedIdx >= 0 ? categories[selectedIdx] : null
  const selectedColor = selectedIdx >= 0 ? catColor(selectedIdx) : null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all min-w-[200px] bg-white ${
          open
            ? 'border-electric/50 shadow-[0_0_0_3px_rgba(59,130,246,0.08)]'
            : 'border-border hover:border-ink/25'
        }`}>
        {selected ? (
          <>
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: selectedColor.dot }} />
            <span className="flex-1 text-left text-ink truncate text-xs">{selected.nom}</span>
          </>
        ) : (
          <>
            <Network size={12} className="text-muted flex-shrink-0" />
            <span className="flex-1 text-left text-muted text-xs">Toutes les catégories</span>
          </>
        )}
        <ChevronDown size={12} className={`text-muted transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full left-0 mt-1.5 w-72 bg-white border border-border rounded-2xl shadow-xl z-50 overflow-hidden"
          >
            {/* All */}
            <button
              onClick={() => { onChange(null); setOpen(false) }}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-xs hover:bg-paper-warm transition-colors ${
                !value ? 'bg-paper-warm font-semibold text-ink' : 'text-ink/70'
              }`}>
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-ink/20" />
                <span>Toutes les catégories</span>
              </div>
              <span className="text-[11px] bg-ink/10 text-muted px-2 py-0.5 rounded-full">{collaborateurs.length}</span>
            </button>

            <div className="border-t border-border/50 max-h-72 overflow-y-auto">
              {categories.map((cat, idx) => {
                const count = collaborateurs.filter(c => c.categorieId === cat.id).length
                const col = catColor(idx)
                const isActive = value === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => { onChange(cat.id); setOpen(false) }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-xs hover:bg-paper-warm transition-colors ${
                      isActive ? 'bg-paper-warm' : ''
                    }`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: col.dot }} />
                      <span className={`truncate ${isActive ? 'font-semibold text-ink' : 'text-ink/80'}`}>{cat.nom}</span>
                    </div>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${
                      isActive ? `${col.pill} ${col.text}` : 'bg-ink/10 text-muted'
                    }`}>{count}</span>
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function CollaborateursPage() {
  const {
    categoriesCollab, collaborateurs, supaLoaded,
    addCategorieCollab, deleteCategorieCollab,
    deleteCollaborateur,
  } = useData()

  const [selectedCatId, setSelectedCatId] = useState(null)
  const [filterVille, setFilterVille] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingCollab, setEditingCollab] = useState(null)
  const [showManageCats, setShowManageCats] = useState(false)

  const [addingCat, setAddingCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const catInputRef = useRef(null)
  useEffect(() => { if (addingCat) catInputRef.current?.focus() }, [addingCat])

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = selectedCatId
      ? collaborateurs.filter(c => c.categorieId === selectedCatId)
      : collaborateurs
    if (filterVille) list = list.filter(c => c.ville === filterVille)
    if (searchQuery.trim()) {
      const q = norm(searchQuery.trim())
      list = list.filter(c =>
        norm(c.nomSociete).includes(q) ||
        norm(c.specialite).includes(q) ||
        norm(c.prestations).includes(q) ||
        norm(c.notes).includes(q) ||
        norm(c.ville).includes(q) ||
        norm(c.adresse).includes(q)
      )
    }
    return [...list].sort((a, b) => (a.ville || '').localeCompare(b.ville || '', 'fr'))
  }, [collaborateurs, selectedCatId, filterVille, searchQuery])

  const villesPresentes = useMemo(() => {
    const base = selectedCatId
      ? collaborateurs.filter(c => c.categorieId === selectedCatId)
      : collaborateurs
    return [...new Set(base.map(c => c.ville).filter(Boolean))].sort()
  }, [collaborateurs, selectedCatId])

  const selectedCat = categoriesCollab.find(c => c.id === selectedCatId)

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleAddCat = () => {
    const name = newCatName.trim()
    if (!name) { setAddingCat(false); return }
    if (categoriesCollab.some(c => c.nom.toLowerCase() === name.toLowerCase())) {
      toast.error('Cette catégorie existe déjà'); return
    }
    addCategorieCollab(name)
    setNewCatName(''); setAddingCat(false)
    toast.success(`Catégorie "${name}" ajoutée`)
  }

  const handleDeleteCat = (cat) => {
    const count = collaborateurs.filter(c => c.categorieId === cat.id).length
    const msg = count > 0
      ? `Supprimer "${cat.nom}" et ses ${count} collaborateur${count > 1 ? 's' : ''} ?`
      : `Supprimer "${cat.nom}" ?`
    toast((t) => (
      <div className="flex items-center gap-3">
        <span className="text-sm">{msg}</span>
        <button onClick={() => {
          if (selectedCatId === cat.id) setSelectedCatId(null)
          deleteCategorieCollab(cat.id)
          toast.dismiss(t.id)
          toast.success('Catégorie supprimée')
        }} className="text-xs bg-rose-500 text-white px-3 py-1.5 rounded-lg font-semibold flex-shrink-0">
          Supprimer
        </button>
        <button onClick={() => toast.dismiss(t.id)} className="text-xs text-muted flex-shrink-0">Annuler</button>
      </div>
    ), { duration: 6000 })
  }

  const handleDeleteCollab = (c) => {
    toast((t) => (
      <div className="flex flex-col gap-2.5 min-w-0">
        <span className="text-sm">Supprimer <strong>{c.nomSociete}</strong> ?</span>
        <div className="flex items-center gap-2">
          <button onClick={() => {
            deleteCollaborateur(c.id); toast.dismiss(t.id); toast.success('Collaborateur supprimé')
          }} className="text-xs bg-rose-500 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-rose-600">
            Supprimer
          </button>
          <button onClick={() => toast.dismiss(t.id)} className="text-xs text-muted">Annuler</button>
        </div>
      </div>
    ), { duration: 6000 })
  }

  const openEdit = (c) => { setEditingCollab(c); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditingCollab(null) }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 lg:p-10 space-y-6">
      <div className="card p-5 lg:p-7">

        {/* ── Toolbar ── */}
        <div className="flex flex-col gap-3 mb-5">
          <div className="flex items-center gap-2.5 flex-wrap">

            {/* Search */}
            <div className="relative flex-1 min-w-[220px]">
              <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom, prestation, ville…"
                className="input-field pl-9 pr-8 py-2.5 text-xs w-full"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full text-muted hover:text-ink hover:bg-paper-warm transition-colors">
                  <X size={11} />
                </button>
              )}
            </div>

            {/* Category dropdown */}
            <CatDropdown
              categories={categoriesCollab}
              collaborateurs={collaborateurs}
              value={selectedCatId}
              onChange={(id) => { setSelectedCatId(id); setFilterVille('') }}
            />

            {/* City */}
            <SelectField
              value={filterVille}
              onChange={v => setFilterVille(v)}
              options={[
                { value: '', label: 'Toutes les villes' },
                ...villesPresentes.map(v => ({ value: v, label: v })),
              ]}
              className="min-w-[150px]"
            />

            {/* New button */}
            <button
              onClick={() => { setEditingCollab(null); setShowModal(true) }}
              className="btn-primary flex-shrink-0">
              <Plus size={14} />
              <span className="hidden sm:inline">Nouveau</span>
            </button>
          </div>
        </div>

        {/* ── Count + active filters ── */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="font-display text-xl text-ink">
              {filtered.length} collaborateur{filtered.length !== 1 ? 's' : ''}
              {filterVille && <span className="text-base text-muted font-sans font-normal"> · {filterVille}</span>}
            </div>
            {(selectedCatId || searchQuery) && (
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {selectedCatId && (
                  <button onClick={() => setSelectedCatId(null)}
                    className="flex items-center gap-1 text-xs bg-electric/10 text-electric px-2 py-0.5 rounded-full hover:bg-electric/20 transition-colors">
                    {selectedCat?.nom}
                    <X size={9} />
                  </button>
                )}
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')}
                    className="flex items-center gap-1 text-xs bg-ink/8 text-muted px-2 py-0.5 rounded-full hover:bg-ink/15 transition-colors">
                    «{searchQuery}»
                    <X size={9} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Manage categories toggle */}
          <button
            onClick={() => setShowManageCats(o => !o)}
            className={`flex items-center gap-1.5 text-xs font-medium transition-colors px-2.5 py-1.5 rounded-lg ${
              showManageCats
                ? 'bg-electric/10 text-electric'
                : 'text-muted hover:text-ink hover:bg-paper-warm'
            }`}>
            <SlidersHorizontal size={12} />
            Catégories
          </button>
        </div>

        {/* ── Manage categories panel ── */}
        <AnimatePresence>
          {showManageCats && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="mb-5 p-4 bg-paper-warm rounded-2xl border border-border/60">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold text-muted uppercase tracking-wide">Gérer les catégories</span>
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
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:bg-white transition-colors">
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setAddingCat(true)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-electric hover:text-electric/70 transition-colors">
                      <Plus size={12} /> Nouvelle catégorie
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {categoriesCollab.map((cat, idx) => {
                    const count = collaborateurs.filter(c => c.categorieId === cat.id).length
                    const col = catColor(idx)
                    return (
                      <div key={cat.id} className="relative group/cat">
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold pr-7 ${col.pill} ${col.text}`}>
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: col.dot }} />
                          {cat.nom}
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white/60">{count}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteCat(cat)}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded opacity-0 group-hover/cat:opacity-100 transition-opacity hover:bg-black/10">
                          <X size={9} />
                        </button>
                      </div>
                    )
                  })}
                  {categoriesCollab.length === 0 && !addingCat && (
                    <span className="text-xs text-muted italic">Aucune catégorie.</span>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Grid ── */}
        {!supaLoaded && collaborateurs.length === 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-paper-warm border border-border rounded-2xl p-4 animate-pulse">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl bg-border flex-shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3 bg-border rounded w-2/3" />
                    <div className="h-2.5 bg-border rounded w-1/3" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-2.5 bg-border rounded w-1/2" />
                  <div className="h-2.5 bg-border rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14 text-muted text-sm border border-dashed border-border rounded-2xl">
            {searchQuery
              ? `Aucun résultat pour « ${searchQuery} »`
              : collaborateurs.length === 0
                ? 'Aucun collaborateur. Cliquez sur "Nouveau" pour commencer.'
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
                  transition={{ delay: i * 0.02, duration: 0.15 }}
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
                      <div className="text-sm font-semibold text-ink leading-tight truncate">{c.nomSociete}</div>
                      {catObj && (
                        <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-md ${pal.pill} ${pal.text}`}>
                          {catObj.nom}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="space-y-1.5 mb-3">
                    {(c.ville || c.adresse) && (
                      <div className="flex items-start gap-2 text-xs text-muted">
                        <MapPin size={12} className="flex-shrink-0 text-electric mt-0.5" />
                        <div className="min-w-0">
                          {c.ville && <span className="font-medium text-ink">{c.ville}</span>}
                          {c.adresse && (() => {
                            const query = [c.adresse, c.ville, 'Maroc'].filter(Boolean).join(', ')
                            const href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
                            return (
                              <a href={href} target="_blank" rel="noopener noreferrer"
                                className="block truncate text-muted hover:text-electric transition-colors mt-0.5">
                                {c.adresse}
                              </a>
                            )
                          })()}
                        </div>
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
                    {c.siteWeb && (
                      <a href={c.siteWeb.startsWith('http') ? c.siteWeb : `https://${c.siteWeb}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-muted hover:text-ink transition-colors">
                        <Globe size={12} className="flex-shrink-0 text-electric" />
                        <span className="truncate">{c.siteWeb.replace(/^https?:\/\//, '')}</span>
                      </a>
                    )}
                  </div>

                  {/* Prestations */}
                  {c.prestations && (
                    <div className="border-t border-border/60 pt-3">
                      <p className="text-xs text-muted leading-relaxed line-clamp-3">{c.prestations}</p>
                    </div>
                  )}

                  {/* Notes */}
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
