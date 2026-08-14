import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Eye, EyeOff, ExternalLink, Check, X, Image as ImageIcon,
  Pencil, Type, AlignLeft, Tag as TagIcon, Layers,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'

/* ── polices portfolio ──────────────────────────────────────────────────────── */
const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Space+Grotesk:wght@300;400;500;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;1,9..40,400&display=swap'

const AXES = {
  C: { label: 'Conservation', color: '#7BA7D4' },
  L: { label: 'Landscape',    color: '#8DBE8A' },
  A: { label: 'Architecture', color: '#C8B89A' },
  D: { label: 'Design',       color: '#B89AC8' },
  E: { label: 'Éphémère',     color: '#C8A47B' },
}

/* ── hook auto-save ─────────────────────────────────────────────────────────── */
function useAutoSave(id) {
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const timer = useRef(null)

  const save = useCallback(async (field, value, setter) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      setSaving(true)
      const { data, error } = await supabase
        .from('portfolio_projects')
        .update({ [field]: value })
        .eq('id', id)
        .select('id')
      setSaving(false)
      if (error || !data?.length) {
        toast.error('Erreur de sauvegarde — modifications non synchronisées')
      } else {
        setLastSaved(new Date())
        if (setter) setter(value)
      }
    }, 600)
  }, [id])

  return { save, saving, lastSaved }
}

