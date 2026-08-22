import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, MousePointer2, StickyNote, Type, ImagePlus, Hand,
  Trash2, RotateCcw, Minus, Plus, LayoutGrid, Copy, MoveRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'

// ── constants ────────────────────────────────────────────────────────────────
const MIN_ZOOM = 0.1
const MAX_ZOOM = 4

const STICKY_COLORS = [
  { bg: '#FEF08A', text: '#713F12' },
  { bg: '#BBF7D0', text: '#14532D' },
  { bg: '#BAE6FD', text: '#0C4A6E' },
  { bg: '#FED7AA', text: '#7C2D12' },
  { bg: '#FECDD3', text: '#881337' },
  { bg: '#DDD6FE', text: '#3B0764' },
  { bg: '#FFFFFF', text: '#1e1e2e' },
]

const DISPLAY_FONT = "'Instrument Serif', Georgia, serif"

function toCanvas(sx, sy, pan, zoom) {
  return { x: (sx - pan.x) / zoom, y: (sy - pan.y) / zoom }
}
function newId() {
  return `el_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`
}
function loadBoard(id) {
  try {
    const s = localStorage.getItem(`clade_board_${id}`)
    return s ? (JSON.parse(s).elements || []) : []
  } catch { return [] }
}
function saveBoard(id, elements) {
  try {
    localStorage.setItem(`clade_board_${id}`, JSON.stringify({ elements }))
    return true
  } catch (e) {
    if (e?.name === 'QuotaExceededError' || e?.code === 22) return false
    return false
  }
}

// ── anchor / arrow helpers ────────────────────────────────────────────────────
function getElementBounds(el) {
  if (el.type === 'sticky') return { x: el.x, y: el.y, w: el.w || 200, h: el.h || 160 }
  if (el.type === 'image')  return { x: el.x, y: el.y, w: el.w || 300, h: el.h || 200 }
  if (el.type === 'text')   return { x: el.x, y: el.y, w: 180, h: 32 }
  return null
}
function getAnchorPoints(el) {
  const b = getElementBounds(el)
  if (!b) return []
  return [
    { key: 'top',    x: b.x + b.w / 2, y: b.y },
    { key: 'right',  x: b.x + b.w,     y: b.y + b.h / 2 },
    { key: 'bottom', x: b.x + b.w / 2, y: b.y + b.h },
    { key: 'left',   x: b.x,           y: b.y + b.h / 2 },
  ]
}
function resolveArrowEndpoints(el, allElements) {
  let { x1 = 0, y1 = 0, x2 = 100, y2 = 0 } = el
  if (el.fromId) {
    const src = allElements.find(e => e.id === el.fromId)
    if (src) {
      const a = getAnchorPoints(src).find(a => a.key === el.fromAnchor)
      if (a) { x1 = a.x; y1 = a.y }
    }
  }
  if (el.toId) {
    const dst = allElements.find(e => e.id === el.toId)
    if (dst) {
      const a = getAnchorPoints(dst).find(a => a.key === el.toAnchor)
      if (a) { x2 = a.x; y2 = a.y }
    }
  }
  return { x1, y1, x2, y2 }
}
function snapToAnchor(cx, cy, allElements, excludeId, radius = 32) {
  for (const el of allElements) {
    if (el.type === 'arrow' || el.id === excludeId) continue
    for (const a of getAnchorPoints(el)) {
      const dx = a.x - cx, dy = a.y - cy
      if (dx * dx + dy * dy <= radius * radius) return { elId: el.id, anchor: a.key, x: a.x, y: a.y }
    }
  }
  return null
}

