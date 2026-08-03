import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export function getImmatriculation() {
  try {
    const raw = localStorage.getItem('clade_immatriculation')
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

const CANVAS_OPTS = {
  scale: 2,
  useCORS: true,
  allowTaint: true,
  backgroundColor: '#ffffff',
  width: 794,
  windowWidth: 794,
  logging: false,
}

const SB = "font-family:'Inter Tight',-apple-system,BlinkMacSystemFont,sans-serif;"
const AV = "font-family:'Averia Libre',Georgia,serif;"

function createHidden(html) {
  const el = document.createElement('div')
  el.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;visibility:visible;z-index:-1;background:#fff;'
  el.innerHTML = html
  document.body.appendChild(el)
  return el
}

async function waitReady(el) {
  await Promise.all(
    Array.from(el.querySelectorAll('img')).map(img =>
      img.complete ? Promise.resolve() : new Promise(r => { img.onload = r; img.onerror = r })
    )
  )
  await new Promise(r => setTimeout(r, 80))
}

// Shared section header inside a content area
export function sectionHead(num, label) {
  return `
    <div style="display:flex;align-items:center;gap:8px;margin:22px 0 12px;">
      <span style="${AV}font-size:10.5px;color:#C4AD8A;">[</span>
      <span style="${AV}font-size:10.5px;color:#9B8157;">${String(num).padStart(2,'0')}</span>
      <span style="${AV}font-size:10.5px;color:#C4AD8A;">]</span>
      <span style="${SB}font-size:7.5px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:#ABA79F;">${label}</span>
      <div style="flex:1;height:0.5px;background:#EDEAE3;"></div>
    </div>`
}

// Dark header common to all documents
export function buildDocHeader({ type, title, ref = '', meta = [], statusSlot = '' }) {
  const metaHTML = meta.length ? `
    <div style="${SB}background:#F8F5F0;padding:12px 48px;display:flex;border-bottom:0.5px solid #DDD8D0;">
      ${meta.map((m, i) => `
        <div style="flex:1;${i > 0 ? 'padding-left:18px;border-left:0.5px solid #E0DBD3;' : ''}padding-right:18px;">
          <div style="font-size:7px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:#BAB5AE;margin-bottom:3px;">${m.label}</div>
          <div style="font-size:11.5px;font-weight:500;color:${m.accent ? '#9B8157' : '#0C0C0B'};">${m.value}</div>
        </div>`).join('')}
    </div>` : ''

  return `
    <div style="${SB}background:#0C0C0B;padding:24px 48px 20px;position:relative;overflow:hidden;">
      <div style="position:absolute;right:22px;top:50%;transform:translateY(-50%);${AV}font-size:120px;color:rgba(255,255,255,0.04);line-height:1;user-select:none;pointer-events:none;">]</div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:20px;position:relative;z-index:1;">
        <div>
          <div style="display:flex;align-items:baseline;gap:7px;margin-bottom:13px;">
            <span style="${AV}font-size:21px;font-weight:400;color:#F8F5F0;letter-spacing:0.04em;line-height:1;">Clade</span>
            <span style="${SB}font-size:6.5px;font-weight:400;letter-spacing:0.26em;text-transform:uppercase;color:rgba(248,245,240,0.24);">architects &amp; co</span>
          </div>
          <div style="display:inline-flex;align-items:center;gap:5px;margin-bottom:9px;">
            <span style="${AV}font-size:9.5px;color:rgba(196,173,138,0.55);">[</span>
            <span style="${SB}font-size:7.5px;font-weight:600;letter-spacing:0.26em;text-transform:uppercase;color:#C4AD8A;">${type}</span>
            <span style="${AV}font-size:9.5px;color:rgba(196,173,138,0.55);">]</span>
          </div>
          <div style="font-size:25px;font-weight:700;color:#F8F5F0;line-height:1.1;letter-spacing:-0.01em;">${title}</div>
          ${ref ? `<div style="font-size:8px;font-weight:400;color:rgba(248,245,240,0.2);letter-spacing:0.12em;margin-top:6px;">${ref}</div>` : ''}
        </div>
        ${statusSlot}
      </div>
    </div>
    ${metaHTML}`
}

export function buildDocFooter(immat = {}) {
  const { nom, adresse, telFax, cnss, patente, identifiantFiscale, ice, rib } = immat
  const hasReg = cnss || patente || identifiantFiscale || ice
  const line1 = [
    nom ? `<strong style="color:#5A5650;font-weight:600;">${nom}</strong>` : null,
    adresse || null,
    telFax ? `Tél/Fax : ${telFax}` : null,
  ].filter(Boolean).join(' &nbsp;·&nbsp; ')
  const line2 = [
    cnss && `CNSS N° : ${cnss}`,
    patente && `Patente N° : ${patente}`,
    identifiantFiscale && `Identifiant Fiscale : ${identifiantFiscale}`,
    ice && `ICE : ${ice}`,
  ].filter(Boolean).join(' &nbsp;—&nbsp; ')

  return `
    <div style="${SB}background:#F5F2EE;border-top:0.5px solid #D5D0C8;padding:9px 48px;display:flex;align-items:center;gap:16px;">
      <div style="font-size:7.5px;color:#9B968F;line-height:1.75;flex:1;">
        ${line1 ? `<div>${line1}</div>` : '<div style="color:#BAB5AE;">Clade — Document officiel</div>'}
        ${hasReg && line2 ? `<div>${line2}</div>` : ''}
        ${rib ? `<div>${rib}</div>` : ''}
      </div>
      <div style="width:70px;flex-shrink:0;"></div>
    </div>`
}

export async function renderToPdf({ headerHTML, contentHTML, filename }) {
  const immat = getImmatriculation()
  const footerHTML = buildDocFooter(immat)

  const hEl = createHidden(headerHTML)
  await waitReady(hEl)
  const hCanvas = await html2canvas(hEl, CANVAS_OPTS)
  hEl.remove()

  const fEl = createHidden(footerHTML)
  await waitReady(fEl)
  const fCanvas = await html2canvas(fEl, CANVAS_OPTS)
  fEl.remove()

  const cEl = createHidden(contentHTML)
  await waitReady(cEl)
  const cCanvas = await html2canvas(cEl, CANVAS_OPTS)
  cEl.remove()

  const A4H_px = Math.round(297 * (hCanvas.width / 210))
  const hH = hCanvas.height
  const fH = fCanvas.height
  const contentPerPage = A4H_px - hH - fH
  const totalPages = Math.max(1, Math.ceil(cCanvas.height / contentPerPage))

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  for (let p = 0; p < totalPages; p++) {
    if (p > 0) pdf.addPage()
    const page = document.createElement('canvas')
    page.width = hCanvas.width
    page.height = A4H_px
    const ctx = page.getContext('2d')

    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, page.width, A4H_px)
    ctx.drawImage(hCanvas, 0, 0)

    const srcY = p * contentPerPage
    const srcH = Math.min(contentPerPage, cCanvas.height - srcY)
    if (srcH > 0) ctx.drawImage(cCanvas, 0, srcY, cCanvas.width, srcH, 0, hH, page.width, srcH)

    ctx.drawImage(fCanvas, 0, A4H_px - fH)

    // Page number drawn directly — no font embed needed for a single line
    ctx.font = '20px Georgia, serif'
    ctx.fillStyle = '#C4AD8A'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillText(`[ ${p + 1} / ${totalPages} ]`, page.width - 56, A4H_px - fH / 2)

    pdf.addImage(page.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, 210, 297)
  }

  pdf.save(filename)
}
