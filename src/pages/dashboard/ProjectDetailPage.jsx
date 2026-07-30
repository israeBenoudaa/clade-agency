import { useState, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Plus, MapPin, Euro, Calendar, Users, Lock, Globe,
  CheckCircle, AlertCircle, Loader, Paperclip, Link2, X,
  ChevronDown, Star, ThumbsDown, Upload, ExternalLink, Flag, Pencil, Trash2,
  BadgeCheck, RotateCcw, FileText, Download, FolderGit2, TrendingUp,
  Wallet, ChevronRight, UserCircle, MessageSquare, Send, Target,
  Lightbulb, LayoutGrid, Ruler, ClipboardList, Layers2,
} from 'lucide-react'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { ProgressBar } from '../../components/ui'
import NouveauTacheModal from '../../components/NouveauTacheModal'
import AjouterGanttModal from '../../components/AjouterGanttModal'
import NouveauProjetModal from '../../components/NouveauProjetModal'
import CompteRenduModal from '../../components/CompteRenduModal'
import LivrableModal from '../../components/LivrableModal'
import { generateCompteRenduPdf } from '../../utils/generatePdf'
import { generateProjectReportPdf } from '../../utils/generateProjectReportPdf'
import toast from 'react-hot-toast'

// ── helpers date ──────────────────────────────────────────────────────────────
const daysDiff = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000)
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
const fmtShort = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : '—'

