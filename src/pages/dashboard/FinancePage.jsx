import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, TrendingDown, Wallet, Clock, Scale,
  Plus, Trash2, ArrowRight, TableProperties, ChevronUp, ChevronDown,
  Repeat, Pencil, ChevronRight, Users, Percent, Target, Sparkles, Search, Filter,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, ReferenceLine, CartesianGrid,
} from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import NouvelleTransactionModal from '../../components/NouvelleTransactionModal'
import NouvelleChargeFixeModal from '../../components/NouvelleChargeFixeModal'
import { exportTransactionsExcel } from '../../utils/exportExcel'
import FiscalCalendar from '../../components/FiscalCalendar'
import { useFiscalDeadlines, getUpcomingAlerts } from '../../hooks/useFiscalDeadlines'

const fmtMAD = (n) =>
  Number(n || 0).toLocaleString('fr-MA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' MAD'

const fmtMADShort = (n) => {
  const v = Number(n || 0)
  const abs = Math.abs(v)
  const prefix = v < 0 ? '-' : ''
  if (abs >= 1_000_000) return prefix + (abs / 1_000_000).toFixed(1).replace('.0', '') + 'M MAD'
  if (abs >= 1_000) return prefix + Math.round(abs / 1_000) + 'k MAD'
  return v.toLocaleString('fr-MA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' MAD'
}

const fmtK = (n) => {
  if (!n) return '0'
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M'
  if (n >= 1000) return (n / 1000).toFixed(0) + 'k'
  return String(n)
}

const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const MONTHS_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

const PERIODICITE_LABEL = {
  hebdomadaire: 'Hebdo', mensuel: 'Mensuel', trimestriel: 'Trimestriel', annuel: 'Annuel',
}

function catColor(type) {
  return type === 'entree'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
    : 'bg-rose-50 text-rose-700 border-rose-100'
}

function CircleProgress({ pct, size = 116, stroke = 11 }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const clamped = Math.min(pct, 100)
  const offset = circ - (clamped / 100) * circ
  const color = pct >= 100 ? '#10B981' : pct >= 70 ? '#3B82F6' : pct >= 40 ? '#F59E0B' : '#F43F5E'
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E5E7EB" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 1s ease-out, stroke 0.4s' }}
      />
    </svg>
  )
}

function CaTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const txs = payload[0]?.payload?.txs || []
  return (
    <div className="bg-white border border-border rounded-xl shadow-xl px-3 py-2.5 text-xs pointer-events-none max-w-[230px]">
      <div className="font-semibold text-ink mb-1.5">{label}</div>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full flex-shrink-0 bg-blue-500" />
        <span className="text-muted">CA :</span>
        <span className="font-semibold text-ink">{fmtK(payload[0].value)} MAD</span>
      </div>
      {txs.length > 0 && (
        <div className="border-t border-border pt-2 space-y-1.5">
          {txs.slice(0, 5).map((tx, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <span className="text-muted truncate flex-1">{tx.libelle || tx.categorie || '—'}</span>
              <span className="font-semibold text-ink whitespace-nowrap flex-shrink-0">
                {new Date(tx.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
              </span>
            </div>
          ))}
          {txs.length > 5 && (
            <div className="text-[10px] text-muted">+{txs.length - 5} autre{txs.length - 5 > 1 ? 's' : ''}</div>
          )}
        </div>
      )}
    </div>
  )
}

function RentaTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const profit = payload.find(p => p.name === 'Profit')?.value ?? 0
  return (
    <div className="bg-white border border-border rounded-xl shadow-xl px-3 py-2 text-xs pointer-events-none">
      <div className="font-semibold text-ink mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.fill || p.color }} />
          <span className="text-muted">{p.name} :</span>
          <span className={`font-semibold ${p.name === 'Profit' ? (profit >= 0 ? 'text-emerald-700' : 'text-rose-600') : 'text-ink'}`}>
            {fmtK(Math.abs(p.value))} MAD
          </span>
        </div>
      ))}
    </div>
  )
}

