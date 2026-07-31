import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, CheckCircle2, Clock, AlertCircle, FileText, Wallet } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'

const fmtDH = (n) =>
  Number(n || 0).toLocaleString('fr-MA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' DH'

const PAIEMENT_STYLE = {
  paye:     { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Payé',       icon: CheckCircle2, iconColor: '#059669' },
  en_cours: { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    label: 'En cours',   icon: Clock,        iconColor: '#2563EB' },
  non_paye: { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   label: 'En attente', icon: AlertCircle,  iconColor: '#D97706' },
}

export default function ClientProjectFinancePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { projects } = useData()
  const { prospectId } = useAuth()

  const projet = projects.find(p => String(p.id) === id && String(p.prospectId) === String(prospectId))

  if (!projet) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted hover:text-ink">
          <ArrowLeft size={15} /> Retour
        </button>
        <div className="card p-12 text-center text-muted">Projet introuvable.</div>
      </div>
    )
  }

  const missions = (projet.missions || []).filter(m => m.type === 'mission')
  const honoraires = projet.finances?.honoraires ?? {}
  const paiements = projet.finances?.paiements ?? {}
  const factures = projet.finances?.factures ?? []

  const totalHT = missions.reduce((s, m) => s + (honoraires[m.id] || 0), 0)
  const paidHT = missions.reduce((s, m) => paiements[m.id] === 'paye' ? s + (honoraires[m.id] || 0) : s, 0)
  const remainingHT = totalHT - paidHT

  const kpis = [
    { label: 'Total honoraires HT', value: fmtDH(totalHT),     color: 'text-electric',     bg: 'bg-electric/10', Icon: Wallet      },
    { label: 'Honoraires réglés',   value: fmtDH(paidHT),      color: 'text-emerald-600',  bg: 'bg-emerald-50',  Icon: CheckCircle2 },
    { label: 'Reste à régler',      value: fmtDH(remainingHT), color: 'text-amber-600',    bg: 'bg-amber-50',    Icon: AlertCircle  },
  ]

  return (
    <div className="space-y-5 lg:space-y-7">
      <button onClick={() => navigate(`/client/projects/${id}`)}
        className="flex items-center gap-2 text-sm text-muted hover:text-ink transition-colors">
        <ArrowLeft size={15} /> Retour au projet
      </button>

      <div>
        <div className="label-text mb-2">◆ Détail financier</div>
        <h1 className="font-display text-3xl lg:text-4xl text-ink leading-none">{projet.nom}</h1>
        <p className="text-muted text-sm mt-2">Suivi de vos honoraires et échéances de paiement</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpis.map(({ label, value, color, bg, Icon }, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="card p-5 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
              <Icon size={18} className={color} />
            </div>
            <div>
              <div className="label-text mb-0.5">{label}</div>
              <div className={`font-display text-2xl ${color}`}>{value}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Missions table */}
      <div className="card p-5 lg:p-7">
        <div className="mb-5">
          <div className="label-text mb-1">Honoraires</div>
          <div className="font-display text-xl text-ink">Détail par mission</div>
        </div>

        {missions.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-border rounded-xl text-sm text-muted">
            Aucune mission définie pour ce projet.
          </div>
        ) : (
          <div className="space-y-3">
            {missions.map((m, i) => {
              const montant = honoraires[m.id] || 0
              const statut = paiements[m.id] || 'non_paye'
              const style = PAIEMENT_STYLE[statut] || PAIEMENT_STYLE.non_paye
              const { icon: Icon, iconColor } = style
              return (
                <motion.div key={m.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className={`flex items-center gap-4 p-4 rounded-xl border ${style.bg} ${style.border}`}>
                  <div className="w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center flex-shrink-0">
                    <Icon size={18} style={{ color: iconColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-ink">{m.nom}</div>
                    <div className={`text-xs mt-0.5 ${style.text}`}>{style.label}</div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className={`font-display text-xl ${style.text}`}>{fmtDH(montant)}</div>
                  </div>
                </motion.div>
              )
            })}
            <div className="flex items-center justify-between px-4 pt-4 border-t border-border">
              <span className="text-sm font-semibold text-ink">Total HT</span>
              <span className="font-display text-2xl text-electric">{fmtDH(totalHT)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Factures */}
      {factures.length > 0 && (
        <div className="card p-5 lg:p-7">
          <div className="mb-5">
            <div className="label-text mb-1">Documents</div>
            <div className="font-display text-xl text-ink">Factures</div>
          </div>
          <div className="space-y-3">
            {factures.map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:bg-paper-warm transition-colors">
                <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0">
                  <FileText size={16} className="text-rose-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-ink truncate">{f.nom || f}</div>
                  {f.date && <div className="text-xs text-muted">{f.date}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
