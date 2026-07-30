import { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, Tag, Clock, User, Share2, Pencil, Trash2,
  X, BookOpen, ChevronDown, FileDown, Eye, EyeOff, Lock, Check,
  RotateCcw, AlertTriangle, History,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  ShadingType, BorderStyle, Table, TableRow, TableCell, WidthType,
  HeadingLevel,
} from 'docx'
import { useData } from '../../context/DataContext'
import SelectField from '../../components/SelectField'
import { useAuth } from '../../context/AuthContext'

// Category color palette (hex without #)
const CAT_COLORS = [
  '2563EB', '059669', 'D97706', 'DC2626',
  '7C3AED', '0891B2', 'BE185D', '15803D',
]
function catHex(idx) { return CAT_COLORS[idx % CAT_COLORS.length] }

// ── Helpers ──────────────────────────────────────────────────────────────────

function dateLabel(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function dateShort(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const now = new Date()
  const diff = now - d
  if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`
  if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)}h`
  if (diff < 604800000) return `Il y a ${Math.floor(diff / 86400000)}j`
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

function firstPreview(blocks = []) {
  for (const b of blocks) {
    if (b.content?.trim()) return b.content.trim()
    if (b.type === 'link' && b.url) return b.label || b.url
  }
  return null
}

// ── Word generation ───────────────────────────────────────────────────────────

async function generateWordDoc(workflows) {
  const grouped = new Map()
  const withoutCat = []

  for (const wf of workflows) {
    const cat = wf.category?.trim() || ''
    if (!cat) { withoutCat.push(wf); continue }
    if (!grouped.has(cat)) grouped.set(cat, [])
    grouped.get(cat).push(wf)
  }

  const sortedCats = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b, 'fr'))
  if (withoutCat.length) sortedCats.push(['Sans catégorie', withoutCat])

  const children = []

  // ── Cover page ──
  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'CATALOGUE DES PROCESSUS', bold: true, size: 52, color: '0A1E3F', font: 'Calibri' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 3000, after: 600 },
    }),
    new Paragraph({
      children: [new TextRun({ text: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }), color: '64748B', size: 22 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `${workflows.length} processus · ${sortedCats.length} catégorie${sortedCats.length !== 1 ? 's' : ''}`, color: '94A3B8', size: 20 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 3000 },
    }),
    new Paragraph({ pageBreakBefore: true, children: [] }),
  )

  sortedCats.forEach(([cat, wfs], catIdx) => {
    const hex = catHex(catIdx)

    // ── Category tab (colored full-width bar) ──
    if (catIdx > 0) {
      children.push(new Paragraph({ pageBreakBefore: true, children: [], spacing: { after: 0 } }))
    }
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideH: { style: BorderStyle.NONE }, insideV: { style: BorderStyle.NONE } },
        rows: [new TableRow({
          children: [new TableCell({
            shading: { type: ShadingType.SOLID, fill: hex, color: hex },
            children: [new Paragraph({
              children: [new TextRun({ text: `  ${cat.toUpperCase()}`, bold: true, color: 'FFFFFF', size: 28, font: 'Calibri' })],
              spacing: { before: 160, after: 160 },
            })],
            width: { size: 100, type: WidthType.PERCENTAGE },
          })],
        })],
      })
    )
    children.push(new Paragraph({ children: [], spacing: { after: 200 } }))

    wfs.forEach((wf, wfIdx) => {
      // Process title
      children.push(
        new Paragraph({
          children: [new TextRun({ text: wf.title || 'Sans titre', bold: true, size: 30, color: '0A1E3F', font: 'Calibri' })],
          spacing: { before: wfIdx === 0 ? 200 : 600, after: 100 },
        }),
        new Paragraph({
          children: [new TextRun({ text: `Créé par ${wf.createdByNom || 'Inconnu'}   ·   ${dateLabel(wf.createdAt)}${wf.updatedAt && wf.updatedAt !== wf.createdAt ? `   ·   Modifié ${dateShort(wf.updatedAt)}` : ''}`, color: '94A3B8', size: 18 })],
          spacing: { after: 200 },
        }),
      )

      // Blocks
      for (const block of (wf.blocks || [])) {
        if (!block.content && block.type !== 'divider' && block.type !== 'image' && block.type !== 'link') continue

        if (block.type === 'divider') {
          children.push(new Paragraph({
            children: [],
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' } },
            spacing: { before: 160, after: 160 },
          }))
        } else if (block.type === 'h1') {
          children.push(new Paragraph({ children: [new TextRun({ text: block.content, bold: true, size: 34, color: '0A1E3F' })], spacing: { before: 280, after: 80 } }))
        } else if (block.type === 'h2') {
          children.push(new Paragraph({ children: [new TextRun({ text: block.content, bold: true, size: 28, color: '1E3A5F' })], spacing: { before: 220, after: 60 } }))
        } else if (block.type === 'h3') {
          children.push(new Paragraph({ children: [new TextRun({ text: block.content, bold: true, size: 24, color: '334155' })], spacing: { before: 160, after: 60 } }))
        } else if (block.type === 'bullet') {
          children.push(new Paragraph({ children: [new TextRun({ text: `• ${block.content}`, size: 22, color: '1E293B' })], spacing: { before: 40, after: 40 }, indent: { left: 360 } }))
        } else if (block.type === 'numbered') {
          children.push(new Paragraph({ children: [new TextRun({ text: block.content, size: 22, color: '1E293B' })], spacing: { before: 40, after: 40 }, indent: { left: 360 } }))
        } else if (block.type === 'quote') {
          children.push(new Paragraph({
            children: [new TextRun({ text: block.content, italics: true, color: '64748B', size: 22 })],
            indent: { left: 500 },
            border: { left: { style: BorderStyle.THICK, size: 12, color: hex } },
            spacing: { before: 160, after: 160 },
          }))
        } else if (block.type === 'link') {
          children.push(new Paragraph({ children: [new TextRun({ text: block.label || block.url, color: '2563EB', size: 22 })], spacing: { before: 60, after: 60 } }))
        } else if (block.type === 'image') {
          children.push(new Paragraph({ children: [new TextRun({ text: '[Image]', color: '94A3B8', italics: true, size: 20 })], spacing: { before: 80, after: 80 } }))
        } else if (block.content) {
          children.push(new Paragraph({ children: [new TextRun({ text: block.content, size: 22, color: '1E293B' })], spacing: { before: 60, after: 60 } }))
        }
      }

      // Separator between processes (not after last)
      if (wfIdx < wfs.length - 1) {
        children.push(new Paragraph({ children: [], border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: 'CBD5E1' } }, spacing: { before: 400, after: 0 } }))
      }
    })
  })

  const doc = new Document({ sections: [{ properties: {}, children }] })
  return Packer.toBlob(doc)
}

