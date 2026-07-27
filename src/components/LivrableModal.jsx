import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Link2, Paperclip, CheckCircle, Upload } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LivrableModal({ initial, onSave, onClose }) {
  const [nom, setNom] = useState(initial?.nom || '')
  const [type, setType] = useState(initial?.type || 'link')
  const [url, setUrl] = useState(initial?.url || '')
  const [fileData, setFileData] = useState(initial?.type === 'file' ? initial?.url : null)
  const [fileName, setFileName] = useState(initial?.fileName || '')
  const fileRef = useRef()
  const isEdit = Boolean(initial)

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setFileData(ev.target.result)
      setFileName(file.name)
      if (!nom) setNom(file.name.replace(/\.[^.]+$/, ''))
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleSave = () => {
    if (!nom.trim()) { toast.error('Le nom est requis'); return }
    if (type === 'link' && !url.trim()) { toast.error("L'URL est requise"); return }
    if (type === 'file' && !fileData) { toast.error('Veuillez sélectionner un fichier'); return }
    onSave({
      nom: nom.trim(),
      type,
      url: type === 'link' ? url.trim() : fileData,
      fileName: type === 'file' ? fileName : null,
    })
    onClose()
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm"
        onClick={e => e.target === e.currentTarget && onClose()}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-electric/10 flex items-center justify-center">
                <Paperclip size={14} className="text-electric" />
              </div>
              <div className="font-semibold text-ink text-sm">
                {isEdit ? 'Modifier le livrable' : 'Ajouter un livrable'}
              </div>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-paper-warm flex items-center justify-center text-muted">
              <X size={14} />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Nom */}
            <div>
              <label className="label-text mb-1.5 block">Nom du livrable</label>
              <input
                autoFocus
                value={nom}
                onChange={e => setNom(e.target.value)}
                placeholder="Ex: Plans d'exécution, Devis phase 2…"
                className="input-field w-full"
              />
            </div>

            {/* Type toggle */}
            <div>
              <label className="label-text mb-1.5 block">Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setType('link')}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold transition-all ${type === 'link' ? 'border-electric bg-electric/5 text-electric' : 'border-border text-muted hover:border-ink/20'}`}
                >
                  <Link2 size={15} /> Lien URL
                </button>
                <button
                  onClick={() => setType('file')}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold transition-all ${type === 'file' ? 'border-electric bg-electric/5 text-electric' : 'border-border text-muted hover:border-ink/20'}`}
                >
                  <Upload size={15} /> Fichier
                </button>
              </div>
            </div>

            {/* Link input */}
            {type === 'link' && (
              <div>
                <label className="label-text mb-1.5 block">URL</label>
                <input
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://drive.google.com/…"
                  className="input-field w-full"
                  type="url"
                />
              </div>
            )}

            {/* File upload */}
            {type === 'file' && (
              <div>
                <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
                {fileData ? (
                  <div className="flex items-center gap-3 p-3 bg-electric/5 border border-electric/20 rounded-xl">
                    <Paperclip size={14} className="text-electric flex-shrink-0" />
                    <span className="text-sm text-ink truncate flex-1">{fileName}</span>
                    <button onClick={() => { setFileData(null); setFileName('') }} className="text-muted hover:text-rose-500 transition-colors">
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-full border-2 border-dashed border-border rounded-xl py-5 flex flex-col items-center gap-2 text-muted hover:border-electric/40 hover:text-electric hover:bg-electric/5 transition-all"
                  >
                    <Upload size={18} />
                    <span className="text-xs font-medium">Cliquer pour sélectionner un fichier</span>
                  </button>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="btn-ghost flex-1 justify-center text-xs">Annuler</button>
              <button onClick={handleSave} className="btn-primary flex-1 justify-center text-xs">
                <CheckCircle size={13} /> {isEdit ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
