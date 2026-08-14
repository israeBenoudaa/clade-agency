import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ComposedChart, Line,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Minus, Monitor, Smartphone,
  FileText, Eye, Zap, Globe, Users, Target, Star, Calendar,
  RefreshCw, UserPlus, ArrowRight, Briefcase, BarChart2, Clock,
} from 'lucide-react'

/* ── Design tokens ──────────────────────────────────────────────────────────── */
const ACCENT  = '#C8B89A'
const GREEN   = '#4ADE80'
const BLUE    = '#60A5FA'
const PURPLE  = '#A78BFA'
const YELLOW  = '#FBBF24'
const RED     = '#F87171'
const DIM     = 'rgba(245,240,234,0.28)'
const DIM2    = 'rgba(245,240,234,0.12)'
const CARD    = 'rgba(255,255,255,0.035)'
const BORDER  = 'rgba(255,255,255,0.07)'
const TEXT    = '#F5F0EA'
const FONT    = 'Space Grotesk, sans-serif'
const SERIF   = 'Instrument Serif, Georgia, serif'

const DOW_FR  = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const DOW_FULL = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const MONTHS_SHORT = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

const PERIODS = [
  { label: '7 j',  days: 7  },
  { label: '30 j', days: 30 },
  { label: '90 j', days: 90 },
]

/* ── Helpers ────────────────────────────────────────────────────────────────── */
function relTime(iso) {
  if (!iso) return ''
  const d = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (d < 1)  return 'à l\'instant'
  if (d < 60) return `il y a ${d} min`
  const h = Math.floor(d / 60)
  if (h < 24) return `il y a ${h}h`
  return `il y a ${Math.floor(h / 24)}j`
}

function labelPage(p, projects = []) {
  if (!p) return '/'
  if (p === '/')         return 'Accueil'
  if (p === '/careers')  return 'Carrières'
  if (p.startsWith('/discipline/')) return `Discipline — ${p.split('/').pop().toUpperCase()}`
  if (p.startsWith('/projet/')) {
    const id = p.split('/').pop()
    const proj = projects.find(pr => String(pr.id) === String(id))
    return proj ? proj.title : `Projet #${id.slice(0, 6)}`
  }
  return p
}

function buildDailySeries(visits, leads, days) {
  const today = new Date()
  const series = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key   = d.toISOString().slice(0, 10)
    const label = days <= 7 ? DOW_FR[d.getDay()] : `${d.getDate()}/${d.getMonth() + 1}`
    series.push({ key, label, visites: 0, leads: 0 })
  }
  for (const v of visits) {
    const p = series.find(s => s.key === v.created_at?.slice(0, 10))
    if (p) p.visites++
  }
  for (const l of leads) {
    const p = series.find(s => s.key === l.created_at?.slice(0, 10))
    if (p) p.leads++
  }
  return series
}

function buildPageRank(visits, projects) {
  const counts = {}
  for (const v of visits) {
    const p = v.page || '/'
    counts[p] = (counts[p] || 0) + 1
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([page, count]) => ({ page: labelPage(page, projects), raw: page, count }))
}

function buildDeviceSplit(visits) {
  let mobile = 0, desktop = 0
  for (const v of visits) { if (v.device === 'mobile') mobile++; else desktop++ }
  return [
    { name: 'Desktop', value: desktop, color: ACCENT },
    { name: 'Mobile',  value: mobile,  color: BLUE  },
  ]
}

function buildLangSplit(visits) {
  const counts = {}
  for (const v of visits) {
    const lang = v.language?.slice(0, 2)?.toLowerCase() || 'inconnu'
    const label = lang === 'fr' ? 'Français' : lang === 'ar' ? 'Arabe' : lang === 'en' ? 'Anglais' : 'Autre'
    counts[label] = (counts[label] || 0) + 1
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }))
}

function buildReferrerSplit(visits) {
  const LABELS = { '': 'Direct / Réseaux' }
  const counts = {}
  for (const v of visits) {
    let src = ''
    try {
      const ref = v.referrer || ''
      if (!ref) { src = 'Direct / Réseaux' }
      else if (ref.includes('google'))     { src = 'Google' }
      else if (ref.includes('instagram'))  { src = 'Instagram' }
      else if (ref.includes('facebook'))   { src = 'Facebook' }
      else if (ref.includes('linkedin'))   { src = 'LinkedIn' }
      else if (ref.includes('behance'))    { src = 'Behance' }
      else if (ref.includes('pinterest'))  { src = 'Pinterest' }
      else { src = new URL(ref).hostname.replace('www.', '') }
    } catch { src = 'Autre' }
    counts[src] = (counts[src] || 0) + 1
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }))
}

