import { useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  LayoutDashboard, Target, Users, CalendarDays, BarChart2, Eye,
  Plus, Pencil, Trash2, X, Check, ChevronRight, Copy,
  Instagram, Linkedin, Youtube, Globe, Hash, TrendingUp,
  Heart, MessageCircle, Share2, ExternalLink, AlertCircle,
  Megaphone, BookOpen, Film, Image, LayoutGrid, Star, FileText,
  ArrowRight, Clock, Zap,
} from 'lucide-react'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'

// ─── Design tokens ────────────────────────────────────────────────────────────

const PILIER_COLORS = [
  { bg: 'bg-violet-100', text: 'text-violet-700', bar: 'bg-violet-500', hex: '#7C3AED' },
  { bg: 'bg-cyan-100',   text: 'text-cyan-700',   bar: 'bg-cyan-500',   hex: '#06B6D4' },
  { bg: 'bg-amber-100',  text: 'text-amber-700',  bar: 'bg-amber-500',  hex: '#D97706' },
  { bg: 'bg-emerald-100',text: 'text-emerald-700',bar: 'bg-emerald-500',hex: '#059669' },
  { bg: 'bg-rose-100',   text: 'text-rose-700',   bar: 'bg-rose-500',   hex: '#E11D48' },
]

const PLATEFORMES = {
  instagram: { label: 'Instagram', dot: 'bg-pink-500',   badge: 'bg-pink-100 text-pink-700' },
  linkedin:  { label: 'LinkedIn',  dot: 'bg-blue-600',   badge: 'bg-blue-100 text-blue-700' },
  pinterest: { label: 'Pinterest', dot: 'bg-red-500',    badge: 'bg-red-100 text-red-700' },
  youtube:   { label: 'YouTube',   dot: 'bg-rose-600',   badge: 'bg-rose-100 text-rose-700' },
  facebook:  { label: 'Facebook',  dot: 'bg-indigo-600', badge: 'bg-indigo-100 text-indigo-700' },
}

const TYPES_CONTENU = {
  photo: { label: 'Photo', icon: Image },
  carousel: { label: 'Carousel', icon: LayoutGrid },
  reel: { label: 'Reel', icon: Film },
  video: { label: 'Vidéo', icon: Film },
  article: { label: 'Article', icon: BookOpen },
  story: { label: 'Story', icon: FileText },
  temoignage: { label: 'Témoignage', icon: Star },
}

const STATUTS = {
  brouillon: { label: 'Brouillon', cls: 'bg-slate-100 text-slate-600' },
  planifie:  { label: 'Planifié',  cls: 'bg-amber-100 text-amber-700' },
  publie:    { label: 'Publié',    cls: 'bg-emerald-100 text-emerald-700' },
}

const SWOT_CONFIG = [
  { key: 'forces',       label: 'Forces',       sub: 'Atouts internes',        bg: 'bg-emerald-50', border: 'border-emerald-200', icon: '💪' },
  { key: 'faiblesses',   label: 'Faiblesses',   sub: 'Points à améliorer',     bg: 'bg-rose-50',    border: 'border-rose-200',    icon: '⚠️' },
  { key: 'opportunites', label: 'Opportunités', sub: 'Facteurs externes favorables', bg: 'bg-blue-50', border: 'border-blue-200', icon: '🚀' },
  { key: 'menaces',      label: 'Menaces',      sub: 'Risques externes',        bg: 'bg-amber-50',   border: 'border-amber-200',   icon: '🛡️' },
]

const TABS = [
  { id: 'dashboard', label: 'Vue d\'ensemble', icon: LayoutDashboard },
  { id: 'strategie', label: 'Stratégie',       icon: Target },
  { id: 'personas',  label: 'Personas',        icon: Users },
  { id: 'contenu',   label: 'Contenu',         icon: CalendarDays },
  { id: 'stats',     label: 'Stats',           icon: BarChart2 },
  { id: 'veille',    label: 'Veille',          icon: Eye },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uid = () => `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function getPilierColor(piliers, pilierNom) {
  const idx = piliers.findIndex(p => p.nom === pilierNom)
  return idx >= 0 ? PILIER_COLORS[idx % PILIER_COLORS.length] : PILIER_COLORS[0]
}

function getWeekPosts(posts) {
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - now.getDay() + 1)
  monday.setHours(0,0,0,0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23,59,59,999)
  return posts.filter(p => {
    if (!p.datePublication) return false
    const d = new Date(p.datePublication)
    return d >= monday && d <= sunday
  })
}

// ─── Petit composant Badge ────────────────────────────────────────────────────

function Badge({ cls, children }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${cls}`}>{children}</span>
}

// ─── Modal publication ────────────────────────────────────────────────────────

