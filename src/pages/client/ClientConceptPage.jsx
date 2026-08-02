import { useState, useMemo } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'
import { Heart, X, Star, CheckCircle, Download, Loader, ChevronRight, LayoutGrid, Ruler, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { useClientLang } from '../../context/ClientLangContext'
import { supabase } from '../../lib/supabase'
import { generateConceptPdf } from '../../utils/generateConceptPdf'
import { exportProgrammeExcel, exportEstimationExcel } from '../../utils/exportTableExcel'

function getImgUrl(image) {
  if (image?.storagePath && supabase) {
    return supabase.storage.from('concept-images').getPublicUrl(image.storagePath).data.publicUrl
  }
  return image?.url || image?.dataUrl || ''
}

function ConceptImg({ image, className }) {
  return <img src={getImgUrl(image)} alt={image?.name} className={className} />
}

// ── Swipe card ────────────────────────────────────────────────────────────────

function SwipeCard({ image, onSwipe, isTop, stackOffset }) {
  const imgSrc = getImgUrl(image)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotate = useTransform(x, [-250, 250], [-18, 18])
  const likeOpacity  = useTransform(x, [30, 130], [0, 1])
  const nopeOpacity  = useTransform(x, [-30, -130], [0, 1])
  const superOpacity = useTransform(y, [-30, -120], [0, 1])

  const flyOut = async (direction) => {
    if (direction === 'like')      await animate(x, 600, { duration: 0.28, ease: 'easeOut' })
    else if (direction === 'dislike') await animate(x, -600, { duration: 0.28, ease: 'easeOut' })
    else                              await animate(y, -700, { duration: 0.28, ease: 'easeOut' })
    onSwipe(direction)
  }

  const handleDragEnd = (_, info) => {
    const { offset, velocity } = info
    if (offset.x > 100 || velocity.x > 600)       flyOut('like')
    else if (offset.x < -100 || velocity.x < -600) flyOut('dislike')
    else if (offset.y < -80 || velocity.y < -600)  flyOut('superlike')
    else {
      animate(x, 0, { type: 'spring', stiffness: 380, damping: 22 })
      animate(y, 0, { type: 'spring', stiffness: 380, damping: 22 })
    }
  }

  if (!isTop) {
    return (
      <motion.div
        className="absolute inset-0 rounded-[28px] overflow-hidden shadow-xl border border-white/20"
        style={{ scale: 1 - stackOffset * 0.04, y: stackOffset * 14, zIndex: 10 - stackOffset }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        <img src={imgSrc} alt={image.name} className="w-full h-full object-cover" draggable={false} />
        <div className="absolute inset-0 bg-ink/20" />
      </motion.div>
    )
  }

  return (
    <motion.div
      style={{ x, y, rotate, zIndex: 20 }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.85}
      onDragEnd={handleDragEnd}
      className="absolute inset-0 rounded-[28px] overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing select-none border border-white/10"
      whileDrag={{ scale: 1.02 }}
    >
      <img
        src={imgSrc}
        alt={image.name}
        className="w-full h-full object-cover pointer-events-none select-none"
        draggable={false}
             />

      {/* Bottom gradient */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

      {/* Like indicator */}
      <motion.div
        style={{ opacity: likeOpacity }}
        className="absolute top-7 left-7 z-30 pointer-events-none"
      >
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl border-4 border-emerald-400 bg-emerald-500/90 -rotate-[18deg]">
          <Heart size={22} className="text-white fill-white" />
          <span className="text-white font-black text-xl tracking-wide">LIKE</span>
        </div>
      </motion.div>

      {/* Nope indicator */}
      <motion.div
        style={{ opacity: nopeOpacity }}
        className="absolute top-7 right-7 z-30 pointer-events-none"
      >
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl border-4 border-rose-400 bg-rose-500/90 rotate-[18deg]">
          <X size={22} className="text-white" strokeWidth={3} />
          <span className="text-white font-black text-xl tracking-wide">NON</span>
        </div>
      </motion.div>

      {/* Super indicator */}
      <motion.div
        style={{ opacity: superOpacity }}
        className="absolute top-7 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
      >
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl border-4 border-amber-300 bg-amber-400/90">
          <Star size={22} className="text-white fill-white" />
          <span className="text-white font-black text-xl tracking-wide">SUPER</span>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Questionnaire view ────────────────────────────────────────────────────────

function QuestionnaireView({ questions, answers, setAnswers, onComplete, isGenerating }) {
  const [currentQ, setCurrentQ] = useState(0)
  const { t } = useClientLang()
  const q = questions[currentQ]
  const isLast = currentQ === questions.length - 1

  const answer = answers[q.id] || ''

  const goNext = () => {
    if (isLast) { onComplete(); return }
    setCurrentQ(prev => prev + 1)
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
      {/* Progress */}
      <div className="w-full max-w-lg mb-8">
        <div className="flex items-center justify-between text-xs text-muted mb-2">
          <span>Question {currentQ + 1} sur {questions.length}</span>
          <span>{Math.round(((currentQ) / questions.length) * 100)}%</span>
        </div>
        <div className="h-1.5 bg-paper-warm rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-electric to-cyan-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${((currentQ) / questions.length) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQ}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-lg"
        >
          <div className="card p-6 lg:p-8 space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-electric bg-electric/10 px-2.5 py-1 rounded-full mb-3">
                ✏️ Question {currentQ + 1}
              </div>
              <h2 className="font-display text-2xl text-ink leading-snug">{q.text}</h2>
            </div>

            {q.type === 'text' ? (
              <textarea
                className="input-field resize-none w-full"
                rows={4}
                placeholder="Votre réponse..."
                value={answer}
                onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                autoFocus
              />
            ) : (
              <div className="space-y-2">
                {q.options.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                    className={`w-full text-left px-4 py-3.5 rounded-xl border-2 text-sm font-medium transition-all ${
                      answer === opt
                        ? 'border-electric bg-electric/5 text-electric'
                        : 'border-border text-ink hover:border-electric/40 hover:bg-electric/[0.03]'
                    }`}
                  >
                    <span className={`inline-flex w-6 h-6 rounded-full border-2 mr-3 text-xs items-center justify-center transition-all ${
                      answer === opt ? 'border-electric bg-electric text-white' : 'border-border text-muted'
                    }`}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={goNext}
              disabled={isGenerating}
              className="btn-primary w-full justify-center text-sm"
            >
              {isGenerating ? (
                <><Loader size={15} className="animate-spin" /> {t('concept.generating')}</>
              ) : isLast ? (
                <><CheckCircle size={15} /> {t('concept.finish')}</>
              ) : (
                <>{t('concept.next')} <ChevronRight size={15} /></>
              )}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ── Shared table helpers ──────────────────────────────────────────────────────

function calcSt(item) {
  return (Number(item.quantite) || 0) * (Number(item.superficieUnitaire) || 0)
}

function calcPt(item) {
  return calcSt(item) * (Number(item.prixEstimation) || 0)
}

function fmtNum(n) {
  return n ? Number(n).toLocaleString('fr-FR') : '0'
}

function ProgrammeTable({ programme, projectNom }) {
  const groupes = programme?.groupes || []
  const grandTotal = groupes.flatMap(g => g.items || []).reduce((s, i) => s + calcSt(i), 0)

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
            <LayoutGrid size={15} className="text-emerald-700" />
          </div>
          <div>
            <div className="font-semibold text-ink text-sm">Programmation</div>
            <div className="text-[10px] text-muted">Surfaces &amp; espaces requis</div>
          </div>
        </div>
        <button
          onClick={() => exportProgrammeExcel(programme, projectNom)}
          className="flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors font-medium"
        >
          <Download size={13} />
          Excel
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr style={{ background: '#0A1E3F' }}>
              {['Catégorie', 'Programme', 'Unité', 'Qté', 'Sup. unit. (m²)', 'Sup. totale (m²)'].map(h => (
                <th key={h} className="px-3 py-2.5 text-left font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groupes.flatMap(group => {
              const items = group.items || []
              const sub = items.reduce((s, i) => s + calcSt(i), 0)
              return [
                ...items.map((item, idx) => (
                  <tr key={item.id} className="border-b border-border/40">
                    {idx === 0 && (
                      <td rowSpan={items.length} style={{ background: '#C5D3E8', verticalAlign: 'middle', width: 110 }} className="px-3 py-2 border-r border-[#b0c0d8] font-semibold text-[#0A1E3F] text-[10px] uppercase tracking-wide">
                        {group.nom}
                      </td>
                    )}
                    <td className="px-3 py-2 text-ink">{item.programme}</td>
                    <td className="px-3 py-2 text-center text-muted">{item.unite}</td>
                    <td className="px-3 py-2 text-right text-muted">{item.quantite}</td>
                    <td className="px-3 py-2 text-right text-muted">{item.superficieUnitaire}</td>
                    <td className="px-3 py-2 text-right font-semibold text-ink">{calcSt(item)}</td>
                  </tr>
                )),
                <tr key={`st_${group.id}`} style={{ background: '#F3F4F6' }} className="border-b border-border">
                  <td colSpan={5} className="px-3 py-1.5 font-bold text-ink/60 text-[10px] uppercase tracking-wide">Sous-total — {group.nom}</td>
                  <td className="px-3 py-1.5 text-right font-bold text-ink text-xs">{sub} m²</td>
                </tr>,
              ]
            })}
            <tr style={{ background: '#0A1E3F' }}>
              <td colSpan={5} className="px-3 py-2.5 font-bold text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.8)' }}>SUPERFICIE TOTALE GLOBALE</td>
              <td className="px-3 py-2.5 text-right font-bold text-white text-sm">{grandTotal} m²</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function EstimationTable({ estimation, projectNom }) {
  const groupes = estimation?.groupes || []
  const allItems = groupes.flatMap(g => g.items || [])
  const grandSt = allItems.reduce((s, i) => s + calcSt(i), 0)
  const grandPt = allItems.reduce((s, i) => s + calcPt(i), 0)

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center">
            <Ruler size={15} className="text-violet-700" />
          </div>
          <div>
            <div className="font-semibold text-ink text-sm">Estimation</div>
            <div className="text-[10px] text-muted">Coûts prévisionnels &amp; budget</div>
          </div>
        </div>
        <button
          onClick={() => exportEstimationExcel(estimation, projectNom)}
          className="flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors font-medium"
        >
          <Download size={13} />
          Excel
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr style={{ background: '#0A1E3F' }}>
              {['Catégorie', 'Programme', 'Unité', 'Qté', 'Sup. unit.', 'Sup. totale (m²)', 'Prix/m² (DH)', 'Prix total (DH)'].map(h => (
                <th key={h} className="px-3 py-2.5 text-left font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groupes.flatMap(group => {
              const items = group.items || []
              const subSt = items.reduce((s, i) => s + calcSt(i), 0)
              const subPt = items.reduce((s, i) => s + calcPt(i), 0)
              return [
                ...items.map((item, idx) => (
                  <tr key={item.id} className="border-b border-border/40">
                    {idx === 0 && (
                      <td rowSpan={items.length} style={{ background: '#C5D3E8', verticalAlign: 'middle', width: 100 }} className="px-3 py-2 border-r border-[#b0c0d8] font-semibold text-[#0A1E3F] text-[10px] uppercase tracking-wide">
                        {group.nom}
                      </td>
                    )}
                    <td className="px-3 py-2 text-ink">{item.programme}</td>
                    <td className="px-3 py-2 text-center text-muted">{item.unite}</td>
                    <td className="px-3 py-2 text-right text-muted">{item.quantite}</td>
                    <td className="px-3 py-2 text-right text-muted">{item.superficieUnitaire}</td>
                    <td className="px-3 py-2 text-right font-semibold text-ink">{calcSt(item)}</td>
                    <td className="px-3 py-2 text-right text-muted">{fmtNum(item.prixEstimation)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-electric">{fmtNum(calcPt(item))}</td>
                  </tr>
                )),
                <tr key={`st_${group.id}`} style={{ background: '#F3F4F6' }} className="border-b border-border">
                  <td colSpan={5} className="px-3 py-1.5 font-bold text-ink/60 text-[10px] uppercase tracking-wide">Sous-total — {group.nom}</td>
                  <td className="px-3 py-1.5 text-right font-bold text-ink">{subSt} m²</td>
                  <td />
                  <td className="px-3 py-1.5 text-right font-bold text-electric">{fmtNum(subPt)} DH</td>
                </tr>,
              ]
            })}
            <tr style={{ background: '#0A1E3F' }}>
              <td colSpan={5} className="px-3 py-2.5 font-bold text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.8)' }}>TOTAL GÉNÉRAL</td>
              <td className="px-3 py-2.5 text-right font-bold text-white">{grandSt} m²</td>
              <td style={{ background: '#0A1E3F' }} />
              <td className="px-3 py-2.5 text-right font-bold text-cyan-300">{fmtNum(grandPt)} DH</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Done / completed view ─────────────────────────────────────────────────────

function DoneView({ concept, projectNom, project, onRestart }) {
  const { t } = useClientLang()
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    if (!concept?.clientResponse) return
    setIsDownloading(true)
    try {
      await generateConceptPdf({
        project: { nom: projectNom, client: '' },
        concept,
        response: concept.clientResponse,
        download: true,
      })
    } catch {
      toast.error('Erreur lors du téléchargement')
    } finally {
      setIsDownloading(false)
    }
  }

  const { imageVotes = {}, questionAnswers = {} } = concept?.clientResponse || {}
  const images = concept?.images || []
  const superCount  = images.filter(i => imageVotes[i.id] === 'superlike').length
  const likeCount   = images.filter(i => imageVotes[i.id] === 'like').length
  const nopeCount   = images.filter(i => imageVotes[i.id] === 'dislike').length

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Hero */}
      <div className="card p-6 lg:p-10 text-center bg-gradient-to-br from-electric/5 to-cyan-50/50 border border-electric/20">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
          className="w-20 h-20 rounded-3xl bg-gradient-to-br from-electric to-cyan-400 flex items-center justify-center mx-auto mb-5"
        >
          <CheckCircle size={36} className="text-white" />
        </motion.div>
        <h1 className="font-display text-3xl lg:text-4xl text-ink mb-2">{t('concept.done_title')}</h1>
        <p className="text-muted text-sm max-w-md mx-auto">{t('concept.done_sub')}</p>

        {/* Stats */}
        <div className="flex justify-center gap-8 mt-6">
          <div className="text-center">
            <div className="text-2xl font-black text-amber-500">⭐ {superCount}</div>
            <div className="text-[10px] text-muted uppercase tracking-widest mt-1">{t('concept.superlikes')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black text-emerald-500">👍 {likeCount}</div>
            <div className="text-[10px] text-muted uppercase tracking-widest mt-1">{t('concept.likes')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black text-rose-500">👎 {nopeCount}</div>
            <div className="text-[10px] text-muted uppercase tracking-widest mt-1">{t('concept.dislikes')}</div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mt-6">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="btn-primary"
          >
            {isDownloading ? <Loader size={15} className="animate-spin" /> : <Download size={15} />}
            {t('concept.download_pdf')}
          </button>
          {onRestart && (
            <button
              onClick={onRestart}
              className="btn-ghost text-sm"
            >
              {t('concept.restart')}
            </button>
          )}
        </div>
      </div>

      {/* Image results */}
      {['superlike', 'like', 'dislike'].map(vote => {
        const imgs = images.filter(i => imageVotes[i.id] === vote)
        if (!imgs.length) return null
        const cfg = {
          superlike: { label: t('concept.category.superlike'), emoji: '⭐', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
          like:      { label: t('concept.category.like'),      emoji: '👍', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
          dislike:   { label: t('concept.category.dislike'),   emoji: '👎', color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
        }[vote]
        return (
          <div key={vote} className="card p-5 lg:p-6">
            <div className={`inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full border mb-4 ${cfg.bg} ${cfg.color}`}>
              {cfg.emoji} {cfg.label} ({imgs.length})
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {imgs.map(img => (
                <div key={img.id} className="flex-shrink-0" style={{ width: 90 }}>
                  <div className="aspect-[9/16] rounded-xl overflow-hidden border border-border shadow-sm">
                    <ConceptImg image={img} className="w-full h-full object-cover" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Q&A results */}
      {concept?.questions?.length > 0 && (
        <div className="card p-5 lg:p-6">
          <div className="label-text mb-4">{t('concept.answers')}</div>
          <div className="space-y-3">
            {concept.questions.map((q, i) => (
              <div key={q.id} className="p-4 bg-paper-warm rounded-xl">
                <div className="text-xs font-bold text-muted mb-1">{i + 1}. {q.text}</div>
                <div className="text-sm text-ink font-medium">
                  {questionAnswers[q.id] || <span className="text-muted italic">{t('concept.no_answer')}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Programme table (shared) */}
      {project?.programme?.statut === 'partage' && project.programme.groupes?.length > 0 && (
        <div>
          <div className="label-text mb-3">{t('concept.programme')}</div>
          <ProgrammeTable programme={project.programme} projectNom={projectNom} />
        </div>
      )}

      {/* Estimation table (shared) */}
      {project?.estimation?.statut === 'partage' && project.estimation.groupes?.length > 0 && (
        <div>
          <div className="label-text mb-3">{t('concept.estimation')}</div>
          <EstimationTable estimation={project.estimation} projectNom={projectNom} />
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ClientConceptPage() {
  const { prospectId } = useAuth()
  const { projects, prospects, saveConceptResponse, clearConceptResponse } = useData()
  const { t } = useClientLang()

  const prospect = prospectId ? prospects.find(p => p.id === prospectId) : null

  // Prefer prospectId exact match, then fall back to name/clientId match
  const project = useMemo(() => {
    if (!prospect) return null
    const name = `${prospect.prenom} ${prospect.nom}`
    const candidates = projects.filter(p =>
      p.prospectId === prospect.id || p.clientId === prospect.id || p.client === name
    )
    return candidates.find(p => p.prospectId === prospect.id) || candidates[0] || null
  }, [prospect, projects])

  const rawConcept = project?.concept || {}
  const concept = {
    images: Array.isArray(rawConcept.images) ? rawConcept.images : [],
    questions: Array.isArray(rawConcept.questions) ? rawConcept.questions : [],
    clientResponse: rawConcept.clientResponse ?? null,
  }

  const [phase, setPhase] = useState('swipe')
  const [currentIdx, setCurrentIdx] = useState(0)
  const [votes, setVotes] = useState({})
  const [answers, setAnswers] = useState({})
  const [isGenerating, setIsGenerating] = useState(false)

  const hasProgramme = project?.programme?.statut === 'partage' && project.programme.groupes?.length > 0
  const hasEstimation = project?.estimation?.statut === 'partage' && project.estimation.groupes?.length > 0

  // Already completed → show results
  if (concept.clientResponse) {
    return (
      <DoneView concept={concept} projectNom={project?.nom || ''} project={project} onRestart={() => clearConceptResponse(project.id)} />
    )
  }

  // No concept images yet — show shared tables if available
  if (!project || concept.images.length === 0) {
    return (
      <div className="space-y-6">
        {/* Show hero only when no content */}
        {!hasProgramme && !hasEstimation && (
          <div className="flex flex-col items-center text-center py-16 px-6 space-y-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #0A1E3F 0%, #3B7BF6 55%, #06B6D4 100%)' }}
            >
              <Sparkles size={34} className="text-white" />
            </motion.div>
            <p className="text-sm text-muted max-w-xs leading-relaxed">
              {t('concept.coming_soon')}
            </p>
          </div>
        )}

        {hasProgramme && (
          <div>
            <div className="label-text mb-3">{t('concept.programme')}</div>
            <ProgrammeTable programme={project.programme} projectNom={project.nom} />
          </div>
        )}
        {hasEstimation && (
          <div>
            <div className="label-text mb-3">{t('concept.estimation')}</div>
            <EstimationTable estimation={project.estimation} projectNom={project.nom} />
          </div>
        )}
      </div>
    )
  }

  const images = concept.images
  const visibleCards = images.slice(currentIdx, currentIdx + 3)

  const handleSwipe = (direction) => {
    const image = images[currentIdx]
    const newVotes = { ...votes, [image.id]: direction }
    setVotes(newVotes)

    if (currentIdx >= images.length - 1) {
      if (concept.questions.length > 0) {
        setPhase('questionnaire')
      } else {
        handleComplete(newVotes, {})
      }
    } else {
      setCurrentIdx(prev => prev + 1)
    }
  }

  const handleComplete = async (finalVotes, finalAnswers) => {
    setIsGenerating(true)
    const response = {
      completedAt: new Date().toISOString(),
      imageVotes: finalVotes,
      questionAnswers: finalAnswers,
    }
    saveConceptResponse(project.id, response)
    setTimeout(() => {
      setIsGenerating(false)
      setPhase('done')
    }, 400)
  }

  if (phase === 'done') {
    const syntheticConcept = { ...concept, clientResponse: { completedAt: new Date().toISOString(), imageVotes: votes, questionAnswers: answers } }
    return <DoneView concept={syntheticConcept} projectNom={project.nom} project={project} onRestart={() => clearConceptResponse(project.id)} />
  }

  if (phase === 'questionnaire') {
    return (
      <QuestionnaireView
        questions={concept.questions}
        answers={answers}
        setAnswers={setAnswers}
        onComplete={() => handleComplete(votes, answers)}
        isGenerating={isGenerating}
      />
    )
  }

  // ── Swipe phase ────────────────────────────────────────────────────────────

  const progress = currentIdx / images.length

  return (
    <div className="max-w-sm mx-auto space-y-5">
      {/* Header */}
      <div>
        <div className="label-text text-[10px] mb-1">{t('concept.label')}</div>
        <h1 className="font-display text-2xl text-ink">{t('concept.title')}</h1>
        <p className="text-xs text-muted mt-1 leading-relaxed">{t('concept.hint')}</p>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted">
          <span>{currentIdx + 1} / {images.length}</span>
          <span className="font-semibold text-electric">{Math.round(progress * 100)}% parcouru</span>
        </div>
        <div className="h-1.5 bg-paper-warm rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-electric to-cyan-400 rounded-full"
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Card stack */}
      <div className="relative" style={{ height: 480 }}>
        {/* Background cards (depth effect) */}
        {visibleCards.slice(1).reverse().map((img, si) => (
          <SwipeCard
            key={`bg_${img.id}`}
            image={img}
            onSwipe={() => {}}
            isTop={false}
            stackOffset={visibleCards.length - 1 - si}
          />
        ))}

        {/* Top (active) card */}
        <AnimatePresence>
          {visibleCards[0] && (
            <SwipeCard
              key={`top_${currentIdx}`}
              image={visibleCards[0]}
              onSwipe={handleSwipe}
              isTop
              stackOffset={0}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Action hints */}
      <div className="flex items-center justify-between text-[10px] text-muted px-2">
        <span>👈 Pas pour moi</span>
        <span>👆 Super coup de cœur</span>
        <span>J'adore 👉</span>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-5">
        {/* Dislike */}
        <button
          onClick={() => handleSwipe('dislike')}
          className="w-14 h-14 rounded-full bg-white shadow-lg border-2 border-rose-200 flex items-center justify-center text-rose-500 hover:bg-rose-50 hover:scale-110 active:scale-95 transition-all"
        >
          <X size={24} strokeWidth={2.5} />
        </button>

        {/* Superlike */}
        <button
          onClick={() => handleSwipe('superlike')}
          className="w-[72px] h-[72px] rounded-full shadow-xl flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all"
          style={{ background: 'linear-gradient(135deg, #F59E0B, #EF4444)' }}
        >
          <Star size={28} className="fill-white" />
        </button>

        {/* Like */}
        <button
          onClick={() => handleSwipe('like')}
          className="w-14 h-14 rounded-full bg-white shadow-lg border-2 border-emerald-200 flex items-center justify-center text-emerald-500 hover:bg-emerald-50 hover:scale-110 active:scale-95 transition-all"
        >
          <Heart size={24} className="fill-emerald-500" />
        </button>
      </div>

      {/* Vote legend */}
      <div className="flex items-center justify-center gap-6 pt-2">
        {Object.entries(votes).length > 0 && (
          <>
            {['superlike', 'like', 'dislike'].map(v => {
              const count = Object.values(votes).filter(vote => vote === v).length
              if (!count) return null
              const cfg = {
                superlike: { emoji: '⭐', color: 'text-amber-600' },
                like:      { emoji: '👍', color: 'text-emerald-600' },
                dislike:   { emoji: '👎', color: 'text-rose-500' },
              }[v]
              return (
                <span key={v} className={`text-xs font-bold ${cfg.color}`}>
                  {cfg.emoji} {count}
                </span>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
