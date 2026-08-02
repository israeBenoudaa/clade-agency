import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Trash2, X, CheckCircle, Building2, Calendar,
  AlertCircle, Clock, FileText, Wallet, ArrowRight, ArrowLeft, ChevronRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { useClientLang } from '../../context/ClientLangContext'

const fmtDH = (n) =>
  Number(n || 0).toLocaleString('fr-MA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' DH'

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

function projectFinance(projet) {
  const missions = (projet.missions || []).filter(m => m.type === 'mission')
  const honoraires = projet.finances?.honoraires ?? {}
  const paiements  = projet.finances?.paiements ?? {}
  const totalHT   = missions.reduce((s, m) => s + (honoraires[m.id] || 0), 0)
  const paidHT    = missions.reduce((s, m) => paiements[m.id] === 'paye' ? s + (honoraires[m.id] || 0) : s, 0)
  const remainingHT  = totalHT - paidHT
  const pendingCount = missions.filter(m => paiements[m.id] !== 'paye' && (honoraires[m.id] || 0) > 0).length
  return { totalHT, paidHT, remainingHT, pendingCount }
}

function AddExpenseModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ nom: '', entreprise: '', date: '', montant: '' })
  const [errors, setErrors] = useState({})
  const { t } = useClientLang()

  const set = (k) => (e) => {
    setForm(f => ({ ...f, [k]: e.target.value }))
    if (errors[k]) setErrors(er => ({ ...er, [k]: null }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.nom.trim()) errs.nom = 'Requis'
    if (!form.montant || Number(form.montant) <= 0) errs.montant = 'Montant invalide'
    if (!form.date) errs.date = 'Requis'
    if (Object.keys(errs).length) { setErrors(errs); return }
    onAdd({ ...form, montant: Number(form.montant) })
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm z-50"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-ink/5 flex items-center justify-center">
              <Plus size={16} className="text-ink" />
            </div>
            <div>
              <div className="font-semibold text-ink text-sm">{t('expenses.add')}</div>
              <div className="text-xs text-muted">{t('expenses.add_sub')}</div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-paper-warm flex items-center justify-center text-muted">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label-text mb-1.5 block">{t('expenses.name')} *</label>
            <input className={`input-field ${errors.nom ? 'border-rose-400' : ''}`}
              placeholder="Frais notariaux, BET Structure..." value={form.nom} onChange={set('nom')} />
            {errors.nom && <p className="text-xs text-rose-500 mt-1">{errors.nom}</p>}
          </div>
          <div>
            <label className="label-text mb-1.5 block">{t('expenses.company')}</label>
            <input className="input-field" placeholder="Cabinet Maître Alaoui..." value={form.entreprise} onChange={set('entreprise')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text mb-1.5 block">{t('expenses.date')} *</label>
              <input type="date" className={`input-field ${errors.date ? 'border-rose-400' : ''}`}
                value={form.date} onChange={set('date')} />
              {errors.date && <p className="text-xs text-rose-500 mt-1">{errors.date}</p>}
            </div>
            <div>
              <label className="label-text mb-1.5 block">{t('expenses.amount')} *</label>
              <div className="relative">
                <input type="number" min="0" className={`input-field pr-10 ${errors.montant ? 'border-rose-400' : ''}`}
                  placeholder="0" value={form.montant} onChange={set('montant')} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-sm">DH</span>
              </div>
              {errors.montant && <p className="text-xs text-rose-500 mt-1">{errors.montant}</p>}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">{t('cancel')}</button>
            <button type="submit" className="btn-primary flex-1 justify-center">
              <CheckCircle size={14} /> {t('expenses.submit')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ── Project detail view ───────────────────────────────────────────────────────

function ProjectExpensesContent({ projet, prospect, expenses, totalDepenses, handleAdd, handleDelete, showAddModal, setShowAddModal, t, navigate }) {
  const { totalHT, paidHT, remainingHT, pendingCount } = projectFinance(projet)
  const missions = (projet.missions || []).filter(m => m.type === 'mission')
  const honoraires = projet.finances?.honoraires ?? {}
  const paiements  = projet.finances?.paiements ?? {}

  return (
    <div className="space-y-5 lg:space-y-7">
      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Wallet size={18} className="text-blue-600" />
          </div>
          <div>
            <div className="label-text mb-0.5">{t('expenses.total')}</div>
            <div className="font-display text-2xl text-ink">{fmtDH(totalDepenses)}</div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card p-5 flex items-center gap-4">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${remainingHT > 0 ? 'bg-amber-50' : 'bg-emerald-50'}`}>
            {remainingHT > 0
              ? <AlertCircle size={18} className="text-amber-600" />
              : <CheckCircle size={18} className="text-emerald-600" />}
          </div>
          <div>
            <div className="label-text mb-0.5">{t('expenses.reste_a_regler')}</div>
            <div className={`font-display text-2xl ${remainingHT > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{fmtDH(remainingHT)}</div>
            <div className="text-xs text-muted">{t('expenses.agency_fees')}</div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <FileText size={18} className="text-emerald-600" />
          </div>
          <div>
            <div className="label-text mb-0.5">{t('expenses.fees_section')}</div>
            <div className="font-display text-2xl text-ink">{fmtDH(totalHT)}</div>
          </div>
        </motion.div>
      </div>

      {/* Honoraires section */}
      {totalHT > 0 && (
        <div className="card p-5 lg:p-7">
          <div className="mb-5">
            <div className="label-text mb-1">{t('expenses.fees_section')}</div>
            <div className="font-display text-xl text-ink">{t('expenses.echeances_title')}</div>
          </div>
          <div className="space-y-3">
            {missions.filter(m => (honoraires[m.id] || 0) > 0).map((mission, i) => {
              const isPaid = paiements[mission.id] === 'paye'
              const amount = honoraires[mission.id] || 0
              return (
                <motion.button key={mission.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  onClick={() => navigate(`/client/projects/${projet.id}/finance`)}
                  className={`w-full text-left flex items-center gap-4 p-4 rounded-xl border transition-all group
                    ${!isPaid ? 'bg-amber-50/60 border-amber-200 hover:bg-amber-50' : 'bg-emerald-50/40 border-emerald-200 hover:bg-emerald-50/60'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${!isPaid ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                    {!isPaid ? <AlertCircle size={18} className="text-amber-600" /> : <CheckCircle size={18} className="text-emerald-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-ink truncate">{mission.nom}</div>
                    <div className={`text-xs mt-0.5 ${!isPaid ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {isPaid ? t('expenses.all_paid') : t('expenses.pending').replace('{n}', 1)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className={`font-display text-lg ${!isPaid ? 'text-amber-700' : 'text-emerald-700'}`}>{fmtDH(amount)}</div>
                    <ArrowRight size={16} className="text-muted group-hover:text-ink transition-colors" />
                  </div>
                </motion.button>
              )
            })}
          </div>
        </div>
      )}

      {/* Personal expenses */}
      <div className="card p-5 lg:p-7">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="label-text mb-1">{t('expenses.tracking_section')}</div>
            <div className="font-display text-xl text-ink">{t('expenses.project_expenses')}</div>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn-primary text-xs">
            <Plus size={13} /> {t('expenses.add_btn')}
          </button>
        </div>

        {expenses.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-border rounded-xl text-muted text-sm">
            {t('expenses.none')}
          </div>
        ) : (
          <>
            <div className="hidden lg:block">
              <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_44px] gap-4 px-4 pb-3 border-b border-border">
                <div className="label-text">{t('expenses.col_expense')}</div>
                <div className="label-text">{t('expenses.col_company')}</div>
                <div className="label-text">{t('expenses.col_date')}</div>
                <div className="label-text">{t('expenses.col_amount')}</div>
                <div />
              </div>
              {expenses.map(exp => (
                <div key={exp.id} className="grid grid-cols-[2fr_1.5fr_1fr_1fr_44px] gap-4 px-4 py-4 border-b border-border last:border-0 items-center hover:bg-paper-warm/50 transition-colors group">
                  <div className="text-sm font-semibold text-ink truncate">{exp.nom}</div>
                  <div className="text-sm text-muted truncate">
                    {exp.entreprise ? <span className="flex items-center gap-1.5"><Building2 size={12} /> {exp.entreprise}</span> : '—'}
                  </div>
                  <div className="text-sm text-muted flex items-center gap-1.5"><Calendar size={12} /> {fmtDate(exp.date)}</div>
                  <div className="font-display text-lg text-ink">{fmtDH(exp.montant)}</div>
                  <button onClick={() => handleDelete(exp.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-rose-500 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <div className="flex items-center justify-between px-4 pt-4 mt-1 border-t border-border">
                <span className="text-sm font-semibold text-ink">{t('expenses.total_row')}</span>
                <span className="font-display text-xl text-ink">{fmtDH(totalDepenses)}</span>
              </div>
            </div>
            <div className="lg:hidden space-y-3">
              {expenses.map(exp => (
                <div key={exp.id} className="bg-paper-warm rounded-xl p-4 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-ink mb-1">{exp.nom}</div>
                    {exp.entreprise && <div className="text-xs text-muted mb-1">{exp.entreprise}</div>}
                    <div className="text-xs text-muted">{fmtDate(exp.date)}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="font-display text-lg text-ink">{fmtDH(exp.montant)}</div>
                    <button onClick={() => handleDelete(exp.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-rose-500 hover:bg-rose-50 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {showAddModal && <AddExpenseModal onClose={() => setShowAddModal(false)} onAdd={handleAdd} />}
      </AnimatePresence>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ClientExpensesPage() {
  const { prospectId } = useAuth()
  const { prospects, projects, addClientExpense, deleteClientExpense } = useData()
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const navigate = useNavigate()
  const { t } = useClientLang()

  const prospect = useMemo(() => {
    if (!prospectId) return prospects[0]
    return prospects.find(p => p.id === prospectId) || prospects[0]
  }, [prospectId, prospects])

  const clientProjects = useMemo(() => {
    if (!prospect) return []
    const name = `${prospect.prenom} ${prospect.nom}`
    return projects.filter(p =>
      p.prospectId === prospect.id || p.clientId === prospect.id || p.client === name
    )
  }, [prospect, projects])

  const expenses = prospect?.clientExpenses || []
  const totalDepenses = expenses.reduce((s, e) => s + (e.montant || 0), 0)

  const handleAdd = (expense) => {
    if (!prospect) return
    addClientExpense(prospect.id, expense)
    setShowAddModal(false)
    toast.success(t('expenses.added'))
  }

  const handleDelete = (expenseId) => {
    if (!prospect) return
    toast((ti) => (
      <div className="flex items-center gap-3">
        <span className="text-sm">{t('expenses.delete_confirm')}</span>
        <button onClick={() => { deleteClientExpense(prospect.id, expenseId); toast.dismiss(ti.id); toast.success(t('expenses.deleted')) }}
          className="text-xs bg-rose-500 text-white px-3 py-1.5 rounded-lg font-semibold flex-shrink-0">{t('expenses.delete')}</button>
        <button onClick={() => toast.dismiss(ti.id)} className="text-xs text-muted">{t('cancel')}</button>
      </div>
    ), { duration: 5000 })
  }

  if (!prospect) return <div className="p-10 text-center text-muted">{t('no_data')}</div>

  // Project detail view
  if (selectedProject) {
    return (
      <div className="space-y-5 lg:space-y-7">
        <button onClick={() => setSelectedProject(null)} className="flex items-center gap-2 text-sm text-muted hover:text-ink transition-colors">
          <ArrowLeft size={14} /> {t('project.back')}
        </button>
        <div>
          <div className="label-text mb-2">{t('expenses.label')}</div>
          <h1 className="font-display text-3xl lg:text-5xl text-ink leading-none">{selectedProject.nom}</h1>
          <p className="text-muted text-sm mt-3 max-w-xl">{t('expenses.subtitle')}</p>
        </div>
        <ProjectExpensesContent
          projet={selectedProject}
          prospect={prospect}
          expenses={expenses}
          totalDepenses={totalDepenses}
          handleAdd={handleAdd}
          handleDelete={handleDelete}
          showAddModal={showAddModal}
          setShowAddModal={setShowAddModal}
          t={t}
          navigate={navigate}
        />
      </div>
    )
  }

  // Project picker
  const totalRemaining = clientProjects.reduce((s, p) => s + projectFinance(p).remainingHT, 0)

  return (
    <div className="space-y-5 lg:space-y-7">
      <div>
        <div className="label-text mb-2">{t('expenses.label')}</div>
        <h1 className="font-display text-3xl lg:text-5xl text-ink leading-none">{t('expenses.title')}</h1>
        <p className="text-muted text-sm mt-3 max-w-xl">{t('project.select_expenses')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Wallet size={18} className="text-blue-600" />
          </div>
          <div>
            <div className="label-text mb-0.5">{t('expenses.total')}</div>
            <div className="font-display text-2xl text-ink">{fmtDH(totalDepenses)}</div>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${totalRemaining > 0 ? 'bg-amber-50' : 'bg-emerald-50'}`}>
            {totalRemaining > 0
              ? <AlertCircle size={18} className="text-amber-600" />
              : <CheckCircle size={18} className="text-emerald-600" />}
          </div>
          <div>
            <div className="label-text mb-0.5">{t('expenses.reste_a_regler')}</div>
            <div className={`font-display text-2xl ${totalRemaining > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{fmtDH(totalRemaining)}</div>
            <div className="text-xs text-muted">{t('expenses.agency_fees')}</div>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <FileText size={18} className="text-emerald-600" />
          </div>
          <div>
            <div className="label-text mb-0.5">{t('expenses.active_projects')}</div>
            <div className="font-display text-2xl text-ink">{clientProjects.length}</div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {clientProjects.map((projet, i) => {
          const { totalHT, remainingHT, pendingCount } = projectFinance(projet)

          return (
            <motion.button
              key={projet.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSelectedProject(projet)}
              className={`w-full text-left card p-5 hover:shadow-md transition-all group ${
                remainingHT > 0 ? 'hover:border-amber-300' : 'hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                  remainingHT > 0 ? 'bg-amber-50' : 'bg-emerald-50'
                }`}>
                  {remainingHT > 0
                    ? <AlertCircle size={20} className="text-amber-600" />
                    : <CheckCircle size={20} className="text-emerald-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="label-text text-[10px] mb-0.5">{projet.type || 'Architecture'}</div>
                  <div className="font-display text-xl text-ink">{projet.nom}</div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {totalHT > 0 && (
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                        remainingHT > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {remainingHT > 0
                          ? `${fmtDH(remainingHT)} restant`
                          : t('expenses.all_paid')}
                      </span>
                    )}
                    {expenses.length > 0 && (
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-electric/10 text-electric">
                        {expenses.length} dépense{expenses.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight size={18} className="text-muted group-hover:text-ink transition-colors flex-shrink-0" />
              </div>
            </motion.button>
          )
        })}

        {clientProjects.length === 0 && (
          <div className="card p-12 text-center">
            <Wallet size={28} className="text-muted mx-auto mb-3" />
            <div className="text-sm font-semibold text-ink">{t('expenses.none')}</div>
          </div>
        )}
      </div>
    </div>
  )
}
