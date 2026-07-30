import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Image as ImageIcon, X, Monitor, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'

/* ── Fonts portfolio ──────────────────────────────────────────────────────── */
const FONTS = 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Space+Grotesk:wght@300;400;500;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;1,9..40,400&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&display=swap'

const AXES_META = {
  C: { label: 'Conservation', color: '#7BA7D4' },
  L: { label: 'Landscape',    color: '#8DBE8A' },
  A: { label: 'Architecture', color: '#C8B89A' },
  D: { label: 'Design',       color: '#B89AC8' },
  E: { label: 'Éphémère',     color: '#C8A47B' },
}

/* ── Nav pages ────────────────────────────────────────────────────────────── */
const PAGES = [
  { key: 'home',         label: 'Accueil',       emoji: '🏠' },
  { key: 'contact',      label: 'Contact',        emoji: '✉️'  },
  { key: 'discipline.C', label: 'Conservation',   emoji: '🏛️'  },
  { key: 'discipline.L', label: 'Landscape',      emoji: '🌿' },
  { key: 'discipline.A', label: 'Architecture',   emoji: '🏗️'  },
  { key: 'discipline.D', label: 'Design',         emoji: '✏️'  },
  { key: 'discipline.E', label: 'Éphémère',       emoji: '✨' },
  { key: 'careers',      label: 'Carrières',      emoji: '👥' },
]

/* ── Auto-save hook ────────────────────────────────────────────────────────── */
function useAutoSave() {
  const [status, setStatus] = useState(null) // null | 'saving' | 'saved'
  const timers = useRef({})

  const save = useCallback(async (key, value) => {
    clearTimeout(timers.current[key])
    setStatus('saving')
    timers.current[key] = setTimeout(async () => {
      const { error } = await supabase
        .from('site_content')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
      if (error) { toast.error('Erreur sauvegarde'); setStatus(null) }
      else setStatus('saved')
    }, 700)
  }, [])

  return { save, status }
}

/* ── Composant champ texte ─────────────────────────────────────────────────── */
function Field({ label, value, onChange, multiline = false, large = false, mono = false }) {
  const [draft, setDraft] = useState(value ?? '')
  useEffect(() => setDraft(value ?? ''), [value])

  const style = {
    width: '100%',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8,
    color: '#F5F0EA',
    outline: 'none',
    resize: multiline ? 'vertical' : 'none',
    padding: '10px 14px',
    fontFamily: mono ? 'monospace' : 'DM Sans, sans-serif',
    fontSize: large ? 22 : 13,
    lineHeight: large ? 1.3 : 1.6,
    transition: 'border-color 0.15s',
  }

  const handleBlur = () => { if (draft !== value) onChange(draft) }
  const handleKeyDown = e => { if (!multiline && e.key === 'Enter') { e.preventDefault(); onChange(draft) } }

  return (
    <div>
      <label style={{ display: 'block', fontFamily: 'Space Grotesk, sans-serif', fontSize: 9, letterSpacing: 2.5, textTransform: 'uppercase', color: 'rgba(245,240,234,0.4)', marginBottom: 6 }}>
        {label}
      </label>
      {multiline
        ? <textarea value={draft} onChange={e => setDraft(e.target.value)} onBlur={handleBlur} style={{ ...style, minHeight: 80 }} />
        : <input    value={draft} onChange={e => setDraft(e.target.value)} onBlur={handleBlur} onKeyDown={handleKeyDown} style={style} />
      }
    </div>
  )
}

/* ── Composant image avec preview ─────────────────────────────────────────── */
function ImageField({ label, value, onChange }) {
  const [draft, setDraft] = useState(value ?? '')
  useEffect(() => setDraft(value ?? ''), [value])

  return (
    <div>
      <label style={{ display: 'block', fontFamily: 'Space Grotesk, sans-serif', fontSize: 9, letterSpacing: 2.5, textTransform: 'uppercase', color: 'rgba(245,240,234,0.4)', marginBottom: 6 }}>
        {label} (URL)
      </label>
      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => { if (draft !== value) onChange(draft) }}
        onKeyDown={e => e.key === 'Enter' && onChange(draft)}
        placeholder="https://images.unsplash.com/..."
        style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: '#F5F0EA', outline: 'none', padding: '10px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: 12, marginBottom: 10 }}
      />
      {draft && (
        <div style={{ height: 120, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
          <img src={draft} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.5) saturate(0.6)' }} onError={e => e.target.style.display = 'none'} />
        </div>
      )}
    </div>
  )
}

