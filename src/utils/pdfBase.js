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
    <div style="${SB}display:flex;align-items:center;gap:10px;margin:24px 0 14px;">
      <div style="display:flex;align-items:center;gap:3px;flex-shrink:0;">
        <span style="${AV}font-size:9px;color:#C4AD8A;line-height:1;">[</span>
        <span style="${AV}font-size:11px;color:#9B8157;line-height:1;font-weight:400;">${String(num).padStart(2,'0')}</span>
        <span style="${AV}font-size:9px;color:#C4AD8A;line-height:1;">]</span>
      </div>
      <span style="font-size:7px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;color:#C4BFB8;">${label}</span>
      <div style="flex:1;height:1px;background:linear-gradient(to right,#E0DBD3,transparent);"></div>
    </div>`
}

// Dark header common to all documents
export function buildDocHeader({ type, title, ref = '', meta = [], statusSlot = '' }) {
  const metaHTML = meta.length ? `
    <div style="${SB}background:#F4F1EC;padding:0 48px;display:flex;border-bottom:1px solid #DDD8D0;">
      ${meta.map((m, i) => `
        <div style="flex:1;padding:14px 20px 14px 0;${i > 0 ? 'padding-left:20px;border-left:0.5px solid #DDD8D0;' : ''}">
          <div style="font-size:6.5px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;color:#C4BFB8;margin-bottom:4px;">${m.label}</div>
          <div style="font-size:12px;font-weight:600;color:${m.accent ? '#9B8157' : '#161410'};">${m.value}</div>
        </div>`).join('')}
    </div>` : ''

  return `
    <div style="${SB}background:#161410;padding:28px 48px 24px;position:relative;overflow:hidden;">
      <div style="position:absolute;right:-10px;bottom:-20px;${AV}font-size:180px;color:rgba(255,255,255,0.025);line-height:1;user-select:none;pointer-events:none;letter-spacing:-10px;">[ ]</div>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:32px;position:relative;z-index:1;">

        <!-- Left: logo + title -->
        <div style="flex:1;min-width:0;">
          <div style="margin-bottom:20px;">
            <div style="${AV}font-size:24px;font-weight:400;color:#F8F5F0;letter-spacing:0.03em;line-height:1;">Clade</div>
            <div style="${SB}font-size:6px;font-weight:500;letter-spacing:0.32em;text-transform:uppercase;color:rgba(248,245,240,0.22);margin-top:5px;">architects &amp; co</div>
          </div>
          <div style="font-size:30px;font-weight:700;color:#F8F5F0;line-height:1.06;letter-spacing:-0.02em;max-width:380px;">${title}</div>
          ${ref ? `<div style="font-size:8px;font-weight:400;color:rgba(248,245,240,0.2);letter-spacing:0.1em;margin-top:8px;font-variant-numeric:tabular-nums;">${ref}</div>` : ''}
        </div>

        <!-- Right: type + status -->
        <div style="flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:12px;">
          <div style="display:flex;align-items:center;gap:7px;">
            <span style="${AV}font-size:15px;color:rgba(196,173,138,0.5);line-height:1;">[</span>
            <span style="${SB}font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#C4AD8A;line-height:1;">${type}</span>
            <span style="${AV}font-size:15px;color:rgba(196,173,138,0.5);line-height:1;">]</span>
          </div>
          ${statusSlot || ''}
        </div>

      </div>
      <div style="margin-top:20px;height:1px;background:linear-gradient(to right,rgba(196,173,138,0.35),transparent);"></div>
    </div>
    ${metaHTML}`
}

export function buildDocFooter(immat = {}) {
  const { nom, adresse, telFax, cnss, patente, identifiantFiscale, ice, rib } = immat
  const hasReg = cnss || patente || identifiantFiscale || ice
  const line1 = [
    nom ? `<strong style="color:#4A4640;font-weight:700;">${nom}</strong>` : null,
    adresse || null,
    telFax ? `Tél/Fax : ${telFax}` : null,
  ].filter(Boolean).join('&ensp;·&ensp;')
  const line2 = [
    cnss && `CNSS N° : ${cnss}`,
    patente && `Patente N° : ${patente}`,
    identifiantFiscale && `Identifiant Fiscale : ${identifiantFiscale}`,
    ice && `ICE : ${ice}`,
  ].filter(Boolean).join('&ensp;—&ensp;')

  const line2Full = [line2, rib].filter(Boolean).join('&ensp;·&ensp;')

  return `
    <div style="${SB}background:#F2EEE8;border-top:1px solid #DDD8D0;">
      <div style="padding:5px 48px;display:flex;align-items:center;gap:16px;">
        <div style="font-size:7px;color:#9B968F;line-height:1.55;flex:1;">
          ${line1 ? `<div>${line1}</div>` : '<div style="color:#BAB5AE;font-style:italic;">Clade — Document officiel</div>'}
          ${line2Full ? `<div style="margin-top:1px;">${line2Full}</div>` : ''}
        </div>
        <div style="width:80px;flex-shrink:0;"></div>
      </div>
    </div>`
}

export async function renderToPdf({ headerHTML, contentHTML, filename }) {
  let _stage = 'init'
  try {
    _stage = 'footer-build'
    const immat = getImmatriculation()
    const footerHTML = buildDocFooter(immat)

    _stage = 'header-canvas'
    const hEl = createHidden(headerHTML)
    await waitReady(hEl)
    const hCanvas = await html2canvas(hEl, CANVAS_OPTS)
    hEl.remove()

    _stage = 'footer-canvas'
    const fEl = createHidden(footerHTML)
    await waitReady(fEl)
    const fCanvas = await html2canvas(fEl, CANVAS_OPTS)
    fEl.remove()

    _stage = 'content-canvas'
    const cEl = createHidden(contentHTML)
    await waitReady(cEl)
    const cCanvas = await html2canvas(cEl, CANVAS_OPTS)
    cEl.remove()

    _stage = 'compose'
    const A4H_px = Math.round(297 * (hCanvas.width / 210))
    const hH = hCanvas.height
    const fH = fCanvas.height
    const contentPerPage = Math.max(1, A4H_px - hH - fH)
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

      ctx.font = '20px Georgia, serif'
      ctx.fillStyle = '#C4AD8A'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillText(`[ ${p + 1} / ${totalPages} ]`, page.width - 56, A4H_px - fH / 2)

      pdf.addImage(page.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, 210, 297)
    }

    _stage = 'save'
    pdf.save(filename)
  } catch (e) {
    console.error(`[PDF] renderToPdf failed at stage "${_stage}":`, e)
    throw e
  }
}
