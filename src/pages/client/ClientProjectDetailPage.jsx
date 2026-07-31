import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Calendar, MapPin, Ruler, CheckCircle2, Clock, Circle,
  FileText, ExternalLink, FolderOpen, UserCircle, Wallet, Download,
  MessageSquare, Send,
} from 'lucide-react'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { ProgressBar } from '../../components/ui'
import toast from 'react-hot-toast'

const fileName = (f) => (typeof f === 'string' ? f : f?.name ?? '')
const fileUrl  = (f) => (typeof f === 'string' ? null : f?.url ?? null)
const downloadFile = (f) => {
  const url = fileUrl(f)
  if (!url) return
  const a = document.createElement('a')
  a.href = url; a.download = fileName(f)
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
}

const fmtShort = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

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

export default function ClientProjectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { projects, employes, addClientFeedback } = useData()
  const { prospectId } = useAuth()
  const [feedbackDraft, setFeedbackDraft] = useState('')

  const projet = projects.find(p => String(p.id) === id && String(p.prospectId) === String(prospectId))

  if (!projet) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/client')} className="flex items-center gap-2 text-sm text-muted hover:text-ink">
          <ArrowLeft size={15} /> Retour
        </button>
        <div className="card p-12 text-center text-muted">Projet introuvable.</div>
      </div>
    )
  }

  const missions = (projet.missions || []).filter(m => m.type === 'mission')
  const currentMission = missions.find(m => m.statut !== 'valide')
  const referent = employes.find(e => String(e.id) === String(projet.architecteReferentId))

  const deliverableTasks = (projet.tasks || []).filter(t => (t.files?.length > 0 || t.links?.length > 0))
  const delivByMission = missions.map(m => ({
    mission: m,
    tasks: deliverableTasks.filter(t => t.missionId === m.id),
    missionFiles: m.livrables?.files || [],
    missionLinks: m.livrables?.links || [],
  })).filter(g => g.tasks.length > 0 || g.missionFiles.length > 0 || g.missionLinks.length > 0)
  const noMissionTasks = deliverableTasks.filter(t => !t.missionId || !missions.find(m => m.id === t.missionId))
  if (noMissionTasks.length > 0) delivByMission.push({ mission: { id: '_none', nom: 'Sans mission' }, tasks: noMissionTasks, missionFiles: [], missionLinks: [] })

  const totalFiles = deliverableTasks.reduce((s, t) => s + (t.files?.length || 0), 0)
    + missions.reduce((s, m) => s + (m.livrables?.files?.length || 0), 0)
  const totalLinks = deliverableTasks.reduce((s, t) => s + (t.links?.length || 0), 0)
    + missions.reduce((s, m) => s + (m.livrables?.links?.length || 0), 0)

  return (
    <div className="space-y-5 lg:space-y-7">
      <button onClick={() => navigate('/client')} className="flex items-center gap-2 text-sm text-muted hover:text-ink transition-colors">
        <ArrowLeft size={15} /> Retour aux projets
      </button>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-ink text-paper rounded-2xl lg:rounded-3xl p-6 lg:p-10 relative overflow-hidden"
      >
        <svg className="absolute -bottom-10 -right-10 opacity-10 hidden md:block" width="400" height="280" viewBox="0 0 400 280">
          <rect x="40" y="40" width="320" height="200" fill="none" stroke="#06B6D4" strokeWidth="1" />
          <line x1="160" y1="40" x2="160" y2="140" stroke="#06B6D4" strokeWidth="0.7" />
          <line x1="160" y1="140" x2="360" y2="140" stroke="#06B6D4" strokeWidth="0.7" />
          <line x1="260" y1="140" x2="260" y2="240" stroke="#06B6D4" strokeWidth="0.7" />
        </svg>
        <div className="relative">
          <div className="text-electric text-xs tracking-[0.25em] uppercase mb-3">◆ Votre projet</div>
          <h1 className="font-display text-3xl lg:text-5xl leading-[1.05] mb-4 max-w-2xl">{projet.nom}</h1>
          <p className="text-paper/70 text-sm lg:text-base leading-relaxed max-w-xl mb-6">
            {projet.type}{projet.localisation && projet.localisation !== '—' ? ` · ${projet.localisation}` : ''}
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: Ruler,    label: 'Surface',          val: projet.surface || '—' },
              { icon: MapPin,   label: 'Localisation',     val: projet.localisation !== '—' ? projet.localisation : '—' },
              { icon: Wallet,   label: 'Honoraires HT',    val: projet.budget || '—' },
              { icon: Calendar, label: 'Livraison prévue', val: projet.deadline !== '—' ? projet.deadline : '—' },
            ].map((m, i) => {
              const Icon = m.icon
              return (
                <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <Icon size={14} className="text-electric mb-2" />
                  <div className="text-[10px] uppercase tracking-widest text-paper/50 mb-0.5">{m.label}</div>
                  <div className="text-sm font-semibold truncate">{m.val}</div>
                </div>
              )
            })}
          </div>
        </div>
      </motion.div>

      {/* Avancement global */}
      <div className="card p-5 lg:p-7">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="label-text mb-1.5">Avancement global</div>
            <div className="font-display text-2xl lg:text-3xl text-ink">
              {currentMission ? currentMission.nom : 'Toutes missions validées'}
            </div>
            {missions.length > 0 && (
              <div className="text-xs text-muted mt-0.5">
                {missions.filter(m => m.statut === 'valide').length}/{missions.length} missions validées
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="font-display text-4xl lg:text-5xl text-electric leading-none">{projet.avancement}%</div>
            <div className="text-xs text-muted mt-1">complété</div>
          </div>
        </div>
        <ProgressBar value={projet.avancement} color="#06B6D4" />
      </div>

      {/* Timeline des missions */}
      {missions.length > 0 && (
        <div className="card p-5 lg:p-7">
          <div className="mb-6">
            <div className="label-text mb-1.5">Étapes du projet</div>
            <div className="font-display text-2xl text-ink">Planning des missions</div>
            <p className="text-xs text-muted mt-1">Suivi en temps réel des missions de votre projet</p>
          </div>
          <div className="relative">
            <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />
            {missions.map((mission, i) => {
              const isDone = mission.statut === 'valide'
              const isInProgress = mission.id === currentMission?.id
              const Icon = isDone ? CheckCircle2 : isInProgress ? Clock : Circle
              const iconColor = isDone ? '#10B981' : isInProgress ? '#06B6D4' : '#94A3B8'
              return (
                <motion.div key={mission.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className={`relative pl-12 pb-6 last:pb-0 ${isInProgress ? 'bg-electric/5 -mx-3 px-3 pl-[3.75rem] rounded-xl py-3 mb-2' : ''}`}
                >
                  <div className="absolute left-0 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: `${iconColor}20`, ...(isInProgress ? { left: '0.75rem' } : {}) }}>
                    <Icon size={16} color={iconColor} strokeWidth={2.2} />
                  </div>
                  <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-2">
                    <div>
                      <div className={`text-sm font-semibold ${isInProgress ? 'text-electric' : isDone ? 'text-ink opacity-60' : 'text-ink'}`}>
                        {mission.nom}
                        {isInProgress && (
                          <span className="ml-2 text-[10px] bg-electric/15 text-electric px-1.5 py-0.5 rounded-full font-bold">En cours</span>
                        )}
                      </div>
                      <div className="text-xs text-muted mt-0.5">
                        {isDone
                          ? `Validée${mission.validatedAt ? ` le ${fmtShort(mission.validatedAt)}` : ''}`
                          : mission.debut && mission.fin
                            ? `${fmtShort(mission.debut)} → ${fmtShort(mission.fin)}`
                            : '—'}
                      </div>
                    </div>
                    <span className="text-xs font-semibold whitespace-nowrap" style={{ color: iconColor }}>
                      {isDone ? '✓ Terminée' : isInProgress ? 'En cours' : 'À venir'}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {/* Livrables */}
      <div className="card p-5 lg:p-7">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div className="label-text mb-1.5">Documents & fichiers</div>
            <div className="font-display text-2xl text-ink">Livrables</div>
            <p className="text-xs text-muted mt-1">
              {totalFiles} fichier{totalFiles !== 1 ? 's' : ''} · {totalLinks} lien{totalLinks !== 1 ? 's' : ''} Drive
            </p>
          </div>
        </div>

        {delivByMission.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-border rounded-xl">
            <FolderOpen size={24} className="text-muted mx-auto mb-3" />
            <div className="text-sm font-semibold text-ink mb-1">Aucun livrable pour l'instant</div>
            <p className="text-xs text-muted">Les documents apparaîtront ici au fur et à mesure de l'avancement.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {delivByMission.map(({ mission, tasks, missionFiles, missionLinks }) => (
              <div key={mission.id}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[10px] font-semibold text-muted uppercase tracking-widest px-2">{mission.nom}</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Mission description */}
                {mission.description && (
                  <p className="text-sm text-muted leading-relaxed mb-3 px-1">{mission.description}</p>
                )}

                <div className="space-y-2">
                  {/* Mission-level livrables (files) */}
                  {missionFiles.map((f, fi) => {
                    const name = fileName(f)
                    const url  = fileUrl(f)
                    const ext  = getExt(name)
                    const style = extStyle(ext)
                    return (
                      <div key={`mf-${fi}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-paper-warm transition-colors border border-border/50">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 font-mono text-[10px] font-bold"
                          style={{ background: style.bg, color: style.fg }}>
                          {ext.toUpperCase().slice(0, 4)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-ink truncate">{name}</div>
                          <div className="text-xs text-muted">Livrable mission</div>
                        </div>
                        {url ? (
                          <button onClick={() => downloadFile(f)}
                            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-electric/10 border border-electric/20 text-electric hover:bg-electric/20 transition-all flex-shrink-0">
                            <Download size={12} /> Télécharger
                          </button>
                        ) : (
                          <FileText size={14} className="text-muted flex-shrink-0" />
                        )}
                      </div>
                    )
                  })}

                  {/* Mission-level livrables (links) */}
                  {missionLinks.map((link, li) => (
                    <a key={`ml-${li}`} href={link} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-electric/5 transition-colors border border-electric/20">
                      <div className="w-11 h-11 rounded-xl bg-electric/10 flex items-center justify-center flex-shrink-0">
                        <ExternalLink size={15} className="text-electric" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-electric truncate">{link}</div>
                        <div className="text-xs text-muted">Drive · Livrable mission</div>
                      </div>
                      <ExternalLink size={13} className="text-electric flex-shrink-0" />
                    </a>
                  ))}

                  {/* Task-level livrables */}
                  {tasks.map(task => (
                    <div key={task.id}>
                      {(task.files || []).map((f, fi) => {
                        const name = fileName(f)
                        const url  = fileUrl(f)
                        const ext  = getExt(name)
                        const style = extStyle(ext)
                        return (
                          <div key={fi} className="flex items-center gap-3 p-3 rounded-xl hover:bg-paper-warm transition-colors border border-border/50">
                            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 font-mono text-[10px] font-bold"
                              style={{ background: style.bg, color: style.fg }}>
                              {ext.toUpperCase().slice(0, 4)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-ink truncate">{name}</div>
                              <div className="text-xs text-muted truncate">{task.nom}</div>
                            </div>
                            {url ? (
                              <button onClick={() => downloadFile(f)}
                                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-electric/10 border border-electric/20 text-electric hover:bg-electric/20 transition-all flex-shrink-0">
                                <Download size={12} /> Télécharger
                              </button>
                            ) : (
                              <FileText size={14} className="text-muted flex-shrink-0" />
                            )}
                          </div>
                        )
                      })}
                      {(task.links || []).map((link, li) => (
                        <a key={li} href={link} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 rounded-xl hover:bg-electric/5 transition-colors border border-electric/20">
                          <div className="w-11 h-11 rounded-xl bg-electric/10 flex items-center justify-center flex-shrink-0">
                            <ExternalLink size={15} className="text-electric" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-electric truncate">{link}</div>
                            <div className="text-xs text-muted truncate">{task.nom} · Drive</div>
                          </div>
                          <ExternalLink size={13} className="text-electric flex-shrink-0" />
                        </a>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Feedback client */}
      <div className="card p-5 lg:p-7">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <MessageSquare size={16} className="text-blue-600" />
          </div>
          <div>
            <div className="label-text mb-0.5">Communication</div>
            <div className="font-display text-xl text-ink">Vos messages à l'équipe</div>
          </div>
        </div>

        {/* Historique des messages */}
        {(projet.clientFeedback || []).length > 0 && (
          <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
            {(projet.clientFeedback || []).map(f => (
              <div key={f.id} className="flex gap-3 bg-paper-warm rounded-xl px-4 py-3">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-ink to-electric flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-[10px] font-bold">C</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-ink">Vous</span>
                    <span className="text-[10px] text-muted">
                      {new Date(f.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-ink/80 leading-relaxed">{f.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Zone de saisie */}
        <div className="flex gap-2">
          <input
            className="input-field flex-1 text-sm"
            placeholder="Poser une question, signaler un point, valider une étape..."
            value={feedbackDraft}
            onChange={e => setFeedbackDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey && feedbackDraft.trim()) {
                e.preventDefault()
                addClientFeedback(projet.id, feedbackDraft)
                setFeedbackDraft('')
                toast.success('Message envoyé à l\'équipe')
              }
            }}
          />
          <button
            onClick={() => {
              if (!feedbackDraft.trim()) return
              addClientFeedback(projet.id, feedbackDraft)
              setFeedbackDraft('')
              toast.success('Message envoyé à l\'équipe')
            }}
            className="w-10 h-10 rounded-xl bg-ink text-paper flex items-center justify-center hover:bg-ink/90 transition-colors flex-shrink-0"
          >
            <Send size={14} />
          </button>
        </div>
        <p className="text-[10px] text-muted mt-2">L'équipe sera notifiée et vous répondra par messages.</p>
      </div>

      {/* Personnel référent */}
      <div className="card p-5 lg:p-7 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        {referent ? (
          <>
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-ink to-electric flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {referent.nom?.[0]}
            </div>
            <div className="flex-1">
              <div className="label-text mb-1">Votre personnel référent</div>
              <div className="text-lg font-semibold text-ink">{referent.nom}</div>
              <div className="text-xs text-muted">{referent.poste} · {referent.email || 'Disponible du lundi au vendredi'}</div>
            </div>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-xl bg-paper-warm flex items-center justify-center flex-shrink-0">
              <UserCircle size={28} className="text-muted" />
            </div>
            <div className="flex-1">
              <div className="label-text mb-1">Votre personnel référent</div>
              <div className="text-sm text-muted">Aucun référent assigné pour l'instant.</div>
            </div>
          </>
        )}
        <button className="btn-primary" onClick={() => navigate('/client/messages')}>
          Contacter
        </button>
      </div>
    </div>
  )
}
