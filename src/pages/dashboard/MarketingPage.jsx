import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Target, Users, CalendarDays, BarChart2, Eye, Plus, Pencil,
  Trash2, X, Check, ChevronLeft, ChevronRight, Megaphone,
  TrendingUp, Heart, MessageCircle, Clock, AlertCircle,
  BookOpen, Film, Image, LayoutGrid, Star, FileText,
  ExternalLink, Copy,
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
  brouillon: { label: 'Brouillon', cls: 'bg-slate-100 text-slate-600' },
  planifie:  { label: 'Planifié',  cls: 'bg-amber-100 text-amber-700' },
  publie:    { label: 'Publié',    cls: 'bg-emerald-100 text-emerald-700' },
}

const SWOT_CONFIG = [
  { key: 'forces',       label: 'Forces',       sub: 'Atouts internes',              bg: 'bg-emerald-50', border: 'border-emerald-200', icon: '💪' },
  { key: 'faiblesses',   label: 'Faiblesses',   sub: 'Points à améliorer',           bg: 'bg-rose-50',    border: 'border-rose-200',    icon: '⚠️' },
  { key: 'opportunites', label: 'Opportunités', sub: 'Facteurs externes favorables', bg: 'bg-blue-50',    border: 'border-blue-200',    icon: '🚀' },
  { key: 'menaces',      label: 'Menaces',      sub: 'Risques externes',             bg: 'bg-amber-50',   border: 'border-amber-200',   icon: '🛡️' },
]

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const DAYS_FR   = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']

const TABS = [
  { id: 'dashboard', label: 'Tableau de bord', icon: Megaphone },
  { id: 'strategie', label: 'Stratégie',        icon: Target },
  { id: 'contenu',   label: 'Contenu',          icon: CalendarDays },
  { id: 'stats',     label: 'Stats & Veille',   icon: BarChart2 },
]

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

// ─── Badge inline ─────────────────────────────────────────────────────────────

