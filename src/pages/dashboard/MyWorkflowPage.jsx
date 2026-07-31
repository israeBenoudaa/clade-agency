import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, BookOpen, Clock, Tag, Share2, Lock,
  Pencil, X, ChevronDown, Check,
} from 'lucide-react'

const CAT_COLORS = [
  '2563EB', '059669', 'D97706', 'DC2626',
  '7C3AED', '0891B2', 'BE185D', '15803D',
]
function catHex(idx) { return CAT_COLORS[idx % CAT_COLORS.length] }

function CatSelect({ allCategories, value, onChange, wrapClass = 'flex-shrink-0' }) {
  const [open, setOpen] = useState(false)
  const selIdx = allCategories.indexOf(value)
  const selColor = selIdx >= 0 ? `#${catHex(selIdx)}` : null

  return (
    <div className={`relative ${wrapClass}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="input-field py-2.5 pl-3 pr-8 text-sm flex items-center gap-2 w-full sm:min-w-[170px] cursor-pointer"
      >
        {selColor
          ? <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: selColor }} />
          : <span className="w-2.5 h-2.5 rounded-full bg-border flex-shrink-0" />
        }
        <span className="flex-1 text-left truncate" style={selColor ? { color: selColor, fontWeight: 600 } : {}}>
          {value || 'Toutes les catégories'}
        </span>
        <ChevronDown size={12} className="text-muted flex-shrink-0 absolute right-2.5" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              className="absolute top-full mt-1.5 left-0 z-20 bg-white border border-border rounded-xl shadow-2xl overflow-hidden min-w-full"
            >
              <button
                onClick={() => { onChange(''); setOpen(false) }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors text-left ${!value ? 'bg-paper-warm font-semibold text-ink' : 'text-muted hover:bg-paper-warm/70'}`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-border/80 flex-shrink-0" />
                Toutes les catégories
                {!value && <Check size={12} className="ml-auto text-muted" />}
              </button>
              <div className="border-t border-border/60" />
              {allCategories.map((cat, idx) => {
                const color = `#${catHex(idx)}`
                const isActive = value === cat
                return (
                  <button
                    key={cat}
                    onClick={() => { onChange(cat); setOpen(false) }}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors text-left ${isActive ? 'bg-paper-warm' : 'hover:bg-paper-warm/70'}`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="flex-1" style={{ color: isActive ? color : undefined, fontWeight: isActive ? 600 : undefined }}>
                      {cat}
                    </span>
                    {isActive && <Check size={12} className="ml-auto flex-shrink-0" style={{ color }} />}
                  </button>
                )
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
import toast from 'react-hot-toast'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'

const TYPE_COLORS = {
  h1: 'font-display text-3xl font-bold',
  h2: 'font-display text-2xl font-bold',
  h3: 'font-semibold text-lg',
  text: '',
  bullet: '',
  numbered: '',
  quote: 'italic',
}

function firstTextPreview(blocks = []) {
  for (const b of blocks) {
    if (b.type === 'image') return null
    if (b.type === 'divider') continue
    if (b.content?.trim()) return b.content.trim()
  }
  return null
}

function dateLabel(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return 'À l\'instant'
  if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`
  if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)}h`
  if (diff < 604800000) return `Il y a ${Math.floor(diff / 86400000)}j`
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function MyWorkflowPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { workflows } = useData()

  const myId = String(profile?.id || '')
  const myEmpId = String(profile?.employe_id || '')
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')

  const myWorkflows = useMemo(() =>
    workflows.filter(w => String(w.createdById) === myId && !w.deletedAt),
    [workflows, myId]
  )

  const sharedWithMe = useMemo(() =>
    workflows.filter(w =>
      String(w.createdById) !== myId &&
      !w.deletedAt &&
      (w.sharedWith || []).map(String).includes(myEmpId)
    ),
    [workflows, myId, myEmpId]
  )

  const allCategories = useMemo(() => {
    const cats = new Set()
    ;[...myWorkflows, ...sharedWithMe].forEach(w => { if (w.category) cats.add(w.category) })
    return [...cats].sort()
  }, [myWorkflows, sharedWithMe])

  const filterList = (list) => list.filter(w => {
    const q = search.toLowerCase()
    const matchSearch = !q || w.title?.toLowerCase().includes(q) ||
      (w.blocks || []).some(b => b.content?.toLowerCase().includes(q))
    const matchCat = !filterCat || w.category === filterCat
    return matchSearch && matchCat
  })

  const filteredMine = filterList(myWorkflows)
  const filteredShared = filterList(sharedWithMe)

  return (
    <div className="p-4 lg:p-10 space-y-8">

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        {/* Search + Nouveau (toujours sur la même ligne) */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 min-w-0">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher une note…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field pl-9 py-2.5 text-sm w-full"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink">
                <X size={12} />
              </button>
            )}
          </div>
          <button onClick={() => navigate('/app/my-workflow/new')} className="btn-primary text-sm flex-shrink-0">
            <Plus size={14} /> <span className="hidden sm:inline">Nouvelle note</span>
          </button>
        </div>

        {/* Catégorie : pleine largeur mobile, auto desktop */}
        {allCategories.length > 0 && (
          <CatSelect
            allCategories={allCategories}
            value={filterCat}
            onChange={setFilterCat}
            wrapClass="w-full sm:w-auto sm:flex-shrink-0"
          />
        )}
      </div>

      {/* ── Mes notes ── */}
      <section>
        {filteredMine.length === 0 && myWorkflows.length === 0 ? (
          <div className="card p-8 sm:p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-electric/10 flex items-center justify-center mx-auto mb-4">
              <BookOpen size={28} className="text-electric/50" />
            </div>
            <div className="font-display text-2xl text-ink mb-2">Aucune note pour l'instant</div>
            <p className="text-sm text-muted mb-6 max-w-xs mx-auto">
              Créez votre première note pour documenter vos workflows, processus et ressources.
            </p>
            <button onClick={() => navigate('/app/my-workflow/new')} className="btn-primary mx-auto">
              <Plus size={14} /> Créer une note
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredMine.map((wf, i) => (
              <WorkflowCard
                key={wf.id}
                wf={wf}
                index={i}
                canEdit
                onOpen={() => navigate(`/app/my-workflow/${wf.id}`)}
                onEdit={() => navigate(`/app/my-workflow/${wf.id}`)}
              />
            ))}
            {/* Add card */}
            <motion.button
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: filteredMine.length * 0.04 }}
              onClick={() => navigate('/app/my-workflow/new')}
              className="border-2 border-dashed border-border rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-muted hover:text-electric hover:border-electric/40 hover:bg-electric/5 transition-all min-h-[160px] cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl border-2 border-current flex items-center justify-center">
                <Plus size={18} />
              </div>
              <span className="text-sm font-semibold">Nouvelle note</span>
            </motion.button>
          </div>
        )}
      </section>

      {/* ── Partagées avec moi ── */}
      {filteredShared.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Share2 size={14} className="text-muted" />
            <h2 className="text-sm font-semibold text-ink">Partagées avec moi</h2>
            <span className="text-xs text-muted">({filteredShared.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredShared.map((wf, i) => (
              <WorkflowCard
                key={wf.id}
                wf={wf}
                index={i}
                canEdit={false}
                onOpen={() => navigate(`/app/my-workflow/${wf.id}`)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function WorkflowCard({ wf, index, canEdit, onOpen, onEdit }) {
  const preview = firstTextPreview(wf.blocks)
  const imageBlock = (wf.blocks || []).find(b => b.type === 'image' && b.url)
  const blockCount = (wf.blocks || []).filter(b => b.type !== 'divider').length

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      onClick={onOpen}
      className="card group relative flex flex-col cursor-pointer hover:shadow-md hover:border-electric/20 transition-all overflow-hidden min-h-[180px]"
    >
      {/* Cover image */}
      {imageBlock && (
        <div className="h-28 overflow-hidden bg-paper-warm border-b border-border">
          <img src={imageBlock.url} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="flex flex-col flex-1 p-4">
        {/* Category + shared badge */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {wf.category && (
            <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-electric/10 text-electric">
              <Tag size={9} /> {wf.category}
            </span>
          )}
          {!canEdit && (
            <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-paper-warm text-muted border border-border">
              <Lock size={9} /> Lecture seule
            </span>
          )}
        </div>

        {/* Title */}
        <div className="font-semibold text-ink text-sm leading-snug mb-1 line-clamp-2">
          {wf.title || <span className="text-muted italic">Sans titre</span>}
        </div>

        {/* Preview */}
        {preview && (
          <p className="text-xs text-muted line-clamp-3 flex-1 leading-relaxed">{preview}</p>
        )}
        {!preview && blockCount > 0 && (
          <p className="text-xs text-muted italic flex-1">
            {blockCount} bloc{blockCount !== 1 ? 's' : ''}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border">
          <div className="flex items-center gap-1.5 text-[10px] text-muted min-w-0">
            <Clock size={10} className="flex-shrink-0" />
            <span className="truncate">{dateLabel(wf.updatedAt || wf.createdAt)}</span>
          </div>
          {canEdit && (
            <button
              onClick={e => { e.stopPropagation(); onEdit?.() }}
              className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity w-6 h-6 rounded-md flex items-center justify-center text-muted hover:text-ink hover:bg-paper-warm"
            >
              <Pencil size={11} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
