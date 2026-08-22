import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, CheckCircle, CheckCircle2, Calendar, AlertTriangle, Plus, Trash2, BookOpen, X, ChevronDown, ChevronUp, Pencil, FileText, ClipboardList, Clock, Check, Ban, Paperclip, Building2, UserSearch, Filter, Sun, Inbox, ExternalLink, Send, CalendarCheck, ChevronRight, Mail, Download, Award, Bold, Italic, Underline, List, ListOrdered, Undo2, PhoneCall, Globe } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useData } from '../../context/DataContext'
import NouveauEmployeModal from '../../components/NouveauEmployeModal'
import FormationModal from '../../components/FormationModal'
import SelectField from '../../components/SelectField'
import toast from 'react-hot-toast'

const DEPT_PALETTE = [
  { bg: 'bg-blue-100',   text: 'text-blue-700' },
  { bg: 'bg-emerald-100',text: 'text-emerald-700' },
  { bg: 'bg-violet-100', text: 'text-violet-700' },
  { bg: 'bg-amber-100',  text: 'text-amber-700' },
  { bg: 'bg-rose-100',   text: 'text-rose-700' },
  { bg: 'bg-cyan-100',   text: 'text-cyan-700' },
  { bg: 'bg-orange-100', text: 'text-orange-700' },
]
function deptColor(dept) {
  let h = 0
  for (let i = 0; i < (dept || '').length; i++) h = (h * 31 + (dept || '').charCodeAt(i)) & 0xffff
  return DEPT_PALETTE[h % DEPT_PALETTE.length]
}
function deptInitial(dept) {
  return (dept || '?').slice(0, 2).toUpperCase()
}

const DEMANDE_LABELS = {
  conge: 'Congé', absence: 'Absence', arret_maladie: 'Arrêt maladie',
  attestation: 'Attestation de travail', attestation_salaire: 'Attestation de salaire',
  autre: 'Autre demande', demission: 'Démission',
}
const DEMANDE_COLORS = {
  conge: 'bg-amber-100 text-amber-800',
  absence: 'bg-blue-100 text-blue-800',
  arret_maladie: 'bg-rose-100 text-rose-800',
  attestation: 'bg-violet-100 text-violet-800',
  attestation_salaire: 'bg-purple-100 text-purple-800',
  autre: 'bg-gray-100 text-gray-700',
  demission: 'bg-rose-100 text-rose-900',
}
const STATUT_COLORS = {
  en_attente: 'bg-amber-50 text-amber-700 border-amber-200',
  approuve: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  refuse: 'bg-rose-50 text-rose-700 border-rose-200',
}
const STATUT_LABELS = { en_attente: 'En attente', approuve: 'Approuvée', refuse: 'Refusée' }