/* ── Smart conclusions engine ───────────────────────────────────────────────── */
function computeInsights(visits, prevVisits, leads, dailySeries, pageRank, deviceSplit, langSplit, referrers, projects) {
  const total    = visits.length
  const prevTotal = prevVisits.length
  const leadCount = leads.length
  const convRate  = total > 0 ? (leadCount / total * 100) : 0
  const insights  = []

  /* 1 · Tendance trafic */
  if (prevTotal > 0) {
    const pct = Math.round(((total - prevTotal) / prevTotal) * 100)
    if (pct >= 20)  insights.push({ p: 0, c: GREEN,  icon: TrendingUp,   title: `Trafic en forte hausse (+${pct}%)`, body: `Hausse significative vs la même période précédente. Identifiez ce qui a changé — nouveau projet publié, partage sur les réseaux, ou mention externe ?` })
    else if (pct >= 5)  insights.push({ p: 1, c: ACCENT, icon: TrendingUp,  title: `Progression stable (+${pct}%)`, body: `Trafic en légère hausse. Continuez à publier de nouveaux projets régulièrement pour consolider cette tendance.` })
    else if (pct <= -20) insights.push({ p: 0, c: RED,   icon: TrendingDown, title: `Baisse importante du trafic (${pct}%)`, body: `Baisse notable vs la période précédente. Vérifiez l'indexation Google, relancez des partages sur Instagram/LinkedIn, et publiez du contenu frais.` })
    else if (pct <= -5)  insights.push({ p: 1, c: YELLOW, icon: TrendingDown, title: `Légère baisse (${pct}%)`, body: `Trafic en recul modéré. Un partage sur les réseaux ou la publication d'un nouveau projet peut suffire à inverser la tendance.` })
    else insights.push({ p: 2, c: DIM, icon: Minus, title: 'Trafic stable', body: `${pct > 0 ? '+' : ''}${pct}% vs la période précédente — stabilité correcte. La régularité de publication reste la clé de la croissance.` })
  }

  /* 2 · Taux de conversion */
  if (total >= 20) {
    if (convRate >= 5)       insights.push({ p: 0, c: GREEN,  icon: Target, title: `Excellent taux de conversion (${convRate.toFixed(1)}%)`, body: `${leadCount} contact${leadCount > 1 ? 's' : ''} pour ${total} visites — au-dessus des 1-3% habituels pour un portfolio architecture. Votre contenu et votre formulaire fonctionnent bien.` })
    else if (convRate >= 2)  insights.push({ p: 1, c: ACCENT, icon: Target, title: `Conversion correcte (${convRate.toFixed(1)}%)`, body: `${leadCount} contact${leadCount > 1 ? 's' : ''} reçu${leadCount > 1 ? 's' : ''}. Cible : 5%. Essayez un CTA plus visible en haut de page et raccourcissez le formulaire.` })
    else if (leadCount > 0)  insights.push({ p: 1, c: YELLOW, icon: Target, title: `Conversion à améliorer (${convRate.toFixed(1)}%)`, body: `Peu de contacts malgré les visites. Simplifiez le formulaire (3-4 champs max), ajoutez un numéro de téléphone visible, et déplacez le CTA au-dessus de la ligne de flottaison.` })
    else                     insights.push({ p: 1, c: YELLOW, icon: Target, title: 'Aucun contact cette période', body: `0 formulaire rempli. Vérifiez que le formulaire de contact fonctionne bien, et que la section contact est facilement accessible depuis l'accueil.` })
  }

  /* 3 · Mobile */
  const mobileCount = deviceSplit.find(d => d.name === 'Mobile')?.value || 0
  const mobilePct   = total > 0 ? Math.round(mobileCount / total * 100) : 0
  if (mobilePct >= 65 && total >= 10) insights.push({ p: 1, c: BLUE, icon: Smartphone, title: `Majorité mobile (${mobilePct}%)`, body: `${mobilePct}% des visiteurs sont sur smartphone. Testez le site sur iOS/Android régulièrement — chaque bug mobile peut coûter un contact.` })
  else if (mobilePct <= 30 && total >= 10) insights.push({ p: 2, c: PURPLE, icon: Monitor, title: `Audience desktop (${100 - mobilePct}%)`, body: `Majorité desktop — votre audience est probablement professionnelle (agences, maîtres d'ouvrage). Des présentations plus techniques et détaillées sont bien reçues.` })

  /* 4 · Jour pic */
  if (visits.length >= 7) {
    const byDow = {}
    for (const v of visits) {
      const d = new Date(v.created_at).getDay()
      byDow[d] = (byDow[d] || 0) + 1
    }
    const best = Object.entries(byDow).sort((a, b) => b[1] - a[1])[0]
    if (best && Number(best[1]) > 0) {
      insights.push({ p: 2, c: ACCENT, icon: Calendar, title: `Le ${DOW_FULL[best[0]]} génère le plus de trafic`, body: `Planifiez vos publications et partages réseaux le ${DOW_FULL[best[0]]} pour maximiser la portée organique.` })
    }
  }

  /* 5 · Sources de trafic */
  const directCount = (referrers.find(r => r.name === 'Direct / Réseaux')?.value || 0)
  const directPct   = total > 0 ? Math.round(directCount / total * 100) : 0
  const hasGoogle   = referrers.some(r => r.name === 'Google')
  if (directPct >= 80 && total >= 15) insights.push({ p: 1, c: YELLOW, icon: Globe, title: `${directPct}% de trafic direct`, body: `Quasi-totalité du trafic vient directement ou des réseaux sociaux non tracés. ${hasGoogle ? '' : 'Pas de trafic Google détecté — '}Travaillez le référencement naturel : descriptions de projets riches en mots-clés, balises alt sur les images.` })
  if (hasGoogle) insights.push({ p: 2, c: GREEN, icon: Globe, title: 'Trafic Google détecté', body: `Des visiteurs arrivent depuis Google — le référencement naturel fonctionne. Ajoutez des mots-clés géographiques (Casablanca, Maroc) dans les titres de projets.` })

  /* 6 · Audience internationale */
  const frLang  = langSplit.find(l => l.name === 'Français')?.value || 0
  const intlPct = total > 0 ? Math.round(((total - frLang) / total) * 100) : 0
  if (intlPct >= 30 && total >= 15) insights.push({ p: 1, c: PURPLE, icon: Globe, title: `${intlPct}% de visiteurs non-francophones`, body: `Audience internationale significative. Envisagez des légendes de projets en anglais et/ou en arabe — quelques phrases suffisent pour élargir la portée.` })

  /* 7 · Projet phare */
  const projPages = pageRank.filter(p => p.raw.startsWith('/projet/'))
  if (projPages.length > 0) {
    const top = projPages[0]
    insights.push({ p: 2, c: GREEN, icon: Star, title: `"${top.page}" est votre projet le plus vu`, body: `${top.count} visite${top.count > 1 ? 's' : ''}. Enrichissez sa page (story longue, galerie complète) et créez des projets similaires pour capitaliser sur cet intérêt.` })
  }

  /* 8 · Carrières */
  const careersData = pageRank.find(p => p.raw === '/careers')
  if (careersData) {
    const carPct = Math.round(careersData.count / total * 100)
    if (carPct < 3 && total >= 30) insights.push({ p: 2, c: DIM, icon: Briefcase, title: 'Page Carrières peu consultée', body: `Seulement ${carPct}% du trafic. Si vous recrutez activement, ajoutez un lien "On recrute" visible depuis l'accueil et partagez vos offres sur LinkedIn.` })
  }

  /* 9 · Irrégularité */
  if (dailySeries.length >= 7) {
    const vals = dailySeries.map(d => d.visites)
    const avg  = vals.reduce((a, b) => a + b, 0) / vals.length
    const std  = Math.sqrt(vals.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / vals.length)
    const cv   = avg > 0 ? std / avg : 0
    if (cv > 1.8 && avg >= 2) insights.push({ p: 2, c: YELLOW, icon: BarChart2, title: 'Trafic très irrégulier', body: `Fortes fluctuations jour à jour. La régularité de publication est plus efficace que les pics isolés — visez 2-3 partages par semaine.` })
  }

  return insights
    .sort((a, b) => a.p - b.p)
    .slice(0, 8)
}

