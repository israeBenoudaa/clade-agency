import { useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  X, FileText, Pencil, CheckCircle,
  Upload, Image as ImageIcon, Trash2, Download, Loader,
  Bold, Italic, List, ListOrdered, Heading2, Heading3, Undo, Redo,
} from 'lucide-react'
import { generateCompteRenduPdf } from '../utils/generatePdf'
import toast from 'react-hot-toast'
import { useState } from 'react'

export default function CompteRenduModal({ rdv, compteRendu, projectNom, onSave, onClose }) {
  const isEdit = Boolean(compteRendu)
  const [images, setImages] = useState(() => compteRendu?.images ?? [])
  const [exporting, setExporting] = useState(false)
  const fileRef = useRef()

  const editor = useEditor({
    extensions: [StarterKit],
    content: compteRendu?.contenu ?? '',
    editorProps: {
      attributes: {
        class: 'prose-editor focus:outline-none min-h-[200px]',
      },
    },
  })

  const handleImages = (e) => {
    const files = Array.from(e.target.files)
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (ev) =>
        setImages(prev => [...prev, { src: ev.target.result, caption: '' }])
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const removeImage = (idx) => setImages(prev => prev.filter((_, i) => i !== idx))

  const setCaption = (idx, caption) =>
    setImages(prev => prev.map((img, i) => i === idx ? { ...img, caption } : img))

  const buildPayload = () => ({
    contenu: editor?.getHTML() ?? '',
    images,
    createdAt: compteRendu?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  const handleSave = () => {
    onSave(buildPayload())
    toast.success(isEdit ? 'Compte rendu modifié' : 'Compte rendu créé')
    onClose()
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      await generateCompteRenduPdf({ rdv, compteRendu: buildPayload(), projectNom })
      toast.success('PDF exporté')
    } catch {
      toast.error('Erreur lors de la génération du PDF')
    } finally {
      setExporting(false)
    }
  }

  const ToolBtn = ({ onClick, active, title, children }) => (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      title={title}
      className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${
        active
          ? 'bg-electric text-white'
          : 'text-muted hover:text-ink hover:bg-paper-warm'
      }`}
    >
      {children}
    </button>
  )

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm z-50"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-border flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isEdit ? 'bg-electric/10' : 'bg-violet-50'}`}>
                {isEdit ? <Pencil size={16} className="text-electric" /> : <FileText size={16} className="text-violet-600" />}
              </div>
              <div>
                <div className="font-semibold text-ink text-sm">
                  {isEdit ? 'Modifier le compte rendu' : 'Nouveau compte rendu'}
                </div>
                <div className="text-xs text-muted truncate max-w-[300px]">{rdv.nom}</div>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-paper-warm flex items-center justify-center text-muted hover:text-ink transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

            {/* Rich text editor */}
            <div>
              <label className="label-text mb-2 block">Contenu de la réunion</label>

              {/* Toolbar */}
              <div className="flex items-center gap-0.5 px-2 py-1.5 border border-border border-b-0 rounded-t-xl bg-paper-warm flex-wrap">
                <ToolBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')} title="Gras">
                  <Bold size={13} />
                </ToolBtn>
                <ToolBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')} title="Italique">
                  <Italic size={13} />
                </ToolBtn>

                <div className="w-px h-5 bg-border mx-1" />

                <ToolBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })} title="Titre">
                  <Heading2 size={13} />
                </ToolBtn>
                <ToolBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={editor?.isActive('heading', { level: 3 })} title="Sous-titre">
                  <Heading3 size={13} />
                </ToolBtn>

                <div className="w-px h-5 bg-border mx-1" />

                <ToolBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')} title="Liste à puces">
                  <List size={13} />
                </ToolBtn>
                <ToolBtn onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')} title="Liste numérotée">
                  <ListOrdered size={13} />
                </ToolBtn>

                <div className="w-px h-5 bg-border mx-1" />

                <ToolBtn onClick={() => editor?.chain().focus().undo().run()} active={false} title="Annuler">
                  <Undo size={13} />
                </ToolBtn>
                <ToolBtn onClick={() => editor?.chain().focus().redo().run()} active={false} title="Rétablir">
                  <Redo size={13} />
                </ToolBtn>
              </div>

              {/* Editor area */}
              <div className="border border-border rounded-b-xl px-4 py-3 bg-white focus-within:border-electric/50 focus-within:ring-1 focus-within:ring-electric/20 transition-all">
                <EditorContent editor={editor} />
              </div>
            </div>

            {/* Images */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label-text flex items-center gap-1">
                  <ImageIcon size={11} /> Photos &amp; documents
                </label>
                <span className="text-[10px] text-muted">{images.length} fichier{images.length !== 1 ? 's' : ''}</span>
              </div>

              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImages} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-border rounded-xl py-5 flex flex-col items-center gap-2 text-muted hover:border-electric/40 hover:text-electric hover:bg-electric/5 transition-all"
              >
                <Upload size={20} />
                <span className="text-xs font-medium">Cliquer pour ajouter des images</span>
                <span className="text-[10px]">PNG, JPG — plusieurs fichiers acceptés</span>
              </button>

              {images.length > 0 && (
                <div className="grid grid-cols-2 gap-4 mt-3">
                  {images.map((img, i) => (
                    <div key={i} className="border border-border rounded-xl overflow-hidden bg-paper-warm">
                      <div className="relative group aspect-video">
                        <img src={img.src} alt={`img-${i}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-ink/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => removeImage(i)}
                            className="w-7 h-7 bg-rose-500 rounded-lg flex items-center justify-center text-white hover:bg-rose-600 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <div className="absolute top-1.5 left-1.5 text-[9px] font-bold text-white bg-ink/60 px-1.5 py-0.5 rounded-md">
                          {i + 1}
                        </div>
                      </div>
                      <div className="px-3 py-2">
                        <input
                          type="text"
                          className="w-full text-xs bg-transparent border-b border-border focus:border-electric outline-none py-1 text-ink placeholder-muted transition-colors"
                          placeholder="Ajouter une légende…"
                          value={img.caption}
                          onChange={(e) => setCaption(i, e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border flex gap-3 flex-shrink-0">
            <button type="button" onClick={onClose} className="btn-ghost">
              Annuler
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ink text-paper text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {exporting ? <Loader size={14} className="animate-spin" /> : <Download size={14} />}
              {exporting ? 'Export…' : 'Exporter PDF'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="btn-primary flex-1 justify-center flex items-center gap-2"
            >
              <CheckCircle size={15} />
              {isEdit ? 'Enregistrer les modifications' : 'Créer le compte rendu'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