// ─── AttestationModal ─────────────────────────────────────────────────────────
function AttestationModal({ employe, onClose, initialType = 'travail' }) {
  const [type, setType] = useState(initialType)
  const editorRef = useRef(null)

  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const year  = new Date().getFullYear()
  const docRef = `ATT-${year}-${String(employe.id || '').slice(-4).padStart(4, '0')}`

  // Nom corrigé : utilise nomFamille si dispo pour éviter la duplication
  const fullName = employe.nomFamille
    ? `${employe.prenom || ''} ${employe.nomFamille}`.trim()
    : employe.nom || ''

  const dateEmb = employe.dateEmbauche
    ? new Date(employe.dateEmbauche).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const contratLabel = employe.contrat === 'CDI' ? 'indéterminée (CDI)'
    : employe.contrat === 'CDD' ? 'déterminée (CDD)'
    : (employe.contrat || 'indéterminée')

  const travailHtml =
    `<p>Je soussigné, le Directeur Général du Cabinet d'Architecture CLADE, certifie que :</p>` +
    `<p>&nbsp;</p>` +
    `<p><strong>M. / Mme ${fullName}</strong>${employe.cin ? `,<br>Porteur(e) de la CIN n° ${employe.cin},` : ','}</p>` +
    `<p>&nbsp;</p>` +
    `<p>Exerce la fonction de <strong>${employe.poste || '—'}</strong> au sein de notre cabinet` +
    `${employe.dept ? `, au département <strong>${employe.dept}</strong>` : ''}` +
    `${dateEmb ? `,<br>et ce depuis le ${dateEmb}` : ''},<br>` +
    `dans le cadre d'un contrat à durée ${contratLabel}.</p>`

  const salaireHtml =
    `<p>Je soussigné, le Directeur Général du Cabinet d'Architecture CLADE, certifie que :</p>` +
    `<p>&nbsp;</p>` +
    `<p><strong>M. / Mme ${fullName}</strong>${employe.cin ? `,<br>Porteur(e) de la CIN n° ${employe.cin},` : ','}</p>` +
    `<p>&nbsp;</p>` +
    `<p>Exerce la fonction de <strong>${employe.poste || '—'}</strong> au sein de notre cabinet` +
    `${employe.dept ? `, au département <strong>${employe.dept}</strong>` : ''}` +
    `${dateEmb ? `, depuis le ${dateEmb}` : ''},<br>` +
    `et perçoit à ce titre une rémunération mensuelle de :</p>` +
    `<ul>` +
    `<li>Salaire brut : <strong>${employe.salaireBrut ? `${Number(employe.salaireBrut).toLocaleString('fr-FR')} DH` : '— DH'}</strong></li>` +
    `<li>Salaire net : <strong>${employe.salaireNet ? `${Number(employe.salaireNet).toLocaleString('fr-FR')} DH` : '— DH'}</strong></li>` +
    `</ul>`

  const getHtml = (t) => t === 'salaire' ? salaireHtml : travailHtml
  const title   = type === 'travail' ? 'ATTESTATION DE TRAVAIL' : 'ATTESTATION DE SALAIRE'

  // Initialise le contenu de l'éditeur au montage
  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = getHtml(initialType)
  }, []) // eslint-disable-line

  const handleTypeChange = (newType) => {
    setType(newType)
    if (editorRef.current) editorRef.current.innerHTML = getHtml(newType)
  }

  // Commandes de mise en forme
  const exec = (cmd, value) => {
    editorRef.current?.focus()
    document.execCommand(cmd, false, value ?? null)
  }

  const ToolBtn = ({ onClick, title: t, children, active }) => (
    <button
      onMouseDown={e => { e.preventDefault(); onClick() }}
      title={t}
      className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs transition-colors ${
        active ? 'bg-violet-100 text-violet-700' : 'text-muted hover:bg-paper-warm hover:text-ink'
      }`}
    >
      {children}
    </button>
  )

  const handleExport = () => {
    const content = editorRef.current?.innerHTML || ''
    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>${title} — ${fullName}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Times New Roman',Times,serif; padding:60px 80px; color:#111; font-size:14px; line-height:1.8; }
  .hdr { display:flex; justify-content:space-between; align-items:flex-end; border-bottom:2px solid #111; padding-bottom:18px; margin-bottom:36px; }
  .co  { font-size:20px; font-weight:700; letter-spacing:1px; }
  .co-sub { font-size:11px; color:#666; margin-top:4px; }
  .ref { text-align:right; font-size:11px; color:#666; }
  .ttl { text-align:center; margin-bottom:36px; }
  .ttl span { font-size:17px; font-weight:700; letter-spacing:3px; text-transform:uppercase; border-bottom:2px solid #111; display:inline-block; padding-bottom:6px; }
  .body { margin-bottom:32px; }
  .body p { margin-bottom:0.6em; }
  .body ul,.body ol { margin:0.4em 0 0.6em 1.6em; }
  .body li { margin-bottom:0.2em; }
  .purpose { margin-bottom:52px; font-style:italic; color:#555; }
  .sig { text-align:right; }
  .sig-line { margin-top:44px; font-size:12px; color:#666; font-style:italic; }
  @media print { body { padding:40px 60px; } }
</style>
</head>
<body>
<div class="hdr">
  <div>
    <div class="co">CLADE ARCHITECTURE</div>
    <div class="co-sub">Cabinet d'Architecture et d'Ingénierie</div>
  </div>
  <div class="ref">
    <div>Réf. : ${docRef}</div>
    <div>Casablanca, le ${today}</div>
  </div>
</div>
<div class="ttl"><span>${title}</span></div>
<div class="body">${content}</div>
<div class="purpose">La présente attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.</div>
<div class="sig">
  <div>Le Directeur Général</div>
  <div class="sig-line">Cachet et signature</div>
</div>
</body>
</html>`
    const w = window.open('', '_blank', 'width=820,height=1060')
    if (!w) { toast.error("Autorisez les pop-ups pour exporter"); return }
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 600)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
              <Award size={16} className="text-violet-600" />
            </div>
            <div>
              <div className="font-semibold text-ink text-sm">Générer une attestation</div>
              <div className="text-xs text-muted">{fullName} · {employe.poste || '—'}</div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-paper-warm flex items-center justify-center text-muted">
            <X size={16} />
          </button>
        </div>

        {/* Type tabs */}
        <div className="px-6 pt-4 pb-0 flex-shrink-0">
          <div className="flex gap-1.5 bg-paper-warm rounded-xl p-1">
            {[
              { key: 'travail', label: 'Attestation de travail' },
              { key: 'salaire', label: 'Attestation de salaire' },
            ].map(t => (
              <button key={t.key} onClick={() => handleTypeChange(t.key)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                  type === t.key ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Barre d'outils */}
        <div className="px-6 py-2 flex items-center gap-0.5 border-b border-border flex-shrink-0">
          <ToolBtn onClick={() => exec('bold')} title="Gras (Ctrl+B)"><Bold size={13} /></ToolBtn>
          <ToolBtn onClick={() => exec('italic')} title="Italique (Ctrl+I)"><Italic size={13} /></ToolBtn>
          <ToolBtn onClick={() => exec('underline')} title="Souligné (Ctrl+U)"><Underline size={13} /></ToolBtn>
          <div className="w-px h-4 bg-border mx-1" />
          <ToolBtn onClick={() => exec('insertUnorderedList')} title="Liste à puces"><List size={13} /></ToolBtn>
          <ToolBtn onClick={() => exec('insertOrderedList')} title="Liste numérotée"><ListOrdered size={13} /></ToolBtn>
          <div className="w-px h-4 bg-border mx-1" />
          <ToolBtn onClick={() => exec('justifyLeft')} title="Aligner à gauche">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>
          </ToolBtn>
          <ToolBtn onClick={() => exec('justifyCenter')} title="Centrer">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
          </ToolBtn>
          <div className="w-px h-4 bg-border mx-1" />
          <ToolBtn onClick={() => exec('undo')} title="Annuler (Ctrl+Z)"><Undo2 size={13} /></ToolBtn>
          <div className="flex-1" />
          <span className="text-[10px] text-muted">Cliquez dans le texte pour modifier</span>
        </div>

        {/* Document éditable */}
        <div className="flex-1 overflow-y-auto px-6 pb-4 pt-4">
          <div className="border border-border rounded-xl p-7 bg-white font-serif text-sm leading-7 text-ink shadow-sm">
            {/* En-tête */}
            <div className="flex justify-between items-end border-b-2 border-ink pb-4 mb-7">
              <div>
                <div className="font-bold text-[17px] tracking-wide">CLADE ARCHITECTURE</div>
                <div className="text-[11px] text-muted mt-1 font-sans">Cabinet d'Architecture et d'Ingénierie</div>
              </div>
              <div className="text-right text-[11px] text-muted font-sans">
                <div>Réf. : {docRef}</div>
                <div>Casablanca, le {today}</div>
              </div>
            </div>
            {/* Titre */}
            <div className="text-center mb-8">
              <span className="font-bold text-[15px] tracking-[3px] uppercase border-b-2 border-ink pb-1.5 inline-block">
                {title}
              </span>
            </div>
            {/* Corps — contenteditable */}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="min-h-[120px] mb-6 outline-none focus:ring-1 focus:ring-violet-200 rounded-lg p-1 -mx-1 [&_ul]:list-disc [&_ul]:ml-5 [&_ol]:list-decimal [&_ol]:ml-5 [&_p]:mb-2"
            />
            {/* Finalité */}
            <p className="mb-12 text-muted text-[13px] italic border-t border-border/50 pt-4">
              La présente attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.
            </p>
            {/* Signature */}
            <div className="text-right">
              <div className="text-sm font-medium">Le Directeur Général</div>
              <div className="mt-10 text-xs text-muted font-sans italic">Cachet et signature</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-3 border-t border-border flex gap-3 flex-shrink-0">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-border hover:bg-paper-warm transition-colors">
            Fermer
          </button>
          <button onClick={handleExport}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-colors">
            <Download size={14} /> Exporter PDF
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function RequestModal({ demande, employe, onClose, onApprove, onRefuse, onAttestation }) {
  const [comment, setComment] = useState('')
  const [file, setFile] = useState(null)
  const fileRef = useRef(null)

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    if (f.size > 500 * 1024) { toast.error('Fichier max 500 Ko'); return }
    const reader = new FileReader()
    reader.onload = ev => setFile({ name: f.name, size: f.size, dataUrl: ev.target.result })
    reader.readAsDataURL(f)
    e.target.value = ''
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <ClipboardList size={16} className="text-amber-600" />
            </div>
            <div>
              <div className="font-semibold text-ink text-sm">{DEMANDE_LABELS[demande.type] || demande.type}</div>
              <div className="text-xs text-muted">{demande.employeNom}</div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-paper-warm flex items-center justify-center text-muted">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-paper-warm rounded-xl p-4 space-y-2.5 text-sm">
            {demande.dateDebut && (
              <div className="flex justify-between">
                <span className="text-muted">Période</span>
                <span className="font-medium text-ink">
                  {new Date(demande.dateDebut).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  {demande.dateFin && demande.dateFin !== demande.dateDebut && (
                    <> → {new Date(demande.dateFin).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</>
                  )}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted">Soumis le</span>
              <span className="font-medium text-ink">
                {new Date(demande.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {demande.statut !== 'en_attente' && (
              <div className="flex justify-between">
                <span className="text-muted">Statut</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUT_COLORS[demande.statut]}`}>
                  {STATUT_LABELS[demande.statut]}
                </span>
              </div>
            )}
          </div>

          {demande.motif && (
            <div>
              <div className="label-text mb-1">Motif</div>
              <p className="text-sm text-ink bg-paper-warm rounded-xl p-3">{demande.motif}</p>
            </div>
          )}

          {demande.fichierJoint && (
            <div className="flex items-center gap-2 p-3 bg-paper-warm rounded-xl border border-border text-xs">
              <FileText size={14} className="text-electric" />
              <span className="text-ink font-medium">{demande.fichierJoint.name}</span>
            </div>
          )}

          <div>
            <label className="label-text mb-1.5 block">Commentaire (optionnel)</label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Ajouter un commentaire pour le collaborateur…"
              rows={2}
              className="input-field resize-none"
            />
          </div>

          <div>
            <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
            {file ? (
              <div className="flex items-center gap-2 p-3 bg-paper-warm rounded-xl border border-border text-xs">
                <FileText size={14} className="text-electric" />
                <span className="text-ink font-medium flex-1 truncate">{file.name}</span>
                <button onClick={() => setFile(null)} className="text-muted hover:text-rose-500"><X size={12} /></button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 text-xs text-muted hover:text-electric transition-colors">
                <Paperclip size={13} /> Joindre un fichier (réponse)
              </button>
            )}
          </div>

          {/* Attestation shortcut — visible for attestation type or any approved demande */}
          {(demande.type === 'attestation' || demande.statut === 'approuve') && (
            <button
              onClick={onAttestation}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-colors">
              <Award size={14} /> Générer l'attestation
            </button>
          )}
        </div>

        {demande.statut === 'en_attente' && (
          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={() => onRefuse(comment, file)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors">
              <Ban size={14} /> Refuser
            </button>
            <button
              onClick={() => onApprove(comment, file)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors">
              <Check size={14} /> Approuver
            </button>
          </div>
        )}
        {demande.statut !== 'en_attente' && (
          <div className="px-6 pb-6">
            <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-semibold bg-paper-warm text-ink hover:bg-border/30 transition-colors">Fermer</button>
          </div>
        )}
      </motion.div>
    </div>
  )
}

function getInitials(nom) {
  const parts = nom?.trim().split(' ') || []
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return (nom || '??').slice(0, 2).toUpperCase()
}

function statutBadge(statut) {
  if (statut === 'actif') return 'bg-emerald-50 text-emerald-700'
  if (statut === 'bloque') return 'bg-rose-50 text-rose-700'
  if (statut === 'conge') return 'bg-amber-50 text-amber-700'
  return 'bg-paper-warm text-muted'
}

function statutLabel(statut) {
  if (statut === 'actif') return 'Actif'
  if (statut === 'bloque') return 'Bloqué'
  if (statut === 'conge') return 'En congé'
  return statut
}



function NouveauPosteModal({ onClose, onAdd }) {
  const [form, setForm] = useState({
    intitule: '', description: '', missions: '',
    salaireMin: '', salaireMax: '', dept: '', typeContrat: '',
  })
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = e => {
    e.preventDefault()
    if (!form.intitule.trim()) { toast.error('Intitulé requis'); return }
    onAdd(form)
    onClose()
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm"
        onClick={e => e.target === e.currentTarget && onClose()}>
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-electric/10 flex items-center justify-center"><UserSearch size={16} className="text-electric" /></div>
              <div className="font-semibold text-ink text-sm">Nouveau poste à pourvoir</div>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-paper-warm flex items-center justify-center text-muted"><X size={14} /></button>
          </div>
          <form onSubmit={submit} className="p-6 space-y-4 overflow-y-auto">
            <div>
              <label className="label-text mb-1.5 block">Intitulé du poste *</label>
              <input className="input-field" placeholder="Architecte Senior, Chef de Projet…" value={form.intitule} onChange={set('intitule')} autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-text mb-1.5 block">Département</label>
                <input className="input-field" placeholder="Architecture, Structure…" value={form.dept} onChange={set('dept')} />
              </div>
              <div>
                <label className="label-text mb-1.5 block">Type de contrat</label>
                <SelectField
                  value={form.typeContrat}
                  onChange={v => set('typeContrat')({ target: { value: v } })}
                  options={[
                    { value: '', label: '— Choisir —' },
                    { value: 'CDI', label: 'CDI' },
                    { value: 'CDD', label: 'CDD' },
                    { value: 'Stage', label: 'Stage' },
                    { value: 'Freelance', label: 'Freelance' },
                  ]}
                />
              </div>
            </div>
            <div>
              <label className="label-text mb-1.5 block">Description</label>
              <textarea className="input-field resize-none" rows={3} placeholder="Contexte, objectifs du poste…" value={form.description} onChange={set('description')} />
            </div>
            <div>
              <label className="label-text mb-1.5 block">Missions principales</label>
              <textarea className="input-field resize-none" rows={3} placeholder="- Concevoir et coordonner..." value={form.missions} onChange={set('missions')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-text mb-1.5 block">Salaire min (DH)</label>
                <input type="number" className="input-field" value={form.salaireMin} onChange={set('salaireMin')} />
              </div>
              <div>
                <label className="label-text mb-1.5 block">Salaire max (DH)</label>
                <input type="number" className="input-field" value={form.salaireMax} onChange={set('salaireMax')} />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Annuler</button>
              <button type="submit" className="btn-primary flex-1 justify-center"><Plus size={13} /> Créer le poste</button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}


const STATUT_CANDIDATURE = {
  nouveau: { label: 'Nouvelle', cls: 'bg-blue-100 text-blue-700' },
  classe: { label: 'Classée', cls: 'bg-gray-100 text-gray-600' },
  entretien_planifie: { label: 'Entretien planifié', cls: 'bg-amber-100 text-amber-700' },
}

function CandidatureAddModal({ onClose, onAdd, employes }) {
  const [form, setForm] = useState({ prenom: '', nom: '', email: '', telephone: '', posteSouhaite: '', departement: '', cvUrl: '', portfolioUrl: '', message: '' })
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const depts = useMemo(() => Array.from(new Set(employes.map(e => e.dept).filter(Boolean))).sort(), [employes])
  const submit = () => {
    if (!form.prenom.trim() || !form.nom.trim() || !form.email.trim() || !form.posteSouhaite.trim()) {
      toast.error('Prénom, nom, email et poste souhaité sont requis')
      return
    }
    onAdd(form)
    onClose()
  }
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-paper rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Inbox size={18} className="text-violet-600" />
            <h2 className="font-display text-lg text-ink">Nouvelle candidature spontanée</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-paper-warm flex items-center justify-center text-muted"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Prénom *</label>
              <input className="input w-full" value={form.prenom} onChange={e => f('prenom', e.target.value)} placeholder="ex: Jean" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Nom *</label>
              <input className="input w-full" value={form.nom} onChange={e => f('nom', e.target.value)} placeholder="ex: Dupont" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Email *</label>
              <input className="input w-full" type="email" value={form.email} onChange={e => f('email', e.target.value)} placeholder="email@exemple.com" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Téléphone</label>
              <input className="input w-full" value={form.telephone} onChange={e => f('telephone', e.target.value)} placeholder="+212 6..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Poste souhaité *</label>
              <input className="input w-full" value={form.posteSouhaite} onChange={e => f('posteSouhaite', e.target.value)} placeholder="Architecte, Dessinateur…" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Département</label>
              <SelectField
                value={form.departement}
                onChange={v => f('departement', v)}
                options={[
                  { value: '', label: '— Choisir —' },
                  ...depts.map(d => ({ value: d, label: d })),
                ]}
                className="w-full"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Lien CV</label>
              <input className="input w-full" value={form.cvUrl} onChange={e => f('cvUrl', e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Lien Portfolio</label>
              <input className="input w-full" value={form.portfolioUrl} onChange={e => f('portfolioUrl', e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1">Message de motivation</label>
            <textarea className="input w-full h-24 resize-none" value={form.message} onChange={e => f('message', e.target.value)} placeholder="Lettre de motivation, contexte…" />
          </div>
        </div>
        <div className="p-6 pt-0 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
          <button onClick={submit} className="btn-primary flex-1">Enregistrer</button>
        </div>
      </motion.div>
    </div>
  )
}

function CandidatureDetailModal({ candidature, employes, recrutements = [], onClose, onUpdate, onDelete, addPlanningEvent }) {
  const [mode, setMode] = useState(null) // null | 'classe' | 'entretien'
  const [entretienForm, setEntretienForm] = useState({ date: '', heureDebut: '10:00', heureFin: '11:00', interviewerId: '' })
  const [portfolioEdit, setPortfolioEdit] = useState(false)
  const [portfolioVal, setPortfolioVal] = useState('')
  const savePortfolio = () => {
    const url = portfolioVal.trim()
    if (url) onUpdate(candidature.id, { portfolioUrl: url })
    setPortfolioEdit(false)
  }
  const ef = (k, v) => setEntretienForm(p => ({ ...p, [k]: v }))

  const fullName = `${candidature.prenom} ${candidature.nom}`
  const offreLiee = candidature.offreId ? recrutements.find(r => r.id === candidature.offreId) : null

  const rejectionBody = `Bonjour ${fullName},\n\nNous vous remercions chaleureusement pour l'intérêt que vous portez à notre cabinet et pour le temps que vous avez consacré à nous faire parvenir votre candidature spontanée pour le poste de ${candidature.posteSouhaite}.\n\nNous avons étudié votre profil avec attention. Bien que votre candidature ne corresponde pas à nos besoins immédiats, nous la conservons précieusement dans notre base de données et n'hésiterons pas à vous recontacter si une opportunité en lien avec votre profil venait à se présenter.\n\nNous vous souhaitons beaucoup de succès dans vos recherches et espérons avoir l'occasion de collaborer avec vous à l'avenir.\n\nCordialement,\nL'équipe CLADE Architecture`
  const [classeBody, setClasseBody] = useState(rejectionBody)

  const interviewer = employes.find(e => String(e.id) === entretienForm.interviewerId)
  const interviewerName = interviewer ? interviewer.nom : '—'
  const entretienBodyDefault = entretienForm.date
    ? `Bonjour ${fullName},\n\nNous avons étudié votre candidature spontanée pour le poste de ${candidature.posteSouhaite} avec beaucoup d'intérêt et nous serions ravis de vous rencontrer.\n\nNous vous proposons un entretien :\n• Date : ${new Date(entretienForm.date).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}\n• Horaire : ${entretienForm.heureDebut} – ${entretienForm.heureFin}\n• Interlocuteur : ${interviewerName}\n\nMerci de nous confirmer votre disponibilité en répondant à cet e-mail. N'hésitez pas à nous contacter pour toute question.\n\nAu plaisir de vous rencontrer,\nL'équipe CLADE Architecture`
    : ''
  const [entretienBody, setEntretienBody] = useState('')
  const prevDate = useRef('')

  if (entretienForm.date && entretienForm.date !== prevDate.current) {
    prevDate.current = entretienForm.date
    setEntretienBody(entretienBodyDefault)
  }
  if (!entretienForm.date && entretienBody && !prevDate.current) {
    // keep
  }

  const openMailClasse = () => {
    const subject = encodeURIComponent('Votre candidature spontanée — CLADE Architecture')
    const body = encodeURIComponent(classeBody)
    window.open(`mailto:${candidature.email}?subject=${subject}&body=${body}`, '_blank')
  }

  const openMailEntretien = () => {
    const subject = encodeURIComponent('Invitation à un entretien — CLADE Architecture')
    const body = encodeURIComponent(entretienBody || entretienBodyDefault)
    window.open(`mailto:${candidature.email}?subject=${subject}&body=${body}`, '_blank')
  }

  const confirmClasse = () => {
    onUpdate(candidature.id, { statut: 'classe' })
    toast.success('Candidature classée')
    onClose()
  }

  const confirmEntretien = () => {
    if (!entretienForm.date || !entretienForm.interviewerId) {
      toast.error('Date et interlocuteur requis')
      return
    }
    const event = {
      id: `ev${Date.now()}`,
      date: entretienForm.date,
      heureDebut: entretienForm.heureDebut,
      heureFin: entretienForm.heureFin,
      titre: `Entretien — ${fullName}`,
      type: 'rdv',
      description: `Candidature spontanée — ${candidature.posteSouhaite}`,
    }
    addPlanningEvent(entretienForm.interviewerId, event)
    onUpdate(candidature.id, { statut: 'entretien_planifie' })
    toast.success('Entretien ajouté au planning')
    onClose()
  }

  const statut = STATUT_CANDIDATURE[candidature.statut] || STATUT_CANDIDATURE.nouveau

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-paper rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* ── Header (always visible) ── */}
        <div className="px-6 py-5 border-b border-border flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
              <span className="font-display text-violet-700 text-lg">{candidature.prenom[0]}{candidature.nom[0]}</span>
            </div>
            <div className="min-w-0">
              <div className="font-display text-lg text-ink leading-tight truncate">{fullName}</div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statut.cls}`}>{statut.label}</span>
                {offreLiee && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-electric/10 text-electric">
                    Offre : {offreLiee.intitule}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-paper-warm flex items-center justify-center text-muted flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* ── Main info (mode === null) ── */}
        {mode === null && (
          <>
            <div className="overflow-y-auto p-6 space-y-5 flex-1">
              {(candidature.posteSouhaite || candidature.posteVise) && (
                <div className="bg-violet-50 border border-violet-100 rounded-xl px-4 py-3">
                  <div className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest mb-1">Poste souhaité</div>
                  <div className="text-sm font-semibold text-violet-900">{candidature.posteSouhaite || candidature.posteVise}</div>
                  {candidature.departement && <div className="text-xs text-violet-500 mt-0.5">{candidature.departement}</div>}
                </div>
              )}
              <div className="flex flex-wrap gap-5">
                {candidature.email && (
                  <div className="flex items-center gap-2 text-xs text-ink">
                    <Mail size={13} className="text-muted flex-shrink-0" /><span>{candidature.email}</span>
                  </div>
                )}
                {candidature.telephone && (
                  <div className="flex items-center gap-2 text-xs text-ink">
                    <PhoneCall size={13} className="text-muted flex-shrink-0" /><span>{candidature.telephone}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-center gap-3 flex-wrap">
                {candidature.cvUrl && (
                  <a href={candidature.cvUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-violet-50 text-violet-700 border border-violet-200 rounded-xl text-xs font-semibold hover:bg-violet-100 transition-colors">
                    <FileText size={13} /> Voir le CV
                  </a>
                )}
                {candidature.portfolioUrl ? (
                  <a href={candidature.portfolioUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-violet-50 text-violet-700 border border-violet-200 rounded-xl text-xs font-semibold hover:bg-violet-100 transition-colors">
                    <Globe size={13} /> Voir le portfolio
                  </a>
                ) : portfolioEdit ? (
                  <div className="flex items-center gap-1.5">
                    <input className="input text-xs flex-1 h-8 py-0" value={portfolioVal} onChange={e => setPortfolioVal(e.target.value)}
                      placeholder="https://..." autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') savePortfolio(); if (e.key === 'Escape') setPortfolioEdit(false) }} />
                    <button onClick={savePortfolio} className="text-xs text-violet-600 font-semibold px-2 py-1 rounded-lg hover:bg-violet-50">OK</button>
                    <button onClick={() => setPortfolioEdit(false)} className="text-xs text-muted px-1"><X size={12} /></button>
                  </div>
                ) : (
                  <button onClick={() => setPortfolioEdit(true)}
                    className="flex items-center gap-1.5 text-muted hover:text-violet-600 text-xs border border-dashed border-border rounded-xl px-4 py-2 transition-colors">
                    <Paperclip size={13} /> Ajouter un lien portfolio
                  </button>
                )}
              </div>
              {candidature.message && (
                <div className="bg-paper-warm rounded-xl p-4">
                  <div className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-2">Message de motivation</div>
                  <p className="text-xs text-ink leading-relaxed whitespace-pre-wrap">{candidature.message}</p>
                </div>
              )}
              <div className="text-[10px] text-muted">Reçue le {candidature.dateReception ? new Date(candidature.dateReception).toLocaleDateString('fr-FR') : '—'}</div>
            </div>
            {/* Action buttons */}
            <div className="px-6 pb-5 flex-shrink-0 border-t border-border pt-4 space-y-3">
              <div className="flex gap-3">
                <button onClick={() => { setMode('classe'); setClasseBody(rejectionBody) }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors">
                  <Check size={15} /> Classer
                </button>
                <button onClick={() => setMode('entretien')}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors">
                  <CalendarCheck size={15} /> Proposer un entretien
                </button>
              </div>
              <div className="flex justify-between items-center">
                <button onClick={() => { if (window.confirm('Supprimer cette candidature ?')) { onDelete(candidature.id); onClose() } }}
                  className="flex items-center gap-1.5 text-xs text-rose-500 hover:text-rose-600 transition-colors px-2 py-1.5 rounded-xl hover:bg-rose-50">
                  <Trash2 size={13} /> Supprimer
                </button>
                <button onClick={onClose} className="btn-ghost text-sm">Fermer</button>
              </div>
            </div>
          </>
        )}

        {/* ── Panel: Classer ── */}
        {mode === 'classe' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="h-1 w-full bg-gray-400 flex-shrink-0" />
            <div className="flex items-center gap-3 px-6 py-3 border-b border-border flex-shrink-0">
              <button onClick={() => setMode(null)} className="flex items-center gap-1 text-xs text-muted hover:text-ink transition-colors">
                <ChevronDown size={12} className="rotate-90" /> Retour
              </button>
              <div className="flex-1 text-center text-sm font-semibold text-ink">Classer la candidature</div>
              <div className="w-14" />
            </div>
            <div className="overflow-y-auto p-6 space-y-4 flex-1">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center gap-2">
                <Ban size={14} className="text-gray-500" />
                <span className="text-xs font-medium text-gray-600">Un email de classement sera envoyé à {candidature.email}</span>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest mb-1.5 block text-gray-400">Corps de l'email</label>
                <textarea value={classeBody} onChange={e => setClasseBody(e.target.value)} rows={11}
                  className="input w-full resize-none text-xs leading-relaxed font-mono" />
              </div>
            </div>
            <div className="px-6 pb-5 flex gap-3 border-t border-border pt-4 flex-shrink-0">
              <button onClick={() => setMode(null)} className="btn-ghost text-sm flex-1 justify-center">Annuler</button>
              <button onClick={() => { openMailClasse(); confirmClasse() }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-800 text-white text-sm font-semibold transition-colors">
                <Send size={13} /> Envoyer et classer
              </button>
            </div>
          </div>
        )}

        {/* ── Panel: Entretien ── */}
        {mode === 'entretien' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="h-1 w-full bg-violet-500 flex-shrink-0" />
            <div className="flex items-center gap-3 px-6 py-3 border-b border-border flex-shrink-0">
              <button onClick={() => setMode(null)} className="flex items-center gap-1 text-xs text-muted hover:text-ink transition-colors">
                <ChevronDown size={12} className="rotate-90" /> Retour
              </button>
              <div className="flex-1 text-center text-sm font-semibold text-ink">Proposer un entretien</div>
              <div className="w-14" />
            </div>
            <div className="overflow-y-auto p-6 space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-violet-500 uppercase tracking-widest mb-1.5 block">Date *</label>
                  <input type="date" className="input w-full" value={entretienForm.date}
                    onChange={e => { ef('date', e.target.value); setEntretienBody('') }} />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-violet-500 uppercase tracking-widest mb-1.5 block">Heure de début</label>
                  <input type="time" className="input w-full" value={entretienForm.heureDebut} onChange={e => ef('heureDebut', e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-violet-500 uppercase tracking-widest mb-1.5 block">Heure de fin</label>
                  <input type="time" className="input w-full" value={entretienForm.heureFin} onChange={e => ef('heureFin', e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-violet-500 uppercase tracking-widest mb-1.5 block">Interlocuteur *</label>
                  <SelectField
                    value={entretienForm.interviewerId}
                    onChange={v => ef('interviewerId', v)}
                    options={[
                      { value: '', label: '— Choisir —' },
                      ...employes.map(e => ({ value: String(e.id), label: e.nom })),
                    ]}
                    className="w-full"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-violet-500 uppercase tracking-widest mb-1.5 block">Corps de l'email</label>
                <textarea value={entretienBody || entretienBodyDefault} onChange={e => setEntretienBody(e.target.value)} rows={9}
                  className="input w-full resize-none text-xs leading-relaxed font-mono focus:border-violet-200 focus:ring-1 focus:ring-violet-50" />
              </div>
            </div>
            <div className="px-6 pb-5 flex gap-3 border-t border-border pt-4 flex-shrink-0">
              <button onClick={() => setMode(null)} className="btn-ghost text-sm flex-1 justify-center">Annuler</button>
              <button onClick={() => { openMailEntretien(); confirmEntretien() }} disabled={!entretienForm.date}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors disabled:opacity-40">
                <Send size={13} /> Envoyer et planifier
              </button>
            </div>
          </div>
        )}

      </motion.div>
    </div>
  )
}

// ─── JourFerieModal ───────────────────────────────────────────────────────────
function JourFerieModal({ onClose, onSave, event }) {
  const isEdit = !!event
  const [form, setForm] = useState({ nom: event?.nom || '', date: event?.date || '', dateFin: event?.dateFin || '' })
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const submit = (e) => {
    e.preventDefault()
    if (!form.nom.trim() || !form.date) { toast.error('Nom et date de début requis'); return }
    if (form.dateFin && form.dateFin < form.date) { toast.error('La date de fin doit être après la date de début'); return }
    const data = { nom: form.nom.trim(), date: form.date }
    if (form.dateFin && form.dateFin !== form.date) data.dateFin = form.dateFin
    onSave(data)
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <Sun size={16} className="text-amber-500" />
            </div>
            <div className="font-semibold text-ink text-sm">{isEdit ? 'Modifier le jour férié' : 'Nouveau jour férié'}</div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-paper-warm flex items-center justify-center text-muted"><X size={14} /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label-text mb-1.5 block">Nom *</label>
            <input className="input-field" placeholder="Aïd Al Fitr, Fête du Trône…" value={form.nom} onChange={set('nom')} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text mb-1.5 block">Date début *</label>
              <input type="date" className="input-field" value={form.date} onChange={set('date')} />
            </div>
            <div>
              <label className="label-text mb-1.5 block">Date fin <span className="text-muted/60">(période)</span></label>
              <input type="date" className="input-field" value={form.dateFin} onChange={set('dateFin')} min={form.date || undefined} />
            </div>
          </div>
          <p className="text-[10px] text-muted">Laissez la date de fin vide pour un jour unique.</p>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center text-sm">Annuler</button>
            <button type="submit" className="btn-primary flex-1 justify-center text-sm">
              {isEdit ? <><Pencil size={13} /> Enregistrer</> : <><Plus size={13} /> Ajouter</>}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default function HRPage() {
  const { employes, updateEmploye, deleteEmploye, projects, formations, deleteFormation, demandesRH, updateDemandeRH, deleteDemandeRH,
    recrutements, addRecrutement, deleteRecrutement,
    candidaturesSpont, addCandidatureSpont, updateCandidatureSpont, deleteCandidatureSpont, refreshCandidatures,
    joursFerier, addJourFerie, updateJourFerie, deleteJourFerie,
    addPlanningEvent } = useData()

  useEffect(() => { refreshCandidatures?.() }, [])

  const [showModal, setShowModal] = useState(false)
  const [showFormationModal, setShowFormationModal] = useState(false)
  const [expandedFormation, setExpandedFormation] = useState(null)
  const [editingFormation, setEditingFormation] = useState(null)
  const [selectedDemande, setSelectedDemande] = useState(null)
  const [attestationEmploye, setAttestationEmploye] = useState(null)
  const [filterDept, setFilterDept] = useState(null)
  const [showPosteModal, setShowPosteModal] = useState(false)
  const [selectedCandidature, setSelectedCandidature] = useState(null)
  const [showCandidatureAddModal, setShowCandidatureAddModal] = useState(false)
  const [showJourFerieModal, setShowJourFerieModal] = useState(false)
  const [editingJourFerie, setEditingJourFerie] = useState(null)
  const [candidatureFilter, setCandidatureFilter] = useState(null)
  const spontCandidatures = useMemo(() => candidaturesSpont.filter(c => !c.offreId), [candidaturesSpont])
  const [openDemandes, setOpenDemandes] = useState(true)
  const [openCandidatures, setOpenCandidatures] = useState(true)
  const [openJoursFerier, setOpenJoursFerier] = useState(true)
  const [selectedYearJF, setSelectedYearJF] = useState(() => {
    const now = new Date()
    return now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1
  })
  const navigate = useNavigate()

  const depts = useMemo(() => {
    const set = new Set(employes.map(e => e.dept).filter(Boolean))
    return Array.from(set).sort()
  }, [employes])

  const filteredEmployes = filterDept ? employes.filter(e => e.dept === filterDept) : employes

  const handleApprove = (comment, file) => {
    updateDemandeRH(selectedDemande.id, {
      statut: 'approuve',
      commentaireRH: comment || null,
      fichierResponse: file || null,
    })
    toast.success('Demande approuvée')
    setSelectedDemande(null)
  }

  const handleRefuse = (comment, file) => {
    updateDemandeRH(selectedDemande.id, {
      statut: 'refuse',
      commentaireRH: comment || null,
      fichierResponse: file || null,
    })
    toast.success('Demande refusée')
    setSelectedDemande(null)
  }

  const pendingDemandes = demandesRH.filter(d => d.statut === 'en_attente')
    .sort((a, b) => (b.managerApproval === 'approuve' ? 1 : 0) - (a.managerApproval === 'approuve' ? 1 : 0))
  const recentDemandes = demandesRH.filter(d => d.statut !== 'en_attente').slice(0, 5)

  const _now = new Date()
  const today = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`

  const total = employes.length
  const actifs = employes.filter(e => e.statut === 'actif').length
  const enConge = employes.filter(e => e.statut === 'conge').length
  const bloques = employes.filter(e => e.statut === 'bloque').length

  const handleDelete = (ev, emp) => {
    ev.stopPropagation()
    toast((t) => (
      <div className="flex items-center gap-3">
        <span className="text-sm">Supprimer <strong>{emp.nom}</strong> ?</span>
        <button
          onClick={() => { deleteEmploye(emp.id); toast.dismiss(t.id); toast.success('Employé supprimé') }}
          className="text-xs bg-rose-500 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-rose-600"
        >
          Supprimer
        </button>
        <button onClick={() => toast.dismiss(t.id)} className="text-xs text-muted hover:text-ink">
          Annuler
        </button>
      </div>
    ), { duration: 6000 })
  }

  // ── Organigramme ─────────────────────────────────────────────────────────────
  const [showOrg, setShowOrg] = useState(false)

  // Build tree structure
  const orgTree = useMemo(() => {
    const roots = employes.filter(e => !e.managerId || !employes.find(m => String(m.id) === String(e.managerId)))
    const getChildren = (id) => employes.filter(e => String(e.managerId) === String(id))
    const buildNode = (emp) => ({ emp, children: getChildren(emp.id).map(buildNode) })
    return roots.map(buildNode)
  }, [employes])

  function OrgNode({ node, depth = 0 }) {
    const e = node.emp
    const hasChildren = node.children.length > 0
    return (
      <div className={`flex flex-col items-center ${depth > 0 ? 'mt-4' : ''}`}>
        <div className="relative flex flex-col items-center">
          {depth > 0 && <div className="w-px h-4 bg-border absolute -top-4 left-1/2 -translate-x-1/2" />}
          <div
            className="flex flex-col items-center p-3 rounded-xl bg-white border border-border shadow-sm hover:shadow-md transition-all cursor-pointer min-w-[100px] max-w-[130px]"
            onClick={() => navigate(`/app/hr/${e.id}`)}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold mb-2 flex-shrink-0"
              style={{ background: e.couleur || '#3B7BF6' }}>
              {(e.prenom?.[0] || '?')}{(e.nomFamille?.[0] || '')}
            </div>
            <div className="text-xs font-semibold text-ink text-center leading-tight truncate w-full">{e.prenom || e.nom}</div>
            <div className="text-[9px] text-muted text-center mt-0.5 leading-tight line-clamp-1">{e.poste || '—'}</div>
            {e.dept && e.dept !== '—' ? (() => {
              const dc = deptColor(e.dept)
              return (
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[9px] font-bold mt-1 flex-shrink-0 ${dc.bg} ${dc.text}`}
                  title={e.dept}>
                  {deptInitial(e.dept)}
                </div>
              )
            })() : <div className="w-8 h-8 mt-1" />}
          </div>
          {/* Dropdown to assign manager */}
          <select
            className="mt-1.5 text-[9px] text-muted bg-paper-warm border border-border rounded-lg px-1.5 py-0.5 max-w-[120px] cursor-pointer hover:border-electric/40 transition-colors"
            value={e.managerId || ''}
            onClick={ev => ev.stopPropagation()}
            onChange={ev => {
              const val = ev.target.value
              updateEmploye(e.id, { managerId: val || null })
              toast.success(`Responsable de ${e.prenom || e.nom} mis à jour`)
            }}
          >
            <option value="">— Aucun responsable —</option>
            {employes
              .filter(m => String(m.id) !== String(e.id))
              .map(m => <option key={m.id} value={String(m.id)}>{m.prenom || m.nom}</option>)
            }
          </select>
        </div>
        {hasChildren && (
          <div className="relative mt-0">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-4 bg-border" />
            <div className="flex gap-6 mt-4 relative">
              {node.children.length > 1 && (
                <div className="absolute top-0 left-[calc(50px)] right-[calc(50px)] h-px bg-border" style={{ top: '-1px' }} />
              )}
              {node.children.map((child, ci) => (
                <OrgNode key={child.emp.id} node={child} depth={depth + 1} />
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-10 space-y-5 lg:space-y-7">

      {/* Organigramme */}
      <div className="card p-5 lg:p-7">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="label-text mb-1">Structure</div>
            <div className="font-display text-2xl text-ink">Organigramme</div>
          </div>
          <button
            onClick={() => setShowOrg(v => !v)}
            className="btn-ghost text-sm"
          >
            {showOrg ? 'Masquer' : 'Afficher'}
          </button>
        </div>
        {showOrg && (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-12 justify-center min-w-max pt-2">
              {orgTree.length === 0 ? (
                <div className="text-sm text-muted text-center py-8">
                  Aucun employé — ajoutez des membres à votre équipe.
                </div>
              ) : (
                orgTree.map(node => <OrgNode key={node.emp.id} node={node} />)
              )}
            </div>
            <p className="text-[10px] text-muted text-center mt-4">
              Utilisez le menu déroulant sous chaque carte pour assigner un responsable hiérarchique.
            </p>
          </div>
        )}
        {!showOrg && (
          <p className="text-xs text-muted">
            {employes.filter(e => e.managerId).length} sur {employes.length} membres ont un responsable assigné.
          </p>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
        {[
          { label: 'Total équipe', value: total, icon: Users, color: '#3B82F6' },
          { label: 'Actifs', value: actifs, icon: CheckCircle2, color: '#10B981' },
          { label: 'En congé', value: enConge, icon: Calendar, color: '#F59E0B' },
          { label: 'Bloqués', value: bloques, icon: AlertTriangle, color: '#F43F5E' },
        ].map((k, i) => {
          const Icon = k.icon
          return (
            <div
              key={i}
              className="card p-4 lg:p-6 flex items-center justify-between animate-slide-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div>
                <div className="text-xs text-muted mb-2">{k.label}</div>
                <div className="font-display text-3xl lg:text-4xl text-ink leading-none">{k.value}</div>
              </div>
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${k.color}15` }}
              >
                <Icon size={20} color={k.color} strokeWidth={1.8} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Main: left content + right requests panel */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        <div className="flex-1 min-w-0 space-y-5">

      {/* Employee Table */}
      <div className="card p-5 lg:p-7">
        <div className="flex justify-between items-center mb-4">
          <div>
            <div className="font-display text-2xl text-ink">Équipe</div>
            <div className="text-xs text-muted mt-0.5">{filteredEmployes.length}/{employes.length} collaborateur{employes.length !== 1 ? 's' : ''}</div>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={15} />
            <span className="hidden sm:inline">Ajouter</span>
          </button>
        </div>

        {/* Department filter */}
        {depts.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-4 pb-4 border-b border-border">
            <Filter size={13} className="text-muted flex-shrink-0" />
            <button
              onClick={() => setFilterDept(null)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border transition-colors ${!filterDept ? 'border-electric bg-electric/5 text-electric' : 'border-border text-muted hover:border-electric/40'}`}
            >
              Tous
            </button>
            {depts.map(dept => {
              const dc = deptColor(dept)
              const active = filterDept === dept
              return (
                <button key={dept} onClick={() => setFilterDept(active ? null : dept)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border transition-colors ${active ? `${dc.bg} ${dc.text} border-transparent` : 'border-border text-muted hover:border-electric/40'}`}>
                  <span className={`w-4 h-4 rounded-md flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${dc.bg} ${dc.text}`}>{deptInitial(dept)}</span>
                  {dept}
                </button>
              )
            })}
          </div>
        )}

        {/* Desktop table */}
        <div className="hidden lg:block">
          <div className="grid grid-cols-[auto_auto_2fr_1.5fr_110px_auto] gap-4 px-3 pb-2 border-b border-border">
            <div className="label-text w-10" />
            <div className="label-text w-8">Dép.</div>
            <div className="label-text">Nom</div>
            <div className="label-text">Poste</div>
            <div className="label-text">Statut</div>
            <div className="w-8" />
          </div>
          <div className="space-y-1 mt-1">
            {filteredEmployes.map((e, i) => {
              const dc = deptColor(e.dept)
              return (
                <div
                  key={e.id}
                  onClick={() => navigate(`/app/hr/${e.id}`)}
                  className={`grid grid-cols-[auto_auto_2fr_1.5fr_110px_auto] gap-4 items-center px-3 py-3 rounded-xl cursor-pointer transition-all hover:bg-paper-warm animate-slide-up ${e.statut === 'bloque' ? 'bg-rose-50/40' : ''}`}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ink to-electric flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">{getInitials(e.nom)}</span>
                  </div>
                  {/* Dept badge */}
                  <div title={e.dept || '—'}>
                    {e.dept ? (
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[9px] font-bold ${dc.bg} ${dc.text}`}>
                        {deptInitial(e.dept)}
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-xl bg-paper-warm flex items-center justify-center">
                        <Building2 size={12} className="text-muted" />
                      </div>
                    )}
                  </div>
                  {/* Nom */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold text-ink truncate">{e.nom}</div>
                      {e.isDirecteur && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-electric/10 text-electric flex-shrink-0">DG</span>}
                    </div>
                    <div className="text-xs text-muted truncate">{e.dept}</div>
                  </div>
                  {/* Poste */}
                  <div className="text-xs text-ink truncate">{e.poste}</div>
                  {/* Statut */}
                  <div>
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${statutBadge(e.statut)}`}>
                      {statutLabel(e.statut)}
                    </span>
                  </div>
                  <div className="w-7 h-7 flex items-center justify-center">
                    {!e.isDirecteur && (
                      <button onClick={(ev) => handleDelete(ev, e)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-rose-500 hover:bg-rose-50 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Mobile cards */}
        <div className="lg:hidden space-y-3">
          {filteredEmployes.map((e, i) => {
            const dc = deptColor(e.dept)
            return (
              <div
                key={e.id}
                onClick={() => navigate(`/app/hr/${e.id}`)}
                className={`p-4 rounded-2xl cursor-pointer transition-all hover:shadow-md animate-slide-up ${e.statut === 'bloque' ? 'bg-rose-50' : 'bg-paper-warm'}`}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ink to-electric flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">{getInitials(e.nom)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold text-ink truncate">{e.nom}</div>
                      {e.dept && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 ${dc.bg} ${dc.text}`}>{deptInitial(e.dept)}</span>
                      )}
                    </div>
                    <div className="text-xs text-muted truncate">{e.poste}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${statutBadge(e.statut)}`}>
                      {statutLabel(e.statut)}
                    </span>
                    {!e.isDirecteur && (
                      <button onClick={(ev) => handleDelete(ev, e)} className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-rose-500 hover:bg-rose-50 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>


      {/* Formations */}
      <div className="card p-5 lg:p-7">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
              <BookOpen size={18} className="text-violet-600" strokeWidth={1.8} />
            </div>
            <div>
              <div className="label-text mb-0.5">Développement professionnel</div>
              <div className="font-display text-xl text-ink">Formations ({formations.length})</div>
            </div>
          </div>
          <button onClick={() => setShowFormationModal(true)} className="btn-primary text-sm">
            <Plus size={15} /> <span className="hidden sm:inline">Nouvelle formation</span>
          </button>
        </div>

        {formations.length === 0 ? (
          <div className="py-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-3">
              <BookOpen size={24} className="text-violet-400" strokeWidth={1.5} />
            </div>
            <div className="font-display text-xl text-ink mb-1">Aucune formation</div>
            <p className="text-sm text-muted">Ajoutez des formations et assignez-les à vos collaborateurs.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {formations.map(f => {
              const isOpen = expandedFormation === f.id
              const participants = (f.personnes || [])
                .map(id => employes.find(e => String(e.id) === String(id)))
                .filter(Boolean)
              return (
                <div key={f.id} className="border border-border rounded-xl overflow-hidden">
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer hover:bg-paper-warm transition-colors"
                    onClick={() => setExpandedFormation(isOpen ? null : f.id)}>
                    <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0 text-violet-700 font-bold text-sm">
                      {f.date ? new Date(f.date).getDate() : '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-ink truncate">{f.nom}</div>
                      <div className="text-xs text-muted flex items-center gap-2 mt-0.5">
                        {f.date && <span>{new Date(f.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>}
                        {f.heureDebut && <span>{f.heureDebut}–{f.heureFin}</span>}
                        {f.formateurs && <span>· {f.formateurs}</span>}
                        <span className="ml-auto text-violet-600 font-medium">{participants.length} participant{participants.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isOpen ? <ChevronUp size={15} className="text-muted" /> : <ChevronDown size={15} className="text-muted" />}
                    </div>
                  </div>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                        className="overflow-hidden border-t border-border">
                        <div className="p-4 space-y-3 bg-paper-warm">
                          {f.description && (
                            <div>
                              <div className="label-text text-[10px] mb-1">Description</div>
                              <p className="text-sm text-ink">{f.description}</p>
                            </div>
                          )}
                          <div>
                            <div className="label-text text-[10px] mb-2">Participants</div>
                            {participants.length === 0 ? (
                              <p className="text-xs text-muted">Aucun participant assigné</p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {participants.map(emp => (
                                  <span key={emp.id} className="text-xs px-2.5 py-1 bg-violet-100 text-violet-800 rounded-full font-medium">{emp.nom}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <button onClick={() => { setEditingFormation(f); setExpandedFormation(null) }}
                              className="flex items-center gap-1.5 text-xs text-electric hover:text-ink font-medium">
                              <Pencil size={12} /> Modifier
                            </button>
                            <button onClick={() => {
                              toast((t) => (
                                <div className="flex items-center gap-3">
                                  <span className="text-sm">Supprimer <strong>{f.nom}</strong> ?</span>
                                  <button onClick={() => { deleteFormation(f.id); toast.dismiss(t.id); toast.success('Formation supprimée') }}
                                    className="text-xs bg-rose-500 text-white px-3 py-1.5 rounded-lg font-semibold">Supprimer</button>
                                  <button onClick={() => toast.dismiss(t.id)} className="text-xs text-muted">Annuler</button>
                                </div>
                              ), { duration: 5000 })
                            }} className="flex items-center gap-1.5 text-xs text-rose-500 hover:text-rose-700 font-medium">
                              <Trash2 size={12} /> Supprimer
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Recrutement */}
      <div className="card p-5 lg:p-7">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-electric/10 flex items-center justify-center flex-shrink-0">
              <UserSearch size={18} className="text-electric" strokeWidth={1.8} />
            </div>
            <div>
              <div className="label-text mb-0.5">Ressources humaines</div>
              <div className="font-display text-xl text-ink">Recrutement ({recrutements.length})</div>
            </div>
          </div>
          <button onClick={() => setShowPosteModal(true)} className="btn-primary text-sm">
            <Plus size={15} /> <span className="hidden sm:inline">Nouveau poste</span>
          </button>
        </div>

        {recrutements.length === 0 ? (
          <div className="py-10 text-center border border-dashed border-border rounded-xl">
            <div className="w-14 h-14 rounded-2xl bg-electric/5 flex items-center justify-center mx-auto mb-3">
              <UserSearch size={24} className="text-electric/50" strokeWidth={1.5} />
            </div>
            <div className="font-display text-xl text-ink mb-1">Aucun poste ouvert</div>
            <p className="text-sm text-muted">Ajoutez un poste à pourvoir pour commencer à suivre les candidatures.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recrutements.map(rec => {
              const dc = rec.dept ? deptColor(rec.dept) : null
              const totalCands = (rec.candidats || []).length
              const acceptes = (rec.candidats || []).filter(c => c.statut === 'accepte').length
              const entretiens = (rec.candidats || []).filter(c => c.statut === 'entretien').length
              const statutStyle = rec.statut === 'ouvert'
                ? 'bg-emerald-50 text-emerald-700'
                : rec.statut === 'pourvu'
                  ? 'bg-electric/10 text-electric'
                  : 'bg-paper-warm text-muted'
              const statutLabel2 = rec.statut === 'ouvert' ? 'Ouvert' : rec.statut === 'pourvu' ? 'Pourvu' : 'Fermé'
              return (
                <div key={rec.id} className="flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-paper-warm transition-colors cursor-pointer group"
                  onClick={() => navigate(`/app/hr/recruitment/${rec.id}`)}>
                  <div className="w-10 h-10 rounded-xl bg-electric/10 flex items-center justify-center flex-shrink-0">
                    <UserSearch size={16} className="text-electric" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-sm font-semibold text-ink truncate">{rec.intitule}</div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statutStyle}`}>{statutLabel2}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {rec.dept && dc && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${dc.bg} ${dc.text}`}>{rec.dept}</span>
                      )}
                      {(rec.salaireMin || rec.salaireMax) && (
                        <span className="text-[10px] text-muted">{rec.salaireMin ? `${Number(rec.salaireMin).toLocaleString('fr-FR')}` : '—'} — {rec.salaireMax ? `${Number(rec.salaireMax).toLocaleString('fr-FR')} DH` : '—'}</span>
                      )}
                      <span className="text-[10px] text-muted">{totalCands} candidat{totalCands !== 1 ? 's' : ''}{entretiens > 0 ? ` · ${entretiens} entretien${entretiens !== 1 ? 's' : ''}` : ''}{acceptes > 0 ? ` · ${acceptes} accepté${acceptes !== 1 ? 's' : ''}` : ''}</span>
                    </div>
                  </div>
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      toast((t) => (
                        <div className="flex items-center gap-3">
                          <span className="text-sm">Supprimer <strong>{rec.intitule}</strong> ?</span>
                          <button onClick={() => { deleteRecrutement(rec.id); toast.dismiss(t.id); toast.success('Poste supprimé') }}
                            className="text-xs bg-rose-500 text-white px-3 py-1.5 rounded-lg font-semibold">Supprimer</button>
                          <button onClick={() => toast.dismiss(t.id)} className="text-xs text-muted">Annuler</button>
                        </div>
                      ), { duration: 6000 })
                    }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-rose-500 hover:bg-rose-50 transition-colors flex-shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

        </div>{/* end left column */}

        {/* Right panel */}
        <div className="w-full lg:w-80 flex-shrink-0 lg:sticky lg:top-28 space-y-3">

          {/* ── Demandes RH ── */}
          <div className="card overflow-hidden">
            <button onClick={() => setOpenDemandes(v => !v)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-paper-warm/60 transition-colors">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <ClipboardList size={15} className="text-amber-600" />
                </div>
                <div className="text-left">
                  <div className="font-display text-base text-ink leading-none">Demandes RH</div>
                  <div className="text-[10px] text-muted mt-0.5">{pendingDemandes.length > 0 ? `${pendingDemandes.length} en attente` : 'Aucune demande'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {pendingDemandes.length > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {pendingDemandes.length}
                  </span>
                )}
                {openDemandes ? <ChevronUp size={14} className="text-muted" /> : <ChevronDown size={14} className="text-muted" />}
              </div>
            </button>

            <AnimatePresence initial={false}>
              {openDemandes && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                  transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div className="px-5 pb-5 space-y-2 border-t border-border">
                    {demandesRH.length === 0 ? (
                      <div className="text-center py-7">
                        <div className="w-10 h-10 rounded-xl bg-paper-warm flex items-center justify-center mx-auto mb-2">
                          <ClipboardList size={18} className="text-muted" />
                        </div>
                        <p className="text-xs text-muted">Aucune demande pour l'instant</p>
                      </div>
                    ) : (
                      <>
                        {pendingDemandes.length > 0 && (
                          <div className="text-[10px] text-muted font-semibold uppercase tracking-widest pt-3">En attente</div>
                        )}
                        {pendingDemandes.map(d => (
                          <button key={d.id} onClick={() => setSelectedDemande(d)}
                            className={`w-full flex items-start gap-3 p-3 rounded-xl border hover:opacity-90 transition-colors text-left ${
                              d.managerApproval === 'approuve'
                                ? 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100'
                                : 'border-amber-200 bg-amber-50 hover:bg-amber-100'
                            }`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm ${d.managerApproval === 'approuve' ? 'bg-emerald-100' : 'bg-white'}`}>
                              {d.managerApproval === 'approuve'
                                ? <CheckCircle size={13} className="text-emerald-600" />
                                : <Clock size={13} className="text-amber-600" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold text-ink truncate">{d.employeNom}</div>
                              <div className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md inline-block mt-0.5 ${DEMANDE_COLORS[d.type]}`}>
                                {DEMANDE_LABELS[d.type] || d.type}
                              </div>
                              {d.dateDebut && (
                                <div className="text-[10px] text-muted mt-0.5">
                                  {new Date(d.dateDebut).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                                  {d.dateFin && d.dateFin !== d.dateDebut && ` → ${new Date(d.dateFin).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}`}
                                </div>
                              )}
                              {d.managerApproval === 'approuve' && (
                                <div className="text-[9px] font-semibold text-emerald-700 mt-0.5">✓ Avis favorable du responsable</div>
                              )}
                              {d.managerApproval === 'refuse' && (
                                <div className="text-[9px] font-semibold text-rose-600 mt-0.5">✗ Avis défavorable du responsable</div>
                              )}
                            </div>
                          </button>
                        ))}
                        {recentDemandes.length > 0 && (
                          <>
                            <div className="text-[10px] text-muted font-semibold uppercase tracking-widest pt-1">Récentes</div>
                            {recentDemandes.map(d => (
                              <button key={d.id} onClick={() => setSelectedDemande(d)}
                                className="w-full flex items-start gap-3 p-3 rounded-xl border border-border hover:bg-paper-warm transition-colors text-left">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${d.statut === 'approuve' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                                  {d.statut === 'approuve' ? <Check size={13} className="text-emerald-600" /> : <Ban size={13} className="text-rose-500" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-semibold text-ink truncate">{d.employeNom}</div>
                                  <div className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md inline-block mt-0.5 ${DEMANDE_COLORS[d.type]}`}>
                                    {DEMANDE_LABELS[d.type] || d.type}
                                  </div>
                                  <div className={`text-[10px] mt-0.5 font-medium ${d.statut === 'approuve' ? 'text-emerald-600' : 'text-rose-500'}`}>
                                    {STATUT_LABELS[d.statut]}
                                  </div>
                                </div>
                                <button onClick={e => { e.stopPropagation(); deleteDemandeRH(d.id) }}
                                  className="w-5 h-5 rounded flex items-center justify-center text-muted hover:text-rose-500 flex-shrink-0 mt-0.5">
                                  <X size={11} />
                                </button>
                              </button>
                            ))}
                          </>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Candidatures spontanées ── */}
          <div className="card overflow-hidden">
            <div className="flex items-center px-5 py-4 border-b border-border">
              <button onClick={() => setOpenCandidatures(v => !v)}
                className="flex items-center gap-2.5 flex-1 min-w-0 hover:opacity-80 transition-opacity text-left">
                <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                  <Inbox size={15} className="text-violet-600" />
                </div>
                <div className="min-w-0">
                  <div className="font-display text-base text-ink leading-none">Candidatures spontanées</div>
                  <div className="text-[10px] text-muted mt-0.5">{spontCandidatures.filter(c => c.statut === 'nouveau').length > 0 ? `${spontCandidatures.filter(c => c.statut === 'nouveau').length} nouvelle${spontCandidatures.filter(c => c.statut === 'nouveau').length > 1 ? 's' : ''}` : 'Aucune candidature'}</div>
                </div>
              </button>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                {spontCandidatures.filter(c => c.statut === 'nouveau').length > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-violet-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {spontCandidatures.filter(c => c.statut === 'nouveau').length}
                  </span>
                )}
                <button onClick={() => setShowCandidatureAddModal(true)}
                  className="w-7 h-7 rounded-lg bg-violet-50 hover:bg-violet-100 flex items-center justify-center text-violet-600 transition-colors">
                  <Plus size={14} />
                </button>
                <button onClick={() => setOpenCandidatures(v => !v)} className="text-muted">
                  {openCandidatures ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {openCandidatures && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                  transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div className="px-5 pb-5 space-y-3 pt-4">
                    {spontCandidatures.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap justify-center">
                        {[
                          { key: 'nouveau', label: 'Nouvelles', count: spontCandidatures.filter(c => c.statut === 'nouveau').length },
                          { key: 'entretien_planifie', label: 'Entretien', count: spontCandidatures.filter(c => c.statut === 'entretien_planifie').length },
                          { key: 'classe', label: 'Classées', count: spontCandidatures.filter(c => c.statut === 'classe').length },
                        ].map(f => (
                          <button key={f.key} onClick={() => setCandidatureFilter(prev => prev === f.key ? null : f.key)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-colors ${
                              candidatureFilter === f.key
                                ? 'bg-violet-600 text-white border-violet-600'
                                : 'border-border text-muted hover:border-violet-300 hover:text-violet-600'
                            }`}>
                            {f.label}
                            <span className={`text-[9px] px-1 py-0.5 rounded-md font-bold ${candidatureFilter === f.key ? 'bg-white/20' : 'bg-paper-warm'}`}>{f.count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {spontCandidatures.length === 0 ? (
                      <div className="text-center py-5">
                        <div className="w-10 h-10 rounded-xl bg-paper-warm flex items-center justify-center mx-auto mb-2">
                          <Inbox size={18} className="text-muted" />
                        </div>
                        <p className="text-xs text-muted">Aucune candidature pour l'instant</p>
                        <button onClick={() => setShowCandidatureAddModal(true)}
                          className="mt-2 text-xs text-violet-600 hover:text-violet-700 font-medium">
                          + Ajouter une candidature
                        </button>
                      </div>
                    ) : (() => {
                      const filtered = candidatureFilter === null
                        ? spontCandidatures
                        : spontCandidatures.filter(c => c.statut === candidatureFilter)
                      return filtered.length === 0 ? (
                        <div className="text-center py-3 text-xs text-muted">Aucune candidature dans cette catégorie</div>
                      ) : (
                        <div className="space-y-2">
                          {filtered.map(c => {
                            const s = STATUT_CANDIDATURE[c.statut] || STATUT_CANDIDATURE.nouveau
                            return (
                              <button key={c.id} onClick={() => setSelectedCandidature(c)}
                                className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-paper-warm transition-colors text-left group">
                                <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
                                  <span className="text-[10px] font-bold text-violet-700">{c.prenom[0]}{c.nom[0]}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-semibold text-ink truncate">{c.prenom} {c.nom}</div>
                                  <div className="text-[10px] text-muted truncate">{c.posteSouhaite}</div>
                                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md inline-block mt-0.5 ${s.cls}`}>{s.label}</span>
                                </div>
                                <ChevronRight size={13} className="text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                              </button>
                            )
                          })}
                        </div>
                      )
                    })()}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Jours fériés ── */}
          <div className="card overflow-hidden">
            <div className="flex items-center px-5 py-4 border-b border-border">
              <button onClick={() => setOpenJoursFerier(v => !v)}
                className="flex items-center gap-2.5 flex-1 min-w-0 hover:opacity-80 transition-opacity text-left">
                <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <Sun size={15} className="text-amber-500" />
                </div>
                <div className="min-w-0">
                  <div className="font-display text-base text-ink leading-none">Jours fériés</div>
                  <div className="text-[10px] text-muted mt-0.5">Visibles dans tous les plannings</div>
                </div>
              </button>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                {joursFerier.length > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold flex items-center justify-center">
                    {joursFerier.length}
                  </span>
                )}
                <button onClick={() => setShowJourFerieModal(true)}
                  className="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 flex items-center justify-center text-amber-600 transition-colors">
                  <Plus size={14} />
                </button>
                <button onClick={() => setOpenJoursFerier(v => !v)} className="text-muted">
                  {openJoursFerier ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {openJoursFerier && (() => {
                const now = new Date()
                const curSY = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1
                // Derive school-year start from a date: if month >= Sep → Y, else Y-1
                const toSY = (d) => { const m = d.getMonth(); const y = d.getFullYear(); return m >= 8 ? y : y - 1 }
                const sySet = new Set([curSY - 1, curSY, curSY + 1])
                joursFerier.forEach(jf => { if (jf.date) sySet.add(toSY(new Date(jf.date + 'T00:00:00'))) })
                const schoolYears = Array.from(sySet).sort((a, b) => a - b)
                // Filter: a jf belongs to school year Y if start or end date falls in that year
                const filtered = joursFerier.filter(jf => {
                  if (!jf.date) return false
                  const startSY = toSY(new Date(jf.date + 'T00:00:00'))
                  const endSY = jf.dateFin ? toSY(new Date(jf.dateFin + 'T00:00:00')) : startSY
                  return startSY === selectedYearJF || endSY === selectedYearJF
                }).sort((a, b) => new Date(a.date) - new Date(b.date))
                return (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                    transition={{ duration: 0.2 }} className="overflow-hidden">
                    <div className="px-5 pb-5 pt-3">

                      {/* Filtre années scolaires — navigation */}
                      <div className="flex justify-center items-center gap-2 mb-3">
                        <button onClick={() => setSelectedYearJF(y => y - 1)}
                          className="w-8 h-8 rounded-lg border border-border bg-white hover:bg-paper-warm flex items-center justify-center text-muted hover:text-ink transition-colors">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                        </button>
                        <div className="px-4 py-1.5 rounded-lg border border-border bg-white text-xs font-semibold text-ink min-w-[96px] text-center">
                          {selectedYearJF}–{selectedYearJF + 1}
                        </div>
                        <button onClick={() => setSelectedYearJF(y => y + 1)}
                          className="w-8 h-8 rounded-lg border border-border bg-white hover:bg-paper-warm flex items-center justify-center text-muted hover:text-ink transition-colors">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                      </div>

                      {joursFerier.length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-xs text-muted">Aucun jour férié configuré</p>
                          <button onClick={() => setShowJourFerieModal(true)}
                            className="mt-2 text-xs text-amber-600 hover:text-amber-700 font-medium">
                            + Ajouter un jour férié
                          </button>
                        </div>
                      ) : filtered.length === 0 ? (
                        <div className="text-center py-4 text-xs text-muted">
                          Aucun jour férié pour {selectedYearJF}–{selectedYearJF + 1}
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {filtered.map(jf => (
                            <div key={jf.id}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border hover:bg-paper-warm transition-colors group">
                              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                                <span className="text-[10px] font-bold text-amber-600 leading-none">
                                  {new Date(jf.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold text-ink truncate">{jf.nom}</div>
                                <div className="text-[10px] text-muted">
                                  {jf.dateFin
                                    ? `${new Date(jf.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} → ${new Date(jf.dateFin + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`
                                    : new Date(jf.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long' })
                                  }
                                </div>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setEditingJourFerie(jf)}
                                  className="w-6 h-6 rounded flex items-center justify-center text-muted hover:text-electric">
                                  <Pencil size={11} />
                                </button>
                                <button onClick={() => deleteJourFerie(jf.id)}
                                  className="w-6 h-6 rounded flex items-center justify-center text-muted hover:text-rose-500">
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })()}
            </AnimatePresence>
          </div>

        </div>{/* end right panel */}
      </div>{/* end flex row */}

      {showModal && <NouveauEmployeModal onClose={() => setShowModal(false)} />}
      {showFormationModal && <FormationModal onClose={() => setShowFormationModal(false)} employes={employes} />}
      {editingFormation && <FormationModal formation={editingFormation} onClose={() => setEditingFormation(null)} employes={employes} />}
      {showPosteModal && (
        <NouveauPosteModal
          onClose={() => setShowPosteModal(false)}
          onAdd={data => { addRecrutement(data); toast.success('Poste créé') }}
        />
      )}
      <AnimatePresence>
        {showCandidatureAddModal && (
          <CandidatureAddModal
            onClose={() => setShowCandidatureAddModal(false)}
            onAdd={data => { addCandidatureSpont(data); toast.success('Candidature enregistrée') }}
            employes={employes}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {selectedCandidature && (
          <CandidatureDetailModal
            candidature={selectedCandidature}
            employes={employes}
            recrutements={recrutements}
            onClose={() => setSelectedCandidature(null)}
            onUpdate={(id, updates) => { updateCandidatureSpont(id, updates); setSelectedCandidature(prev => ({ ...prev, ...updates })) }}
            onDelete={deleteCandidatureSpont}
            addPlanningEvent={addPlanningEvent}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {selectedDemande && (
          <RequestModal
            demande={selectedDemande}
            employe={
              employes.find(e => String(e.id) === String(selectedDemande.employeId))
              || employes.find(e => e.nom === selectedDemande.employeNom)
            }
            onClose={() => setSelectedDemande(null)}
            onApprove={handleApprove}
            onRefuse={handleRefuse}
            onAttestation={() => {
              const emp = employes.find(e => String(e.id) === String(selectedDemande.employeId))
                || employes.find(e => e.nom === selectedDemande.employeNom)
              setAttestationEmploye({ employe: emp || null, type: selectedDemande.type === 'attestation_salaire' ? 'salaire' : 'travail' })
              setSelectedDemande(null)
            }}
          />
        )}
        {attestationEmploye?.employe && (
          <AttestationModal
            employe={attestationEmploye.employe}
            initialType={attestationEmploye.type}
            onClose={() => setAttestationEmploye(null)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {(showJourFerieModal || editingJourFerie) && (
          <JourFerieModal
            event={editingJourFerie}
            onClose={() => { setShowJourFerieModal(false); setEditingJourFerie(null) }}
            onSave={(data) => {
              if (editingJourFerie) {
                updateJourFerie(editingJourFerie.id, data)
                toast.success('Jour férié mis à jour')
              } else {
                addJourFerie(data)
                toast.success('Jour férié ajouté')
              }
              setShowJourFerieModal(false)
              setEditingJourFerie(null)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
