import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Target, Users, CalendarDays, BarChart2, Eye, Plus, Pencil,
  Trash2, X, Check, ChevronLeft, ChevronRight, Megaphone,
  TrendingUp, Heart, MessageCircle, Clock, AlertCircle,
  BookOpen, Film, Image, LayoutGrid, Star, FileText,
  ExternalLink, Lightbulb, Link, Filter,
} from 'lucide-react'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'

// ─── Tokens ──────────────────────────────────────────────────────────────────

const PILIER_COLORS = [
  { bg: 'bg-violet-100', text: 'text-violet-700', bar: 'bg-violet-500' },
  { bg: 'bg-cyan-100',   text: 'text-cyan-700',   bar: 'bg-cyan-500' },
  { bg: 'bg-amber-100',  text: 'text-amber-700',  bar: 'bg-amber-500' },
  { bg: 'bg-emerald-100',text: 'text-emerald-700',bar: 'bg-emerald-500' },
  { bg: 'bg-rose-100',   text: 'text-rose-700',   bar: 'bg-rose-500' },
]

const PLATEFORMES = {
  instagram: { label: 'Instagram', abbr: 'IG', dot: 'bg-pink-500',   badge: 'bg-pink-100 text-pink-700',     cellBg: 'bg-pink-50 text-pink-700 border-pink-200' },
  linkedin:  { label: 'LinkedIn',  abbr: 'LI', dot: 'bg-blue-600',   badge: 'bg-blue-100 text-blue-700',     cellBg: 'bg-blue-50 text-blue-700 border-blue-200' },
  pinterest: { label: 'Pinterest', abbr: 'Pi', dot: 'bg-red-500',    badge: 'bg-red-100 text-red-700',       cellBg: 'bg-red-50 text-red-700 border-red-200' },
  youtube:   { label: 'YouTube',   abbr: 'YT', dot: 'bg-rose-600',   badge: 'bg-rose-100 text-rose-700',     cellBg: 'bg-rose-50 text-rose-700 border-rose-200' },
  facebook:  { label: 'Facebook',  abbr: 'FB', dot: 'bg-indigo-600', badge: 'bg-indigo-100 text-indigo-700', cellBg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
}

const TYPES_CONTENU = {
  photo:      { label: 'Photo',      icon: Image },
  carousel:   { label: 'Carousel',   icon: LayoutGrid },
  reel:       { label: 'Reel',       icon: Film },
  video:      { label: 'Vidéo',      icon: Film },
  article:    { label: 'Article',    icon: BookOpen },
  story:      { label: 'Story',      icon: FileText },
  temoignage: { label: 'Témoignage', icon: Star },
}

const STATUTS = {
  planifie: { label: 'Planifié',  cls: 'bg-amber-100 text-amber-700' },
  publie:   { label: 'Publié',    cls: 'bg-emerald-100 text-emerald-700' },
}

const SWOT_CONFIG = [
  { key: 'forces',       label: 'Forces',       sub: 'Atouts internes',              bg: 'bg-emerald-50', border: 'border-emerald-200', icon: '💪' },
  { key: 'faiblesses',   label: 'Faiblesses',   sub: 'Points à améliorer',           bg: 'bg-rose-50',    border: 'border-rose-200',    icon: '⚠️' },
  { key: 'opportunites', label: 'Opportunités', sub: 'Facteurs externes favorables', bg: 'bg-blue-50',    border: 'border-blue-200',    icon: '🚀' },
  { key: 'menaces',      label: 'Menaces',      sub: 'Risques externes',             bg: 'bg-amber-50',   border: 'border-amber-200',   icon: '🛡️' },
]

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const DAYS_FR   = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']

const SUB_SECTIONS = [
  { id: 'strategie', label: 'Stratégie',      icon: Target,      iconBg: 'bg-amber-50',   iconColor: 'text-amber-600',  desc: 'SWOT, objectifs, personas' },
  { id: 'contenu',   label: 'Contenu',        icon: CalendarDays,iconBg: 'bg-violet-50',  iconColor: 'text-violet-600', desc: 'Planning, brainstorming, inspirations' },
  { id: 'stats',     label: 'Stats & Veille', icon: BarChart2,   iconBg: 'bg-electric/10',iconColor: 'text-electric',   desc: 'Performances et concurrents' },
]

// Types d'inspiration pour le filtre
const INSPI_TYPES = ['post', 'reel', 'carousel', 'video', 'profil', 'autre']

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uid = () => `m_${Date.now()}_${Math.random().toString(36).slice(2,7)}`
const fmtDate = d => d ? new Date(d).toLocaleDateString('fr-FR',{day:'numeric',month:'short'}) : '—'
const todayStr = () => new Date().toISOString().slice(0,10)

function getWeekPosts(posts) {
  const now = new Date()
  const mon = new Date(now); mon.setDate(now.getDate()-now.getDay()+1); mon.setHours(0,0,0,0)
  const sun = new Date(mon); sun.setDate(mon.getDate()+6); sun.setHours(23,59,59,999)
  return posts.filter(p => { if(!p.datePublication) return false; const d=new Date(p.datePublication); return d>=mon&&d<=sun })
}

// Détecte la plateforme, l'URL d'embed et la miniature depuis un lien
function parseInspirationUrl(url) {
  try {
    const u = url.trim()
    // Instagram post / reel
    const igMatch = u.match(/instagram\.com\/(p|reel)\/([A-Za-z0-9_-]+)/)
    if (igMatch) return {
      platform: 'instagram',
      type: igMatch[1] === 'reel' ? 'reel' : 'post',
      embedUrl: `https://www.instagram.com/${igMatch[1]}/${igMatch[2]}/embed/`,
      thumbUrl: null, // Instagram bloque les miniatures directes sans auth
      embedH: igMatch[1] === 'reel' ? 480 : 430,
    }
    // YouTube — miniature publique disponible directement
    const ytMatch = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]+)/)
    if (ytMatch) return {
      platform: 'youtube', type: 'video',
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}`,
      thumbUrl: `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`,
      embedH: 200,
    }
    // Pinterest
    const piMatch = u.match(/pinterest\.[a-z]+\/pin\/(\d+)/)
    if (piMatch) return {
      platform: 'pinterest', type: 'post',
      embedUrl: `https://www.pinterest.com/pin/${piMatch[1]}/embed/`,
      thumbUrl: null,
      embedH: 380,
    }
    if (/linkedin\.com/.test(u)) return { platform: 'linkedin', type: 'publication', embedUrl: null, thumbUrl: null, embedH: 0 }
    if (/facebook\.com/.test(u)) return { platform: 'facebook', type: 'post', embedUrl: null, thumbUrl: null, embedH: 0 }
    return { platform: 'autre', type: 'lien', embedUrl: null, thumbUrl: null, embedH: 0 }
  } catch { return { platform: 'autre', type: 'lien', embedUrl: null, thumbUrl: null, embedH: 0 } }
}

// ─── Section Header (pattern identique aux autres pages) ─────────────────────

function SectionHeader({ category, title, icon: Icon, iconBg='bg-electric/10', iconColor='text-electric', action }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon size={16} className={iconColor} />
        </div>
        <div>
          <div className="label-text">{category}</div>
          <div className="font-display text-2xl text-ink">{title}</div>
        </div>
      </div>
      {action}
    </div>
  )
}

