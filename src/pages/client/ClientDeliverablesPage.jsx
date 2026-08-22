import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { FileText, ExternalLink, FolderOpen, Download, CalendarDays, ArrowLeft, ChevronRight, File, CheckCircle } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { useClientLang } from '../../context/ClientLangContext'

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : null

const EXT_COLORS = {
  pdf:  { bg: '#FEE2E2', fg: '#991B1B' },
  dwg:  { bg: '#DBEAFE', fg: '#1E3A8A' },
  rvt:  { bg: '#D1FAE5', fg: '#065F46' },
  xlsx: { bg: '#D1FAE5', fg: '#065F46' },
  docx: { bg: '#DBEAFE', fg: '#1E3A8A' },
  zip:  { bg: '#FEF3C7', fg: '#92400E' },
  img:  { bg: '#F3E8FF', fg: '#6B21A8' },
}
function getExt(name) {
  const ext = (name || '').split('.').pop().toLowerCase()
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'img'
  return ext || 'file'
}
function extStyle(ext) { return EXT_COLORS[ext] || { bg: '#F1F5F9', fg: '#475569' } }

const fileName = (f) => (typeof f === 'string' ? f : f?.name ?? '')
const fileUrl  = (f) => (typeof f === 'string' ? null : f?.url ?? null)
const downloadFile = (f) => {
  const url = fileUrl(f)
  if (!url) return
  const a = document.createElement('a')
  a.href = url; a.download = fileName(f)
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
}

function projectFilesCount(projet) {
  const missions = (projet.missions || []).filter(m => m.type === 'mission')
  return (projet.tasks || []).reduce((s, t) => s + (t.files?.length || 0), 0) +
    missions.reduce((s, m) => s + (m.livrables?.files?.length || 0) +
      (m.livrables?.fromProject || []).filter(fp => fp.type === 'file').length, 0)
}

function projectLinksCount(projet) {
  const missions = (projet.missions || []).filter(m => m.type === 'mission')
  return (projet.tasks || []).reduce((s, t) => s + (t.links?.length || 0), 0) +
    missions.reduce((s, m) => s + (m.livrables?.links?.length || 0) +
      (m.livrables?.fromProject || []).filter(fp => fp.type === 'link').length, 0)
}