// ── sub-components ────────────────────────────────────────────────────────────
function StickyEl({ el, selected, editing, onMouseDown, onTouchStart, onDoubleClick, onChangeText, onDelete, onHoverEnter, onHoverLeave }) {
  const lastTap = useRef(0)
  const handleTouchEnd = (e) => {
    const now = Date.now()
    if (now - lastTap.current < 300) { e.preventDefault(); onDoubleClick() }
    lastTap.current = now
  }
  return (
    <div
      style={{
        position: 'absolute', left: el.x, top: el.y,
        width: el.w || 200, minHeight: el.h || 160,
        pointerEvents: 'auto',
        background: el.bg, zIndex: el.z || 0,
        boxShadow: selected
          ? '0 0 0 2.5px #3B82F6, 0 8px 32px rgba(0,0,0,0.18)'
          : '0 3px 14px rgba(0,0,0,0.13), 0 1px 3px rgba(0,0,0,0.07)',
        borderRadius: 10,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        userSelect: editing ? 'text' : 'none',
        cursor: editing ? 'text' : selected ? 'grab' : 'pointer',
        transition: 'box-shadow 0.15s ease',
      }}
      onMouseDown={e => { if (!editing) { e.stopPropagation(); onMouseDown(e) } }}
      onTouchStart={e => { if (!editing) { e.stopPropagation(); onTouchStart?.(e) } }}
      onTouchEnd={handleTouchEnd}
      onDoubleClick={e => { e.stopPropagation(); onDoubleClick() }}
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
    >
      {/* drag strip */}
      <div
        style={{ height: 10, flexShrink: 0, cursor: 'move', background: 'rgba(0,0,0,0.12)' }}
        onMouseDown={e => { e.stopPropagation(); onMouseDown(e) }}
        onTouchStart={e => { e.stopPropagation(); onTouchStart?.(e) }}
      />
      {editing ? (
        <textarea
          autoFocus
          value={el.content || ''}
          onChange={e => onChangeText(e.target.value)}
          onMouseDown={e => e.stopPropagation()}
          style={{
            flex: 1, minHeight: 130, background: 'transparent',
            border: 'none', outline: 'none', resize: 'none',
            padding: '10px 12px', fontSize: 13.5,
            color: el.textColor || '#1e1e2e',
            fontFamily: 'Inter Tight, sans-serif',
            lineHeight: 1.55,
          }}
          placeholder="Écrivez ici…"
        />
      ) : (
        <div style={{
          flex: 1, padding: '10px 12px', fontSize: 13.5,
          color: el.textColor || '#1e1e2e',
          lineHeight: 1.55, overflowY: 'auto',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          minHeight: 130,
          fontFamily: 'Inter Tight, sans-serif',
        }}>
          {el.content || <span style={{ opacity: 0.35, fontStyle: 'italic' }}>Double-cliquer pour éditer</span>}
        </div>
      )}
      {selected && !editing && (
        <button
          onMouseDown={e => { e.stopPropagation(); onDelete() }}
          style={{
            position: 'absolute', top: 10, right: 8,
            width: 22, height: 22, border: 'none', borderRadius: 6,
            background: 'rgba(0,0,0,0.16)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Trash2 size={11} color="#444" />
        </button>
      )}
    </div>
  )
}

function TextEl({ el, selected, editing, onMouseDown, onTouchStart, onDoubleClick, onChangeText, onDelete, onHoverEnter, onHoverLeave }) {
  const lines = Math.max(1, (el.content || '').split('\n').length)
  const lastTap = useRef(0)
  const handleTouchEnd = (e) => {
    const now = Date.now()
    if (now - lastTap.current < 300) { e.preventDefault(); onDoubleClick() }
    lastTap.current = now
  }
  return (
    <div
      style={{
        position: 'absolute', left: el.x, top: el.y, zIndex: el.z || 0,
        pointerEvents: 'auto',
        outline: selected ? '2px solid #3B82F6' : 'none',
        outlineOffset: 6, borderRadius: 4,
        padding: '3px 6px', minWidth: 60,
        cursor: editing ? 'text' : selected ? 'grab' : 'pointer',
        userSelect: editing ? 'text' : 'none',
      }}
      onMouseDown={e => { if (!editing) { e.stopPropagation(); onMouseDown(e) } }}
      onTouchStart={e => { if (!editing) { e.stopPropagation(); onTouchStart?.(e) } }}
      onTouchEnd={handleTouchEnd}
      onDoubleClick={e => { e.stopPropagation(); onDoubleClick() }}
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
    >
      {editing ? (
        <textarea
          autoFocus
          value={el.content || ''}
          onChange={e => onChangeText(e.target.value)}
          onMouseDown={e => e.stopPropagation()}
          rows={lines}
          style={{
            background: 'transparent', border: 'none', outline: 'none',
            resize: 'none', fontSize: el.fontSize || 20,
            color: el.color || '#1e1e2e',
            fontFamily: DISPLAY_FONT,
            lineHeight: 1.35, minWidth: 80,
            width: Math.max(120, ((el.content || '').length) * ((el.fontSize || 20) * 0.52) + 24),
          }}
        />
      ) : (
        <div style={{
          fontSize: el.fontSize || 20, color: el.color || '#1e1e2e',
          fontFamily: DISPLAY_FONT,
          lineHeight: 1.35, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          minHeight: 28,
        }}>
          {el.content || <span style={{ opacity: 0.28, fontStyle: 'italic' }}>Texte</span>}
        </div>
      )}
      {selected && !editing && (
        <button
          onMouseDown={e => { e.stopPropagation(); onDelete() }}
          style={{
            position: 'absolute', top: -12, right: -12,
            width: 22, height: 22, border: 'none', borderRadius: '50%',
            background: '#EF4444', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Trash2 size={10} color="white" />
        </button>
      )}
    </div>
  )
}

function ImageEl({ el, selected, onMouseDown, onTouchStart, onDelete, onHoverEnter, onHoverLeave }) {
  return (
    <div
      style={{
        position: 'absolute', left: el.x, top: el.y, zIndex: el.z || 0,
        width: el.w || 300, height: el.h || 200,
        pointerEvents: 'auto',
        borderRadius: 10, overflow: 'hidden',
        boxShadow: selected
          ? '0 0 0 2.5px #3B82F6, 0 8px 32px rgba(0,0,0,0.18)'
          : '0 3px 14px rgba(0,0,0,0.13)',
        cursor: 'move', userSelect: 'none',
        transition: 'box-shadow 0.15s ease',
      }}
      onMouseDown={e => { e.stopPropagation(); onMouseDown(e) }}
      onTouchStart={e => { e.stopPropagation(); onTouchStart?.(e) }}
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
    >
      <img
        src={el.content} alt="" draggable={false}
        style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', userSelect: 'none' }}
      />
      {selected && (
        <button
          onMouseDown={e => { e.stopPropagation(); onDelete() }}
          style={{
            position: 'absolute', top: 8, right: 8,
            width: 28, height: 28, border: 'none', borderRadius: 8,
            background: '#EF4444', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Trash2 size={12} color="white" />
        </button>
      )}
    </div>
  )
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function ProjectBoardPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { projects } = useData()
  const { profile } = useAuth()
  const project = projects.find(p => String(p.id) === id)

  // ── core state ────────────────────────────────────────────────────────────
  const [elements, setElements] = useState(() => loadBoard(id))
  const [pan,  setPan]  = useState({ x: 80, y: 80 })
  const [zoom, setZoom] = useState(1)
  const [tool, setTool] = useState('select')
  const [selectedIds,  setSelectedIds]  = useState(new Set())
  const [editingId,    setEditingId]    = useState(null)
  const [colorIdx,     setColorIdx]     = useState(0)
  const [history,      setHistory]      = useState([])
  const [selBox,       setSelBox]       = useState(null)
  const [addMode,      setAddMode]      = useState(false)
  const [arrowDraft,   setArrowDraft]   = useState(null)
  const [hoveredElId,  setHoveredElId]  = useState(null) // for anchor points

  // ── refs (for window handlers) ────────────────────────────────────────────
  const canvasRef       = useRef(null)
  const fileRef         = useRef(null)
  const dragRef         = useRef(null)
  const panRef          = useRef(null)
  const arrowRef        = useRef(null)
  const selBoxActive    = useRef(false)
  const selBoxCtrl      = useRef(false)
  const ctrlHeld        = useRef(false)
  const spaceHeld       = useRef(false)
  const zoomRef         = useRef(zoom)
  const panStateRef     = useRef(pan)
  const elementsRef     = useRef(elements)
  const historyRef      = useRef(history)
  const selBoxStateRef  = useRef(null)
  const selectedIdsRef  = useRef(selectedIds)
  const prevIdRef       = useRef(id)

  useEffect(() => { zoomRef.current = zoom },         [zoom])
  useEffect(() => { panStateRef.current = pan },      [pan])
  useEffect(() => { elementsRef.current = elements }, [elements])
  useEffect(() => { historyRef.current = history },   [history])
  useEffect(() => { selBoxStateRef.current = selBox }, [selBox])
  useEffect(() => { selectedIdsRef.current = selectedIds }, [selectedIds])
  useEffect(() => { if (tool !== 'select') { setAddMode(false); setHoveredElId(null) } }, [tool])

  // ── persist (with id-change guard + quota detection) ─────────────────────
  useEffect(() => {
    if (prevIdRef.current !== id) {
      // Board switched — reload data for new id, don't save old data
      prevIdRef.current = id
      setElements(loadBoard(id))
      setSelectedIds(new Set())
      setEditingId(null)
      setHistory([])
      return
    }
    const timer = setTimeout(() => {
      const ok = saveBoard(id, elements)
      if (!ok) toast.error('Espace insuffisant — retirez des images pour sauvegarder', { id: 'board-quota', duration: 5000 })
    }, 350)
    return () => clearTimeout(timer)
  }, [elements, id])

  // ── history helpers ───────────────────────────────────────────────────────
  const snapshotHistory = useCallback(() => {
    const snap = JSON.parse(JSON.stringify(elementsRef.current))
    setHistory(prev => [...prev.slice(-29), snap])
  }, [])

  const undo = useCallback(() => {
    const h = historyRef.current
    if (!h.length) return
    setElements(h[h.length - 1])
    setHistory(prev => prev.slice(0, -1))
  }, [])

  // ── element ops ───────────────────────────────────────────────────────────
  const addEl = useCallback((el) => {
    snapshotHistory()
    setElements(prev => [...prev, el])
  }, [snapshotHistory])

  const updateEl = useCallback((elId, updates) => {
    setElements(prev => prev.map(e => e.id === elId ? { ...e, ...updates } : e))
  }, [])

  const deleteIds = useCallback((ids) => {
    snapshotHistory()
    // Also delete arrows connected to deleted elements
    setElements(prev => prev.filter(e => {
      if (ids.has(e.id)) return false
      if (e.type === 'arrow' && (ids.has(e.fromId) || ids.has(e.toId))) return false
      return true
    }))
    setSelectedIds(new Set())
    setEditingId(null)
  }, [snapshotHistory])

  const bringFront = useCallback((ids) => {
    setElements(prev => {
      const maxZ = Math.max(0, ...prev.map(e => e.z || 0))
      let bump = 0
      return prev.map(e => ids.has(e.id) ? { ...e, z: maxZ + (++bump) } : e)
    })
  }, [])

  const duplicateSelected = useCallback(() => {
    const ids = selectedIdsRef.current
    if (!ids.size) return
    const snapshot = elementsRef.current
    const copies = snapshot
      .filter(e => ids.has(e.id))
      .map(e => e.type === 'arrow'
        ? { ...e, id: newId(), x1: e.x1 + 24, y1: e.y1 + 24, x2: e.x2 + 24, y2: e.y2 + 24, z: Date.now(), fromId: undefined, toId: undefined }
        : { ...e, id: newId(), x: e.x + 24, y: e.y + 24, z: Date.now() }
      )
    const newIds = new Set(copies.map(c => c.id))
    snapshotHistory()
    setElements(prev => [...prev, ...copies])
    setSelectedIds(newIds)
  }, [snapshotHistory])

  // ── window mouse handlers ─────────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e) => {
      const z = zoomRef.current
      const p = panStateRef.current

      if (panRef.current) {
        setPan({
          x: panRef.current.panX + (e.clientX - panRef.current.startX),
          y: panRef.current.panY + (e.clientY - panRef.current.startY),
        })
        return
      }

      if (arrowRef.current) {
        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect) return
        const cx = (e.clientX - rect.left - p.x) / z
        const cy = (e.clientY - rect.top  - p.y) / z
        arrowRef.current.x2 = cx
        arrowRef.current.y2 = cy
        setArrowDraft({ ...arrowRef.current })
        return
      }

      if (dragRef.current) {
        const drag = dragRef.current
        const dx = (e.clientX - drag.startX) / z
        const dy = (e.clientY - drag.startY) / z

        if (drag.type === 'arrow') {
          // Move whole arrow (disconnects from anchors)
          setElements(prev => prev.map(el =>
            el.id === drag.id
              ? { ...el, x1: drag.x1 + dx, y1: drag.y1 + dy, x2: drag.x2 + dx, y2: drag.y2 + dy, fromId: undefined, toId: undefined, fromAnchor: undefined, toAnchor: undefined }
              : el
          ))
        } else if (drag.multi) {
          setElements(prev => prev.map(el => {
            const orig = drag.positions.get(el.id)
            return orig ? { ...el, x: orig.x + dx, y: orig.y + dy } : el
          }))
        } else {
          setElements(prev => prev.map(el =>
            el.id === drag.id
              ? { ...el, x: drag.elX + dx, y: drag.elY + dy }
              : el
          ))
        }
      }

      if (selBoxActive.current) {
        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect) return
        const cx = (e.clientX - rect.left - p.x) / z
        const cy = (e.clientY - rect.top  - p.y) / z
        setSelBox(sb => sb ? { ...sb, x2: cx, y2: cy } : null)
      }
    }

    const onUp = (e) => {
      // Commit rubber-band selection
      if (selBoxActive.current) {
        const sb = selBoxStateRef.current
        if (sb) {
          const minX = Math.min(sb.x1, sb.x2), maxX = Math.max(sb.x1, sb.x2)
          const minY = Math.min(sb.y1, sb.y2), maxY = Math.max(sb.y1, sb.y2)
          const wasDrag = maxX - minX > 6 || maxY - minY > 6
          if (wasDrag) {
            const ids = new Set(
              elementsRef.current
                .filter(el => {
                  const w = el.type === 'text' ? 200 : (el.w || 200)
                  const h = el.type === 'text' ? 40  : (el.h || 160)
                  return el.x + w > minX && el.x < maxX && el.y + h > minY && el.y < maxY
                })
                .map(el => el.id)
            )
            if (ids.size) {
              if (selBoxCtrl.current) setSelectedIds(prev => new Set([...prev, ...ids]))
              else setSelectedIds(ids)
            }
          } else {
            setSelectedIds(new Set())
          }
        }
        setSelBox(null)
        selBoxActive.current = false
        selBoxCtrl.current = false
      }

      if (arrowRef.current) {
        const a = arrowRef.current
        const dx = a.x2 - a.x1, dy = a.y2 - a.y1
        if (dx * dx + dy * dy > 100) {
          // Try to snap endpoint to an anchor
          const snap = snapToAnchor(a.x2, a.y2, elementsRef.current, null)
          const finalX2 = snap ? snap.x : a.x2
          const finalY2 = snap ? snap.y : a.y2
          snapshotHistory()
          const el = {
            id: newId(), type: 'arrow',
            x1: a.x1, y1: a.y1, x2: finalX2, y2: finalY2,
            fromId: a.fromId, fromAnchor: a.fromAnchor,
            toId: snap?.elId, toAnchor: snap?.anchor,
            color: '#0A1E3F', z: Date.now(),
          }
          setElements(prev => [...prev, el])
        }
        arrowRef.current = null
        setArrowDraft(null)
      }

      dragRef.current = null
      panRef.current  = null
    }

    const onTouchMove = (e) => {
      if (e.touches.length > 0) {
        e.preventDefault()
        onMove({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY })
      }
    }
    const onTouchEnd = () => onUp()

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend',  onTouchEnd)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend',  onTouchEnd)
    }
  }, []) // empty deps — dynamic values via refs

  // ── wheel ─────────────────────────────────────────────────────────────────
  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const rect = canvasRef.current.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const factor = e.deltaY < 0 ? 1.12 : 0.9
    const nz = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomRef.current * factor))
    setPan(p => ({
      x: mx - (mx - p.x) * (nz / zoomRef.current),
      y: my - (my - p.y) * (nz / zoomRef.current),
    }))
    setZoom(nz)
  }, [])

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  // ── keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const onDown = (e) => {
      const inText = e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT'
      if (e.key === 'Escape') {
        if (editingId) { e.target.blur?.(); setEditingId(null) }
        else           { setSelectedIds(new Set()); setSelBox(null) }
        return
      }
      if (e.key === 'Control' || e.key === 'Meta') ctrlHeld.current = true
      if (e.code === 'Space' && !inText) { spaceHeld.current = true; e.preventDefault() }
      if (inText) return
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIdsRef.current.size > 0) {
        deleteIds(new Set(selectedIdsRef.current))
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z')   { e.preventDefault(); undo() }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd')   { e.preventDefault(); duplicateSelected() }
      if (!e.ctrlKey && !e.metaKey) {
        if (e.key === 'v') setTool('select')
        if (e.key === 'h') setTool('hand')
        if (e.key === 's') setTool('sticky')
        if (e.key === 't') setTool('text')
        if (e.key === 'i') setTool('image')
        if (e.key === 'a') setTool('arrow')
      }
    }
    const onUp = (e) => {
      if (e.code === 'Space') spaceHeld.current = false
      if (e.key === 'Control' || e.key === 'Meta') ctrlHeld.current = false
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup',   onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup',   onUp)
    }
  }, [editingId, deleteIds, undo, duplicateSelected])

  // ── canvas mousedown ──────────────────────────────────────────────────────
  const handleCanvasDown = (e) => {
    if (e.button === 1 || spaceHeld.current || tool === 'hand') {
      e.preventDefault()
      panRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y }
      return
    }
    if (e.button !== 0) return
    if (editingId) { setEditingId(null); return }

    const rect = canvasRef.current.getBoundingClientRect()
    const { x: cx, y: cy } = toCanvas(e.clientX - rect.left, e.clientY - rect.top, pan, zoom)

    if (tool === 'sticky') {
      const c = STICKY_COLORS[colorIdx]
      const el = { id: newId(), type: 'sticky', x: cx - 100, y: cy - 80, w: 200, h: 160, content: '', bg: c.bg, textColor: c.text, z: Date.now() }
      addEl(el)
      setSelectedIds(new Set([el.id]))
      setEditingId(el.id)
      return
    }
    if (tool === 'text') {
      const el = { id: newId(), type: 'text', x: cx, y: cy, content: '', fontSize: 20, color: '#1e1e2e', z: Date.now() }
      addEl(el)
      setSelectedIds(new Set([el.id]))
      setEditingId(el.id)
      return
    }
    if (tool === 'image') { fileRef.current?.click(); return }
    if (tool === 'arrow') {
      e.preventDefault()
      arrowRef.current = { x1: cx, y1: cy, x2: cx, y2: cy }
      setArrowDraft({ x1: cx, y1: cy, x2: cx, y2: cy })
      return
    }
    if (tool === 'select') {
      selBoxCtrl.current = e.ctrlKey || e.metaKey || ctrlHeld.current || addMode
      selBoxActive.current = true
      setSelBox({ x1: cx, y1: cy, x2: cx, y2: cy })
    }
  }

  // ── element mousedown (drag start) ────────────────────────────────────────
  const handleElDown = (e, el) => {
    if (tool === 'hand' || spaceHeld.current) {
      e.preventDefault?.()
      e.stopPropagation?.()
      panRef.current = { startX: e.clientX, startY: e.clientY, panX: panStateRef.current.x, panY: panStateRef.current.y }
      return
    }
    if (tool !== 'select') return
    e.preventDefault()
    e.stopPropagation()
    if (editingId) { setEditingId(null); return }

    if (e.ctrlKey || e.metaKey || ctrlHeld.current || addMode) {
      const cur = selectedIdsRef.current
      const next = new Set(cur)
      if (next.has(el.id)) next.delete(el.id)
      else next.add(el.id)
      setSelectedIds(next)
      return
    }

    const alreadyInSel = selectedIdsRef.current.has(el.id)
    const curSel = selectedIdsRef.current
    const newSel = alreadyInSel ? curSel : new Set([el.id])
    if (!alreadyInSel) setSelectedIds(newSel)
    bringFront(new Set([el.id]))

    const dragSet = (alreadyInSel && curSel.size > 1) ? curSel : newSel
    snapshotHistory()
    if (dragSet.size > 1) {
      const positions = new Map()
      elementsRef.current.forEach(e2 => {
        if (dragSet.has(e2.id)) positions.set(e2.id, { x: e2.x, y: e2.y })
      })
      dragRef.current = { multi: true, startX: e.clientX, startY: e.clientY, positions }
    } else {
      dragRef.current = { multi: false, id: el.id, startX: e.clientX, startY: e.clientY, elX: el.x, elY: el.y }
    }
  }

  // ── arrow mousedown (drag arrow) ──────────────────────────────────────────
  const handleArrowDown = useCallback((e, el) => {
    if (tool !== 'select') return
    e.stopPropagation()
    setSelectedIds(new Set([el.id]))
    snapshotHistory()
    const { x1, y1, x2, y2 } = resolveArrowEndpoints(el, elementsRef.current)
    dragRef.current = { type: 'arrow', id: el.id, startX: e.clientX, startY: e.clientY, x1, y1, x2, y2 }
  }, [tool, snapshotHistory])

  // ── image upload ──────────────────────────────────────────────────────────
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const el = {
        id: newId(), type: 'image',
        x: Math.max(0, (-pan.x + 80) / zoom),
        y: Math.max(0, (-pan.y + 80) / zoom),
        w: 320, h: 220, content: ev.target.result,
        z: Date.now(),
      }
      addEl(el)
      setSelectedIds(new Set([el.id]))
      setTool('select')
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // ── touch handlers ────────────────────────────────────────────────────────
  const handleCanvasTouch = (e) => {
    const touch = e.touches[0]
    if (!touch) return
    handleCanvasDown({ clientX: touch.clientX, clientY: touch.clientY, button: 0, preventDefault: () => e.preventDefault() })
  }
  const handleElTouch = (e, el) => {
    const touch = e.touches[0]
    if (!touch) return
    handleElDown({ clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => e.preventDefault(), stopPropagation: () => e.stopPropagation() }, el)
  }

  // ── zoom ──────────────────────────────────────────────────────────────────
  const zoomTo = (nz) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) { setZoom(nz); return }
    const mx = rect.width / 2, my = rect.height / 2
    setPan(p => ({ x: mx - (mx - p.x) * (nz / zoomRef.current), y: my - (my - p.y) * (nz / zoomRef.current) }))
    setZoom(nz)
  }

  // ── cursor ────────────────────────────────────────────────────────────────
  const cursor = (() => {
    if (panRef.current !== null)                   return 'grabbing'
    if (tool === 'hand' || spaceHeld.current)      return 'grab'
    if (tool === 'sticky' || tool === 'text' || tool === 'arrow') return 'crosshair'
    if (tool === 'image')                          return 'cell'
    return 'default'
  })()

  const sortedEls = [...elements].sort((a, b) => (a.z || 0) - (b.z || 0))

  const TOOLS = [
    { key: 'select', Icon: MousePointer2, label: 'Sélection  V' },
    { key: 'hand',   Icon: Hand,          label: 'Naviguer  H' },
    { key: 'sticky', Icon: StickyNote,    label: 'Post-it  S' },
    { key: 'text',   Icon: Type,          label: 'Texte  T' },
    { key: 'image',  Icon: ImagePlus,     label: 'Image  I' },
    { key: 'arrow',  Icon: MoveRight,     label: 'Flèche  A' },
  ]

  const selCount = selectedIds.size

  // ── anchor dots for hovered element ───────────────────────────────────────
  const anchorDots = (() => {
    if (tool !== 'arrow' || !hoveredElId) return null
    const hel = elements.find(e => e.id === hoveredElId)
    if (!hel || hel.type === 'arrow') return null
    return getAnchorPoints(hel).map(a => (
      <div
        key={a.key}
        style={{
          position: 'absolute',
          left: a.x - 8, top: a.y - 8,
          width: 16, height: 16,
          borderRadius: '50%',
          background: 'white',
          border: '2.5px solid #3B82F6',
          pointerEvents: 'auto',
          cursor: 'crosshair',
          zIndex: 99999,
          boxShadow: '0 0 0 4px rgba(59,130,246,0.18)',
          transition: 'transform 0.1s',
        }}
        onMouseEnter={() => setHoveredElId(hoveredElId)}
        onMouseDown={e => {
          e.stopPropagation()
          e.preventDefault()
          arrowRef.current = { x1: a.x, y1: a.y, x2: a.x, y2: a.y, fromId: hoveredElId, fromAnchor: a.key }
          setArrowDraft({ x1: a.x, y1: a.y, x2: a.x, y2: a.y })
        }}
      />
    ))
  })()

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ zIndex: 100, background: '#eeeef4', fontFamily: 'Inter Tight, sans-serif' }}
    >
      {/* top bar */}
      <div
        className="flex items-center px-3 sm:px-4 py-2 bg-white border-b border-border z-20 flex-shrink-0 gap-3"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink transition-colors px-2 py-1.5 rounded-lg hover:bg-paper-warm flex-shrink-0"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Retour</span>
          </button>
          <div className="w-px h-4 bg-border flex-shrink-0" />
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
              <LayoutGrid size={13} className="text-violet-600" />
            </div>
            <span className="text-[15px] font-semibold text-ink truncate" style={{ fontFamily: DISPLAY_FONT }}>
              {project?.nom || 'Projet'}
            </span>
            <span className="hidden sm:inline text-xs text-muted flex-shrink-0">· Board</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {tool === 'select' && (
            <div className="flex items-center gap-1 bg-paper-warm border border-border rounded-xl px-1.5 py-1.5">
              <button
                onClick={() => setAddMode(m => !m)}
                title={addMode ? 'Désactiver sélection multiple' : 'Ajouter à la sélection'}
                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                  addMode ? 'bg-electric text-white' : 'text-muted hover:text-electric hover:bg-electric/10'
                }`}
              >
                <Plus size={14} strokeWidth={2.5} />
              </button>
              {selCount > 0 && (
                <>
                  <div className="w-px h-4 bg-border mx-0.5" />
                  <div className="sm:hidden flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-electric text-white text-[10px] font-bold leading-none">
                    {selCount}
                  </div>
                  <span className="hidden sm:inline text-xs text-muted font-medium px-1">{selCount} sélectionné{selCount > 1 ? 's' : ''}</span>
                  <div className="w-px h-4 bg-border mx-0.5" />
                  <button onClick={duplicateSelected} title="Dupliquer (Ctrl+D)"
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-ink hover:text-electric hover:bg-electric/10 transition-colors">
                    <Copy size={13} />
                  </button>
                  <button onClick={() => deleteIds(new Set(selectedIds))} title="Supprimer"
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </>
              )}
            </div>
          )}
          <button onClick={undo} disabled={history.length === 0} title="Annuler (Ctrl+Z)"
            className="sm:hidden w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-paper-warm transition-colors disabled:opacity-35">
            <RotateCcw size={14} />
          </button>
          <button onClick={undo} disabled={history.length === 0} title="Annuler (Ctrl+Z)"
            className="hidden sm:flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors disabled:opacity-35 px-2 py-1.5 rounded-lg hover:bg-paper-warm">
            <RotateCcw size={13} /> Annuler
          </button>
        </div>
      </div>

      {/* body */}
      <div className="flex flex-1 overflow-hidden">

        {/* left toolbar */}
        <div
          className="flex flex-col items-center py-3 gap-1 bg-white border-r border-border z-20 flex-shrink-0"
          style={{ width: 52 }}
        >
          {TOOLS.map(({ key, Icon, label }) => (
            <button
              key={key}
              onClick={() => setTool(key)}
              title={label}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                tool === key
                  ? 'bg-ink text-white shadow-sm'
                  : 'text-muted hover:text-ink hover:bg-paper-warm'
              }`}
            >
              <Icon size={16} />
            </button>
          ))}
          {tool === 'sticky' && (
            <>
              <div className="w-8 h-px bg-border my-2" />
              {STICKY_COLORS.map((c, i) => (
                <button
                  key={i}
                  onClick={() => setColorIdx(i)}
                  title={`Couleur ${i + 1}`}
                  style={{
                    width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                    background: c.bg,
                    border: colorIdx === i ? '2.5px solid #3B82F6' : '2px solid rgba(0,0,0,0.1)',
                    boxShadow: colorIdx === i ? '0 0 0 1px #3B82F6' : 'none',
                    transition: 'box-shadow 0.1s',
                  }}
                />
              ))}
            </>
          )}
          {tool === 'arrow' && (
            <div style={{ marginTop: 8, padding: '0 6px', textAlign: 'center' }}>
              <div style={{ fontSize: 8, color: '#999', lineHeight: 1.4 }}>
                Survole un élément pour voir les points de connexion
              </div>
            </div>
          )}
        </div>

        {/* canvas */}
        <div
          ref={canvasRef}
          className="flex-1 relative overflow-hidden select-none"
          style={{ cursor }}
          onMouseDown={handleCanvasDown}
          onTouchStart={handleCanvasTouch}
        >
          {/* dot grid */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            <defs>
              <pattern
                id="bd"
                x={pan.x % (24 * zoom)} y={pan.y % (24 * zoom)}
                width={24 * zoom} height={24 * zoom}
                patternUnits="userSpaceOnUse"
              >
                <circle cx={1} cy={1} r={Math.min(1.2, zoom * 0.85 + 0.1)} fill="#b4b4cc" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#bd)" />
          </svg>

          {/* transform container */}
          <div
            style={{
              position: 'absolute', inset: 0,
              overflow: 'visible',
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              pointerEvents: 'none',
            }}
          >
            {/* SVG arrows layer */}
            <svg style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }}>
              <defs>
                <marker id="arh-dark" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto" markerUnits="userSpaceOnUse">
                  <path d="M0,0 L0,7 L10,3.5 z" fill="#0A1E3F" />
                </marker>
                <marker id="arh-sel" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto" markerUnits="userSpaceOnUse">
                  <path d="M0,0 L0,7 L10,3.5 z" fill="#3B82F6" />
                </marker>
                <marker id="arh-draft" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto" markerUnits="userSpaceOnUse">
                  <path d="M0,0 L0,7 L10,3.5 z" fill="#0A1E3F" opacity="0.5" />
                </marker>
              </defs>

              {sortedEls.filter(el => el.type === 'arrow').map(el => {
                const isSel = selectedIds.has(el.id)
                const { x1, y1, x2, y2 } = resolveArrowEndpoints(el, elements)
                return (
                  <g key={el.id}>
                    {/* wide transparent hit area */}
                    <line x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke="transparent" strokeWidth={16}
                      style={{ pointerEvents: 'auto', cursor: tool === 'select' ? 'move' : 'pointer' }}
                      onMouseDown={e => { e.stopPropagation(); handleArrowDown(e, el) }}
                    />
                    {/* visible line */}
                    <line x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke={isSel ? '#3B82F6' : (el.color || '#0A1E3F')}
                      strokeWidth={isSel ? 2.5 : 2}
                      markerEnd={isSel ? 'url(#arh-sel)' : 'url(#arh-dark)'}
                      style={{ pointerEvents: 'none' }}
                    />
                    {/* endpoint handles when selected */}
                    {isSel && (
                      <>
                        <circle cx={x1} cy={y1} r={5} fill="white" stroke="#3B82F6" strokeWidth={2} style={{ pointerEvents: 'none' }} />
                        <circle cx={x2} cy={y2} r={5} fill="#3B82F6" stroke="white" strokeWidth={1.5} style={{ pointerEvents: 'none' }} />
                      </>
                    )}
                  </g>
                )
              })}

              {/* arrow being drawn */}
              {arrowDraft && (
                <line
                  x1={arrowDraft.x1} y1={arrowDraft.y1}
                  x2={arrowDraft.x2} y2={arrowDraft.y2}
                  stroke="#0A1E3F" strokeWidth={2} strokeDasharray="6 3"
                  markerEnd="url(#arh-draft)"
                  style={{ pointerEvents: 'none' }}
                />
              )}
            </svg>

            {/* sticky / text / image elements */}
            {sortedEls.map(el => {
              const isSel = selectedIds.has(el.id)
              const isEditing = editingId === el.id
              const common = {
                el,
                selected: isSel,
                editing: isEditing,
                onMouseDown:  (e) => handleElDown(e, el),
                onTouchStart: (e) => handleElTouch(e, el),
                onDoubleClick: () => { setEditingId(el.id); setSelectedIds(new Set([el.id])) },
                onChangeText: (t) => updateEl(el.id, { content: t }),
                onDelete: () => deleteIds(new Set([el.id])),
                onHoverEnter: tool === 'arrow' ? () => setHoveredElId(el.id) : undefined,
                onHoverLeave: tool === 'arrow' ? () => setHoveredElId(v => v === el.id ? null : v) : undefined,
              }
              if (el.type === 'sticky') return <StickyEl key={el.id} {...common} />
              if (el.type === 'text')   return <TextEl   key={el.id} {...common} />
              if (el.type === 'image')  return <ImageEl  key={el.id} {...common} />
              return null
            })}

            {/* anchor dots (Miro-style) */}
            {anchorDots}
          </div>

          {/* rubber-band selection box */}
          {selBox && (
            <div
              style={{
                position: 'absolute', pointerEvents: 'none',
                left:   Math.min(selBox.x1, selBox.x2) * zoom + pan.x,
                top:    Math.min(selBox.y1, selBox.y2) * zoom + pan.y,
                width:  Math.abs(selBox.x2 - selBox.x1) * zoom,
                height: Math.abs(selBox.y2 - selBox.y1) * zoom,
                border: '1.5px solid #3B82F6',
                background: 'rgba(59,130,246,0.07)',
                borderRadius: 4,
              }}
            />
          )}
        </div>
      </div>

      {/* zoom controls */}
      <div className="absolute bottom-5 right-4 flex flex-col items-center gap-1 z-20" style={{ pointerEvents: 'auto' }}>
        <button onClick={() => zoomTo(Math.min(MAX_ZOOM, zoom * 1.2))}
          style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid rgba(0,0,0,0.10)', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', boxShadow: '0 2px 8px rgba(0,0,0,0.10)', cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.background = '#f5f5fa'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.95)'}
        >
          <Plus size={15} />
        </button>
        <button onClick={() => zoomTo(1)} title="100%"
          style={{ width: 34, height: 22, borderRadius: 8, border: '1px solid rgba(0,0,0,0.10)', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#444', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', cursor: 'pointer', fontFamily: 'Inter Tight, sans-serif', letterSpacing: '-0.3px' }}
          onMouseEnter={e => e.currentTarget.style.background = '#f5f5fa'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.95)'}
        >
          {Math.round(zoom * 100)}%
        </button>
        <button onClick={() => zoomTo(Math.max(MIN_ZOOM, zoom / 1.2))}
          style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid rgba(0,0,0,0.10)', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', boxShadow: '0 2px 8px rgba(0,0,0,0.10)', cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.background = '#f5f5fa'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.95)'}
        >
          <Minus size={15} />
        </button>
      </div>

      {/* bottom hint */}
      <div
        className="absolute bottom-5 left-1/2 -translate-x-1/2 pointer-events-none select-none"
        style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 20, padding: '4px 12px', fontSize: 10, color: '#999', whiteSpace: 'nowrap' }}
      >
        <span className="hidden sm:inline">
          {tool === 'arrow'
            ? 'Survole un élément → points bleus → glisse pour connecter · Flèche libre : cliquer-glisser sur le canvas'
            : 'Double-clic = éditer · Espace+glisser = naviguer · Molette = zoomer · Ctrl+D = dupliquer'}
        </span>
        <span className="sm:hidden">Curseur = sélectionner · Main = naviguer · Double-tap = éditer</span>
      </div>

      {/* empty state */}
      {elements.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ left: 52, top: 46 }}>
          <div style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(6px)', borderRadius: 18, padding: '32px 44px', textAlign: 'center', border: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 38, marginBottom: 10 }}>🗒️</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1e1e2e', marginBottom: 6, fontFamily: DISPLAY_FONT }}>Board vide</div>
            <div style={{ fontSize: 12, color: '#888', maxWidth: 220, lineHeight: 1.6 }}>
              Sélectionnez un outil à gauche pour ajouter des post-its, textes ou images
            </div>
          </div>
        </div>
      )}

      {/* hidden file input */}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
    </div>
  )
}
