import { useState } from 'react'
import { ChevronLeft, ChevronRight, Download, FileText, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

const MONTH_SHORT = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc']
const MONTH_FULL  = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const HEURES_MOIS = 191 // 44h/sem × 52 sem / 12 mois ≈ 190.67

function fmtMAD(n) {
  return Number(n || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MAD'
}

function fmtHours(ms) {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

async function generatePayslipPdf(employe, ps, monthFull, year) {
  const { buildDocHeader, sectionHead, renderToPdf } = await import('../utils/pdfBase.js')

  const SB = "font-family:'Inter Tight',-apple-system,BlinkMacSystemFont,sans-serif;"
  const AV = "font-family:'Averia Libre',Georgia,serif;"

  const modeLabel = ps.mode === 'horaire' ? 'Horaire (sessions)' : 'Mensuel fixe'
  const baseLabel = ps.mode === 'horaire'
    ? `${(ps.heures || 0).toFixed(2)} h × ${Number(ps.tauxHoraire || 0).toFixed(2)} MAD/h`
    : 'Salaire net mensuel'

  const primesRows = (ps.primes?.length ? ps.primes : ps.prime > 0 ? [{ libelle: 'Prime / Bonus', montant: ps.prime }] : [])
    .map(p => `
      <tr style="border-bottom:0.5px solid #F0ECE6;">
        <td style="padding:9px 0;font-size:12px;color:#0C0C0B;">${p.libelle || 'Prime'}</td>
        <td style="padding:9px 0;text-align:right;font-size:12px;font-weight:500;color:#0C0C0B;font-variant-numeric:tabular-nums;">${fmtMAD(p.montant)}</td>
      </tr>`).join('')

  const headerHTML = buildDocHeader({
    type: 'Bulletin de paie',
    title: employe.nom,
    ref: `${monthFull} ${year} · Émis le ${new Date().toLocaleDateString('fr-FR')}`,
    meta: [
      { label: 'Poste', value: employe.poste || '—' },
      { label: 'Département', value: employe.dept || '—' },
      { label: 'Mode', value: modeLabel },
    ],
  })

  const contentHTML = `
    <div style="${SB}background:#fff;padding:26px 48px 30px;">
      ${sectionHead(1, 'Détail de la rémunération')}
      <table style="width:100%;border-collapse:collapse;margin-bottom:6px;">
        <tbody>
          <tr style="border-bottom:0.5px solid #F0ECE6;">
            <td style="padding:9px 0;font-size:12px;color:#0C0C0B;">${baseLabel}</td>
            <td style="padding:9px 0;text-align:right;font-size:12px;font-weight:500;color:#0C0C0B;font-variant-numeric:tabular-nums;">${fmtMAD(ps.montantBase)}</td>
          </tr>
          ${primesRows}
          <tr>
            <td style="padding:13px 0 2px;border-top:0.5px solid #0C0C0B;">
              <span style="${AV}font-size:13px;font-style:italic;color:#9B8157;">Net à payer</span>
            </td>
            <td style="padding:13px 0 2px;border-top:0.5px solid #0C0C0B;text-align:right;font-variant-numeric:tabular-nums;">
              <span style="font-size:15px;font-weight:700;color:#0C0C0B;">${fmtMAD(ps.total)}</span>
            </td>
          </tr>
        </tbody>
      </table>

      ${sectionHead(2, 'Informations collaborateur')}
      <table style="width:100%;border-collapse:collapse;">
        <tbody>
          <tr style="border-bottom:0.5px solid #F0ECE6;">
            <td style="padding:7px 0;font-size:11.5px;color:#9B968F;width:40%;">Nom complet</td>
            <td style="padding:7px 0;font-size:11.5px;font-weight:500;color:#0C0C0B;">${employe.nom}</td>
          </tr>
          <tr style="border-bottom:0.5px solid #F0ECE6;">
            <td style="padding:7px 0;font-size:11.5px;color:#9B968F;">Type de contrat</td>
            <td style="padding:7px 0;font-size:11.5px;font-weight:500;color:#0C0C0B;">${employe.contrat || '—'}</td>
          </tr>
        </tbody>
      </table>

      ${sectionHead(3, 'Signatures')}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:8px;">
        <div>
          <div style="height:48px;border-bottom:0.5px solid #DDD8D0;margin-bottom:8px;"></div>
          <div style="font-size:9.5px;color:#ABA79F;text-align:center;letter-spacing:0.05em;">Signature de l'employeur</div>
        </div>
        <div>
          <div style="height:48px;border-bottom:0.5px solid #DDD8D0;margin-bottom:8px;"></div>
          <div style="font-size:9.5px;color:#ABA79F;text-align:center;letter-spacing:0.05em;">Signature — ${employe.nom}</div>
        </div>
      </div>
    </div>`

  const safeName = employe.nom.replace(/[^a-z0-9]/gi, '_').toLowerCase()
  await renderToPdf({ headerHTML, contentHTML, filename: `bulletin_paie_${safeName}_${ps.month}.pdf` })
}

export default function PayslipSection({ employe, addTransaction, updateEmploye }) {
  const now = new Date()
  const [year, setYear]       = useState(now.getFullYear())
  const [selMonth, setSelMonth] = useState(now.getMonth())
  const [generating, setGenerating] = useState(false)

  const payslips   = employe.payslips || []
  const mode       = employe.modeRemuneration || 'mensuel'
  const salaireNet = Number(employe.salaireNet) || 0
  const tauxH      = salaireNet > 0 ? salaireNet / HEURES_MOIS : 0

  const monthKey = `${year}-${String(selMonth + 1).padStart(2, '0')}`

  const monthPrimes = (employe.primes || []).filter(p => p.date?.startsWith(monthKey))
  const primeVal = monthPrimes.reduce((sum, p) => sum + (Number(p.montant) || 0), 0)

  const monthMs = (employe.workSessions || [])
    .filter(s => s.date?.startsWith(monthKey))
    .reduce((sum, s) => sum + (s.workedMs || 0), 0)
  const monthHours = monthMs / 3600000

  const base  = mode === 'horaire' ? monthHours * tauxH : salaireNet
  const total = base + primeVal

  const existing   = payslips.find(p => p.month === monthKey)
  const totalVerse = payslips.reduce((sum, p) => sum + (p.total || 0), 0)

  const buildPayslip = () => ({
    id:          `ps_${Date.now()}`,
    month:       monthKey,
    mode,
    montantBase: base,
    prime:       primeVal,
    primes:      monthPrimes,
    total,
    heures:      mode === 'horaire' ? monthHours : null,
    tauxHoraire: mode === 'horaire' ? tauxH : null,
    paidAt:      new Date().toISOString(),
  })

  const doGenerate = (ps) => {
    addTransaction({
      id:        `tx_ps_${Date.now()}`,
      type:      'sortie',
      libelle:   `Salaire ${employe.nom} – ${MONTH_FULL[selMonth]} ${year}`,
      montant:   ps.total,
      categorie: 'Salaires',
      date:      new Date().toISOString().slice(0, 10),
    })
    updateEmploye(employe.id, {
      payslips: [...payslips.filter(p => p.month !== monthKey), ps],
    })
  }

  const handleGenerate = async () => {
    if (total <= 0) return
    setGenerating(true)
    try {
      const ps = buildPayslip()
      doGenerate(ps)
      await generatePayslipPdf(employe, ps, MONTH_FULL[selMonth], year)
      toast.success('Fiche de paie générée')
    } catch { toast.error('Erreur lors de la génération') }
    finally  { setGenerating(false) }
  }

  const handleRegenerate = async () => {
    if (!window.confirm('Régénérer cette fiche ? Cela créera une nouvelle entrée dans le journal des finances.')) return
    setGenerating(true)
    try {
      const ps = buildPayslip()
      doGenerate(ps)
      await generatePayslipPdf(employe, ps, MONTH_FULL[selMonth], year)
      toast.success('Fiche régénérée')
    } catch { toast.error('Erreur') }
    finally  { setGenerating(false) }
  }

  const handleDownload = async () => {
    if (existing) {
      setGenerating(true)
      try { await generatePayslipPdf(employe, existing, MONTH_FULL[selMonth], year) }
      catch { toast.error('Erreur de téléchargement') }
      finally { setGenerating(false) }
    }
  }

  return (
    <div className="card p-5 lg:p-7">

      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <div className="label-text mb-1">Paie</div>
          <div className="font-display text-xl text-ink">Fiches de paie</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setYear(y => y - 1)} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted hover:text-ink hover:bg-paper-warm transition-colors">
            <ChevronLeft size={15} />
          </button>
          <span className="text-sm font-bold text-ink w-12 text-center">{year}</span>
          <button onClick={() => setYear(y => y + 1)} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted hover:text-ink hover:bg-paper-warm transition-colors">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Month grid */}
      <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 mb-5">
        {MONTH_SHORT.map((m, i) => {
          const key  = `${year}-${String(i + 1).padStart(2, '0')}`
          const paid = payslips.some(p => p.month === key)
          const isSel = selMonth === i
          return (
            <button
              key={i}
              onClick={() => setSelMonth(i)}
              className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl border text-[10px] font-semibold transition-all ${
                isSel
                  ? 'border-electric bg-electric/8 text-electric shadow-[0_0_0_2px_rgba(56,189,248,0.15)]'
                  : paid
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300'
                    : 'border-border bg-paper-warm text-muted hover:border-electric/40 hover:text-ink'
              }`}
            >
              <span>{m}</span>
              {paid && <div className={`w-1 h-1 rounded-full ${isSel ? 'bg-electric' : 'bg-emerald-500'}`} />}
            </button>
          )
        })}
      </div>

      {/* Month detail */}
      <div className="bg-paper-warm rounded-2xl p-5 border border-border">

        {/* Month title + status */}
        <div className="flex items-center justify-between mb-4">
          <div className="font-semibold text-ink">{MONTH_FULL[selMonth]} {year}</div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
            existing ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-muted border-border'
          }`}>
            {existing ? 'Payé' : 'Non généré'}
          </span>
        </div>

        {/* Mode + taux info */}
        <div className="flex items-center gap-2 mb-4 text-xs text-muted">
          <Clock size={12} className="flex-shrink-0" />
          <span>Mode : <span className="font-semibold text-ink">{mode === 'horaire' ? 'Horaire' : 'Mensuel fixe'}</span></span>
          {mode === 'horaire' && tauxH > 0 && (
            <span>· taux {tauxH.toFixed(2)} MAD/h (salaire ÷ 191h)</span>
          )}
        </div>

        {/* Calcul */}
        <div className="space-y-0 mb-4">
          {mode === 'horaire' && (
            <div className="flex justify-between items-center py-2.5 border-b border-border/60 text-sm">
              <span className="text-muted">
                Sessions du mois
                {monthMs > 0 && (
                  <span className="ml-2 text-xs bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded font-mono">{fmtHours(monthMs)}</span>
                )}
              </span>
              <span className="text-muted text-xs">
                {monthHours > 0 ? `${monthHours.toFixed(2)} h × ${tauxH.toFixed(2)}` : 'Aucune session enregistrée'}
              </span>
            </div>
          )}

          <div className="flex justify-between py-2.5 border-b border-border/60 text-sm">
            <span className="text-muted">{mode === 'horaire' ? 'Montant calculé' : 'Salaire net mensuel'}</span>
            <span className="font-semibold text-ink">{fmtMAD(base)}</span>
          </div>

          {monthPrimes.length > 0 && (
            <div className="py-2.5 border-b border-border/60">
              {monthPrimes.map((p, i) => (
                <div key={i} className="flex justify-between items-center py-0.5">
                  <span className="text-sm text-muted">{p.libelle || 'Prime'}</span>
                  <span className="text-sm font-semibold text-ink">{fmtMAD(p.montant)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center pt-3">
            <span className="font-bold text-ink">Net à payer</span>
            <span className="font-bold text-ink text-xl">{fmtMAD(total)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          {existing ? (
            <>
              <button
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border bg-white hover:bg-paper-warm transition-colors text-sm font-semibold text-ink"
              >
                <Download size={14} /> Télécharger
              </button>
              <button
                onClick={handleRegenerate}
                disabled={generating}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors text-sm font-semibold text-amber-700 disabled:opacity-40"
              >
                <FileText size={14} /> Régénérer
              </button>
            </>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={generating || total <= 0}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-ink text-white hover:bg-ink/90 transition-colors text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileText size={14} />
              {generating ? 'Génération…' : 'Générer & Télécharger'}
            </button>
          )}
        </div>
      </div>

      {/* Total versé */}
      {totalVerse > 0 && (
        <div className="mt-4 flex items-center justify-between p-4 rounded-xl bg-paper-warm border border-border">
          <div className="text-sm text-muted">
            Total versé à <span className="font-semibold text-ink">{(employe.prenom || employe.nom?.split(' ')[0] || employe.nom)}</span>
          </div>
          <div className="font-bold text-ink text-base">{fmtMAD(totalVerse)}</div>
        </div>
      )}

    </div>
  )
}