function Badge({ cls, children }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${cls}`}>{children}</span>
}

// ─── Modal Publication ────────────────────────────────────────────────────────

function PostModal({ post, piliers, defaultDate, onClose, onSave }) {
  const EMPTY = { titre:'', contenu:'', plateforme:'instagram', typeContenu:'photo', statut:'brouillon', pilier:'', datePublication: defaultDate || '', lienUrl:'', hashtags:[], notes:'', stats:{vues:0,likes:0,commentaires:0,partages:0,reach:0} }
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
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-paper text-muted hover:text-ink transition-colors"><X size={15}/></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="label-text mb-1.5 block">Titre *</label>
            <input value={f.titre} onChange={e=>set('titre',e.target.value)} className="input-field"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text mb-1.5 block">Plateforme</label>
              <select value={f.plateforme} onChange={e=>set('plateforme',e.target.value)} className="input-field">
                {Object.entries(PLATEFORMES).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label-text mb-1.5 block">Type de contenu</label>
              <select value={f.typeContenu} onChange={e=>set('typeContenu',e.target.value)} className="input-field">
                {Object.entries(TYPES_CONTENU).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text mb-1.5 block">Statut</label>
              <select value={f.statut} onChange={e=>set('statut',e.target.value)} className="input-field">
                {Object.entries(STATUTS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label-text mb-1.5 block">Pilier</label>
              <select value={f.pilier||''} onChange={e=>set('pilier',e.target.value)} className="input-field">
                <option value="">— Aucun —</option>
                {piliers.map(p=><option key={p.id} value={p.nom}>{p.nom}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text mb-1.5 block">Date de publication</label>
              <input type="date" value={f.datePublication||''} onChange={e=>set('datePublication',e.target.value)} className="input-field"/>
            </div>
            <div>
              <label className="label-text mb-1.5 block">URL du post</label>
              <input value={f.lienUrl||''} onChange={e=>set('lienUrl',e.target.value)} className="input-field"/>
            </div>
          </div>
          <div>
            <label className="label-text mb-1.5 block">Caption</label>
            <textarea value={f.contenu||''} onChange={e=>set('contenu',e.target.value)} rows={3} className="input-field resize-none"/>
          </div>
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

  const firstDow = new Date(year, month, 1).getDay()
  const offset   = (firstDow + 6) % 7  // Monday-based
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = todayStr()

  const cells = []
  for (let i = 0; i < offset; i++) {
    const d = new Date(year, month, 1 - offset + i)
    cells.push({ date: d.toISOString().slice(0,10), day: d.getDate(), current: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year,month,d).toISOString().slice(0,10), day: d, current: true })
  }
  const rem = (7 - cells.length % 7) % 7
  for (let i = 1; i <= rem; i++) {
    const d = new Date(year, month+1, i)
    cells.push({ date: d.toISOString().slice(0,10), day: d.getDate(), current: false })
  }

  const byDate = useMemo(() => {
    const m = {}
    posts.forEach(p => {
      if(!p.datePublication) return
      const k = p.datePublication.slice(0,10)
      if(!m[k]) m[k]=[]
      m[k].push(p)
    })
    return m
  }, [posts])

  return (
    <div>
      {/* Nav */}
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

      {/* Grille */}
      <div className="border border-border rounded-xl overflow-hidden">
        {/* En-têtes jours */}
        <div className="grid grid-cols-7 border-b border-border bg-paper/80">
          {DAYS_FR.map(d=>(
            <div key={d} className="px-2 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider text-center border-r border-border last:border-r-0">
              {d}
            </div>
          ))}
        </div>

        {/* Cases jours */}
        <div className="grid grid-cols-7">
          {cells.map((cell, i) => {
            const dayPosts = byDate[cell.date] || []
            const isToday  = cell.date === today
            const isLast   = i === cells.length - 1
            const isLastRow = i >= cells.length - 7

            return (
              <div key={i}
                className={`border-r border-b border-border min-h-[96px] p-1.5 relative group transition-colors
                  ${(i+1)%7===0?'border-r-0':''}
                  ${isLastRow?'border-b-0':''}
                  ${!cell.current?'bg-paper/60':''}
                  ${isToday&&cell.current?'bg-electric/5':''}
                  ${cell.current&&!isToday?'hover:bg-paper/40 bg-white':''}`}>

                {/* Numéro du jour */}
                <div className={`text-[11px] font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1 leading-none
                  ${isToday&&cell.current?'bg-ink text-white':cell.current?'text-ink':'text-muted'}`}>
                  {cell.day}
                </div>

                {/* Chips de posts */}
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
                  {dayPosts.length>3&&(
                    <p className="text-[10px] text-muted px-1.5">+{dayPosts.length-3} autre{dayPosts.length-3>1?'s':''}</p>
                  )}
                </div>

                {/* Bouton + au hover */}
                {cell.current&&(
                  <button onClick={()=>onNewPost(cell.date)}
                    className="absolute top-1 right-1 w-5 h-5 rounded flex items-center justify-center text-xs font-bold text-muted bg-white border border-border opacity-0 group-hover:opacity-100 hover:bg-electric/10 hover:text-electric hover:border-electric/30 transition-all">
                    +
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Légende plateformes */}
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

// ─── Champ éditable ───────────────────────────────────────────────────────────

function EditField({ label, value, onSave, placeholder, multiline=false }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value||'')
  if(editing) return (
    <div>
      <label className="label-text mb-1.5 block">{label}</label>
      {multiline
        ? <textarea value={draft} onChange={e=>setDraft(e.target.value)} rows={3} className="input-field resize-none" autoFocus/>
        : <input value={draft} onChange={e=>setDraft(e.target.value)} className="input-field" autoFocus/>
      }
      <div className="flex gap-2 mt-2">
        <button onClick={()=>{onSave(draft);setEditing(false)}} className="btn-primary text-xs py-1.5"><Check size={13}/>Enregistrer</button>
        <button onClick={()=>{setDraft(value||'');setEditing(false)}} className="btn-ghost text-xs py-1.5">Annuler</button>
      </div>
    </div>
  )
  return (
    <div className="group cursor-pointer" onClick={()=>{setDraft(value||'');setEditing(true)}}>
      <label className="label-text mb-1.5 block cursor-pointer">{label}</label>
      <div className="flex items-start gap-2 p-3 rounded-xl border border-border hover:border-electric/50 transition-colors min-h-[52px]">
        <p className={`flex-1 text-sm ${value?'text-ink':'text-muted italic'}`}>{value||placeholder}</p>
        <Pencil size={13} className="text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5"/>
      </div>
    </div>
  )
}

// ─── Tags editor ──────────────────────────────────────────────────────────────

function TagsEditor({ label, value=[], onChange }) {
  const [input, setInput] = useState('')
  const add = e => {
    if(e.key!=='Enter'&&e.key!==',') return; e.preventDefault()
    const t=input.trim(); if(t&&!value.includes(t)) onChange([...value,t]); setInput('')
  }
  return (
    <div>
      <label className="label-text mb-1.5 block">{label}</label>
      <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-border min-h-[48px]">
        {value.map(t=>(
          <span key={t} className="flex items-center gap-1.5 px-3 py-1 bg-ink/5 text-ink text-xs font-medium rounded-full">
            {t}<button onClick={()=>onChange(value.filter(x=>x!==t))} className="hover:text-rose-500"><X size={11}/></button>
          </span>
        ))}
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={add}
          className="flex-1 min-w-[100px] text-sm text-ink bg-transparent focus:outline-none px-1"/>
      </div>
    </div>
  )
}

// ─── Objectif row ─────────────────────────────────────────────────────────────

function ObjectifRow({ obj, onChange, onDelete }) {
  const debut  = Number(obj.valeurDebut)||0
  const cible  = Number(obj.valeurCible)||100
  const actuel = Number(obj.valeurActuelle)||debut
  const pct    = cible>debut ? Math.min(100,Math.round(((actuel-debut)/(cible-debut))*100)) : 0
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(obj)
  const barCls = pct>=80?'bg-emerald-500':pct>=40?'bg-amber-500':'bg-rose-500'
  const echeance = obj.echeance?new Date(obj.echeance):null
  const jours    = echeance?Math.ceil((echeance-new Date())/86400000):null

  if(editing) return (
    <div className="p-4 rounded-xl border border-electric/30 bg-electric/5 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label-text mb-1.5 block">Objectif</label><input value={draft.nom||''} onChange={e=>setDraft(d=>({...d,nom:e.target.value}))} className="input-field"/></div>
        <div><label className="label-text mb-1.5 block">Unité</label><input value={draft.unite||''} onChange={e=>setDraft(d=>({...d,unite:e.target.value}))} className="input-field"/></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="label-text mb-1.5 block">Départ</label><input type="number" value={draft.valeurDebut||0} onChange={e=>setDraft(d=>({...d,valeurDebut:+e.target.value}))} className="input-field"/></div>
        <div><label className="label-text mb-1.5 block">Actuel</label><input type="number" value={draft.valeurActuelle||0} onChange={e=>setDraft(d=>({...d,valeurActuelle:+e.target.value}))} className="input-field"/></div>
        <div><label className="label-text mb-1.5 block">Cible</label><input type="number" value={draft.valeurCible||100} onChange={e=>setDraft(d=>({...d,valeurCible:+e.target.value}))} className="input-field"/></div>
      </div>
      <div><label className="label-text mb-1.5 block">Échéance</label><input type="date" value={draft.echeance||''} onChange={e=>setDraft(d=>({...d,echeance:e.target.value}))} className="input-field w-44"/></div>
      <div className="flex gap-2"><button onClick={()=>{onChange(draft);setEditing(false)}} className="btn-primary text-xs py-1.5"><Check size={13}/>Enregistrer</button><button onClick={()=>setEditing(false)} className="btn-ghost text-xs py-1.5">Annuler</button></div>
    </div>
  )

  return (
    <div className="group hover:bg-paper-warm px-3 py-3 rounded-xl transition-colors">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-ink">{obj.nom||'(sans nom)'}</span>
        <div className="flex items-center gap-2">
          {jours!==null&&jours<0&&<span className="text-[10px] text-rose-600 font-medium">En retard</span>}
          {jours!==null&&jours>=0&&jours<=14&&<span className="text-[10px] text-amber-600 font-medium">{jours}j restants</span>}
          <span className={`text-xs font-bold ${pct>=80?'text-emerald-600':pct>=40?'text-amber-600':'text-rose-600'}`}>{pct}%</span>
          {onChange&&onDelete&&(
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={()=>{setDraft(obj);setEditing(true)}} className="p-1 rounded hover:bg-ink/5 text-muted hover:text-ink"><Pencil size={12}/></button>
              <button onClick={onDelete} className="p-1 rounded hover:bg-rose-50 text-muted hover:text-rose-500"><Trash2 size={12}/></button>
            </div>
          )}
        </div>
      </div>
      <div className="h-1.5 bg-border rounded-full overflow-hidden mb-1">
        <div className={`h-full rounded-full ${barCls}`} style={{width:`${pct}%`}}/>
      </div>
      <p className="text-[10px] text-muted">{actuel} / {cible} {obj.unite}{obj.echeance?` · ${fmtDate(obj.echeance)}`:''}</p>
    </div>
  )
}

// ─── Pilier row ───────────────────────────────────────────────────────────────

function PilierRow({ pil, color, count, pctReel, onChange, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({nom:pil.nom,pctVise:pil.pctVise||20})
  if(editing) return (
    <div className={`flex items-center gap-3 p-3 rounded-xl ${color.bg}`}>
      <input value={draft.nom} onChange={e=>setDraft(d=>({...d,nom:e.target.value}))}
        className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-border bg-white focus:outline-none"/>
      <input type="number" min="0" max="100" value={draft.pctVise} onChange={e=>setDraft(d=>({...d,pctVise:+e.target.value}))}
        className="w-16 text-sm px-2 py-1.5 rounded-lg border border-border bg-white text-center focus:outline-none"/>
      <span className="text-xs text-muted flex-shrink-0">% visé</span>
      <button onClick={()=>{onChange(draft);setEditing(false)}} className="p-1.5 rounded-lg bg-ink text-white flex-shrink-0"><Check size={13}/></button>
      <button onClick={()=>setEditing(false)} className="p-1.5 rounded-lg border border-border text-muted flex-shrink-0"><X size={13}/></button>
    </div>
  )
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${color.bar}`}/>
          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${color.bg} ${color.text}`}>{pil.nom}</span>
          <span className="text-xs text-muted">{count} post{count!==1?'s':''}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">{pctReel}% réel / {pil.pctVise||0}% visé</span>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={()=>{setDraft({nom:pil.nom,pctVise:pil.pctVise||20});setEditing(true)}} className="p-1 rounded hover:bg-ink/5 text-muted hover:text-ink"><Pencil size={11}/></button>
            <button onClick={onDelete} className="p-1 rounded hover:bg-rose-50 text-muted hover:text-rose-500"><Trash2 size={11}/></button>
          </div>
        </div>
      </div>
      <div className="h-1.5 bg-border rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color.bar}`} style={{width:`${Math.min(100,pctReel)}%`}}/>
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function MarketingPage() {
  const { marketingPosts, marketingConfig, addMarketingPost, updateMarketingPost, deleteMarketingPost, updateMarketingConfig } = useData()
  const { employe } = useAuth()

  const [tab, setTab] = useState('dashboard')
  const [postModal, setPostModal] = useState(null)   // null | 'new' | { date } | post-object
  const [personaModal, setPersonaModal] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)

  // ── Computed ─────────────────────────────────────────────────────────────────

  const publies   = useMemo(()=>marketingPosts.filter(p=>p.statut==='publie'),[marketingPosts])
  const planifies = useMemo(()=>marketingPosts.filter(p=>p.statut==='planifie'),[marketingPosts])
  const weekPosts = useMemo(()=>getWeekPosts(marketingPosts),[marketingPosts])
  const totalReach = useMemo(()=>publies.reduce((s,p)=>s+(p.stats?.reach||0),0),[publies])
  const totalLikes = useMemo(()=>publies.reduce((s,p)=>s+(p.stats?.likes||0),0),[publies])

  const pilierStats = useMemo(()=>{
    const total = marketingPosts.length
    return (marketingConfig.piliers||[]).map((pil,idx)=>{
      const count   = marketingPosts.filter(p=>p.pilier===pil.nom).length
      const pctReel = total>0?Math.round((count/total)*100):0
      return { ...pil, count, pctReel, color: PILIER_COLORS[idx%PILIER_COLORS.length] }
    })
  },[marketingPosts,marketingConfig.piliers])

  const objectifsAvancement = useMemo(()=>(marketingConfig.objectifs||[]).map(obj=>{
    const debut=Number(obj.valeurDebut)||0, cible=Number(obj.valeurCible)||100, actuel=Number(obj.valeurActuelle)||debut
    const pct=cible>debut?Math.min(100,Math.round(((actuel-debut)/(cible-debut))*100)):0
    const echeance=obj.echeance?new Date(obj.echeance):null
    const jours=echeance?Math.ceil((echeance-new Date())/86400000):null
    return {...obj,pct,jours,retard:jours!==null&&jours<0}
  }),[marketingConfig.objectifs])

  // ── Handlers config ───────────────────────────────────────────────────────────

  const saveSwot     = (key,items) => updateMarketingConfig({swot:{...marketingConfig.swot,[key]:items}})
  const savePiliers  = p => updateMarketingConfig({piliers:p})
  const savePersonas = p => updateMarketingConfig({personas:p})
  const saveObjectifs= o => updateMarketingConfig({objectifs:o})
  const saveVeille   = v => updateMarketingConfig({veille:v})

  // ── Handlers posts ────────────────────────────────────────────────────────────

  const handleSavePost = form => {
    const isEdit = postModal&&typeof postModal==='object'&&postModal?.id
    if(isEdit) { updateMarketingPost(postModal.id,form); toast.success('Post mis à jour') }
    else       { addMarketingPost({...form,createdById:employe?.id,createdByNom:employe?.nom}); toast.success('Post créé') }
  }

  const handleDelConfirm = () => {
    if(!confirmDel) return
    if(confirmDel.type==='post')     { deleteMarketingPost(confirmDel.id); toast.success('Post supprimé') }
    if(confirmDel.type==='persona')  savePersonas(marketingConfig.personas.filter(p=>p.id!==confirmDel.id))
    if(confirmDel.type==='pilier')   savePiliers(marketingConfig.piliers.filter(p=>p.id!==confirmDel.id))
    if(confirmDel.type==='objectif') saveObjectifs(marketingConfig.objectifs.filter(o=>o.id!==confirmDel.id))
    if(confirmDel.type==='veille')   saveVeille(marketingConfig.veille.filter(v=>v.id!==confirmDel.id))
    setConfirmDel(null)
  }

  const postForModal  = (postModal&&typeof postModal==='object'&&postModal?.id) ? postModal : null
  const defaultDate   = (postModal&&typeof postModal==='object'&&!postModal?.id&&postModal?.date) ? postModal.date : ''

  return (
    <div className="p-4 lg:p-10 space-y-5 lg:space-y-7">

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-all ${
              tab===t.id ? 'bg-ink text-white shadow-sm' : 'text-muted hover:text-ink hover:bg-paper-warm'
            }`}>
            <t.icon size={14}/>{t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ══ TABLEAU DE BORD ══════════════════════════════════════════════════ */}
        {tab==='dashboard'&&(
          <motion.div key="db" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-5 lg:space-y-7">

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
                    <button onClick={()=>setTab('strategie')} className="btn-ghost text-xs py-1.5 mx-auto">Ajouter un objectif</button>
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
                          <Badge cls={st?.cls}>{st?.label}</Badge>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Alertes */}
            {(()=>{
              const alerts=[]
              pilierStats.filter(p=>p.pctReel<(p.pctVise||10)-10).forEach(p=>alerts.push({type:'w',msg:`Pilier négligé : ${p.nom}`}))
              objectifsAvancement.filter(o=>o.retard).forEach(o=>alerts.push({type:'d',msg:`Objectif en retard : ${o.nom}`}))
              if(!alerts.length) return null
              return <div className="space-y-2">{alerts.map((a,i)=>(
                <div key={i} className={`flex items-center gap-3 p-3.5 rounded-xl border text-sm font-medium ${a.type==='d'?'bg-rose-50 border-rose-200 text-rose-700':'bg-amber-50 border-amber-200 text-amber-700'}`}>
                  <AlertCircle size={15} className="flex-shrink-0"/>{a.msg}
                </div>
              ))}</div>
            })()}
          </motion.div>
        )}

        {/* ══ STRATÉGIE ════════════════════════════════════════════════════════ */}
        {tab==='strategie'&&(
          <motion.div key="strat" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-5 lg:space-y-7">

            {/* Identité */}
            <div className="card p-5 lg:p-7">
              <SectionHeader category="Marketing" title="Identité de marque" icon={Megaphone}/>
              <div className="grid lg:grid-cols-2 gap-5 mb-5">
                <EditField label="Positionnement" value={marketingConfig.positionnement} onSave={v=>updateMarketingConfig({positionnement:v})} placeholder="Notre agence est la référence pour…" multiline/>
                <EditField label="Message clé" value={marketingConfig.messageCle} onSave={v=>updateMarketingConfig({messageCle:v})} placeholder="Ce que chaque publication doit transmettre…" multiline/>
              </div>
              <TagsEditor label="Ton éditorial" value={marketingConfig.ton} onChange={v=>updateMarketingConfig({ton:v})}/>
              <div className="mt-5">
                <label className="label-text mb-3 block">Charte couleurs</label>
                <div className="flex flex-wrap gap-4 items-end">
                  {(marketingConfig.charte?.couleurs||[]).map((c,i)=>(
                    <div key={i} className="flex flex-col items-center gap-1.5 group cursor-pointer"
                      onClick={()=>{navigator.clipboard?.writeText(c.hex).catch(()=>{}); toast.success(`${c.hex} copié`)}}>
                      <div className="w-12 h-12 rounded-xl border border-border shadow-sm relative overflow-hidden" style={{background:c.hex}}>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 transition-opacity"><Copy size={14} className="text-white"/></div>
                      </div>
                      <p className="text-[10px] font-medium text-ink">{c.nom}</p>
                      <p className="text-[10px] text-muted font-mono">{c.hex}</p>
                    </div>
                  ))}
                  <button onClick={()=>{const hex=prompt('Code hex (ex: #FF5733)'),nom=hex?prompt('Nom'):null;if(hex&&nom)updateMarketingConfig({charte:{...marketingConfig.charte,couleurs:[...(marketingConfig.charte?.couleurs||[]),{hex,nom}]}})}}
                    className="w-12 h-12 rounded-xl border-2 border-dashed border-border text-muted hover:border-electric hover:text-electric transition-colors flex items-center justify-center">
                    <Plus size={16}/>
                  </button>
                </div>
              </div>
            </div>

            {/* SWOT */}
            <div className="card p-5 lg:p-7">
              <SectionHeader category="Stratégie" title="Analyse SWOT" icon={Target} iconBg="bg-amber-50" iconColor="text-amber-600"/>
              <div className="grid grid-cols-2 gap-3">
                {SWOT_CONFIG.map(q=>(
                  <SwotQuadrant key={q.key} config={q} items={marketingConfig.swot?.[q.key]||[]} onChange={items=>saveSwot(q.key,items)}/>
                ))}
              </div>
            </div>

            {/* Objectifs */}
            <div className="card p-5 lg:p-7">
              <SectionHeader category="Marketing" title={`Objectifs (${marketingConfig.objectifs.length})`} icon={TrendingUp}
                iconBg="bg-emerald-50" iconColor="text-emerald-600"
                action={<button onClick={()=>saveObjectifs([...marketingConfig.objectifs,{id:uid(),nom:'',valeurDebut:0,valeurActuelle:0,valeurCible:100,unite:'',echeance:''}])} className="btn-primary"><Plus size={15}/>Ajouter</button>}/>
              {marketingConfig.objectifs.length===0 ? (
                <p className="text-sm text-muted py-6 text-center">Aucun objectif SMART. Définissez vos cibles pour mesurer vos progrès.</p>
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
                action={<button onClick={()=>setPersonaModal('new')} className="btn-primary"><Plus size={15}/>Nouveau persona</button>}/>
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
          </motion.div>
        )}

        {/* ══ CONTENU ══════════════════════════════════════════════════════════ */}
        {tab==='contenu'&&(
          <motion.div key="cont" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-5 lg:space-y-7">

            {/* Piliers */}
            <div className="card p-5 lg:p-7">
              <SectionHeader category="Stratégie éditoriale" title={`Piliers (${marketingConfig.piliers.length})`} icon={Target}
                iconBg="bg-violet-50" iconColor="text-violet-600"
                action={<button onClick={()=>savePiliers([...marketingConfig.piliers,{id:uid(),nom:'Nouveau pilier',pctVise:20}])} className="btn-ghost text-xs py-1.5"><Plus size={13}/>Ajouter</button>}/>
              {marketingConfig.piliers.length===0 ? (
                <p className="text-sm text-muted py-4 text-center">Définissez vos 3-5 piliers de contenu pour structurer votre stratégie éditoriale.</p>
              ) : (
                <div className="space-y-4">
                  {pilierStats.map(pil=>(
                    <PilierRow key={pil.id} pil={pil} color={pil.color} count={pil.count} pctReel={pil.pctReel}
                      onChange={data=>savePiliers(marketingConfig.piliers.map(p=>p.id===pil.id?{...p,...data}:p))}
                      onDelete={()=>setConfirmDel({type:'pilier',id:pil.id})}/>
                  ))}
                </div>
              )}
            </div>

            {/* Calendrier mensuel */}
            <div className="card p-5 lg:p-7">
              <SectionHeader category="Calendrier éditorial" title="Planning mensuel" icon={CalendarDays}
                action={<button onClick={()=>setPostModal('new')} className="btn-primary"><Plus size={15}/>Nouveau post</button>}/>
              <MonthlyCalendar
                posts={marketingPosts}
                onNewPost={date=>setPostModal({date})}
                onEditPost={p=>setPostModal(p)}/>
            </div>

            {/* Liste posts */}
            <div className="card p-5 lg:p-7">
              <SectionHeader category="Publications" title={`Tous les posts (${marketingPosts.length})`} icon={FileText}
                iconBg="bg-amber-50" iconColor="text-amber-600"/>
              {marketingPosts.length===0 ? (
                <div className="py-10 text-center">
                  <CalendarDays size={36} className="text-muted mx-auto mb-3 opacity-30"/>
                  <p className="text-sm font-medium text-ink mb-1">Aucun post créé</p>
                  <button onClick={()=>setPostModal('new')} className="btn-primary mx-auto mt-3 text-xs py-2"><Plus size={13}/>Créer un post</button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {[...marketingPosts].sort((a,b)=>(b.datePublication||b.createdAt||'').localeCompare(a.datePublication||a.createdAt||'')).map(p=>{
                    const plt=PLATEFORMES[p.plateforme], st=STATUTS[p.statut]
                    const pidx=marketingConfig.piliers.findIndex(x=>x.nom===p.pilier)
                    const pc=pidx>=0?PILIER_COLORS[pidx%PILIER_COLORS.length]:null
                    return (
                      <div key={p.id} className="flex items-start gap-4 py-3.5 hover:bg-paper-warm/50 transition-colors group">
                        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${plt?.dot||'bg-muted'}`}/>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className="font-medium text-sm text-ink">{p.titre||'(sans titre)'}</span>
                            {plt&&<Badge cls={plt.badge}>{plt.abbr}</Badge>}
                            <Badge cls={st?.cls}>{st?.label}</Badge>
                            {p.pilier&&pc&&<Badge cls={`${pc.bg} ${pc.text}`}>{p.pilier}</Badge>}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted">
                            {p.datePublication&&<span>{fmtDate(p.datePublication)}</span>}
                            {p.typeContenu&&<span>{TYPES_CONTENU[p.typeContenu]?.label||p.typeContenu}</span>}
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {p.lienUrl&&<a href={p.lienUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-ink/5 text-muted hover:text-electric"><ExternalLink size={13}/></a>}
                          <button onClick={()=>setPostModal(p)} className="p-1.5 rounded-lg hover:bg-ink/5 text-muted hover:text-ink"><Pencil size={13}/></button>
                          <button onClick={()=>setConfirmDel({type:'post',id:p.id})} className="p-1.5 rounded-lg hover:bg-rose-50 text-muted hover:text-rose-500"><Trash2 size={13}/></button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ══ STATS & VEILLE ═══════════════════════════════════════════════════ */}
        {tab==='stats'&&(
          <motion.div key="stats" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-5 lg:space-y-7">

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
                {marketingPosts.length===0 ? (
                  <p className="text-sm text-muted py-6 text-center">Aucune donnée disponible</p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(PLATEFORMES).map(([k,v])=>{
                      const pts=marketingPosts.filter(p=>p.plateforme===k)
                      if(!pts.length) return null
                      const pub=pts.filter(p=>p.statut==='publie')
                      const reach=pub.reduce((s,p)=>s+(p.stats?.reach||0),0)
                      const pct=Math.round((pts.length/marketingPosts.length)*100)
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

            {/* Répartition piliers */}
            {pilierStats.length>0&&(
              <div className="card p-5 lg:p-7">
                <SectionHeader category="Analyse" title="Répartition par pilier" icon={Target} iconBg="bg-violet-50" iconColor="text-violet-600"/>
                <div className="space-y-4">
                  {pilierStats.map(pil=>(
                    <div key={pil.id} className="flex items-center gap-4">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full min-w-[110px] text-center ${pil.color.bg} ${pil.color.text}`}>{pil.nom}</span>
                      <div className="flex-1"><div className="h-2 bg-border rounded-full overflow-hidden"><div className={`h-full rounded-full ${pil.color.bar}`} style={{width:`${pil.pctReel}%`}}/></div></div>
                      <span className="text-xs text-muted w-28 text-right"><span className="font-medium text-ink">{pil.pctReel}%</span> réel · {pil.pctVise||0}% visé</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Veille */}
            <div className="card p-5 lg:p-7">
              <SectionHeader category="Veille concurrentielle" title={`Concurrents (${marketingConfig.veille.length})`} icon={Eye}
                iconBg="bg-rose-50" iconColor="text-rose-500"
                action={<button onClick={()=>saveVeille([...marketingConfig.veille,{id:uid(),nom:'',plateforme:'instagram',abonnes:'',frequence:'',notes:''}])} className="btn-primary"><Plus size={15}/>Ajouter</button>}/>
              {marketingConfig.veille.length===0 ? (
                <div className="py-8 text-center">
                  <Eye size={32} className="text-muted mx-auto mb-3 opacity-30"/>
                  <p className="text-sm text-muted">Aucun concurrent suivi. Ajoutez des comptes pour benchmarker votre stratégie.</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead>
                      <tr className="border-b border-border">
                        {['Compte','Plateforme','Abonnés','Fréquence','Notes',''].map((h,i)=>(
                          <th key={i} className="text-left py-2.5 px-3 label-text font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
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
          </motion.div>
        )}

      </AnimatePresence>

      {/* FAB mobile */}
      <button onClick={()=>setPostModal('new')}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-2xl bg-ink text-white shadow-lg hover:bg-ink-soft transition-colors flex items-center justify-center z-40 lg:hidden">
        <Plus size={20}/>
      </button>

      {/* ── Modals ── */}
      <AnimatePresence>
        {postModal&&(
          <PostModal post={postForModal} defaultDate={defaultDate} piliers={marketingConfig.piliers}
            onClose={()=>setPostModal(null)} onSave={handleSavePost}/>
        )}
        {personaModal&&(
          <PersonaModal persona={personaModal!=='new'?personaModal:null} onClose={()=>setPersonaModal(null)}
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
      </AnimatePresence>
    </div>
  )
}