function PostModal({ post, piliers, onClose, onSave }) {
  const EMPTY = { titre: '', contenu: '', plateforme: 'instagram', typeContenu: 'photo', statut: 'brouillon', pilier: '', datePublication: '', lienUrl: '', hashtags: [], notes: '', stats: { vues: 0, likes: 0, commentaires: 0, partages: 0, reach: 0 } }
  const [f, setF] = useState(post || EMPTY)
  const [hashInput, setHashInput] = useState('')
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const addHash = e => {
    if (e.key !== 'Enter' && e.key !== ',') return
    e.preventDefault()
    const t = hashInput.trim().replace(/^#/, '')
    if (t && !f.hashtags.includes(t)) set('hashtags', [...f.hashtags, t])
    setHashInput('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto border border-border">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-ink">{post ? 'Modifier le post' : 'Nouveau post'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-paper text-muted hover:text-ink transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="label-text mb-1 block">Titre *</label>
            <input value={f.titre} onChange={e => set('titre', e.target.value)} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text mb-1 block">Plateforme</label>
              <select value={f.plateforme} onChange={e => set('plateforme', e.target.value)} className="input-field">
                {Object.entries(PLATEFORMES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label-text mb-1 block">Type</label>
              <select value={f.typeContenu} onChange={e => set('typeContenu', e.target.value)} className="input-field">
                {Object.entries(TYPES_CONTENU).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text mb-1 block">Statut</label>
              <select value={f.statut} onChange={e => set('statut', e.target.value)} className="input-field">
                {Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label-text mb-1 block">Pilier</label>
              <select value={f.pilier || ''} onChange={e => set('pilier', e.target.value)} className="input-field">
                <option value="">— Aucun —</option>
                {piliers.map(p => <option key={p.id} value={p.nom}>{p.nom}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text mb-1 block">Date de publication</label>
              <input type="date" value={f.datePublication || ''} onChange={e => set('datePublication', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="label-text mb-1 block">URL du post</label>
              <input value={f.lienUrl || ''} onChange={e => set('lienUrl', e.target.value)} className="input-field" />
            </div>
          </div>
          <div>
            <label className="label-text mb-1 block">Caption</label>
            <textarea value={f.contenu || ''} onChange={e => set('contenu', e.target.value)} rows={3} className="input-field resize-none" />
          </div>
          <div>
            <label className="label-text mb-1 block">Hashtags</label>
            <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl border border-border min-h-[44px] bg-white">
              {f.hashtags.map(h => (
                <span key={h} className="flex items-center gap-1 px-2 py-0.5 bg-electric/10 text-electric text-xs rounded-full">
                  #{h}<button onClick={() => set('hashtags', f.hashtags.filter(x => x !== h))}><X className="w-3 h-3" /></button>
                </span>
              ))}
              <input value={hashInput} onChange={e => setHashInput(e.target.value)} onKeyDown={addHash}
                className="flex-1 min-w-[80px] text-sm text-ink bg-transparent focus:outline-none px-1" />
            </div>
          </div>
          {f.statut === 'publie' && (
            <div>
              <label className="label-text mb-2 block">Statistiques</label>
              <div className="grid grid-cols-5 gap-2">
                {[['vues','Vues'],['reach','Reach'],['likes','Likes'],['commentaires','Comm.'],['partages','Partages']].map(([k, l]) => (
                  <div key={k}>
                    <p className="text-[10px] text-muted mb-1">{l}</p>
                    <input type="number" min="0" value={f.stats?.[k] || 0}
                      onChange={e => set('stats', { ...f.stats, [k]: +e.target.value })}
                      className="w-full px-2 py-1.5 rounded-lg border border-border text-xs text-ink focus:outline-none focus:ring-2 focus:ring-electric/30" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <button onClick={onClose} className="btn-ghost">Annuler</button>
          <button onClick={() => { if (!f.titre.trim()) { toast.error('Titre requis'); return } onSave(f); onClose() }} className="btn-primary">
            <Check className="w-4 h-4" />{post ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Modal Persona ────────────────────────────────────────────────────────────

function PersonaModal({ persona, onClose, onSave }) {
  const EMPTY = { id: '', nom: '', emoji: '👤', age: '', poste: '', description: '', besoins: '', freins: '', plateformes: [], objectifMarketing: '' }
  const [f, setF] = useState(persona || { ...EMPTY, id: uid() })
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  const toggle = (plt) => set('plateformes', f.plateformes.includes(plt) ? f.plateformes.filter(x => x !== plt) : [...f.plateformes, plt])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-border">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-ink">{persona ? 'Modifier le persona' : 'Nouveau persona'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-paper text-muted hover:text-ink transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex gap-3">
            <div className="w-20">
              <label className="label-text mb-1 block">Emoji</label>
              <input value={f.emoji} onChange={e => set('emoji', e.target.value)} className="input-field text-2xl text-center" />
            </div>
            <div className="flex-1">
              <label className="label-text mb-1 block">Nom du persona *</label>
              <input value={f.nom} onChange={e => set('nom', e.target.value)} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text mb-1 block">Tranche d'âge</label>
              <input value={f.age} onChange={e => set('age', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="label-text mb-1 block">Profession / Statut</label>
              <input value={f.poste} onChange={e => set('poste', e.target.value)} className="input-field" />
            </div>
          </div>
          <div>
            <label className="label-text mb-1 block">Description</label>
            <textarea value={f.description} onChange={e => set('description', e.target.value)} rows={2} className="input-field resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text mb-1 block">Besoins</label>
              <textarea value={f.besoins} onChange={e => set('besoins', e.target.value)} rows={2} className="input-field resize-none" />
            </div>
            <div>
              <label className="label-text mb-1 block">Freins</label>
              <textarea value={f.freins} onChange={e => set('freins', e.target.value)} rows={2} className="input-field resize-none" />
            </div>
          </div>
          <div>
            <label className="label-text mb-2 block">Plateformes utilisées</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(PLATEFORMES).map(([k, v]) => (
                <button key={k} onClick={() => toggle(k)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${f.plateformes.includes(k) ? `${v.badge} border-transparent` : 'border-border text-muted hover:text-ink'}`}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label-text mb-1 block">Objectif marketing lié</label>
            <input value={f.objectifMarketing} onChange={e => set('objectifMarketing', e.target.value)} className="input-field" />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <button onClick={onClose} className="btn-ghost">Annuler</button>
          <button onClick={() => { if (!f.nom.trim()) { toast.error('Nom requis'); return } onSave(f); onClose() }} className="btn-primary">
            <Check className="w-4 h-4" />Enregistrer
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function MarketingPage() {
  const { marketingPosts, marketingConfig, addMarketingPost, updateMarketingPost, deleteMarketingPost, updateMarketingConfig } = useData()
  const { employe } = useAuth()

  const [tab, setTab] = useState('dashboard')
  const [postModal, setPostModal] = useState(null) // null | 'new' | post
  const [personaModal, setPersonaModal] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null) // { type, id }

  // ── Computed ────────────────────────────────────────────────────────────────

  const publies = useMemo(() => marketingPosts.filter(p => p.statut === 'publie'), [marketingPosts])
  const planifies = useMemo(() => marketingPosts.filter(p => p.statut === 'planifie'), [marketingPosts])
  const weekPosts = useMemo(() => getWeekPosts(marketingPosts), [marketingPosts])
  const totalReach = useMemo(() => publies.reduce((s, p) => s + (p.stats?.reach || 0), 0), [publies])
  const totalLikes = useMemo(() => publies.reduce((s, p) => s + (p.stats?.likes || 0), 0), [publies])

  // Répartition réelle des posts par pilier
  const pilierStats = useMemo(() => {
    const total = marketingPosts.length
    return (marketingConfig.piliers || []).map((pil, idx) => {
      const count = marketingPosts.filter(p => p.pilier === pil.nom).length
      const pct_reel = total > 0 ? Math.round((count / total) * 100) : 0
      return { ...pil, count, pct_reel, color: PILIER_COLORS[idx % PILIER_COLORS.length] }
    })
  }, [marketingPosts, marketingConfig.piliers])

  // Objectifs avec avancement
  const objectifsAvancement = useMemo(() => {
    return (marketingConfig.objectifs || []).map(obj => {
      const debut = Number(obj.valeurDebut) || 0
      const cible = Number(obj.valeurCible) || 100
      const actuel = Number(obj.valeurActuelle) || debut
      const pct = cible > debut ? Math.min(100, Math.round(((actuel - debut) / (cible - debut)) * 100)) : 0
      const echeance = obj.echeance ? new Date(obj.echeance) : null
      const joursRestants = echeance ? Math.ceil((echeance - new Date()) / 86400000) : null
      const retard = joursRestants !== null && joursRestants < 0
      const urgent = joursRestants !== null && joursRestants >= 0 && joursRestants <= 14
      return { ...obj, pct, joursRestants, retard, urgent }
    })
  }, [marketingConfig.objectifs])

  // ── Handlers config ─────────────────────────────────────────────────────────

  const saveSwot = (key, items) => {
    updateMarketingConfig({ swot: { ...marketingConfig.swot, [key]: items } })
  }

  const savePiliers = (piliers) => updateMarketingConfig({ piliers })
  const savePersonas = (personas) => updateMarketingConfig({ personas })
  const saveObjectifs = (objectifs) => updateMarketingConfig({ objectifs })
  const saveVeille = (veille) => updateMarketingConfig({ veille })

  // ── Handlers posts ──────────────────────────────────────────────────────────

  const handleSavePost = (form) => {
    if (postModal && postModal !== 'new') {
      updateMarketingPost(postModal.id, form)
      toast.success('Post mis à jour')
    } else {
      addMarketingPost({ ...form, createdById: employe?.id, createdByNom: employe?.nom })
      toast.success('Post créé')
    }
  }

  const handleDeleteConfirmed = () => {
    if (!confirmDelete) return
    if (confirmDelete.type === 'post') { deleteMarketingPost(confirmDelete.id); toast.success('Post supprimé') }
    if (confirmDelete.type === 'persona') savePersonas(marketingConfig.personas.filter(p => p.id !== confirmDelete.id))
    if (confirmDelete.type === 'pilier') savePiliers(marketingConfig.piliers.filter(p => p.id !== confirmDelete.id))
    if (confirmDelete.type === 'objectif') saveObjectifs(marketingConfig.objectifs.filter(o => o.id !== confirmDelete.id))
    if (confirmDelete.type === 'veille') saveVeille(marketingConfig.veille.filter(v => v.id !== confirmDelete.id))
    setConfirmDelete(null)
  }

  return (
    <div className="min-h-full bg-paper">
      {/* ── Header ── */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
              <Megaphone className="w-6 h-6 text-electric" />
              Marketing
            </h1>
            {marketingConfig.positionnement && (
              <p className="text-sm text-muted mt-0.5 italic">« {marketingConfig.positionnement} »</p>
            )}
          </div>
          <button onClick={() => setPostModal('new')}
            className="btn-primary">
            <Plus className="w-4 h-4" />Nouveau post
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-all ${
                tab === t.id
                  ? 'bg-ink text-white shadow-sm'
                  : 'text-muted hover:text-ink hover:bg-ink/5'
              }`}>
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-6 pb-8">
        <AnimatePresence mode="wait">

          {/* ══════════ VUE D'ENSEMBLE ══════════ */}
          {tab === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-5">

              {/* KPI cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Posts publiés',   value: publies.length,                icon: Check,      color: 'text-emerald-600 bg-emerald-50' },
                  { label: 'Planifiés',        value: planifies.length,              icon: Clock,      color: 'text-amber-600 bg-amber-50' },
                  { label: 'Reach total',      value: totalReach.toLocaleString('fr'), icon: TrendingUp, color: 'text-electric bg-electric/10' },
                  { label: 'Likes cumulés',    value: totalLikes.toLocaleString('fr'), icon: Heart,    color: 'text-rose-600 bg-rose-50' },
                ].map(k => (
                  <div key={k.label} className="bg-white border border-border rounded-2xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <p className="text-xs text-muted uppercase tracking-wide font-medium">{k.label}</p>
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${k.color}`}>
                        <k.icon className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-ink">{k.value}</p>
                  </div>
                ))}
              </div>

              {/* Objectifs + posts semaine */}
              <div className="grid lg:grid-cols-2 gap-5">
                {/* Objectifs */}
                <div className="bg-white border border-border rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-ink text-sm">Objectifs en cours</h3>
                    <button onClick={() => setTab('strategie')} className="text-xs text-electric hover:underline">Gérer</button>
                  </div>
                  {objectifsAvancement.length === 0 ? (
                    <div className="py-8 text-center">
                      <Target className="w-8 h-8 text-muted mx-auto mb-2 opacity-40" />
                      <p className="text-sm text-muted">Aucun objectif défini</p>
                      <button onClick={() => setTab('strategie')} className="mt-3 text-xs text-electric hover:underline">Ajouter un objectif</button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {objectifsAvancement.slice(0, 4).map(obj => (
                        <div key={obj.id}>
                          <div className="flex items-center justify-between text-sm mb-1.5">
                            <span className="text-ink font-medium truncate">{obj.nom}</span>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {obj.retard && <span className="text-[10px] text-rose-600 font-medium">En retard</span>}
                              {obj.urgent && !obj.retard && <span className="text-[10px] text-amber-600 font-medium">{obj.joursRestants}j restants</span>}
                              <span className={`text-xs font-semibold ${obj.pct >= 80 ? 'text-emerald-600' : obj.pct >= 40 ? 'text-amber-600' : 'text-rose-600'}`}>{obj.pct}%</span>
                            </div>
                          </div>
                          <div className="h-2 bg-border rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${obj.pct >= 80 ? 'bg-emerald-500' : obj.pct >= 40 ? 'bg-amber-500' : 'bg-rose-500'}`}
                              style={{ width: `${obj.pct}%` }} />
                          </div>
                          <p className="text-[10px] text-muted mt-1">{obj.valeurActuelle || obj.valeurDebut} → {obj.valeurCible} {obj.unite}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Posts cette semaine */}
                <div className="bg-white border border-border rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-ink text-sm">Publications cette semaine</h3>
                    <button onClick={() => setTab('contenu')} className="text-xs text-electric hover:underline">Calendrier</button>
                  </div>
                  {weekPosts.length === 0 ? (
                    <div className="py-8 text-center">
                      <CalendarDays className="w-8 h-8 text-muted mx-auto mb-2 opacity-40" />
                      <p className="text-sm text-muted">Aucune publication cette semaine</p>
                      <button onClick={() => setPostModal('new')} className="mt-3 text-xs text-electric hover:underline">Planifier un post</button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {weekPosts.map(p => {
                        const plt = PLATEFORMES[p.plateforme]
                        const st = STATUTS[p.statut]
                        return (
                          <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-paper transition-colors group">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${plt?.dot || 'bg-muted'}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-ink font-medium truncate">{p.titre}</p>
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
              {(() => {
                const alerts = []
                const negliges = pilierStats.filter(p => p.pct_reel < (p.pctVise || 10) - 10)
                if (negliges.length > 0) alerts.push({ type: 'warning', msg: `Pilier négligé : ${negliges.map(p => p.nom).join(', ')}` })
                const enRetard = objectifsAvancement.filter(o => o.retard)
                if (enRetard.length > 0) alerts.push({ type: 'danger', msg: `Objectif${enRetard.length > 1 ? 's' : ''} en retard : ${enRetard.map(o => o.nom).join(', ')}` })
                if (alerts.length === 0) return null
                return (
                  <div className="space-y-2">
                    {alerts.map((a, i) => (
                      <div key={i} className={`flex items-start gap-3 p-3.5 rounded-xl border ${a.type === 'danger' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <p className="text-sm font-medium">{a.msg}</p>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </motion.div>
          )}

          {/* ══════════ STRATÉGIE ══════════ */}
          {tab === 'strategie' && (
            <motion.div key="strategie" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-5">

              {/* Positionnement + message */}
              <div className="bg-white border border-border rounded-2xl p-5">
                <h3 className="font-semibold text-ink mb-4">Identité de marque</h3>
                <div className="grid lg:grid-cols-2 gap-4">
                  <EditableField label="Positionnement" value={marketingConfig.positionnement}
                    onSave={v => updateMarketingConfig({ positionnement: v })}
                    placeholder="Notre agence est la référence pour…" multiline />
                  <EditableField label="Message clé" value={marketingConfig.messageCle}
                    onSave={v => updateMarketingConfig({ messageCle: v })}
                    placeholder="Ce que chaque publication doit transmettre…" multiline />
                </div>
                <div className="mt-4">
                  <label className="label-text mb-2 block">Ton éditorial</label>
                  <TonEditor value={marketingConfig.ton} onChange={v => updateMarketingConfig({ ton: v })} />
                </div>
              </div>

              {/* SWOT */}
              <div className="bg-white border border-border rounded-2xl p-5">
                <h3 className="font-semibold text-ink mb-4">Analyse SWOT</h3>
                <div className="grid grid-cols-2 gap-3">
                  {SWOT_CONFIG.map(q => (
                    <SwotQuadrant key={q.key} config={q}
                      items={marketingConfig.swot?.[q.key] || []}
                      onChange={items => saveSwot(q.key, items)} />
                  ))}
                </div>
              </div>

              {/* Charte couleurs */}
              <div className="bg-white border border-border rounded-2xl p-5">
                <h3 className="font-semibold text-ink mb-4">Charte graphique</h3>
                <CharteEditor charte={marketingConfig.charte} onChange={c => updateMarketingConfig({ charte: c })} />
              </div>

              {/* Objectifs */}
              <div className="bg-white border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-ink">Objectifs marketing</h3>
                  <button onClick={() => {
                    const obj = { id: uid(), nom: '', valeurDebut: 0, valeurActuelle: 0, valeurCible: 100, unite: '', echeance: '' }
                    saveObjectifs([...marketingConfig.objectifs, obj])
                  }} className="btn-ghost text-xs py-1.5">
                    <Plus className="w-3.5 h-3.5" />Ajouter
                  </button>
                </div>
                {marketingConfig.objectifs.length === 0 ? (
                  <p className="text-sm text-muted py-4 text-center">Aucun objectif. Ajoutez un objectif SMART pour mesurer vos progrès.</p>
                ) : (
                  <div className="space-y-3">
                    {objectifsAvancement.map(obj => (
                      <ObjectifRow key={obj.id} obj={obj}
                        onChange={data => saveObjectifs(marketingConfig.objectifs.map(o => o.id === obj.id ? { ...o, ...data } : o))}
                        onDelete={() => setConfirmDelete({ type: 'objectif', id: obj.id })} />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ══════════ PERSONAS ══════════ */}
          {tab === 'personas' && (
            <motion.div key="personas" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted">Vos audiences cibles. Un persona par profil client type.</p>
                <button onClick={() => setPersonaModal('new')} className="btn-primary text-xs py-2">
                  <Plus className="w-3.5 h-3.5" />Nouveau persona
                </button>
              </div>
              {marketingConfig.personas.length === 0 ? (
                <div className="bg-white border border-border rounded-2xl py-16 text-center">
                  <Users className="w-12 h-12 text-muted mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium text-ink mb-1">Aucun persona défini</p>
                  <p className="text-xs text-muted mb-4">Créez des profils d'audience pour cibler votre contenu</p>
                  <button onClick={() => setPersonaModal('new')} className="btn-primary mx-auto text-xs py-2">
                    <Plus className="w-3.5 h-3.5" />Créer le premier persona
                  </button>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {marketingConfig.personas.map((persona, idx) => (
                    <PersonaCard key={persona.id} persona={persona} idx={idx}
                      onEdit={() => setPersonaModal(persona)}
                      onDelete={() => setConfirmDelete({ type: 'persona', id: persona.id })} />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ══════════ CONTENU ══════════ */}
          {tab === 'contenu' && (
            <ContenusTab
              marketingPosts={marketingPosts}
              piliers={marketingConfig.piliers}
              pilierStats={pilierStats}
              onAddPilier={() => {
                const p = { id: uid(), nom: 'Nouveau pilier', pctVise: 20 }
                savePiliers([...marketingConfig.piliers, p])
              }}
              onUpdatePilier={(id, data) => savePiliers(marketingConfig.piliers.map(p => p.id === id ? { ...p, ...data } : p))}
              onDeletePilier={id => setConfirmDelete({ type: 'pilier', id })}
              onNewPost={() => setPostModal('new')}
              onEditPost={p => setPostModal(p)}
              onDeletePost={id => setConfirmDelete({ type: 'post', id })}
            />
          )}

          {/* ══════════ STATS ══════════ */}
          {tab === 'stats' && (
            <StatsTab posts={marketingPosts} publies={publies} pilierStats={pilierStats} />
          )}

          {/* ══════════ VEILLE ══════════ */}
          {tab === 'veille' && (
            <VeilleTab
              veille={marketingConfig.veille}
              onAdd={() => {
                const v = { id: uid(), nom: '', plateforme: 'instagram', abonnes: '', frequence: '', notes: '', createdAt: new Date().toISOString() }
                saveVeille([...marketingConfig.veille, v])
              }}
              onUpdate={(id, data) => saveVeille(marketingConfig.veille.map(v => v.id === id ? { ...v, ...data } : v))}
              onDelete={id => setConfirmDelete({ type: 'veille', id })}
            />
          )}

        </AnimatePresence>
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {postModal && (
          <PostModal
            post={postModal !== 'new' ? postModal : null}
            piliers={marketingConfig.piliers}
            onClose={() => setPostModal(null)}
            onSave={handleSavePost}
          />
        )}
        {personaModal && (
          <PersonaModal
            persona={personaModal !== 'new' ? personaModal : null}
            onClose={() => setPersonaModal(null)}
            onSave={p => {
              const exists = marketingConfig.personas.find(x => x.id === p.id)
              savePersonas(exists ? marketingConfig.personas.map(x => x.id === p.id ? p : x) : [...marketingConfig.personas, p])
              toast.success(exists ? 'Persona mis à jour' : 'Persona créé')
            }}
          />
        )}
        {confirmDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && setConfirmDelete(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-border">
              <h3 className="font-semibold text-ink mb-2">Supprimer ?</h3>
              <p className="text-sm text-muted mb-5">Cette action est irréversible.</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setConfirmDelete(null)} className="btn-ghost">Annuler</button>
                <button onClick={handleDeleteConfirmed} className="px-4 py-2 text-sm font-medium bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-colors">Supprimer</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── EditableField ─────────────────────────────────────────────────────────────

function EditableField({ label, value, onSave, placeholder, multiline = false }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')
  if (editing) return (
    <div>
      <label className="label-text mb-1 block">{label}</label>
      {multiline
        ? <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={3} className="input-field resize-none" autoFocus />
        : <input value={draft} onChange={e => setDraft(e.target.value)} className="input-field" autoFocus />
      }
      <div className="flex gap-2 mt-2">
        <button onClick={() => { onSave(draft); setEditing(false) }} className="btn-primary text-xs py-1.5"><Check className="w-3.5 h-3.5" />Enregistrer</button>
        <button onClick={() => { setDraft(value || ''); setEditing(false) }} className="btn-ghost text-xs py-1.5">Annuler</button>
      </div>
    </div>
  )
  return (
    <div className="group cursor-pointer" onClick={() => { setDraft(value || ''); setEditing(true) }}>
      <label className="label-text mb-1 block cursor-pointer">{label}</label>
      <div className="flex items-start gap-2 p-3 rounded-xl border border-border hover:border-electric/50 transition-colors min-h-[52px]">
        <p className={`flex-1 text-sm ${value ? 'text-ink' : 'text-muted italic'}`}>{value || placeholder}</p>
        <Pencil className="w-3.5 h-3.5 text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
      </div>
    </div>
  )
}

// ─── TonEditor ────────────────────────────────────────────────────────────────

function TonEditor({ value = [], onChange }) {
  const [input, setInput] = useState('')
  const add = e => {
    if (e.key !== 'Enter' && e.key !== ',') return
    e.preventDefault()
    const t = input.trim()
    if (t && !value.includes(t)) onChange([...value, t])
    setInput('')
  }
  return (
    <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-border min-h-[48px]">
      {value.map(t => (
        <span key={t} className="flex items-center gap-1.5 px-3 py-1 bg-ink/5 text-ink text-xs font-medium rounded-full">
          {t}
          <button onClick={() => onChange(value.filter(x => x !== t))} className="hover:text-rose-500 transition-colors"><X className="w-3 h-3" /></button>
        </span>
      ))}
      <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={add}
        className="flex-1 min-w-[120px] text-sm text-ink bg-transparent focus:outline-none px-1" />
    </div>
  )
}

// ─── SwotQuadrant ─────────────────────────────────────────────────────────────

function SwotQuadrant({ config, items, onChange }) {
  const [newItem, setNewItem] = useState('')
  const add = () => {
    const t = newItem.trim()
    if (!t) return
    onChange([...items, t])
    setNewItem('')
  }
  return (
    <div className={`${config.bg} border ${config.border} rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{config.icon}</span>
        <div>
          <p className="font-semibold text-ink text-sm">{config.label}</p>
          <p className="text-xs text-muted">{config.sub}</p>
        </div>
      </div>
      <ul className="space-y-1 mb-3">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-ink group">
            <span className="text-muted mt-0.5">·</span>
            <span className="flex-1">{item}</span>
            <button onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="opacity-0 group-hover:opacity-100 text-muted hover:text-rose-500 transition-all flex-shrink-0">
              <X className="w-3 h-3" />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-1.5">
        <input value={newItem} onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-electric/30"
          placeholder="Ajouter…" />
        <button onClick={add} className="px-2.5 py-1.5 rounded-lg bg-ink text-white text-xs hover:bg-ink-soft transition-colors">
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

// ─── CharteEditor ─────────────────────────────────────────────────────────────

function CharteEditor({ charte, onChange }) {
  const couleurs = charte?.couleurs || []
  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {couleurs.map((c, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 group">
            <div className="w-12 h-12 rounded-xl border border-border shadow-sm cursor-pointer relative overflow-hidden"
              style={{ background: c.hex }}
              onClick={() => {
                const code = c.hex
                navigator.clipboard?.writeText(code).catch(() => {})
                toast.success(`${code} copié`)
              }}>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 transition-opacity">
                <Copy className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-[10px] font-medium text-ink">{c.nom}</p>
            <p className="text-[10px] text-muted font-mono">{c.hex}</p>
          </div>
        ))}
        <button onClick={() => {
          const hex = prompt('Code couleur hex (ex: #FF5733)')
          const nom = hex ? prompt('Nom de la couleur') : null
          if (hex && nom) onChange({ ...charte, couleurs: [...couleurs, { hex, nom }] })
        }}
          className="w-12 h-12 rounded-xl border-2 border-dashed border-border text-muted hover:border-electric hover:text-electric transition-colors flex items-center justify-center">
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ─── ObjectifRow ──────────────────────────────────────────────────────────────

function ObjectifRow({ obj, onChange, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(obj)
  const barColor = obj.pct >= 80 ? 'bg-emerald-500' : obj.pct >= 40 ? 'bg-amber-500' : 'bg-rose-500'

  if (editing) return (
    <div className="p-4 rounded-xl border border-electric/30 bg-electric/5 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-text mb-1 block">Nom de l'objectif</label>
          <input value={draft.nom} onChange={e => setDraft(d => ({ ...d, nom: e.target.value }))} className="input-field" />
        </div>
        <div>
          <label className="label-text mb-1 block">Unité (abonnés, posts…)</label>
          <input value={draft.unite || ''} onChange={e => setDraft(d => ({ ...d, unite: e.target.value }))} className="input-field" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label-text mb-1 block">Valeur départ</label>
          <input type="number" value={draft.valeurDebut} onChange={e => setDraft(d => ({ ...d, valeurDebut: +e.target.value }))} className="input-field" />
        </div>
        <div>
          <label className="label-text mb-1 block">Valeur actuelle</label>
          <input type="number" value={draft.valeurActuelle || 0} onChange={e => setDraft(d => ({ ...d, valeurActuelle: +e.target.value }))} className="input-field" />
        </div>
        <div>
          <label className="label-text mb-1 block">Cible</label>
          <input type="number" value={draft.valeurCible} onChange={e => setDraft(d => ({ ...d, valeurCible: +e.target.value }))} className="input-field" />
        </div>
      </div>
      <div>
        <label className="label-text mb-1 block">Échéance</label>
        <input type="date" value={draft.echeance || ''} onChange={e => setDraft(d => ({ ...d, echeance: e.target.value }))} className="input-field w-48" />
      </div>
      <div className="flex gap-2">
        <button onClick={() => { onChange(draft); setEditing(false) }} className="btn-primary text-xs py-1.5"><Check className="w-3.5 h-3.5" />Enregistrer</button>
        <button onClick={() => setEditing(false)} className="btn-ghost text-xs py-1.5">Annuler</button>
      </div>
    </div>
  )

  return (
    <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-paper transition-colors group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium text-ink">{obj.nom || '(sans nom)'}</span>
          <div className="flex items-center gap-2">
            {obj.retard && <span className="text-[10px] text-rose-600 font-medium">En retard</span>}
            <span className={`text-xs font-bold ${obj.pct >= 80 ? 'text-emerald-600' : obj.pct >= 40 ? 'text-amber-600' : 'text-rose-600'}`}>{obj.pct}%</span>
          </div>
        </div>
        <div className="h-1.5 bg-border rounded-full overflow-hidden mb-1">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${obj.pct}%` }} />
        </div>
        <p className="text-[10px] text-muted">{obj.valeurActuelle ?? obj.valeurDebut} / {obj.valeurCible} {obj.unite}{obj.echeance ? ` · ${fmtDate(obj.echeance)}` : ''}</p>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => { setDraft(obj); setEditing(true) }} className="p-1.5 rounded-lg hover:bg-ink/5 text-muted hover:text-ink"><Pencil className="w-3.5 h-3.5" /></button>
        <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-rose-50 text-muted hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  )
}

// ─── PersonaCard ──────────────────────────────────────────────────────────────

function PersonaCard({ persona, idx, onEdit, onDelete }) {
  const color = PILIER_COLORS[idx % PILIER_COLORS.length]
  return (
    <div className={`bg-white border border-border rounded-2xl overflow-hidden hover:shadow-md transition-shadow`}>
      <div className={`${color.bg} px-5 py-4 flex items-center gap-3`}>
        <div className={`w-12 h-12 rounded-xl ${color.bar} flex items-center justify-center text-2xl flex-shrink-0`}>
          {persona.emoji || '👤'}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm ${color.text}`}>{persona.nom}</p>
          {persona.poste && <p className="text-xs text-muted">{persona.poste}</p>}
          {persona.age && <p className="text-xs text-muted">{persona.age}</p>}
        </div>
      </div>
      <div className="px-5 py-4 space-y-3">
        {persona.description && <p className="text-xs text-muted leading-relaxed">{persona.description}</p>}
        {persona.besoins && (
          <div>
            <p className="text-[10px] font-medium text-muted uppercase tracking-wide mb-1">Besoins</p>
            <p className="text-xs text-ink">{persona.besoins}</p>
          </div>
        )}
        {persona.plateformes?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {persona.plateformes.map(p => (
              <span key={p} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${PLATEFORMES[p]?.badge || 'bg-slate-100 text-slate-600'}`}>
                {PLATEFORMES[p]?.label || p}
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <button onClick={onEdit} className="flex-1 btn-ghost text-xs py-1.5 justify-center"><Pencil className="w-3.5 h-3.5" />Modifier</button>
          <button onClick={onDelete} className="p-1.5 rounded-lg border border-border hover:bg-rose-50 hover:border-rose-200 text-muted hover:text-rose-500 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── ContenusTab ──────────────────────────────────────────────────────────────

function ContenusTab({ marketingPosts, piliers, pilierStats, onAddPilier, onUpdatePilier, onDeletePilier, onNewPost, onEditPost, onDeletePost }) {
  const [filterPlt, setFilterPlt] = useState('all')
  const [filterStatut, setFilterStatut] = useState('all')
  const [filterPilier, setFilterPilier] = useState('all')
  const [view, setView] = useState('liste') // liste | kanban

  const filtered = useMemo(() => {
    return marketingPosts.filter(p => {
      if (filterPlt !== 'all' && p.plateforme !== filterPlt) return false
      if (filterStatut !== 'all' && p.statut !== filterStatut) return false
      if (filterPilier !== 'all' && p.pilier !== filterPilier) return false
      return true
    }).sort((a, b) => {
      const da = a.datePublication || a.createdAt || ''
      const db = b.datePublication || b.createdAt || ''
      return db.localeCompare(da)
    })
  }, [marketingPosts, filterPlt, filterStatut, filterPilier])

  return (
    <div className="space-y-5">
      {/* Piliers */}
      <div className="bg-white border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-ink">Piliers éditoriaux</h3>
          <button onClick={onAddPilier} className="btn-ghost text-xs py-1.5">
            <Plus className="w-3.5 h-3.5" />Ajouter
          </button>
        </div>
        {piliers.length === 0 ? (
          <p className="text-sm text-muted text-center py-4">Définissez vos 3-5 piliers de contenu pour structurer votre stratégie éditoriale.</p>
        ) : (
          <div className="space-y-3">
            {pilierStats.map(pil => (
              <PilierRow key={pil.id} pil={pil}
                onChange={data => onUpdatePilier(pil.id, data)}
                onDelete={() => onDeletePilier(pil.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Posts */}
      <div className="bg-white border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="font-semibold text-ink">Publications</h3>
          <div className="flex items-center gap-2">
            {/* vue toggle */}
            <div className="flex bg-paper rounded-xl p-0.5">
              {[['liste','Liste'],['kanban','Kanban']].map(([v, l]) => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${view === v ? 'bg-white text-ink shadow-sm' : 'text-muted'}`}>{l}</button>
              ))}
            </div>
            <button onClick={onNewPost} className="btn-primary text-xs py-2">
              <Plus className="w-3.5 h-3.5" />Nouveau
            </button>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-2 mb-4">
          <select value={filterPlt} onChange={e => setFilterPlt(e.target.value)} className="text-xs px-3 py-1.5 rounded-xl border border-border bg-white text-ink focus:outline-none">
            <option value="all">Toutes les plateformes</option>
            {Object.entries(PLATEFORMES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)} className="text-xs px-3 py-1.5 rounded-xl border border-border bg-white text-ink focus:outline-none">
            <option value="all">Tous les statuts</option>
            {Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          {piliers.length > 0 && (
            <select value={filterPilier} onChange={e => setFilterPilier(e.target.value)} className="text-xs px-3 py-1.5 rounded-xl border border-border bg-white text-ink focus:outline-none">
              <option value="all">Tous les piliers</option>
              {piliers.map(p => <option key={p.id} value={p.nom}>{p.nom}</option>)}
            </select>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <CalendarDays className="w-10 h-10 text-muted mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium text-ink mb-1">{marketingPosts.length === 0 ? 'Aucun post créé' : 'Aucun résultat'}</p>
            <button onClick={onNewPost} className="btn-primary mx-auto text-xs py-2 mt-3">
              <Plus className="w-3.5 h-3.5" />Créer un post
            </button>
          </div>
        ) : view === 'kanban' ? (
          <KanbanView posts={filtered} piliers={piliers} onEdit={onEditPost} onDelete={onDeletePost} />
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(p => (
              <PostListRow key={p.id} post={p} piliers={piliers} onEdit={() => onEditPost(p)} onDelete={() => onDeletePost(p.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PilierRow({ pil, onChange, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ nom: pil.nom, pctVise: pil.pctVise })
  const c = pil.color || PILIER_COLORS[0]

  if (editing) return (
    <div className={`flex items-center gap-3 p-3 rounded-xl ${c.bg} border border-transparent`}>
      <input value={draft.nom} onChange={e => setDraft(d => ({ ...d, nom: e.target.value }))}
        className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-electric/30" />
      <div className="flex items-center gap-1.5">
        <input type="number" min="0" max="100" value={draft.pctVise} onChange={e => setDraft(d => ({ ...d, pctVise: +e.target.value }))}
          className="w-16 text-sm px-2 py-1.5 rounded-lg border border-border bg-white text-center focus:outline-none" />
        <span className="text-xs text-muted">% visé</span>
      </div>
      <button onClick={() => { onChange(draft); setEditing(false) }} className="p-1.5 rounded-lg bg-ink text-white"><Check className="w-3.5 h-3.5" /></button>
      <button onClick={() => setEditing(false)} className="p-1.5 rounded-lg border border-border text-muted hover:text-ink"><X className="w-3.5 h-3.5" /></button>
    </div>
  )

  return (
    <div className="flex items-center gap-4 group">
      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${c.bar}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className={`text-sm font-medium px-2.5 py-0.5 rounded-full ${c.bg} ${c.text}`}>{pil.nom}</span>
          <div className="flex items-center gap-2 text-xs text-muted">
            <span>{pil.pct_reel}% réel</span>
            <span>·</span>
            <span>{pil.pctVise || 0}% visé</span>
            <span>·</span>
            <span>{pil.count} post{pil.count !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className="h-1.5 bg-border rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${Math.min(100, pil.pct_reel)}%` }} />
        </div>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => { setDraft({ nom: pil.nom, pctVise: pil.pctVise }); setEditing(true) }} className="p-1.5 rounded-lg hover:bg-ink/5 text-muted hover:text-ink"><Pencil className="w-3.5 h-3.5" /></button>
        <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-rose-50 text-muted hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  )
}

function PostListRow({ post, piliers, onEdit, onDelete }) {
  const plt = PLATEFORMES[post.plateforme]
  const st = STATUTS[post.statut]
  const pc = post.pilier ? getPilierColor(piliers, post.pilier) : null

  return (
    <div className="flex items-start gap-4 py-3.5 hover:bg-paper/50 transition-colors group">
      <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${plt?.dot || 'bg-muted'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="font-medium text-sm text-ink">{post.titre || '(sans titre)'}</span>
          {plt && <Badge cls={plt.badge}>{plt.label}</Badge>}
          <Badge cls={st?.cls}>{st?.label}</Badge>
          {post.pilier && pc && <Badge cls={`${pc.bg} ${pc.text}`}>{post.pilier}</Badge>}
        </div>
        {post.contenu && <p className="text-xs text-muted line-clamp-1">{post.contenu}</p>}
        <div className="flex items-center gap-3 mt-1 text-xs text-muted">
          {post.datePublication && <span>{fmtDate(post.datePublication)}</span>}
          {post.statut === 'publie' && (post.stats?.likes || 0) > 0 && (
            <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{post.stats.likes.toLocaleString('fr')}</span>
          )}
        </div>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {post.lienUrl && <a href={post.lienUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-ink/5 text-muted hover:text-electric transition-colors"><ExternalLink className="w-3.5 h-3.5" /></a>}
        <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-ink/5 text-muted hover:text-ink"><Pencil className="w-3.5 h-3.5" /></button>
        <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-rose-50 text-muted hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  )
}

function KanbanView({ posts, piliers, onEdit, onDelete }) {
  const columns = [
    { key: 'brouillon', label: 'Brouillon', cls: 'bg-slate-50 border-slate-200' },
    { key: 'planifie',  label: 'Planifié',  cls: 'bg-amber-50 border-amber-200' },
    { key: 'publie',    label: 'Publié',    cls: 'bg-emerald-50 border-emerald-200' },
  ]
  return (
    <div className="grid grid-cols-3 gap-3">
      {columns.map(col => {
        const colPosts = posts.filter(p => p.statut === col.key)
        return (
          <div key={col.key} className={`${col.cls} border rounded-xl p-3`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-ink">{col.label}</p>
              <span className="text-xs text-muted bg-white px-1.5 py-0.5 rounded-full border border-border">{colPosts.length}</span>
            </div>
            <div className="space-y-2">
              {colPosts.map(p => {
                const plt = PLATEFORMES[p.plateforme]
                const pc = p.pilier ? getPilierColor(piliers, p.pilier) : null
                return (
                  <div key={p.id} className="bg-white border border-border rounded-xl p-3 group hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-xs font-medium text-ink leading-snug">{p.titre || '(sans titre)'}</p>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button onClick={() => onEdit(p)} className="p-1 rounded hover:bg-ink/5 text-muted hover:text-ink"><Pencil className="w-3 h-3" /></button>
                        <button onClick={() => onDelete(p.id)} className="p-1 rounded hover:bg-rose-50 text-muted hover:text-rose-500"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {plt && <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${plt.badge}`}>{plt.label}</span>}
                      {p.pilier && pc && <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${pc.bg} ${pc.text}`}>{p.pilier}</span>}
                    </div>
                    {p.datePublication && <p className="text-[10px] text-muted mt-1.5">{fmtDate(p.datePublication)}</p>}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── StatsTab ─────────────────────────────────────────────────────────────────

function StatsTab({ posts, publies, pilierStats }) {
  const totalReach = publies.reduce((s, p) => s + (p.stats?.reach || 0), 0)
  const totalLikes = publies.reduce((s, p) => s + (p.stats?.likes || 0), 0)
  const totalComm = publies.reduce((s, p) => s + (p.stats?.commentaires || 0), 0)
  const totalVues = publies.reduce((s, p) => s + (p.stats?.vues || 0), 0)

  const byPlt = Object.entries(PLATEFORMES).map(([k, v]) => {
    const pts = posts.filter(p => p.plateforme === k)
    const pub = pts.filter(p => p.statut === 'publie')
    const reach = pub.reduce((s, p) => s + (p.stats?.reach || 0), 0)
    return { key: k, label: v.label, dot: v.dot, badge: v.badge, total: pts.length, publies: pub.length, reach }
  }).filter(x => x.total > 0)

  const topPosts = [...publies].sort((a, b) => {
    const ea = (a.stats?.likes || 0) + (a.stats?.commentaires || 0) + (a.stats?.partages || 0)
    const eb = (b.stats?.likes || 0) + (b.stats?.commentaires || 0) + (b.stats?.partages || 0)
    return eb - ea
  }).slice(0, 5)

  return (
    <div className="space-y-5">
      {/* KPIs globaux */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Vues totales',  value: totalVues.toLocaleString('fr'),  icon: Eye,      color: 'text-blue-600 bg-blue-50' },
          { label: 'Reach total',   value: totalReach.toLocaleString('fr'), icon: TrendingUp,color: 'text-electric bg-electric/10' },
          { label: 'Likes cumulés', value: totalLikes.toLocaleString('fr'), icon: Heart,    color: 'text-rose-600 bg-rose-50' },
          { label: 'Commentaires',  value: totalComm.toLocaleString('fr'),  icon: MessageCircle, color: 'text-violet-600 bg-violet-50' },
        ].map(k => (
          <div key={k.label} className="bg-white border border-border rounded-2xl p-4">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs text-muted uppercase tracking-wide font-medium">{k.label}</p>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${k.color}`}><k.icon className="w-4 h-4" /></div>
            </div>
            <p className="text-2xl font-bold text-ink">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Par plateforme */}
        <div className="bg-white border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-ink mb-4 text-sm">Par plateforme</h3>
          {byPlt.length === 0 ? (
            <p className="text-sm text-muted py-6 text-center">Aucune donnée</p>
          ) : (
            <div className="space-y-3">
              {byPlt.map(p => (
                <div key={p.key} className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${p.dot}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-ink font-medium">{p.label}</span>
                      <span className="text-muted">{p.publies} publiés · reach {p.reach.toLocaleString('fr')}</span>
                    </div>
                    <div className="h-1.5 bg-border rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${p.dot}`} style={{ width: `${posts.length > 0 ? Math.round((p.total / posts.length) * 100) : 0}%` }} />
                    </div>
                  </div>
                  <span className="text-xs font-medium text-ink w-6 text-right">{p.total}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top posts */}
        <div className="bg-white border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-ink mb-4 text-sm">Meilleures publications</h3>
          {topPosts.length === 0 ? (
            <p className="text-sm text-muted py-6 text-center">Aucun post publié avec des stats</p>
          ) : (
            <div className="space-y-3">
              {topPosts.map((p, i) => {
                const plt = PLATEFORMES[p.plateforme]
                const eng = (p.stats?.likes || 0) + (p.stats?.commentaires || 0) + (p.stats?.partages || 0)
                return (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted w-4 flex-shrink-0">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{p.titre}</p>
                      <div className="flex items-center gap-2 text-xs text-muted">
                        {plt && <span className={`${plt.badge} px-1.5 py-0.5 rounded-full text-[10px] font-medium`}>{plt.label}</span>}
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{p.stats?.likes || 0}</span>
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{p.stats?.vues || 0}</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-ink flex-shrink-0">{eng.toLocaleString('fr')}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Par pilier */}
      {pilierStats.length > 0 && (
        <div className="bg-white border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-ink mb-4 text-sm">Répartition par pilier</h3>
          <div className="space-y-3">
            {pilierStats.map(pil => (
              <div key={pil.id} className="flex items-center gap-4">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${pil.color.bg} ${pil.color.text} min-w-[100px] text-center`}>{pil.nom}</span>
                <div className="flex-1">
                  <div className="h-2 bg-border rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${pil.color.bar}`} style={{ width: `${pil.pct_reel}%` }} />
                  </div>
                </div>
                <div className="text-xs text-muted w-28 text-right">
                  <span className="font-medium text-ink">{pil.pct_reel}%</span> réel · <span>{pil.pctVise || 0}%</span> visé
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── VeilleTab ────────────────────────────────────────────────────────────────

function VeilleTab({ veille, onAdd, onUpdate, onDelete }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">Suivez vos concurrents et sources d'inspiration.</p>
        <button onClick={onAdd} className="btn-primary text-xs py-2">
          <Plus className="w-3.5 h-3.5" />Ajouter un concurrent
        </button>
      </div>
      {veille.length === 0 ? (
        <div className="bg-white border border-border rounded-2xl py-16 text-center">
          <Eye className="w-12 h-12 text-muted mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium text-ink mb-1">Aucun concurrent suivi</p>
          <p className="text-xs text-muted mb-4">Ajoutez des comptes concurrents pour benchmarker votre stratégie</p>
          <button onClick={onAdd} className="btn-primary mx-auto text-xs py-2"><Plus className="w-3.5 h-3.5" />Ajouter</button>
        </div>
      ) : (
        <div className="bg-white border border-border rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[1fr_120px_100px_120px_1fr_40px] gap-3 px-4 py-3 text-[10px] font-semibold text-muted uppercase tracking-wide border-b border-border">
            <span>Compte</span><span>Plateforme</span><span>Abonnés</span><span>Fréquence</span><span>Notes</span><span />
          </div>
          {veille.map(v => (
            <VeilleRow key={v.id} v={v} onChange={data => onUpdate(v.id, data)} onDelete={() => onDelete(v.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function VeilleRow({ v, onChange, onDelete }) {
  return (
    <div className="grid grid-cols-[1fr_120px_100px_120px_1fr_40px] gap-3 items-center px-4 py-3 border-b border-border last:border-0 hover:bg-paper/50 transition-colors group">
      <input value={v.nom || ''} onChange={e => onChange({ nom: e.target.value })}
        className="text-sm text-ink bg-transparent focus:outline-none focus:bg-white focus:ring-2 focus:ring-electric/30 rounded-lg px-2 py-1 -mx-2 transition-all" />
      <select value={v.plateforme || 'instagram'} onChange={e => onChange({ plateforme: e.target.value })}
        className="text-xs px-2 py-1.5 rounded-lg border border-border bg-white focus:outline-none">
        {Object.entries(PLATEFORMES).map(([k, val]) => <option key={k} value={k}>{val.label}</option>)}
      </select>
      <input value={v.abonnes || ''} onChange={e => onChange({ abonnes: e.target.value })}
        className="text-sm text-ink bg-transparent focus:outline-none focus:bg-white focus:ring-2 focus:ring-electric/30 rounded-lg px-2 py-1 -mx-2 transition-all" />
      <input value={v.frequence || ''} onChange={e => onChange({ frequence: e.target.value })}
        className="text-sm text-ink bg-transparent focus:outline-none focus:bg-white focus:ring-2 focus:ring-electric/30 rounded-lg px-2 py-1 -mx-2 transition-all" />
      <input value={v.notes || ''} onChange={e => onChange({ notes: e.target.value })}
        className="text-sm text-muted bg-transparent focus:outline-none focus:bg-white focus:ring-2 focus:ring-electric/30 rounded-lg px-2 py-1 -mx-2 transition-all" />
      <button onClick={onDelete} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-rose-50 text-muted hover:text-rose-500 transition-all">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
