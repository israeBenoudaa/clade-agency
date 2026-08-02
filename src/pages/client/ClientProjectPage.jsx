import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Calendar, MapPin, ArrowRight, FolderOpen } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { useClientLang } from '../../context/ClientLangContext'
import { ProgressBar } from '../../components/ui'

const STATUT_KEYS = {
  en_cours: 'status.en_cours',
  termine:  'status.termine',
  pause:    'status.pause',
  prospect: 'status.prospect',
}
const STATUT_STYLE = {
  en_cours: { bg: 'bg-electric/10', text: 'text-electric' },
  termine:  { bg: 'bg-emerald-50',  text: 'text-emerald-700' },
  pause:    { bg: 'bg-amber-50',    text: 'text-amber-700' },
  prospect: { bg: 'bg-slate-100',   text: 'text-slate-600' },
}

export default function ClientProjectPage() {
  const { profile, prospectId } = useAuth()
  const { projects, prospects } = useData()
  const navigate = useNavigate()
  const { t } = useClientLang()

  const prospect = useMemo(() => {
    if (!prospectId) return null
    return prospects.find(p => p.id === prospectId)
  }, [prospectId, prospects])

  const clientProjects = useMemo(() => {
    if (!prospect) return []
    const name = `${prospect.prenom} ${prospect.nom}`
    return projects.filter(p =>
      p.prospectId === prospect.id ||
      p.clientId === prospect.id ||
      p.client === name
    )
  }, [prospect, projects])

  return (
    <div className="space-y-5 lg:space-y-7">
      <div>
        <div className="label-text mb-2">{t('portal.label')}</div>
        <h1 className="font-display text-3xl lg:text-5xl text-ink leading-none">{t('projects.title')}</h1>
        <p className="text-muted text-sm mt-3 max-w-xl">{t('projects.subtitle')}</p>
      </div>

      {clientProjects.length === 0 ? (
        <div className="card p-12 text-center">
          <FolderOpen size={32} className="text-muted mx-auto mb-4" />
          <div className="text-sm font-semibold text-ink mb-1">{t('projects.empty')}</div>
          <p className="text-xs text-muted">{t('projects.empty_sub')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {clientProjects.map((projet, i) => {
            const missions = (projet.missions || []).filter(m => m.type === 'mission')
            const currentMission = missions.find(m => m.statut !== 'valide')
            const sc = STATUT_STYLE[projet.statut] || STATUT_STYLE.en_cours
            const statusKey = STATUT_KEYS[projet.statut] || 'status.en_cours'
            return (
              <motion.button
                key={projet.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => navigate(`/client/projects/${projet.id}`)}
                className="card p-5 lg:p-6 w-full text-left hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
                        {t(statusKey)}
                      </span>
                    </div>
                    <div className="font-display text-xl lg:text-2xl text-ink truncate">{projet.nom}</div>
                    <div className="text-xs text-muted mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      {projet.type && <span>{projet.type}</span>}
                      {projet.localisation && projet.localisation !== '—' && (
                        <span className="flex items-center gap-1"><MapPin size={11} />{projet.localisation}</span>
                      )}
                      {projet.deadline && projet.deadline !== '—' && (
                        <span className="flex items-center gap-1"><Calendar size={11} />{projet.deadline}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-display text-3xl text-electric leading-none">{projet.avancement}%</div>
                      <div className="text-[10px] text-muted">{t('projects.completed')}</div>
                    </div>
                    <ArrowRight size={18} className="text-muted group-hover:text-ink transition-colors" />
                  </div>
                </div>
                <ProgressBar value={projet.avancement} color="#06B6D4" />
                {missions.length > 0 && (
                  <div className="mt-3 text-xs text-muted">
                    {currentMission
                      ? `${t('projects.mission_current')} ${currentMission.nom}`
                      : t('projects.missions_done')}
                    {' · '}
                    {missions.filter(m => m.statut === 'valide').length}/{missions.length} {t('projects.missions')}
                  </div>
                )}
              </motion.button>
            )
          })}
        </div>
      )}
    </div>
  )
}
