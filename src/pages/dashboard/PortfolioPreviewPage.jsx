import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Monitor, Smartphone, X, Save, ExternalLink, Check,
  Plus, Trash2, ChevronDown, BarChart2,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import SiteAnalytics from '../../components/SiteAnalytics'

/* ─── Constants ─── */
const STORAGE_URL_KEY = 'clade_portfolio_preview_url'
const DEFAULT_URL     = 'http://localhost:5174'
const TABLE           = 'portfolio_projects'

const AXES_CFG = {
  C: { label: 'Conservation',  color: 'text-blue-400',    dot: 'bg-blue-400'    },
  L: { label: 'Landscape',     color: 'text-emerald-400', dot: 'bg-emerald-400' },
  A: { label: 'Architecture',  color: 'text-amber-400',   dot: 'bg-amber-400'   },
  D: { label: 'Design',        color: 'text-purple-400',  dot: 'bg-purple-400'  },
  E: { label: 'Éphémère',      color: 'text-orange-400',  dot: 'bg-orange-400'  },
}

const STATUTS = ['En conception', 'En cours', 'Livré', 'Démonté', 'Suspendu']

const EMPTY_PROJECT = {
  title: '', location: '', year: new Date().getFullYear().toString(),
  description: '', axis: 'A', programme: '', surface: '',
  statut: 'En cours', maitre_ouvrage: '', story: '',
  image_url: '', gallery: [''], tags: '',
  span: 'normal', display_order: 0, visible: true,
}

/* ─── Shared inline styles ─── */
const DARK_INP = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 7, color: '#F5F0EA', padding: '8px 11px', outline: 'none',
  fontSize: 12, fontFamily: 'Space Grotesk, sans-serif', lineHeight: 1.5,
}
const DARK_LBL = {
  display: 'block', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase',
  color: 'rgba(245,240,234,0.3)', marginBottom: 5, fontFamily: 'Space Grotesk, sans-serif',
}
const DARK_SEC = {
  fontSize: 9, letterSpacing: 2.5, textTransform: 'uppercase',
  color: 'rgba(200,184,154,0.5)', fontFamily: 'Space Grotesk, sans-serif',
  fontWeight: 700, marginBottom: 10, display: 'block',
}