export default function FinancePage() {
  const {
    projects, allTransactions, transactions, addTransaction, removeTransaction,
    chargesFixe, deleteChargeFixe, employes,
    tauxImpot, setTauxImpot, agenceSettings, addNotification,
  } = useData()
  const { isDirector, isDirectorMode, profile } = useAuth()
  const byName = profile?.nom || profile?.full_name || ''
  const isDir = isDirector || isDirectorMode
  const navigate = useNavigate()

  const { deadlines } = useFiscalDeadlines()

  // Notifications fiscales dans la cloche
  useEffect(() => {
    if (!deadlines.length) return
    const today = new Date().toISOString().slice(0, 10)
    const storageKey = `fiscal_notif_${today}`
    const already = JSON.parse(localStorage.getItem(storageKey) || '[]')
    const alerts = getUpcomingAlerts(deadlines)
    const newAlerts = alerts.filter(a => !already.includes(`${a.deadline.id}_${a.daysLeft}`))
    newAlerts.forEach(({ deadline, daysLeft }) => {
      const message = daysLeft < 0
        ? `⚠️ Échéance en retard : "${deadline.title}" (${Math.abs(daysLeft)}j de retard)`
        : daysLeft === 0
          ? `🔴 Échéance aujourd'hui : "${deadline.title}"`
          : `📅 Échéance dans ${daysLeft}j : "${deadline.title}"`
      addNotification({ type: 'fiscal', message, link: '/app/finance', read: false })
    })
    if (newAlerts.length) {
      localStorage.setItem(storageKey, JSON.stringify([
        ...already,
        ...newAlerts.map(a => `${a.deadline.id}_${a.daysLeft}`),
      ]))
    }
  }, [deadlines]) // eslint-disable-line

  const handleFiscalPaid = (tx) => {
    addTransaction({ ...tx, id: `fiscal_${Date.now()}` }, byName)
  }

  const [showTxModal, setShowTxModal] = useState(false)
  const [defaultType, setDefaultType] = useState('entree')
  const [txFilter, setTxFilter] = useState('all')
  const [exporting, setExporting] = useState(false)
  const [selectedJournalYear, setSelectedJournalYear] = useState(new Date().getFullYear())
  const [expandedMonths, setExpandedMonths] = useState(() => {
    const now = new Date()
    return { [`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`]: true }
  })
  const [showChargeModal, setShowChargeModal] = useState(false)
  const [editingCharge, setEditingCharge] = useState(null)
  const [payFilter, setPayFilter] = useState('tous')
  const [projectSearch, setProjectSearch] = useState('')
  const [showPayFilterMenu, setShowPayFilterMenu] = useState(false)
  const [showTxFilterMenu, setShowTxFilterMenu]   = useState(false)
  const [tauxInput, setTauxInput] = useState(String(tauxImpot))

  const [caObjectif, setCaObjectif] = useState(() => {
    try { const s = localStorage.getItem('clade_ca_objectif'); if (s) return parseFloat(s) } catch {}
    return 2000000
  })
  const [caObjectifInput, setCaObjectifInput] = useState(() => {
    try { const s = localStorage.getItem('clade_ca_objectif'); if (s) return s } catch {}
    return '2000000'
  })

  // ── Monthly aggregation ──
  const monthlyData = useMemo(() => {
    const map = {}
    for (const tx of allTransactions) {
      const key = tx.date.slice(0, 7)
      if (!map[key]) map[key] = { key, entrees: 0, sorties: 0 }
      if (tx.type === 'entree') map[key].entrees += tx.montant || 0
      else map[key].sorties += tx.montant || 0
    }
    return Object.values(map)
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(d => ({ ...d, profit: d.entrees - d.sorties }))
  }, [allTransactions])

  const caChartData = useMemo(() =>
    monthlyData.slice(-9).map(d => ({
      name: MONTHS_SHORT[parseInt(d.key.slice(5, 7), 10) - 1],
      CA: d.entrees,
      txs: allTransactions
        .filter(tx => tx.type === 'entree' && tx.date?.startsWith(d.key))
        .sort((a, b) => a.date.localeCompare(b.date)),
    })), [monthlyData, allTransactions])

  const currentYear = new Date().getFullYear()
  const rentaData = useMemo(() =>
    monthlyData
      .filter(d => d.key.startsWith(String(currentYear)))
      .map(d => ({
        name: MONTHS_SHORT[parseInt(d.key.slice(5, 7), 10) - 1],
        Entrées: d.entrees,
        Sorties: d.sorties,
        Profit: d.profit,
      })),
    [monthlyData, currentYear])

  const totalCaYear = rentaData.reduce((s, d) => s + d.Entrées, 0)
  const pctObjectif = caObjectif > 0 ? Math.round((totalCaYear / caObjectif) * 100) : 0

  const lastCA = caChartData.at(-1)?.CA ?? 0
  const prevCA = caChartData.at(-2)?.CA ?? 0
  const caGrowth = prevCA > 0 ? ((lastCA - prevCA) / prevCA) * 100 : 0

  const encouragement = caGrowth > 15
    ? { text: 'Performance exceptionnelle !', sub: `+${caGrowth.toFixed(0)}% vs mois précédent — CLADE est en forte accélération.` }
    : caGrowth > 3
    ? { text: 'Belle progression ce mois !', sub: `+${caGrowth.toFixed(0)}% — Le cabinet maintient une belle dynamique de croissance.` }
    : caGrowth >= -3
    ? { text: 'Activité stable et maîtrisée.', sub: 'Le flux de trésorerie reste solide. Chaque mission consolide la position du cabinet.' }
    : { text: 'Continuez à avancer.', sub: `${caGrowth.toFixed(0)}% ce mois — Chaque projet en cours est une opportunité à venir.` }

  // ── KPIs ──
  const totalEntrees = useMemo(() =>
    allTransactions.filter(t => t.type === 'entree').reduce((s, t) => s + (t.montant || 0), 0), [allTransactions])
  const totalSorties = useMemo(() =>
    allTransactions.filter(t => t.type === 'sortie').reduce((s, t) => s + (t.montant || 0), 0), [allTransactions])
  const resultatBrut = totalEntrees - totalSorties
  const impot = resultatBrut > 0 ? resultatBrut * (tauxImpot / 100) : 0
  const resultatNet = resultatBrut - impot

  const externalProjects = useMemo(() => projects.filter(p => p.typeProjet !== 'interne'), [projects])

  const pendingTotal = useMemo(() =>
    externalProjects.reduce((sum, p) => {
      const missions = (p.missions || []).filter(m => m.type === 'mission')
      return missions.reduce((s, m) => {
        const pai = p.finances?.paiements?.[m.id]
        const hon = p.finances?.honoraires?.[m.id] || 0
        return (pai === 'en_cours' || pai === 'non_paye' || !pai) && hon ? s + hon : s
      }, sum)
    }, 0), [externalProjects])

  // ── Project payment % ──
  const projectsWithPct = useMemo(() =>
    externalProjects.map(p => {
      const missions = (p.missions || []).filter(m => m.type === 'mission')
      const totalHon = missions.reduce((s, m) => s + (p.finances?.honoraires?.[m.id] || 0), 0)
      const paidHon = missions.reduce((s, m) =>
        p.finances?.paiements?.[m.id] === 'paye' ? s + (p.finances?.honoraires?.[m.id] || 0) : s, 0)
      const pct = totalHon > 0 ? Math.round((paidHon / totalHon) * 100) : 0
      return { ...p, totalHon, paidHon, pct }
    }), [externalProjects])

  const filteredProjectsWithPct = useMemo(() => {
    return projectsWithPct
      .filter(p => {
        if (payFilter === 'paye') return p.pct === 100
        if (payFilter === 'en_cours') return p.pct > 0 && p.pct < 100
        if (payFilter === 'non_paye') return p.pct === 0
        return true
      })
      .filter(p => !projectSearch.trim() ||
        p.nom?.toLowerCase().includes(projectSearch.toLowerCase()) ||
        p.client?.toLowerCase().includes(projectSearch.toLowerCase())
      )
  }, [projectsWithPct, payFilter, projectSearch])

  // ── Available years in data ──
  const availableYears = useMemo(() => {
    const years = new Set(allTransactions.map(t => parseInt(t.date.slice(0, 4), 10)))
    return [...years].sort((a, b) => b - a)
  }, [allTransactions])

  // ── Journal grouped by month, filtered by selected year ──
  const journalByMonth = useMemo(() => {
    const filtered = allTransactions
      .filter(t => t.date.startsWith(String(selectedJournalYear)))
      .filter(t => txFilter === 'all' || t.type === txFilter)
    const groups = {}
    for (const tx of filtered) {
      const key = tx.date.slice(0, 7)
      if (!groups[key]) groups[key] = []
      groups[key].push(tx)
    }
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, txs]) => {
        const [year, month] = key.split('-')
        const entrees = txs.filter(t => t.type === 'entree').reduce((s, t) => s + (t.montant || 0), 0)
        const sorties = txs.filter(t => t.type === 'sortie').reduce((s, t) => s + (t.montant || 0), 0)
        return { key, label: `${MONTHS_FR[parseInt(month, 10) - 1]} ${year}`, txs, entrees, sorties }
      })
  }, [allTransactions, txFilter, selectedJournalYear])

  const changeJournalYear = (year) => {
    setSelectedJournalYear(year)
    // Auto-expand the most recent month of the new year that has data
    const mostRecentKey = allTransactions
      .filter(t => t.date.startsWith(String(year)))
      .map(t => t.date.slice(0, 7))
      .sort((a, b) => b.localeCompare(a))[0]
    setExpandedMonths(mostRecentKey ? { [mostRecentKey]: true } : {})
  }

  const toggleMonth = (key) =>
    setExpandedMonths(prev => ({ ...prev, [key]: !prev[key] }))

  const handleDelete = (tx) => {
    if (tx.auto) { toast.error('Transaction générée automatiquement'); return }
    toast((t) => (
      <div className="flex items-center gap-3">
        <span className="text-sm truncate max-w-[180px]">Supprimer <strong>{tx.libelle}</strong> ?</span>
        <button onClick={() => { removeTransaction(tx.id, byName); toast.dismiss(t.id); toast.success('Transaction supprimée') }}
          className="text-xs bg-rose-500 text-white px-3 py-1.5 rounded-lg font-semibold flex-shrink-0 hover:bg-rose-600">Supprimer</button>
        <button onClick={() => toast.dismiss(t.id)} className="text-xs text-muted flex-shrink-0">Annuler</button>
      </div>
    ), { duration: 6000 })
  }

  const handleDeleteCharge = (charge) => {
    toast((t) => (
      <div className="flex items-center gap-3">
        <span className="text-sm truncate max-w-[180px]">Supprimer <strong>{charge.libelle}</strong> ?</span>
        <button onClick={() => { deleteChargeFixe(charge.id, byName); toast.dismiss(t.id); toast.success('Charge supprimée') }}
          className="text-xs bg-rose-500 text-white px-3 py-1.5 rounded-lg font-semibold flex-shrink-0 hover:bg-rose-600">Supprimer</button>
        <button onClick={() => toast.dismiss(t.id)} className="text-xs text-muted flex-shrink-0">Annuler</button>
      </div>
    ), { duration: 6000 })
  }

  const handleExport = () => {
    setExporting(true)
    try { exportTransactionsExcel(allTransactions); toast.success('Bilan exporté') }
    catch { toast.error('Erreur export') }
    finally { setExporting(false) }
  }

  const handleTauxSave = () => {
    const val = parseFloat(tauxInput)
    if (isNaN(val) || val < 0 || val > 100) { toast.error('Taux invalide (0–100)'); return }
    setTauxImpot(val)
    toast.success('Taux IS enregistré')
  }

  const handleObjectifSave = () => {
    const val = parseFloat(caObjectifInput)
    if (isNaN(val) || val <= 0) { toast.error('Objectif invalide'); return }
    setCaObjectif(val)
    try { localStorage.setItem('clade_ca_objectif', String(val)) } catch {}
    toast.success('Objectif CA enregistré')
  }

  const activeSalaries = employes.filter(e => e.statut === 'actif' && e.salaireBrut > 0)
  const totalSalaires = activeSalaries.reduce((s, e) => s + (e.salaireBrut || 0), 0)
  const totalChargesFixe = chargesFixe.reduce((s, c) => s + (c.montant || 0), 0)

  const KPIS = [
    { label: 'Total produits', value: fmtMADShort(totalEntrees), icon: TrendingUp, color: '#10B981', sub: 'Exercice en cours' },
    { label: 'Total charges', value: fmtMADShort(totalSorties), icon: TrendingDown, color: '#F43F5E', sub: 'Exercice en cours' },
    { label: 'Résultat brut', value: fmtMADShort(resultatBrut), icon: Wallet, color: resultatBrut >= 0 ? '#3B82F6' : '#F43F5E', sub: resultatBrut >= 0 ? 'Avant IS' : 'Déficit' },
    { label: `Résultat net IS ${tauxImpot}%`, value: fmtMADShort(resultatNet), icon: Scale, color: resultatNet >= 0 ? '#8B5CF6' : '#F43F5E', sub: resultatNet >= 0 ? 'Après impôt' : 'Déficit net' },
    { label: 'Honoraires à encaisser', value: fmtMADShort(pendingTotal), icon: Clock, color: '#F59E0B', sub: 'En attente / Non payés' },
  ]

  const objectifColor = pctObjectif >= 100 ? '#10B981' : pctObjectif >= 70 ? '#3B82F6' : pctObjectif >= 40 ? '#F59E0B' : '#F43F5E'

  return (
    <div className="p-4 lg:p-10 space-y-6">

      {/* ══════════════════════════════════════════════════════
          CHARTS ROW
      ══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* ── Card 1 : CA Trend ── */}
        <div className="card p-5 lg:col-span-2 flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="label-text mb-0.5">Chiffre d'affaires {currentYear}</div>
              <div className="font-display text-2xl text-ink leading-none">{fmtMADShort(totalCaYear)}</div>
            </div>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-electric/10">
              <TrendingUp size={15} className="text-electric" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Sparkles size={12} className={caGrowth >= 0 ? 'text-emerald-500' : 'text-amber-500'} />
            <span className="text-xs font-semibold text-ink">{encouragement.text}</span>
          </div>
          <p className="text-[11px] text-muted leading-relaxed -mt-1">{encouragement.sub}</p>

          <div className="h-[110px] -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={caChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="caGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis hide tickFormatter={fmtK} />
                <Tooltip content={<CaTooltip />} cursor={{ stroke: '#3B82F6', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area
                  type="monotone" dataKey="CA" name="CA"
                  stroke="#3B82F6" strokeWidth={2}
                  fill="url(#caGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#3B82F6', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Card 2 : CA Objectif ── */}
        <div className="card p-5 lg:col-span-1 flex flex-col items-center justify-between gap-3">
          <div className="w-full flex items-center justify-between">
            <div>
              <div className="label-text mb-0.5">Objectif CA</div>
              <div className="text-sm font-semibold text-ink">{fmtK(caObjectif)} MAD</div>
            </div>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-amber-50">
              <Target size={15} className="text-amber-500" />
            </div>
          </div>

          {/* Circle */}
          <div className="relative flex-shrink-0">
            <CircleProgress pct={pctObjectif} size={116} stroke={11} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-2xl leading-none" style={{ color: objectifColor }}>
                {pctObjectif}%
              </span>
              <span className="text-[10px] text-muted mt-0.5">atteint</span>
            </div>
          </div>

          <div className="w-full">
            <div className="text-[10px] text-muted mb-1.5 text-center">
              {fmtK(totalCaYear)} / {fmtK(caObjectif)} MAD
            </div>
            <div className="flex gap-1.5">
              <input
                type="number"
                min="0"
                step="100000"
                className="input-field text-xs py-1.5 flex-1 min-w-0"
                placeholder="Objectif"
                value={caObjectifInput}
                onChange={e => setCaObjectifInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleObjectifSave()}
              />
              <button
                onClick={handleObjectifSave}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-ink text-paper hover:opacity-90 transition-opacity flex-shrink-0"
              >OK</button>
            </div>
          </div>
        </div>

        {/* ── Card 3 : Rentabilité mensuelle ── */}
        <div className="card p-5 lg:col-span-2 flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="label-text mb-0.5">Rentabilité {currentYear}</div>
              <div className="font-display text-2xl text-ink leading-none">
                <span className={resultatBrut >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                  {resultatBrut >= 0 ? '+' : ''}{fmtK(resultatBrut)} MAD
                </span>
              </div>
            </div>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${resultatBrut >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
              <Scale size={15} className={resultatBrut >= 0 ? 'text-emerald-500' : 'text-rose-500'} />
            </div>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 flex-shrink-0" /> Entrées
            </span>
            <span className="flex items-center gap-1 text-rose-500 font-semibold">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-400 flex-shrink-0" /> Sorties
            </span>
            <span className="flex items-center gap-1 text-ink font-semibold ml-auto">
              <span className="w-2.5 h-0.5 bg-ink rounded flex-shrink-0" /> Profit
            </span>
          </div>

          <div className="h-[110px] -mx-1">
            {rentaData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted">
                Aucune donnée pour {currentYear}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rentaData} barGap={1} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<RentaTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                  <ReferenceLine y={0} stroke="#E2E8F0" strokeWidth={1} />
                  <Bar dataKey="Entrées" fill="#34D399" radius={[2, 2, 0, 0]} maxBarSize={14} />
                  <Bar dataKey="Sorties" fill="#FB7185" radius={[2, 2, 0, 0]} maxBarSize={14} />
                  {rentaData.map((d, i) => null)}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ══ KPIs ══ */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {KPIS.map((k, i) => {
          const Icon = k.icon
          const isMain = i === 0
          return (
            <div
              key={i}
              className={`card p-4 lg:p-5 animate-slide-up ${isMain ? 'col-span-2 lg:col-span-1 flex items-center gap-4 lg:flex-col lg:items-start' : ''}`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 lg:mb-3" style={{ background: `${k.color}18` }}>
                <Icon size={isMain ? 18 : 16} color={k.color} strokeWidth={1.8} />
              </div>
              <div className={isMain ? '' : 'mt-0'}>
                <div className={`font-display text-ink leading-none mb-1 ${isMain ? 'text-2xl lg:text-xl' : 'text-lg lg:text-xl'}`}>{k.value}</div>
                <div className="text-xs text-muted">{k.label}</div>
                <div className="text-[10px] text-muted/70 mt-0.5">{k.sub}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Project list ── */}
      <div className="card p-5 lg:p-7">
        {/* Title row: title + filter icon (mobile) + search */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex-shrink-0">
            <div className="label-text mb-1">Projets externes</div>
            <div className="font-display text-xl text-ink">Suivi des paiements</div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Filter icon — mobile only */}
            <div className="relative lg:hidden">
              {showPayFilterMenu && (
                <div className="fixed inset-0 z-10" onClick={() => setShowPayFilterMenu(false)} />
              )}
              <button
                onClick={() => setShowPayFilterMenu(o => !o)}
                className={`flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  payFilter !== 'tous'
                    ? 'bg-electric text-white border-transparent'
                    : 'bg-paper-warm border-border text-muted hover:text-ink'
                }`}
              >
                <Filter size={13} />
                {payFilter !== 'tous' && (
                  <span className="max-w-[56px] truncate">
                    {{ tous: 'Tous', non_paye: 'Non payé', en_cours: 'En cours', paye: 'Payé' }[payFilter]}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {showPayFilterMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    transition={{ duration: 0.13 }}
                    className="absolute top-full right-0 mt-1.5 bg-white border border-border rounded-2xl shadow-xl overflow-hidden z-20 w-44"
                  >
                    {[
                      { key: 'tous',     label: 'Tous',      count: projectsWithPct.length,                                           dot: null },
                      { key: 'non_paye', label: 'Non payé',  count: projectsWithPct.filter(p => p.pct === 0).length,              dot: 'bg-rose-400' },
                      { key: 'en_cours', label: 'En cours',  count: projectsWithPct.filter(p => p.pct > 0 && p.pct < 100).length, dot: 'bg-electric' },
                      { key: 'paye',     label: 'Payé',      count: projectsWithPct.filter(p => p.pct === 100).length,             dot: 'bg-emerald-500' },
                    ].map(f => (
                      <button
                        key={f.key}
                        onClick={() => { setPayFilter(f.key); setShowPayFilterMenu(false) }}
                        className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                          payFilter === f.key ? 'bg-paper-warm font-semibold text-ink' : 'text-muted hover:bg-paper-warm/60 hover:text-ink'
                        }`}
                      >
                        {f.dot && <span className={`w-2 h-2 rounded-full flex-shrink-0 ${f.dot}`} />}
                        <span className="flex-1 text-left">{f.label}</span>
                        <span className="text-[10px] text-muted">{f.count}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {/* Search */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                value={projectSearch}
                onChange={e => setProjectSearch(e.target.value)}
                placeholder="Rechercher…"
                className="w-36 lg:w-44 pl-8 pr-3 py-2 text-sm bg-paper-warm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-electric/30 focus:border-electric/50 transition-all"
              />
            </div>
          </div>
        </div>
        {/* Filter chips — desktop only */}
        <div className="hidden lg:flex items-center gap-2 flex-wrap mb-5">
          {[
            { key: 'tous',     label: 'Tous',      count: projectsWithPct.length,                                           dot: null,           active: 'bg-ink text-paper' },
            { key: 'non_paye', label: 'Non payé',  count: projectsWithPct.filter(p => p.pct === 0).length,              dot: 'bg-rose-400',    active: 'bg-rose-500 text-white' },
            { key: 'en_cours', label: 'En cours',  count: projectsWithPct.filter(p => p.pct > 0 && p.pct < 100).length, dot: 'bg-electric',    active: 'bg-electric text-white' },
            { key: 'paye',     label: 'Payé',      count: projectsWithPct.filter(p => p.pct === 100).length,             dot: 'bg-emerald-500', active: 'bg-emerald-600 text-white' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setPayFilter(f.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                payFilter === f.key
                  ? f.active
                  : 'bg-paper-warm text-muted hover:text-ink hover:bg-white border border-border'
              }`}
            >
              {f.dot && <span className={`w-1.5 h-1.5 rounded-full ${f.dot}`} />}
              {f.label}
              <span className="text-[10px] opacity-70">{f.count}</span>
            </button>
          ))}
        </div>

        {projectsWithPct.length === 0 ? (
          <div className="text-sm text-muted py-8 text-center border border-dashed border-border rounded-xl">
            Aucun projet externe enregistré
          </div>
        ) : filteredProjectsWithPct.length === 0 ? (
          <div className="text-sm text-muted py-8 text-center border border-dashed border-border rounded-xl">
            {projectSearch.trim() ? `Aucun résultat pour "${projectSearch}".` : 'Aucun projet dans cette catégorie.'}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredProjectsWithPct.map((p, i) => (
              <div
                key={p.id}
                onClick={() => navigate(`/app/finance/${p.id}`)}
                className="flex items-center gap-4 p-3.5 rounded-xl hover:bg-paper-warm cursor-pointer transition-all animate-slide-up group"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-semibold text-ink truncate">{p.nom}</span>
                    <span className="text-xs text-muted flex-shrink-0">{p.client}</span>
                    {p.pct === 100 && (
                      <span className="flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Payé</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${p.pct === 100 ? 'bg-emerald-500' : p.pct > 0 ? 'bg-electric' : 'bg-border'}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${p.pct}%` }}
                        transition={{ duration: 0.7, delay: i * 0.05 }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-ink w-10 text-right flex-shrink-0">{p.pct}%</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-semibold text-emerald-600">{fmtMADShort(p.paidHon)}</div>
                  <div className="text-[10px] text-muted">/ {fmtMADShort(p.totalHon)}</div>
                </div>
                <ArrowRight size={15} className="text-muted group-hover:text-ink transition-colors flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Transaction journal (month by month) ── */}
      <div className="card p-5 lg:p-7">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
          <div className="flex items-start justify-between gap-3 sm:block">
            <div>
              <div className="label-text mb-1">Journal de trésorerie</div>
              <div className="font-display text-xl text-ink">Historique mois par mois</div>
            </div>
            {/* Year navigator — right on mobile, hidden on sm+ (shown in right column) */}
            <div className="flex sm:hidden items-center gap-1 bg-paper-warm border border-border rounded-xl p-1 flex-shrink-0">
                <button
                  onClick={() => {
                    const idx = availableYears.indexOf(selectedJournalYear)
                    if (idx < availableYears.length - 1) changeJournalYear(availableYears[idx + 1])
                  }}
                  disabled={availableYears.indexOf(selectedJournalYear) >= availableYears.length - 1}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-white transition-colors disabled:opacity-30"
                >
                  <ChevronDown size={14} className="rotate-90" />
                </button>
                <span className="font-display text-base text-ink px-2 min-w-[52px] text-center select-none">
                  {selectedJournalYear}
                </span>
                <button
                  onClick={() => {
                    const idx = availableYears.indexOf(selectedJournalYear)
                    if (idx > 0) changeJournalYear(availableYears[idx - 1])
                  }}
                  disabled={availableYears.indexOf(selectedJournalYear) <= 0}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-white transition-colors disabled:opacity-30"
                >
                  <ChevronDown size={14} className="-rotate-90" />
                </button>
              </div>
          </div>
          {/* Toolbar — ligne unique sur mobile */}
          <div className="flex items-center gap-2">
            {/* Gauche : Entrée + Sortie */}
            <button onClick={() => { setDefaultType('entree'); setShowTxModal(true) }}
              className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
              <ChevronUp size={13} /> Entrée
            </button>
            <button onClick={() => { setDefaultType('sortie'); setShowTxModal(true) }}
              className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-rose-500 text-white hover:bg-rose-600 transition-colors">
              <ChevronDown size={13} /> Sortie
            </button>

            {/* Droite : filtre + export (ml-auto pousse à droite) */}
            <div className="flex items-center gap-2 ml-auto">
              {/* Filter icon — mobile */}
              <div className="relative lg:hidden">
                {showTxFilterMenu && (
                  <div className="fixed inset-0 z-10" onClick={() => setShowTxFilterMenu(false)} />
                )}
                <button
                  onClick={() => setShowTxFilterMenu(o => !o)}
                  className={`flex items-center gap-1 h-9 w-9 justify-center rounded-xl text-xs font-semibold border transition-all ${
                    txFilter !== 'all'
                      ? 'bg-ink text-paper border-transparent'
                      : 'bg-paper-warm border-border text-muted hover:text-ink'
                  }`}
                >
                  <Filter size={15} />
                </button>
                <AnimatePresence>
                  {showTxFilterMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.96 }}
                      transition={{ duration: 0.13 }}
                      className="absolute top-full right-0 mt-1.5 bg-white border border-border rounded-2xl shadow-xl overflow-hidden z-20 w-36"
                    >
                      {[
                        { key: 'all',    label: 'Tout',    dot: null },
                        { key: 'entree', label: 'Entrées', dot: 'bg-emerald-500' },
                        { key: 'sortie', label: 'Sorties', dot: 'bg-rose-400' },
                      ].map(f => (
                        <button
                          key={f.key}
                          onClick={() => { setTxFilter(f.key); setShowTxFilterMenu(false) }}
                          className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                            txFilter === f.key ? 'bg-paper-warm font-semibold text-ink' : 'text-muted hover:bg-paper-warm/60 hover:text-ink'
                          }`}
                        >
                          {f.dot && <span className={`w-2 h-2 rounded-full flex-shrink-0 ${f.dot}`} />}
                          <span>{f.label}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {/* Filter tabs — desktop only */}
              <div className="hidden lg:flex gap-1 bg-paper-warm rounded-xl p-1 border border-border">
                {[
                  { key: 'all', label: 'Tout' },
                  { key: 'entree', label: 'Entrées' },
                  { key: 'sortie', label: 'Sorties' },
                ].map(f => (
                  <button key={f.key} onClick={() => setTxFilter(f.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      txFilter === f.key ? 'bg-ink text-paper' : 'text-muted hover:text-ink'
                    }`}>{f.label}</button>
                ))}
              </div>
              {/* Export — icône seule sur mobile, texte sur sm+ */}
              <button onClick={handleExport} disabled={exporting}
                className="flex items-center gap-1.5 text-xs font-semibold h-9 px-2.5 rounded-xl border border-border text-muted hover:text-ink hover:border-ink/30 transition-colors disabled:opacity-50">
                <TableProperties size={14} />
                <span className="hidden sm:inline">Exporter bilan</span>
              </button>
            </div>
          </div>
        </div>

        {journalByMonth.length === 0 ? (
          <div className="text-center py-10 text-muted text-sm border border-dashed border-border rounded-xl">
            Aucune transaction{txFilter !== 'all' ? ' dans cette catégorie' : ''}
          </div>
        ) : (
          <div className="space-y-2">
            {journalByMonth.map(({ key, label, txs, entrees, sorties }) => {
              const isOpen = !!expandedMonths[key]
              const solde = entrees - sorties
              return (
                <div key={key} className="border border-border rounded-xl overflow-hidden">
                  <button onClick={() => toggleMonth(key)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-paper-warm transition-colors">
                    <div className="flex items-center gap-3">
                      <ChevronRight size={15} className={`text-muted transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                      <span className="font-semibold text-sm text-ink">{label}</span>
                      <span className="text-xs text-muted">{txs.length} opération{txs.length > 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-semibold text-emerald-700 hidden sm:block">+{fmtMADShort(entrees)}</span>
                      <span className="text-xs font-semibold text-rose-700 hidden sm:block">-{fmtMADShort(sorties)}</span>
                      <span className={`text-xs font-bold ${solde >= 0 ? 'text-ink' : 'text-rose-600'}`}>
                        {solde >= 0 ? '+' : ''}{fmtMADShort(solde)}
                      </span>
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-border">
                          <div className="hidden lg:block">
                            <div className="grid grid-cols-[110px_1fr_140px_130px_90px_36px] gap-3 px-4 py-2 bg-paper-warm/50">
                              <div className="label-text text-[10px]">Date</div>
                              <div className="label-text text-[10px]">Libellé</div>
                              <div className="label-text text-[10px]">Catégorie</div>
                              <div className="label-text text-[10px] text-right">Montant HT</div>
                              <div className="label-text text-[10px] text-right">TTC</div>
                              <div />
                            </div>
                            <div className="divide-y divide-border/40">
                              {txs.map(tx => {
                                const isE = tx.type === 'entree'
                                return (
                                  <div key={tx.id}
                                    className={`grid grid-cols-[110px_1fr_140px_130px_90px_36px] gap-3 items-center px-4 py-2.5 ${isE ? 'bg-emerald-50/40' : 'bg-rose-50/40'}`}>
                                    <div className="text-xs text-muted">
                                      {new Date(tx.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-sm text-ink truncate">{tx.libelle}</div>
                                      {tx.auto && <div className="text-[10px] text-muted/70">Auto</div>}
                                    </div>
                                    <div>
                                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${catColor(tx.type)}`}>
                                        {tx.categorie || '—'}
                                      </span>
                                    </div>
                                    <div className={`text-sm font-semibold text-right ${isE ? 'text-emerald-700' : 'text-rose-700'}`}>
                                      {isE ? '+' : '-'}{fmtMAD(tx.montant)}
                                    </div>
                                    <div className="text-xs text-right text-muted">
                                      {fmtMAD((tx.montant || 0) * 1.2)}
                                    </div>
                                    <button onClick={() => handleDelete(tx)}
                                      className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${tx.auto ? 'text-muted/30 cursor-not-allowed' : 'text-muted hover:text-rose-500 hover:bg-rose-50'}`}
                                      title={tx.auto ? 'Transaction automatique' : 'Supprimer'}>
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                          <div className="lg:hidden space-y-1.5 p-3">
                            {txs.map(tx => {
                              const isE = tx.type === 'entree'
                              return (
                                <div key={tx.id} className={`rounded-xl p-3 ${isE ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <div className="text-sm font-medium text-ink truncate flex-1">{tx.libelle}</div>
                                    <div className={`text-sm font-bold flex-shrink-0 ${isE ? 'text-emerald-700' : 'text-rose-700'}`}>
                                      {isE ? '+' : '-'}{fmtMAD(tx.montant)}
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] text-muted">{new Date(tx.date).toLocaleDateString('fr-FR')}</span>
                                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${catColor(tx.type)}`}>{tx.categorie}</span>
                                    </div>
                                    {!tx.auto && (
                                      <button onClick={() => handleDelete(tx)} className="text-muted hover:text-rose-500 transition-colors">
                                        <Trash2 size={13} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Charges fixes ── */}
      <div className="card p-5 lg:p-7">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="label-text mb-1">Charges récurrentes</div>
            <div className="font-display text-xl text-ink">Charges fixes</div>
          </div>
          <button
            onClick={() => { setEditingCharge(null); setShowChargeModal(true) }}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-ink text-paper hover:opacity-90 transition-opacity"
          >
            <Plus size={13} /> <span className="hidden sm:inline">Ajouter</span>
          </button>
        </div>

        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Users size={14} className="text-muted" />
            <span className="label-text">Masse salariale — Personnel actif</span>
            <span className="text-xs text-muted ml-auto">{fmtMADShort(totalSalaires)} / mois</span>
          </div>
          {activeSalaries.length === 0 ? (
            <div className="text-sm text-muted py-3 text-center border border-dashed border-border rounded-xl">
              Aucun employé actif avec salaire défini
            </div>
          ) : (
            <div className="space-y-1.5">
              {activeSalaries.map(e => (
                <div key={e.id} className="flex items-center justify-between px-4 py-2.5 bg-paper-warm rounded-xl">
                  <div className="flex items-center gap-3">
                    {e.photo
                      ? <img src={e.photo} alt="" className="w-7 h-7 rounded-full object-cover" />
                      : <div className="w-7 h-7 rounded-full bg-border flex items-center justify-center text-xs font-bold text-muted">
                          {e.prenom?.[0]}{e.nom?.[0]}
                        </div>
                    }
                    <div>
                      <div className="text-sm font-semibold text-ink">{e.nom}</div>
                      <div className="text-[10px] text-muted">{e.poste}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-rose-700">{fmtMAD(e.salaireBrut)}</div>
                    <div className="text-[10px] text-muted">Mensuel · Auto</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Repeat size={14} className="text-muted" />
            <span className="label-text">Charges fixes manuelles</span>
            <span className="text-xs text-muted ml-auto">{fmtMADShort(totalChargesFixe)} / période</span>
          </div>
          {chargesFixe.length === 0 ? (
            <div className="text-sm text-muted py-3 text-center border border-dashed border-border rounded-xl">
              Aucune charge fixe. Cliquez sur "Ajouter".
            </div>
          ) : (
            <div className="space-y-1.5">
              {chargesFixe.map(c => (
                <div key={c.id} className="flex items-center justify-between px-4 py-2.5 bg-rose-50/60 border border-rose-100 rounded-xl group">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-ink truncate">{c.libelle}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted">{PERIODICITE_LABEL[c.periodicite] || c.periodicite}</span>
                      <span className="text-[10px] text-rose-600 font-medium">{c.categorie}</span>
                      <span className="text-[10px] text-muted">depuis {new Date(c.dateDebut).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <div className="text-sm font-semibold text-rose-700">{fmtMAD(c.montant)}</div>
                    <button onClick={() => { setEditingCharge(c); setShowChargeModal(true) }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-paper-warm transition-colors opacity-0 group-hover:opacity-100">
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => handleDeleteCharge(c)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-rose-500 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Taux IS ── */}
      <div className="card p-5 lg:p-7">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-violet-50">
            <Percent size={16} className="text-violet-600" />
          </div>
          <div>
            <div className="label-text mb-0.5">Fiscalité</div>
            <div className="font-display text-lg text-ink">Impôt sur les Sociétés (IS)</div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 items-end">
          <div className="col-span-2 sm:col-span-1 flex flex-col items-center sm:items-start">
            <label className="label-text mb-1.5 block">Taux IS (%)</label>
            <div className="flex gap-2">
              <input type="number" min="0" max="100" step="0.5" className="input-field w-28"
                value={tauxInput} onChange={e => setTauxInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleTauxSave()} />
              <button onClick={handleTauxSave}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-colors">
                Appliquer
              </button>
            </div>
          </div>
          <div className="bg-paper-warm border border-border rounded-xl px-4 py-3 min-h-[72px] flex flex-col justify-center">
            <div className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-0.5">Résultat brut (avant IS)</div>
            <div className={`font-display text-xl ${resultatBrut >= 0 ? 'text-ink' : 'text-rose-600'}`}>
              {resultatBrut >= 0 ? '+' : ''}{fmtMADShort(resultatBrut)}
            </div>
          </div>
          <div className="bg-violet-50 border border-violet-100 rounded-xl px-4 py-3 min-h-[72px] flex flex-col justify-center">
            <div className="text-[10px] font-semibold text-violet-600 uppercase tracking-wide mb-0.5">
              Résultat net (après IS {tauxImpot}%)
            </div>
            <div className={`font-display text-xl ${resultatNet >= 0 ? 'text-violet-700' : 'text-rose-600'}`}>
              {resultatNet >= 0 ? '+' : ''}{fmtMADShort(resultatNet)}
            </div>
            {resultatBrut > 0 && <div className="text-[10px] text-violet-500 mt-0.5">IS : {fmtMADShort(impot)}</div>}
          </div>
        </div>
      </div>

      {/* ── Calendrier Fiscal ── */}
      <FiscalCalendar onTransactionAdd={handleFiscalPaid} />

      {/* ══ SYNTHÈSE PROJETS (directeur uniquement) ══ */}
      {isDir && (() => {
        const extProjects = projects.filter(p => p.typeProjet !== 'interne')
        const intProjects = projects.filter(p => p.typeProjet === 'interne')
        const tjh = agenceSettings?.tjh || 250
        return (
          <div className="card p-5 lg:p-7">
            <div className="mb-5">
              <div className="label-text mb-1">Vue directeur</div>
              <div className="font-display text-2xl text-ink">Synthèse financière des projets</div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Projets externes */}
              {extProjects.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Projets externes — Honoraires</div>
                  <div className="space-y-2">
                    {extProjects.map(p => {
                      const total = allTransactions.filter(tx => tx.type === 'entree' && tx.projectId === p.id).reduce((s, tx) => s + (tx.montant || 0), 0)
                      return (
                        <div key={p.id} className="flex items-center gap-3 p-3 bg-paper-warm rounded-xl">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-ink truncate">{p.nom}</div>
                            <div className="text-xs text-muted">{p.client}</div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm font-bold text-ink">{fmtMAD(total)}</div>
                            <div className="text-[10px] text-muted">encaissé</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {/* Projets internes */}
              {intProjects.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Projets internes — Investissement</div>
                  <div className="space-y-2">
                    {intProjects.map(p => {
                      const totalH = (p.tasks || []).reduce((s, t) => s + (t.heures || 0), 0)
                      const invest = totalH * tjh
                      return (
                        <div key={p.id} className="flex items-center gap-3 p-3 bg-violet-50/50 rounded-xl">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-ink truncate">{p.nom}</div>
                            <div className="text-xs text-muted">{totalH}h × {tjh} MAD/h</div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm font-bold text-violet-700">{fmtMAD(invest)}</div>
                            <div className="text-[10px] text-muted">investissement</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {extProjects.length === 0 && intProjects.length === 0 && (
                <div className="col-span-2 text-center py-8 text-muted text-sm">Aucun projet enregistré</div>
              )}
            </div>
          </div>
        )
      })()}

      {showTxModal && (
        <NouvelleTransactionModal defaultType={defaultType} onClose={() => setShowTxModal(false)} />
      )}
      {showChargeModal && (
        <NouvelleChargeFixeModal existing={editingCharge}
          onClose={() => { setShowChargeModal(false); setEditingCharge(null) }} />
      )}
    </div>
  )
}
