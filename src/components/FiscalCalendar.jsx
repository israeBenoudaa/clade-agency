import { useState, useRef } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2, CheckCircle, Clock, AlertTriangle, ExternalLink, Upload, X, Repeat, Calendar } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useFiscalDeadlines, getDeadlineStatus } from '../hooks/useFiscalDeadlines'

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const RECURRENCE_LABELS = { none: 'Aucune', monthly: 'Mensuelle', quarterly: 'Trimestrielle', annual: 'Annuelle' }

const STATUS_CFG = {
  pending: { label: 'En cours',  bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-100',  icon: Clock },
  overdue: { label: 'En retard', bg: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-100',  icon: AlertTriangle },
  paid:    { label: 'Payé',      bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', icon: CheckCircle },
}

const fmtMAD = n => Number(n || 0).toLocaleString('fr-MA', { minimumFractionDigits: 0 }) + ' MAD'

function isSameMonth(dateStr, year, month) {
  const d = new Date(dateStr)
  return d.getFullYear() === year && d.getMonth() === month
}

/* ── Modal ajout ── */
function AddModal({ onClose, onSave }) {
  const [form, setForm] = useState({ title: '', description: '', due_date: '', recurrence: 'none' })
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = e => {
    e.preventDefault()
    if (!form.title || !form.due_date) return
    onSave(form)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-ink">Nouvelle échéance fiscale</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface text-muted"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wide">Intitulé *</label>
            <input value={form.title} onChange={set('title')} placeholder="ex: TVA, IS, CNSS..." required
              className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wide">Description</label>
            <input value={form.description} onChange={set('description')} placeholder="Optionnel"
              className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wide">Date d'échéance *</label>
            <input type="date" value={form.due_date} onChange={set('due_date')} required
              className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wide">Récurrence</label>
            <select value={form.recurrence} onChange={set('recurrence')}
              className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-blue-200">
              {Object.entries(RECURRENCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          {form.recurrence !== 'none' && (
            <p className="text-xs text-muted bg-blue-50 rounded-lg px-3 py-2 flex items-center gap-2">
              <Repeat size={12} className="text-blue-400 flex-shrink-0" />
              Les occurrences seront générées automatiquement ({form.recurrence === 'monthly' ? '12 mois' : form.recurrence === 'quarterly' ? '8 trimestres' : '3 ans'})
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-border rounded-xl py-2.5 text-sm text-muted hover:bg-surface transition-colors">Annuler</button>
            <button type="submit" className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors">Créer</button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

/* ── Modal paiement ── */
function PayModal({ deadline, onClose, onPay }) {
  const [amount, setAmount]   = useState('')
  const [url, setUrl]         = useState('')
  const [file, setFile]       = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  const handleSubmit = async e => {
    e.preventDefault()
    if (!amount) return
    let receiptUrl = url
    if (file) {
      setUploading(true)
      const path = `fiscal/${deadline.id}/${Date.now()}_${file.name}`
      const { data } = await supabase.storage.from('documents').upload(path, file, { upsert: true })
      if (data) {
        const { data: pub } = supabase.storage.from('documents').getPublicUrl(path)
        receiptUrl = pub?.publicUrl || url
      }
      setUploading(false)
    }
    onPay({ amount: parseFloat(amount), receipt_url: receiptUrl, paid_at: new Date().toISOString().slice(0, 10) })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-ink">Marquer comme payé</h3>
            <p className="text-xs text-muted mt-0.5">{deadline.title}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface text-muted"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wide">Montant payé (MAD) *</label>
            <input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0" required autoFocus
              className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wide">Lien du reçu</label>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..."
              className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wide">Ou importer un fichier</label>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-full border border-dashed border-border rounded-xl py-3 text-sm text-muted hover:border-blue-300 hover:text-blue-500 transition-colors flex items-center justify-center gap-2">
              <Upload size={14} />
              {file ? file.name : 'Choisir un fichier PDF / image'}
            </button>
          </div>
          <p className="text-xs text-muted bg-amber-50 rounded-lg px-3 py-2">
            Le montant sera enregistré comme <strong>sortie d'argent</strong> dans le journal financier.
          </p>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-border rounded-xl py-2.5 text-sm text-muted hover:bg-surface transition-colors">Annuler</button>
            <button type="submit" disabled={uploading} className="flex-1 bg-emerald-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors">
              {uploading ? 'Upload...' : 'Confirmer le paiement'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

/* ── Composant principal ── */
export default function FiscalCalendar({ onTransactionAdd }) {
  const { deadlines, loading, addDeadline, updateDeadline, deleteDeadline, deleteSeries } = useFiscalDeadlines()
  const [navDate, setNavDate] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [showAdd, setShowAdd]   = useState(false)
  const [paying, setPaying]     = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)

  const prevMonth = () => setNavDate(({ year, month }) =>
    month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 })
  const nextMonth = () => setNavDate(({ year, month }) =>
    month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 })

  const monthDeadlines = deadlines.filter(d => isSameMonth(d.due_date, navDate.year, navDate.month))

  const handlePay = async ({ amount, receipt_url, paid_at }) => {
    const d = paying
    await updateDeadline(d.id, { status: 'paid', amount_paid: amount, receipt_url, paid_at })
    onTransactionAdd?.({
      type: 'sortie',
      libelle: `${d.title} — Échéance fiscale`,
      montant: amount,
      date: paid_at,
      categorie: 'Fiscal',
    })
  }

  const handleDelete = async () => {
    const { id, series_id, deleteSeries: doSeries } = confirmDel
    if (doSeries && series_id) await deleteSeries(series_id)
    else await deleteDeadline(id)
    setConfirmDel(null)
  }

  const statusCount = {
    pending: monthDeadlines.filter(d => getDeadlineStatus(d) === 'pending').length,
    overdue: monthDeadlines.filter(d => getDeadlineStatus(d) === 'overdue').length,
    paid:    monthDeadlines.filter(d => getDeadlineStatus(d) === 'paid').length,
  }

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">

      {/* En-tête */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-violet-50">
            <Calendar size={16} className="text-violet-600" />
          </div>
          <div>
            <div className="label-text mb-0.5">Fiscalité</div>
            <div className="font-display text-lg text-ink">Calendrier Fiscal</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {statusCount.overdue > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-100 font-medium">
              {statusCount.overdue} en retard
            </span>
          )}
          {statusCount.pending > 0 && (
            <span className="hidden sm:inline text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100 font-medium">
              {statusCount.pending} en cours
            </span>
          )}
          {/* Desktop: bouton complet — Mobile: juste + */}
          <button onClick={() => setShowAdd(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-violet-600 text-white rounded-xl text-xs font-medium hover:bg-violet-700 transition-colors">
            <Plus size={13} /> Ajouter
          </button>
          <button onClick={() => setShowAdd(true)}
            className="sm:hidden w-8 h-8 flex items-center justify-center bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors">
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Navigation mensuelle */}
      <div className="px-6 py-3 border-b border-border flex items-center justify-center gap-4">
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-surface text-muted hover:text-ink transition-colors">
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold text-ink min-w-[140px] text-center">
          {MONTHS_FR[navDate.month]} {navDate.year}
        </span>
        <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-surface text-muted hover:text-ink transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Liste */}
      <div className="divide-y divide-border">
        {loading ? (
          <div className="py-12 text-center text-sm text-muted">Chargement...</div>
        ) : monthDeadlines.length === 0 ? (
          <div className="py-12 text-center">
            <Calendar size={28} className="text-border mx-auto mb-2" />
            <p className="text-sm text-muted">Aucune échéance ce mois-ci</p>
            <button onClick={() => setShowAdd(true)} className="mt-3 text-xs text-violet-600 hover:underline">+ Ajouter une échéance</button>
          </div>
        ) : (
          monthDeadlines.map(d => {
            const status = getDeadlineStatus(d)
            const cfg = STATUS_CFG[status]
            const Icon = cfg.icon
            const due = new Date(d.due_date)
            const today = new Date()
            const daysLeft = Math.round((due - today) / 86400000)

            return (
              <div key={d.id} className="px-6 py-4 flex items-center gap-4 hover:bg-surface/50 transition-colors group">
                {/* Icône statut */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg} border ${cfg.border}`}>
                  <Icon size={14} className={cfg.text} />
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-ink truncate">{d.title}</span>
                    {d.recurrence && d.recurrence !== 'none' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-500 border border-violet-100 flex items-center gap-1">
                        <Repeat size={9} /> {RECURRENCE_LABELS[d.recurrence]}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted">
                      {due.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </span>
                    {status === 'pending' && daysLeft >= 0 && daysLeft <= 7 && (
                      <span className="text-xs text-amber-600 font-medium">
                        J-{daysLeft === 0 ? 'Aujourd\'hui' : daysLeft}
                      </span>
                    )}
                    {status === 'paid' && d.amount_paid && (
                      <span className="text-xs text-emerald-600 font-medium">{fmtMAD(d.amount_paid)}</span>
                    )}
                    {d.description && <span className="text-xs text-muted italic truncate">{d.description}</span>}
                  </div>
                </div>

                {/* Séparateur vertical */}
                <div className="w-px h-8 bg-border flex-shrink-0" />

                {/* Statut badge */}
                <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border flex-shrink-0 ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                  {cfg.label}
                </span>

                {/* Actions — toujours visibles */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {d.receipt_url && (
                    <a href={d.receipt_url} target="_blank" rel="noreferrer"
                      className="p-1.5 rounded-lg hover:bg-blue-50 text-muted hover:text-blue-600 transition-colors" title="Voir le reçu">
                      <ExternalLink size={13} />
                    </a>
                  )}
                  {status !== 'paid' && (
                    <button onClick={() => setPaying(d)}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-medium transition-colors">
                      Payer
                    </button>
                  )}
                  <button
                    onClick={() => setConfirmDel({ id: d.id, series_id: d.series_id, title: d.title, hasRecurrence: d.recurrence !== 'none' && d.series_id })}
                    className="p-1.5 rounded-lg hover:bg-rose-50 text-muted hover:text-rose-500 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modales */}
      <AnimatePresence>
        {showAdd && (
          <AddModal onClose={() => setShowAdd(false)} onSave={addDeadline} />
        )}
        {paying && (
          <PayModal deadline={paying} onClose={() => setPaying(null)} onPay={handlePay} />
        )}
        {confirmDel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setConfirmDel(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
              <h3 className="text-base font-semibold text-ink mb-2">Supprimer l'échéance</h3>
              <p className="text-sm text-muted mb-4">«&nbsp;{confirmDel.title}&nbsp;»</p>
              {confirmDel.hasRecurrence && (
                <div className="space-y-2 mb-5">
                  <button onClick={() => setConfirmDel(c => ({ ...c, deleteSeries: false }))}
                    className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-colors ${!confirmDel.deleteSeries ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-border text-muted hover:bg-surface'}`}>
                    Supprimer uniquement cette occurrence
                  </button>
                  <button onClick={() => setConfirmDel(c => ({ ...c, deleteSeries: true }))}
                    className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-colors ${confirmDel.deleteSeries ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-border text-muted hover:bg-surface'}`}>
                    Supprimer toutes les occurrences à venir
                  </button>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setConfirmDel(null)} className="flex-1 border border-border rounded-xl py-2.5 text-sm text-muted hover:bg-surface transition-colors">Annuler</button>
                <button onClick={handleDelete} className="flex-1 bg-rose-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-rose-700 transition-colors">Supprimer</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
