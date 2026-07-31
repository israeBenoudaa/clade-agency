import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Save, Share2, Heading1, Heading2, Heading3, Type,
  List, ListOrdered, Quote, Minus, ImagePlus, Link2,
  GripVertical, Trash2, ChevronUp, ChevronDown, Check, X,
  Eye, UserCheck, Plus,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'

// ── Block type config ────────────────────────────────────────────────────────

const BLOCK_TYPES = [
  { type: 'h1',       label: 'Titre 1',             icon: Heading1,    group: 'text' },
  { type: 'h2',       label: 'Titre 2',             icon: Heading2,    group: 'text' },
  { type: 'h3',       label: 'Titre 3',             icon: Heading3,    group: 'text' },
  { type: 'text',     label: 'Paragraphe',          icon: Type,        group: 'text' },
  { type: 'bullet',   label: 'Liste à puces',       icon: List,        group: 'text' },
  { type: 'numbered', label: 'Liste numérotée',     icon: ListOrdered, group: 'text' },
  { type: 'quote',    label: 'Citation',            icon: Quote,       group: 'text' },
  { type: 'divider',  label: 'Séparateur',          icon: Minus,       group: 'misc' },
  { type: 'image',    label: 'Image',               icon: ImagePlus,   group: 'media' },
  { type: 'link',     label: 'Lien',                icon: Link2,       group: 'media' },
]

const TEXT_TYPES = BLOCK_TYPES.filter(b => b.group === 'text').map(b => b.type)