/* ── Tooltip styles ─────────────────────────────────────────────────────────── */
const TT_STYLE = { background: '#1A1B1C', border: `1px solid ${BORDER}`, borderRadius: 8, fontFamily: FONT, fontSize: 12, color: TEXT }

const TooltipVisits = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={TT_STYLE}>
      <div style={{ padding: '8px 14px' }}>
        <div style={{ color: DIM, marginBottom: 4, fontSize: 11 }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
            <span style={{ color: p.color, fontWeight: 700 }}>{p.value}</span>
            <span style={{ color: DIM }}>{p.name === 'leads' ? 'contact' : 'visite'}{p.value !== 1 ? 's' : ''}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const TooltipBar = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ ...TT_STYLE, padding: '8px 14px' }}>
      <div style={{ color: DIM, marginBottom: 2, fontSize: 11 }}>{label}</div>
      <div><span style={{ color: BLUE, fontWeight: 700 }}>{payload[0].value}</span> visite{payload[0].value !== 1 ? 's' : ''}</div>
    </div>
  )
}

/* ── Sub-components ─────────────────────────────────────────────────────────── */
function KpiCard({ label, value, sub, color, icon: Icon }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ fontSize: 9, color: DIM, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: '0.09em' }}>{label}</div>
        {Icon && <Icon size={13} color={color || DIM} />}
      </div>
      <div style={{ fontSize: 26, fontFamily: SERIF, color: TEXT, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: DIM, fontFamily: FONT, lineHeight: 1.4 }}>{sub}</div>}
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: 10, color: DIM, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>
      {children}
    </div>
  )
}

