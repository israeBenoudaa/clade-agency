import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, Monitor, Smartphone, FileText, Eye, Zap } from 'lucide-react'

const PERIODS = [
  { label: '7 j', days: 7 },
  { label: '30 j', days: 30 },
  { label: '90 j', days: 90 },
]

const ACCENT = '#C8B89A'
const DIM = 'rgba(245,240,234,0.28)'
const CARD = 'rgba(255,255,255,0.035)'
const BORDER = 'rgba(255,255,255,0.07)'
const FONT = 'Space Grotesk, sans-serif'
const SERIF = 'Instrument Serif, Georgia, serif'

/* Page pathname → human label */
function labelPage(p) {
  if (p === '/') return 'Accueil'
  if (p.startsWith('/discipline/')) return `Discipline – ${p.split('/').pop()}`
  if (p.startsWith('/projet/')) return `Projet – ${p.split('/').pop()}`
  if (p === '/careers') return 'Carrières'
  return p
}

/* Day of week label (Sun=0) */
const DOW = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

/* Build daily series for the period */
function buildDailySeries(rows, days) {
  const today = new Date()
  const series = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const label = days <= 7
      ? DOW[d.getDay()]
      : days <= 30
        ? `${d.getDate()}/${d.getMonth() + 1}`
        : `${d.getDate()}/${d.getMonth() + 1}`
    series.push({ key, label, visits: 0 })
  }
  for (const row of rows) {
    const key = row.created_at?.slice(0, 10)
    const point = series.find(s => s.key === key)
    if (point) point.visits++
  }
  return series
}

/* Build page ranking */
function buildPageRank(rows) {
  const counts = {}
  for (const r of rows) {
    const p = r.page || '/'
    counts[p] = (counts[p] || 0) + 1
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([page, count]) => ({ page: labelPage(page), raw: page, count }))
}

/* Build device split */
function buildDeviceSplit(rows) {
  let mobile = 0, desktop = 0
  for (const r of rows) {
    if (r.device === 'mobile') mobile++
    else desktop++
  }
  return [
    { name: 'Desktop', value: desktop, color: ACCENT },
    { name: 'Mobile', value: mobile, color: 'rgba(200,184,154,0.4)' },
  ]
}

/* Rule-based insights */
function computeInsights(rows, prevRows, dailySeries, deviceSplit, pageRank) {
  const insights = []

  // Trend
  const curr = rows.length
  const prev = prevRows.length
  const pct = prev === 0 ? null : Math.round(((curr - prev) / prev) * 100)
  if (pct !== null) {
    if (pct >= 10) insights.push({ icon: TrendingUp, color: '#4ADE80', title: 'Trafic en hausse', body: `+${pct}% de visites vs la même période précédente.` })
    else if (pct <= -10) insights.push({ icon: TrendingDown, color: '#F87171', title: 'Trafic en baisse', body: `${pct}% de visites vs la période précédente — vérifiez la visibilité du site.` })
    else insights.push({ icon: Minus, color: DIM, title: 'Trafic stable', body: `${pct > 0 ? '+' : ''}${pct}% vs la période précédente.` })
  }

  // Peak day
  if (dailySeries.length) {
    const peak = dailySeries.reduce((a, b) => b.visits > a.visits ? b : a)
    if (peak.visits > 0) {
      insights.push({ icon: Zap, color: ACCENT, title: 'Jour pic', body: `Le ${peak.key} avec ${peak.visits} visite${peak.visits > 1 ? 's' : ''} — idéal pour publier du contenu ce jour-là.` })
    }
  }

  // Device
  const totalDev = deviceSplit.reduce((s, d) => s + d.value, 0)
  if (totalDev > 0) {
    const mobileRow = deviceSplit.find(d => d.name === 'Mobile')
    const mobilePct = Math.round((mobileRow.value / totalDev) * 100)
    if (mobilePct >= 60) insights.push({ icon: Smartphone, color: '#60A5FA', title: 'Audience mobile dominante', body: `${mobilePct}% des visites viennent d'un appareil mobile — l'expérience mobile est critique.` })
    else if (mobilePct <= 30) insights.push({ icon: Monitor, color: '#A78BFA', title: 'Audience desktop', body: `${100 - mobilePct}% des visites sur desktop — les interactions complexes fonctionnent bien ici.` })
    else insights.push({ icon: Monitor, color: DIM, title: 'Audience mixte', body: `${mobilePct}% mobile / ${100 - mobilePct}% desktop — bonne distribution multi-device.` })
  }

  // Top page
  if (pageRank.length > 0) {
    const top = pageRank[0]
    insights.push({ icon: Eye, color: '#34D399', title: 'Page la plus visitée', body: `"${top.page}" cumule ${top.count} visite${top.count > 1 ? 's' : ''} — elle doit être irréprochable.` })
  }

  // Consistency (std dev)
  if (dailySeries.length >= 7) {
    const vals = dailySeries.map(d => d.visits)
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length
    const std = Math.sqrt(vals.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / vals.length)
    const cv = avg > 0 ? std / avg : 0
    if (cv > 1) insights.push({ icon: TrendingUp, color: '#FBBF24', title: 'Trafic irrégulier', body: `Les visites sont très variables — envisagez une présence régulière sur les réseaux.` })
  }

  return insights
}