function ProjectDeliverablesContent({ projet, t }) {
  const missions = (projet.missions || []).filter(m => m.type === 'mission')
  const taskDeliverables    = (projet.tasks || []).filter(t => t.files?.length > 0 || t.links?.length > 0)
  const missionDeliverables = missions.filter(m =>
    m.livrables?.files?.length > 0 || m.livrables?.links?.length > 0 || m.livrables?.fromProject?.length > 0
  )
  const validatedMissions = (projet.livrables || []).filter(l => l.source === 'mission')

  if (taskDeliverables.length === 0 && missionDeliverables.length === 0 && validatedMissions.length === 0) {
    return (
      <div className="card p-10 text-center">
        <FolderOpen size={28} className="text-muted mx-auto mb-3" />
        <div className="text-sm font-semibold text-ink mb-1">{t('livrables.empty')}</div>
        <p className="text-xs text-muted">{t('livrables.empty_sub')}</p>
      </div>
    )
  }

  return (
    <div className="card p-5 lg:p-6">
      <div className="space-y-2">
        {missionDeliverables.map(mission => (
          <div key={mission.id}>
            <div className="flex items-center gap-2 my-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] font-semibold text-muted uppercase tracking-widest px-2">{mission.nom}</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            {mission.description && (
              <p className="text-xs text-muted leading-relaxed mb-2 px-1">{mission.description}</p>
            )}
            {(mission.livrables?.files || []).map((f, fi) => {
              const name = fileName(f); const url = fileUrl(f)
              const ext = getExt(name); const style = extStyle(ext)
              return (
                <motion.div key={`mf-${fi}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: fi * 0.04 }}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-paper-warm transition-colors border border-border/50 mb-2">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 font-mono text-[10px] font-bold"
                    style={{ background: style.bg, color: style.fg }}>{ext.toUpperCase().slice(0, 4)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-ink truncate">{name}</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted">Livrable · {mission.nom}</span>
                      {(typeof f === 'object' && f.addedAt) && (
                        <span className="flex items-center gap-0.5 text-[10px] text-muted/70"><CalendarDays size={9} />{fmtDate(f.addedAt)}</span>
                      )}
                    </div>
                  </div>
                  {url ? (
                    <button onClick={() => downloadFile(f)} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-electric/10 border border-electric/20 text-electric hover:bg-electric/20 transition-all flex-shrink-0">
                      <Download size={12} /> {t('livrables.download')}
                    </button>
                  ) : <FileText size={14} className="text-muted flex-shrink-0" />}
                </motion.div>
              )
            })}
            {(mission.livrables?.links || []).map((link, li) => (
              <motion.a key={`ml-${li}`} href={link} target="_blank" rel="noopener noreferrer"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: li * 0.04 }}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-electric/5 transition-colors border border-electric/20 mb-2">
                <div className="w-11 h-11 rounded-xl bg-electric/10 flex items-center justify-center flex-shrink-0">
                  <ExternalLink size={15} className="text-electric" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-electric truncate">{link}</div>
                  <div className="text-xs text-muted">Drive · {mission.nom}</div>
                </div>
                <ExternalLink size={13} className="text-electric flex-shrink-0" />
              </motion.a>
            ))}
            {(mission.livrables?.fromProject || []).map((fp, fpi) => {
              if (fp.type === 'link') return (
                <motion.a key={`mfp-${fpi}`} href={fp.url} target="_blank" rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: fpi * 0.04 }}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-electric/5 transition-colors border border-electric/20 mb-2">
                  <div className="w-11 h-11 rounded-xl bg-electric/10 flex items-center justify-center flex-shrink-0">
                    <ExternalLink size={15} className="text-electric" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-ink truncate">{fp.nom}</div>
                    <div className="text-xs text-muted">Lien · {mission.nom}</div>
                  </div>
                  <ExternalLink size={13} className="text-electric flex-shrink-0" />
                </motion.a>
              )
              const ext = getExt(fp.fileName || fp.nom); const style = extStyle(ext)
              return (
                <motion.div key={`mfp-${fpi}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: fpi * 0.04 }}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-paper-warm transition-colors border border-border/50 mb-2">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 font-mono text-[10px] font-bold"
                    style={{ background: style.bg, color: style.fg }}>{ext === 'img' ? 'IMG' : ext.toUpperCase().slice(0, 4) || 'FILE'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-ink truncate">{fp.nom}</div>
                    <div className="text-xs text-muted">Fichier · {mission.nom}</div>
                  </div>
                  {fp.url && (
                    <button onClick={() => { const a = document.createElement('a'); a.href = fp.url; a.download = fp.fileName || fp.nom; document.body.appendChild(a); a.click(); document.body.removeChild(a) }}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-electric/10 border border-electric/20 text-electric hover:bg-electric/20 transition-all flex-shrink-0">
                      <Download size={12} /> {t('livrables.download')}
                    </button>
                  )}
                </motion.div>
              )
            })}
          </div>
        ))}

        {validatedMissions.length > 0 && (
          <div>
            <div className="flex items-center gap-2 my-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] font-semibold text-muted uppercase tracking-widest px-2">Missions validées</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            {validatedMissions.map((l, idx) => (
              <motion.div key={l.id || idx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                className="flex items-center gap-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 mb-2">
                <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle size={18} className="text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-ink truncate">{l.nom}</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-emerald-700 font-medium">Mission validée</span>
                    {l.addedAt && (
                      <span className="flex items-center gap-0.5 text-[10px] text-muted/70"><CalendarDays size={9} />{fmtDate(l.addedAt)}</span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {taskDeliverables.map(task => (
          <div key={task.id}>
            {(task.files || []).map((f, fi) => {
              const name = fileName(f); const url = fileUrl(f)
              const ext = getExt(name); const style = extStyle(ext)
              return (
                <motion.div key={fi} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: fi * 0.04 }}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-paper-warm transition-colors border border-border/50 mb-2">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 font-mono text-[10px] font-bold"
                    style={{ background: style.bg, color: style.fg }}>{ext.toUpperCase().slice(0, 4)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-ink truncate">{name}</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted truncate">{task.nom}</span>
                      {(task.finishDate || task.deadline) && (
                        <span className="flex items-center gap-0.5 text-[10px] text-muted/70 flex-shrink-0"><CalendarDays size={9} />{fmtDate(task.finishDate || task.deadline)}</span>
                      )}
                    </div>
                  </div>
                  {url ? (
                    <button onClick={() => downloadFile(f)} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-electric/10 border border-electric/20 text-electric hover:bg-electric/20 transition-all flex-shrink-0">
                      <Download size={12} /> {t('livrables.download')}
                    </button>
                  ) : <FileText size={14} className="text-muted flex-shrink-0" />}
                </motion.div>
              )
            })}
            {(task.links || []).map((link, li) => (
              <motion.a key={li} href={link} target="_blank" rel="noopener noreferrer"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: li * 0.04 }}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-electric/5 transition-colors border border-electric/20 mb-2">
                <div className="w-11 h-11 rounded-xl bg-electric/10 flex items-center justify-center flex-shrink-0">
                  <ExternalLink size={15} className="text-electric" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-electric truncate">{link}</div>
                  <div className="text-xs text-muted truncate">{task.nom} · Drive</div>
                </div>
                <ExternalLink size={13} className="text-electric flex-shrink-0" />
              </motion.a>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ClientDeliverablesPage() {
  const { prospectId } = useAuth()
  const { projects, prospects } = useData()
  const { t } = useClientLang()

  const prospect = useMemo(() => {
    if (!prospectId) return null
    return prospects.find(p => p.id === prospectId)
  }, [prospectId, prospects])

  const clientProjects = useMemo(() => {
    if (!prospect) return []
    const name = `${prospect.prenom} ${prospect.nom}`
    return projects.filter(p =>
      p.prospectId === prospect.id || p.clientId === prospect.id || p.client === name
    )
  }, [prospect, projects])

  const [selectedProject, setSelectedProject] = useState(null)

  if (!prospect) return <div className="p-10 text-center text-muted">{t('no_data')}</div>

  // Project detail view
  if (selectedProject) {
    const filesCount = projectFilesCount(selectedProject)
    const linksCount = projectLinksCount(selectedProject)
    return (
      <div className="space-y-5 lg:space-y-7">
        <button onClick={() => setSelectedProject(null)} className="flex items-center gap-2 text-sm text-muted hover:text-ink transition-colors">
          <ArrowLeft size={14} /> {t('project.back')}
        </button>
        <div>
          <div className="label-text mb-2">{t('livrables.label')}</div>
          <h1 className="font-display text-3xl lg:text-5xl text-ink leading-none">{selectedProject.nom}</h1>
          <p className="text-muted text-sm mt-3 max-w-xl">{t('livrables.subtitle')}</p>
        </div>
        <div className="grid grid-cols-3 gap-3 lg:gap-5">
          <div className="card p-4 lg:p-6">
            <div className="text-xs text-muted mb-2">{t('livrables.total_files')}</div>
            <div className="font-display text-3xl lg:text-4xl text-ink">{filesCount}</div>
          </div>
          <div className="card p-4 lg:p-6">
            <div className="text-xs text-muted mb-2">{t('livrables.drive_links')}</div>
            <div className="font-display text-3xl lg:text-4xl text-ink">{linksCount}</div>
          </div>
          <div className="card p-4 lg:p-6">
            <div className="text-xs text-muted mb-2">{selectedProject.type || 'Architecture'}</div>
            <div className="font-display text-3xl lg:text-4xl text-ink">{selectedProject.statut === 'Terminé' ? '✓' : '→'}</div>
          </div>
        </div>
        <ProjectDeliverablesContent projet={selectedProject} t={t} />
      </div>
    )
  }

  // Project picker
  const totalFiles = clientProjects.reduce((s, p) => s + projectFilesCount(p), 0)
  const totalLinks = clientProjects.reduce((s, p) => s + projectLinksCount(p), 0)

  return (
    <div className="space-y-5 lg:space-y-7">
      <div>
        <div className="label-text mb-2">{t('livrables.label')}</div>
        <h1 className="font-display text-3xl lg:text-5xl text-ink leading-none">{t('livrables.title')}</h1>
        <p className="text-muted text-sm mt-3 max-w-xl">{t('project.select_livrables')}</p>
      </div>

      <div className="grid grid-cols-3 gap-3 lg:gap-5">
        <div className="card p-4 lg:p-6">
          <div className="text-xs text-muted mb-2">{t('livrables.total_files')}</div>
          <div className="font-display text-3xl lg:text-4xl text-ink">{totalFiles}</div>
        </div>
        <div className="card p-4 lg:p-6">
          <div className="text-xs text-muted mb-2">{t('livrables.drive_links')}</div>
          <div className="font-display text-3xl lg:text-4xl text-ink">{totalLinks}</div>
        </div>
        <div className="card p-4 lg:p-6">
          <div className="text-xs text-muted mb-2">{t('livrables.projects')}</div>
          <div className="font-display text-3xl lg:text-4xl text-ink">{clientProjects.length}</div>
        </div>
      </div>

      <div className="space-y-3">
        {clientProjects.map((projet, i) => {
          const files = projectFilesCount(projet)
          const links = projectLinksCount(projet)
          const hasAny = files + links > 0

          return (
            <motion.button
              key={projet.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSelectedProject(projet)}
              className="w-full text-left card p-5 hover:border-electric/40 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-electric/10 flex items-center justify-center flex-shrink-0">
                  <File size={20} className="text-electric" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="label-text text-[10px] mb-0.5">{projet.type || 'Architecture'}</div>
                  <div className="font-display text-xl text-ink">{projet.nom}</div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {hasAny ? (
                      <>
                        {files > 0 && (
                          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-electric/10 text-electric">
                            {files} fichier{files > 1 ? 's' : ''}
                          </span>
                        )}
                        {links > 0 && (
                          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600">
                            {links} lien{links > 1 ? 's' : ''}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-paper-warm text-muted border border-border/60">
                        {t('livrables.no_deliverables')}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight size={18} className="text-muted group-hover:text-electric transition-colors flex-shrink-0" />
              </div>
            </motion.button>
          )
        })}

        {clientProjects.length === 0 && (
          <div className="card p-12 text-center">
            <FolderOpen size={28} className="text-muted mx-auto mb-3" />
            <div className="text-sm font-semibold text-ink mb-1">{t('livrables.empty')}</div>
            <p className="text-xs text-muted">{t('livrables.empty_sub')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
