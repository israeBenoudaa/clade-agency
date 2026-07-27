import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, MousePointer2, StickyNote, Type, ImagePlus, Hand,
  Trash2, RotateCcw, Minus, Plus, LayoutGrid, Copy,
} from 'lucide-react'
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

// ── sub-components ────────────────────────────────────────────────────────────
function StickyEl({ el, selected, editing, onMouseDown, onTouchStart, onDoubleClick, onChangeText, onDelete }) {
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
    >
      {/* drag strip */}
      <div
        style={{
          height: 10, flexShrink: 0, cursor: 'move',
          background: 'rgba(0,0,0,0.12)',
        }}
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

function TextEl({ el, selected, editing, onMouseDown, onTouchStart, onDoubleClick, onChangeText, onDelete }) {
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

function ImageEl({ el, selected, onMouseDown, onDelete }) {
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
  const [selBox,       setSelBox]       = useState(null) // rubber-band: { x1,y1,x2,y2 } canvas coords
  const [addMode,      setAddMode]      = useState(false) // additive multi-select toggle

  // ── refs (for window handlers — avoid stale closures) ────────────────────
  const canvasRef       = useRef(null)
  const fileRef         = useRef(null)
  const dragRef         = useRef(null)      // { multi, id, startX, startY, elX, elY, positions }
  const panRef          = useRef(null)      // { startX, startY, panX, panY }
  const selBoxActive    = useRef(false)     // true while rubber-banding
  const selBoxCtrl      = useRef(false)     // was Ctrl held when rubber-band started?
  const ctrlHeld        = useRef(false)     // Ctrl / Cmd key currently held
  const spaceHeld       = useRef(false)
  const zoomRef         = useRef(zoom)
  const panStateRef     = useRef(pan)
  const elementsRef     = useRef(elements)
  const historyRef      = useRef(history)
  const selBoxStateRef  = useRef(null)
  const selectedIdsRef  = useRef(selectedIds)

  useEffect(() => { zoomRef.current = zoom },         [zoom])
  useEffect(() => { panStateRef.current = pan },      [pan])
  useEffect(() => { elementsRef.current = elements }, [elements])
  useEffect(() => { historyRef.current = history },   [history])
  useEffect(() => { selBoxStateRef.current = selBox }, [selBox])
  useEffect(() => { selectedIdsRef.current = selectedIds }, [selectedIds])
  useEffect(() => { if (tool !== 'select') setAddMode(false) }, [tool])

  // ── persist ───────────────────────────────────────────────────────────────
  useEffect(() => {
    try { localStorage.setItem(`clade_board_${id}`, JSON.stringify({ elements })) } catch {}
  }, [elements, id])

  // ── history helpers ───────────────────────────────────────────────────────
  // Always call these OUTSIDE of any state updater function (prev => …)
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
    setElements(prev => prev.filter(e => !ids.has(e.id)))
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
      .map(e => ({ ...e, id: newId(), x: e.x + 24, y: e.y + 24, z: Date.now() }))
    const newIds = new Set(copies.map(c => c.id))
    snapshotHistory()
    setElements(prev => [...prev, ...copies])
    setSelectedIds(newIds)
  }, [snapshotHistory])

  // ── window mouse handlers (FIX: ensures mouseup always fires) ────────────
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

      if (dragRef.current) {
        // Capture snapshot before setElements — in React 18 concurrent mode the updater
        // may run after onUp has already cleared dragRef.current to null.
        const drag = dragRef.current
        const dx = (e.clientX - drag.startX) / z
        const dy = (e.clientY - drag.startY) / z
        if (drag.multi) {
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

    const onUp = () => {
      // commit rubber-band selection
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
              if (selBoxCtrl.current) {
                setSelectedIds(prev => new Set([...prev, ...ids]))
              } else {
                setSelectedIds(ids)
              }
            }
          } else {
            // simple click on empty canvas → always deselect
            setSelectedIds(new Set())
          }
        }
        setSelBox(null)
        selBoxActive.current = false
        selBoxCtrl.current = false
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
  }, []) // empty deps — dynamic values accessed via refs

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

      // Escape: exit edit → deselect
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

  // ── canvas mousedown (create / pan / rubber-band) ─────────────────────────
  const handleCanvasDown = (e) => {
    if (e.button === 1 || spaceHeld.current || tool === 'hand') {
      e.preventDefault()
      panRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y }
      return
    }
    if (e.button !== 0) return

    // clicking canvas while editing exits edit mode
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

    // select mode — start rubber-band selection
    if (tool === 'select') {
      selBoxCtrl.current = e.ctrlKey || e.metaKey || ctrlHeld.current || addMode
      selBoxActive.current = true
      setSelBox({ x1: cx, y1: cy, x2: cx, y2: cy })
    }
  }

  // ── element mousedown (drag start) ────────────────────────────────────────
  const handleElDown = (e, el) => {
    // hand tool or space held → pan the board, don't drag the element
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

    // Ctrl/Cmd+clic ou mode ajout → toggle l'élément dans la sélection sans drag
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

  // ── zoom helpers ──────────────────────────────────────────────────────────
  const zoomTo = (nz) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) { setZoom(nz); return }
    const mx = rect.width / 2, my = rect.height / 2
    setPan(p => ({ x: mx - (mx - p.x) * (nz / zoomRef.current), y: my - (my - p.y) * (nz / zoomRef.current) }))
    setZoom(nz)
  }

  // ── cursor ────────────────────────────────────────────────────────────────
  const isActuallyPanning = panRef.current !== null
  const cursor = (() => {
    if (isActuallyPanning)                  return 'grabbing'
    if (tool === 'hand' || spaceHeld.current) return 'grab'
    if (tool === 'sticky' || tool === 'text') return 'crosshair'
    if (tool === 'image')                   return 'cell'
    return 'default'
  })()

  const sortedEls = [...elements].sort((a, b) => (a.z || 0) - (b.z || 0))

  const TOOLS = [
    { key: 'select', Icon: MousePointer2, label: 'Sélection  V' },
    { key: 'hand',   Icon: Hand,          label: 'Naviguer  H' },
    { key: 'sticky', Icon: StickyNote,    label: 'Post-it  S' },
    { key: 'text',   Icon: Type,          label: 'Texte  T' },
    { key: 'image',  Icon: ImagePlus,     label: 'Image  I' },
  ]

  const selCount = selectedIds.size

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ zIndex: 100, background: '#eeeef4', fontFamily: 'Inter Tight, sans-serif' }}
    >
      {/* ── top bar ──────────────────────────────────────────────────────── */}
      <div
        className="flex items-center px-3 sm:px-4 py-2 bg-white border-b border-border z-20 flex-shrink-0 gap-3"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}
      >
        {/* Left — back + project name (flex-1 pushes actions to the right) */}
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

        {/* Right — unified pill (addMode + selection actions) + undo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* unified pill: always visible when select tool, grows when elements are selected */}
          {tool === 'select' && (
            <div className="flex items-center gap-1 bg-paper-warm border border-border rounded-xl px-1.5 py-1.5">
              {/* addMode toggle — single button, always first */}
              <button
                onClick={() => setAddMode(m => !m)}
                title={addMode ? 'Désactiver sélection multiple' : 'Ajouter à la sélection'}
                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                  addMode ? 'bg-electric text-white' : 'text-muted hover:text-electric hover:bg-electric/10'
                }`}
              >
                <Plus size={14} strokeWidth={2.5} />
              </button>

              {/* count + actions — only when something is selected */}
              {selCount > 0 && (
                <>
                  <div className="w-px h-4 bg-border mx-0.5" />
                  {/* mobile: count badge */}
                  <div className="sm:hidden flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-electric text-white text-[10px] font-bold leading-none">
                    {selCount}
                  </div>
                  {/* desktop: full label */}
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
          {/* undo */}
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

      {/* ── body ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── left toolbar ─────────────────────────────────────────────── */}
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

          {/* color swatches for sticky tool */}
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
        </div>

        {/* ── canvas ───────────────────────────────────────────────────── */}
        <div
          ref={canvasRef}
          className="flex-1 relative overflow-hidden select-none"
          style={{ cursor }}
          onMouseDown={handleCanvasDown}
          onTouchStart={handleCanvasTouch}
        >
          {/* dot grid */}
          <svg
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          >
            <defs>
              <pattern
                id="bd"
                x={pan.x % (24 * zoom)}
                y={pan.y % (24 * zoom)}
                width={24 * zoom}
                height={24 * zoom}
                patternUnits="userSpaceOnUse"
              >
                <circle cx={1} cy={1} r={Math.min(1.2, zoom * 0.85 + 0.1)} fill="#b4b4cc" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#bd)" />
          </svg>

          {/* elements container — inset 0 so mobile touch hit-testing works on overflowing children */}
          <div
            style={{
              position: 'absolute', inset: 0,
              overflow: 'visible',
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              pointerEvents: 'none',
            }}
          >
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
              }
              if (el.type === 'sticky') return <StickyEl key={el.id} {...common} />
              if (el.type === 'text')   return <TextEl   key={el.id} {...common} />
              if (el.type === 'image')  return <ImageEl  key={el.id} {...common} />
              return null
            })}
          </div>

          {/* rubber-band selection box (screen coords) */}
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

      {/* ── zoom controls — floating bottom-right ───────────────────────── */}
      <div
        className="absolute bottom-5 right-4 flex flex-col items-center gap-1 z-20"
        style={{ pointerEvents: 'auto' }}
      >
        <button onClick={() => zoomTo(Math.min(MAX_ZOOM, zoom * 1.2))}
          style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid rgba(0,0,0,0.10)', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', boxShadow: '0 2px 8px rgba(0,0,0,0.10)', cursor: 'pointer', transition: 'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = '#f5f5fa'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.95)'}
        >
          <Plus size={15} />
        </button>
        <button onClick={() => zoomTo(1)}
          title="100%"
          style={{ width: 34, height: 22, borderRadius: 8, border: '1px solid rgba(0,0,0,0.10)', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#444', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', cursor: 'pointer', fontFamily: 'Inter Tight, sans-serif', letterSpacing: '-0.3px' }}
          onMouseEnter={e => e.currentTarget.style.background = '#f5f5fa'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.95)'}
        >
          {Math.round(zoom * 100)}%
        </button>
        <button onClick={() => zoomTo(Math.max(MIN_ZOOM, zoom / 1.2))}
          style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid rgba(0,0,0,0.10)', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', boxShadow: '0 2px 8px rgba(0,0,0,0.10)', cursor: 'pointer', transition: 'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = '#f5f5fa'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.95)'}
        >
          <Minus size={15} />
        </button>
      </div>

      {/* ── bottom hint ──────────────────────────────────────────────────── */}
      <div
        className="absolute bottom-5 left-1/2 -translate-x-1/2 pointer-events-none select-none"
        style={{
          background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(0,0,0,0.07)', borderRadius: 20,
          padding: '4px 12px', fontSize: 10, color: '#999', whiteSpace: 'nowrap',
        }}
      >
        <span className="hidden sm:inline">Double-clic = éditer · Espace+glisser = naviguer · Molette = zoomer · Ctrl+D = dupliquer</span>
        <span className="sm:hidden">Curseur = sélectionner · Main = naviguer · Double-tap = éditer</span>
      </div>

      {/* ── empty state ──────────────────────────────────────────────────── */}
      {elements.length === 0 && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
          style={{ left: 52, top: 46 }}
        >
          <div style={{
            background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(6px)',
            borderRadius: 18, padding: '32px 44px', textAlign: 'center',
            border: '1px solid rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontSize: 38, marginBottom: 10 }}>🗒️</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1e1e2e', marginBottom: 6, fontFamily: DISPLAY_FONT }}>
              Board vide
            </div>
            <div style={{ fontSize: 12, color: '#888', maxWidth: 220, lineHeight: 1.6 }}>
              Sélectionnez un outil à gauche pour ajouter des post-its, textes ou images
            </div>
          </div>
        </div>
      )}

      {/* hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />
    </div>
  )
}