// ── Custom category select with color dots ────────────────────────────────────

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
              {/* All */}
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

// ────────────────────────────────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────────────────────────────────

export default function GestionWorkflowPage() {
  const navigate = useNavigate()
  const { profile, isDirector, isDirectorMode, isDemoMode } = useAuth()
  const { workflows, deleteWorkflow, restoreWorkflow, permanentDeleteWorkflow, restoreWorkflowVersion } = useData()

  const myId = String(profile?.id || '')
  const isDir = isDirector || isDirectorMode || isDemoMode

  const [search, setSearch]       = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterUser, setFilterUser] = useState('')

  // History modal state
  const [historyWf, setHistoryWf] = useState(null)

  // Export modal state
  const [showExport, setShowExport]   = useState(false)
  const [exportPwd, setExportPwd]     = useState('')
  const [showPwd, setShowPwd]         = useState(false)
  const [pwdError, setPwdError]       = useState('')
  const [exporting, setExporting]     = useState(false)

  const allCategories = useMemo(() => {
    const s = new Set()
    workflows.forEach(w => { if (w.category) s.add(w.category) })
    return [...s].sort()
  }, [workflows])

  const creators = useMemo(() => {
    const map = new Map()
    workflows.forEach(w => { if (w.createdById) map.set(w.createdById, w.createdByNom || w.createdById) })
    return [...map.entries()].map(([id, nom]) => ({ id, nom })).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
  }, [workflows])

  const activeWorkflows = useMemo(() => workflows.filter(w => !w.deletedAt), [workflows])
  const trashedWorkflows = useMemo(() => {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    return workflows
      .filter(w => w.deletedAt && new Date(w.deletedAt) > cutoff)
      .sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt))
  }, [workflows])

  const filtered = useMemo(() => {
    return activeWorkflows.filter(w => {
      const q = search.toLowerCase()
      const matchSearch = !q ||
        w.title?.toLowerCase().includes(q) ||
        w.category?.toLowerCase().includes(q) ||
        w.createdByNom?.toLowerCase().includes(q) ||
        (w.blocks || []).some(b => b.content?.toLowerCase().includes(q))
      const matchCat = !filterCat || w.category === filterCat
      const matchUser = !filterUser || String(w.createdById) === filterUser
      return matchSearch && matchCat && matchUser
    }).sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
  }, [activeWorkflows, search, filterCat, filterUser])

  const handleDelete = (wf) => {
    const canDel = isDir || String(wf.createdById) === myId
    if (!canDel) return
    toast((t) => (
      <div className="flex items-center gap-3">
        <span className="text-sm">Supprimer <strong>{wf.title || 'cette note'}</strong> ?</span>
        <button
          onClick={() => { deleteWorkflow(wf.id); toast.dismiss(t.id); toast.success('Note supprimée') }}
          className="text-xs bg-rose-500 text-white px-3 py-1.5 rounded-lg font-semibold flex-shrink-0">
          Supprimer
        </button>
        <button onClick={() => toast.dismiss(t.id)} className="text-xs text-muted flex-shrink-0">Annuler</button>
      </div>
    ), { duration: 6000 })
  }

  const handleExport = async () => {
    if (exportPwd !== import.meta.env.VITE_DIRECTOR_PWD) {
      setPwdError('Mot de passe incorrect')
      return
    }
    setPwdError('')
    setExporting(true)
    try {
      const blob = await generateWordDoc(filtered.length > 0 ? filtered : workflows)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `processus_${new Date().toISOString().slice(0, 10)}.docx`
      a.click()
      URL.revokeObjectURL(url)
      setShowExport(false)
      setExportPwd('')
      toast.success('Document exporté avec succès')
    } catch (e) {
      console.error(e)
      toast.error('Erreur lors de la génération du document')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="p-4 lg:p-10 space-y-5">

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        {/* Ligne 1 : recherche + bouton Nouveau (toujours ensemble) */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 min-w-0">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher…"
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
          {/* Bouton Nouveau : icône seule sur mobile */}
          <button onClick={() => navigate('/app/my-workflow/new')} className="btn-primary flex-shrink-0 text-sm sm:hidden">
            <Plus size={14} />
          </button>
        </div>

        {/* Ligne 2 : filtres + actions desktop */}
        <div className="flex items-center gap-2 flex-wrap">
          <CatSelect allCategories={allCategories} value={filterCat} onChange={setFilterCat} wrapClass="flex-1 sm:flex-none sm:flex-shrink-0" />

          {creators.length > 1 && (
            <SelectField
              value={filterUser}
              onChange={v => setFilterUser(v)}
              options={[
                { value: '', label: 'Tous les auteurs' },
                ...creators.map(c => ({ value: c.id, label: c.nom })),
              ]}
              className="flex-1 sm:flex-none sm:min-w-[170px]"
            />
          )}

          <div className="hidden sm:block w-px h-7 bg-border flex-shrink-0" />

          {isDir && (
            <button
              onClick={() => { setShowExport(true); setExportPwd(''); setPwdError('') }}
              className="btn-ghost text-xs flex-shrink-0"
              title="Exporter en Word"
            >
              <FileDown size={14} /> <span className="hidden sm:inline">Export Word</span><span className="sm:hidden">Export</span>
            </button>
          )}

          {/* Bouton Nouvelle note desktop */}
          <button onClick={() => navigate('/app/my-workflow/new')} className="hidden sm:flex btn-primary flex-shrink-0 text-sm">
            <Plus size={14} /> Nouvelle note
          </button>
        </div>
      </div>

      {/* Active filters summary */}
      {(filterCat || filterUser || search) && (
        <div className="flex items-center gap-2 text-xs text-muted flex-wrap">
          <span>{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</span>
          <button
            onClick={() => { setFilterCat(''); setFilterUser(''); setSearch('') }}
            className="flex items-center gap-1 text-rose-500 hover:text-rose-700 font-semibold"
          >
            <X size={11} /> Réinitialiser
          </button>
        </div>
      )}

      {/* ── List ── */}
      {filtered.length === 0 ? (
        <div className="card p-8 sm:p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-electric/10 flex items-center justify-center mx-auto mb-3">
            <BookOpen size={24} className="text-electric/50" />
          </div>
          <div className="font-display text-xl text-ink mb-1">
            {activeWorkflows.length === 0 ? 'Aucun processus créé' : 'Aucun résultat'}
          </div>
          <p className="text-xs text-muted">
            {activeWorkflows.length === 0
              ? 'Les notes créées par les collaborateurs apparaîtront ici.'
              : 'Modifiez vos filtres pour voir d\'autres résultats.'}
          </p>
        </div>
      ) : (
        <div className="card divide-y divide-border overflow-hidden">
          {filtered.map((wf, i) => {
            const preview = firstPreview(wf.blocks)
            const sharedCount = (wf.sharedWith || []).length
            const canEditThis = isDir || String(wf.createdById) === myId
            const catIdx = allCategories.indexOf(wf.category)
            const catColor = catIdx >= 0 ? `#${catHex(catIdx)}` : '#64748B'

            return (
              <motion.div
                key={wf.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.025 }}
                className="flex items-start gap-3 sm:gap-4 px-3 sm:px-5 py-3 sm:py-4 hover:bg-paper-warm/60 transition-colors group"
              >
                {/* Color dot / icon */}
                <div className="hidden sm:flex w-9 h-9 rounded-xl items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${catColor}18` }}>
                  <BookOpen size={16} style={{ color: catColor }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap mb-0.5">
                    <button
                      onClick={() => navigate(`/app/workflow/${wf.id}`)}
                      className="font-semibold text-ink text-sm hover:text-electric transition-colors leading-snug text-left"
                    >
                      {wf.title || <span className="italic text-muted">Sans titre</span>}
                    </button>
                    {wf.category && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${catColor}15`, color: catColor }}>
                        <Tag size={9} /> {wf.category}
                      </span>
                    )}
                    {sharedCount > 0 && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Share2 size={9} /> {sharedCount} accès
                      </span>
                    )}
                  </div>

                  {preview && <p className="text-xs text-muted line-clamp-1 mb-1.5">{preview}</p>}

                  <div className="flex items-center gap-4 text-[10px] text-muted flex-wrap">
                    <span className="flex items-center gap-1"><User size={10} />{wf.createdByNom || 'Inconnu'}</span>
                    <span className="flex items-center gap-1"><Clock size={10} />Créé le {dateLabel(wf.createdAt)}</span>
                    {wf.updatedAt && wf.updatedAt !== wf.createdAt && (
                      <span className="flex items-center gap-1 text-amber-600"><Clock size={10} />Modifié {dateShort(wf.updatedAt)}</span>
                    )}
                    <span>{(wf.blocks || []).length} bloc{(wf.blocks || []).length !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 sm:gap-1.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={() => navigate(`/app/workflow/${wf.id}`)}
                    className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold text-muted hover:text-electric hover:bg-electric/10 transition-colors"
                  >
                    <Pencil size={12} /><span className="hidden sm:inline">{canEditThis ? 'Modifier' : 'Voir'}</span>
                  </button>
                  {isDir && (wf.versions || []).length > 0 && (
                    <button
                      onClick={() => setHistoryWf(wf)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-muted hover:text-violet-600 hover:bg-violet-50 transition-colors"
                      title="Historique des versions"
                    >
                      <History size={12} />
                      {(wf.versions || []).length}
                    </button>
                  )}
                  {(isDir || String(wf.createdById) === myId) && (
                    <button onClick={() => handleDelete(wf)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-rose-500 hover:bg-rose-50 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* ── Corbeille (directeur uniquement) ── */}
      {isDir && trashedWorkflows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Trash2 size={14} className="text-rose-400" />
            <span className="text-sm font-semibold text-ink">Corbeille</span>
            <span className="text-xs text-muted">({trashedWorkflows.length} note{trashedWorkflows.length !== 1 ? 's' : ''} — suppression définitive dans 30 jours)</span>
          </div>
          <div className="card divide-y divide-border overflow-hidden border-rose-100">
            {trashedWorkflows.map((wf) => {
              const daysLeft = Math.max(0, 30 - Math.floor((Date.now() - new Date(wf.deletedAt)) / 86400000))
              return (
                <div key={wf.id} className="flex items-center gap-4 px-5 py-3 bg-rose-50/40 group">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
                    <BookOpen size={14} className="text-rose-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ink/60 truncate line-through">{wf.title || 'Sans titre'}</div>
                    <div className="flex items-center gap-3 text-[10px] text-muted mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1"><User size={10} />{wf.createdByNom || 'Inconnu'}</span>
                      {wf.category && <span className="flex items-center gap-1"><Tag size={10} />{wf.category}</span>}
                      <span className={`font-semibold ${daysLeft <= 3 ? 'text-rose-500' : daysLeft <= 7 ? 'text-amber-600' : 'text-muted'}`}>
                        {daysLeft === 0 ? 'Suppression imminente' : `J-${daysLeft} avant suppression`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { restoreWorkflow(wf.id); toast.success('Note restaurée') }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-600 hover:bg-emerald-50 transition-colors"
                    >
                      <RotateCcw size={12} /> Restaurer
                    </button>
                    <button
                      onClick={() => {
                        toast((t) => (
                          <div className="flex items-center gap-3">
                            <AlertTriangle size={14} className="text-rose-500 flex-shrink-0" />
                            <span className="text-sm">Suppression définitive ?</span>
                            <button
                              onClick={() => { permanentDeleteWorkflow(wf.id); toast.dismiss(t.id); toast.success('Supprimé définitivement') }}
                              className="text-xs bg-rose-500 text-white px-3 py-1.5 rounded-lg font-semibold flex-shrink-0"
                            >
                              Confirmer
                            </button>
                            <button onClick={() => toast.dismiss(t.id)} className="text-xs text-muted flex-shrink-0">Annuler</button>
                          </div>
                        ), { duration: 8000 })
                      }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Version history modal ── */}
      <AnimatePresence>
        {historyWf && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && setHistoryWf(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]"
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3 flex-shrink-0">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center">
                      <History size={13} className="text-violet-600" />
                    </div>
                    <span className="font-semibold text-ink text-sm">Historique des versions</span>
                  </div>
                  <p className="text-xs text-muted truncate max-w-xs">{historyWf.title || 'Sans titre'}</p>
                </div>
                <button onClick={() => setHistoryWf(null)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-paper-warm transition-colors flex-shrink-0">
                  <X size={15} />
                </button>
              </div>

              {/* Info banner */}
              <div className="mx-5 mt-3 flex-shrink-0 flex items-start gap-2 p-3 rounded-xl bg-violet-50 border border-violet-100">
                <AlertTriangle size={13} className="text-violet-500 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-violet-700 leading-relaxed">
                  Restaurer une version écrase le contenu actuel. La version actuelle est automatiquement sauvegardée avant la restauration.
                </p>
              </div>

              {/* Current version */}
              <div className="mx-5 mt-3 flex-shrink-0">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Version actuelle</div>
                <div className="flex items-center gap-3 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-ink truncate">{historyWf.title || 'Sans titre'}</div>
                    <div className="text-[10px] text-muted">{dateShort(historyWf.updatedAt || historyWf.createdAt)} · {(historyWf.blocks || []).length} blocs</div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 flex-shrink-0">EN LIGNE</span>
                </div>
              </div>

              {/* Version list */}
              <div className="overflow-y-auto flex-1 px-5 pt-3 pb-5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">
                  {(historyWf.versions || []).length} jour{(historyWf.versions || []).length !== 1 ? 's' : ''} d'historique · 1 snapshot / jour
                </div>
                <div className="space-y-2">
                  {(historyWf.versions || []).map((v, i) => {
                    const blockCount = (v.blocks || []).length
                    const date = new Date(v.savedAt)
                    const isBeforeRestore = v.savedByNom === '(avant restauration)'
                    return (
                      <div key={v.versionId} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border hover:border-violet-200 hover:bg-violet-50/40 transition-colors group">
                        <div className="flex flex-col items-center flex-shrink-0">
                          <div className={`w-2 h-2 rounded-full ${isBeforeRestore ? 'bg-amber-400' : 'bg-border'}`} />
                          {i < (historyWf.versions || []).length - 1 && <div className="w-px h-4 bg-border mt-1" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-ink truncate">{v.title || 'Sans titre'}</div>
                          <div className="flex items-center gap-2 text-[10px] text-muted flex-wrap mt-0.5">
                            <span>{date.toLocaleDateString('fr-FR')} à {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                            {v.savedByNom && <span className="truncate">· {v.savedByNom}</span>}
                            <span>· {blockCount} bloc{blockCount !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            restoreWorkflowVersion(historyWf.id, v.versionId)
                            // Refresh historyWf from updated state
                            setHistoryWf(null)
                            toast.success('Version restaurée avec succès')
                          }}
                          className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-violet-600 hover:bg-violet-100 transition-colors flex-shrink-0"
                        >
                          <RotateCcw size={11} /> Restaurer
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Export Word modal ── */}
      <AnimatePresence>
        {showExport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && setShowExport(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                  <FileDown size={22} className="text-blue-600" />
                </div>
                <div className="font-semibold text-ink text-base mb-1">Exporter en Word</div>
                <p className="text-xs text-muted leading-relaxed">
                  Génère un document <strong>.docx</strong> regroupant{' '}
                  {filtered.length > 0 && filtered.length < activeWorkflows.length
                    ? `les ${filtered.length} processus filtrés`
                    : `les ${workflows.length} processus`}{' '}
                  avec des intercalaires colorés par catégorie.
                </p>
              </div>

              {/* Password */}
              <div className="px-6 pb-2">
                <label className="block text-xs font-semibold text-ink mb-2">
                  Mot de passe Directeur
                </label>
                <div className="relative">
                  <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type={showPwd ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={exportPwd}
                    onChange={e => { setExportPwd(e.target.value); setPwdError('') }}
                    onKeyDown={e => e.key === 'Enter' && handleExport()}
                    autoFocus
                    className={`input-field pl-9 pr-9 py-2.5 text-sm w-full ${pwdError ? 'border-rose-400 bg-rose-50' : ''}`}
                  />
                  <button
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors"
                  >
                    {showPwd ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
                {pwdError && <p className="text-xs text-rose-500 mt-1.5">{pwdError}</p>}
              </div>

              {/* Info */}
              <div className="mx-6 mb-4 p-3 rounded-xl bg-paper-warm border border-border text-[11px] text-muted leading-relaxed">
                <span className="font-semibold text-ink">Inclus :</span> titres, textes, listes, citations, liens.{' '}
                <span className="font-semibold text-ink">Non inclus :</span> images (remplacées par [Image]).
              </div>

              {/* Actions */}
              <div className="px-6 pb-5 flex gap-2">
                <button onClick={() => setShowExport(false)} className="btn-ghost flex-1 justify-center text-xs">Annuler</button>
                <button
                  onClick={handleExport}
                  disabled={exporting || !exportPwd}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-2"
                >
                  {exporting ? (
                    <><span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Génération…</>
                  ) : (
                    <><FileDown size={13} /> Générer et télécharger</>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