/* ─── ProjectInlinePanel — full project edit form in sidebar ─── */
function ProjectInlinePanel({ form, onChange, onSave, onDelete, saving }) {
  const set = (k, v) => onChange({ ...form, [k]: v })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ ...DARK_LBL, margin: 0, marginBottom: 2 }}>Modifier le projet</div>
          <div style={{ fontSize: 13, color: '#F5F0EA', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{form.title || '—'}</div>
        </div>
        <button onClick={onSave} disabled={saving} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, background: saving ? 'rgba(200,184,154,0.3)' : '#C8B89A', border: 'none', color: '#08090A', cursor: saving ? 'default' : 'pointer', fontSize: 11, fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700 }}>
          <Save size={12} />{saving ? '…' : 'Enregistrer'}
        </button>
      </div>

      {/* Scrollable form */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>

        {/* Identité */}
        <div style={{ marginBottom: 18 }}>
          <span style={DARK_SEC}>Identité</span>
          <div style={{ marginBottom: 8 }}>
            <label style={DARK_LBL}>Titre *</label>
            <input style={DARK_INP} value={form.title || ''} onChange={e => set('title', e.target.value)} placeholder="Nom du projet" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div><label style={DARK_LBL}>Ville</label><input style={DARK_INP} value={form.location || ''} onChange={e => set('location', e.target.value)} /></div>
            <div><label style={DARK_LBL}>Année</label><input style={DARK_INP} value={form.year || ''} onChange={e => set('year', e.target.value)} /></div>
          </div>
          <div>
            <label style={DARK_LBL}>Description courte</label>
            <textarea style={{ ...DARK_INP, resize: 'vertical' }} rows={2} value={form.description || ''} onChange={e => set('description', e.target.value)} />
          </div>
        </div>

        {/* Catégorie */}
        <div style={{ marginBottom: 18 }}>
          <span style={DARK_SEC}>Catégorie & Affichage</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <label style={DARK_LBL}>Discipline *</label>
              <select style={{ ...DARK_INP, appearance: 'none' }} value={form.axis || 'A'} onChange={e => set('axis', e.target.value)}>
                {Object.entries(AXES_CFG).map(([k, a]) => <option key={k} value={k}>{a.label}</option>)}
              </select>
            </div>
            <div>
              <label style={DARK_LBL}>Format grille</label>
              <select style={{ ...DARK_INP, appearance: 'none' }} value={form.span || 'normal'} onChange={e => set('span', e.target.value)}>
                <option value="normal">Normal (4 col)</option>
                <option value="wide">Large (8 col)</option>
                <option value="tall">Haut (2 lignes)</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={DARK_LBL}>Tags (virgule)</label>
              <input style={DARK_INP} value={form.tags || ''} onChange={e => set('tags', e.target.value)} placeholder="Architecture, Luxe" />
            </div>
            <div>
              <label style={DARK_LBL}>Ordre d'affichage</label>
              <input style={DARK_INP} type="number" value={form.display_order ?? 0} onChange={e => set('display_order', e.target.value)} min={0} />
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 10 }}>
            <button type="button" onClick={() => set('visible', !form.visible)} style={{ position: 'relative', width: 34, height: 18, borderRadius: 9, border: 'none', background: form.visible ? '#C8B89A' : 'rgba(255,255,255,0.12)', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
              <span style={{ position: 'absolute', top: 2, left: form.visible ? 18 : 2, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
            </button>
            <span style={{ ...DARK_LBL, margin: 0 }}>Visible sur le site</span>
          </label>
        </div>

        {/* Fiche technique */}
        <div style={{ marginBottom: 18 }}>
          <span style={DARK_SEC}>Fiche technique</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div><label style={DARK_LBL}>Programme</label><input style={DARK_INP} value={form.programme || ''} onChange={e => set('programme', e.target.value)} /></div>
            <div><label style={DARK_LBL}>Surface</label><input style={DARK_INP} value={form.surface || ''} onChange={e => set('surface', e.target.value)} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={DARK_LBL}>Statut</label>
              <select style={{ ...DARK_INP, appearance: 'none' }} value={form.statut || 'En cours'} onChange={e => set('statut', e.target.value)}>
                {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div><label style={DARK_LBL}>Maître d'ouvrage</label><input style={DARK_INP} value={form.maitre_ouvrage || ''} onChange={e => set('maitre_ouvrage', e.target.value)} /></div>
          </div>
        </div>

        {/* Images */}
        <div style={{ marginBottom: 18 }}>
          <span style={DARK_SEC}>Images</span>
          <div style={{ marginBottom: 8 }}>
            <label style={DARK_LBL}>Principale (URL)</label>
            <input style={DARK_INP} value={form.image_url || ''} onChange={e => set('image_url', e.target.value)} placeholder="https://..." />
            {form.image_url && (
              <div style={{ marginTop: 6, height: 90, borderRadius: 6, overflow: 'hidden', background: '#0D0E10' }}>
                <img src={form.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none' }} />
              </div>
            )}
          </div>
          {(form.gallery || []).map((url, i) => (
            <div key={i} style={{ marginBottom: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                style={{ ...DARK_INP, flex: 1 }}
                value={url}
                onChange={e => { const g = [...(form.gallery || [])]; g[i] = e.target.value; set('gallery', g) }}
                placeholder={`Image ${i + 1} — https://...`}
              />
              <button
                onClick={() => { const g = (form.gallery || []).filter((_, idx) => idx !== i); set('gallery', g) }}
                style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: 'rgba(239,68,68,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
          <button
            onClick={() => set('gallery', [...(form.gallery || []), ''])}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)', color: 'rgba(245,240,234,0.35)', cursor: 'pointer', fontSize: 11, fontFamily: 'Space Grotesk, sans-serif', width: '100%', justifyContent: 'center' }}
          >
            <Plus size={11} /> Ajouter une image
          </button>
        </div>

        {/* Histoire */}
        <div style={{ marginBottom: 18 }}>
          <span style={DARK_SEC}>Histoire du projet</span>
          <textarea
            style={{ ...DARK_INP, resize: 'vertical', lineHeight: 1.65 }}
            rows={8}
            value={form.story || ''}
            onChange={e => set('story', e.target.value)}
            placeholder={"Premier paragraphe (grand).\n\nDeuxième paragraphe.\n\nTroisième..."}
          />
          <div style={{ fontSize: 10, color: 'rgba(245,240,234,0.25)', marginTop: 4, fontFamily: 'Space Grotesk, sans-serif', lineHeight: 1.5 }}>
            Paragraphes séparés par une ligne vide. Le 1er s'affiche en grand.
          </div>
        </div>

        {/* Danger zone */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 14 }}>
          <button onClick={onDelete} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 7, color: 'rgba(239,68,68,0.65)', cursor: 'pointer', fontSize: 11, fontFamily: 'Space Grotesk, sans-serif' }}>
            <Trash2 size={11} /> Supprimer ce projet
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Site-content single-field editors ─── */
function TextEditor({ value, onChange, multiline }) {
  const Tag = multiline ? 'textarea' : 'input'
  return <Tag value={value} onChange={e => onChange(e.target.value)} rows={multiline ? 6 : undefined} style={{ ...DARK_INP, resize: multiline ? 'vertical' : 'none' }} />
}

function ImageEditor({ value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder="https://..." style={DARK_INP} />
      {value && (
        <div style={{ width: '100%', height: 140, borderRadius: 8, overflow: 'hidden', background: '#1A1B1C' }}>
          <img src={value} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none' }} />
        </div>
      )}
    </div>
  )
}

function PhrasesEditor({ value, onChange }) {
  const [active, setActive] = useState(0)
  let phrases = []
  try { phrases = JSON.parse(value || '[]') } catch { phrases = [] }
  if (!Array.isArray(phrases)) phrases = []

  const update     = (i, field, v) => onChange(JSON.stringify(phrases.map((p, idx) => idx === i ? { ...p, [field]: v } : p)))
  const addPhrase  = () => { const n = [...phrases, { line1: '', line2: '', image: '' }]; onChange(JSON.stringify(n)); setActive(n.length - 1) }
  const remPhrase  = (i) => { const n = phrases.filter((_, idx) => idx !== i); onChange(JSON.stringify(n)); setActive(Math.max(0, i - 1)) }
  const cur = phrases[active] || { line1: '', line2: '', image: '' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
        {phrases.map((_, i) => (
          <button key={i} onClick={() => setActive(i)} style={{ padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', background: i === active ? 'rgba(200,184,154,0.2)' : 'rgba(255,255,255,0.07)', color: i === active ? '#C8B89A' : 'rgba(245,240,234,0.4)', fontSize: 11, fontFamily: 'Space Grotesk, sans-serif', fontWeight: i === active ? 600 : 400, outline: i === active ? '1px solid rgba(200,184,154,0.3)' : '1px solid transparent' }}>{i + 1}</button>
        ))}
        <button onClick={addPhrase} style={{ width: 24, height: 24, borderRadius: '50%', border: '1px dashed rgba(255,255,255,0.2)', background: 'none', color: 'rgba(245,240,234,0.35)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={11} /></button>
      </div>
      {phrases.length > 0 && (
        <>
          <div><label style={DARK_LBL}>Ligne 1</label><input value={cur.line1 || ''} onChange={e => update(active, 'line1', e.target.value)} style={DARK_INP} /></div>
          <div><label style={DARK_LBL}>Ligne 2 — italique</label><input value={cur.line2 || ''} onChange={e => update(active, 'line2', e.target.value)} style={DARK_INP} /></div>
          <div>
            <label style={DARK_LBL}>Photo de fond (URL)</label>
            <input value={cur.image || ''} onChange={e => update(active, 'image', e.target.value)} style={DARK_INP} placeholder="https://…" />
          </div>
          {cur.image ? (
            <div style={{ height: 72, borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, background: `url('${cur.image}') center/cover`, filter: 'brightness(0.45) saturate(0.5)' }} />
              <div style={{ position: 'absolute', inset: 0, padding: '10px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 15, color: '#F5F0EA', lineHeight: 1 }}>{cur.line1 || <span style={{ opacity: 0.35 }}>Ligne 1</span>}</div>
                <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 15, fontStyle: 'italic', color: 'rgba(245,240,234,0.4)', lineHeight: 1.1 }}>{cur.line2 || <span style={{ opacity: 0.35 }}>Ligne 2</span>}</div>
              </div>
            </div>
          ) : (
            <div style={{ background: '#08090A', borderRadius: 8, padding: '14px 18px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 22, lineHeight: 1.05, color: '#F5F0EA' }}>{cur.line1 || <span style={{ opacity: 0.2, fontStyle: 'italic' }}>Ligne 1…</span>}</div>
              <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 22, lineHeight: 1.1, fontStyle: 'italic', color: 'rgba(245,240,234,0.35)' }}>{cur.line2 || <span style={{ opacity: 0.2 }}>Ligne 2…</span>}</div>
            </div>
          )}
          {phrases.length > 1 && (
            <button onClick={() => remPhrase(active)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, color: 'rgba(239,68,68,0.7)', cursor: 'pointer', fontSize: 11, fontFamily: 'Space Grotesk, sans-serif', alignSelf: 'flex-start' }}>
              <Trash2 size={10} /> Supprimer cette phrase
            </button>
          )}
        </>
      )}
    </div>
  )
}

function EditPanel({ item, draft, setDraft, saving, onSave, onClose }) {
  const type    = item.elementType
  const friendly = { text: 'Texte', multiline: 'Paragraphe', image: 'Image (URL)', 'json-phrases': 'Phrases animées' }[type] || type

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
            <span style={{ ...DARK_LBL, margin: 0 }}>{friendly}</span>
            {item.lang && (
              <span style={{ fontSize: 10, background: 'rgba(200,184,154,0.18)', color: '#C8B89A', padding: '1px 7px', borderRadius: 4, fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {item.lang}
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: '#F5F0EA', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600 }}>{item.originalKey || item.key}</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,240,234,0.4)', padding: 4 }}><X size={16} /></button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {type === 'image'        && <ImageEditor value={draft} onChange={setDraft} />}
        {type === 'json-phrases' && <PhrasesEditor value={draft} onChange={setDraft} />}
        {type === 'multiline'    && <TextEditor value={draft} onChange={setDraft} multiline />}
        {!['image', 'json-phrases', 'multiline'].includes(type) && <TextEditor value={draft} onChange={setDraft} multiline={false} />}
      </div>
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 8, flexShrink: 0 }}>
        <button onClick={onClose} style={{ flex: 1, padding: '9px 0', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(245,240,234,0.5)', cursor: 'pointer', fontSize: 11, fontFamily: 'Space Grotesk, sans-serif' }}>Annuler</button>
        <button onClick={onSave} disabled={saving} style={{ flex: 2, padding: '9px 0', borderRadius: 8, background: saving ? 'rgba(200,184,154,0.3)' : '#C8B89A', border: 'none', color: '#08090A', cursor: saving ? 'default' : 'pointer', fontSize: 11, fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {saving ? '…' : <><Save size={13} /> Enregistrer</>}
        </button>
      </div>
    </div>
  )
}

/* ─── ProjectModal — dark-themed, unified with editor aesthetic ─── */
function ProjectModal({ defaultAxis, onClose, onSave }) {
  const [form, setForm] = useState({ ...EMPTY_PROJECT, axis: defaultAxis || 'A' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Le titre est obligatoire'); return }
    setSaving(true)
    const payload = {
      title: form.title.trim(), location: form.location.trim(), year: form.year.trim(),
      description: form.description.trim(), axis: form.axis, programme: form.programme.trim(),
      surface: form.surface.trim(), statut: form.statut, maitre_ouvrage: form.maitre_ouvrage.trim(),
      story: form.story.trim(), image_url: form.image_url.trim(),
      gallery: form.gallery.filter(Boolean),
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      span: form.span, display_order: Number(form.display_order) || 0, visible: form.visible,
    }
    const { error, data } = await supabase.from(TABLE).insert([payload]).select()
    setSaving(false)
    if (error) { toast.error('Erreur : ' + error.message); return }
    toast.success('Projet ajouté ✓')
    const savedRow = data?.[0] ?? { id: `tmp-${Date.now()}`, ...payload, created_at: new Date().toISOString() }
    onSave(savedRow)
  }

  const MODAL_BG  = '#0E0F10'
  const PANEL_BG  = '#111213'
  const BORDER    = 'rgba(255,255,255,0.08)'
  const INPUT_S   = { ...DARK_INP, fontSize: 13 }
  const LABEL_S   = { ...DARK_LBL, fontSize: 10 }
  const SEL_S     = { ...INPUT_S, appearance: 'none' }

  const Section = ({ title, children }) => (
    <div style={{ marginBottom: 22 }}>
      <span style={{ ...DARK_SEC, marginBottom: 14 }}>{title}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </div>
  )
  const Row = ({ children }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{children}</div>
  )

  return (
    <>
    <motion.div
      style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    />
    <motion.div
      style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: 560, zIndex: 2001, background: MODAL_BG, borderLeft: `1px solid ${BORDER}`, boxShadow: '-24px 0 80px rgba(0,0,0,0.7)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
      initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
    >
        {/* Sticky header */}
        <div style={{ position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: PANEL_BG, borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
          <div>
            <div style={{ ...DARK_LBL, margin: 0, marginBottom: 3 }}>Nouveau projet</div>
            <div style={{ fontSize: 14, color: '#F5F0EA', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600 }}>
              {AXES_CFG[form.axis]?.label || '—'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: saving ? 'rgba(200,184,154,0.3)' : '#C8B89A', border: 'none', color: '#08090A', cursor: saving ? 'default' : 'pointer', fontSize: 12, fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700 }}>
              <Save size={13} />{saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button onClick={onClose} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`, color: 'rgba(245,240,234,0.4)', cursor: 'pointer' }}><X size={15} /></button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
          <Section title="Identité">
            <div><label style={LABEL_S}>Titre *</label><input autoFocus style={INPUT_S} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Villa contemporaine" /></div>
            <Row>
              <div><label style={LABEL_S}>Ville</label><input style={INPUT_S} value={form.location} onChange={e => set('location', e.target.value)} /></div>
              <div><label style={LABEL_S}>Année</label><input style={INPUT_S} value={form.year} onChange={e => set('year', e.target.value)} /></div>
            </Row>
            <div><label style={LABEL_S}>Description courte</label><textarea style={{ ...INPUT_S, resize: 'vertical' }} rows={2} value={form.description} onChange={e => set('description', e.target.value)} /></div>
          </Section>

          <Section title="Catégorie & Affichage">
            <Row>
              <div>
                <label style={LABEL_S}>Discipline *</label>
                <div style={{ position: 'relative' }}>
                  <select style={SEL_S} value={form.axis} onChange={e => set('axis', e.target.value)}>
                    {Object.entries(AXES_CFG).map(([k, a]) => <option key={k} value={k}>{a.label}</option>)}
                  </select>
                  <ChevronDown size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(245,240,234,0.3)', pointerEvents: 'none' }} />
                </div>
              </div>
              <div>
                <label style={LABEL_S}>Format grille</label>
                <div style={{ position: 'relative' }}>
                  <select style={SEL_S} value={form.span} onChange={e => set('span', e.target.value)}>
                    <option value="normal">Normal (4 col)</option>
                    <option value="wide">Large (8 col)</option>
                    <option value="tall">Haut (2 lignes)</option>
                  </select>
                  <ChevronDown size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(245,240,234,0.3)', pointerEvents: 'none' }} />
                </div>
              </div>
            </Row>
            <Row>
              <div><label style={LABEL_S}>Tags (virgule)</label><input style={INPUT_S} value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="Architecture, Luxe" /></div>
              <div><label style={LABEL_S}>Ordre d'affichage</label><input style={INPUT_S} type="number" value={form.display_order} onChange={e => set('display_order', e.target.value)} min={0} /></div>
            </Row>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <button type="button" onClick={() => set('visible', !form.visible)} style={{ position: 'relative', width: 34, height: 18, borderRadius: 9, border: 'none', background: form.visible ? '#C8B89A' : 'rgba(255,255,255,0.12)', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
                <span style={{ position: 'absolute', top: 2, left: form.visible ? 18 : 2, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
              </button>
              <span style={{ fontSize: 12, color: 'rgba(245,240,234,0.55)', fontFamily: 'Space Grotesk, sans-serif' }}>Visible sur le site</span>
            </label>
          </Section>

          <Section title="Fiche technique">
            <Row>
              <div><label style={LABEL_S}>Programme</label><input style={INPUT_S} value={form.programme} onChange={e => set('programme', e.target.value)} /></div>
              <div><label style={LABEL_S}>Surface</label><input style={INPUT_S} value={form.surface} onChange={e => set('surface', e.target.value)} /></div>
            </Row>
            <Row>
              <div>
                <label style={LABEL_S}>Statut</label>
                <div style={{ position: 'relative' }}>
                  <select style={SEL_S} value={form.statut} onChange={e => set('statut', e.target.value)}>
                    {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(245,240,234,0.3)', pointerEvents: 'none' }} />
                </div>
              </div>
              <div><label style={LABEL_S}>Maître d'ouvrage</label><input style={INPUT_S} value={form.maitre_ouvrage} onChange={e => set('maitre_ouvrage', e.target.value)} /></div>
            </Row>
          </Section>

          <Section title="Images">
            <div>
              <label style={LABEL_S}>Image principale (URL)</label>
              <input style={INPUT_S} value={form.image_url} onChange={e => set('image_url', e.target.value)} placeholder="https://..." />
              {form.image_url && (
                <div style={{ marginTop: 8, height: 110, borderRadius: 8, overflow: 'hidden', background: '#0D0E10' }}>
                  <img src={form.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none' }} />
                </div>
              )}
            </div>
            {(form.gallery || []).map((url, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input style={{ ...INPUT_S, flex: 1 }} value={url} onChange={e => { const g = [...(form.gallery || [])]; g[i] = e.target.value; set('gallery', g) }} placeholder={`Image ${i + 1} — https://...`} />
                <button onClick={() => set('gallery', (form.gallery || []).filter((_, idx) => idx !== i))} style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: 'rgba(239,68,68,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
            <button onClick={() => set('gallery', [...(form.gallery || []), ''])} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 0', borderRadius: 7, background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)', color: 'rgba(245,240,234,0.35)', cursor: 'pointer', fontSize: 11, fontFamily: 'Space Grotesk, sans-serif', width: '100%' }}>
              <Plus size={11} /> Ajouter une image
            </button>
          </Section>

          <Section title="Histoire du projet">
            <div>
              <textarea style={{ ...INPUT_S, resize: 'vertical', lineHeight: 1.65 }} rows={8} value={form.story} onChange={e => set('story', e.target.value)} placeholder={"Premier paragraphe (grand).\n\nDeuxième paragraphe.\n\nTroisième..."} />
              <div style={{ fontSize: 10, color: 'rgba(245,240,234,0.25)', marginTop: 5, fontFamily: 'Space Grotesk, sans-serif', lineHeight: 1.5 }}>Le 1er paragraphe s'affiche en grand dans la page projet.</div>
            </div>
          </Section>
        </div>
    </motion.div>
    </>
  )
}

/* ─── DeleteModal ─── */
function DeleteModal({ project, onConfirm, onClose }) {
  return (
    <motion.div
      style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
    >
      <motion.div
        style={{ background: '#111213', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 16, boxShadow: '0 24px 80px rgba(0,0,0,0.7)', width: '100%', maxWidth: 360, padding: 24 }}
        initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={e => e.stopPropagation()}
      >
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Trash2 size={18} style={{ color: 'rgba(239,68,68,0.7)' }} />
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#F5F0EA', fontFamily: 'Space Grotesk, sans-serif', marginBottom: 6 }}>Supprimer le projet</div>
        <div style={{ fontSize: 12, color: 'rgba(245,240,234,0.45)', fontFamily: 'Space Grotesk, sans-serif', lineHeight: 1.6, marginBottom: 22 }}>
          «&nbsp;{project.title}&nbsp;» sera définitivement supprimé du portfolio public.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '9px 0', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(245,240,234,0.5)', cursor: 'pointer', fontSize: 12, fontFamily: 'Space Grotesk, sans-serif' }}>Annuler</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: '9px 0', borderRadius: 8, background: 'rgba(239,68,68,0.85)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 12, fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700 }}>Supprimer</button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ─────────────────────────────────────────── Main page */
export default function PortfolioPage() {
  const navigate  = useNavigate()
  const iframeRef = useRef(null)

  /* ── UI ── */
  const [isMobile, setIsMobile]       = useState(false)
  const [currentPath, setCurrentPath] = useState('/')
  const [liveUrl, setLiveUrl]         = useState(() => localStorage.getItem(STORAGE_URL_KEY) || DEFAULT_URL)
  const [urlDraft, setUrlDraft]       = useState(liveUrl)
  const [showUrl, setShowUrl]         = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [iframeReady, setIframeReady] = useState(false)
  const [iframeTimeout, setIframeTimeout] = useState(false)
  const iframeTimerRef = useRef(null)

  /* ── Site-content single-field ── */
  const [editPanel, setEditPanel] = useState(null)
  const [draft, setDraft]         = useState('')
  const [saving, setSaving]       = useState(false)

  /* ── Inline project edit ── */
  const [projectForm, setProjectForm]     = useState(null)
  const [projectSaving, setProjectSaving] = useState(false)

  /* ── Project CRUD ── */
  const [projects, setProjects]         = useState([])
  const [projectsLoaded, setProjectsLoaded] = useState(false)
  const [modal, setModal]               = useState(null)
  const [toDelete, setToDelete]         = useState(null)

  /* ── Path detection ── */
  const projectIdMatch       = currentPath.match(/^\/projet\/(.+)$/)
  const currentProjectId     = projectIdMatch?.[1] || null
  const disciplineMatch      = currentPath.match(/^\/discipline\/([a-zA-Z])/)
  const currentDisciplineKey = disciplineMatch?.[1]?.toUpperCase() || null

  /* Ref to avoid stale closures in message handler */
  const currentProjectIdRef = useRef(null)
  useEffect(() => { currentProjectIdRef.current = currentProjectId }, [currentProjectId])

  /* ── Load projects ── */
  const loadProjects = useCallback(async () => {
    const { data, error } = await supabase.from(TABLE).select('*').order('display_order', { ascending: true })
    if (!error) setProjects(data || [])
    else toast.error('Erreur de chargement', { id: 'portfolio-load' })
    setProjectsLoaded(true)
  }, [])

  useEffect(() => { loadProjects() }, [loadProjects])

  /* ── Sync inline project form when currentProjectId changes ── */
  useEffect(() => {
    if (!currentProjectId) { setProjectForm(null); return }
    const project = projects.find(p => String(p.id) === currentProjectId)
    if (project) {
      setProjectForm({
        ...project,
        tags:    (project.tags || []).join(', '),
        gallery: [...(project.gallery || [''])],
      })
    } else {
      setProjectForm(null)
    }
  }, [currentProjectId, projects])

  /* ── postMessage from iframe ── */
  useEffect(() => {
    /* Track previous path in a ref so we can detect real navigation vs
       React Router's internal replaceState calls (scroll restoration). */
    const prevPathRef = { current: '/' }

    const handler = (e) => {
      if (!e.data) return

      if (e.data.type === 'cms-ready') {
        // iframe React app is fully mounted — enable edit mode immediately (no timeout needed)
        iframeRef.current?.contentWindow?.postMessage({ type: 'cms-enable' }, '*')
        setIframeReady(true)
        setIframeTimeout(false)
        if (iframeTimerRef.current) clearTimeout(iframeTimerRef.current)
      }

      if (e.data.type === 'cms-navigate') {
        const newPath = e.data.path || '/'
        const pathChanged = newPath !== prevPathRef.current
        prevPathRef.current = newPath
        setCurrentPath(newPath)
        /* Only close editPanel when the user actually navigated to a
           different page — not on React Router's internal replaceState. */
        if (pathChanged) setEditPanel(null)
      }

      if (e.data.type === 'cms-click') {
        /* If we're on a project page, the inline panel handles editing */
        if (currentProjectIdRef.current) return
        const clickLang = e.data.lang || 'fr'
        const origKey   = e.data.key
        // Keys for site_content are lang-prefixed so each language has its own value
        const langKey   = `${clickLang}.${origKey}`
        setEditPanel({
          key:         langKey,
          originalKey: origKey,
          lang:        clickLang,
          elementType: e.data.elementType,
          table:       e.data.table || 'site_content',
          entityId:    e.data.entityId || null,
        })
        // Pre-fill with rendered value; then check Supabase for an existing lang-specific override
        setDraft(e.data.value || '')
        supabase.from('site_content').select('value').eq('key', langKey).maybeSingle()
          .then(({ data }) => { if (data?.value != null) setDraft(data.value) })
      }
    }

    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, []) // stable — uses refs, no stale closures

  const enableEditMode = useCallback(() => {
    // Fallback: cms-ready from the iframe is the primary signal (handled above in the message listener).
    // This fires on onLoad as a safety net in case cms-ready was already sent before we were listening.
    setTimeout(() => iframeRef.current?.contentWindow?.postMessage({ type: 'cms-enable' }, '*'), 80)
    // Start a 10s timeout — if cms-ready never arrives, flag the URL as unreachable
    if (iframeTimerRef.current) clearTimeout(iframeTimerRef.current)
    setIframeReady(false)
    setIframeTimeout(false)
    iframeTimerRef.current = setTimeout(() => setIframeTimeout(true), 10000)
  }, [])

  /* ── Save site_content field ── */
  const handleSiteContentSave = async () => {
    if (!editPanel) return
    setSaving(true)
    try {
      // Try upsert first (requires UNIQUE constraint on key)
      const { error: upsertErr } = await supabase.from('site_content')
        .upsert({ key: editPanel.key, value: draft }, { onConflict: 'key' })
      if (upsertErr) {
        // Fallback: try update then insert
        const { data: existing } = await supabase.from('site_content').select('key').eq('key', editPanel.key).maybeSingle()
        if (existing) {
          const { error } = await supabase.from('site_content').update({ value: draft }).eq('key', editPanel.key)
          if (error) throw error
        } else {
          const { error } = await supabase.from('site_content').insert({ key: editPanel.key, value: draft })
          if (error) throw error
        }
      }
      iframeRef.current?.contentWindow?.postMessage({ type: 'cms-update', key: editPanel.key, value: draft }, '*')
      toast.success('Sauvegardé ✓')
      setEditPanel(null)
    } catch (err) { toast.error('Erreur : ' + (err?.message || 'sauvegarde échouée')) }
    finally { setSaving(false) }
  }

  /* ── Save project inline form ── */
  const handleProjectSave = async () => {
    if (!projectForm?.id) return
    setProjectSaving(true)
    const payload = {
      title:          projectForm.title?.trim(),
      location:       projectForm.location?.trim(),
      year:           projectForm.year?.trim(),
      description:    projectForm.description?.trim(),
      axis:           projectForm.axis,
      programme:      projectForm.programme?.trim(),
      surface:        projectForm.surface?.trim(),
      statut:         projectForm.statut,
      maitre_ouvrage: projectForm.maitre_ouvrage?.trim(),
      story:          projectForm.story?.trim(),
      image_url:      projectForm.image_url?.trim(),
      gallery:        (projectForm.gallery || []).filter(Boolean),
      tags:           (projectForm.tags || '').split(',').map(t => t.trim()).filter(Boolean),
      span:           projectForm.span,
      display_order:  Number(projectForm.display_order) || 0,
      visible:        projectForm.visible,
      updated_at:     new Date().toISOString(),
    }
    const { error } = await supabase.from(TABLE).update(payload).eq('id', projectForm.id)
    setProjectSaving(false)
    if (error) { toast.error('Erreur : ' + error.message); return }
    toast.success('Projet enregistré ✓')
    iframeRef.current?.contentWindow?.postMessage({ type: 'cms-reload' }, '*')
    setTimeout(() => iframeRef.current?.contentWindow?.postMessage({ type: 'cms-enable' }, '*'), 1200)
    loadProjects()
  }

  /* ── Delete project ── */
  const handleDeleteProject = async () => {
    const target = toDelete
    if (!target) return
    const { error } = await supabase.from(TABLE).delete().eq('id', target.id)
    if (error) { toast.error('Erreur : ' + error.message); return }
    toast.success('Projet supprimé')
    setToDelete(null)
    if (currentProjectId === String(target.id) && iframeRef.current) {
      iframeRef.current.src = `${liveUrl}/`
    }
    loadProjects()
  }

  const applyUrl = () => {
    setLiveUrl(urlDraft)
    localStorage.setItem(STORAGE_URL_KEY, urlDraft)
    setShowUrl(false)
    if (iframeRef.current) iframeRef.current.src = `${urlDraft}${currentPath}`
  }

  const hasRightPanel = !!projectForm || !!editPanel

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#0A0B0C', display: 'flex', flexDirection: 'column' }}>

      {/* ── TOP BAR ── */}
      <div style={{ height: 52, flexShrink: 0, background: '#111213', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', padding: '0 10px', gap: 8 }}>

        <button onClick={() => navigate('/app')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: 'none', color: 'rgba(245,240,234,0.55)', cursor: 'pointer', fontSize: 11, fontFamily: 'Space Grotesk, sans-serif', transition: 'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color = '#F5F0EA'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(245,240,234,0.55)'}>
          <X size={14} /><span>Quitter</span>
        </button>

        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

        <div style={{ flex: 1 }} />

        {currentPath !== '/' && (
          <div style={{ fontSize: 10, color: 'rgba(245,240,234,0.22)', fontFamily: 'Space Grotesk, sans-serif', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentPath}
          </div>
        )}

        <button
          onClick={() => setShowAnalytics(v => !v)}
          title="Analyses du site"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: showAnalytics ? 'rgba(200,184,154,0.15)' : 'rgba(255,255,255,0.06)',
            color: showAnalytics ? '#C8B89A' : 'rgba(245,240,234,0.4)',
            fontSize: 11, fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { if (!showAnalytics) e.currentTarget.style.color = '#F5F0EA' }}
          onMouseLeave={e => { if (!showAnalytics) e.currentTarget.style.color = 'rgba(245,240,234,0.4)' }}
        >
          <BarChart2 size={14} />
          <span>Analyses</span>
        </button>

        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 3, gap: 2 }}>
          {[{ Icon: Monitor, val: false }, { Icon: Smartphone, val: true }].map(({ Icon, val }) => (
            <button key={String(val)} onClick={() => setIsMobile(val)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 26, borderRadius: 6, border: 'none', cursor: 'pointer', background: isMobile === val ? 'rgba(255,255,255,0.14)' : 'transparent', color: isMobile === val ? '#F5F0EA' : 'rgba(245,240,234,0.3)' }}>
              <Icon size={14} />
            </button>
          ))}
        </div>

        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowUrl(v => !v)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', background: showUrl ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)', color: showUrl ? '#F5F0EA' : 'rgba(245,240,234,0.4)' }}>
            <ExternalLink size={13} />
          </button>
          {showUrl && (
            <div style={{ position: 'absolute', top: 36, right: 0, zIndex: 200, background: '#1A1B1C', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 14, width: 300, boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
              <div style={{ ...DARK_LBL, marginBottom: 8 }}>URL du portfolio</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input value={urlDraft} onChange={e => setUrlDraft(e.target.value)} onKeyDown={e => e.key === 'Enter' && applyUrl()} style={{ ...DARK_INP, flex: 1 }} />
                <button onClick={applyUrl} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '7px 12px', borderRadius: 7, background: '#C8B89A', border: 'none', color: '#08090A', cursor: 'pointer', fontWeight: 700 }}><Check size={14} /></button>
              </div>
              <div style={{ marginTop: 8, fontSize: 10, color: 'rgba(245,240,234,0.25)', fontFamily: 'Space Grotesk, sans-serif', lineHeight: 1.5 }}>Par défaut : http://localhost:5174</div>
            </div>
          )}
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>

        {/* ── APERÇU ── */}
        <div style={{ flex: 1, minWidth: 0, minHeight: 0, position: 'relative', display: 'flex', alignItems: showAnalytics ? 'stretch' : (isMobile ? 'flex-start' : 'stretch'), justifyContent: showAnalytics ? 'stretch' : (isMobile ? 'center' : 'stretch'), overflowY: showAnalytics ? 'hidden' : (isMobile ? 'auto' : 'hidden'), padding: (!showAnalytics && isMobile) ? '28px 20px' : 0, background: (!showAnalytics && isMobile) ? '#0D0E10' : 'transparent' }}>

          {/* Analytics overlay */}
          {showAnalytics && (
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <SiteAnalytics />
            </div>
          )}

          <div style={showAnalytics ? { display: 'none' } : (isMobile
            ? { width: 390, flexShrink: 0, border: '10px solid #1C1D1E', borderRadius: 44, overflow: 'hidden', boxShadow: '0 0 0 1px rgba(255,255,255,0.07), 0 24px 80px rgba(0,0,0,0.85)' }
            : { flex: 1, display: 'flex', position: 'relative' }
          )}>
            {liveUrl.includes('localhost') && typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, color: 'rgba(245,240,234,0.25)', textAlign: 'center', padding: '0 40px' }}>
                <ExternalLink size={32} style={{ opacity: 0.18 }} />
                <div>
                  <div style={{ fontSize: 15, color: 'rgba(245,240,234,0.55)', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, marginBottom: 8 }}>URL du portfolio non configurée</div>
                  <div style={{ fontSize: 12, fontFamily: 'Space Grotesk, sans-serif', lineHeight: 1.7, maxWidth: 340 }}>
                    L'aperçu charge <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>localhost:5174</code> par défaut, inaccessible en ligne.<br />
                    Renseignez l'URL de votre portfolio déployé via le bouton <ExternalLink size={11} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 2px' }} /> en haut à droite.
                  </div>
                </div>
                <button
                  onClick={() => setShowUrl(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, background: 'rgba(200,184,154,0.15)', border: '1px solid rgba(200,184,154,0.25)', color: '#C8B89A', fontSize: 12, fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, cursor: 'pointer' }}
                >
                  <ExternalLink size={13} />
                  Configurer l'URL du portfolio
                </button>
              </div>
            ) : (
            <>
              <iframe
                ref={iframeRef}
                src={`${liveUrl}/`}
                onLoad={enableEditMode}
                style={{ width: '100%', height: isMobile ? 844 : '100%', border: 'none', flex: isMobile ? undefined : 1, display: 'block' }}
                title="Aperçu du portfolio"
              />
              {iframeTimeout && !iframeReady && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: 'rgba(8,9,10,0.92)', backdropFilter: 'blur(8px)', textAlign: 'center', padding: '0 40px', zIndex: 5 }}>
                  <ExternalLink size={28} color="rgba(245,240,234,0.2)" />
                  <div>
                    <div style={{ fontSize: 14, color: 'rgba(245,240,234,0.6)', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, marginBottom: 6 }}>
                      Impossible d'atteindre <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 4, fontSize: 12 }}>{liveUrl}</code>
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(245,240,234,0.3)', fontFamily: 'Space Grotesk, sans-serif', lineHeight: 1.7, maxWidth: 360 }}>
                      Vérifiez que le portfolio est bien déployé et que l'URL est correcte.
                    </div>
                  </div>
                  <button onClick={() => setShowUrl(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 9, background: 'rgba(200,184,154,0.15)', border: '1px solid rgba(200,184,154,0.25)', color: '#C8B89A', fontSize: 12, fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, cursor: 'pointer' }}>
                    <ExternalLink size={12} /> Changer l'URL
                  </button>
                </div>
              )}
            </>
            )}

            {/* Floating "+ Ajouter" on discipline pages — admin-only overlay */}
            {currentDisciplineKey && !isMobile && (
              <div style={{ position: 'absolute', bottom: 28, right: 28, zIndex: 10 }}>
                <button
                  onClick={() => setModal({ type: 'add', defaultAxis: currentDisciplineKey })}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 20px', borderRadius: 40, background: '#C8B89A', border: 'none', color: '#08090A', cursor: 'pointer', fontSize: 12, fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, boxShadow: '0 4px 24px rgba(0,0,0,0.55)', transition: 'transform 0.15s, box-shadow 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.65)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.55)' }}
                >
                  <Plus size={15} />
                  Ajouter un projet · {AXES_CFG[currentDisciplineKey]?.label || currentDisciplineKey}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        {hasRightPanel && (
          <div style={{ width: 360, flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.08)', background: '#111213', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {projectForm ? (
              <ProjectInlinePanel
                form={projectForm} onChange={setProjectForm}
                onSave={handleProjectSave} onDelete={() => setToDelete(projectForm)}
                saving={projectSaving}
              />
            ) : editPanel ? (
              <EditPanel
                item={editPanel} draft={draft} setDraft={setDraft}
                saving={saving} onSave={handleSiteContentSave} onClose={() => setEditPanel(null)}
              />
            ) : null}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {modal && <ProjectModal key="modal" defaultAxis={modal.defaultAxis} onClose={() => setModal(null)} onSave={(saved) => {
          setModal(null)
          if (saved) {
            setProjects(ps => [...ps, saved])
            iframeRef.current?.contentWindow?.postMessage({ type: 'cms-reload' }, '*')
            setTimeout(() => iframeRef.current?.contentWindow?.postMessage({ type: 'cms-enable' }, '*'), 1200)
          }
        }} />}
        {toDelete && <DeleteModal key="delete" project={toDelete} onConfirm={handleDeleteProject} onClose={() => setToDelete(null)} />}
      </AnimatePresence>

      {showUrl && <div onClick={() => setShowUrl(false)} style={{ position: 'fixed', inset: 0, zIndex: 199 }} />}

      {/* ── SQL Setup notice — shown when table is empty after first load ── */}
      <AnimatePresence>
        {projectsLoaded && projects.length === 0 && !modal && (
          <SqlSetupNotice />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── SQL setup helper — shown when portfolio_projects table is empty ── */
function SqlSetupNotice() {
  const [open, setOpen] = useState(false)
  const SQL = `-- 1. Accès admin (lecture + écriture)
CREATE POLICY "admin_all_portfolio"
  ON public.portfolio_projects
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 2. Accès public (le site portfolio peut lire les projets visibles)
CREATE POLICY "anon_select_portfolio"
  ON public.portfolio_projects
  FOR SELECT TO anon
  USING (visible = true);`

  return (
    <div style={{ position: 'fixed', bottom: 24, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 1500, pointerEvents: 'none' }}>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        pointerEvents: 'auto', maxWidth: 540, width: 'calc(100% - 48px)',
        background: '#1A1B1C', border: '1px solid rgba(200,184,154,0.25)',
        borderRadius: 14, boxShadow: '0 12px 48px rgba(0,0,0,0.7)',
        fontFamily: 'Space Grotesk, sans-serif',
      }}
    >
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(200,184,154,0.1)', border: '1px solid rgba(200,184,154,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14 }}>⚙</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#C8B89A', marginBottom: 4 }}>Configuration Supabase requise</div>
          <div style={{ fontSize: 11, color: 'rgba(245,240,234,0.45)', lineHeight: 1.6 }}>
            Aucun projet trouvé. Exécutez les 2 politiques RLS dans l'éditeur SQL de Supabase pour activer la gestion des projets.
          </div>
          <button
            onClick={() => setOpen(o => !o)}
            style={{ marginTop: 8, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: '#C8B89A', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >{open ? '▲ Masquer le SQL' : '▼ Voir le SQL à exécuter'}</button>
          {open && (
            <pre style={{
              marginTop: 10, padding: '12px 14px', borderRadius: 8,
              background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.07)',
              fontSize: 10, color: 'rgba(245,240,234,0.7)', lineHeight: 1.7,
              overflowX: 'auto', whiteSpace: 'pre', fontFamily: 'monospace',
            }}>{SQL}</pre>
          )}
        </div>
      </div>
    </motion.div>
    </div>
  )
}
