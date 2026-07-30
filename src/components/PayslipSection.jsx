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

function openPDF(employe, ps, monthFull, year) {
  const modeLabel = ps.mode === 'horaire' ? 'Horaire (sessions)' : 'Mensuel fixe'
  const baseLabel = ps.mode === 'horaire'
    ? `${(ps.heures || 0).toFixed(2)} h × ${Number(ps.tauxHoraire || 0).toFixed(2)} MAD/h`
    : 'Salaire net mensuel'

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8"/>
<title>Bulletin de paie – ${employe.nom} – ${monthFull} ${year}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1a1a1a;background:#fff;padding:52px 56px;font-size:12px;line-height:1.6}
/* Header */
.header{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:18px;margin-bottom:28px;border-bottom:1.5px solid #1a1a1a}
.company{font-size:22px;font-weight:800;letter-spacing:5px;line-height:1}
.company-sub{font-size:8px;letter-spacing:3px;color:#999;margin-top:6px;text-transform:uppercase}
.header-right{text-align:right}
.payslip-label{font-size:8px;letter-spacing:2.5px;text-transform:uppercase;color:#999}
.payslip-period{font-size:17px;font-weight:700;margin-top:2px;color:#1a1a1a}
.payslip-date{font-size:9.5px;color:#bbb;margin-top:2px}
/* Columns */
.cols{display:grid;grid-template-columns:1fr 1fr;gap:36px;margin-bottom:28px}
.block-title{font-size:8px;letter-spacing:2.5px;text-transform:uppercase;color:#bbb;padding-bottom:6px;margin-bottom:10px;border-bottom:1px solid #ebebeb}
.row{display:flex;justify-content:space-between;align-items:baseline;padding:4px 0;border-bottom:1px solid #f2f2f2;gap:12px}
.row:last-child{border:none}
.row-label{color:#777;font-size:11.5px;white-space:nowrap}
.row-val{font-weight:500;color:#1a1a1a;font-size:11.5px;text-align:right}
/* Total strip */
.total-strip{display:flex;justify-content:space-between;align-items:center;border-top:1.5px solid #1a1a1a;border-bottom:1.5px solid #1a1a1a;padding:12px 0;margin:0 0 32px}
.total-strip-label{font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:#777;font-weight:600}
.total-strip-val{font-size:17px;font-weight:700;color:#1a1a1a}
/* Footer */
.footer{display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:40px;padding-top:20px;border-top:1px solid #eee}
.sign-area{text-align:center}
.sign-line{border-top:1px solid #ccc;margin-top:48px;padding-top:8px;font-size:9.5px;color:#aaa;letter-spacing:0.3px}
@media print{body{padding:28px 32px}}
</style>
</head>
<body>

<div class="header">
  <div>
    <div class="company">CLADE</div>
    <div class="company-sub">Agence d'architecture &amp; design</div>
  </div>
  <div class="header-right">
    <div class="payslip-label">Bulletin de paie</div>
    <div class="payslip-period">${monthFull} ${year}</div>
    <div class="payslip-date">Émis le ${new Date().toLocaleDateString('fr-FR')}</div>
  </div>
</div>

<div class="cols">
  <div>
    <div class="block-title">Collaborateur</div>
    <div class="row"><span class="row-label">Nom complet</span><span class="row-val">${employe.nom}</span></div>
    <div class="row"><span class="row-label">Poste</span><span class="row-val">${employe.poste || '—'}</span></div>
    <div class="row"><span class="row-label">Département</span><span class="row-val">${employe.dept || '—'}</span></div>
    <div class="row"><span class="row-label">Type de contrat</span><span class="row-val">${employe.contrat || '—'}</span></div>
    <div class="row"><span class="row-label">Mode de rémunération</span><span class="row-val">${modeLabel}</span></div>
  </div>
  <div>
    <div class="block-title">Détail de la rémunération</div>
    <div class="row"><span class="row-label">${baseLabel}</span><span class="row-val">${fmtMAD(ps.montantBase)}</span></div>
    <div class="row"><span class="row-label">Prime / Bonus</span><span class="row-val">${fmtMAD(ps.prime)}</span></div>
  </div>
</div>

<div class="total-strip">
  <span class="total-strip-label">Net à payer</span>
  <span class="total-strip-val">${fmtMAD(ps.total)}</span>
</div>

<div class="footer">
  <div class="sign-area"><div class="sign-line">Signature de l'employeur</div></div>
  <div class="sign-area"><div class="sign-line">Signature — ${employe.nom}</div></div>
</div>

</body>
</html>`

  const win = window.open('', '_blank', 'width=820,height=1000')
  if (!win) { toast.error('Autorisez les pop-ups pour générer le PDF'); return }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print() }, 450)
}

export default function PayslipSection({ employe, addTransaction, updateEmploye }) {
  const now = new Date()
  const [year, setYear]       = useState(now.getFullYear())
  const [selMonth, setSelMonth] = useState(now.getMonth())
  const [prime, setPrime]     = useState('')
  const [generating, setGenerating] = useState(false)

  const payslips   = employe.payslips || []
  const mode       = employe.modeRemuneration || 'mensuel'
  const salaireNet = Number(employe.salaireNet) || 0
  const tauxH      = salaireNet > 0 ? salaireNet / HEURES_MOIS : 0

  const monthKey = `${year}-${String(selMonth + 1).padStart(2, '0')}`

  const monthMs = (employe.workSessions || [])
    .filter(s => s.date?.startsWith(monthKey))
    .reduce((sum, s) => sum + (s.workedMs || 0), 0)
  const monthHours = monthMs / 3600000

  const base     = mode === 'horaire' ? monthHours * tauxH : salaireNet
  const primeVal = parseFloat(prime) || 0
  const total    = base + primeVal

  const existing   = payslips.find(p => p.month === monthKey)
  const totalVerse = payslips.reduce((sum, p) => sum + (p.total || 0), 0)

  const buildPayslip = () => ({
    id:          `ps_${Date.now()}`,
    month:       monthKey,
    mode,
    montantBase: base,
    prime:       primeVal,
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

  const handleGenerate = () => {
    if (total <= 0) return
    setGenerating(true)
    try {
      const ps = buildPayslip()
      doGenerate(ps)
      openPDF(employe, ps, MONTH_FULL[selMonth], year)
      setPrime('')
      toast.success('Fiche de paie générée')
    } catch { toast.error('Erreur lors de la génération') }
    finally  { setGenerating(false) }
  }

  const handleRegenerate = () => {
    if (!window.confirm('Régénérer cette fiche ? Cela créera une nouvelle entrée dans le journal des finances.')) return
    setGenerating(true)
    try {
      const ps = buildPayslip()
      doGenerate(ps)
      openPDF(employe, ps, MONTH_FULL[selMonth], year)
      setPrime('')
      toast.success('Fiche régénérée')
    } catch { toast.error('Erreur') }
    finally  { setGenerating(false) }
  }

  const handleDownload = () => {
    if (existing) openPDF(employe, existing, MONTH_FULL[selMonth], year)
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
              onClick={() => { setSelMonth(i); setPrime('') }}
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

          <div className="flex justify-between items-center py-2.5 border-b border-border/60">
            <span className="text-sm text-muted">Prime / Bonus</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number" min="0" step="100" placeholder="0"
                value={prime}
                onChange={e => setPrime(e.target.value)}
                className="input-field text-sm w-28 py-1.5 text-right"
              />
              <span className="text-xs text-muted">MAD</span>
            </div>
          </div>

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