function Badge({ cls, children }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${cls}`}>{children}</span>
}

// ─── Modal Publication ────────────────────────────────────────────────────────

function PostModal({ post, defaultDate, onClose, onSave }) {
  const EMPTY = { titre:'', contenu:'', plateforme:'instagram', typeContenu:'photo', statut:'planifie', datePublication: defaultDate || '', lienUrl:'', hashtags:[], notes:'' }
  const [f, setF] = useState(post || EMPTY)
  const [hashInput, setHashInput] = useState('')
  const set = (k,v) => setF(p=>({...p,[k]:v}))

  const addHash = e => {
    if(e.key!=='Enter'&&e.key!==',') return
    e.preventDefault()
    const t = hashInput.trim().replace(/^#/,'')
    if(t&&!f.hashtags.includes(t)) set('hashtags',[...f.hashtags,t])
    setHashInput('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm"
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto border border-border">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-electric/10 flex items-center justify-center"><CalendarDays size={15} className="text-electric"/></div>
            <h3 className="font-semibold text-ink text-sm">{post ? 'Modifier le post' : 'Nouveau post'}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-paper text-muted hover:text-ink"><X size={15}/></button>
        </div>
        <div className="p-5 space-y-4">
          <div><label className="label-text mb-1.5 block">Titre *</label><input value={f.titre} onChange={e=>set('titre',e.target.value)} className="input-field"/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label-text mb-1.5 block">Plateforme</label>
              <select value={f.plateforme} onChange={e=>set('plateforme',e.target.value)} className="input-field">
                {Object.entries(PLATEFORMES).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div><label className="label-text mb-1.5 block">Type de contenu</label>
              <select value={f.typeContenu} onChange={e=>set('typeContenu',e.target.value)} className="input-field">
                {Object.entries(TYPES_CONTENU).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label-text mb-1.5 block">Statut</label>
              <select value={f.statut} onChange={e=>set('statut',e.target.value)} className="input-field">
                {Object.entries(STATUTS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div><label className="label-text mb-1.5 block">Date de publication</label>
              <input type="date" value={f.datePublication||''} onChange={e=>set('datePublication',e.target.value)} className="input-field"/>
            </div>
          </div>
          <div><label className="label-text mb-1.5 block">URL du post</label><input value={f.lienUrl||''} onChange={e=>set('lienUrl',e.target.value)} className="input-field"/></div>
          <div><label className="label-text mb-1.5 block">Caption</label><textarea value={f.contenu||''} onChange={e=>set('contenu',e.target.value)} rows={3} className="input-field resize-none"/></div>
          <div>
            <label className="label-text mb-1.5 block">Hashtags</label>
            <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl border border-border min-h-[44px] bg-white">
              {f.hashtags.map(h=>(
                <span key={h} className="flex items-center gap-1 px-2 py-0.5 bg-electric/10 text-electric text-xs rounded-full">
                  #{h}<button onClick={()=>set('hashtags',f.hashtags.filter(x=>x!==h))}><X size={10}/></button>
                </span>
              ))}
              <input value={hashInput} onChange={e=>setHashInput(e.target.value)} onKeyDown={addHash}
                className="flex-1 min-w-[80px] text-sm text-ink bg-transparent focus:outline-none px-1"/>
            </div>
          </div>
          {f.statut==='publie'&&(
            <div>
              <label className="label-text mb-2 block">Statistiques</label>
              <div className="grid grid-cols-5 gap-2">
                {[['vues','Vues'],['reach','Reach'],['likes','Likes'],['commentaires','Comm.'],['partages','Partages']].map(([k,l])=>(
                  <div key={k}>
                    <p className="text-[10px] text-muted mb-1">{l}</p>
                    <input type="number" min="0" value={f.stats?.[k]||0}
                      onChange={e=>set('stats',{...f.stats,[k]:+e.target.value})}
                      className="w-full px-2 py-1.5 rounded-lg border border-border text-xs text-ink focus:outline-none focus:ring-2 focus:ring-electric/30"/>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <button onClick={onClose} className="btn-ghost">Annuler</button>
          <button onClick={()=>{if(!f.titre.trim()){toast.error('Titre requis');return}onSave(f);onClose()}} className="btn-primary">
            <Check size={15}/>{post?'Enregistrer':'Créer'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Modal Idée (Brainstorming) ───────────────────────────────────────────────

function IdeaModal({ idea, onClose, onSave }) {
  const EMPTY = { id:'', titre:'', typeContenu:'reel', plateforme:'instagram', description:'', script:'', statut:'idee' }
  const [f, setF] = useState(idea||{...EMPTY,id:uid()})
  const set = (k,v) => setF(p=>({...p,[k]:v}))
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm"
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-border">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center"><Lightbulb size={15} className="text-amber-500"/></div>
            <h3 className="font-semibold text-ink text-sm">{idea ? 'Modifier l\'idée' : 'Nouvelle idée'}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-paper text-muted hover:text-ink"><X size={15}/></button>
        </div>
        <div className="p-5 space-y-4">
          <div><label className="label-text mb-1.5 block">Titre de l'idée *</label><input value={f.titre} onChange={e=>set('titre',e.target.value)} className="input-field" autoFocus/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label-text mb-1.5 block">Format</label>
              <select value={f.typeContenu} onChange={e=>set('typeContenu',e.target.value)} className="input-field">
                {Object.entries(TYPES_CONTENU).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div><label className="label-text mb-1.5 block">Plateforme</label>
              <select value={f.plateforme} onChange={e=>set('plateforme',e.target.value)} className="input-field">
                {Object.entries(PLATEFORMES).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div><label className="label-text mb-1.5 block">Description / Concept</label>
            <textarea value={f.description} onChange={e=>set('description',e.target.value)} rows={3} className="input-field resize-none" placeholder="L'idée en quelques mots…"/>
          </div>
          <div><label className="label-text mb-1.5 block">Script / Caption</label>
            <textarea value={f.script} onChange={e=>set('script',e.target.value)} rows={4} className="input-field resize-none font-mono text-xs" placeholder="Voix-off, textes à l'écran, caption…"/>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <button onClick={onClose} className="btn-ghost">Annuler</button>
          <button onClick={()=>{if(!f.titre.trim()){toast.error('Titre requis');return}onSave(f);onClose()}} className="btn-primary">
            <Check size={15}/>{idea?'Enregistrer':'Ajouter'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Modal Persona ────────────────────────────────────────────────────────────

function PersonaModal({ persona, onClose, onSave }) {
  const EMPTY = { id:'', nom:'', emoji:'👤', age:'', poste:'', description:'', besoins:'', freins:'', plateformes:[] }
  const [f, setF] = useState(persona||{...EMPTY,id:uid()})
  const set = (k,v) => setF(p=>({...p,[k]:v}))
  const toggle = plt => set('plateformes', f.plateformes.includes(plt)?f.plateformes.filter(x=>x!==plt):[...f.plateformes,plt])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm"
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-border">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center"><Users size={15} className="text-violet-600"/></div>
            <h3 className="font-semibold text-ink text-sm">{persona?'Modifier le persona':'Nouveau persona'}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-paper text-muted hover:text-ink"><X size={15}/></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex gap-3">
            <div className="w-20"><label className="label-text mb-1.5 block">Emoji</label><input value={f.emoji} onChange={e=>set('emoji',e.target.value)} className="input-field text-2xl text-center"/></div>
            <div className="flex-1"><label className="label-text mb-1.5 block">Nom *</label><input value={f.nom} onChange={e=>set('nom',e.target.value)} className="input-field"/></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label-text mb-1.5 block">Tranche d'âge</label><input value={f.age} onChange={e=>set('age',e.target.value)} className="input-field"/></div>
            <div><label className="label-text mb-1.5 block">Profession</label><input value={f.poste} onChange={e=>set('poste',e.target.value)} className="input-field"/></div>
          </div>
          <div><label className="label-text mb-1.5 block">Description</label><textarea value={f.description} onChange={e=>set('description',e.target.value)} rows={2} className="input-field resize-none"/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label-text mb-1.5 block">Besoins</label><textarea value={f.besoins} onChange={e=>set('besoins',e.target.value)} rows={2} className="input-field resize-none"/></div>
            <div><label className="label-text mb-1.5 block">Freins</label><textarea value={f.freins} onChange={e=>set('freins',e.target.value)} rows={2} className="input-field resize-none"/></div>
          </div>
          <div>
            <label className="label-text mb-2 block">Plateformes</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(PLATEFORMES).map(([k,v])=>(
                <button key={k} onClick={()=>toggle(k)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${f.plateformes.includes(k)?`${v.badge} border-transparent`:'border-border text-muted hover:text-ink'}`}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <button onClick={onClose} className="btn-ghost">Annuler</button>
          <button onClick={()=>{if(!f.nom.trim()){toast.error('Nom requis');return}onSave(f);onClose()}} className="btn-primary">
            <Check size={15}/>Enregistrer
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Calendrier mensuel ───────────────────────────────────────────────────────