function Panel({ children, style }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '18px 18px', ...style }}>
      {children}
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 16, color: DIM, textAlign: 'center', padding: '0 32px' }}>
      <BarChart2 size={40} style={{ opacity: 0.2 }} />
      <div style={{ fontSize: 16, fontFamily: SERIF, color: TEXT, opacity: 0.5 }}>Aucune visite enregistrée</div>
      <div style={{ fontSize: 12, fontFamily: FONT, lineHeight: 1.7, maxWidth: 380 }}>
        Le tracking est actif sur le portfolio live. Les données apparaissent ici dès que des visiteurs accèdent au site.
        <br /><br />
        <span style={{ opacity: 0.6 }}>Vérifiez que la table <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 4 }}>site_visits</code> existe dans Supabase, et que le portfolio est accessible depuis un appareil extérieur (pas uniquement en iframe).</span>
      </div>
    </div>
  )
}

/* ── Main component ─────────────────────────────────────────────────────────── */
export default function SiteAnalytics() {
  const [period, setPeriod]       = useState(1)
  const [visits, setVisits]       = useState([])
  const [prevVisits, setPrevVisits] = useState([])
  const [leads, setLeads]         = useState([])
  const [projects, setProjects]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [lastRefresh, setLastRefresh] = useState(null)

  const days = PERIODS[period].days

  const fetchData = useCallback(async () => {
    setLoading(true)
    const now      = new Date()
    const fromCurr = new Date(now); fromCurr.setDate(fromCurr.getDate() - days)
    const fromPrev = new Date(fromCurr); fromPrev.setDate(fromPrev.getDate() - days)

    const [currRes, prevRes, leadsRes, projRes] = await Promise.all([
      supabase.from('site_visits').select('*').gte('created_at', fromCurr.toISOString()).order('created_at', { ascending: false }),
      supabase.from('site_visits').select('*').gte('created_at', fromPrev.toISOString()).lt('created_at', fromCurr.toISOString()),
      supabase.from('prospects').select('id, nom, prenom, type_projet, budget, source, created_at').eq('source', 'portfolio').gte('created_at', fromCurr.toISOString()).order('created_at', { ascending: false }),
      supabase.from('portfolio_projects').select('id, title, axis, visible'),
    ])

    setVisits(currRes.data || [])
    setPrevVisits(prevRes.data || [])
    setLeads(leadsRes.data || [])
    setProjects(projRes.data || [])
    setLastRefresh(new Date())
    setLoading(false)
  }, [days])

  useEffect(() => { fetchData() }, [fetchData])

  // Auto-refresh every 2 minutes
  useEffect(() => {
    const timer = setInterval(fetchData, 120_000)
    return () => clearInterval(timer)
  }, [fetchData])

  /* ── Computed ── */
  const dailySeries  = useMemo(() => buildDailySeries(visits, leads, days), [visits, leads, days])
  const pageRank     = useMemo(() => buildPageRank(visits, projects), [visits, projects])
  const deviceSplit  = useMemo(() => buildDeviceSplit(visits), [visits])
  const langSplit    = useMemo(() => buildLangSplit(visits), [visits])
  const referrers    = useMemo(() => buildReferrerSplit(visits), [visits])
  const insights     = useMemo(() => computeInsights(visits, prevVisits, leads, dailySeries, pageRank, deviceSplit, langSplit, referrers, projects), [visits, prevVisits, leads, dailySeries, pageRank, deviceSplit, langSplit, referrers, projects])

  const totalVisits  = visits.length
  const leadCount    = leads.length
  const convRate     = totalVisits > 0 ? (leadCount / totalVisits * 100) : 0
  const mobileCount  = deviceSplit.find(d => d.name === 'Mobile')?.value || 0
  const mobilePct    = totalVisits > 0 ? Math.round(mobileCount / totalVisits * 100) : 0
  const avgDay       = totalVisits > 0 ? (totalVisits / days).toFixed(1) : '0'
  const pctVsPrev    = prevVisits.length > 0 ? Math.round(((totalVisits - prevVisits.length) / prevVisits.length) * 100) : null

  const topProjectViews = useMemo(() => {
    return pageRank
      .filter(p => p.raw.startsWith('/projet/'))
      .slice(0, 4)
      .map(p => {
        const id   = p.raw.split('/').pop()
        const proj = projects.find(pr => String(pr.id) === String(id))
        return { ...p, axis: proj?.axis, projId: proj?.id }
      })
  }, [pageRank, projects])

  const axisColor = { C: '#7BA7D4', L: '#8DBE8A', A: '#C8B89A', D: '#B89AC8', E: '#C8A47B' }

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#08090A', fontFamily: FONT }}>
      <div style={{ padding: '24px 28px', maxWidth: 900, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, color: DIM, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>
              Portfolio · Analyse business
            </div>
            <div style={{ fontSize: 22, fontFamily: SERIF, color: TEXT }}>Performances &amp; audience</div>
            {lastRefresh && (
              <div style={{ fontSize: 10, color: DIM, marginTop: 4 }}>
                Actualisé {relTime(lastRefresh.toISOString())} · toutes les 2 min
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={fetchData}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '6px 12px', color: DIM, fontSize: 11, fontFamily: FONT, cursor: 'pointer' }}
            >
              <RefreshCw size={11} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              Actualiser
            </button>
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 3 }}>
              {PERIODS.map((p, i) => (
                <button key={i} onClick={() => setPeriod(i)} style={{
                  padding: '5px 13px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11,
                  fontFamily: FONT, fontWeight: 600, transition: 'all 0.15s',
                  background: period === i ? 'rgba(255,255,255,0.12)' : 'transparent',
                  color: period === i ? TEXT : DIM,
                }}>{p.label}</button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240, gap: 12, color: DIM }}>
            <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 13 }}>Chargement des données…</span>
          </div>
        ) : totalVisits === 0 && leadCount === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* ── Funnel ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr', gap: 8, alignItems: 'center', marginBottom: 20 }}>
              {[
                { label: 'Visites totales', value: totalVisits.toLocaleString(), sub: `${days} derniers jours`, color: ACCENT, icon: Eye },
                null,
                { label: 'Pages consultées', value: new Set(visits.map(v => v.page)).size, sub: `${pageRank.length} pages uniques`, color: BLUE, icon: FileText },
                null,
                { label: 'Contacts reçus', value: leadCount, sub: convRate > 0 ? `taux : ${convRate.toFixed(1)}%` : 'formulaire portfolio', color: leadCount > 0 ? GREEN : DIM, icon: UserPlus },
              ].map((item, i) => item === null ? (
                <div key={i} style={{ display: 'flex', justifyContent: 'center' }}>
                  <ArrowRight size={16} color={DIM} />
                </div>
              ) : (
                <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: DIM, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    <item.icon size={10} color={item.color} />{item.label}
                  </div>
                  <div style={{ fontSize: 28, fontFamily: SERIF, color: item.color, lineHeight: 1 }}>{item.value}</div>
                  <div style={{ fontSize: 10, color: DIM, marginTop: 4 }}>{item.sub}</div>
                </div>
              ))}
            </div>

            {/* ── KPI grid ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
              <KpiCard
                label="Moy. visites / jour"
                value={avgDay}
                sub={pctVsPrev !== null ? `${pctVsPrev >= 0 ? '+' : ''}${pctVsPrev}% vs période préc.` : `sur ${days} jours`}
                color={pctVsPrev !== null && pctVsPrev >= 0 ? GREEN : RED}
                icon={pctVsPrev !== null && pctVsPrev >= 0 ? TrendingUp : TrendingDown}
              />
              <KpiCard
                label="Taux de conversion"
                value={`${convRate.toFixed(1)}%`}
                sub={`${leadCount} contact${leadCount !== 1 ? 's' : ''} · objectif 5%`}
                color={convRate >= 5 ? GREEN : convRate >= 2 ? ACCENT : YELLOW}
                icon={Target}
              />
              <KpiCard
                label="Part mobile"
                value={`${mobilePct}%`}
                sub={`${mobileCount} visites mobile`}
                color={BLUE}
                icon={Smartphone}
              />
            </div>

            {/* ── Graphiques principaux ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

              {/* Visites + leads par jour */}
              <Panel>
                <SectionTitle>Visites & contacts par jour</SectionTitle>
                <ResponsiveContainer width="100%" height={180}>
                  <ComposedChart data={dailySeries} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="gradV" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={ACCENT} stopOpacity={0.18} />
                        <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: DIM, fontSize: 9, fontFamily: FONT }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fill: DIM, fontSize: 9, fontFamily: FONT }} axisLine={false} tickLine={false} />
                    <Tooltip content={<TooltipVisits />} />
                    <Area type="monotone" dataKey="visites" name="visites" stroke={ACCENT} strokeWidth={2} fill="url(#gradV)" dot={false} activeDot={{ r: 3, fill: ACCENT }} />
                    {leadCount > 0 && (
                      <Line type="monotone" dataKey="leads" name="leads" stroke={GREEN} strokeWidth={2} dot={{ r: 3, fill: GREEN, strokeWidth: 0 }} activeDot={{ r: 4 }} />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </Panel>

              {/* Pages populaires */}
              <Panel>
                <SectionTitle>Pages les plus visitées</SectionTitle>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={pageRank.slice(0, 6)} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: DIM, fontSize: 9, fontFamily: FONT }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="page" tick={{ fill: DIM, fontSize: 9, fontFamily: FONT }} axisLine={false} tickLine={false} width={90} />
                    <Tooltip content={<TooltipBar />} />
                    <Bar dataKey="count" fill={BLUE} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Panel>
            </div>

            {/* ── Projets phares + Sources ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

              {/* Projets par vues */}
              <Panel>
                <SectionTitle>Projets les plus vus</SectionTitle>
                {topProjectViews.length === 0 ? (
                  <div style={{ fontSize: 11, color: DIM, padding: '12px 0' }}>Aucune visite de projet enregistrée.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {topProjectViews.map((p, i) => {
                      const maxCount = topProjectViews[0].count
                      const pct = Math.round(p.count / maxCount * 100)
                      return (
                        <div key={i}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              {p.axis && <div style={{ width: 6, height: 6, borderRadius: '50%', background: axisColor[p.axis] || ACCENT, flexShrink: 0 }} />}
                              <span style={{ fontSize: 11, color: TEXT, fontWeight: 500 }}>{p.page}</span>
                            </div>
                            <span style={{ fontSize: 11, color: ACCENT, fontWeight: 700 }}>{p.count}</span>
                          </div>
                          <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                            <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: axisColor[p.axis] || ACCENT, transition: 'width 0.5s' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Panel>

              {/* Sources de trafic */}
              <Panel>
                <SectionTitle>Sources de trafic</SectionTitle>
                {referrers.length === 0 ? (
                  <div style={{ fontSize: 11, color: DIM }}>Pas de données de referrer.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {referrers.map((r, i) => {
                      const pct = Math.round(r.value / totalVisits * 100)
                      const src_color = r.name === 'Google' ? GREEN : r.name === 'Instagram' ? PURPLE : r.name === 'LinkedIn' ? BLUE : ACCENT
                      return (
                        <div key={i}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                            <span style={{ fontSize: 11, color: TEXT }}>{r.name}</span>
                            <span style={{ fontSize: 11, color: DIM }}>{pct}% · {r.value} visite{r.value !== 1 ? 's' : ''}</span>
                          </div>
                          <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                            <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: src_color }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Panel>
            </div>

            {/* ── Audience : Appareils + Langues ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

              {/* Appareils */}
              <Panel>
                <SectionTitle>Appareils</SectionTitle>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{ flexShrink: 0 }}>
                    <ResponsiveContainer width={100} height={100}>
                      <PieChart>
                        <Pie data={deviceSplit} cx="50%" cy="50%" innerRadius={28} outerRadius={44} dataKey="value" strokeWidth={0}>
                          {deviceSplit.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip formatter={(v, n) => [`${v} visites`, n]} contentStyle={TT_STYLE} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {deviceSplit.map((d, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: d.color }} />
                          <span style={{ fontSize: 12, color: 'rgba(245,240,234,0.6)', fontFamily: FONT }}>{d.name}</span>
                        </div>
                        <span style={{ fontSize: 12, color: TEXT, fontWeight: 600, fontFamily: FONT }}>
                          {totalVisits ? Math.round(d.value / totalVisits * 100) : 0}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Panel>

              {/* Langues */}
              <Panel>
                <SectionTitle>Langues des visiteurs</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {langSplit.length === 0 ? (
                    <div style={{ fontSize: 11, color: DIM }}>Pas de données de langue.</div>
                  ) : langSplit.slice(0, 5).map((l, i) => {
                    const pct = Math.round(l.value / totalVisits * 100)
                    const lc  = l.name === 'Français' ? ACCENT : l.name === 'Anglais' ? BLUE : l.name === 'Arabe' ? GREEN : DIM2
                    return (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 11, color: TEXT }}>{l.name}</span>
                          <span style={{ fontSize: 11, color: DIM }}>{pct}%</span>
                        </div>
                        <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                          <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: lc }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Panel>
            </div>

            {/* ── Conclusions intelligentes ── */}
            <Panel style={{ marginBottom: 16 }}>
              <SectionTitle>Conclusions &amp; recommandations automatiques</SectionTitle>
              {insights.length === 0 ? (
                <div style={{ fontSize: 12, color: DIM }}>Pas assez de données pour générer des insights — revenez avec plus de visites.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
                  {insights.map((ins, i) => {
                    const Icon = ins.icon
                    return (
                      <div key={i} style={{ display: 'flex', gap: 11, padding: '12px 14px', background: 'rgba(255,255,255,0.025)', borderRadius: 10, border: `1px solid ${BORDER}` }}>
                        <div style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 8, background: `${ins.c}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon size={13} color={ins.c} />
                        </div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: TEXT, marginBottom: 3, lineHeight: 1.3 }}>{ins.title}</div>
                          <div style={{ fontSize: 10, color: DIM, lineHeight: 1.55 }}>{ins.body}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Panel>

            {/* ── Flux récent ── */}
            {(visits.length > 0 || leads.length > 0) && (
              <Panel>
                <SectionTitle>Activité récente</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {[
                    ...visits.slice(0, 6).map(v => ({ type: 'visit', ts: v.created_at, page: labelPage(v.page, projects), device: v.device })),
                    ...leads.slice(0, 4).map(l => ({ type: 'lead', ts: l.created_at, name: [l.prenom, l.nom].filter(Boolean).join(' ') || 'Contact', budget: l.budget, projet: l.type_projet })),
                  ]
                    .sort((a, b) => new Date(b.ts) - new Date(a.ts))
                    .slice(0, 8)
                    .map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < 7 ? `1px solid ${BORDER}` : 'none' }}>
                        <div style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 7, background: item.type === 'lead' ? `${GREEN}18` : `${ACCENT}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {item.type === 'lead' ? <UserPlus size={12} color={GREEN} /> : <Eye size={12} color={ACCENT} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {item.type === 'lead' ? (
                            <div style={{ fontSize: 11, color: TEXT, fontWeight: 600 }}>
                              Nouveau contact — {item.name}
                              {item.projet && <span style={{ color: DIM, fontWeight: 400 }}> · {item.projet}</span>}
                              {item.budget && <span style={{ color: GREEN, fontWeight: 400 }}> · {item.budget}</span>}
                            </div>
                          ) : (
                            <div style={{ fontSize: 11, color: TEXT }}>
                              <span style={{ color: DIM }}>Visite</span> {item.page}
                              {item.device && <span style={{ color: DIM }}> · {item.device}</span>}
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: 10, color: DIM, flexShrink: 0 }}>
                          <Clock size={9} style={{ display: 'inline', marginRight: 3 }} />
                          {relTime(item.ts)}
                        </div>
                      </div>
                    ))}
                </div>
              </Panel>
            )}
          </>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