function newBlock(type = 'text', extra = {}) {
  return { id: `blk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, type, content: '', url: '', caption: '', label: '', ...extra }
}

// ── Auto-resize helper ────────────────────────────────────────────────────────

function autoResize(el) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

// ── Suggestions helper ────────────────────────────────────────────────────────

function useCategoryAutocomplete(workflows) {
  return useMemo(() => {
    const s = new Set()
    workflows.forEach(w => { if (w.category) s.add(w.category) })
    return [...s].sort()
  }, [workflows])
}

// ── Block content style ───────────────────────────────────────────────────────

function blockTextClass(type) {
  switch (type) {
    case 'h1': return 'font-display text-3xl font-bold text-ink leading-tight'
    case 'h2': return 'font-display text-2xl font-semibold text-ink leading-snug'
    case 'h3': return 'font-semibold text-xl text-ink leading-snug'
    case 'quote': return 'italic text-muted border-l-4 border-electric/30 pl-4'
    case 'bullet': return 'text-sm text-ink'
    case 'numbered': return 'text-sm text-ink'
    default: return 'text-sm text-ink leading-relaxed'
  }
}

function blockPlaceholder(type) {
  switch (type) {
    case 'h1': return 'Titre 1'
    case 'h2': return 'Titre 2'
    case 'h3': return 'Titre 3'
    case 'bullet': return 'Élément de liste'
    case 'numbered': return 'Élément numéroté'
    case 'quote': return 'Citation…'
    default: return 'Écrivez quelque chose…'
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────────────────────────────────

export default function WorkflowEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile, isDirector, isDirectorMode, isDemoMode } = useAuth()
  const { workflows, addWorkflow, updateWorkflow, employes } = useData()

  const myId = String(profile?.id || '')
  const myEmpId = String(profile?.employe_id || '')
  const myNom = profile?.full_name || profile?.nom || ''
  const isDir = isDirector || isDirectorMode || isDemoMode
  const isNew = id === 'new'

  const existing = isNew ? null : workflows.find(w => w.id === id)
  const canEdit = isNew || isDir || String(existing?.createdById) === myId

  // Local editable state
  const [title, setTitle]     = useState(existing?.title || '')
  const [category, setCategory] = useState(existing?.category || '')
  const [blocks, setBlocks]   = useState(existing?.blocks?.length ? existing.blocks : [newBlock('text')])
  const [sharedWith, setSharedWith] = useState(existing?.sharedWith || [])
  const [saved, setSaved]     = useState(true)
  const [showShare, setShowShare] = useState(false)
  const [catSuggestions, setCatSuggestions] = useState(false)
  const allCategories = useCategoryAutocomplete(workflows)

  const blockRefs = useRef({})
  const saveTimerRef = useRef(null)

  // Redirect if workflow not found (not new)
  useEffect(() => {
    if (!isNew && !existing) navigate(-1)
  }, [isNew, existing, navigate])

  // Mark dirty on any change
  useEffect(() => { setSaved(false) }, [title, category, blocks, sharedWith])

  // Auto-save debounce
  const persistSave = useCallback(() => {
    const data = { title, category, blocks, sharedWith }
    if (isNew) {
      const newId = addWorkflow({ ...data, createdById: myId, createdByNom: myNom })
      setSaved(true)
      navigate(`/app/my-workflow/${newId}`, { replace: true })
    } else {
      updateWorkflow(id, data, { saveVersion: true, savedByNom: myNom })
      setSaved(true)
    }
  }, [title, category, blocks, sharedWith, isNew, id, myId, myNom, addWorkflow, updateWorkflow, navigate])

  useEffect(() => {
    if (saved) return
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(persistSave, 1200)
    return () => clearTimeout(saveTimerRef.current)
  }, [saved, persistSave])

  const handleSaveNow = () => {
    clearTimeout(saveTimerRef.current)
    persistSave()
    toast.success('Note sauvegardée')
  }

  // ── Block operations ────────────────────────────────────────────────────────

  const addBlockAfter = useCallback((afterId, type = 'text') => {
    const blk = newBlock(type)
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === afterId)
      const next = [...prev]
      next.splice(idx + 1, 0, blk)
      return next
    })
    setTimeout(() => {
      const el = blockRefs.current[blk.id]
      el?.focus()
    }, 30)
    return blk.id
  }, [])

  const addBlockAtEnd = useCallback((type = 'text') => {
    const blk = newBlock(type)
    setBlocks(prev => [...prev, blk])
    setTimeout(() => blockRefs.current[blk.id]?.focus(), 30)
  }, [])

  const updateBlock = useCallback((id, data) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...data } : b))
  }, [])

  const deleteBlock = useCallback((id) => {
    setBlocks(prev => {
      if (prev.length === 1) return [newBlock('text')]
      const idx = prev.findIndex(b => b.id === id)
      const next = prev.filter(b => b.id !== id)
      // Focus previous block
      const focusIdx = Math.max(0, idx - 1)
      setTimeout(() => {
        const prevEl = blockRefs.current[next[focusIdx]?.id]
        if (prevEl) {
          prevEl.focus()
          const len = prevEl.value?.length || 0
          prevEl.setSelectionRange(len, len)
        }
      }, 20)
      return next
    })
  }, [])

  const moveBlock = useCallback((id, dir) => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id)
      const next = [...prev]
      const swapIdx = dir === 'up' ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= next.length) return prev
      ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
      return next
    })
  }, [])

  const handleKeyDown = useCallback((e, block, index) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      addBlockAfter(block.id, 'text')
    }
    if (e.key === 'Backspace' && !block.content) {
      e.preventDefault()
      deleteBlock(block.id)
    }
    if (e.key === 'ArrowUp' && e.altKey) { e.preventDefault(); moveBlock(block.id, 'up') }
    if (e.key === 'ArrowDown' && e.altKey) { e.preventDefault(); moveBlock(block.id, 'down') }
  }, [addBlockAfter, deleteBlock, moveBlock])

  // ── Image upload ────────────────────────────────────────────────────────────

  const handleImageUpload = (blockId, file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => updateBlock(blockId, { url: e.target.result })
    reader.readAsDataURL(file)
  }

  // ── Share modal ─────────────────────────────────────────────────────────────

  const staffList = employes.filter(e => !myEmpId || String(e.id) !== myEmpId)

  const toggleShare = (empId) => {
    const sid = String(empId)
    setSharedWith(prev =>
      prev.includes(sid) ? prev.filter(x => x !== sid) : [...prev, sid]
    )
  }

  // ── Read-only mode ──────────────────────────────────────────────────────────

  if (!isNew && existing && !canEdit) {
    return <ReadOnlyView wf={existing} onBack={() => navigate(-1)} />
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-paper">
      {/* ── Top bar ── */}
      <div className="sticky top-0 z-20 bg-paper/90 backdrop-blur border-b border-border px-4 lg:px-10 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-xl flex items-center justify-center text-muted hover:text-ink hover:bg-paper-warm transition-colors flex-shrink-0">
          <ArrowLeft size={16} />
        </button>

        {/* Title */}
        <input
          type="text"
          placeholder="Titre de la note…"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="flex-1 min-w-0 font-display text-xl bg-transparent outline-none text-ink placeholder:text-muted/40"
        />

        {/* Save indicator */}
        <div className={`text-[10px] font-semibold transition-colors flex-shrink-0 ${saved ? 'text-emerald-500' : 'text-muted'}`}>
          {saved ? '✓ Sauvegardé' : 'Non sauvegardé'}
        </div>

        <button onClick={() => setShowShare(true)} className="btn-ghost text-xs flex-shrink-0">
          <Share2 size={13} />
          {sharedWith.length > 0 ? `Partagé (${sharedWith.length})` : 'Partager'}
        </button>

        <button onClick={handleSaveNow} className="btn-primary text-xs flex-shrink-0">
          <Save size={13} /> Enregistrer
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-4 lg:px-10 py-6">

        {/* Category */}
        <div className="mb-6 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted font-semibold flex-shrink-0">Catégorie</span>
            <input
              type="text"
              placeholder="Ex : Processus, Méthode…"
              value={category}
              onChange={e => { setCategory(e.target.value); setCatSuggestions(true) }}
              onFocus={() => setCatSuggestions(true)}
              onBlur={() => setTimeout(() => setCatSuggestions(false), 120)}
              className="text-xs bg-paper-warm border border-border rounded-lg px-3 py-1.5 outline-none focus:border-electric/50 text-ink placeholder:text-muted/40 w-44"
            />
            {category && (
              <button onClick={() => setCategory('')} className="text-muted hover:text-ink transition-colors">
                <X size={12} />
              </button>
            )}
          </div>
          {/* Suggestions en chips */}
          {catSuggestions && allCategories.filter(c => c !== category).length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pl-14">
              {allCategories
                .filter(c => c !== category && c.toLowerCase().includes(category.toLowerCase()))
                .slice(0, 8)
                .map(cat => (
                  <button
                    key={cat}
                    onMouseDown={() => { setCategory(cat); setCatSuggestions(false) }}
                    className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-paper-warm border border-border text-muted hover:border-electric/50 hover:text-electric hover:bg-electric/5 transition-colors"
                  >
                    {cat}
                  </button>
                ))
              }
            </div>
          )}
        </div>

        {/* ── Block toolbar ── */}
        <div className="sticky top-[57px] z-10 mb-4 flex items-center gap-1 flex-wrap bg-white/90 backdrop-blur border border-border rounded-2xl px-3 py-2 shadow-sm">
          {BLOCK_TYPES.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              onClick={() => addBlockAtEnd(type)}
              title={label}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-muted hover:text-electric hover:bg-electric/8 transition-colors text-xs font-semibold"
            >
              <Icon size={13} />
              <span className="hidden sm:inline">{
                type === 'h1' ? 'H1' :
                type === 'h2' ? 'H2' :
                type === 'h3' ? 'H3' :
                type === 'text' ? 'Texte' :
                type === 'bullet' ? 'Puce' :
                type === 'numbered' ? '1.' :
                type === 'quote' ? 'Citation' :
                type === 'divider' ? '——' :
                type === 'image' ? 'Image' :
                'Lien'
              }</span>
            </button>
          ))}
        </div>

        {/* ── Blocks ── */}
        <div className="space-y-1">
          {blocks.map((block, index) => (
            <BlockItem
              key={block.id}
              block={block}
              index={index}
              total={blocks.length}
              blockRef={el => { blockRefs.current[block.id] = el }}
              onUpdate={(data) => updateBlock(block.id, data)}
              onDelete={() => deleteBlock(block.id)}
              onMoveUp={() => moveBlock(block.id, 'up')}
              onMoveDown={() => moveBlock(block.id, 'down')}
              onKeyDown={(e) => handleKeyDown(e, block, index)}
              onAddAfter={(type) => addBlockAfter(block.id, type)}
              onImageUpload={(file) => handleImageUpload(block.id, file)}
            />
          ))}
        </div>

        {/* ── Add block button ── */}
        <button
          onClick={() => addBlockAtEnd('text')}
          className="mt-4 flex items-center gap-2 text-muted hover:text-electric text-xs font-semibold transition-colors py-3 px-2 rounded-xl hover:bg-electric/5 w-full"
        >
          <Plus size={14} /> Ajouter un bloc
        </button>
      </div>

      {/* ── Share modal ── */}
      <AnimatePresence>
        {showShare && (
          <ShareModal
            staffList={staffList}
            sharedWith={sharedWith}
            onToggle={toggleShare}
            onClose={() => setShowShare(false)}
            onSave={() => { handleSaveNow(); setShowShare(false) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Block Item ────────────────────────────────────────────────────────────────

function BlockItem({ block, index, total, blockRef, onUpdate, onDelete, onMoveUp, onMoveDown, onKeyDown, onAddAfter, onImageUpload }) {
  const [typeMenuOpen, setTypeMenuOpen] = useState(false)
  const textareaRef = useRef(null)

  const setRef = (el) => {
    textareaRef.current = el
    if (blockRef) blockRef(el)
  }

  useEffect(() => {
    if (textareaRef.current) autoResize(textareaRef.current)
  }, [block.content])

  if (block.type === 'divider') {
    return (
      <div className="group flex items-center gap-2 py-2">
        <hr className="flex-1 border-border" />
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-md text-muted hover:text-rose-500 hover:bg-rose-50 transition-all"
        >
          <Trash2 size={11} />
        </button>
      </div>
    )
  }

  if (block.type === 'image') {
    return (
      <div className="group relative rounded-xl overflow-hidden border border-border bg-paper-warm">
        {block.url ? (
          <div className="relative">
            <img src={block.url} alt={block.caption || ''} className="w-full max-h-96 object-contain bg-paper-warm" />
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <label className="w-7 h-7 rounded-lg bg-white/90 flex items-center justify-center cursor-pointer text-muted hover:text-electric shadow transition-colors">
                <ImagePlus size={13} />
                <input type="file" accept="image/*" className="hidden" onChange={e => onImageUpload(e.target.files[0])} />
              </label>
              <button onClick={onDelete} className="w-7 h-7 rounded-lg bg-white/90 flex items-center justify-center text-muted hover:text-rose-500 shadow transition-colors">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center gap-3 py-10 cursor-pointer hover:bg-paper transition-colors">
            <div className="w-12 h-12 rounded-xl bg-electric/10 flex items-center justify-center">
              <ImagePlus size={20} className="text-electric/50" />
            </div>
            <span className="text-xs text-muted font-semibold">Cliquer pour ajouter une image</span>
            <input type="file" accept="image/*" className="hidden" onChange={e => onImageUpload(e.target.files[0])} />
          </label>
        )}
        {block.url && (
          <textarea
            placeholder="Ajouter une légende…"
            value={block.caption}
            onChange={e => onUpdate({ caption: e.target.value })}
            className="w-full px-4 py-2 text-xs text-muted italic bg-transparent outline-none resize-none border-t border-border"
            rows={1}
          />
        )}
      </div>
    )
  }

  if (block.type === 'link') {
    return (
      <div className="group flex items-start gap-2 py-1">
        <BlockHandle
          block={block}
          index={index}
          total={total}
          typeMenuOpen={typeMenuOpen}
          onToggleMenu={() => setTypeMenuOpen(!typeMenuOpen)}
          onCloseMenu={() => setTypeMenuOpen(false)}
          onChangeType={(type) => { onUpdate({ type }); setTypeMenuOpen(false) }}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onDelete={onDelete}
        />
        <div className="flex-1 border border-border rounded-xl overflow-hidden bg-paper-warm">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50">
            <Link2 size={13} className="text-muted flex-shrink-0" />
            <input
              type="url"
              placeholder="https://…"
              value={block.url}
              onChange={e => onUpdate({ url: e.target.value })}
              className="flex-1 text-sm bg-transparent outline-none text-ink placeholder:text-muted/40"
            />
          </div>
          <input
            type="text"
            placeholder="Texte à afficher (optionnel)"
            value={block.label}
            onChange={e => onUpdate({ label: e.target.value })}
            className="w-full px-3 py-2 text-xs bg-transparent outline-none text-muted placeholder:text-muted/40"
          />
        </div>
      </div>
    )
  }

  // Text-based blocks
  const prefix = block.type === 'bullet' ? '• ' : null
  const TypeCfg = BLOCK_TYPES.find(t => t.type === block.type)
  const TypeIcon = TypeCfg?.icon || Type

  return (
    <div className="group flex items-start gap-2 py-0.5">
      <BlockHandle
        block={block}
        index={index}
        total={total}
        typeMenuOpen={typeMenuOpen}
        onToggleMenu={() => setTypeMenuOpen(!typeMenuOpen)}
        onCloseMenu={() => setTypeMenuOpen(false)}
        onChangeType={(type) => { onUpdate({ type }); setTypeMenuOpen(false) }}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onDelete={onDelete}
      />
      <div className={`flex-1 flex items-start gap-1.5 min-w-0 ${block.type === 'quote' ? 'border-l-4 border-electric/30 pl-3' : ''}`}>
        {block.type === 'bullet' && <span className="text-muted mt-0.5 flex-shrink-0 text-sm">•</span>}
        {block.type === 'numbered' && <span className="text-muted mt-0.5 flex-shrink-0 text-sm min-w-[20px]">1.</span>}
        <textarea
          ref={setRef}
          value={block.content}
          placeholder={blockPlaceholder(block.type)}
          onChange={e => { onUpdate({ content: e.target.value }); autoResize(e.target) }}
          onKeyDown={onKeyDown}
          onFocus={e => autoResize(e.target)}
          rows={1}
          className={`flex-1 bg-transparent outline-none resize-none overflow-hidden w-full placeholder:text-muted/30 ${blockTextClass(block.type)}`}
        />
      </div>
    </div>
  )
}

// ── Block handle (type selector + actions) ────────────────────────────────────

function BlockHandle({ block, index, total, typeMenuOpen, onToggleMenu, onCloseMenu, onChangeType, onMoveUp, onMoveDown, onDelete }) {
  const TypeCfg = BLOCK_TYPES.find(t => t.type === block.type)
  const TypeIcon = TypeCfg?.icon || Type

  return (
    <div className="relative flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex-shrink-0">
      {/* Move */}
      <div className="flex flex-col">
        <button
          onClick={onMoveUp}
          disabled={index === 0}
          className="w-5 h-4 flex items-center justify-center text-muted hover:text-ink disabled:opacity-20 transition-colors"
        >
          <ChevronUp size={10} />
        </button>
        <button
          onClick={onMoveDown}
          disabled={index === total - 1}
          className="w-5 h-4 flex items-center justify-center text-muted hover:text-ink disabled:opacity-20 transition-colors"
        >
          <ChevronDown size={10} />
        </button>
      </div>

      {/* Type button */}
      <button
        onClick={onToggleMenu}
        title="Changer le type de bloc"
        className="w-6 h-6 flex items-center justify-center rounded-md text-muted hover:text-electric hover:bg-electric/10 transition-colors"
      >
        <TypeIcon size={12} />
      </button>

      {/* Type dropdown */}
      <AnimatePresence>
        {typeMenuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={onCloseMenu} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.1 }}
              className="absolute left-0 top-8 z-20 bg-white border border-border rounded-xl shadow-2xl overflow-hidden w-48"
            >
              {BLOCK_TYPES.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => onChangeType(type)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors text-left ${block.type === type ? 'bg-electric/10 text-electric font-semibold' : 'text-ink hover:bg-paper-warm'}`}
                >
                  <Icon size={13} className="flex-shrink-0" />
                  {label}
                  {block.type === type && <Check size={11} className="ml-auto" />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="w-6 h-6 flex items-center justify-center rounded-md text-muted hover:text-rose-500 hover:bg-rose-50 transition-colors"
      >
        <Trash2 size={11} />
      </button>
    </div>
  )
}