function MonthlyCalendar({ posts, onNewPost, onEditPost }) {
  const [nav, setNav] = useState(new Date())
  const year  = nav.getFullYear()
  const month = nav.getMonth()

  const firstDow    = new Date(year, month, 1).getDay()
  const offset      = (firstDow + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today       = todayStr()

  // Seulement les posts planifiés/publiés (pas les idées)
  const calendarPosts = useMemo(() => posts.filter(p => p.statut && p.statut !== 'idee'), [posts])

  const cells = []
  for (let i = 0; i < offset; i++) {
    const d = new Date(year, month, 1 - offset + i)
    cells.push({ date: d.toISOString().slice(0,10), day: d.getDate(), current: false })
  }
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ date: new Date(year,month,d).toISOString().slice(0,10), day: d, current: true })
  const rem = (7 - cells.length % 7) % 7
  for (let i = 1; i <= rem; i++) {
    const d = new Date(year, month+1, i)
    cells.push({ date: d.toISOString().slice(0,10), day: d.getDate(), current: false })
  }

  const byDate = useMemo(() => {
    const m = {}
    calendarPosts.forEach(p => {
      if(!p.datePublication) return
      const k = p.datePublication.slice(0,10)
      if(!m[k]) m[k]=[]
      m[k].push(p)
    })
    return m
  }, [calendarPosts])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-xl text-ink">{MONTHS_FR[month]} {year}</h3>
        <div className="flex items-center gap-1.5">
          <button onClick={()=>setNav(d=>new Date(d.getFullYear(),d.getMonth()-1,1))}
            className="w-8 h-8 rounded-xl border border-border hover:bg-paper-warm flex items-center justify-center text-muted hover:text-ink transition-colors">
            <ChevronLeft size={15}/>
          </button>
          <button onClick={()=>setNav(new Date())}
            className="px-3 py-1.5 text-xs font-medium rounded-xl border border-border hover:bg-paper-warm text-ink transition-colors">
            Aujourd'hui
          </button>
          <button onClick={()=>setNav(d=>new Date(d.getFullYear(),d.getMonth()+1,1))}
            className="w-8 h-8 rounded-xl border border-border hover:bg-paper-warm flex items-center justify-center text-muted hover:text-ink transition-colors">
            <ChevronRight size={15}/>
          </button>
        </div>
      </div>

      <div className="border border-border rounded-xl overflow-hidden">
        {/* En-têtes */}
        <div className="grid grid-cols-7 border-b border-border bg-paper/80">
          {DAYS_FR.map(d=>(
            <div key={d} className="px-2 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider text-center border-r border-border last:border-r-0">
              {d}
            </div>
          ))}
        </div>

        {/* Cases */}
        <div className="grid grid-cols-7">
          {cells.map((cell, i) => {
            const dayPosts  = byDate[cell.date] || []
            const isToday   = cell.date === today
            const isLastRow = i >= cells.length - 7
            return (
              <div key={i}
                className={`border-b border-r border-border min-h-[92px] p-1.5 relative group
                  ${(i+1)%7===0?'border-r-0':''}
                  ${isLastRow?'border-b-0':''}
                  ${!cell.current?'bg-paper/60':''}
                  ${isToday&&cell.current?'bg-electric/5 border-electric/20':''}
                  ${cell.current&&!isToday?'bg-white hover:bg-paper/40':''}`}>

                <div className={`text-[11px] font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1 leading-none
                  ${isToday&&cell.current?'bg-ink text-white':cell.current?'text-ink':'text-muted'}`}>
                  {cell.day}
                </div>

                <div className="space-y-0.5">
                  {dayPosts.slice(0,3).map(p => {
                    const plt = PLATEFORMES[p.plateforme]
                    const tc  = TYPES_CONTENU[p.typeContenu]
                    return (
                      <button key={p.id} onClick={()=>onEditPost(p)}
                        className={`w-full flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium truncate hover:opacity-75 transition-opacity ${plt?.cellBg||'bg-slate-50 text-slate-600 border-slate-200'}`}>
                        <span className="font-bold flex-shrink-0 text-[9px] opacity-80">{plt?.abbr}</span>
                        <span className="truncate">{tc?.label||'Post'}</span>
                      </button>
                    )
                  })}
                  {dayPosts.length>3&&<p className="text-[10px] text-muted px-1.5">+{dayPosts.length-3}</p>}
                </div>

                {cell.current&&(
                  <button onClick={()=>onNewPost(cell.date)}
                    className="absolute top-1 right-1 w-5 h-5 rounded text-xs font-bold text-muted bg-white border border-border opacity-0 group-hover:opacity-100 hover:bg-electric/10 hover:text-electric hover:border-electric/30 transition-all flex items-center justify-center">
                    +
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Légende */}
      <div className="flex items-center gap-4 mt-3 flex-wrap">
        {Object.entries(PLATEFORMES).map(([k,v])=>(
          <div key={k} className="flex items-center gap-1.5">
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${v.cellBg}`}>{v.abbr}</span>
            <span className="text-[11px] text-muted">{v.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── SWOT Quadrant ────────────────────────────────────────────────────────────

function SwotQuadrant({ config, items, onChange }) {
  const [draft, setDraft] = useState('')
  const add = () => { const t=draft.trim(); if(!t) return; onChange([...items,t]); setDraft('') }
  return (
    <div className={`${config.bg} border ${config.border} rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{config.icon}</span>
        <div>
          <p className="font-semibold text-ink text-sm">{config.label}</p>
          <p className="text-[10px] text-muted">{config.sub}</p>
        </div>
      </div>
      <ul className="space-y-1 mb-3">
        {items.map((item,i)=>(
          <li key={i} className="flex items-start gap-2 text-sm text-ink group">
            <span className="text-muted mt-0.5 flex-shrink-0">·</span>
            <span className="flex-1">{item}</span>
            <button onClick={()=>onChange(items.filter((_,j)=>j!==i))}
              className="opacity-0 group-hover:opacity-100 text-muted hover:text-rose-500 transition-all flex-shrink-0"><X size={11}/></button>
          </li>
        ))}
      </ul>
      <div className="flex gap-1.5">
        <input value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>e.key==='Enter'&&add()}
          className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-electric/30"/>
        <button onClick={add} className="px-2.5 py-1.5 rounded-lg bg-ink text-white text-xs hover:bg-ink-soft transition-colors"><Plus size={12}/></button>
      </div>
    </div>
  )
}

// ─── Objectif row (simplifié) ─────────────────────────────────────────────────

function ObjectifRow({ obj, onChange, onDelete }) {
  const pct    = Math.min(100, Math.max(0, Number(obj.pct) || 0))
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(obj)
  const barCls = pct>=80?'bg-emerald-500':pct>=40?'bg-amber-500':'bg-rose-500'
  const echeance = obj.echeance?new Date(obj.echeance):null
  const jours    = echeance?Math.ceil((echeance-new Date())/86400000):null

  if(editing) return (
    <div className="p-4 rounded-xl border border-electric/30 bg-electric/5 space-y-3">
      <div><label className="label-text mb-1.5 block">Nom de l'objectif</label>
        <input value={draft.nom||''} onChange={e=>setDraft(d=>({...d,nom:e.target.value}))} className="input-field"/>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="label-text mb-1.5 block">Date de lancement</label>
          <input type="date" value={draft.dateDebut||''} onChange={e=>setDraft(d=>({...d,dateDebut:e.target.value}))} className="input-field"/>
        </div>
        <div><label className="label-text mb-1.5 block">Deadline</label>
          <input type="date" value={draft.echeance||''} onChange={e=>setDraft(d=>({...d,echeance:e.target.value}))} className="input-field"/>
        </div>
        <div><label className="label-text mb-1.5 block">Avancement %</label>
          <input type="number" min="0" max="100" value={draft.pct||0} onChange={e=>setDraft(d=>({...d,pct:+e.target.value}))} className="input-field"/>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={()=>{onChange(draft);setEditing(false)}} className="btn-primary text-xs py-1.5"><Check size={13}/>Enregistrer</button>
        <button onClick={()=>setEditing(false)} className="btn-ghost text-xs py-1.5">Annuler</button>
      </div>
    </div>
  )

  return (
    <div className="group hover:bg-paper-warm px-3 py-3 rounded-xl transition-colors">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-ink">{obj.nom||'(sans nom)'}</span>
        <div className="flex items-center gap-2">
          {jours!==null&&jours<0&&<span className="text-[10px] text-rose-600 font-medium">En retard</span>}
          {jours!==null&&jours>=0&&jours<=14&&<span className="text-[10px] text-amber-600 font-medium">{jours}j restants</span>}
          <span className={`text-xs font-bold tabular-nums ${pct>=80?'text-emerald-600':pct>=40?'text-amber-600':'text-rose-600'}`}>{pct}%</span>
          {onChange&&onDelete&&(
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={()=>{setDraft(obj);setEditing(true)}} className="p-1 rounded hover:bg-ink/5 text-muted hover:text-ink"><Pencil size={12}/></button>
              <button onClick={onDelete} className="p-1 rounded hover:bg-rose-50 text-muted hover:text-rose-500"><Trash2 size={12}/></button>
            </div>
          )}
        </div>
      </div>
      <div className="h-1.5 bg-border rounded-full overflow-hidden mb-1">
        <div className={`h-full rounded-full transition-all ${barCls}`} style={{width:`${pct}%`}}/>
      </div>
      <p className="text-[10px] text-muted">
        {obj.dateDebut?`Début ${fmtDate(obj.dateDebut)} · `:''}
        {obj.echeance?`Deadline ${fmtDate(obj.echeance)}`:''}
      </p>
    </div>
  )
}

// ─── Carte Inspiration ────────────────────────────────────────────────────────

function InspirationCard({ inspi, onDelete }) {
  const parsed  = useMemo(()=>parseInspirationUrl(inspi.url),[inspi.url])
  const plt     = PLATEFORMES[parsed.platform]
  // YouTube → miniature directe ; Instagram/Pinterest → iframe auto-chargé ; reste → placeholder
  const hasThumb = !!parsed.thumbUrl
  const hasEmbed = !!parsed.embedUrl
  const [iframeOpen, setIframeOpen] = useState(false)

  const renderPreview = () => {
    // 1. Miniature image directe (YouTube)
    if (hasThumb) return (
      <div className="relative w-full bg-black overflow-hidden" style={{height: 160}}>
        <img src={parsed.thumbUrl} alt={inspi.titre||'aperçu'} className="w-full h-full object-cover"/>
        {/* Bouton play overlay */}
        <button onClick={()=>setIframeOpen(true)}
          className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/50 transition-colors group">
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <div className="w-0 h-0 border-t-[8px] border-b-[8px] border-l-[14px] border-transparent border-l-rose-600 ml-1"/>
          </div>
        </button>
      </div>
    )
    // 2. Iframe auto-chargé (Instagram, Pinterest)
    if (hasEmbed) return (
      <div className="w-full overflow-hidden bg-paper" style={{height: parsed.embedH}}>
        <iframe
          src={parsed.embedUrl}
          className="w-full h-full border-0 scale-[0.85] origin-top -mt-0"
          allowFullScreen loading="lazy"
          title={inspi.titre||inspi.url}
        />
      </div>
    )
    // 3. Placeholder (LinkedIn, Facebook, autre)
    return (
      <div className="w-full h-24 flex flex-col items-center justify-center gap-1.5 bg-paper">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold ${plt?.badge||'bg-slate-100 text-slate-600'}`}>
          {plt?.abbr||'?'}
        </div>
        <p className="text-[10px] text-muted">Aperçu non disponible</p>
      </div>
    )
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-white hover:shadow-md transition-shadow">
      {/* Si YouTube et qu'on a cliqué play → iframe à la place */}
      {iframeOpen && hasEmbed ? (
        <div className="w-full overflow-hidden bg-black" style={{height: parsed.embedH}}>
          <iframe src={parsed.embedUrl} className="w-full h-full border-0" allowFullScreen loading="lazy" title={inspi.titre||inspi.url}/>
        </div>
      ) : renderPreview()}

      {/* Footer */}
      <div className="px-3 py-2.5 border-t border-border flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-ink truncate">{inspi.titre||inspi.url}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {plt&&<Badge cls={plt.badge}>{plt.label}</Badge>}
            {inspi.type&&<Badge cls="bg-slate-100 text-slate-600">{inspi.type}</Badge>}
          </div>
          {inspi.notes&&<p className="text-[10px] text-muted mt-1 line-clamp-1">{inspi.notes}</p>}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <a href={inspi.url} target="_blank" rel="noopener noreferrer"
            className="p-1.5 rounded-lg hover:bg-ink/5 text-muted hover:text-electric transition-colors"><ExternalLink size={12}/></a>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-rose-50 text-muted hover:text-rose-500 transition-colors"><Trash2 size={12}/></button>
        </div>
      </div>
    </div>
  )
}

// ─── Ajout inspiration inline ─────────────────────────────────────────────────

function AddInspirationForm({ onAdd }) {
  const [url, setUrl]   = useState('')
  const [titre, setTitre] = useState('')
  const [notes, setNotes] = useState('')
  const [type, setType]   = useState('post')
  const [open, setOpen]   = useState(false)

  const parsed = useMemo(()=>url?parseInspirationUrl(url):null,[url])

  const submit = () => {
    if(!url.trim()) { toast.error('URL requise'); return }
    onAdd({ id:uid(), url:url.trim(), titre:titre||url, type, notes })
    setUrl(''); setTitre(''); setNotes(''); setType('post'); setOpen(false)
    toast.success('Inspiration ajoutée')
  }

  if(!open) return (
    <button onClick={()=>setOpen(true)}
      className="w-full border-2 border-dashed border-border rounded-xl py-6 text-sm text-muted hover:border-electric hover:text-electric transition-colors flex items-center justify-center gap-2">
      <Link size={16}/>Coller un lien
    </button>
  )

  return (
    <div className="border border-electric/30 rounded-xl p-4 bg-electric/5 space-y-3">
      <div><label className="label-text mb-1.5 block">URL *</label>
        <input value={url} onChange={e=>setUrl(e.target.value)} className="input-field font-mono text-sm"
          placeholder="https://www.instagram.com/reel/…"/>
        {parsed&&url&&(
          <p className="text-xs text-muted mt-1">
            Plateforme détectée : <span className="font-medium text-ink">{PLATEFORMES[parsed.platform]?.label||parsed.platform}</span>
            {' · '}<span className="capitalize">{parsed.type}</span>
            {parsed.embedUrl?' · Aperçu disponible':' · Pas d\'aperçu intégré'}
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label-text mb-1.5 block">Titre / Note</label><input value={titre} onChange={e=>setTitre(e.target.value)} className="input-field"/></div>
        <div><label className="label-text mb-1.5 block">Type</label>
          <select value={type} onChange={e=>setType(e.target.value)} className="input-field">
            {INSPI_TYPES.map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
          </select>
        </div>
      </div>
      <div><label className="label-text mb-1.5 block">Notes</label>
        <input value={notes} onChange={e=>setNotes(e.target.value)} className="input-field" placeholder="Ce qui m'inspire dans ce post…"/>
      </div>
      <div className="flex gap-2">
        <button onClick={submit} className="btn-primary text-xs py-1.5"><Check size={13}/>Ajouter</button>
        <button onClick={()=>setOpen(false)} className="btn-ghost text-xs py-1.5">Annuler</button>
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function MarketingPage() {
  const { marketingPosts, marketingConfig, addMarketingPost, updateMarketingPost, deleteMarketingPost, updateMarketingConfig } = useData()
  const { employe } = useAuth()

  const [tab, setTab] = useState('dashboard')
  const [postModal, setPostModal] = useState(null)
  const [ideaModal, setIdeaModal] = useState(null)
  const [personaModal, setPersonaModal] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [inspiFilter, setInspiFilter] = useState('all')

  // ── Computed ─────────────────────────────────────────────────────────────────

  // Posts = planifiés/publiés uniquement (pas les idées brouillon)
  const realPosts = useMemo(()=>marketingPosts.filter(p=>p.statut&&p.statut!=='idee'),[marketingPosts])
  const publies   = useMemo(()=>realPosts.filter(p=>p.statut==='publie'),[realPosts])
  const planifies = useMemo(()=>realPosts.filter(p=>p.statut==='planifie'),[realPosts])
  const weekPosts = useMemo(()=>getWeekPosts(realPosts),[realPosts])

  const totalReach = useMemo(()=>publies.reduce((s,p)=>s+(p.stats?.reach||0),0),[publies])
  const totalLikes = useMemo(()=>publies.reduce((s,p)=>s+(p.stats?.likes||0),0),[publies])

  const objectifsAvancement = useMemo(()=>(marketingConfig.objectifs||[]).map(obj=>{
    const pct=Math.min(100,Math.max(0,Number(obj.pct)||0))
    const echeance=obj.echeance?new Date(obj.echeance):null
    const jours=echeance?Math.ceil((echeance-new Date())/86400000):null
    return {...obj,pct,jours,retard:jours!==null&&jours<0}
  }),[marketingConfig.objectifs])

  // Inspirations filtrées
  const inspirations = marketingConfig.inspirations || []
  const filteredInspi = useMemo(()=>
    inspiFilter==='all' ? inspirations : inspirations.filter(i=>i.type===inspiFilter)
  ,[inspirations,inspiFilter])

  // Idées brainstorming
  const ideas = useMemo(()=>
    (marketingConfig.brainstorming || [])
  ,[marketingConfig.brainstorming])

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const saveSwot     = (key,items) => updateMarketingConfig({swot:{...marketingConfig.swot,[key]:items}})
  const savePersonas = p => updateMarketingConfig({personas:p})
  const saveObjectifs= o => updateMarketingConfig({objectifs:o})
  const saveVeille   = v => updateMarketingConfig({veille:v})
  const saveInspi    = v => updateMarketingConfig({inspirations:v})
  const saveIdeas    = v => updateMarketingConfig({brainstorming:v})

  const handleSavePost = form => {
    const isEdit = postModal&&typeof postModal==='object'&&postModal?.id
    if(isEdit) { updateMarketingPost(postModal.id,{...postModal,...form}); toast.success('Post mis à jour') }
    else { addMarketingPost({...form,statut:form.statut||'planifie',createdById:employe?.id,createdByNom:employe?.nom}); toast.success('Post créé') }
  }

  const handleSaveIdea = idea => {
    const exists = ideas.find(x=>x.id===idea.id)
    saveIdeas(exists ? ideas.map(x=>x.id===idea.id?idea:x) : [...ideas, idea])
    toast.success(exists ? 'Idée mise à jour' : 'Idée ajoutée')
  }

  const handleDelConfirm = () => {
    if(!confirmDel) return
    if(confirmDel.type==='post')     { deleteMarketingPost(confirmDel.id); toast.success('Post supprimé') }
    if(confirmDel.type==='persona')  savePersonas(marketingConfig.personas.filter(p=>p.id!==confirmDel.id))
    if(confirmDel.type==='objectif') saveObjectifs(marketingConfig.objectifs.filter(o=>o.id!==confirmDel.id))
    if(confirmDel.type==='veille')   saveVeille(marketingConfig.veille.filter(v=>v.id!==confirmDel.id))
    if(confirmDel.type==='inspi')    saveInspi(inspirations.filter(v=>v.id!==confirmDel.id))
    if(confirmDel.type==='idea')     saveIdeas(ideas.filter(v=>v.id!==confirmDel.id))
    setConfirmDel(null)
  }

  const postForModal = (postModal&&typeof postModal==='object'&&postModal?.id) ? postModal : null
  const defaultDate  = (postModal&&typeof postModal==='object'&&!postModal?.id&&postModal?.date) ? postModal.date : ''

  const goBack = () => setTab('dashboard')
  const subSection = SUB_SECTIONS.find(s=>s.id===tab)

  return (
    <div className="p-4 lg:p-10 space-y-5 lg:space-y-7">

      {/* Header de section (sous-pages uniquement) */}
      {tab !== 'dashboard' && subSection && (
        <div className="flex items-center gap-3">
          <button onClick={goBack}
            className="w-8 h-8 rounded-xl border border-border flex items-center justify-center text-muted hover:text-ink hover:bg-paper-warm transition-colors flex-shrink-0">
            <ChevronLeft size={16}/>
          </button>
          <div className={`w-9 h-9 rounded-xl ${subSection.iconBg} flex items-center justify-center flex-shrink-0`}>
            <subSection.icon size={16} className={subSection.iconColor}/>
          </div>
          <div>
            <div className="label-text">Marketing</div>
            <div className="font-display text-xl text-ink leading-tight">{subSection.label}</div>
          </div>
        </div>
      )}

      {/* ══ TABLEAU DE BORD ══════════════════════════════════════════════════ */}
      {tab==='dashboard'&&(
        <div className="space-y-5 lg:space-y-7">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
            {[
              { label:'Posts publiés', value:publies.length,                    icon:Check,      color:'#10B981' },
              { label:'Planifiés',      value:planifies.length,                  icon:Clock,      color:'#F59E0B' },
              { label:'Reach total',    value:totalReach.toLocaleString('fr'),  icon:TrendingUp, color:'#06B6D4' },
              { label:'Likes cumulés',  value:totalLikes.toLocaleString('fr'),  icon:Heart,      color:'#F43F5E' },
            ].map((k,i)=>(
              <div key={i} className="card p-4 lg:p-6 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted mb-2">{k.label}</div>
                  <div className="font-display text-3xl lg:text-4xl text-ink leading-none">{k.value}</div>
                </div>
                <div className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center" style={{background:`${k.color}15`}}>
                  <k.icon size={20} color={k.color} strokeWidth={1.8}/>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col lg:flex-row gap-5">
            {/* Objectifs */}
            <div className="flex-1 card p-5 lg:p-7">
              <SectionHeader category="Marketing" title="Objectifs en cours" icon={Target}
                action={<button onClick={()=>setTab('strategie')} className="btn-ghost text-xs py-1.5">Gérer</button>}/>
              {objectifsAvancement.length===0 ? (
                <div className="py-10 text-center">
                  <Target size={32} className="text-muted mx-auto mb-3 opacity-30"/>
                  <p className="text-sm text-muted mb-3">Aucun objectif défini</p>
                  <button onClick={()=>setTab('strategie')} className="btn-ghost text-xs py-1.5 mx-auto">Ajouter</button>
                </div>
              ) : (
                <div className="space-y-1">{objectifsAvancement.slice(0,5).map(obj=>(
                  <ObjectifRow key={obj.id} obj={obj} onChange={null} onDelete={null}/>
                ))}</div>
              )}
            </div>

            {/* Posts semaine */}
            <div className="lg:w-80 card p-5 lg:p-7">
              <SectionHeader category="Contenu" title="Cette semaine" icon={CalendarDays}
                iconBg="bg-violet-50" iconColor="text-violet-600"
                action={<button onClick={()=>setTab('contenu')} className="btn-ghost text-xs py-1.5">Calendrier</button>}/>
              {weekPosts.length===0 ? (
                <div className="py-10 text-center">
                  <CalendarDays size={32} className="text-muted mx-auto mb-3 opacity-30"/>
                  <p className="text-sm text-muted mb-3">Aucune publication</p>
                  <button onClick={()=>setPostModal('new')} className="btn-primary text-xs py-1.5 mx-auto"><Plus size={13}/>Planifier</button>
                </div>
              ) : (
                <div className="space-y-1">
                  {weekPosts.map(p=>{
                    const plt=PLATEFORMES[p.plateforme], st=STATUTS[p.statut]
                    return (
                      <div key={p.id} onClick={()=>setPostModal(p)} className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-paper-warm cursor-pointer transition-colors">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${plt?.dot||'bg-muted'}`}/>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink truncate">{p.titre}</p>
                          <p className="text-xs text-muted">{fmtDate(p.datePublication)} · {plt?.label}</p>
                        </div>
                        {st&&<Badge cls={st.cls}>{st.label}</Badge>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Alertes */}
          {(()=>{
            const alerts=[];
            objectifsAvancement.filter(o=>o.retard).forEach(o=>alerts.push({type:'d',msg:`Objectif en retard : ${o.nom}`}))
            if(!alerts.length) return null
            return <div className="space-y-2">{alerts.map((a,i)=>(
              <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl border text-sm font-medium bg-rose-50 border-rose-200 text-rose-700">
                <AlertCircle size={15} className="flex-shrink-0"/>{a.msg}
              </div>
            ))}</div>
          })()}

          {/* Navigation vers les sous-sections */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {SUB_SECTIONS.map(s=>(
              <button key={s.id} onClick={()=>setTab(s.id)}
                className="card p-4 flex items-center gap-3 text-left hover:shadow-md hover:border-electric/30 transition-all group">
                <div className={`w-10 h-10 rounded-xl ${s.iconBg} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                  <s.icon size={18} className={s.iconColor}/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-ink">{s.label}</p>
                  <p className="text-[11px] text-muted">{s.desc}</p>
                </div>
                <ChevronRight size={14} className="text-muted flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"/>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ══ STRATÉGIE ════════════════════════════════════════════════════════ */}
      {tab==='strategie'&&(
        <div className="space-y-5 lg:space-y-7">

          {/* SWOT */}
          <div className="card p-5 lg:p-7">
            <SectionHeader category="Stratégie" title="Analyse SWOT" icon={Target} iconBg="bg-amber-50" iconColor="text-amber-600"/>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SWOT_CONFIG.map(q=>(
                <SwotQuadrant key={q.key} config={q} items={marketingConfig.swot?.[q.key]||[]} onChange={items=>saveSwot(q.key,items)}/>
              ))}
            </div>
          </div>

          {/* Objectifs */}
          <div className="card p-5 lg:p-7">
            <SectionHeader category="Marketing" title={`Objectifs (${marketingConfig.objectifs.length})`} icon={TrendingUp}
              iconBg="bg-emerald-50" iconColor="text-emerald-600"
              action={<>
                <button onClick={()=>saveObjectifs([...marketingConfig.objectifs,{id:uid(),nom:'',dateDebut:'',echeance:'',pct:0}])}
                  className="btn-primary hidden sm:flex"><Plus size={15}/>Ajouter</button>
                <button onClick={()=>saveObjectifs([...marketingConfig.objectifs,{id:uid(),nom:'',dateDebut:'',echeance:'',pct:0}])}
                  className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center sm:hidden hover:bg-emerald-200 transition-colors flex-shrink-0"><Plus size={16}/></button>
              </>}/>
            {marketingConfig.objectifs.length===0 ? (
              <p className="text-sm text-muted py-6 text-center">Aucun objectif. Définissez vos cibles pour mesurer vos progrès.</p>
            ) : (
              <div className="space-y-1">
                {objectifsAvancement.map(obj=>(
                  <ObjectifRow key={obj.id} obj={obj}
                    onChange={data=>saveObjectifs(marketingConfig.objectifs.map(o=>o.id===obj.id?{...o,...data}:o))}
                    onDelete={()=>setConfirmDel({type:'objectif',id:obj.id})}/>
                ))}
              </div>
            )}
          </div>

          {/* Personas */}
          <div className="card p-5 lg:p-7">
            <SectionHeader category="Audience" title={`Personas (${marketingConfig.personas.length})`} icon={Users}
              iconBg="bg-violet-50" iconColor="text-violet-600"
              action={<>
                <button onClick={()=>setPersonaModal('new')} className="btn-primary hidden sm:flex"><Plus size={15}/>Nouveau persona</button>
                <button onClick={()=>setPersonaModal('new')} className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center sm:hidden hover:bg-violet-200 transition-colors flex-shrink-0"><Plus size={16}/></button>
              </>}/>
            {marketingConfig.personas.length===0 ? (
              <p className="text-sm text-muted py-6 text-center">Aucun persona défini. Créez des profils d'audience pour mieux cibler votre contenu.</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {marketingConfig.personas.map((persona,idx)=>{
                  const c=PILIER_COLORS[idx%PILIER_COLORS.length]
                  return (
                    <div key={persona.id} className="rounded-xl overflow-hidden border border-border">
                      <div className={`${c.bg} px-4 py-3 flex items-center gap-3`}>
                        <div className={`w-10 h-10 rounded-xl ${c.bar} flex items-center justify-center text-xl flex-shrink-0`}>{persona.emoji||'👤'}</div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm ${c.text}`}>{persona.nom}</p>
                          {persona.poste&&<p className="text-xs text-muted">{persona.poste}</p>}
                        </div>
                      </div>
                      <div className="px-4 py-3 bg-white space-y-2">
                        {persona.description&&<p className="text-xs text-muted leading-relaxed line-clamp-2">{persona.description}</p>}
                        {persona.plateformes?.length>0&&(
                          <div className="flex flex-wrap gap-1">
                            {persona.plateformes.map(p=><span key={p} className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${PLATEFORMES[p]?.badge||'bg-slate-100 text-slate-600'}`}>{PLATEFORMES[p]?.label||p}</span>)}
                          </div>
                        )}
                        <div className="flex gap-1.5 pt-1">
                          <button onClick={()=>setPersonaModal(persona)} className="flex-1 btn-ghost text-xs py-1.5 justify-center"><Pencil size={12}/>Modifier</button>
                          <button onClick={()=>setConfirmDel({type:'persona',id:persona.id})} className="p-1.5 rounded-lg border border-border hover:bg-rose-50 hover:border-rose-200 text-muted hover:text-rose-500 transition-colors"><Trash2 size={13}/></button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ CONTENU ══════════════════════════════════════════════════════════ */}
      {tab==='contenu'&&(
        <div className="space-y-5 lg:space-y-7">

          {/* Calendrier mensuel */}
          <div className="card p-5 lg:p-7">
            <SectionHeader category="Calendrier éditorial" title="Planning mensuel" icon={CalendarDays}
              action={<>
                <button onClick={()=>setPostModal('new')} className="btn-primary hidden sm:flex"><Plus size={15}/>Nouveau post</button>
                <button onClick={()=>setPostModal('new')} className="w-8 h-8 rounded-xl bg-electric/10 text-electric flex items-center justify-center sm:hidden hover:bg-electric/20 transition-colors flex-shrink-0"><Plus size={16}/></button>
              </>}/>
            <MonthlyCalendar
              posts={marketingPosts}
              onNewPost={date=>setPostModal({date})}
              onEditPost={p=>setPostModal(p)}/>
          </div>

          {/* Brainstorming */}
          <div className="card p-5 lg:p-7">
            <SectionHeader category="Idées & Contenu" title={`Brainstorming (${ideas.length})`} icon={Lightbulb}
              iconBg="bg-amber-50" iconColor="text-amber-500"
              action={<>
                <button onClick={()=>setIdeaModal('new')} className="btn-primary hidden sm:flex"><Plus size={15}/>Nouvelle idée</button>
                <button onClick={()=>setIdeaModal('new')} className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center sm:hidden hover:bg-amber-200 transition-colors flex-shrink-0"><Plus size={16}/></button>
              </>}/>
            {ideas.length===0 ? (
              <div className="py-10 text-center">
                <Lightbulb size={36} className="text-muted mx-auto mb-3 opacity-30"/>
                <p className="text-sm font-medium text-ink mb-1">Aucune idée pour l'instant</p>
                <p className="text-xs text-muted mb-4">Notez vos idées de contenu avec script et description avant de les planifier</p>
                <button onClick={()=>setIdeaModal('new')} className="btn-primary mx-auto text-xs py-2"><Plus size={13}/>Ajouter une idée</button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {ideas.map(idea => {
                  const plt = PLATEFORMES[idea.plateforme]
                  const tc  = TYPES_CONTENU[idea.typeContenu]
                  return (
                    <div key={idea.id} className="py-4 group hover:bg-paper-warm/30 rounded-xl -mx-2 px-2 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${plt?.badge||'bg-slate-100 text-slate-600'}`}>
                          {plt?.abbr||'?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-medium text-sm text-ink">{idea.titre}</span>
                            {tc&&<Badge cls="bg-slate-100 text-slate-600">{tc.label}</Badge>}
                            {plt&&<Badge cls={plt.badge}>{plt.label}</Badge>}
                          </div>
                          {idea.description&&<p className="text-xs text-muted mb-1.5 leading-relaxed">{idea.description}</p>}
                          {idea.script&&(
                            <div className="bg-paper border border-border rounded-lg p-2.5 mt-1">
                              <p className="text-[10px] text-muted font-semibold uppercase tracking-wide mb-1">Script</p>
                              <p className="text-xs text-ink font-mono whitespace-pre-wrap leading-relaxed line-clamp-3">{idea.script}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button onClick={()=>setIdeaModal(idea)} className="p-1.5 rounded-lg hover:bg-ink/5 text-muted hover:text-ink"><Pencil size={13}/></button>
                          <button onClick={()=>setConfirmDel({type:'idea',id:idea.id})} className="p-1.5 rounded-lg hover:bg-rose-50 text-muted hover:text-rose-500"><Trash2 size={13}/></button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Inspirations */}
          <div className="card p-5 lg:p-7">
            <SectionHeader category="Veille créative" title={`Inspirations (${inspirations.length})`} icon={Eye}
              iconBg="bg-violet-50" iconColor="text-violet-600"/>

            {/* Filtres types */}
            <div className="flex items-center justify-center gap-2 flex-wrap mb-5">
              <Filter size={13} className="text-muted flex-shrink-0"/>
              {['all',...INSPI_TYPES].map(t=>(
                <button key={t} onClick={()=>setInspiFilter(t)}
                  className={`px-3 py-1 rounded-xl text-xs font-medium border transition-all ${inspiFilter===t?'bg-ink text-white border-transparent':'border-border text-muted hover:border-electric/40 hover:text-ink'}`}>
                  {t==='all'?'Tout':t.charAt(0).toUpperCase()+t.slice(1)}
                </button>
              ))}
            </div>

            {/* Grille */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-5">
              {filteredInspi.map(inspi=>(
                <InspirationCard key={inspi.id} inspi={inspi} onDelete={()=>setConfirmDel({type:'inspi',id:inspi.id})}/>
              ))}
            </div>

            <AddInspirationForm onAdd={v=>saveInspi([...inspirations,v])}/>
          </div>
        </div>
      )}

      {/* ══ STATS & VEILLE ═══════════════════════════════════════════════════ */}
      {tab==='stats'&&(
        <div className="space-y-5 lg:space-y-7">
          {/* KPIs stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
            {(()=>{
              const tv=publies.reduce((s,p)=>s+(p.stats?.vues||0),0)
              const tr=publies.reduce((s,p)=>s+(p.stats?.reach||0),0)
              const tl=publies.reduce((s,p)=>s+(p.stats?.likes||0),0)
              const tc=publies.reduce((s,p)=>s+(p.stats?.commentaires||0),0)
              return [
                {label:'Vues totales',  value:tv.toLocaleString('fr'), icon:Eye,           color:'#3B82F6'},
                {label:'Reach total',   value:tr.toLocaleString('fr'), icon:TrendingUp,    color:'#06B6D4'},
                {label:'Likes cumulés', value:tl.toLocaleString('fr'), icon:Heart,         color:'#F43F5E'},
                {label:'Commentaires',  value:tc.toLocaleString('fr'), icon:MessageCircle, color:'#7C3AED'},
              ].map((k,i)=>(
                <div key={i} className="card p-4 lg:p-6 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted mb-2">{k.label}</div>
                    <div className="font-display text-3xl lg:text-4xl text-ink leading-none">{k.value}</div>
                  </div>
                  <div className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center" style={{background:`${k.color}15`}}>
                    <k.icon size={20} color={k.color} strokeWidth={1.8}/>
                  </div>
                </div>
              ))
            })()}
          </div>

          <div className="flex flex-col lg:flex-row gap-5">
            {/* Par plateforme */}
            <div className="flex-1 card p-5 lg:p-7">
              <SectionHeader category="Statistiques" title="Par plateforme" icon={BarChart2}/>
              {realPosts.length===0 ? (
                <p className="text-sm text-muted py-6 text-center">Aucune donnée disponible</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(PLATEFORMES).map(([k,v])=>{
                    const pts=realPosts.filter(p=>p.plateforme===k)
                    if(!pts.length) return null
                    const pub=pts.filter(p=>p.statut==='publie')
                    const reach=pub.reduce((s,p)=>s+(p.stats?.reach||0),0)
                    const pct=Math.round((pts.length/realPosts.length)*100)
                    return (
                      <div key={k}>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${v.dot}`}/><span className="font-medium text-ink">{v.label}</span><span className="text-muted">{pts.length} post{pts.length!==1?'s':''}</span></div>
                          <span className="text-muted">reach {reach.toLocaleString('fr')}</span>
                        </div>
                        <div className="h-1.5 bg-border rounded-full overflow-hidden"><div className={`h-full rounded-full ${v.dot}`} style={{width:`${pct}%`}}/></div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Top posts */}
            <div className="lg:w-80 card p-5 lg:p-7">
              <SectionHeader category="Publications" title="Top engagements" icon={Star} iconBg="bg-amber-50" iconColor="text-amber-600"/>
              {publies.length===0 ? (
                <p className="text-sm text-muted py-6 text-center">Aucun post publié avec stats</p>
              ) : (
                <div className="space-y-3">
                  {[...publies].sort((a,b)=>{
                    const ea=(a.stats?.likes||0)+(a.stats?.commentaires||0)+(a.stats?.partages||0)
                    const eb=(b.stats?.likes||0)+(b.stats?.commentaires||0)+(b.stats?.partages||0)
                    return eb-ea
                  }).slice(0,5).map((p,i)=>{
                    const plt=PLATEFORMES[p.plateforme]
                    const eng=(p.stats?.likes||0)+(p.stats?.commentaires||0)+(p.stats?.partages||0)
                    return (
                      <div key={p.id} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-muted w-4 flex-shrink-0">#{i+1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink truncate">{p.titre}</p>
                          <div className="flex items-center gap-1.5 text-xs text-muted">
                            {plt&&<span className={`${plt.badge} px-1.5 py-0.5 rounded-full text-[10px] font-medium`}>{plt.abbr}</span>}
                            <span className="flex items-center gap-0.5"><Heart size={10}/>{p.stats?.likes||0}</span>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-ink">{eng}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Veille */}
          <div className="card p-5 lg:p-7">
            <SectionHeader category="Veille concurrentielle" title={`Concurrents (${marketingConfig.veille.length})`} icon={Eye}
              iconBg="bg-rose-50" iconColor="text-rose-500"
              action={<>
                <button onClick={()=>saveVeille([...marketingConfig.veille,{id:uid(),nom:'',plateforme:'instagram',abonnes:'',frequence:'',notes:''}])} className="btn-primary hidden sm:flex"><Plus size={15}/>Ajouter</button>
                <button onClick={()=>saveVeille([...marketingConfig.veille,{id:uid(),nom:'',plateforme:'instagram',abonnes:'',frequence:'',notes:''}])} className="w-8 h-8 rounded-xl bg-rose-100 text-rose-500 flex items-center justify-center sm:hidden hover:bg-rose-200 transition-colors flex-shrink-0"><Plus size={16}/></button>
              </>}/>
            {marketingConfig.veille.length===0 ? (
              <div className="py-8 text-center">
                <Eye size={32} className="text-muted mx-auto mb-3 opacity-30"/>
                <p className="text-sm text-muted">Aucun concurrent suivi.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead><tr className="border-b border-border">
                    {['Compte','Plateforme','Abonnés','Fréquence','Notes',''].map((h,i)=>(
                      <th key={i} className="text-left py-2.5 px-3 label-text font-medium">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody className="divide-y divide-border">
                    {marketingConfig.veille.map(v=>(
                      <tr key={v.id} className="group hover:bg-paper-warm/50 transition-colors">
                        <td className="py-2.5 px-3">
                          <input value={v.nom||''} onChange={e=>saveVeille(marketingConfig.veille.map(x=>x.id===v.id?{...x,nom:e.target.value}:x))}
                            className="bg-transparent focus:outline-none focus:bg-white focus:ring-2 focus:ring-electric/30 rounded-lg px-2 py-1 -mx-2 w-full transition-all font-medium text-ink"/>
                        </td>
                        <td className="py-2.5 px-3">
                          <select value={v.plateforme||'instagram'} onChange={e=>saveVeille(marketingConfig.veille.map(x=>x.id===v.id?{...x,plateforme:e.target.value}:x))}
                            className="text-xs px-2 py-1.5 rounded-lg border border-border bg-white focus:outline-none">
                            {Object.entries(PLATEFORMES).map(([k,val])=><option key={k} value={k}>{val.label}</option>)}
                          </select>
                        </td>
                        {['abonnes','frequence','notes'].map(fk=>(
                          <td key={fk} className="py-2.5 px-3">
                            <input value={v[fk]||''} onChange={e=>saveVeille(marketingConfig.veille.map(x=>x.id===v.id?{...x,[fk]:e.target.value}:x))}
                              className="bg-transparent focus:outline-none focus:bg-white focus:ring-2 focus:ring-electric/30 rounded-lg px-2 py-1 -mx-2 w-full transition-all text-muted"/>
                          </td>
                        ))}
                        <td className="py-2.5 px-2 w-8">
                          <button onClick={()=>setConfirmDel({type:'veille',id:v.id})}
                            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-rose-50 text-muted hover:text-rose-500 transition-all"><Trash2 size={13}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {postModal&&(
        <PostModal post={postForModal} defaultDate={defaultDate}
          onClose={()=>setPostModal(null)} onSave={handleSavePost}/>
      )}
      {ideaModal&&(
        <IdeaModal idea={ideaModal!=='new'?ideaModal:null}
          onClose={()=>setIdeaModal(null)} onSave={handleSaveIdea}/>
      )}
      {personaModal&&(
        <PersonaModal persona={personaModal!=='new'?personaModal:null}
          onClose={()=>setPersonaModal(null)}
          onSave={p=>{
            const ex=marketingConfig.personas.find(x=>x.id===p.id)
            savePersonas(ex?marketingConfig.personas.map(x=>x.id===p.id?p:x):[...marketingConfig.personas,p])
            toast.success(ex?'Persona mis à jour':'Persona créé')
          }}/>
      )}
      {confirmDel&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm"
          onClick={e=>e.target===e.currentTarget&&setConfirmDel(null)}>
          <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-border">
            <h3 className="font-semibold text-ink mb-2">Supprimer ?</h3>
            <p className="text-sm text-muted mb-5">Cette action est irréversible.</p>
            <div className="flex justify-end gap-2">
              <button onClick={()=>setConfirmDel(null)} className="btn-ghost">Annuler</button>
              <button onClick={handleDelConfirm} className="px-4 py-2.5 text-sm font-medium bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-colors">Supprimer</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