// ── file helpers (support old string format + new {name,url} format) ──────────
const fileName = (f) => (typeof f === 'string' ? f : f?.name ?? '')
const fileUrl  = (f) => (typeof f === 'string' ? null : f?.url ?? null)
const downloadFile = (f) => {
  const url = fileUrl(f)
  if (!url) return
  const a = document.createElement('a')
  a.href = url
  a.download = fileName(f)
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
const readFileAsDataUrl = (file) => new Promise((resolve) => {
  const r = new FileReader()
  r.onload = (e) => resolve(e.target.result)
  r.readAsDataURL(file)
})

// ── statut config ──────────────────────────────────────────────────────────────
const STATUT_CFG = {
  'Done':           { label: 'Terminé',  Icon: CheckCircle, bg: 'bg-emerald-50', fg: 'text-emerald-700', dot: '#10B981' },
  'Working on it':  { label: 'En cours', Icon: Loader,       bg: 'bg-amber-50',   fg: 'text-amber-700',   dot: '#F59E0B' },
  'Stuck':          { label: 'Bloqué',   Icon: AlertCircle,  bg: 'bg-rose-50',    fg: 'text-rose-700',    dot: '#F43F5E' },
}

const APPROVAL_CFG = {
  'Approved':   { label: 'Approuvé',    Icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  'Great work': { label: 'Excellent !', Icon: Star,         color: 'text-amber-600 bg-amber-50 border-amber-200' },
  'Not yet':    { label: 'Pas encore',  Icon: ThumbsDown,  color: 'text-rose-600 bg-rose-50 border-rose-200' },
}

// ── Gantt component ────────────────────────────────────────────────────────────
function GanttSection({ missions, onAdd, onEditMission, isManager, onValidate, onUnvalidate, onDeleteMission }) {
  const gantt = useMemo(() => {
    const dates = missions.flatMap(m => [m.debut, m.fin, m.date].filter(Boolean)).map(d => new Date(d))
    if (!dates.length) {
      const now = new Date()
      const start = new Date(now.getTime() - 30 * 86400000)
      const end   = new Date(now.getTime() + 150 * 86400000)
      return { start, end, days: 180 }
    }
    const min = new Date(Math.min(...dates))
    const max = new Date(Math.max(...dates))
    const start = new Date(min.getTime() - 14 * 86400000)
    const end   = new Date(max.getTime() + 14 * 86400000)
    return { start, end, days: daysDiff(start, end) }
  }, [missions])

  const toLeft  = (d) => Math.max(0, Math.min(100, (daysDiff(gantt.start, new Date(d)) / gantt.days) * 100))
  const toWidth = (s, e) => Math.max(0.8, (daysDiff(new Date(s), new Date(e)) / gantt.days) * 100)

  const months = useMemo(() => {
    const labels = []
    const c = new Date(gantt.start); c.setDate(1)
    while (c <= gantt.end) {
      labels.push({ left: toLeft(c), label: c.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }) })
      c.setMonth(c.getMonth() + 1)
    }
    return labels
  }, [gantt])

  const todayLeft = toLeft(new Date())
  const showToday = todayLeft > 0 && todayLeft < 100

  const rowMissions  = missions.filter(m => m.type === 'mission')
  const rowDeadlines = missions.filter(m => m.type === 'deadline')
  const rowRdv       = missions.filter(m => m.type === 'rdv')

  // La première mission non-validée = mission en cours
  const currentMissionId = rowMissions.find(m => m.statut !== 'valide')?.id

  const validatedCount = rowMissions.filter(m => m.statut === 'valide').length
  const totalMissions  = rowMissions.length

  return (
    <div className="card p-5 lg:p-7">
      <div className="flex justify-between items-center mb-5">
        <div>
          <div className="label-text mb-1">Planning</div>
          <div className="font-display text-2xl text-ink">Diagramme de Gantt</div>
          {totalMissions > 0 && (
            <div className="text-xs text-muted mt-0.5">
              {validatedCount}/{totalMissions} missions validées
            </div>
          )}
        </div>
        <button onClick={onAdd} className="btn-primary text-sm">
          <Plus size={14} /> Ajouter
        </button>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Mois labels */}
          <div className="grid" style={{ gridTemplateColumns: '200px 1fr auto' }}>
            <div className="label-text px-2 pb-2">Élément</div>
            <div className="relative h-6 mb-1">
              {months.map((m, i) => (
                <span
                  key={i}
                  className="absolute text-[10px] text-muted font-medium whitespace-nowrap"
                  style={{ left: `${m.left}%`, transform: 'translateX(-50%)' }}
                >
                  {m.label}
                </span>
              ))}
            </div>
            {isManager && <div className="label-text pb-2 pl-3 w-44">Actions</div>}
          </div>

          {/* Contenu Gantt */}
          <div className="space-y-1">
            {/* Missions */}
            {rowMissions.map((m) => {
              const isValide   = m.statut === 'valide'
              const isCurrent  = m.id === currentMissionId
              return (
                <div key={m.id} className={`grid items-center gap-3 rounded-xl transition-colors ${isValide ? 'bg-emerald-50/50' : isCurrent ? 'bg-electric/5' : ''}`} style={{ gridTemplateColumns: '200px 1fr auto' }}>
                  <div className="pr-3 py-1">
                    <div className="flex items-center gap-1.5">
                      {isValide && <BadgeCheck size={13} className="text-emerald-500 flex-shrink-0" />}
                      {isCurrent && !isValide && <span className="w-2 h-2 rounded-full bg-electric flex-shrink-0 animate-pulse" />}
                      <div className={`text-xs font-semibold truncate ${isValide ? 'text-emerald-700 line-through opacity-70' : isCurrent ? 'text-electric' : 'text-ink'}`}>{m.nom}</div>
                    </div>
                    {m.equipe && <div className="text-[10px] text-muted truncate pl-4">{m.equipe}</div>}
                    {isCurrent && !isValide && <div className="text-[10px] text-electric font-semibold pl-4">Mission en cours</div>}
                  </div>
                  <div className="relative h-10 bg-paper-warm rounded-lg">
                    {showToday && (
                      <div className="absolute top-0 bottom-0 w-px bg-electric/50 z-10" style={{ left: `${todayLeft}%` }} />
                    )}
                    <div
                      className="absolute top-1.5 bottom-1.5 rounded-md flex items-center px-2.5 text-white text-[11px] font-semibold shadow-sm overflow-hidden"
                      style={{
                        left:  `${toLeft(m.debut)}%`,
                        width: `${toWidth(m.debut, m.fin)}%`,
                        background: isValide
                          ? `linear-gradient(90deg, #10B981, #10B98199)`
                          : `linear-gradient(90deg, ${m.couleur}, ${m.couleur}cc)`,
                        opacity: isValide ? 0.7 : 1,
                      }}
                    >
                      {isValide && <CheckCircle size={10} className="mr-1 flex-shrink-0" />}
                      <span className="truncate">{fmtShort(m.debut)} → {fmtShort(m.fin)}</span>
                    </div>
                  </div>
                  {/* Boutons action (édition + validation + suppression) */}
                  {isManager && (
                    <div className="pl-3 w-44 flex-shrink-0 flex items-center gap-1.5">
                      <button
                        onClick={() => onEditMission(m)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-electric hover:bg-electric/10 transition-colors flex-shrink-0"
                        title="Modifier"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => { if (window.confirm(`Supprimer "${m.nom}" ?`)) onDeleteMission(m.id) }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-rose-500 hover:bg-rose-50 transition-colors flex-shrink-0"
                        title="Supprimer"
                      >
                        <Trash2 size={12} />
                      </button>
                      {isValide ? (
                        <button
                          onClick={() => onUnvalidate(m.id)}
                          className="flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg hover:bg-white transition-colors"
                        >
                          <BadgeCheck size={11} /> Validée
                          <RotateCcw size={9} className="ml-1 opacity-60" />
                        </button>
                      ) : (
                        <button
                          onClick={() => onValidate(m.id)}
                          className={`flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-all ${
                            isCurrent
                              ? 'bg-electric text-white hover:opacity-90 shadow-sm'
                              : 'bg-paper-warm border border-border text-muted hover:text-ink hover:bg-white'
                          }`}
                        >
                          <CheckCircle size={11} /> Valider
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Deadlines */}
            {rowDeadlines.map((m) => (
              <div key={m.id} className="grid items-center gap-3" style={{ gridTemplateColumns: `200px 1fr${isManager ? ' auto' : ''}` }}>
                <div className="pr-3 flex items-center gap-1.5">
                  <Flag size={12} className="text-rose-500 flex-shrink-0" />
                  <div className="text-xs font-semibold text-rose-600 truncate">{m.nom}</div>
                </div>
                <div className="relative h-10 bg-paper-warm rounded-lg">
                  <div
                    className="absolute top-0 bottom-0 flex flex-col items-center"
                    style={{ left: `${toLeft(m.date)}%`, transform: 'translateX(-50%)' }}
                  >
                    <div className="w-px flex-1 bg-rose-500 border-dashed" style={{ borderLeft: '2px dashed #F43F5E' }} />
                    <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1 rounded whitespace-nowrap">
                      {fmtShort(m.date)}
                    </span>
                  </div>
                </div>
                {isManager && (
                  <div className="pl-3 w-44 flex-shrink-0 flex items-center gap-1.5">
                    <button onClick={() => onEditMission(m)} className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-electric hover:bg-electric/10 transition-colors" title="Modifier">
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => { if (window.confirm(`Supprimer "${m.nom}" ?`)) onDeleteMission(m.id) }} className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-rose-500 hover:bg-rose-50 transition-colors" title="Supprimer">
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* RDV */}
            {rowRdv.map((m) => (
              <div key={m.id} className="grid items-center gap-3" style={{ gridTemplateColumns: `200px 1fr${isManager ? ' auto' : ''}` }}>
                <div className="pr-3 flex items-center gap-1.5">
                  <Calendar size={12} className="text-violet-500 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-ink truncate">{m.nom}</div>
                    {m.personnes && <div className="text-[10px] text-muted truncate">{m.personnes}</div>}
                  </div>
                </div>
                <div className="relative h-10 bg-paper-warm rounded-lg">
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5"
                    style={{ left: `${toLeft(m.date)}%` }}
                  >
                    <div
                      className="w-4 h-4 rotate-45 border-2 border-violet-500"
                      style={{ background: '#8B5CF620' }}
                    />
                    <span className="text-[9px] text-violet-600 font-bold whitespace-nowrap">{fmtShort(m.date)}</span>
                  </div>
                </div>
                {isManager && (
                  <div className="pl-3 w-44 flex-shrink-0 flex items-center gap-1.5">
                    <button onClick={() => onEditMission(m)} className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-electric hover:bg-electric/10 transition-colors" title="Modifier">
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => { if (window.confirm(`Supprimer "${m.nom}" ?`)) onDeleteMission(m.id) }} className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-rose-500 hover:bg-rose-50 transition-colors" title="Supprimer">
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Ligne aujourd'hui légende */}
            {showToday && (
              <div className="grid gap-3 mt-1" style={{ gridTemplateColumns: `200px 1fr${isManager ? ' auto' : ''}` }}>
                <div />
                <div className="relative h-4">
                  <div className="absolute flex items-center gap-1" style={{ left: `${todayLeft}%`, transform: 'translateX(-50%)' }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-electric" />
                    <span className="text-[10px] text-electric font-semibold whitespace-nowrap">Aujourd'hui</span>
                  </div>
                </div>
              </div>
            )}

            {missions.length === 0 && (
              <div className="text-center py-8 text-muted text-sm">
                Aucun élément — cliquez sur "Ajouter" pour commencer
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Status cell — icon-only buttons in a row ──────────────────────────────────
function StatusCell({ task, projectId, updateTask }) {
  const [justDone, setJustDone] = useState(false)

  const handleStatus = (key) => {
    updateTask(projectId, task.id, { statut: key })
    if (key === 'Done' && task.statut !== 'Done') {
      setJustDone(true)
      setTimeout(() => setJustDone(false), 900)
    }
  }

  return (
    <div className="relative flex items-center gap-1">
      <AnimatePresence>
        {justDone && (
          <motion.div
            key="done-flash"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.2, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute -inset-1.5 rounded-xl bg-emerald-100/80 flex items-center justify-center pointer-events-none z-10"
          >
            <CheckCircle size={18} className="text-emerald-600" />
          </motion.div>
        )}
      </AnimatePresence>
      {Object.entries(STATUT_CFG).map(([key, scfg]) => {
        const Ico = scfg.Icon
        const active = task.statut === key
        return (
          <button
            key={key}
            onClick={() => handleStatus(key)}
            title={scfg.label}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all border ${
              active
                ? `${scfg.bg} ${scfg.fg} border-transparent shadow-sm`
                : 'bg-white border-border text-slate-300 hover:text-slate-500 hover:border-slate-300'
            }`}
          >
            <Ico size={13} />
          </button>
        )
      })}
    </div>
  )
}

// ── Task table row ─────────────────────────────────────────────────────────────
function TaskRow({ task, projectId, isManager, onEdit, onApproved }) {
  const { updateTask, addTaskComment } = useData()
  const { profile } = useAuth()
  const [showFiles, setShowFiles] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [commentDraft, setCommentDraft] = useState('')
  const [linkInput, setLinkInput] = useState('')
  const fileRef = useRef()

  const cfg = STATUT_CFG[task.statut] || STATUT_CFG['Working on it']
  const StatIcon = cfg.Icon
  const approvalCfg = task.approval ? APPROVAL_CFG[task.approval] : null

  const handleApprove = (approval) => {
    const isApproved = approval === 'Approved' || approval === 'Great work'
    if (isApproved && task.statut !== 'Done') {
      toast.error(`La tâche doit être marquée "Terminé" avant d'être approuvée`)
      return
    }
    const now = new Date()
    const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    updateTask(projectId, task.id, {
      approval,
      finishDate: isApproved ? localDate : null,
    })
    toast.success(`Notification envoyée à ${task.personnelNom} : "${APPROVAL_CFG[approval]?.label}"`)
    if (isApproved && onApproved) onApproved(task)
  }

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await readFileAsDataUrl(file)
    updateTask(projectId, task.id, { files: [...task.files, { name: file.name, url }] })
    toast.success(`Fichier "${file.name}" attaché`)
    e.target.value = ''
  }

  const handleAddLink = () => {
    const url = linkInput.trim()
    if (!url) return
    if (!/^https?:\/\//.test(url)) { toast.error('Entrez un lien valide (https://...)'); return }
    updateTask(projectId, task.id, { links: [...task.links, url] })
    setLinkInput('')
    toast.success('Lien ajouté')
  }

  return (
    <>
      <tr className="hover:bg-paper-warm/50 transition-colors">
        {/* Tâche */}
        <td className="py-3.5 pr-4 align-top">
          <div className="text-sm font-semibold text-ink leading-snug">{task.nom}</div>
          {task.description && (
            <div className="text-xs text-muted mt-0.5 line-clamp-2 leading-relaxed">{task.description}</div>
          )}
          {(task.files.length > 0 || task.links.length > 0) && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {task.files.map((f, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-[10px] bg-paper-warm border border-border rounded px-1.5 py-0.5 text-ink">
                  <Paperclip size={8} />{fileName(f)}
                  {fileUrl(f) && (
                    <button onClick={() => downloadFile(f)} title="Télécharger" className="flex items-center gap-0.5 text-[9px] text-electric font-semibold hover:opacity-70 ml-1 px-1 py-0.5 rounded bg-electric/10 border border-electric/20">
                      <Download size={9} />
                    </button>
                  )}
                  <button onClick={() => updateTask(projectId, task.id, { files: task.files.filter((_, j) => j !== i) })} className="text-muted hover:text-rose-500 ml-0.5"><X size={7} /></button>
                </span>
              ))}
              {task.links.map((l, i) => (
                <a key={i} href={l} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] bg-electric/5 border border-electric/20 rounded px-1.5 py-0.5 text-electric hover:underline">
                  <ExternalLink size={8} />Drive
                  <button onClick={(e) => { e.preventDefault(); updateTask(projectId, task.id, { links: task.links.filter((_, j) => j !== i) }) }} className="text-muted hover:text-rose-500 ml-0.5"><X size={7} /></button>
                </a>
              ))}
            </div>
          )}
        </td>

        {/* Assigné */}
        <td className="py-3.5 pr-4 align-top">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-ink to-electric flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[9px] font-bold">{task.personnelNom?.[0]}</span>
            </div>
            <span className="text-xs font-medium text-ink truncate">{task.personnelNom}</span>
          </div>
        </td>

        {/* Mission */}
        <td className="py-3.5 pr-4 align-top">
          {task.missionNom ? (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-electric bg-electric/5 border border-electric/20 px-2 py-0.5 rounded-full max-w-[110px] truncate"
              title={task.missionNom}
            >
              <Flag size={9} className="flex-shrink-0" />
              {task.missionNom.split(' — ')[0]}
            </span>
          ) : (
            <span className="text-xs text-muted">—</span>
          )}
        </td>

        {/* Statut */}
        <td className="py-3.5 pr-4 align-top">
          <StatusCell task={task} projectId={projectId} updateTask={updateTask} />
        </td>

        {/* Deadline */}
        <td className="py-3.5 pr-4 align-top">
          <span className="text-xs text-ink">{fmtDate(task.deadline)}</span>
        </td>

        {/* Fin réelle */}
        <td className="py-3.5 pr-4 align-top">
          {task.finishDate ? (() => {
            const fin = task.finishDate
            const dl  = task.deadline
            const cls = !dl
              ? 'text-emerald-600'
              : fin < dl
                ? 'text-emerald-600'
                : fin === dl
                  ? 'text-amber-500'
                  : 'text-rose-500'
            return <span className={`text-xs font-medium ${cls}`}>{fmtDate(fin)}</span>
          })() : <span className="text-xs text-muted">—</span>}
        </td>

        {/* Approbation */}
        <td className="py-3.5 pr-4 align-top">
          {isManager ? (
            <div className="flex items-center gap-1">
              {Object.entries(APPROVAL_CFG).map(([key, acfg]) => {
                const active = task.approval === key
                return (
                  <button
                    key={key}
                    onClick={() => handleApprove(key)}
                    title={acfg.label}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all border ${
                      active ? acfg.color : 'bg-white border-border text-slate-300 hover:text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <acfg.Icon size={13} />
                  </button>
                )
              })}
            </div>
          ) : (
            approvalCfg
              ? <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full border ${approvalCfg.color}`}><approvalCfg.Icon size={10} />{approvalCfg.label}</span>
              : <span className="text-xs text-muted">—</span>
          )}
        </td>

        {/* Actions */}
        <td className="py-3.5 align-top">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowFiles(v => !v)}
              className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${showFiles ? 'bg-electric/10 text-electric' : 'text-muted hover:text-ink hover:bg-paper-warm'}`}
              title="Joindre un fichier"
            >
              <Paperclip size={13} />
            </button>
            <button
              onClick={onEdit}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-electric hover:bg-electric/10 transition-colors"
              title="Modifier la tâche"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={() => { setShowComments(v => !v); setShowFiles(false) }}
              className={`relative w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${showComments ? 'bg-electric/10 text-electric' : 'text-muted hover:text-ink hover:bg-paper-warm'}`}
              title="Commentaires"
            >
              <MessageSquare size={13} />
              {(task.comments?.length > 0) && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-electric text-white text-[8px] font-bold flex items-center justify-center leading-none">
                  {task.comments.length > 9 ? '9+' : task.comments.length}
                </span>
              )}
            </button>
          </div>
        </td>
      </tr>

      {/* Expandable comments row */}
      {showComments && (
        <tr>
          <td colSpan={8} className="pb-3 px-0">
            <div className="bg-paper-warm rounded-xl p-3 space-y-2">
              {(task.comments || []).length === 0 ? (
                <p className="text-xs text-muted py-1">Aucun commentaire pour cette tâche</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(task.comments || []).map((c, i) => (
                    <div key={i} className="flex items-start gap-2.5 bg-white rounded-lg p-2.5 border border-border">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-ink to-electric flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-[9px] font-bold">{(c.authorName || '?')[0]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-ink">{c.authorName}</span>
                          <span className="text-[10px] text-muted">{c.createdAt ? new Date(c.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                        </div>
                        <p className="text-xs text-ink mt-0.5 leading-relaxed">{c.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <input
                  className="input-field text-xs py-2 flex-1"
                  placeholder="Ajouter un commentaire…"
                  value={commentDraft}
                  onChange={e => setCommentDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey && commentDraft.trim()) {
                      e.preventDefault()
                      addTaskComment(projectId, task.id, { authorId: String(profile?.id || ''), authorName: profile?.full_name || 'Anonyme', content: commentDraft.trim() })
                      setCommentDraft('')
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (!commentDraft.trim()) return
                    addTaskComment(projectId, task.id, { authorId: String(profile?.id || ''), authorName: profile?.full_name || 'Anonyme', content: commentDraft.trim() })
                    setCommentDraft('')
                  }}
                  className="btn-primary text-xs py-2 px-3"
                >
                  <Send size={12} />
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}

      {/* Expandable file/link row */}
      {showFiles && (
        <tr>
          <td colSpan={8} className="pb-3 px-0">
            <div className="bg-paper-warm rounded-xl p-3 space-y-2">
              {task.files.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pb-2 border-b border-border">
                  {task.files.map((f, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 text-xs bg-white border border-border rounded-lg px-2 py-1.5 text-ink">
                      <Paperclip size={11} className="text-muted flex-shrink-0" />
                      <span className="max-w-[180px] truncate">{fileName(f)}</span>
                      {fileUrl(f) ? (
                        <button onClick={() => downloadFile(f)} title="Télécharger" className="flex items-center gap-1 text-xs text-electric font-semibold hover:opacity-80 transition-opacity px-2 py-0.5 rounded-md bg-electric/10 border border-electric/20">
                          <Download size={12} /> Télécharger
                        </button>
                      ) : null}
                      <button onClick={() => updateTask(projectId, task.id, { files: task.files.filter((_, j) => j !== i) })} className="text-muted hover:text-rose-500 transition-colors"><X size={10} /></button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-2">
                <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center justify-center gap-1.5 text-xs border border-dashed border-border rounded-lg py-2 px-4 text-muted hover:text-ink hover:border-ink/30 transition-colors bg-white"
                >
                  <Upload size={12} /> Uploader un fichier
                </button>
                <div className="flex gap-2 flex-1">
                  <input
                    type="url"
                    className="input-field text-xs py-2 flex-1"
                    placeholder="https://drive.google.com/..."
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
                  />
                  <button onClick={handleAddLink} className="btn-primary text-xs py-2 px-3">
                    <Link2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── EditProjetInterneModal ────────────────────────────────────────────────────
function EditProjetInterneModal({ project, onClose, onSave }) {
  const [form, setForm] = useState({
    nom: project.nom || '',
    description: project.description || '',
    objectif: project.objectif || '',
  })
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <AnimatePresence>
      <div className="fixed inset-0 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm z-[60]"
        onClick={e => e.target === e.currentTarget && onClose()}>
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
                <FolderGit2 size={16} className="text-violet-600" />
              </div>
              <div className="font-semibold text-ink">Modifier le projet interne</div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-paper-warm flex items-center justify-center text-muted"><X size={15} /></button>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="label-text mb-1.5 block">Nom du projet *</label>
              <input className="input-field" value={form.nom} onChange={set('nom')} autoFocus />
            </div>
            <div>
              <label className="label-text mb-1.5 block">Description</label>
              <textarea rows={2} className="input-field resize-none" value={form.description} onChange={set('description')} />
            </div>
            <div>
              <label className="label-text mb-1.5 flex items-center gap-1.5 block">
                <Target size={11} /> Objectif
              </label>
              <input className="input-field" placeholder="Améliorer le workflow…" value={form.objectif} onChange={set('objectif')} />
            </div>
          </div>
          <div className="px-6 py-4 border-t border-border flex gap-3 bg-paper/50">
            <button onClick={onClose} className="btn-ghost flex-1 justify-center">Annuler</button>
            <button
              onClick={() => { if (!form.nom.trim()) { toast.error('Nom requis'); return }; onSave(form) }}
              className="flex-1 justify-center flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <CheckCircle size={14} /> Enregistrer
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

// ── StatutProjetModal ─────────────────────────────────────────────────────────
const PROJET_STATUTS_EXT = [
  { val: 'En cours',         label: 'En cours',          color: 'bg-electric/10 text-electric border-electric/20' },
  { val: 'Projet livré',     label: 'Projet livré',      color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { val: 'Projet suspendu',  label: 'Projet suspendu',   color: 'bg-amber-50 text-amber-700 border-amber-200' },
]

function StatutProjetModal({ currentStatut, onClose, onSave }) {
  const [selectedStatut, setSelectedStatut] = useState(currentStatut || 'En cours')
  const [compteRendu, setCompteRendu] = useState('')
  const needsCompteRendu = selectedStatut !== 'En cours'

  const handleSubmit = (e) => {
    e.preventDefault()
    if (needsCompteRendu && !compteRendu.trim()) { toast.error('Compte rendu requis pour ce statut'); return }
    onSave(selectedStatut, compteRendu.trim())
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm z-[60]"
        onClick={e => e.target === e.currentTarget && onClose()}>
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="font-semibold text-ink">Changer le statut du projet</div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-paper-warm flex items-center justify-center text-muted"><X size={14} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-2">
              {PROJET_STATUTS_EXT.map(s => (
                <button key={s.val} type="button" onClick={() => setSelectedStatut(s.val)}
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-semibold transition-all text-left ${selectedStatut === s.val ? s.color + ' ring-2 ring-offset-1 ring-current/30' : 'border-border text-muted hover:text-ink hover:bg-paper-warm'}`}>
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${selectedStatut === s.val ? 'bg-current' : 'bg-border'}`} />
                  {s.label}
                </button>
              ))}
            </div>
            {needsCompteRendu && (
              <div>
                <label className="label-text mb-1.5 block">Compte rendu *</label>
                <textarea className="input-field resize-none" rows={3}
                  placeholder="Décrivez l'état du projet, les raisons du changement de statut…"
                  value={compteRendu} onChange={e => setCompteRendu(e.target.value)} autoFocus />
              </div>
            )}
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center text-sm">Annuler</button>
              <button type="submit" className="btn-primary flex-1 justify-center text-sm">
                <CheckCircle size={13} /> Enregistrer
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function ProjectDetailPage({ backPath = '/app/projects' }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { projects, employes, addMission, addTask, updateTask, updateMission, deleteMission, validateMission, unvalidateMission, updateProject, updateProjectEquipe, updateEmploye, agenceSettings, markClientFeedbackRead, addLivrable, updateLivrable, deleteLivrable } = useData()
  const { profile, isDirector, isDirectorMode, isEmployeeMode } = useAuth()
  const [showTacheModal, setShowTacheModal] = useState(false)
  const [showGanttModal, setShowGanttModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingMission, setEditingMission] = useState(null)
  const [editingTask, setEditingTask] = useState(null)
  const [editingRdv, setEditingRdv] = useState(null)
  const [exportingRdvId, setExportingRdvId] = useState(null)
  const [editingCompteRenduStatut, setEditingCompteRenduStatut] = useState(false)
  const [compteRenduStatutDraft, setCompteRenduStatutDraft] = useState('')
  const [deleteCompteRenduConfirm, setDeleteCompteRenduConfirm] = useState(false)
  const [showStatutModal, setShowStatutModal] = useState(false)
  const [projectPwd, setProjectPwd] = useState('')
  const [projectUnlocked, setProjectUnlocked] = useState(false)
  const [projectPwdError, setProjectPwdError] = useState('')
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [exportingReport, setExportingReport] = useState(false)
  const [showEquipeModal, setShowEquipeModal] = useState(false)
  const [livrableModal, setLivrableModal] = useState(null)
  const [editingTaux, setEditingTaux] = useState(false)
  const [tauxInput, setTauxInput] = useState('')

  const project = projects.find(p => String(p.id) === id)
  const isManager = Boolean(profile) && profile?.role !== 'client'
  const myId  = String(profile?.id || '')
  const myNom = profile?.full_name || profile?.nom || ''
  const isDir = isDirector || isDirectorMode
  const isInterne = project?.typeProjet === 'interne'

  const employe = employes?.find(e => String(e.id) === profile?.id)
  const allowedProjects = employe?.permissions?.allowedProjects ?? null
  const needsProjectGate = isEmployeeMode && !isDir && allowedProjects !== null && project
    && allowedProjects.map(String).includes(String(project.id))

  if (!project) {
    return (
      <div className="p-10 text-center">
        <div className="font-display text-3xl text-ink mb-3">Projet introuvable</div>
        <button onClick={() => navigate('/app/projects')} className="btn-ghost">
          <ArrowLeft size={15} /> Retour aux projets
        </button>
      </div>
    )
  }

  // Access denied — employee has project list but this project isn't in it
  if (isEmployeeMode && !isDir && allowedProjects !== null && !allowedProjects.map(String).includes(String(project.id))) {
    return (
      <div className="p-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4">
          <Lock size={24} className="text-rose-500" />
        </div>
        <div className="font-display text-2xl text-ink mb-2">Accès non autorisé</div>
        <p className="text-sm text-muted mb-6">Vous n'avez pas accès à ce projet.</p>
        <button onClick={() => navigate('/app/projects')} className="btn-ghost">
          <ArrowLeft size={15} /> Retour
        </button>
      </div>
    )
  }

  // Password gate — employee has this project in their allowed list, must enter their password
  if (needsProjectGate && !projectUnlocked) {
    return (
      <div className="p-4 lg:p-10">
        <button onClick={() => navigate('/app/projects')} className="flex items-center gap-2 text-sm text-muted hover:text-ink mb-6">
          <ArrowLeft size={15} /> Retour
        </button>
        <div className="min-h-[50vh] flex items-center justify-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl border border-border w-full max-w-sm p-8">
            <div className="flex flex-col items-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-electric/10 flex items-center justify-center mb-4">
                <Lock size={26} className="text-electric" strokeWidth={1.8} />
              </div>
              <h2 className="font-display text-2xl text-ink text-center">{project.nom}</h2>
              <p className="text-sm text-muted text-center mt-1">Entrez votre mot de passe pour accéder à ce projet</p>
            </div>
            <div className="space-y-3">
              <input
                type="password"
                className="input-field"
                placeholder="Votre mot de passe"
                value={projectPwd}
                onChange={e => { setProjectPwd(e.target.value); setProjectPwdError('') }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    if (projectPwd === employe?.credentials?.password) { setProjectUnlocked(true) }
                    else setProjectPwdError('Mot de passe incorrect')
                  }
                }}
                autoFocus
              />
              {projectPwdError && <p className="text-xs text-rose-600 font-medium">{projectPwdError}</p>}
              <button
                onClick={() => {
                  if (projectPwd === employe?.credentials?.password) setProjectUnlocked(true)
                  else setProjectPwdError('Mot de passe incorrect')
                }}
                className="btn-primary w-full justify-center"
              >
                Accéder au projet
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  const tasks = project.tasks || []
  const stuck     = tasks.filter(t => t.statut === 'Stuck')
  const workingOn = tasks.filter(t => t.statut === 'Working on it')
  const done      = tasks.filter(t => t.statut === 'Done')

  const effectiveTaux = project.tauxHoraire || agenceSettings?.tjh || 250
  const totalHeures = tasks.reduce((s, t) => s + (t.heures || 0), 0)
  const investissement = isInterne ? totalHeures * effectiveTaux : 0

  const finMissions = (project.missions || []).filter(m => m.type === 'mission')
  const finHonoraires = project.finances?.honoraires ?? {}
  const finPaiements = project.finances?.paiements ?? {}
  const totalHT = finMissions.reduce((s, m) => s + (finHonoraires[m.id] || 0), 0)
  const paidHT = finMissions.reduce((s, m) => finPaiements[m.id] === 'paye' ? s + (finHonoraires[m.id] || 0) : s, 0)
  const remainingHT = totalHT - paidHT

  const projetStatut = project.statut || 'En cours'
  const projetStatutCfg = {
    'En cours':        { color: 'bg-electric/10 text-electric border-electric/20', dot: 'bg-electric' },
    'Projet livré':    { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
    'Projet suspendu': { color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
    'Complet':         { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  }

  return (
    <div className="p-4 lg:p-10 space-y-6">

      {/* Breadcrumb */}
      <button
        onClick={() => navigate(backPath)}
        className="flex items-center gap-2 text-sm text-muted hover:text-ink transition-colors"
      >
        <ArrowLeft size={15} /> {backPath === '/app/my-projects' ? 'Retour à mes projets' : 'Retour aux projets'}
      </button>

      {/* Header projet */}
      <div className="card p-4 lg:p-7">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 lg:gap-4">
          <div className="flex-1 min-w-0">
            {/* Tags */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              {isInterne ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200">
                  <FolderGit2 size={10} /> Interne
                </span>
              ) : project.maitrise === 'public' ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-electric/10 text-electric"><Globe size={10} /> Public</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-paper-warm text-muted border border-border"><Lock size={10} /> Privé</span>
              )}
              {(() => {
                const cfg = projetStatutCfg[projetStatut] || projetStatutCfg['En cours']
                return (
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                    {projetStatut}
                  </span>
                )
              })()}
              {!isInterne && (() => {
                const missionsList = (project.missions || []).filter(m => m.type === 'mission')
                const current = missionsList.find(m => m.statut !== 'valide')
                const label = current?.nom ?? (missionsList.length > 0 ? 'Terminé' : project.phase)
                return label ? (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-electric/10 text-electric border border-electric/20">{label}</span>
                ) : null
              })()}
              {project.type && <span className="text-xs text-muted">{project.type}</span>}
            </div>

            {/* Title row — mobile: inline with compact progress */}
            <div className="flex items-start justify-between gap-3">
              <h1 className="font-display text-2xl lg:text-4xl text-ink leading-tight">{project.nom}</h1>
              {/* Mobile progress — hidden on lg */}
              <div className="lg:hidden flex-shrink-0 text-right">
                <div className="font-display text-3xl text-ink leading-none">{project.avancement}%</div>
                <div className="w-20 mt-1"><ProgressBar value={project.avancement} /></div>
              </div>
            </div>

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-2 lg:gap-3 text-xs lg:text-sm text-muted mt-1.5">
              {project.client && <span className="flex items-center gap-1"><Users size={11} /> {project.client}</span>}
              {project.localisation && project.localisation !== '—' && <span className="flex items-center gap-1"><MapPin size={11} /> {project.localisation}</span>}
              {project.budget && project.budget !== '—' && <span className="flex items-center gap-1"><Euro size={11} /> {project.budget}</span>}
              {project.deadline && project.deadline !== '—' && <span className="flex items-center gap-1"><Calendar size={11} /> {project.deadline}</span>}
              {!isInterne && project.architecteReferentNom && (
                <span className="flex items-center gap-1 font-medium text-electric"><UserCircle size={11} /> {project.architecteReferentNom}</span>
              )}
            </div>

            {/* Mobile action buttons — icon only, hidden on lg */}
            <div className="flex items-center gap-1.5 mt-3 lg:hidden">
              {isManager && (
                <button onClick={() => setShowStatutModal(true)} title="Statut"
                  className="w-8 h-8 flex items-center justify-center rounded-xl border border-border text-muted hover:text-ink hover:bg-paper-warm transition-colors">
                  <ChevronRight size={15} />
                </button>
              )}
              {isManager && (
                <button title={exportingReport ? 'Génération…' : 'Rapport PDF'} disabled={exportingReport}
                  onClick={async () => {
                    setExportingReport(true)
                    try {
                      await generateProjectReportPdf({ project, tasks: project.tasks || [], missions: project.missions || [], agenceSettings })
                      toast.success('Rapport PDF téléchargé')
                    } catch { toast.error('Erreur lors de la génération du rapport') }
                    finally { setExportingReport(false) }
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-xl border border-electric/30 text-electric bg-electric/5 hover:bg-electric/10 transition-colors disabled:opacity-50">
                  {exportingReport ? <Loader size={14} className="animate-spin" /> : <Download size={14} />}
                </button>
              )}
              <button title="Board"
                onClick={() => navigate(backPath === '/app/my-projects' ? `/app/my-projects/${id}/board` : `/app/projects/${id}/board`)}
                className="w-8 h-8 flex items-center justify-center rounded-xl border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors">
                <Layers2 size={14} />
              </button>
              <button title="Modifier" onClick={() => setShowEditModal(true)}
                className="w-8 h-8 flex items-center justify-center rounded-xl border border-border text-muted hover:text-ink hover:bg-paper-warm transition-colors">
                <Pencil size={14} />
              </button>
            </div>
          </div>

          {/* Desktop: buttons + large progress — hidden on mobile */}
          <div className="hidden lg:flex flex-col items-end gap-3 flex-shrink-0">
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {isManager && (
                <button onClick={() => setShowStatutModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-border text-muted hover:text-ink hover:bg-paper-warm transition-colors">
                  <ChevronRight size={12} /> Statut
                </button>
              )}
              {isManager && (
                <button
                  onClick={async () => {
                    setExportingReport(true)
                    try {
                      await generateProjectReportPdf({ project, tasks: project.tasks || [], missions: project.missions || [], agenceSettings })
                      toast.success('Rapport PDF téléchargé')
                    } catch { toast.error('Erreur lors de la génération du rapport') }
                    finally { setExportingReport(false) }
                  }}
                  disabled={exportingReport}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-electric/30 text-electric bg-electric/5 hover:bg-electric/10 transition-colors disabled:opacity-50"
                >
                  {exportingReport ? <Loader size={12} className="animate-spin" /> : <Download size={12} />}
                  {exportingReport ? 'Génération…' : 'Rapport PDF'}
                </button>
              )}
              <button
                onClick={() => navigate(backPath === '/app/my-projects' ? `/app/my-projects/${id}/board` : `/app/projects/${id}/board`)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors"
              >
                <Layers2 size={13} /> Board
              </button>
              <button onClick={() => setShowEditModal(true)} className="btn-ghost text-sm">
                <Pencil size={14} /> Modifier
              </button>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted mb-1">Avancement global</div>
              <div className="font-display text-5xl text-ink leading-none mb-2">{project.avancement}%</div>
              <div className="w-32"><ProgressBar value={project.avancement} /></div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      {(() => {
        const kpis = [
          { label: 'Tâches',    shortLabel: 'Tâches',    value: String(tasks.length),                                                               sub: `${done.length} terminées`,    color: '#3B82F6' },
          { label: 'En cours',  shortLabel: 'En cours',  value: String(workingOn.length),                                                            sub: `${stuck.length} bloquée(s)`, color: '#F59E0B' },
          { label: 'Gantt',     shortLabel: 'Gantt',     value: String((project.missions || []).length),                                             sub: `${(project.missions || []).filter(m => m.type === 'mission').length} missions`, color: '#06B6D4' },
          { label: 'Approuvées',shortLabel: 'Approuvées',value: String(tasks.filter(t => t.approval && t.approval !== 'Not yet').length),            sub: `/ ${tasks.length} total`,     color: '#10B981' },
        ]
        return (
          <>
            {/* Mobile — single compact row */}
            <div className="lg:hidden card overflow-hidden">
              <div className="grid grid-cols-4 divide-x divide-border">
                {kpis.map((k, i) => (
                  <div key={i} className="flex flex-col items-center py-3.5 px-1 relative">
                    <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: k.color }} />
                    <div className="font-display text-2xl leading-none mt-1" style={{ color: k.color }}>{k.value}</div>
                    <div className="text-xs font-semibold text-ink mt-1.5 text-center leading-tight">{k.shortLabel}</div>
                    <div className="text-[10px] text-muted mt-0.5 text-center leading-tight">{k.sub}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Desktop — 4 individual cards */}
            <div className="hidden lg:grid grid-cols-4 gap-5">
              {kpis.map((k, i) => (
                <div key={i} className="card p-5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full" style={{ background: k.color }} />
                  <div className="text-xs text-muted mb-2">{k.label}</div>
                  <div className="font-display text-3xl text-ink leading-none">{k.value}</div>
                  <div className="text-xs text-muted mt-1.5">{k.sub}</div>
                </div>
              ))}
            </div>
          </>
        )
      })()}

      {/* Équipe de travail — section compacte */}
      {(() => {
        const equipeIds = project.equipeProjet || []
        const membres = employes.filter(e => equipeIds.map(String).includes(String(e.id)))
        const referent = employes.find(e => String(e.id) === String(project.architecteReferentId))
        return (
          <div className="card p-4 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-shrink-0">
              <Users size={14} className="text-electric" />
              <span className="text-xs font-semibold text-ink">Équipe de travail</span>
            </div>
            {referent && (
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                  style={{ background: referent.couleur || '#3B7BF6' }}>
                  {(referent.nom || '?').slice(0,1)}
                </div>
                <span className="text-xs text-ink font-medium">{referent.nom}</span>
                <span className="text-[10px] text-electric bg-electric/10 px-1.5 py-0.5 rounded font-semibold">Référent</span>
              </div>
            )}
            {membres.length > 0 && <div className="w-px h-4 bg-border flex-shrink-0" />}
            <div className="flex items-center gap-1.5 flex-wrap">
              {membres.map(m => (
                <div key={m.id} className="flex items-center gap-1 bg-paper-warm rounded-lg px-2 py-1 border border-border">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0"
                    style={{ background: m.couleur || '#06B6D4' }}>
                    {(m.nom || '?').slice(0,1)}
                  </div>
                  <span className="text-[11px] text-ink">{m.nom}</span>
                </div>
              ))}
              {membres.length === 0 && <span className="text-xs text-muted italic">Aucun membre assigné</span>}
            </div>
            {isManager && (
              <button
                onClick={() => setShowEquipeModal(true)}
                className="ml-auto flex items-center gap-1.5 text-xs text-muted hover:text-ink hover:bg-paper-warm px-2.5 py-1.5 rounded-lg border border-border transition-colors flex-shrink-0"
              >
                <Plus size={11} /> Gérer
              </button>
            )}
          </div>
        )
      })()}

      {/* Modal gestion équipe */}
      <AnimatePresence>
        {showEquipeModal && (() => {
          const equipeIds = (project.equipeProjet || []).map(String)
          const referentId = String(project.architecteReferentId || '')
          return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
              onClick={e => e.target === e.currentTarget && setShowEquipeModal(false)}>
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <div className="font-semibold text-ink text-sm">Équipe de travail</div>
                  <button onClick={() => setShowEquipeModal(false)} className="w-7 h-7 rounded-lg hover:bg-paper-warm flex items-center justify-center text-muted">
                    <X size={14} />
                  </button>
                </div>
                <div className="p-5 space-y-2 max-h-96 overflow-y-auto">
                  {employes.filter(e => !e.isDirecteur).map(e => {
                    const sid = String(e.id)
                    const isRef = sid === referentId
                    const isMembre = equipeIds.includes(sid)
                    return (
                      <button key={e.id}
                        onClick={() => {
                          if (isRef) return
                          const next = isMembre
                            ? equipeIds.filter(x => x !== sid)
                            : [...equipeIds, sid]
                          updateProjectEquipe(project.id, next)

                          // Sync allowedProjects if the employee has a restricted list
                          const perms = e.permissions || {}
                          const allowed = perms.allowedProjects
                          if (Array.isArray(allowed)) {
                            const pid = String(project.id)
                            const newAllowed = isMembre
                              ? allowed.filter(id => id !== pid)
                              : allowed.includes(pid) ? allowed : [...allowed, pid]
                            updateEmploye(e.id, { permissions: { ...perms, allowedProjects: newAllowed } })
                          }
                        }}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-colors ${
                          isRef ? 'bg-electric/5 border-electric/20 cursor-default' :
                          isMembre ? 'bg-emerald-50 border-emerald-200' : 'border-border hover:bg-paper-warm'
                        }`}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: e.couleur || '#3B7BF6' }}>
                          {(e.nom || '?').slice(0,1)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-ink truncate">{e.nom}</div>
                          <div className="text-[10px] text-muted">{e.poste || e.role || '—'}</div>
                        </div>
                        {isRef && <span className="text-[10px] text-electric font-semibold bg-electric/10 px-2 py-0.5 rounded">Référent</span>}
                        {isMembre && !isRef && <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            </motion.div>
          )
        })()}
      </AnimatePresence>

      {/* Compte rendu statut (external projects) */}
      {!isInterne && project.compteRenduStatut && (
        <div className="card p-4 border-l-4 border-amber-400 bg-amber-50/40">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <FileText size={14} className="text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-amber-700 mb-1">Compte rendu — {projetStatut}</div>
              <p className="text-sm text-ink">{project.compteRenduStatut}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => { setCompteRenduStatutDraft(project.compteRenduStatut); setEditingCompteRenduStatut(true) }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-amber-600 hover:bg-amber-100 transition-colors"
                title="Modifier"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => setDeleteCompteRenduConfirm(true)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-rose-500 hover:bg-rose-50 transition-colors"
                title="Supprimer"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Director-only financial card */}
      {isDir && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {isInterne ? (
            <div className="card p-5 border border-violet-100 bg-violet-50/30 sm:col-span-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <TrendingUp size={16} className="text-violet-600" />
                    </div>
                    <div className="label-text text-[10px]">Investissement interne estimé</div>
                  </div>
                  <div className="font-display text-3xl text-ink leading-none">
                    {Number(investissement).toLocaleString('fr-MA')} <span className="text-base font-normal text-muted">DH</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-muted">{totalHeures}h × </span>
                    {editingTaux ? (
                      <form
                        onSubmit={e => {
                          e.preventDefault()
                          const val = parseFloat(tauxInput)
                          if (!isNaN(val) && val > 0) {
                            updateProject(project.id, { tauxHoraire: val })
                          }
                          setEditingTaux(false)
                        }}
                        className="flex items-center gap-1.5"
                      >
                        <input
                          autoFocus
                          type="number"
                          min="1"
                          value={tauxInput}
                          onChange={e => setTauxInput(e.target.value)}
                          className="w-24 px-2 py-0.5 text-xs font-semibold border border-violet-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400/40 text-ink bg-white"
                        />
                        <span className="text-xs text-muted">DH/h</span>
                        <button type="submit" className="w-6 h-6 flex items-center justify-center rounded-md bg-violet-600 text-white hover:bg-violet-700 transition-colors">
                          <CheckCircle size={11} />
                        </button>
                        <button type="button" onClick={() => setEditingTaux(false)} className="w-6 h-6 flex items-center justify-center rounded-md text-muted hover:text-ink hover:bg-paper-warm transition-colors">
                          <X size={11} />
                        </button>
                      </form>
                    ) : (
                      <button
                        onClick={() => { setTauxInput(String(effectiveTaux)); setEditingTaux(true) }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 bg-violet-100 hover:bg-violet-200 px-2 py-0.5 rounded-lg transition-colors"
                      >
                        {effectiveTaux} DH/h
                        <Pencil size={10} />
                      </button>
                    )}
                    {project.tauxHoraire && project.tauxHoraire !== (agenceSettings?.tjh || 250) && (
                      <button
                        onClick={() => updateProject(project.id, { tauxHoraire: null })}
                        className="text-[10px] text-muted hover:text-ink underline underline-offset-2"
                      >
                        Réinitialiser
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile — compact row, same visual style */}
              {(() => {
                const fmt = (n) => {
                  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`
                  if (n >= 1_000)     return `${+(n / 1_000).toFixed(1)}k`
                  return String(n)
                }
                return (
                  <div className="sm:hidden grid grid-cols-3 gap-2">
                    {[
                      { label: 'Total honoraires HT', sub: `${finMissions.length} mission${finMissions.length !== 1 ? 's' : ''}`, value: fmt(totalHT),     textColor: 'text-ink',         Icon: Wallet,     iconBg: 'bg-electric/10',  iconColor: 'text-electric',   border: 'border-electric/10', bg: 'bg-electric/[0.03]' },
                      { label: 'Honoraires encaissés', sub: `${totalHT > 0 ? Math.round((paidHT / totalHT) * 100) : 0}% encaissé`, value: fmt(paidHT),     textColor: 'text-emerald-700', Icon: TrendingUp, iconBg: 'bg-emerald-100',  iconColor: 'text-emerald-600', border: 'border-emerald-100', bg: 'bg-emerald-50/30'  },
                      { label: 'Reste à encaisser',   sub: 'non encore payé',                                                       value: fmt(remainingHT), textColor: 'text-amber-700',   Icon: Wallet,     iconBg: 'bg-amber-100',    iconColor: 'text-amber-600',   border: 'border-amber-100',   bg: 'bg-amber-50/30'    },
                    ].map((f, i) => (
                      <div key={i} className={`card p-3 border ${f.border} ${f.bg} flex flex-col items-center text-center`}>
                        <div className={`w-7 h-7 rounded-lg ${f.iconBg} flex items-center justify-center mb-2 flex-shrink-0`}>
                          <f.Icon size={13} className={f.iconColor} />
                        </div>
                        <div className="text-[10px] text-muted leading-tight mb-2 min-h-[2.5em] flex items-center justify-center">{f.label}</div>
                        <div className={`font-display text-2xl ${f.textColor} leading-none`}>{f.value}</div>
                        <div className="text-[9px] font-semibold text-muted mt-0.5">DH</div>
                        <div className="text-[9px] text-muted mt-1.5 leading-tight">{f.sub}</div>
                      </div>
                    ))}
                  </div>
                )
              })()}

              {/* Desktop — 3 individual cards */}
              <div className="hidden sm:contents">
                <div className="card p-5 border border-electric/10 bg-electric/[0.03]">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-electric/10 flex items-center justify-center">
                      <Wallet size={16} className="text-electric" />
                    </div>
                    <div className="label-text text-[10px]">Total honoraires HT</div>
                  </div>
                  <div className="font-display text-2xl text-ink leading-none">
                    {Number(totalHT).toLocaleString('fr-MA')} <span className="text-sm font-normal text-muted">DH</span>
                  </div>
                  <div className="text-xs text-muted mt-1.5">{finMissions.length} mission{finMissions.length !== 1 ? 's' : ''}</div>
                </div>
                <div className="card p-5 border border-emerald-100 bg-emerald-50/30">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <TrendingUp size={16} className="text-emerald-600" />
                    </div>
                    <div className="label-text text-[10px]">Honoraires encaissés</div>
                  </div>
                  <div className="font-display text-2xl text-emerald-700 leading-none">
                    {Number(paidHT).toLocaleString('fr-MA')} <span className="text-sm font-normal text-muted">DH</span>
                  </div>
                  <div className="text-xs text-muted mt-1.5">
                    {totalHT > 0 ? `${Math.round((paidHT / totalHT) * 100)}%` : '0%'} encaissé
                  </div>
                </div>
                <div className="card p-5 border border-amber-100 bg-amber-50/30">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                      <Wallet size={16} className="text-amber-600" />
                    </div>
                    <div className="label-text text-[10px]">Reste à encaisser</div>
                  </div>
                  <div className="font-display text-2xl text-amber-700 leading-none">
                    {Number(remainingHT).toLocaleString('fr-MA')} <span className="text-sm font-normal text-muted">DH</span>
                  </div>
                  <div className="text-xs text-muted mt-1.5">Missions non encore payées</div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Gantt */}
      <GanttSection
        missions={project.missions || []}
        onAdd={() => setShowGanttModal(true)}
        onEditMission={(m) => setEditingMission(m)}
        isManager={isManager}
        onValidate={(missionId) => {
          validateMission(project.id, missionId)
          toast.success('Mission validée — avancement recalculé')
        }}
        onUnvalidate={(missionId) => {
          unvalidateMission(project.id, missionId)
          toast('Mission marquée non-validée', { icon: '↩️' })
        }}
        onDeleteMission={(missionId) => {
          deleteMission(project.id, missionId)
          toast.success('Élément supprimé du Gantt')
        }}
      />

      {/* Gestion des tâches */}
      <div className="card p-5 lg:p-7">
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="label-text mb-1">Suivi opérationnel</div>
            <div className="font-display text-2xl text-ink">Gestion des tâches</div>
          </div>
          <button onClick={() => setShowTacheModal(true)} className="btn-primary">
            <Plus size={14} /> Nouvelle tâche
          </button>
        </div>

        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-border rounded-2xl bg-paper-warm/40">
            <div className="w-14 h-14 rounded-2xl bg-electric/10 flex items-center justify-center mb-4">
              <ClipboardList size={24} className="text-electric/60" />
            </div>
            <div className="text-sm font-semibold text-ink mb-1">Aucune tâche assignée</div>
            <p className="text-xs text-muted max-w-xs mb-4">Décomposez vos missions en tâches concrètes et assignez-les à votre équipe pour suivre l'avancement en temps réel.</p>
            <button onClick={() => setShowTacheModal(true)} className="btn-primary text-xs">
              <Plus size={13} /> Créer la première tâche
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left label-text pb-3 pr-4 font-medium w-[22%]">Tâche</th>
                  <th className="text-left label-text pb-3 pr-4 font-medium w-[11%]">Assigné</th>
                  <th className="text-left label-text pb-3 pr-4 font-medium w-[13%]">Mission</th>
                  <th className="text-left label-text pb-3 pr-4 font-medium w-[10%]">Statut</th>
                  <th className="text-left label-text pb-3 pr-4 font-medium w-[10%]">Deadline</th>
                  <th className="text-left label-text pb-3 pr-4 font-medium w-[10%]">Fin réelle</th>
                  <th className="text-left label-text pb-3 pr-4 font-medium w-[16%]">Approbation</th>
                  <th className="text-left label-text pb-3 font-medium w-[8%]">Fichiers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tasks.map(task => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    projectId={project.id}
                    isManager={isManager}
                    onEdit={() => setEditingTask(task)}
                    onApproved={(approvedTask) => {
                      const files = approvedTask.files || []
                      const links = approvedTask.links || []
                      const addedById = String(approvedTask.personnelId || '')
                      const addedByNom = approvedTask.personnelNom || ''
                      files.forEach(f => {
                        if (f.url) addLivrable(project.id, {
                          nom: f.name || approvedTask.nom,
                          type: 'file',
                          url: f.url,
                          fileName: f.name,
                          addedById,
                          addedByNom,
                          source: 'task',
                          taskId: approvedTask.id,
                          taskNom: approvedTask.nom,
                        })
                      })
                      links.forEach(url => {
                        addLivrable(project.id, {
                          nom: approvedTask.nom,
                          type: 'link',
                          url,
                          addedById,
                          addedByNom,
                          source: 'task',
                          taskId: approvedTask.id,
                          taskNom: approvedTask.nom,
                        })
                      })
                      if (files.length > 0 || links.length > 0) {
                        toast.success(`${files.length + links.length} livrable${files.length + links.length > 1 ? 's' : ''} ajouté${files.length + links.length > 1 ? 's' : ''} automatiquement`)
                      }
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Gestion des RDV */}
      {(() => {
        const rdvs = (project.missions || []).filter(m => m.type === 'rdv')
        if (rdvs.length === 0) return null

        const handleExportPdf = async (rdv) => {
          if (!rdv.compteRendu) { toast.error('Rédigez d\'abord un compte rendu'); return }
          setExportingRdvId(rdv.id)
          try {
            await generateCompteRenduPdf({ rdv, compteRendu: rdv.compteRendu, projectNom: project.nom })
            toast.success('PDF exporté')
          } catch {
            toast.error('Erreur lors de la génération du PDF')
          } finally {
            setExportingRdvId(null)
          }
        }

        return (
          <div className="card p-5 lg:p-7">
            <div className="flex justify-between items-center mb-6">
              <div>
                <div className="label-text mb-1">Réunions &amp; Rendez-vous</div>
                <div className="font-display text-2xl text-ink">Gestion des RDV</div>
              </div>
              <div className="text-xs text-muted">{rdvs.length} réunion{rdvs.length !== 1 ? 's' : ''}</div>
            </div>

            <div className="space-y-3">
              {/* Table header */}
              <div className="hidden lg:grid grid-cols-[1fr_120px_1fr_auto] gap-4 px-4 pb-1 border-b border-border">
                <div className="label-text text-xs">Réunion</div>
                <div className="label-text text-xs">Date</div>
                <div className="label-text text-xs">Participants</div>
                <div className="label-text text-xs">Actions</div>
              </div>

              {rdvs.map(rdv => (
                <div key={rdv.id} className="grid grid-cols-1 lg:grid-cols-[1fr_120px_1fr_auto] gap-3 lg:gap-4 items-center p-4 bg-paper-warm rounded-xl hover:bg-white hover:shadow-sm transition-all">
                  {/* Nom */}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${rdv.couleur}18`, border: `1.5px solid ${rdv.couleur}40` }}>
                      <Calendar size={14} style={{ color: rdv.couleur }} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-ink">{rdv.nom}</div>
                      {rdv.compteRendu ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 mt-0.5">
                          <CheckCircle size={9} /> Compte rendu rédigé
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted">Aucun compte rendu</span>
                      )}
                    </div>
                  </div>

                  {/* Date */}
                  <div className="text-xs font-medium text-ink">
                    {rdv.date ? new Date(rdv.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                  </div>

                  {/* Participants */}
                  <div className="text-xs text-muted truncate">{rdv.personnes || '—'}</div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {rdv.compteRendu ? (
                      <>
                        <button
                          onClick={() => setEditingRdv(rdv)}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-border text-muted hover:text-ink hover:border-ink/30 hover:bg-white transition-colors"
                        >
                          <Pencil size={12} /> Modifier
                        </button>
                        <button
                          onClick={() => handleExportPdf(rdv)}
                          disabled={exportingRdvId === rdv.id}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-ink text-paper hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          {exportingRdvId === rdv.id
                            ? <Loader size={12} className="animate-spin" />
                            : <Download size={12} />}
                          PDF
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setEditingRdv(rdv)}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors"
                      >
                        <FileText size={12} /> Rédiger
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Concept & Programmation — external projects only */}
      {!isInterne && (
        <div className="card p-5 lg:p-7">
          <div className="label-text mb-1">Design &amp; Validation</div>
          <div className="font-display text-2xl text-ink mb-6">Concept &amp; Programmation</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Concept card */}
            <button
              onClick={() => navigate(`/app/projects/${project.id}/concept`)}
              className="group relative text-left p-5 rounded-2xl border-2 border-electric/20 bg-gradient-to-br from-electric/5 to-transparent hover:border-electric/50 hover:shadow-lg transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-electric/10 flex items-center justify-center mb-3 group-hover:bg-electric/20 transition-colors">
                <Lightbulb size={18} className="text-electric" />
              </div>
              <div className="font-semibold text-ink text-sm">Concept</div>
              <div className="text-xs text-muted mt-1 leading-relaxed">
                Images de référence &amp; questionnaire client
              </div>
              {project.concept?.images?.length > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-electric bg-electric/10 px-2 py-0.5 rounded-full">
                    {project.concept.images.length} image{project.concept.images.length !== 1 ? 's' : ''}
                  </span>
                  {project.concept?.clientResponse && (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Répondu ✓
                    </span>
                  )}
                </div>
              )}
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronRight size={16} className="text-electric" />
              </div>
            </button>

            {/* Programmation card */}
            <button
              onClick={() => navigate(`/app/projects/${project.id}/programme`)}
              className="group relative text-left p-5 rounded-2xl border-2 border-emerald-200/60 bg-gradient-to-br from-emerald-50/60 to-transparent hover:border-emerald-400/60 hover:shadow-lg transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-100/80 flex items-center justify-center mb-3 group-hover:bg-emerald-200/60 transition-colors">
                <LayoutGrid size={18} className="text-emerald-700" />
              </div>
              <div className="font-semibold text-ink text-sm">Programmation</div>
              <div className="text-xs text-muted mt-1 leading-relaxed">Surfaces &amp; espaces requis</div>
              {project.programme?.statut && (
                <div className="mt-3">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    project.programme.statut === 'partage'
                      ? 'text-emerald-700 bg-emerald-100'
                      : 'text-amber-700 bg-amber-100'
                  }`}>
                    {project.programme.statut === 'partage' ? 'Partagé ✓' : 'En cours'}
                  </span>
                </div>
              )}
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronRight size={16} className="text-emerald-600" />
              </div>
            </button>

            {/* Estimation card */}
            <button
              onClick={() => navigate(`/app/projects/${project.id}/estimation`)}
              className="group relative text-left p-5 rounded-2xl border-2 border-violet-200/60 bg-gradient-to-br from-violet-50/60 to-transparent hover:border-violet-400/60 hover:shadow-lg transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-violet-100/80 flex items-center justify-center mb-3 group-hover:bg-violet-200/60 transition-colors">
                <Ruler size={18} className="text-violet-700" />
              </div>
              <div className="font-semibold text-ink text-sm">Estimation</div>
              <div className="text-xs text-muted mt-1 leading-relaxed">Coûts prévisionnels &amp; budget</div>
              {project.estimation?.statut && (
                <div className="mt-3">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    project.estimation.statut === 'partage'
                      ? 'text-emerald-700 bg-emerald-100'
                      : 'text-amber-700 bg-amber-100'
                  }`}>
                    {project.estimation.statut === 'partage' ? 'Partagé ✓' : 'En cours'}
                  </span>
                </div>
              )}
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronRight size={16} className="text-violet-600" />
              </div>
            </button>
          </div>
        </div>
      )}


      {/* Livrables */}
      {(() => {
        const livrables = project.livrables || []
        return (
          <div className="card p-5 lg:p-7">
            <div className="flex justify-between items-center mb-5">
              <div>
                <div className="label-text mb-1">Documents &amp; Ressources</div>
                <div className="font-display text-2xl text-ink">Livrables</div>
              </div>
              <button
                onClick={() => setLivrableModal('new')}
                className="btn-primary text-xs"
              >
                <Plus size={13} /> Ajouter
              </button>
            </div>

            {livrables.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border rounded-2xl bg-paper-warm/40">
                <div className="w-12 h-12 rounded-2xl bg-electric/10 flex items-center justify-center mb-3">
                  <Paperclip size={20} className="text-electric/60" />
                </div>
                <div className="text-sm font-semibold text-ink mb-1">Aucun livrable</div>
                <p className="text-xs text-muted max-w-xs mb-4">Ajoutez des liens ou fichiers liés à ce projet.</p>
                <button onClick={() => setLivrableModal('new')} className="btn-primary text-xs">
                  <Plus size={13} /> Ajouter un livrable
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {livrables.map(l => {
                  const isMine = String(l.addedById) === myId
                  return (
                    <div key={l.id} className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-paper-warm hover:bg-white hover:shadow-sm transition-all">
                      <div className="w-9 h-9 rounded-xl bg-electric/10 flex items-center justify-center flex-shrink-0">
                        {l.type === 'link' ? <Link2 size={15} className="text-electric" /> : <Paperclip size={15} className="text-electric" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-ink truncate">{l.nom}</div>
                        <div className="text-[10px] text-muted flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                          <span>{l.addedByNom}</span>
                          {l.addedAt && <span>· Ajouté le {new Date(l.addedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>}
                          {l.updatedAt && <span className="text-muted/70">· Modifié le {new Date(l.updatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>}
                          {l.source === 'task' && l.taskNom && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold text-[9px]">
                              <CheckCircle size={8} /> Tâche approuvée : {l.taskNom}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <a
                          href={l.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-electric hover:bg-electric/10 transition-colors"
                          title="Ouvrir"
                        >
                          <ExternalLink size={14} />
                        </a>
                        {isMine && (
                          <>
                            <button
                              onClick={() => setLivrableModal(l)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-paper-warm transition-colors"
                              title="Modifier"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => { deleteLivrable(project.id, l.id); toast.success('Livrable supprimé') }}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-rose-500 hover:bg-rose-50 transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })()}

      {/* Livrable modal */}
      <AnimatePresence>
        {livrableModal && (
          <LivrableModal
            initial={livrableModal === 'new' ? null : livrableModal}
            onClose={() => setLivrableModal(null)}
            onSave={(data) => {
              if (livrableModal === 'new') {
                addLivrable(project.id, { ...data, addedById: myId, addedByNom: myNom })
                toast.success('Livrable ajouté')
              } else {
                updateLivrable(project.id, livrableModal.id, data)
                toast.success('Livrable modifié')
              }
              setLivrableModal(null)
            }}
          />
        )}
      </AnimatePresence>

      {/* Modals */}
      {showTacheModal && (
        <NouveauTacheModal
          missions={(project.missions || []).filter(m => m.type === 'mission')}
          onClose={() => setShowTacheModal(false)}
          onAdd={(data) => addTask(project.id, data)}
        />
      )}
      {showGanttModal && (
        <AjouterGanttModal
          onClose={() => setShowGanttModal(false)}
          onAdd={(item) => addMission(project.id, item)}
          projectLivrables={project.livrables || []}
        />
      )}
      {editingMission && (
        <AjouterGanttModal
          item={editingMission}
          onClose={() => setEditingMission(null)}
          onEdit={(updates) => {
            updateMission(project.id, editingMission.id, updates)
            setEditingMission(null)
          }}
          projectLivrables={project.livrables || []}
        />
      )}
      {showEditModal && isInterne && (
        <EditProjetInterneModal
          project={project}
          onClose={() => setShowEditModal(false)}
          onSave={(form) => {
            updateProject(project.id, form)
            setShowEditModal(false)
            toast.success('Projet mis à jour')
          }}
        />
      )}
      {showEditModal && !isInterne && (
        <NouveauProjetModal
          projet={project}
          onClose={() => setShowEditModal(false)}
        />
      )}
      {editingTask && (
        <NouveauTacheModal
          tache={editingTask}
          missions={(project.missions || []).filter(m => m.type === 'mission')}
          onClose={() => setEditingTask(null)}
          onEdit={(updates) => {
            updateTask(project.id, editingTask.id, updates)
            setEditingTask(null)
          }}
        />
      )}
      {editingRdv && (
        <CompteRenduModal
          rdv={editingRdv}
          compteRendu={editingRdv.compteRendu ?? null}
          projectNom={project.nom}
          onClose={() => setEditingRdv(null)}
          onSave={(cr) => updateMission(project.id, editingRdv.id, { compteRendu: cr })}
        />
      )}
      {showStatutModal && (
        <StatutProjetModal
          currentStatut={projetStatut}
          onClose={() => setShowStatutModal(false)}
          onSave={(statut, cr) => {
            updateProject(project.id, { statut, ...(cr ? { compteRenduStatut: cr } : {}) })
            setShowStatutModal(false)
            toast.success(`Statut mis à jour : ${statut}`)
          }}
        />
      )}

      {/* Edit compte rendu statut */}
      <AnimatePresence>
        {editingCompteRenduStatut && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && setEditingCompteRenduStatut(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Pencil size={14} className="text-amber-600" />
                  </div>
                  <div className="font-semibold text-ink text-sm">Modifier le compte rendu</div>
                </div>
                <button onClick={() => setEditingCompteRenduStatut(false)} className="w-7 h-7 rounded-lg hover:bg-paper-warm flex items-center justify-center text-muted">
                  <X size={14} />
                </button>
              </div>
              <div className="p-5">
                <textarea
                  autoFocus
                  rows={5}
                  value={compteRenduStatutDraft}
                  onChange={e => setCompteRenduStatutDraft(e.target.value)}
                  className="input-field resize-none w-full"
                  placeholder="Contenu du compte rendu..."
                />
                <div className="flex gap-3 mt-4">
                  <button onClick={() => setEditingCompteRenduStatut(false)} className="btn-ghost flex-1 justify-center text-xs">Annuler</button>
                  <button
                    onClick={() => {
                      updateProject(project.id, { compteRenduStatut: compteRenduStatutDraft.trim() })
                      setEditingCompteRenduStatut(false)
                      toast.success('Compte rendu modifié')
                    }}
                    className="btn-primary flex-1 justify-center text-xs"
                  >
                    <CheckCircle size={13} /> Enregistrer
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete compte rendu confirmation */}
      <AnimatePresence>
        {deleteCompteRenduConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && setDeleteCompteRenduConfirm(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden"
            >
              <div className="px-5 pt-5 pb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center mb-3">
                  <Trash2 size={18} className="text-rose-500" />
                </div>
                <div className="font-semibold text-ink text-sm mb-1">Supprimer le compte rendu</div>
                <p className="text-xs text-muted">Cette action est irréversible. Le compte rendu sera définitivement supprimé.</p>
              </div>
              <div className="px-5 pb-5 flex gap-2">
                <button onClick={() => setDeleteCompteRenduConfirm(false)} className="btn-ghost flex-1 justify-center text-xs">Annuler</button>
                <button
                  onClick={() => {
                    updateProject(project.id, { compteRenduStatut: null })
                    setDeleteCompteRenduConfirm(false)
                    toast.success('Compte rendu supprimé')
                  }}
                  className="flex-1 bg-rose-500 text-white px-4 py-2.5 rounded-xl font-medium text-xs hover:bg-rose-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 size={13} /> Supprimer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