// ── Share Modal ───────────────────────────────────────────────────────────────

function ShareModal({ staffList, sharedWith, onToggle, onClose, onSave }) {
  const [search, setSearch] = useState('')

  const filtered = staffList.filter(e =>
    e.nom?.toLowerCase().includes(search.toLowerCase()) ||
    e.poste?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
      >
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <div className="font-semibold text-ink">Partager la note</div>
            <div className="text-xs text-muted mt-0.5">Les utilisateurs auront un accès lecture seule</div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-paper-warm transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="p-3 border-b border-border">
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher un collaborateur…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full input-field py-2 text-xs pl-8"
            />
            <Eye size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto divide-y divide-border">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted">Aucun collaborateur trouvé</div>
          ) : filtered.map(emp => {
            const isShared = sharedWith.includes(String(emp.id))
            const initials = ((emp.prenom?.[0] || '') + (emp.nomFamille?.[0] || emp.nom?.[0] || '')).toUpperCase()
            return (
              <button
                key={emp.id}
                onClick={() => onToggle(emp.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-paper-warm transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-electric/20 flex items-center justify-center text-electric text-xs font-bold flex-shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink truncate">{emp.nom}</div>
                  <div className="text-[11px] text-muted truncate">{emp.poste}</div>
                </div>
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isShared ? 'bg-electric border-electric' : 'border-border'}`}>
                  {isShared && <Check size={11} className="text-white" />}
                </div>
              </button>
            )
          })}
        </div>

        <div className="p-4 border-t border-border flex gap-2">
          <button onClick={onClose} className="btn-ghost flex-1 justify-center text-xs">Annuler</button>
          <button onClick={onSave} className="btn-primary flex-1 justify-center text-xs">
            <UserCheck size={13} /> Enregistrer ({sharedWith.length} accès)
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Read-Only View ────────────────────────────────────────────────────────────

function ReadOnlyView({ wf, onBack }) {
  return (
    <div className="min-h-screen bg-paper">
      <div className="sticky top-0 z-20 bg-paper/90 backdrop-blur border-b border-border px-4 lg:px-10 py-3 flex items-center gap-3">
        <button onClick={onBack} className="w-8 h-8 rounded-xl flex items-center justify-center text-muted hover:text-ink hover:bg-paper-warm transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 font-display text-xl text-ink truncate">{wf.title || 'Sans titre'}</div>
        <span className="flex items-center gap-1.5 text-xs text-muted font-semibold px-3 py-1.5 bg-paper-warm border border-border rounded-full">
          <Eye size={12} /> Lecture seule
        </span>
      </div>

      {/* Protection anti-copie */}
      <div
        className="max-w-3xl mx-auto px-4 lg:px-10 py-8 space-y-2"
        style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
        onContextMenu={e => e.preventDefault()}
        onCopy={e => e.preventDefault()}
        onCut={e => e.preventDefault()}
      >
        {wf.category && (
          <div className="text-xs font-semibold text-electric mb-4">{wf.category}</div>
        )}

        {(wf.blocks || []).map(block => (
          <ReadOnlyBlock key={block.id} block={block} />
        ))}

        <div className="mt-10 pt-5 border-t border-border flex items-center gap-2 text-[10px] text-muted/60">
          <Eye size={11} />
          Ce contenu est partagé en lecture seule — la copie et l'export sont désactivés.
        </div>
      </div>
    </div>
  )
}

function ReadOnlyBlock({ block }) {
  if (block.type === 'divider') return <hr className="border-border my-2" />

  if (block.type === 'image') {
    return (
      <div className="rounded-xl overflow-hidden border border-border">
        {block.url && <img src={block.url} alt={block.caption || ''} className="w-full max-h-96 object-contain bg-paper-warm pointer-events-none" draggable={false} />}
        {block.caption && <p className="px-4 py-2 text-xs text-muted italic border-t border-border">{block.caption}</p>}
      </div>
    )
  }

  if (block.type === 'link') {
    return (
      <div className="border border-border rounded-xl overflow-hidden bg-paper-warm p-3 flex items-center gap-2">
        <Link2 size={13} className="text-electric flex-shrink-0" />
        <a href={block.url} target="_blank" rel="noopener noreferrer" className="text-sm text-electric hover:underline truncate">
          {block.label || block.url}
        </a>
      </div>
    )
  }

  if (!block.content) return null

  const className = blockTextClass(block.type)
  return (
    <div className={`${className} ${block.type === 'quote' ? 'border-l-4 border-electric/30 pl-3 py-1' : ''} ${block.type === 'bullet' ? 'flex items-start gap-2' : ''}`}>
      {block.type === 'bullet' && <span className="mt-1 text-muted">•</span>}
      <p style={{ whiteSpace: 'pre-wrap' }}>{block.content}</p>
    </div>
  )
}
