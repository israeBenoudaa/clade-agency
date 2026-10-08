import { useState, useMemo } from 'react'
import {
  Plus, Instagram, Linkedin, Youtube, Search, Filter,
  Pencil, Trash2, ExternalLink, CalendarDays, BarChart2,
  TrendingUp, Eye, Heart, MessageCircle, Share2, X, Check,
  Image, Film, LayoutGrid, BookOpen, Mic, Star, ChevronDown,
  Hash, FileText, Globe,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'

// ─── configs ────────────────────────────────────────────────────────────────

const PLATEFORMES = {
  instagram:  { label: 'Instagram',  color: 'bg-pink-100 text-pink-700',     dot: 'bg-pink-500' },
  linkedin:   { label: 'LinkedIn',   color: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-600' },
  pinterest:  { label: 'Pinterest',  color: 'bg-red-100 text-red-700',       dot: 'bg-red-500' },
  youtube:    { label: 'YouTube',    color: 'bg-rose-100 text-rose-700',     dot: 'bg-rose-600' },
  facebook:   { label: 'Facebook',   color: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-600' },
}

const TYPES_CONTENU = {
  photo:       { label: 'Photo',       icon: Image },
  carousel:    { label: 'Carousel',    icon: LayoutGrid },
  reel:        { label: 'Reel / Short',icon: Film },
  video:       { label: 'Vidéo',       icon: Film },
  article:     { label: 'Article',     icon: BookOpen },
  story:       { label: 'Story',       icon: FileText },
  temoignage:  { label: 'Témoignage',  icon: Star },
}

const CATEGORIES = {
  projet:        'Projet réalisé',
  avant_apres:   'Avant / Après',
  equipe:        'Équipe & Coulisses',
  conseil_archi: 'Conseil architecture',
  actu_agence:   'Actualité agence',
  testimonial:   'Témoignage client',
}

const STATUTS = {
  brouillon: { label: 'Brouillon',   cls: 'bg-slate-100 text-slate-600' },
  planifie:  { label: 'Planifié',    cls: 'bg-amber-100 text-amber-700' },
  publie:    { label: 'Publié',      cls: 'bg-emerald-100 text-emerald-700' },
}

const EMPTY_POST = {
  titre: '', contenu: '', plateforme: 'instagram', typeContenu: 'photo',
  statut: 'brouillon', categorie: 'projet', datePublication: '', lienUrl: '',
  hashtags: [], notes: '', stats: { vues: 0, likes: 0, commentaires: 0, partages: 0, reach: 0 },
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function totalEngagement(stats = {}) {
  return (stats.likes || 0) + (stats.commentaires || 0) + (stats.partages || 0)
}

// ─── Post Modal ───────────────────────────────────────────────────────────────

function PostModal({ post, onClose, onSave }) {
  const [form, setForm] = useState(post || EMPTY_POST)
  const [hashInput, setHashInput] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const addHash = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const tag = hashInput.trim().replace(/^#/, '')
      if (tag && !form.hashtags.includes(tag)) set('hashtags', [...form.hashtags, tag])
      setHashInput('')
    }
  }

  const removeHash = (tag) => set('hashtags', form.hashtags.filter(h => h !== tag))

  const handleSave = () => {
    if (!form.titre.trim()) { toast.error('Titre requis'); return }
    if (!form.plateforme) { toast.error('Plateforme requise'); return }
    onSave(form)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-surface rounded-t-2xl">
          <h2 className="font-semibold text-ink text-lg">{post ? 'Modifier le post' : 'Nouveau post'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/20 transition-colors"><X className="w-4 h-4 text-muted" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Titre */}
          <div>
            <label className="text-xs font-medium text-muted uppercase tracking-wide mb-1 block">Titre *</label>
            <input value={form.titre} onChange={e => set('titre', e.target.value)} placeholder="Titre du post..."
              className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-electric/30" />
          </div>

          {/* Plateforme + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted uppercase tracking-wide mb-1 block">Plateforme *</label>
              <select value={form.plateforme} onChange={e => set('plateforme', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-electric/30">
                {Object.entries(PLATEFORMES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted uppercase tracking-wide mb-1 block">Type de contenu</label>
              <select value={form.typeContenu} onChange={e => set('typeContenu', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-electric/30">
                {Object.entries(TYPES_CONTENU).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>

          {/* Statut + Catégorie */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted uppercase tracking-wide mb-1 block">Statut</label>
              <select value={form.statut} onChange={e => set('statut', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-electric/30">
                {Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted uppercase tracking-wide mb-1 block">Catégorie</label>
              <select value={form.categorie} onChange={e => set('categorie', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-electric/30">
                {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          {/* Date + Lien */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted uppercase tracking-wide mb-1 block">Date de publication</label>
              <input type="date" value={form.datePublication || ''} onChange={e => set('datePublication', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-electric/30" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted uppercase tracking-wide mb-1 block">Lien URL</label>
              <input value={form.lienUrl || ''} onChange={e => set('lienUrl', e.target.value)} placeholder="https://..."
                className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-electric/30" />
            </div>
          </div>

          {/* Contenu */}
          <div>
            <label className="text-xs font-medium text-muted uppercase tracking-wide mb-1 block">Contenu / Caption</label>
            <textarea value={form.contenu || ''} onChange={e => set('contenu', e.target.value)}
              rows={4} placeholder="Texte du post..."
              className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm text-ink resize-none focus:outline-none focus:ring-2 focus:ring-electric/30" />
          </div>

          {/* Hashtags */}
          <div>
            <label className="text-xs font-medium text-muted uppercase tracking-wide mb-1 block">Hashtags</label>
            <div className="flex flex-wrap gap-1.5 p-2 rounded-xl border border-border min-h-[44px]">
              {form.hashtags.map(h => (
                <span key={h} className="flex items-center gap-1 px-2 py-0.5 bg-electric/10 text-electric text-xs rounded-full">
                  #{h}
                  <button onClick={() => removeHash(h)} className="hover:text-rose-500 transition-colors"><X className="w-3 h-3" /></button>
                </span>
              ))}
              <input value={hashInput} onChange={e => setHashInput(e.target.value)} onKeyDown={addHash}
                placeholder="Taper puis Entrée..."
                className="flex-1 min-w-[100px] text-sm text-ink bg-transparent focus:outline-none px-1" />
            </div>
          </div>

          {/* Stats (si publié) */}
          {form.statut === 'publie' && (
            <div>
              <label className="text-xs font-medium text-muted uppercase tracking-wide mb-2 block">Statistiques</label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { k: 'vues', label: 'Vues' },
                  { k: 'reach', label: 'Reach' },
                  { k: 'likes', label: 'Likes' },
                  { k: 'commentaires', label: 'Commentaires' },
                  { k: 'partages', label: 'Partages' },
                ].map(({ k, label }) => (
                  <div key={k}>
                    <label className="text-[10px] text-muted block mb-1">{label}</label>
                    <input type="number" min="0"
                      value={form.stats?.[k] || 0}
                      onChange={e => set('stats', { ...form.stats, [k]: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 rounded-lg border border-border bg-surface text-xs text-ink focus:outline-none focus:ring-2 focus:ring-electric/30" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-muted uppercase tracking-wide mb-1 block">Notes internes</label>
            <textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)}
              rows={2} placeholder="Notes visibles uniquement en interne..."
              className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm text-ink resize-none focus:outline-none focus:ring-2 focus:ring-electric/30" />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-sm text-muted hover:text-ink rounded-xl hover:bg-muted/10 transition-colors">Annuler</button>
          <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-electric text-white rounded-xl hover:bg-electric/90 transition-colors">
            <Check className="w-4 h-4" />
            {post ? 'Enregistrer' : 'Créer le post'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MarketingPage() {
  const { marketingPosts, addMarketingPost, updateMarketingPost, deleteMarketingPost } = useData()
  const { employe } = useAuth()

  const [tab, setTab] = useState('dashboard')
  const [filterPlateforme, setFilterPlateforme] = useState('all')
  const [filterStatut, setFilterStatut] = useState('all')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editPost, setEditPost] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  // ── computed ────────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return marketingPosts.filter(p => {
      if (filterPlateforme !== 'all' && p.plateforme !== filterPlateforme) return false
      if (filterStatut !== 'all' && p.statut !== filterStatut) return false
      if (search) {
        const q = search.toLowerCase()
        if (!(p.titre || '').toLowerCase().includes(q) && !(p.contenu || '').toLowerCase().includes(q)) return false
      }
      return true
    }).sort((a, b) => {
      const da = a.datePublication || a.createdAt || ''
      const db = b.datePublication || b.createdAt || ''
      return db.localeCompare(da)
    })
  }, [marketingPosts, filterPlateforme, filterStatut, search])

  const stats = useMemo(() => {
    const publies = marketingPosts.filter(p => p.statut === 'publie')
    const totalLikes = publies.reduce((s, p) => s + (p.stats?.likes || 0), 0)
    const totalVues = publies.reduce((s, p) => s + (p.stats?.vues || 0), 0)
    const totalReach = publies.reduce((s, p) => s + (p.stats?.reach || 0), 0)
    const byPlateforme = {}
    for (const p of marketingPosts) {
      if (!byPlateforme[p.plateforme]) byPlateforme[p.plateforme] = { total: 0, publies: 0 }
      byPlateforme[p.plateforme].total++
      if (p.statut === 'publie') byPlateforme[p.plateforme].publies++
    }
    return { total: marketingPosts.length, publies: publies.length, planifies: marketingPosts.filter(p => p.statut === 'planifie').length, brouillons: marketingPosts.filter(p => p.statut === 'brouillon').length, totalLikes, totalVues, totalReach, byPlateforme }
  }, [marketingPosts])

  // ── handlers ───────────────────────────────────────────────────────────────

  const handleSave = (form) => {
    if (editPost) {
      updateMarketingPost(editPost.id, form)
      toast.success('Post mis à jour')
    } else {
      addMarketingPost({ ...form, createdById: employe?.id, createdByNom: employe?.nom || 'Inconnu' })
      toast.success('Post créé')
    }
    setEditPost(null)
  }

  const handleDelete = (id) => {
    deleteMarketingPost(id)
    toast.success('Post supprimé')
    setConfirmDelete(null)
  }

  const openEdit = (post) => { setEditPost(post); setShowModal(true) }
  const openNew = () => { setEditPost(null); setShowModal(true) }

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Marketing</h1>
          <p className="text-sm text-muted mt-0.5">Gestion du contenu et des réseaux sociaux</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-electric text-white text-sm font-medium rounded-xl hover:bg-electric/90 transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          Nouveau post
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted/10 rounded-xl w-fit">
        {[
          { id: 'dashboard', label: 'Tableau de bord', icon: BarChart2 },
          { id: 'posts', label: 'Tous les posts', icon: CalendarDays },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${tab === t.id ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'}`}>
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Dashboard Tab ── */}
      <AnimatePresence mode="wait">
        {tab === 'dashboard' && (
          <motion.div key="dashboard" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total posts', value: stats.total, sub: 'dans la base', icon: FileText, color: 'text-blue-600 bg-blue-50' },
                { label: 'Publiés', value: stats.publies, sub: 'sur les réseaux', icon: Check, color: 'text-emerald-600 bg-emerald-50' },
                { label: 'Planifiés', value: stats.planifies, sub: 'à venir', icon: CalendarDays, color: 'text-amber-600 bg-amber-50' },
                { label: 'Reach total', value: stats.totalReach.toLocaleString('fr-FR'), sub: 'impressions cumulées', icon: TrendingUp, color: 'text-purple-600 bg-purple-50' },
              ].map(k => (
                <div key={k.label} className="bg-surface border border-border rounded-2xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-xs text-muted uppercase tracking-wide font-medium">{k.label}</p>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${k.color}`}>
                      <k.icon className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-ink">{k.value}</p>
                  <p className="text-xs text-muted mt-0.5">{k.sub}</p>
                </div>
              ))}
            </div>

            {/* Stats par plateforme */}
            <div className="bg-surface border border-border rounded-2xl p-5">
              <h3 className="font-semibold text-ink mb-4">Posts par plateforme</h3>
              {Object.keys(PLATEFORMES).length === 0 || stats.total === 0 ? (
                <p className="text-sm text-muted py-8 text-center">Aucun post créé pour l'instant</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(PLATEFORMES).map(([key, cfg]) => {
                    const d = stats.byPlateforme[key] || { total: 0, publies: 0 }
                    if (!d.total) return null
                    const pct = stats.total > 0 ? Math.round((d.total / stats.total) * 100) : 0
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                            <span className="text-ink font-medium">{cfg.label}</span>
                          </div>
                          <span className="text-muted">{d.total} post{d.total > 1 ? 's' : ''} · {d.publies} publié{d.publies > 1 ? 's' : ''}</span>
                        </div>
                        <div className="h-2 bg-muted/15 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${cfg.dot}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  }).filter(Boolean)}
                </div>
              )}
            </div>

            {/* Posts récents */}
            <div className="bg-surface border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-ink">Posts récents</h3>
                <button onClick={() => setTab('posts')} className="text-xs text-electric hover:underline">Voir tout</button>
              </div>
              {marketingPosts.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-muted/10 flex items-center justify-center mx-auto mb-3">
                    <Hash className="w-6 h-6 text-muted" />
                  </div>
                  <p className="text-sm font-medium text-ink mb-1">Aucun post</p>
                  <p className="text-xs text-muted mb-4">Commencez par créer votre premier post</p>
                  <button onClick={openNew} className="inline-flex items-center gap-2 px-4 py-2 bg-electric text-white text-sm font-medium rounded-xl hover:bg-electric/90 transition-colors">
                    <Plus className="w-4 h-4" />Nouveau post
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {marketingPosts.slice(0, 5).map(post => <PostRow key={post.id} post={post} onEdit={() => openEdit(post)} onDelete={() => setConfirmDelete(post.id)} />)}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Posts Tab ── */}
        {tab === 'posts' && (
          <motion.div key="posts" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-electric/30" />
              </div>
              <select value={filterPlateforme} onChange={e => setFilterPlateforme(e.target.value)}
                className="px-3 py-2 rounded-xl border border-border bg-surface text-sm text-ink focus:outline-none">
                <option value="all">Toutes les plateformes</option>
                {Object.entries(PLATEFORMES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
                className="px-3 py-2 rounded-xl border border-border bg-surface text-sm text-ink focus:outline-none">
                <option value="all">Tous les statuts</option>
                {Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>

            {/* List */}
            {filtered.length === 0 ? (
              <div className="bg-surface border border-border rounded-2xl py-16 text-center">
                <Hash className="w-10 h-10 text-muted mx-auto mb-3" />
                <p className="text-sm font-medium text-ink mb-1">
                  {marketingPosts.length === 0 ? 'Aucun post créé' : 'Aucun résultat'}
                </p>
                <p className="text-xs text-muted">
                  {marketingPosts.length === 0 ? 'Créez votre premier post pour commencer' : 'Modifiez les filtres'}
                </p>
              </div>
            ) : (
              <div className="bg-surface border border-border rounded-2xl overflow-hidden">
                <div className="divide-y divide-border">
                  {filtered.map(post => (
                    <PostRow key={post.id} post={post} onEdit={() => openEdit(post)} onDelete={() => setConfirmDelete(post.id)} detailed />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modals ── */}
      <AnimatePresence>
        {showModal && (
          <PostModal post={editPost} onClose={() => { setShowModal(false); setEditPost(null) }} onSave={handleSave} />
        )}
        {confirmDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && setConfirmDelete(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-surface rounded-2xl shadow-2xl p-6 w-full max-w-sm">
              <h3 className="font-semibold text-ink mb-2">Supprimer ce post ?</h3>
              <p className="text-sm text-muted mb-5">Cette action est irréversible.</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm text-muted hover:text-ink rounded-xl hover:bg-muted/10 transition-colors">Annuler</button>
                <button onClick={() => handleDelete(confirmDelete)} className="px-4 py-2 text-sm font-medium bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-colors">Supprimer</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── PostRow ──────────────────────────────────────────────────────────────────

function PostRow({ post, onEdit, onDelete, detailed = false }) {
  const plt = PLATEFORMES[post.plateforme] || { label: post.plateforme, color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' }
  const st = STATUTS[post.statut] || STATUTS.brouillon
  const tc = TYPES_CONTENU[post.typeContenu]
  const eng = totalEngagement(post.stats)

  return (
    <div className={`flex items-start gap-4 px-5 py-4 hover:bg-muted/5 transition-colors group ${detailed ? '' : 'rounded-xl'}`}>
      <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${plt.dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="font-medium text-sm text-ink truncate max-w-[300px]">{post.titre || '(sans titre)'}</span>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${plt.color}`}>{plt.label}</span>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
          {tc && <span className="text-[10px] text-muted">{tc.label}</span>}
        </div>
        {detailed && post.contenu && (
          <p className="text-xs text-muted line-clamp-2 mt-1">{post.contenu}</p>
        )}
        <div className="flex items-center gap-3 mt-1 text-xs text-muted">
          {post.datePublication && <span>{fmtDate(post.datePublication)}</span>}
          {post.statut === 'publie' && eng > 0 && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{(post.stats?.likes || 0).toLocaleString('fr-FR')}</span>
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{(post.stats?.vues || 0).toLocaleString('fr-FR')}</span>
            </>
          )}
          {post.hashtags?.length > 0 && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1"><Hash className="w-3 h-3" />{post.hashtags.slice(0, 3).map(h => `#${h}`).join(' ')}{post.hashtags.length > 3 && ` +${post.hashtags.length - 3}`}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {post.lienUrl && (
          <a href={post.lienUrl} target="_blank" rel="noopener noreferrer"
            className="p-1.5 rounded-lg hover:bg-muted/20 text-muted hover:text-electric transition-colors">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
        <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-muted/20 text-muted hover:text-ink transition-colors">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-muted/20 text-muted hover:text-rose-500 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
