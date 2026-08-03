import { buildDocHeader, sectionHead, renderToPdf } from './pdfBase.js'

const fmtMAD = (n) =>
  Number(n || 0).toLocaleString('fr-MA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' MAD'

const SB = "font-family:'Inter Tight',-apple-system,BlinkMacSystemFont,sans-serif;"
const AV = "font-family:'Averia Libre',Georgia,serif;"

export async function generateDevisPdf({ prospect, missions }) {
  const totalTTC = missions.reduce((s, m) => s + (m.prixTTC || 0), 0)
  const totalHT  = Math.round(totalTTC / 1.2)
  const tva      = totalTTC - totalHT
  const date     = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const num      = `DEV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(prospect.id).replace(/\D/g, '').slice(-4).padStart(4, '0')}`

  const headerHTML = buildDocHeader({
    type: 'Devis',
    title: `${prospect.prenom} ${prospect.nom}`,
    ref: `${num} · ${date}`,
    meta: [
      { label: 'Type de projet', value: prospect.typeProjet || '—' },
      { label: 'Surface', value: prospect.surface ? prospect.surface + ' m²' : '—' },
      { label: 'Budget travaux', value: prospect.budget ? Number(prospect.budget).toLocaleString('fr-FR') + ' MAD' : '—' },
      { label: 'Validité', value: '30 jours' },
    ],
  })

  const missionsRows = missions.length === 0
    ? `<tr><td colspan="2" style="padding:18px 0;color:#ABA79F;font-style:italic;font-size:12px;">Aucune mission définie.</td></tr>`
    : missions.map((m, i) => {
        const livrables = (m.livrables || []).map(lv =>
          `<span style="display:inline-block;margin-right:6px;margin-bottom:3px;font-size:9.5px;color:#6B6760;">✓ ${lv.nom}</span>`
        ).join('')
        return `
          <tr style="border-bottom:0.5px solid #F0ECE6;">
            <td style="padding:12px 0;vertical-align:top;">
              <div style="display:flex;align-items:flex-start;gap:12px;">
                <span style="${AV}font-size:12px;color:#C4AD8A;flex-shrink:0;line-height:1.6;">${String(i+1).padStart(2,'0')}</span>
                <div>
                  <div style="font-size:12.5px;font-weight:600;color:#0C0C0B;margin-bottom:2px;">${m.nom}</div>
                  ${m.description ? `<div style="font-size:10.5px;color:#6B6760;margin-bottom:6px;line-height:1.5;">${m.description}</div>` : ''}
                  ${livrables ? `<div style="background:#F5F2EE;border-radius:4px;padding:5px 9px;">${livrables}</div>` : ''}
                </div>
              </div>
            </td>
            <td style="padding:12px 0;text-align:right;font-size:13px;font-weight:600;color:#0C0C0B;white-space:nowrap;vertical-align:top;font-variant-numeric:tabular-nums;">${fmtMAD(m.prixTTC)}</td>
          </tr>`
      }).join('')

  const contentHTML = `
    <div style="${SB}background:#fff;padding:26px 48px 30px;">
      ${sectionHead(1, 'Émetteur & destinataire')}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:4px;">
        <div style="background:#F8F5F0;border-radius:6px;padding:13px 16px;">
          <div style="font-size:7px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:#BAB5AE;margin-bottom:7px;">Émetteur</div>
          <div style="font-size:12.5px;font-weight:600;color:#0C0C0B;margin-bottom:3px;">Clade Architecture</div>
          <div style="font-size:10.5px;color:#6B6760;line-height:1.65;">contact@clade-architecture.ma</div>
        </div>
        <div style="background:#F8F5F0;border-radius:6px;padding:13px 16px;">
          <div style="font-size:7px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:#BAB5AE;margin-bottom:7px;">Destinataire</div>
          <div style="font-size:12.5px;font-weight:600;color:#0C0C0B;margin-bottom:3px;">${prospect.prenom} ${prospect.nom}</div>
          <div style="font-size:10.5px;color:#6B6760;line-height:1.65;">${[prospect.email, prospect.telephone, prospect.localisation].filter(Boolean).join('<br>')}</div>
        </div>
      </div>

      ${sectionHead(2, 'Détail des prestations')}
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:0.5px solid #0C0C0B;">
            <th style="font-size:7px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:#ABA79F;padding:0 0 9px;text-align:left;">Mission / Prestation</th>
            <th style="font-size:7px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:#ABA79F;padding:0 0 9px;text-align:right;">Montant TTC</th>
          </tr>
        </thead>
        <tbody>
          ${missionsRows}
          <tr>
            <td style="padding:13px 0 2px;border-top:0.5px solid #0C0C0B;">
              <div style="font-size:7.5px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:#ABA79F;">Sous-total HT &nbsp;+&nbsp; TVA 20%</div>
              <div style="font-size:10px;color:#9B968F;margin-top:2px;">${fmtMAD(totalHT)} + ${fmtMAD(tva)}</div>
            </td>
            <td style="padding:13px 0 2px;border-top:0.5px solid #0C0C0B;text-align:right;vertical-align:top;">
              <span style="${AV}font-size:13px;font-style:italic;color:#9B8157;display:block;">Total TTC</span>
              <span style="font-size:15px;font-weight:700;color:#0C0C0B;font-variant-numeric:tabular-nums;">${fmtMAD(totalTTC)}</span>
            </td>
          </tr>
        </tbody>
      </table>

      <div style="background:#F5F2EE;border-left:2px solid #C4AD8A;border-radius:0 5px 5px 0;padding:11px 16px;font-size:11px;color:#6B6760;margin-top:18px;line-height:1.65;">
        Ce devis est valable <strong style="color:#0C0C0B;">30 jours</strong> à compter de sa date d'émission (${date}). Toute acceptation vaut commande ferme et irrévocable.
      </div>
    </div>`

  await renderToPdf({ headerHTML, contentHTML, filename: `${num}_${prospect.prenom}_${prospect.nom}.pdf` })
}