/* ── Section wrapper ────────────────────────────────────────────────────────── */
function Section({ title, color = '#C8B89A', children }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 12, borderBottom: `1px solid ${color}30` }}>
        <div style={{ width: 3, height: 16, background: color, borderRadius: 2 }} />
        <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: color, fontWeight: 600 }}>{title}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {children}
      </div>
    </div>
  )
}

/* ── Éditeur phrases animées ─────────────────────────────────────────────── */
function PhrasesEditor({ phrases, onChange, color }) {
  const [active, setActive] = useState(0)
  const current = phrases[active] || { line1: '', line2: '' }

  const updatePhrase = (field, value) => {
    const next = phrases.map((p, i) => i === active ? { ...p, [field]: value } : p)
    onChange(next)
  }

  return (
    <div>
      {/* Sélecteur de slide */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {phrases.map((p, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            style={{
              padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
              background: i === active ? color : 'rgba(255,255,255,0.08)',
              color: i === active ? '#08090A' : 'rgba(245,240,234,0.5)',
              fontFamily: 'Space Grotesk, sans-serif', fontSize: 10, fontWeight: 600,
              transition: 'all 0.2s',
            }}
          >
            Slide {i + 1}
          </button>
        ))}
      </div>

      {/* Preview live du slide */}
      <div style={{
        background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}25`,
        borderRadius: 10, padding: '20px 24px', marginBottom: 16,
        minHeight: 80, overflow: 'hidden',
      }}>
        <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 'clamp(24px, 3.5vw, 42px)', fontWeight: 400, lineHeight: 1, color: '#F5F0EA', letterSpacing: '-0.02em' }}>
          {current.line1 || <span style={{ opacity: 0.2 }}>Ligne 1…</span>}
        </div>
        <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 'clamp(24px, 3.5vw, 42px)', fontWeight: 400, fontStyle: 'italic', lineHeight: 1.05, color: 'rgba(245,240,234,0.35)', letterSpacing: '-0.02em' }}>
          {current.line2 || <span style={{ opacity: 0.2 }}>Ligne 2…</span>}
        </div>
      </div>

      {/* Champs d'édition */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Ligne 1 (droit)" value={current.line1} onChange={v => updatePhrase('line1', v)} />
        <Field label="Ligne 2 (italique)" value={current.line2} onChange={v => updatePhrase('line2', v)} />
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   PAGE PRINCIPALE
═══════════════════════════════════════════════════════════════════ */
export default function SiteEditorPage() {
  const [activePage, setActivePage] = useState('home')
  const [content, setContent]       = useState({})
  const [loading, setLoading]       = useState(true)
  const { save, status }            = useAutoSave()

  /* Charge tout le contenu du site */
  useEffect(() => {
    supabase.from('site_content').select('key, value, type, label')
      .then(({ data, error }) => {
        if (!error && data) {
          const map = {}
          data.forEach(r => { map[r.key] = r.value })
          setContent(map)
        } else if (error) {
          toast.error('Table site_content introuvable — exécutez le 2ème SQL dans Supabase', { id: 'sc-error', duration: 6000 })
        }
        setLoading(false)
      })
  }, [])

  /* Helper : lire une valeur */
  const get = (key, fallback = '') => content[key] ?? fallback

  /* Helper : modifier une valeur texte simple */
  const set = (key, value) => {
    setContent(c => ({ ...c, [key]: value }))
    save(key, value)
  }

  /* Helper : modifier un tableau JSON (phrases) */
  const setJson = (key, arr) => {
    const str = JSON.stringify(arr)
    setContent(c => ({ ...c, [key]: str }))
    save(key, str)
  }

  const getJson = (key, fallback = []) => {
    try { return JSON.parse(content[key] || 'null') || fallback } catch { return fallback }
  }

  /* ── styles partagés ── */
  const dark = { background: '#08090A', color: '#F5F0EA', fontFamily: 'Instrument Serif, serif' }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted text-sm">
        Chargement du contenu…
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      <link rel="stylesheet" href={FONTS} />

      {/* ── Sidebar navigation ──────────────────────────────────────────── */}
      <div style={{
        width: 220, flexShrink: 0,
        background: '#08090A',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        overflowY: 'auto', padding: '20px 12px',
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 8, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(245,240,234,0.25)', padding: '0 8px', marginBottom: 8 }}>
          Pages du site
        </div>
        {PAGES.map(p => {
          const isDiscipline = p.key.startsWith('discipline.')
          const axisKey      = isDiscipline ? p.key.split('.')[1] : null
          const axisColor    = axisKey ? AXES_META[axisKey]?.color : null
          const isActive     = activePage === p.key

          return (
            <button
              key={p.key}
              onClick={() => setActivePage(p.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', borderRadius: 8, border: 'none',
                background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                cursor: 'pointer', textAlign: 'left', width: '100%',
                transition: 'background 0.15s',
              }}
            >
              {axisColor
                ? <span style={{ width: 8, height: 8, borderRadius: '50%', background: axisColor, flexShrink: 0 }} />
                : <span style={{ fontSize: 13 }}>{p.emoji}</span>
              }
              <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 12, fontWeight: isActive ? 600 : 400, color: isActive ? '#F5F0EA' : 'rgba(245,240,234,0.45)' }}>
                {p.label}
              </span>
              {isActive && <ChevronRight size={11} style={{ marginLeft: 'auto', color: 'rgba(245,240,234,0.3)' }} />}
            </button>
          )
        })}

        {/* Save status */}
        <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          {status === 'saving' && (
            <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 9, letterSpacing: 1.5, color: 'rgba(245,240,234,0.3)', textAlign: 'center' }}>
              Sauvegarde…
            </div>
          )}
          {status === 'saved' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontFamily: 'Space Grotesk, sans-serif', fontSize: 9, letterSpacing: 1.5, color: '#8DBE8A' }}>
              <Check size={10} /> Sauvegardé
            </div>
          )}
        </div>
      </div>

      {/* ── Zone d'édition ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#0C0D0F' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activePage}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.2 }}
            style={{ padding: 32, maxWidth: 820 }}
          >

            {/* ═══ PAGE ACCUEIL ═══════════════════════════════════════════ */}
            {activePage === 'home' && (
              <>
                {/* Preview hero */}
                <div style={{ ...dark, position: 'relative', borderRadius: 12, overflow: 'hidden', marginBottom: 32, minHeight: 300 }}>
                  <div style={{ position: 'absolute', inset: 0, backgroundImage: `url('${get('hero.image_url')}')`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.32) saturate(0.5)' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #08090A 0%, transparent 60%)' }} />
                  <div style={{ position: 'relative', padding: '120px 32px 32px' }}>
                    {(() => {
                      const phrases = getJson('hero.phrases', [])
                      const p = phrases[0] || {}
                      return <>
                        <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 'clamp(28px, 4vw, 52px)', lineHeight: 1, color: '#F5F0EA', letterSpacing: '-0.02em' }}>{p.line1 || '…'}</div>
                        <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 'clamp(28px, 4vw, 52px)', lineHeight: 1.05, fontStyle: 'italic', color: 'rgba(245,240,234,0.4)', letterSpacing: '-0.02em' }}>{p.line2 || '…'}</div>
                      </>
                    })()}
                  </div>
                </div>

                <Section title="Image du héro" color="#C8B89A">
                  <ImageField label="URL de l'image de fond" value={get('hero.image_url')} onChange={v => set('hero.image_url', v)} />
                </Section>

                <Section title="Phrases animées du héro" color="#7BA7D4">
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'rgba(245,240,234,0.4)', lineHeight: 1.6, marginBottom: 4 }}>
                    5 slides qui défilent automatiquement toutes les 4,5 secondes. Chaque slide a une ligne droite (upright) et une ligne italique.
                  </p>
                  <PhrasesEditor
                    phrases={getJson('hero.phrases', [])}
                    onChange={arr => setJson('hero.phrases', arr)}
                    color="#7BA7D4"
                  />
                </Section>
              </>
            )}

            {/* ═══ PAGE CONTACT ═══════════════════════════════════════════ */}
            {activePage === 'contact' && (
              <>
                {/* Preview */}
                <div style={{ ...dark, borderRadius: 12, padding: '32px 40px', marginBottom: 32, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)', marginBottom: 12 }}>Votre projet</div>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 400, color: '#FAFAF8', lineHeight: 1.08 }}>
                    {get('contact.title_line1', 'Parlons de ce')}<br />
                    <em style={{ color: 'rgba(255,255,255,0.32)' }}>{get('contact.title_line2', 'que vous imaginez')}</em>
                  </div>
                  <div style={{ width: 28, height: 1, background: 'rgba(123,167,212,0.35)', margin: '20px 0' }} />
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, lineHeight: 1.85, color: 'rgba(255,255,255,0.38)', maxWidth: 300 }}>
                    {get('contact.description')}
                  </p>
                </div>

                <Section title="Section Contact" color="#7BA7D4">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Field label="Titre — ligne 1" value={get('contact.title_line1')} onChange={v => set('contact.title_line1', v)} />
                    <Field label="Titre — ligne 2 (italique)" value={get('contact.title_line2')} onChange={v => set('contact.title_line2', v)} />
                  </div>
                  <Field label="Texte descriptif" value={get('contact.description')} onChange={v => set('contact.description', v)} multiline />
                </Section>
              </>
            )}

            {/* ═══ PAGES DISCIPLINES ══════════════════════════════════════ */}
            {activePage.startsWith('discipline.') && (() => {
              const axisKey   = activePage.split('.')[1]
              const axisMeta  = AXES_META[axisKey] || {}
              const color     = axisMeta.color || '#C8B89A'
              const dbKey     = `discipline.${axisKey}.phrases`
              const phrases   = getJson(dbKey, [])

              return (
                <>
                  {/* Preview */}
                  <div style={{ ...dark, borderRadius: 12, padding: '32px 40px', marginBottom: 32, border: `1px solid ${color}25` }}>
                    <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 8, letterSpacing: 3, textTransform: 'uppercase', color: color + '80', marginBottom: 16 }}>
                      {axisMeta.label}
                    </div>
                    {phrases[0] && (
                      <>
                        <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 'clamp(28px, 5vw, 64px)', lineHeight: 1, color: '#F5F0EA', letterSpacing: '-0.025em' }}>
                          {phrases[0].line1}
                        </div>
                        <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 'clamp(28px, 5vw, 64px)', fontStyle: 'italic', lineHeight: 1.05, color: 'rgba(245,240,234,0.35)', letterSpacing: '-0.025em' }}>
                          {phrases[0].line2}
                        </div>
                      </>
                    )}
                  </div>

                  <Section title={`Phrases — ${axisMeta.label}`} color={color}>
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'rgba(245,240,234,0.4)', lineHeight: 1.6 }}>
                      3 slides qui défilent sur la page de la discipline. Chaque slide apparaît pendant 4,5 secondes.
                    </p>
                    <PhrasesEditor
                      phrases={phrases}
                      onChange={arr => setJson(dbKey, arr)}
                      color={color}
                    />
                  </Section>
                </>
              )
            })()}

            {/* ═══ PAGE CARRIÈRES ═════════════════════════════════════════ */}
            {activePage === 'careers' && (
              <>
                {/* Preview */}
                <div style={{ ...dark, borderRadius: 12, padding: '40px', marginBottom: 32, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 'clamp(32px, 5vw, 64px)', fontWeight: 400, color: '#F5F0EA', lineHeight: 1.1, marginBottom: 20 }}
                    dangerouslySetInnerHTML={{ __html: get('careers.title', 'Rejoignez l\'agence') }} />
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, lineHeight: 1.85, color: 'rgba(245,240,234,0.45)', maxWidth: 480 }}>
                    {get('careers.description')}
                  </p>
                </div>

                <Section title="Page Carrières" color="#8DBE8A">
                  <Field label="Titre principal" value={get('careers.title')} onChange={v => set('careers.title', v)} />
                  <Field label="Description / Introduction" value={get('careers.description')} onChange={v => set('careers.description', v)} multiline />
                </Section>
              </>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
