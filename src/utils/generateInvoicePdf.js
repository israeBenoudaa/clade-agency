import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'

const fmtNow = () =>
  new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const fmtMAD = (n) =>
  Number(n || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MAD'

const STATUS = {
  paye: { label: 'Payée', bg: '#D1FAE5', color: '#065F46' },
  en_cours: { label: 'En attente', bg: '#FEF9C3', color: '#92400E' },
  non_paye: { label: 'Non payée', bg: '#FEE2E2', color: '#991B1B' },
}

function buildTemplate({ invoiceNum, projectNom, client, missionNom, honoraire, paiement, date }) {
  const st = STATUS[paiement] || STATUS.non_paye
  const ht = Number(honoraire) || 0
  const tva = ht * 0.2
  const ttc = ht + tva

  return `
  <div style="background:#ffffff;font-family:'Helvetica Neue',Arial,sans-serif;width:794px;min-height:1100px;position:relative;box-sizing:border-box;">
    <div style="height:5px;background:linear-gradient(90deg,#0A1E3F 0%,#3B7BF6 55%,#06B6D4 100%);"></div>

    <div style="background:#0A1E3F;padding:40px 48px 36px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:24px;">
        <div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:22px;">
            <div style="width:38px;height:38px;background:#3B7BF6;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <span style="color:white;font-size:17px;font-weight:900;font-family:Georgia,serif;">C</span>
            </div>
            <div>
              <div style="color:#3B7BF6;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;line-height:1;">CLADE</div>
              <div style="color:rgba(255,255,255,0.45);font-size:9px;letter-spacing:1px;margin-top:2px;">Agence d'Architecture</div>
            </div>
          </div>
          <div style="color:rgba(255,255,255,0.45);font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px;">Facture d'Honoraires</div>
          <div style="color:white;font-size:26px;font-weight:800;line-height:1.2;">${invoiceNum}</div>
        </div>
        <div>
          <div style="background:rgba(59,123,246,0.12);border:1px solid rgba(59,123,246,0.25);border-radius:12px;padding:16px 20px;text-align:right;min-width:180px;">
            <div style="color:rgba(255,255,255,0.4);font-size:8px;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">Statut</div>
            <div style="background:${st.bg};color:${st.color};font-size:12px;font-weight:700;padding:4px 10px;border-radius:6px;display:inline-block;">${st.label}</div>
            <div style="color:rgba(255,255,255,0.4);font-size:8px;margin-top:12px;letter-spacing:2px;text-transform:uppercase;">Date d'émission</div>
            <div style="color:white;font-size:12px;font-weight:600;margin-top:3px;">${fmtDate(date)}</div>
          </div>
        </div>
      </div>
    </div>

    <div style="background:#F4F3EF;padding:18px 48px;display:flex;gap:48px;flex-wrap:wrap;border-bottom:1px solid #E5E7EB;">
      <div>
        <div style="font-size:8px;color:#6B7280;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">Projet</div>
        <div style="font-size:13px;color:#0A1E3F;font-weight:700;margin-top:2px;">${projectNom}</div>
      </div>
      <div>
        <div style="font-size:8px;color:#6B7280;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">Client</div>
        <div style="font-size:13px;color:#0A1E3F;font-weight:700;margin-top:2px;">${client || '—'}</div>
      </div>
    </div>

    <div style="padding:40px 48px 32px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
        <div style="width:4px;height:20px;background:#3B7BF6;border-radius:2px;flex-shrink:0;"></div>
        <div style="font-size:10px;color:#3B7BF6;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;">Détail de la prestation</div>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-bottom:32px;">
        <thead>
          <tr style="background:#F9FAFB;">
            <th style="text-align:left;padding:12px 16px;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #E5E7EB;">Désignation</th>
            <th style="text-align:right;padding:12px 16px;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #E5E7EB;">Montant HT</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:18px 16px;border-bottom:1px solid #F3F4F6;">
              <div style="font-size:14px;font-weight:600;color:#1F2937;">${missionNom}</div>
              <div style="font-size:12px;color:#6B7280;margin-top:4px;">Mission architecturale — ${projectNom}</div>
            </td>
            <td style="padding:18px 16px;text-align:right;font-size:14px;font-weight:700;color:#1F2937;border-bottom:1px solid #F3F4F6;">${fmtMAD(ht)}</td>
          </tr>
        </tbody>
      </table>

      <div style="display:flex;justify-content:flex-end;">
        <div style="width:290px;">
          <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #E5E7EB;">
            <span style="font-size:13px;color:#6B7280;">Sous-total HT</span>
            <span style="font-size:13px;font-weight:600;color:#1F2937;">${fmtMAD(ht)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #E5E7EB;">
            <span style="font-size:13px;color:#6B7280;">TVA (20%)</span>
            <span style="font-size:13px;font-weight:600;color:#1F2937;">${fmtMAD(tva)}</span>
          </div>
          <div style="background:#0A1E3F;border-radius:10px;padding:14px 16px;margin-top:4px;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:14px;font-weight:700;color:white;">Total TTC</span>
            <span style="font-size:16px;font-weight:800;color:#06B6D4;">${fmtMAD(ttc)}</span>
          </div>
        </div>
      </div>

      <div style="margin-top:40px;padding:20px 24px;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;">
        <div style="font-size:10px;color:#6B7280;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;">Modalités de règlement</div>
        <div style="font-size:12px;color:#374151;line-height:1.9;">
          Paiement par virement bancaire ou chèque à l'ordre de <strong>CLADE Architecture</strong><br>
          Délai de paiement : 30 jours à compter de la date d'émission<br>
          En cas de retard, des pénalités de 1,5 % par mois seront appliquées conformément à la législation en vigueur.
        </div>
      </div>
    </div>

    <div style="background:#0A1E3F;padding:16px 48px;display:flex;justify-content:space-between;align-items:center;margin-top:auto;">
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="width:18px;height:18px;background:#3B7BF6;border-radius:4px;display:flex;align-items:center;justify-content:center;">
          <span style="color:white;font-size:8px;font-weight:900;">C</span>
        </div>
        <span style="color:rgba(255,255,255,0.4);font-size:10px;">CLADE — Document officiel · ${invoiceNum}</span>
      </div>
      <div style="color:rgba(255,255,255,0.35);font-size:10px;">Généré le ${fmtNow()}</div>
    </div>
    <div style="height:4px;background:linear-gradient(90deg,#3B7BF6 0%,#06B6D4 100%);"></div>
  </div>`
}

export async function generateInvoicePdf({ invoiceNum, projectNom, client, missionNom, honoraire, paiement, date }) {
  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;visibility:visible;z-index:-1;'
  container.innerHTML = buildTemplate({ invoiceNum, projectNom, client, missionNom, honoraire, paiement, date })
  document.body.appendChild(container)

  await new Promise(r => setTimeout(r, 80))

  const SCALE = 2
  const canvas = await html2canvas(container, {
    scale: SCALE,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    width: 794,
    windowWidth: 794,
    logging: false,
  })

  document.body.removeChild(container)

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const canvasH = (canvas.height * 210) / canvas.width
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, canvasH)

  const slug = missionNom.replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 30)
  pdf.save(`${invoiceNum}_${slug}.pdf`)
}
