import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Clock, MapPin, Video, Phone, Users } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'

const fmtDate = (d) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—'

const FORMAT_CFG = {
  meet: { label: 'Google Meet', icon: Video, color: 'text-emerald-700', bg: 'bg-emerald-50' },
  telephonique: { label: 'Téléphonique', icon: Phone, color: 'text-sky-700', bg: 'bg-sky-50' },
  presentiel: { label: 'Présentiel', icon: MapPin, color: 'text-violet-700', bg: 'bg-violet-50' },
}

export default function ClientRdvsPage() {
  const { profile, prospectId } = useAuth()
  const { projects } = useData()

  const myRdvs = useMemo(() => {
    if (!prospectId) return []
    const myProjects = projects.filter(p =>
      p.prospectId === prospectId || p.clientId === prospectId
    )
    return myProjects.flatMap(p =>
      (p.missions || [])
        .filter(m =>
          m.type === 'rdv' &&
          (m.clientIds || []).map(String).includes(String(prospectId))
        )
        .map(m => ({ ...m, projectNom: p.nom, projectId: p.id }))
    ).sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  }, [projects, prospectId])

  const now = new Date().toISOString().slice(0, 10)
  const upcoming = myRdvs.filter(r => r.date >= now)
  const past = myRdvs.filter(r => r.date < now)

  return (
    <div className="space-y-7">
      <div>
        <div className="label-text mb-2">◆ Portail Client</div>
        <h1 className="font-display text-3xl lg:text-5xl text-ink leading-none">Mes rendez-vous</h1>
      </div>

      {myRdvs.length === 0 ? (
        <div className="card p-10 text-center">
          <Calendar size={36} className="text-muted mx-auto mb-3" strokeWidth={1.5} />
          <div className="font-semibold text-ink mb-1">Aucun rendez-vous planifié</div>
          <p className="text-sm text-muted">Les rendez-vous créés par votre équipe apparaîtront ici.</p>
        </div>
      ) : (
        <div className="space-y-7">
          {upcoming.length > 0 && (
            <div>
              <div className="label-text mb-3">À venir</div>
              <div className="space-y-3">
                {upcoming.map((rdv, i) => <RdvCard key={rdv.id} rdv={rdv} i={i} />)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <div className="label-text mb-3">Passés</div>
              <div className="space-y-3 opacity-60">
                {past.slice().reverse().map((rdv, i) => <RdvCard key={rdv.id} rdv={rdv} i={i} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function RdvCard({ rdv, i }) {
  const fmt = FORMAT_CFG[rdv.format] || null
  const FormatIcon = fmt?.icon
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04 }}
      className="card p-5 flex items-start gap-4"
    >
      <div className="w-12 h-12 rounded-2xl bg-electric/10 flex flex-col items-center justify-center flex-shrink-0">
        <span className="text-[10px] text-electric font-bold uppercase leading-tight">
          {rdv.date ? new Date(rdv.date + 'T00:00:00').toLocaleDateString('fr-FR', { month: 'short' }) : ''}
        </span>
        <span className="font-display text-xl text-electric leading-none">
          {rdv.date ? new Date(rdv.date + 'T00:00:00').getDate() : ''}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-ink text-base mb-1">{rdv.nom}</div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <span className="flex items-center gap-1">
            <Calendar size={13} className="flex-shrink-0" />
            {fmtDate(rdv.date)}
          </span>
          {rdv.heureDebut && (
            <span className="flex items-center gap-1">
              <Clock size={13} className="flex-shrink-0" />
              {rdv.heureDebut}{rdv.heureFin ? ` – ${rdv.heureFin}` : ''}
            </span>
          )}
          {fmt && (
            <span className={`flex items-center gap-1 font-medium ${fmt.color}`}>
              {FormatIcon && <FormatIcon size={13} className="flex-shrink-0" />}
              {fmt.label}
            </span>
          )}
        </div>
        {rdv.projectNom && (
          <div className="mt-1.5 text-xs text-muted flex items-center gap-1">
            <Users size={11} className="flex-shrink-0" />
            Projet : <span className="font-semibold text-ink ml-1">{rdv.projectNom}</span>
          </div>
        )}
        {rdv.description && (
          <p className="mt-2 text-sm text-muted leading-relaxed">{rdv.description}</p>
        )}
        {rdv.format === 'meet' && (
          <a
            href="https://meet.google.com/new"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-semibold hover:bg-emerald-600 transition-colors"
          >
            <Video size={12} /> Rejoindre Google Meet
          </a>
        )}
      </div>
    </motion.div>
  )
}
