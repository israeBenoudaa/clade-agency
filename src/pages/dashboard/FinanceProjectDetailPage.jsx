import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, FileText, Mail, Download, TableProperties, Loader,
  CheckCircle2, Clock, XCircle, Save,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useData } from '../../context/DataContext'
import { generateInvoicePdf } from '../../utils/generateInvoicePdf'
import { exportProjectFinancesExcel } from '../../utils/exportExcel'

const fmtMAD = (n) =>
  Number(n || 0).toLocaleString('fr-MA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' MAD'

const PAI_OPTIONS = [
  { value: 'paye', label: 'Payé', icon: CheckCircle2, cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { value: 'en_cours', label: 'En attente', icon: Clock, cls: 'text-amber-700 bg-amber-50 border-amber-200' },
  { value: 'non_paye', label: 'Non payé', icon: XCircle, cls: 'text-rose-700 bg-rose-50 border-rose-200' },
]

function pai(statut) {
  return PAI_OPTIONS.find(o => o.value === statut) ?? PAI_OPTIONS[2]
}

function makeInvoiceNum(projectId, missionId) {
  const d = new Date()
  return `FACT-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}-${String(projectId).slice(-3)}${String(missionId).replace(/\D/g, '').slice(-2).padStart(2, '0')}`
}

export default function FinanceProjectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { projects, addTransaction, removeTransaction, updateProjectFinances } = useData()

  const project = projects.find(p => String(p.id) === id)

  const [editHon, setEditHon] = useState({})
  const [generating, setGenerating] = useState(null)
  const [exporting, setExporting] = useState(false)

  if (!project) {
    return (
      <div className="p-10 text-center">
        <div className="font-display text-2xl text-ink mb-3">Projet introuvable</div>
        <button onClick={() => navigate('/app/finance')} className="btn-ghost"><ArrowLeft size={15} /> Retour</button>
      </div>
    )
  }

  const missions = (project.missions || []).filter(m => m.type === 'mission')
  const honoraires = project.finances?.honoraires ?? {}
  const paiements = project.finances?.paiements ?? {}

  const totalHT = missions.reduce((s, m) => s + (honoraires[m.id] || 0), 0)
  const paidHT = missions.reduce((s, m) => paiements[m.id] === 'paye' ? s + (honoraires[m.id] || 0) : s, 0)
  const pctPaid = totalHT > 0 ? Math.round((paidHT / totalHT) * 100) : 0

  // ── handlers ──

  const handleHonChange = (missionId, val) => {
    setEditHon(e => ({ ...e, [missionId]: val }))
  }

  const handleHonSave = (missionId) => {
    const raw = editHon[missionId]
    const montant = parseFloat(raw)
    if (isNaN(montant) || montant < 0) { toast.error('Montant invalide'); return }
    const newHon = { ...honoraires, [missionId]: montant }
    updateProjectFinances(project.id, { honoraires: newHon })
    setEditHon(e => { const n = { ...e }; delete n[missionId]; return n })
    // If this mission is already paid, update the auto-tx amount
    if (paiements[missionId] === 'paye') {
      const mission = missions.find(m => m.id === missionId)
      const txId = `tx_auto_${project.id}_${missionId}`
      addTransaction({
        id: txId, type: 'entree', montant,
        libelle: `${mission?.nom} — ${project.nom}`,
        date: new Date().toISOString().slice(0, 10),
        categorie: 'Honoraires', projectId: project.id, missionId, auto: true,
      })
    }
    toast.success('Honoraire enregistré')
  }

  const handlePaiChange = (missionId, newStatut) => {
    const oldStatut = paiements[missionId]
    const newPai = { ...paiements, [missionId]: newStatut }
    updateProjectFinances(project.id, { paiements: newPai })

    const txId = `tx_auto_${project.id}_${missionId}`
    if (newStatut === 'paye') {
      const mission = missions.find(m => m.id === missionId)
      const montant = honoraires[missionId]
      if (mission && montant) {
        addTransaction({
          id: txId, type: 'entree', montant,
          libelle: `${mission.nom} — ${project.nom}`,
          date: new Date().toISOString().slice(0, 10),
          categorie: 'Honoraires', projectId: project.id, missionId, auto: true,
        })
        toast.success('Paiement validé — entrée ajoutée au journal')
      }
    } else if (oldStatut === 'paye') {
      removeTransaction(txId)
      toast('Paiement annulé', { icon: '↩️' })
    }
  }

  const handleGenerateInvoice = async (mission) => {
    const montant = honoraires[mission.id]
    if (!montant) { toast.error('Définissez l\'honoraire avant de générer la facture'); return }
    setGenerating(mission.id)
    try {
      await generateInvoicePdf({
        invoiceNum: makeInvoiceNum(project.id, mission.id),
        projectNom: project.nom,
        client: project.client,
        missionNom: mission.nom,
        honoraire: montant,
        paiement: paiements[mission.id] || 'non_paye',
        date: new Date().toISOString().slice(0, 10),
      })
      toast.success('Facture PDF générée')
    } catch (e) {
      console.error('[PDF facture]', e)
      toast.error('Erreur lors de la génération')
    } finally {
      setGenerating(null)
    }
  }

  const handleEmail = (mission) => {
    const montant = honoraires[mission.id]
    if (!montant) { toast.error('Définissez l\'honoraire avant d\'envoyer'); return }
    const invoiceNum = makeInvoiceNum(project.id, mission.id)
    const fmtMontant = fmtMAD(montant * 1.2) + ' TTC'
    const subject = encodeURIComponent(`Facture ${invoiceNum} — ${project.nom}`)
    const body = encodeURIComponent(
      `Madame, Monsieur ${project.client},\n\nVeuillez trouver ci-joint la facture ${invoiceNum} relative à la mission :\n\n  ${mission.nom}\n  Projet : ${project.nom}\n  Montant : ${fmtMontant}\n\nNous restons à votre disposition pour toute question.\n\nCordialement,\nL'équipe CLADE Architecture`
    )
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
  }

  const handleExportExcel = () => {
    setExporting(true)
    try {
      exportProjectFinancesExcel({ project, missions })
      toast.success('Fichier Excel exporté')
    } catch {
      toast.error('Erreur lors de l\'export')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="p-4 lg:p-10 space-y-6">
      <button onClick={() => navigate('/app/finance')}
        className="flex items-center gap-2 text-sm text-muted hover:text-ink transition-colors">
        <ArrowLeft size={15} /> Retour à la finance
      </button>

      {/* ── Header ── */}
      <div className="card p-5 lg:p-7">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="label-text mb-1">Suivi financier</div>
            <div className="font-display text-2xl lg:text-3xl text-ink">{project.nom}</div>
            <div className="text-sm text-muted mt-1">{project.client} · {project.localisation}</div>
          </div>
          <div className="flex gap-4 sm:text-right flex-wrap">
            <div>
              <div className="label-text text-[10px]">Total honoraires HT</div>
              <div className="font-display text-2xl text-ink">{fmtMAD(totalHT)}</div>
            </div>
            <div>
              <div className="label-text text-[10px]">Encaissé</div>
              <div className="font-display text-2xl text-emerald-600">{pctPaid}%</div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-muted mb-1.5">
            <span>Progression des paiements</span>
            <span className="font-semibold text-ink">{fmtMAD(paidHT)} / {fmtMAD(totalHT)}</span>
          </div>
          <div className="h-2 bg-paper-warm rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-emerald-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${pctPaid}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>

      {/* ── Missions table ── */}
      <div className="card p-5 lg:p-7">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="label-text mb-1">Facturation</div>
            <div className="font-display text-xl text-ink">Tableau des honoraires</div>
          </div>
          <button
            onClick={handleExportExcel}
            disabled={exporting}
            className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl bg-ink text-paper hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {exporting ? <Loader size={13} className="animate-spin" /> : <TableProperties size={13} />}
            Exporter Excel
          </button>
        </div>

        {missions.length === 0 ? (
          <div className="text-center py-10 text-muted text-sm border border-dashed border-border rounded-xl">
            Aucune mission sur ce projet. Ajoutez-en depuis la page de gestion de projet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left label-text pb-3 pr-4 font-medium">Mission</th>
                  <th className="text-left label-text pb-3 pr-4 font-medium w-44">Honoraire HT (MAD)</th>
                  <th className="text-left label-text pb-3 pr-4 font-medium">Total TTC</th>
                  <th className="text-left label-text pb-3 pr-4 font-medium">Paiement</th>
                  <th className="text-right label-text pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {missions.map(mission => {
                  const hon = honoraires[mission.id] || 0
                  const statut = paiements[mission.id] || 'non_paye'
                  const paiInfo = pai(statut)
                  const PaiIcon = paiInfo.icon
                  const isEditing = editHon[mission.id] !== undefined
                  const isGen = generating === mission.id

                  return (
                    <tr key={mission.id} className="hover:bg-paper-warm/50 transition-colors">
                      {/* Mission name */}
                      <td className="py-4 pr-4">
                        <div className="text-sm font-semibold text-ink">{mission.nom}</div>
                        <div className="text-[10px] text-muted mt-0.5">
                          {mission.debut && new Date(mission.debut).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                          {mission.fin && ` → ${new Date(mission.fin).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}`}
                        </div>
                      </td>

                      {/* Honoraire input */}
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            step="500"
                            className="input-field text-sm py-1.5 w-28"
                            placeholder="0"
                            value={isEditing ? editHon[mission.id] : (hon || '')}
                            onChange={(e) => handleHonChange(mission.id, e.target.value)}
                            onFocus={(e) => !isEditing && handleHonChange(mission.id, hon || '')}
                          />
                          {isEditing && (
                            <button
                              onClick={() => handleHonSave(mission.id)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-electric/10 text-electric hover:bg-electric/20 transition-colors flex-shrink-0"
                              title="Enregistrer"
                            >
                              <Save size={13} />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* TTC */}
                      <td className="py-4 pr-4">
                        <span className="text-sm font-semibold text-ink">{hon ? fmtMAD(hon * 1.2) : '—'}</span>
                        {hon > 0 && <div className="text-[10px] text-muted">TVA 20%: {fmtMAD(hon * 0.2)}</div>}
                      </td>

                      {/* Payment status */}
                      <td className="py-4 pr-4">
                        <div className="relative">
                          <select
                            value={statut}
                            onChange={(e) => handlePaiChange(mission.id, e.target.value)}
                            className={`text-xs font-semibold pl-7 pr-8 py-1.5 rounded-xl border appearance-none cursor-pointer transition-colors ${paiInfo.cls}`}
                          >
                            {PAI_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                          <PaiIcon size={12} className={`absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none ${paiInfo.cls.split(' ')[0]}`} />
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleGenerateInvoice(mission)}
                            disabled={isGen}
                            title="Générer facture PDF"
                            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-border text-muted hover:text-electric hover:border-electric/30 hover:bg-electric/5 transition-colors disabled:opacity-50"
                          >
                            {isGen ? <Loader size={12} className="animate-spin" /> : <FileText size={12} />}
                            <span className="hidden sm:inline">Facture</span>
                          </button>
                          <button
                            onClick={() => handleEmail(mission)}
                            title="Envoyer par email"
                            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-border text-muted hover:text-ink hover:border-ink/30 hover:bg-paper-warm transition-colors"
                          >
                            <Mail size={12} />
                            <span className="hidden sm:inline">Email</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>

              {/* Totals footer */}
              <tfoot>
                <tr className="border-t-2 border-ink/20 bg-paper-warm">
                  <td className="py-3 pr-4 font-semibold text-sm text-ink">Total</td>
                  <td className="py-3 pr-4 font-bold text-sm text-ink">{fmtMAD(totalHT)}</td>
                  <td className="py-3 pr-4 font-bold text-sm text-ink">{fmtMAD(totalHT * 1.2)}</td>
                  <td className="py-3 pr-4">
                    <div className="text-xs text-emerald-700 font-semibold">
                      Encaissé : {fmtMAD(paidHT)}
                    </div>
                    <div className="text-xs text-amber-700 font-semibold">
                      Restant : {fmtMAD(totalHT - paidHT)}
                    </div>
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
