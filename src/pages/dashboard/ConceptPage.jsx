import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Upload, X, Plus, Trash2, CheckCircle,
  Clock, Download, Image, Loader, AlignLeft, List, Link,
} from 'lucide-react'
import { useData } from '../../context/DataContext'
import { supabase } from '../../lib/supabase'
import { generateConceptPdf } from '../../utils/generateConceptPdf'
import { compressImage } from '../../utils/compressImage'
import toast from 'react-hot-toast'

export default function ConceptPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { projects, updateConceptImages, updateConceptQuestions } = useData()

  const project = projects.find(p => String(p.id) === id)
  const concept = project?.concept || { images: [], questions: [], clientResponse: null }

  const [tab, setTab] = useState('images')
  const [newQType, setNewQType] = useState('text')
  const [newQText, setNewQText] = useState('')
  const [newQOptions, setNewQOptions] = useState(['', ''])
  const [isGenerating, setIsGenerating] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [showUrlInput, setShowUrlInput] = useState(false)
  const fileRef = useRef()

  if (!project) {
    return (
      <div className="p-10 text-center">
        <div className="font-display text-2xl text-ink mb-3">Projet introuvable</div>
        <button onClick={() => navigate('/app/projects')} className="btn-ghost">
          <ArrowLeft size={15} /> Retour
        </button>
      </div>
    )
  }

  const handleImages = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const toastId = toast.loading(`Upload de ${files.length} image${files.length > 1 ? 's' : ''}…`)
    try {
      const newImages = await Promise.all(files.map(async (file) => {
        const dataUrl = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = (ev) => resolve(ev.target.result)
          reader.readAsDataURL(file)
        })
        const compressed = await compressImage(dataUrl)
        const blob = await fetch(compressed).then(r => r.blob())
        const storagePath = `${project.id}/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.jpg`
        const { error: uploadError } = await supabase.storage
          .from('concept-images')
          .upload(storagePath, blob, { contentType: 'image/jpeg', upsert: false })
        if (uploadError) throw uploadError
        const { data: { publicUrl } } = supabase.storage.from('concept-images').getPublicUrl(storagePath)
        return { id: `img${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, url: publicUrl, storagePath, name: file.name }
      }))
      updateConceptImages(project.id, [...concept.images, ...newImages])
      toast.success(`${newImages.length} image${newImages.length > 1 ? 's' : ''} ajoutée${newImages.length > 1 ? 's' : ''}`, { id: toastId })
    } catch (err) {
      console.error('[ConceptPage] image upload error:', err)
      const msg = err?.message?.includes('Bucket not found') || err?.message?.includes('not found')
        ? 'Bucket "concept-images" introuvable — crée-le dans Supabase Dashboard → Storage.'
        : `Erreur upload : ${err?.message || 'inconnue'}`
      toast.error(msg, { id: toastId })
    }
    e.target.value = ''
  }

  const removeImage = async (imgId) => {
    const img = concept.images.find(i => i.id === imgId)
    if (img?.storagePath && supabase) {
      try {
        await supabase.storage.from('concept-images').remove([img.storagePath])
      } catch (err) {
        console.warn('[ConceptPage] storage remove error:', err?.message)
      }
    }
    updateConceptImages(project.id, concept.images.filter(i => i.id !== imgId))
  }

  const handleAddUrl = () => {
    const trimmed = urlInput.trim()
    if (!trimmed) { toast.error('Collez une URL d\'image'); return }
    if (!/^https?:\/\/.+/.test(trimmed)) { toast.error('URL invalide — doit commencer par http(s)://'); return }
    const newImg = {
      id: `img${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      url: trimmed,
      storagePath: null,
      name: trimmed.split('/').pop().split('?')[0] || 'Image URL',
    }
    updateConceptImages(project.id, [...concept.images, newImg])
    setUrlInput('')
    setShowUrlInput(false)
    toast.success('Image ajoutée par lien')
  }

  const addQuestion = () => {
    if (!newQText.trim()) { toast.error('Entrez le texte de la question'); return }
    if (newQType === 'mcq' && newQOptions.filter(o => o.trim()).length < 2) {
      toast.error('Ajoutez au moins 2 options'); return
    }
    const q = {
      id: `q${Date.now()}`,
      type: newQType,
      text: newQText.trim(),
      options: newQType === 'mcq' ? newQOptions.filter(o => o.trim()) : [],
    }
    updateConceptQuestions(project.id, [...concept.questions, q])
    setNewQText('')
    setNewQOptions(['', ''])
    toast.success('Question ajoutée')
  }

  const removeQuestion = (qId) => {
    updateConceptQuestions(project.id, concept.questions.filter(q => q.id !== qId))
  }

  const handleDownloadPdf = async () => {
    if (!concept.clientResponse) { toast.error('Le client n\'a pas encore répondu'); return }
    setIsGenerating(true)
    try {
      await generateConceptPdf({ project, concept, response: concept.clientResponse, download: true })
      toast.success('PDF généré')
    } catch {
      toast.error('Erreur lors de la génération du PDF')
    } finally {
      setIsGenerating(false)
    }
  }

  const TABS = [
    { key: 'images', label: 'Images', badge: concept.images.length },
    { key: 'questionnaire', label: 'Questionnaire', badge: concept.questions.length },
    { key: 'reponse', label: 'Réponse client', badge: concept.clientResponse ? '✓' : null },
  ]

  return (
    <div className="p-4 lg:p-10 space-y-6">
      {/* Breadcrumb */}
      <button
        onClick={() => navigate(`/app/projects/${id}`)}
        className="flex items-center gap-2 text-sm text-muted hover:text-ink transition-colors"
      >
        <ArrowLeft size={15} /> Retour au projet
      </button>

      {/* Header card */}
      <div className="card p-5 lg:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-electric to-cyan-400 flex items-center justify-center flex-shrink-0">
              <Image size={22} className="text-white" />
            </div>
            <div>
              <div className="label-text text-[10px]">Concept &amp; Programmation</div>
              <h1 className="font-display text-2xl text-ink leading-tight">{project.nom}</h1>
            </div>
          </div>
          {concept.clientResponse && (
            <button
              onClick={handleDownloadPdf}
              disabled={isGenerating}
              className="btn-primary text-sm flex items-center gap-2 self-start sm:self-auto"
            >
              {isGenerating ? <Loader size={14} className="animate-spin" /> : <Download size={14} />}
              Rapport PDF
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mt-5 border-b border-border overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                tab === t.key
                  ? 'border-electric text-electric'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {t.label}
              {t.badge !== null && t.badge !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  tab === t.key ? 'bg-electric/15 text-electric' : 'bg-paper-warm text-muted'
                }`}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Images tab ── */}
      <AnimatePresence mode="wait">
        {tab === 'images' && (
          <motion.div key="images" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="card p-5 space-y-3">
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImages} />
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-electric/30 rounded-2xl p-8 flex flex-col items-center gap-3 hover:border-electric/60 hover:bg-electric/[0.03] transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-electric/10 flex items-center justify-center group-hover:bg-electric/20 transition-colors">
                  <Upload size={22} className="text-electric" />
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-ink">Cliquer pour uploader des images</div>
                  <div className="text-xs text-muted mt-1">PNG, JPG, WEBP — affichées en portrait 9:16</div>
                </div>
              </button>

              {/* URL input */}
              {!showUrlInput ? (
                <button
                  onClick={() => setShowUrlInput(true)}
                  className="w-full flex items-center justify-center gap-2 text-sm text-muted hover:text-ink border border-border/60 rounded-xl py-2.5 hover:bg-paper-warm transition-all"
                >
                  <Link size={14} /> Ajouter par lien URL
                </button>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddUrl(); if (e.key === 'Escape') { setShowUrlInput(false); setUrlInput('') } }}
                    placeholder="https://example.com/image.jpg"
                    autoFocus
                    className="flex-1 px-3 py-2 text-sm rounded-xl border border-border bg-paper-warm focus:outline-none focus:ring-2 focus:ring-electric/40"
                  />
                  <button onClick={handleAddUrl} className="px-4 py-2 text-sm font-semibold rounded-xl bg-electric text-white hover:bg-electric/90 transition-colors">
                    Ajouter
                  </button>
                  <button onClick={() => { setShowUrlInput(false); setUrlInput('') }} className="px-3 py-2 rounded-xl border border-border hover:bg-paper-warm transition-colors">
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>

            {concept.images.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {concept.images.map((img, idx) => (
                  <div key={img.id} className="group relative">
                    <div className="aspect-[9/16] bg-paper-warm rounded-xl overflow-hidden relative border border-border">
                      <img
                        src={img.storagePath && supabase
                          ? supabase.storage.from('concept-images').getPublicUrl(img.storagePath).data.publicUrl
                          : (img.url || img.dataUrl || '')}
                        alt={img.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-ink/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          onClick={() => removeImage(img.id)}
                          className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600 transition-colors shadow-lg"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div className="absolute top-2 left-2 flex items-center gap-1">
                        <div className="w-5 h-5 rounded-full bg-ink/60 text-white text-[9px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </div>
                        {!img.storagePath && (
                          <div className="w-5 h-5 rounded-full bg-electric/80 text-white flex items-center justify-center" title="Image par lien URL">
                            <Link size={9} />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-[9px] text-muted truncate mt-1 px-0.5">{img.name}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-muted">
                Aucune image — uploadez des références visuelles pour le client
              </div>
            )}
          </motion.div>
        )}

        {/* ── Questionnaire tab ── */}
        {tab === 'questionnaire' && (
          <motion.div key="questionnaire" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* Questions list */}
            <div className="card p-5">
              {concept.questions.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted">
                  Aucune question — construisez le questionnaire ci-dessous
                </div>
              ) : (
                <div className="space-y-3">
                  {concept.questions.map((q, idx) => (
                    <div key={q.id} className="flex items-start gap-3 p-4 bg-paper-warm rounded-xl border border-border/50">
                      <div className="w-7 h-7 rounded-lg bg-electric/10 text-electric text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-ink">{q.text}</div>
                        <div className="flex items-center gap-1.5 mt-1">
                          {q.type === 'text' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted">
                              <AlignLeft size={10} /> Réponse libre
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted">
                              <List size={10} /> Choix multiple
                            </span>
                          )}
                        </div>
                        {q.type === 'mcq' && q.options.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {q.options.map((opt, i) => (
                              <span key={i} className="text-xs bg-white border border-border rounded-lg px-2 py-0.5 text-ink">
                                {opt}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => removeQuestion(q.id)}
                        className="text-muted hover:text-rose-500 transition-colors flex-shrink-0 mt-0.5"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add question form */}
            <div className="card p-5 space-y-4">
              <div className="label-text">Nouvelle question</div>

              {/* Type selector */}
              <div className="flex gap-2">
                {[{ val: 'text', label: 'Réponse libre', Icon: AlignLeft }, { val: 'mcq', label: 'Choix multiple', Icon: List }].map(({ val, label, Icon }) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setNewQType(val)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      newQType === val ? 'bg-ink text-paper shadow-sm' : 'bg-paper-warm border border-border text-muted hover:text-ink'
                    }`}
                  >
                    <Icon size={13} /> {label}
                  </button>
                ))}
              </div>

              <input
                className="input-field"
                placeholder="Quel style architectural vous inspire le plus ?"
                value={newQText}
                onChange={e => setNewQText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && newQType === 'text' && addQuestion()}
              />

              {newQType === 'mcq' && (
                <div className="space-y-2">
                  <div className="text-xs text-muted font-medium">Options de réponse</div>
                  {newQOptions.map((opt, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        className="input-field text-sm flex-1"
                        placeholder={`Option ${i + 1}`}
                        value={opt}
                        onChange={e => {
                          const updated = [...newQOptions]
                          updated[i] = e.target.value
                          setNewQOptions(updated)
                        }}
                      />
                      {newQOptions.length > 2 && (
                        <button
                          onClick={() => setNewQOptions(prev => prev.filter((_, j) => j !== i))}
                          className="text-muted hover:text-rose-500 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => setNewQOptions(prev => [...prev, ''])}
                    className="flex items-center gap-1.5 text-xs text-electric hover:text-ink transition-colors font-medium"
                  >
                    <Plus size={12} /> Ajouter une option
                  </button>
                </div>
              )}

              <button onClick={addQuestion} className="btn-primary w-full justify-center">
                <Plus size={14} /> Ajouter la question
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Réponse client tab ── */}
        {tab === 'reponse' && (
          <motion.div key="reponse" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {concept.clientResponse ? (
              <div className="space-y-4">
                {/* Status banner */}
                <div className="card p-5 border-l-4 border-emerald-400 bg-emerald-50/40">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle size={18} className="text-emerald-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-ink">Réponse reçue</div>
                      <div className="text-xs text-muted">
                        {concept.clientResponse.completedAt
                          ? new Date(concept.clientResponse.completedAt).toLocaleDateString('fr-FR', {
                              day: '2-digit', month: '2-digit', year: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })
                          : ''}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Image votes */}
                <div className="card p-5">
                  <div className="label-text mb-4">Sélection des images</div>
                  {['superlike', 'like', 'dislike'].map(vote => {
                    const imgs = concept.images.filter(img => concept.clientResponse.imageVotes?.[img.id] === vote)
                    const cfg = {
                      superlike: { label: 'Super aimées', emoji: '⭐', color: 'text-amber-600 bg-amber-100 border-amber-200' },
                      like:      { label: 'Aimées',       emoji: '👍', color: 'text-emerald-700 bg-emerald-100 border-emerald-200' },
                      dislike:   { label: 'Non retenues', emoji: '👎', color: 'text-rose-600 bg-rose-100 border-rose-200' },
                    }[vote]
                    return (
                      <div key={vote} className="mb-5 last:mb-0">
                        <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border mb-3 ${cfg.color}`}>
                          {cfg.emoji} {cfg.label} — {imgs.length}
                        </div>
                        {imgs.length > 0 ? (
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {imgs.map(img => (
                              <div key={img.id} className="flex-shrink-0 w-16">
                                <div className="aspect-[9/16] rounded-lg overflow-hidden border border-border">
                                  <img src={img.url || img.dataUrl} alt={img.name} className="w-full h-full object-cover" />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-muted">Aucune image dans cette catégorie</div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Q&A */}
                {concept.questions.length > 0 && (
                  <div className="card p-5">
                    <div className="label-text mb-4">Réponses au questionnaire</div>
                    <div className="space-y-3">
                      {concept.questions.map((q, i) => (
                        <div key={q.id} className="p-4 bg-paper-warm rounded-xl border border-border/50">
                          <div className="text-xs font-semibold text-muted mb-1.5">Q{i + 1} — {q.text}</div>
                          <div className="text-sm text-ink font-medium">
                            {concept.clientResponse.questionAnswers?.[q.id] || (
                              <span className="text-muted italic">Sans réponse</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="card p-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-paper-warm flex items-center justify-center mx-auto mb-4">
                  <Clock size={26} className="text-muted" />
                </div>
                <div className="text-sm font-semibold text-ink mb-1">En attente de réponse client</div>
                <p className="text-xs text-muted max-w-xs mx-auto leading-relaxed">
                  {concept.images.length === 0
                    ? 'Commencez par uploader des images dans l\'onglet "Images".'
                    : 'Le client n\'a pas encore complété le questionnaire de concept.'}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