/* ─── Sub-components ─── */
function KpiCard({ label, value, sub }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 10, color: DIM, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ fontSize: 28, fontFamily: SERIF, color: '#F5F0EA', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: DIM, fontFamily: FONT }}>{sub}</div>}
    </div>
  )
}

const CustomTooltipArea = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1A1B1C', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '8px 14px', fontFamily: FONT, fontSize: 12, color: '#F5F0EA' }}>
      <div style={{ color: DIM, marginBottom: 2 }}>{label}</div>
      <div><span style={{ color: ACCENT, fontWeight: 700 }}>{payload[0].value}</span> visite{payload[0].value !== 1 ? 's' : ''}</div>
    </div>
  )
}

const CustomTooltipBar = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1A1B1C', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '8px 14px', fontFamily: FONT, fontSize: 12, color: '#F5F0EA' }}>
      <div style={{ color: DIM, marginBottom: 2 }}>{label}</div>
      <div><span style={{ color: '#60A5FA', fontWeight: 700 }}>{payload[0].value}</span> visite{payload[0].value !== 1 ? 's' : ''}</div>
    </div>
  )
}

/* ─── Main component ─── */
export default function SiteAnalytics() {
  const [period, setPeriod] = useState(1) // index in PERIODS
  const [rows, setRows] = useState([])
  const [prevRows, setPrevRows] = useState([])
  const [loading, setLoading] = useState(true)

  const days = PERIODS[period].days

  useEffect(() => {
    let alive = true
    setLoading(true)

    async function fetchData() {
      const now = new Date()
      const fromCurr = new Date(now); fromCurr.setDate(fromCurr.getDate() - days)
      const fromPrev = new Date(fromCurr); fromPrev.setDate(fromPrev.getDate() - days)

      const [currRes, prevRes] = await Promise.all([
        supabase.from('site_visits').select('*').gte('created_at', fromCurr.toISOString()).order('created_at', { ascending: true }),
        supabase.from('site_visits').select('*').gte('created_at', fromPrev.toISOString()).lt('created_at', fromCurr.toISOString()),
      ])
      if (!alive) return
      setRows(currRes.data || [])
      setPrevRows(prevRes.data || [])
      setLoading(false)
    }

    fetchData()
    return () => { alive = false }
  }, [days])

  const dailySeries = useMemo(() => buildDailySeries(rows, days), [rows, days])
  const pageRank    = useMemo(() => buildPageRank(rows), [rows])
  const deviceSplit = useMemo(() => buildDeviceSplit(rows), [rows])
  const insights    = useMemo(() => computeInsights(rows, prevRows, dailySeries, deviceSplit, pageRank), [rows, prevRows, dailySeries, deviceSplit, pageRank])

  const totalVisits  = rows.length
  const uniquePages  = new Set(rows.map(r => r.page)).size
  const mobileCount  = deviceSplit.find(d => d.name === 'Mobile')?.value || 0
  const mobilePct    = totalVisits ? Math.round((mobileCount / totalVisits) * 100) : 0
  const pctVsPrev    = prevRows.length ? Math.round(((totalVisits - prevRows.length) / prevRows.length) * 100) : null

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#0A0B0C', padding: '28px 32px', fontFamily: FONT }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 10, color: DIM, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Analyses du site</div>
          <div style={{ fontSize: 24, fontFamily: SERIF, color: '#F5F0EA' }}>Performances &amp; audience</div>
        </div>

        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 3, gap: 2 }}>
          {PERIODS.map((p, i) => (
            <button key={i} onClick={() => setPeriod(i)} style={{
              padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12,
              fontFamily: FONT, fontWeight: 600,
              background: period === i ? 'rgba(255,255,255,0.12)' : 'transparent',
              color: period === i ? '#F5F0EA' : DIM,
              transition: 'all 0.15s',
            }}>{p.label}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: DIM, fontSize: 13 }}>
          Chargement des données...
        </div>
      ) : totalVisits === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 280, gap: 12, color: DIM }}>
          <FileText size={36} style={{ opacity: 0.3 }} />
          <div style={{ fontSize: 14 }}>Aucune visite enregistrée sur cette période.</div>
          <div style={{ fontSize: 11, maxWidth: 380, textAlign: 'center', lineHeight: 1.6 }}>
            Assurez-vous que la table <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: 4 }}>site_visits</code> existe dans Supabase et que le portfolio live est accessible.
          </div>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            <KpiCard
              label="Visites totales"
              value={totalVisits.toLocaleString()}
              sub={pctVsPrev !== null ? `${pctVsPrev >= 0 ? '+' : ''}${pctVsPrev}% vs période préc.` : undefined}
            />
            <KpiCard label="Pages visitées" value={uniquePages} sub={`sur ${pageRank.length} pages uniques`} />
            <KpiCard label="Mobile" value={`${mobilePct}%`} sub={`${mobileCount} visites mobile`} />
            <KpiCard label="Moy. / jour" value={(totalVisits / days).toFixed(1)} sub={`sur ${days} jours`} />
          </div>

          {/* Charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

            {/* Daily visits area chart */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '20px 16px 12px' }}>
              <div style={{ fontSize: 11, color: DIM, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Visites par jour</div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={dailySeries} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="gradVisits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={ACCENT} stopOpacity={0.18} />
                      <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: DIM, fontSize: 10, fontFamily: FONT }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: DIM, fontSize: 10, fontFamily: FONT }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltipArea />} />
                  <Area type="monotone" dataKey="visits" stroke={ACCENT} strokeWidth={2} fill="url(#gradVisits)" dot={false} activeDot={{ r: 4, fill: ACCENT }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Top pages bar chart */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '20px 16px 12px' }}>
              <div style={{ fontSize: 11, color: DIM, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Pages populaires</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={pageRank.slice(0, 6)} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: DIM, fontSize: 10, fontFamily: FONT }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="page" tick={{ fill: DIM, fontSize: 10, fontFamily: FONT }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip content={<CustomTooltipBar />} />
                  <Bar dataKey="count" fill="#60A5FA" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Device + Insights row */}
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16 }}>

            {/* Device donut */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '20px 16px' }}>
              <div style={{ fontSize: 11, color: DIM, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Appareils</div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <ResponsiveContainer width="100%" height={130}>
                  <PieChart>
                    <Pie data={deviceSplit} cx="50%" cy="50%" innerRadius={38} outerRadius={58} dataKey="value" strokeWidth={0}>
                      {deviceSplit.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [`${v} visites`, n]} contentStyle={{ background: '#1A1B1C', border: `1px solid ${BORDER}`, borderRadius: 8, fontFamily: FONT, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                  {deviceSplit.map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, fontFamily: FONT }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                        <span style={{ color: 'rgba(245,240,234,0.6)' }}>{d.name}</span>
                      </div>
                      <span style={{ color: '#F5F0EA', fontWeight: 600 }}>
                        {totalVisits ? Math.round((d.value / totalVisits) * 100) : 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Insights */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '20px 20px' }}>
              <div style={{ fontSize: 11, color: DIM, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Conclusions &amp; recommandations</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {insights.map((ins, i) => {
                  const Icon = ins.icon
                  return (
                    <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 14px', background: 'rgba(255,255,255,0.025)', borderRadius: 10, border: `1px solid ${BORDER}` }}>
                      <div style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 8, background: `${ins.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={14} color={ins.color} />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#F5F0EA', marginBottom: 2 }}>{ins.title}</div>
                        <div style={{ fontSize: 11, color: DIM, lineHeight: 1.5 }}>{ins.body}</div>
                      </div>
                    </div>
                  )
                })}
                {insights.length === 0 && (
                  <div style={{ fontSize: 12, color: DIM, padding: '8px 0' }}>Pas assez de données pour générer des insights.</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