/* ── composant champ texte éditable ────────────────────────────────────────── */
function EditText({ field, value, onChange, as: Tag = 'span', style, multiline = false, placeholder = 'Cliquer pour modifier…' }) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(value ?? '')
  const ref = useRef(null)

  useEffect(() => { if (editing && ref.current) ref.current.focus() }, [editing])
  useEffect(() => { setDraft(value ?? '') }, [value])

  const commit = () => {
    setEditing(false)
    if (draft !== value) onChange(field, draft)
  }
  const cancel = () => { setDraft(value ?? ''); setEditing(false) }

  const baseEdit = {
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.30)',
    borderRadius: 6,
    outline: 'none',
    color: 'inherit',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'inherit',
    fontStyle: 'inherit',
    letterSpacing: 'inherit',
    lineHeight: 'inherit',
    width: '100%',
    padding: '2px 6px',
    ...style,
  }

  if (editing) {
    if (multiline) {
      return (
        <textarea
          ref={ref}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => e.key === 'Escape' && cancel()}
          style={{ ...baseEdit, resize: 'vertical', minHeight: 120 }}
        />
      )
    }
    return (
      <input
        ref={ref}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel() }}
        style={baseEdit}
      />
    )
  }

  return (
    <Tag
      onClick={() => setEditing(true)}
      style={{
        ...style,
        cursor: 'text',
        display: 'block',
        borderRadius: 4,
        transition: 'background 0.15s, outline 0.15s',
        outline: '1px dashed transparent',
      }}
      onMouseEnter={e => { e.currentTarget.style.outline = '1px dashed rgba(255,255,255,0.25)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
      onMouseLeave={e => { e.currentTarget.style.outline = '1px dashed transparent'; e.currentTarget.style.background = 'transparent' }}
      title="Cliquer pour modifier"
    >
      {value || <span style={{ opacity: 0.25, fontStyle: 'italic', fontFamily: 'Space Grotesk, sans-serif', fontSize: 13 }}>{placeholder}</span>}
    </Tag>
  )
}

/* ── composant image éditable ───────────────────────────────────────────────── */
function EditImage({ field, value, onChange, style, label = 'Image', brightness = 0.50, saturate = 0.65 }) {
  const [open,  setOpen]  = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const inputRef = useRef(null)

  useEffect(() => { if (open && inputRef.current) inputRef.current.focus() }, [open])
  useEffect(() => { setDraft(value ?? '') }, [value])

  const commit = () => {
    setOpen(false)
    if (draft !== value) onChange(field, draft)
  }

  return (
    <div
      style={{ position: 'absolute', inset: 0, ...style }}
      onMouseEnter={e => { const btn = e.currentTarget.querySelector('[data-img-btn]'); if (btn) btn.style.opacity = '1' }}
      onMouseLeave={e => { const btn = e.currentTarget.querySelector('[data-img-btn]'); if (btn) btn.style.opacity = '0' }}
    >
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: value ? `url('${value}')` : 'none',
        backgroundSize: 'cover', backgroundPosition: 'center',
        filter: `brightness(${brightness}) saturate(${saturate})`,
        background: value ? undefined : '#1a1b1c',
      }} />

      {/* hover button */}
      <button
        data-img-btn=""
        onClick={() => setOpen(true)}
        style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: 0, transition: 'opacity 0.2s',
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: 10, padding: '10px 18px',
          display: 'flex', alignItems: 'center', gap: 8,
          color: '#F5F0EA', cursor: 'pointer',
          fontFamily: 'Space Grotesk, sans-serif', fontSize: 12, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase',
        }}
      >
        <ImageIcon size={14} />
        Changer l'image
      </button>

      {/* popover URL */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={{
              position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(10,11,12,0.96)', backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.18)', borderRadius: 12,
              padding: '16px 20px', width: 480, zIndex: 100,
              boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: 'rgba(245,240,234,0.5)' }}>
                {label}
              </span>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(245,240,234,0.4)', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                ref={inputRef}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setOpen(false) }}
                placeholder="https://images.unsplash.com/..."
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 8, padding: '8px 12px', color: '#F5F0EA',
                  fontFamily: 'Space Grotesk, sans-serif', fontSize: 12, outline: 'none',
                }}
              />
              <button
                onClick={commit}
                style={{
                  background: '#F5F0EA', color: '#08090A',
                  border: 'none', borderRadius: 8, padding: '8px 14px',
                  fontFamily: 'Space Grotesk, sans-serif', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                }}
              >
                OK
              </button>
            </div>
            {draft && (
              <div style={{ marginTop: 10, height: 56, borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                <img src={draft} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display='none'} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── page principale ────────────────────────────────────────────────────────── */
export default function PortfolioEditorPage() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const { save, saving, lastSaved } = useAutoSave(id)

  useEffect(() => {
    supabase.from('portfolio_projects').select('*').eq('id', id).single()
      .then(({ data, error }) => {
        if (!error && data) setProject(data)
        else { toast.error('Projet introuvable'); navigate('/app/portfolio') }
        setLoading(false)
      })
  }, [id, navigate])

  const handleChange = useCallback((field, value) => {
    setProject(p => ({ ...p, [field]: value }))
    save(field, value)
  }, [save])

  if (loading) {
    return <div style={{ background: '#08090A', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'rgba(245,240,234,0.3)', fontSize: 12, letterSpacing: 2 }}>Chargement…</span>
    </div>
  }
  if (!project) return null

  const axis  = AXES[project.axis] || AXES.A
  const color = axis.color
  const tags  = project.tags || []
  const story = (project.story || '').split('\n\n').filter(Boolean)
  const gallery = project.gallery || []

  return (
    <div style={{ background: '#08090A', minHeight: '100vh', color: '#F5F0EA' }}>

      {/* Inject portfolio fonts */}
      <link rel="stylesheet" href={FONTS_URL} />

      {/* ── Bandeau admin (hors preview) ────────────────────────────────────── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9000,
        height: 52, background: 'rgba(6,7,8,0.97)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16,
      }}>
        <button
          onClick={() => navigate('/app/portfolio')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', color: 'rgba(245,240,234,0.45)',
            fontFamily: 'Space Grotesk, sans-serif', fontSize: 11, letterSpacing: 1.5,
            textTransform: 'uppercase', cursor: 'pointer', transition: 'color 0.2s', padding: 0,
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#F5F0EA'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(245,240,234,0.45)'}
        >
          <ArrowLeft size={13} />
          Portfolio
        </button>

        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
          <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 12, color: 'rgba(245,240,234,0.8)', fontWeight: 500 }}>
            {project.title}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 8, padding: '4px 10px', background: 'rgba(255,255,255,0.06)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)' }}>
          <Pencil size={10} style={{ color: color }} />
          <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: color }}>
            Mode édition
          </span>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          {saving && (
            <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 10, color: 'rgba(245,240,234,0.3)', letterSpacing: 1 }}>
              Sauvegarde…
            </span>
          )}
          {lastSaved && !saving && (
            <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 10, color: color, letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Check size={11} />
              Sauvegardé
            </span>
          )}

          <button
            onClick={async () => {
              await supabase.from('portfolio_projects').update({ visible: !project.visible }).eq('id', id)
              setProject(p => ({ ...p, visible: !p.visible }))
              toast.success(project.visible ? 'Projet masqué' : 'Projet visible sur le site')
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: project.visible ? 'rgba(141,190,138,0.12)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${project.visible ? '#8DBE8A40' : 'rgba(255,255,255,0.12)'}`,
              borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
              fontFamily: 'Space Grotesk, sans-serif', fontSize: 10, letterSpacing: 1.5,
              textTransform: 'uppercase', color: project.visible ? '#8DBE8A' : 'rgba(245,240,234,0.35)',
              transition: 'all 0.2s',
            }}
          >
            {project.visible ? <Eye size={12} /> : <EyeOff size={12} />}
            {project.visible ? 'Visible' : 'Masqué'}
          </button>
        </div>
      </div>

      {/* ── Preview portfolio (commence sous le bandeau) ─────────────────────── */}
      <div style={{ paddingTop: 52 }}>

        {/* HERO */}
        <div style={{ position: 'relative', height: '100vh', minHeight: 600, overflow: 'hidden' }}>
          <EditImage
            field="image_url"
            value={project.image_url}
            onChange={handleChange}
            label="Image héro"
            brightness={0.50}
            saturate={0.65}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, #08090A 0%, rgba(8,9,10,0.4) 50%, transparent 100%)',
            pointerEvents: 'none',
          }} />

          {/* Trait coloré */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
            background: `linear-gradient(to right, transparent, ${color}, transparent)`,
            pointerEvents: 'none',
          }} />

          {/* Contenu héro */}
          <div style={{
            position: 'absolute', bottom: 'clamp(3rem, 6vh, 5rem)',
            left: 'clamp(1.5rem, 5vw, 5rem)', right: 'clamp(1.5rem, 5vw, 5rem)',
          }}>
            {/* Tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              <EditText
                field="tags_raw"
                value={tags.join(', ')}
                onChange={(_, v) => handleChange('tags', v.split(',').map(t => t.trim()).filter(Boolean))}
                as="div"
                placeholder="Tag1, Tag2, Tag3"
                style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: `${color}cc` }}
              />
            </div>

            {/* Titre */}
            <EditText
              field="title"
              value={project.title}
              onChange={handleChange}
              as="h1"
              placeholder="Titre du projet"
              style={{
                fontFamily: 'Instrument Serif, serif',
                fontSize: 'clamp(36px, 6vw, 80px)',
                fontWeight: 400, lineHeight: 1, letterSpacing: '-0.02em',
                color: '#F5F0EA', margin: '0 0 16px',
              }}
            />

            {/* Lieu & année */}
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <EditText
                field="location"
                value={project.location}
                onChange={handleChange}
                placeholder="Ville"
                style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 11, color: 'rgba(245,240,234,0.45)', letterSpacing: 0.3 }}
              />
              <span style={{ width: 1, height: 10, background: 'rgba(245,240,234,0.15)' }} />
              <EditText
                field="year"
                value={project.year}
                onChange={handleChange}
                placeholder="2024"
                style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 11, color: 'rgba(245,240,234,0.25)', letterSpacing: 1 }}
              />
            </div>
          </div>
        </div>

        {/* FICHE TECHNIQUE */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 1, background: `${color}15`, borderBottom: `1px solid ${color}18`,
        }}>
          {[
            { label: 'Surface',         field: 'surface',       value: project.surface },
            { label: 'Programme',        field: 'programme',     value: project.programme },
            { label: "Maître d'ouvrage", field: 'maitre_ouvrage', value: project.maitre_ouvrage },
            { label: 'Statut',           field: 'statut',        value: project.statut },
          ].map(({ label, field, value }) => (
            <div key={field} style={{ padding: 'clamp(1.5rem, 3vw, 2rem) clamp(1.5rem, 4vw, 3rem)', background: '#08090A', borderRight: `1px solid ${color}12` }}>
              <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 8, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(245,240,234,0.3)', marginBottom: 8 }}>
                {label}
              </div>
              <EditText
                field={field}
                value={value}
                onChange={handleChange}
                placeholder="—"
                style={{ fontFamily: 'Instrument Serif, serif', fontSize: 'clamp(16px, 2vw, 22px)', fontWeight: 400, color: '#F5F0EA', lineHeight: 1.2 }}
              />
            </div>
          ))}
        </div>

        {/* HISTOIRE */}
        <div style={{ padding: 'clamp(5rem, 10vw, 9rem) clamp(1.5rem, 5vw, 5rem)', maxWidth: 900, margin: '0 auto' }}>
          <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 9, letterSpacing: 3.5, textTransform: 'uppercase', color, display: 'block', marginBottom: 32 }}>
            L'histoire
          </span>

          <EditText
            field="story"
            value={project.story}
            onChange={handleChange}
            as="div"
            multiline
            placeholder={"Premier paragraphe (grand, serif).\n\nDeuxième paragraphe...\n\nTroisième paragraphe..."}
            style={{
              fontFamily: 'Instrument Serif, serif',
              fontSize: 'clamp(18px, 2.5vw, 26px)',
              fontWeight: 400, lineHeight: 1.6,
              color: '#F5F0EA', whiteSpace: 'pre-line',
            }}
          />

          {/* Aperçu du rendu réel avec paragraphes */}
          {story.length > 0 && (
            <div style={{ marginTop: 32, paddingTop: 32, borderTop: `1px solid rgba(255,255,255,0.06)` }}>
              <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 9, letterSpacing: 2.5, textTransform: 'uppercase', color: 'rgba(245,240,234,0.2)', marginBottom: 20 }}>
                Aperçu rendu
              </div>
              {story.map((para, i) => (
                <p key={i} style={{
                  fontFamily: i === 0 ? 'Instrument Serif, serif' : 'DM Sans, sans-serif',
                  fontSize: i === 0 ? 'clamp(22px, 3vw, 32px)' : 'clamp(15px, 1.8vw, 18px)',
                  fontWeight: 400, lineHeight: i === 0 ? 1.4 : 1.8,
                  color: i === 0 ? '#F5F0EA' : 'rgba(245,240,234,0.55)',
                  letterSpacing: i === 0 ? '-0.01em' : 0,
                  margin: '0 0 clamp(1.5rem, 3vw, 2.5rem)',
                }}>
                  {para}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* GALERIE */}
        <div style={{ padding: '0 clamp(1.5rem, 5vw, 5rem) clamp(5rem, 8vw, 7rem)' }}>
          <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 9, letterSpacing: 3.5, textTransform: 'uppercase', color: 'rgba(245,240,234,0.3)', display: 'block', marginBottom: 24 }}>
            Galerie
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
            {[0, 1].map(i => (
              <div key={i} style={{ position: 'relative', height: 'clamp(200px, 28vw, 380px)', background: '#0D0E10', borderRadius: 2, overflow: 'hidden' }}>
                <EditImage
                  field={`gallery_${i}`}
                  value={gallery[i] || ''}
                  onChange={(_, v) => {
                    const g = [...(project.gallery || []), '']
                    g[i] = v
                    handleChange('gallery', g.slice(0, Math.max(i + 1, g.length)).filter((x, idx) => idx <= i || x))
                  }}
                  label={`Image galerie ${i + 1}`}
                  brightness={0.6}
                  saturate={0.7}
                />
                {!gallery[i] && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, pointerEvents: 'none' }}>
                    <ImageIcon size={20} style={{ color: 'rgba(245,240,234,0.15)' }} />
                    <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(245,240,234,0.15)' }}>Galerie {i + 1}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{
          margin: '0 clamp(1.5rem, 5vw, 5rem) clamp(5rem, 8vw, 7rem)',
          padding: 'clamp(3rem, 6vw, 5rem)',
          border: `1px solid ${color}22`, borderRadius: 4,
          background: `${color}06`,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          textAlign: 'center', gap: 28,
        }}>
          <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 9, letterSpacing: 3.5, textTransform: 'uppercase', color: `${color}aa` }}>
            Votre projet
          </span>
          <h3 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 400, color: '#F5F0EA', lineHeight: 1.1, letterSpacing: '-0.02em', margin: 0 }}>
            Un projet similaire ?<br />
            <em style={{ color: 'rgba(245,240,234,0.28)' }}>Parlons-en.</em>
          </h3>
          <button
            style={{
              background: color, color: '#08090A',
              border: 'none', borderRadius: 40, padding: '15px 36px',
              fontFamily: 'Space Grotesk, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase',
              cursor: 'default', opacity: 0.7,
            }}
          >
            Nous contacter →
          </button>
          <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 9, color: 'rgba(245,240,234,0.2)', letterSpacing: 1 }}>
            (bouton non éditable — ouvre QuickContact sur le site)
          </span>
        </div>

      </div>
    </div>
  )
}
