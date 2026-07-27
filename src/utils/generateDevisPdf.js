import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

const fmtMAD = (n) =>
  Number(n || 0).toLocaleString('fr-MA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' MAD'

export async function generateDevisPdf({ prospect, missions }) {
  const totalTTC = missions.reduce((s, m) => s + (m.prixTTC || 0), 0)
  const totalHT = Math.round(totalTTC / 1.2)
  const tva = totalTTC - totalHT
  const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const num = `DEV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(prospect.id).replace(/\D/g, '').slice(-4).padStart(4, '0')}`

  const missionsHtml = missions.length === 0
    ? '<p style="color:#94A3B8; font-size:12px; padding:24px 0;">Aucune mission définie.</p>'
    : missions.map((m, i) => {
        const livrables = m.livrables || []
        const livrablesHtml = livrables.length > 0
          ? `<div class="livrables">
              <div class="livrables-title">Livrables inclus</div>
              <div class="livrables-grid">
                ${livrables.map(lv => `
                  <div class="livrable-item">
                    <span class="livrable-check">✓</span>
                    <span>${lv.nom}</span>
                  </div>
                `).join('')}
              </div>
            </div>`
          : ''
        return `
          <div class="mission-block ${i < missions.length - 1 ? 'mission-separator' : ''}">
            <div class="mission-row">
              <div class="mission-left">
                <div class="mission-index">${String(i + 1).padStart(2, '0')}</div>
                <div class="mission-content">
                  <div class="mission-nom">${m.nom}</div>
                  ${m.description ? `<div class="mission-desc">${m.description}</div>` : ''}
                  ${livrablesHtml}
                </div>
              </div>
              <div class="mission-price">${fmtMAD(m.prixTTC)}</div>
            </div>
          </div>
        `
      }).join('')

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: #1a2332; background: #fff; width: 794px; }

  /* ── Header ── */
  .header { background: #0A1E3F; color: white; padding: 40px 48px 32px; display: flex; justify-content: space-between; align-items: flex-end; }
  .brand-name { font-size: 30px; font-weight: 800; letter-spacing: 5px; }
  .brand-sub  { font-size: 9px; letter-spacing: 3px; color: #06B6D4; text-transform: uppercase; margin-top: 4px; }
  .doc-type   { font-size: 24px; font-weight: 300; letter-spacing: 3px; color: #06B6D4; text-align: right; }
  .doc-num    { font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 4px; text-align: right; }

  /* ── Body ── */
  .body { padding: 40px 48px; }

  /* ── Meta blocks ── */
  .meta { display: grid; gap: 16px; margin-bottom: 32px; }
  .meta-2 { grid-template-columns: 1fr 1fr; }
  .meta-3 { grid-template-columns: repeat(3, 1fr); }
  .meta-block { background: #F8FAFC; border: 1px solid #E9EFF5; border-radius: 10px; padding: 14px 18px; }
  .meta-label { font-size: 8px; text-transform: uppercase; letter-spacing: 2px; color: #94A3B8; margin-bottom: 7px; }
  .meta-value { font-size: 12px; color: #1a2332; line-height: 1.65; }
  .meta-value strong { font-size: 14px; display: block; margin-bottom: 2px; }

  /* ── Section title ── */
  .section-title {
    display: flex; align-items: center; gap: 10px;
    font-size: 9px; text-transform: uppercase; letter-spacing: 2.5px; color: #94A3B8;
    margin-bottom: 14px;
  }
  .section-title::after {
    content: ''; flex: 1; height: 1px; background: #E9EFF5;
  }

  /* ── Prestations container ── */
  .prestations { border: 1px solid #E9EFF5; border-radius: 12px; overflow: hidden; margin-bottom: 28px; }

  /* ── Prestations header row ── */
  .prestations-header {
    display: flex; justify-content: space-between; align-items: center;
    background: #0A1E3F; color: white;
    padding: 10px 20px 10px 20px;
    font-size: 9px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;
  }

  /* ── Mission block ── */
  .mission-block { padding: 18px 20px; }
  .mission-separator { border-bottom: 1px solid #F1F5F9; }

  .mission-row { display: flex; align-items: flex-start; gap: 16px; }

  .mission-left { flex: 1; display: flex; gap: 14px; min-width: 0; }

  .mission-index {
    width: 28px; height: 28px; border-radius: 7px;
    background: #EFF6FF; color: #1D4ED8;
    font-size: 11px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; margin-top: 1px;
  }

  .mission-content { flex: 1; min-width: 0; }
  .mission-nom  { font-size: 13px; font-weight: 700; color: #0A1E3F; margin-bottom: 3px; }
  .mission-desc { font-size: 11px; color: #64748B; line-height: 1.5; margin-bottom: 10px; }

  .mission-price {
    font-size: 15px; font-weight: 800; color: #0A1E3F;
    white-space: nowrap; flex-shrink: 0; padding-top: 3px;
    text-align: right; min-width: 130px;
  }

  /* ── Livrables ── */
  .livrables { margin-top: 10px; padding: 10px 14px; background: #F8FAFC; border-radius: 8px; border-left: 3px solid #06B6D4; }
  .livrables-title { font-size: 8px; text-transform: uppercase; letter-spacing: 1.5px; color: #06B6D4; font-weight: 600; margin-bottom: 7px; }
  .livrables-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px 16px; }
  .livrable-item { display: flex; align-items: flex-start; gap: 6px; font-size: 11px; color: #475569; line-height: 1.4; }
  .livrable-check { color: #06B6D4; font-weight: 700; flex-shrink: 0; margin-top: 1px; }

  /* ── Totals ── */
  .totals { display: flex; justify-content: flex-end; margin-bottom: 28px; }
  .totals-box { background: #F8FAFC; border: 1px solid #E9EFF5; border-radius: 12px; padding: 16px 22px; min-width: 290px; }
  .total-row { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; font-size: 12px; color: #64748B; }
  .total-row .label {}
  .total-row .val { font-weight: 500; color: #1a2332; }
  .total-divider { height: 1px; background: #E2E8F0; margin: 8px 0; }
  .total-final { display: flex; justify-content: space-between; align-items: center; padding: 10px 0 2px; }
  .total-final .label { font-size: 13px; font-weight: 700; color: #0A1E3F; }
  .total-final .val   { font-size: 18px; font-weight: 800; color: #0A1E3F; }

  /* ── Validity ── */
  .validity { background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 10px; padding: 11px 16px; font-size: 11px; color: #1D4ED8; margin-bottom: 32px; display: flex; align-items: center; gap: 8px; }

  /* ── Footer ── */
  .footer-bar { background: #F1F5F9; padding: 18px 48px; display: flex; justify-content: space-between; align-items: center; border-top: 3px solid #06B6D4; }
  .footer-note { font-size: 10px; color: #94A3B8; line-height: 1.6; }
  .footer-num  { font-size: 10px; color: #CBD5E1; }
</style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <div>
      <div class="brand-name">CLADE</div>
      <div class="brand-sub">Architecture & Design</div>
    </div>
    <div>
      <div class="doc-type">DEVIS</div>
      <div class="doc-num">${num} · ${date}</div>
    </div>
  </div>

  <div class="body">

    <!-- Émetteur / Destinataire -->
    <div class="meta meta-2">
      <div class="meta-block">
        <div class="meta-label">Émetteur</div>
        <div class="meta-value">
          <strong>CLADE Architecture</strong>
          contact@clade-architecture.ma<br>
          +212 5XX XXX XXX<br>
          Casablanca, Maroc
        </div>
      </div>
      <div class="meta-block">
        <div class="meta-label">Destinataire</div>
        <div class="meta-value">
          <strong>${prospect.prenom} ${prospect.nom}</strong>
          ${prospect.email || ''}<br>
          ${prospect.telephone || ''}<br>
          ${prospect.localisation || ''}
        </div>
      </div>
    </div>

    <!-- Projet / Surface / Budget -->
    <div class="meta meta-3">
      <div class="meta-block">
        <div class="meta-label">Type de projet</div>
        <div class="meta-value"><strong>${prospect.typeProjet || '—'}</strong></div>
      </div>
      <div class="meta-block">
        <div class="meta-label">Surface</div>
        <div class="meta-value"><strong>${prospect.surface ? prospect.surface + ' m²' : '—'}</strong></div>
      </div>
      <div class="meta-block">
        <div class="meta-label">Budget travaux estimé</div>
        <div class="meta-value"><strong>${prospect.budget ? Number(prospect.budget).toLocaleString('fr-FR') + ' MAD' : '—'}</strong></div>
      </div>
    </div>

    <!-- Prestations -->
    <div class="section-title">Détail des prestations</div>

    <div class="prestations">
      <div class="prestations-header">
        <span>Mission / Prestations</span>
        <span>Montant TTC</span>
      </div>
      ${missionsHtml}
    </div>

    <!-- Totaux -->
    <div class="totals">
      <div class="totals-box">
        <div class="total-row"><span class="label">Montant HT</span><span class="val">${fmtMAD(totalHT)}</span></div>
        <div class="total-row"><span class="label">TVA 20 %</span><span class="val">${fmtMAD(tva)}</span></div>
        <div class="total-divider"></div>
        <div class="total-final"><span class="label">Total TTC</span><span class="val">${fmtMAD(totalTTC)}</span></div>
      </div>
    </div>

    <!-- Validité -->
    <div class="validity">
      <span style="font-size:14px;">⏳</span>
      Ce devis est valable <strong>30 jours</strong> à compter de sa date d'émission (${date}).
    </div>

  </div>

  <!-- Footer -->
  <div class="footer-bar">
    <div class="footer-note">
      CLADE Architecture · RC · ICE · Patente<br>
      Toute acceptation du présent devis vaut commande ferme et irrévocable.
    </div>
    <div class="footer-num">${num}</div>
  </div>

</body>
</html>`

  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;'
  container.innerHTML = html
  document.body.appendChild(container)

  try {
    const canvas = await html2canvas(container, { scale: 2, useCORS: true, logging: false, width: 794 })
    const imgData = canvas.toDataURL('image/jpeg', 0.92)
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const imgH = (canvas.height * pageW) / canvas.width
    let y = 0
    if (imgH <= pageH) {
      pdf.addImage(imgData, 'JPEG', 0, 0, pageW, imgH)
    } else {
      let remaining = imgH
      while (remaining > 0) {
        pdf.addImage(imgData, 'JPEG', 0, y > 0 ? -(imgH - remaining) : 0, pageW, imgH)
        remaining -= pageH
        if (remaining > 0) { pdf.addPage(); y += pageH }
      }
    }
    pdf.save(`${num}_${prospect.prenom}_${prospect.nom}.pdf`)
  } finally {
    document.body.removeChild(container)
  }
}
