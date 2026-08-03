import { buildDocHeader, sectionHead, renderToPdf } from './pdfBase.js'

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'

const fmtMAD = (n) =>
  Number(n || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MAD'

const STATUS = {
  paye:     { label: 'Payée',      bg: '#EAFBF4', fg: '#1A6645' },
  en_cours: { label: 'En attente', bg: '#FFF8E1', fg: '#7A5000' },
  non_paye: { label: 'Non payée',  bg: '#FFF0F0', fg: '#9B1C1C' },
}

const SB = "font-family:'Inter Tight',-apple-system,BlinkMacSystemFont,sans-serif;"
const AV = "font-family:'Averia Libre',Georgia,serif;"

export async function generateInvoicePdf({ invoiceNum, projectNom, client, missionNom, honoraire, paiement, date }) {
  const st  = STATUS[paiement] || STATUS.non_paye
  const ht  = Number(honoraire) || 0
  const tva = ht * 0.2
  const ttc = ht + tva

  const headerHTML = buildDocHeader({
    type: 'Facture d\'honoraires',
    title: projectNom,
    ref: invoiceNum,
    meta: [
      { label: 'Date d\'émission', value: fmtDate(date) },
      { label: 'Client', value: client || '—' },
      { label: 'Statut', value: st.label, accent: paiement !== 'paye' },
    ],
    statusSlot: `
      <div style="position:relative;overflow:hidden;background:linear-gradient(155deg,${st.bg} 0%,${st.bg}dd 100%);border:1px solid ${st.fg}22;border-radius:10px;padding:10px 22px;text-align:center;box-shadow:inset 0 1px 0 rgba(255,255,255,0.7),inset 0 -1px 0 rgba(0,0,0,0.04),0 1px 4px rgba(0,0,0,0.05);">
        <div style="position:absolute;top:0;left:0;right:0;height:50%;background:linear-gradient(to bottom,rgba(255,255,255,0.5),transparent);border-radius:9px 9px 0 0;pointer-events:none;"></div>
        <div style="${SB}font-size:7.5px;font-weight:700;letter-spacing:0.38em;text-transform:uppercase;color:${st.fg};position:relative;z-index:1;">${st.label}</div>
      </div>`,
  })

  const contentHTML = `
    <div style="${SB}background:#fff;padding:26px 48px 30px;">
      ${sectionHead(1, 'Désignation de la prestation')}
      <table style="width:100%;border-collapse:collapse;margin-bottom:6px;">
        <thead>
          <tr style="border-bottom:0.5px solid #0C0C0B;">
            <th style="font-size:7px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:#ABA79F;padding:0 0 9px;text-align:left;width:46%;">Désignation</th>
            <th style="font-size:7px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:#ABA79F;padding:0 0 9px;text-align:right;">Montant HT</th>
            <th style="font-size:7px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:#ABA79F;padding:0 0 9px;text-align:right;">TVA 20%</th>
            <th style="font-size:7px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:#ABA79F;padding:0 0 9px;text-align:right;">Total TTC</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom:0.5px solid #F0ECE6;">
            <td style="padding:11px 0;font-size:12px;font-weight:500;color:#0C0C0B;">${missionNom}</td>
            <td style="padding:11px 0;font-size:11.5px;font-weight:400;color:#9B968F;text-align:right;font-variant-numeric:tabular-nums;">${fmtMAD(ht)}</td>
            <td style="padding:11px 0;font-size:11.5px;font-weight:400;color:#9B968F;text-align:right;font-variant-numeric:tabular-nums;">${fmtMAD(tva)}</td>
            <td style="padding:11px 0;font-size:12px;font-weight:500;color:#0C0C0B;text-align:right;font-variant-numeric:tabular-nums;">${fmtMAD(ttc)}</td>
          </tr>
          <tr>
            <td colspan="3" style="padding:13px 0 2px;border-top:0.5px solid #0C0C0B;">
              <span style="${AV}font-size:13px;font-style:italic;color:#9B8157;">Total à régler</span>
            </td>
            <td style="padding:13px 0 2px;border-top:0.5px solid #0C0C0B;text-align:right;font-variant-numeric:tabular-nums;">
              <span style="font-size:14px;font-weight:700;color:#0C0C0B;">${fmtMAD(ttc)}</span>
            </td>
          </tr>
        </tbody>
      </table>

      ${sectionHead(2, 'Modalités de règlement')}
      <div style="background:#F8F5F0;border-left:2px solid #C4AD8A;border-radius:0 5px 5px 0;padding:14px 18px;font-size:11.5px;color:#3A3830;line-height:1.75;">
        Paiement par virement bancaire ou chèque.<br>
        Délai de paiement : 30 jours à compter de la date d'émission.<br>
        En cas de retard, des pénalités de 1,5% par mois seront appliquées.
      </div>
    </div>`

  const slug = missionNom.replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 30)
  await renderToPdf({ headerHTML, contentHTML, filename: `${invoiceNum}_${slug}.pdf` })
}
