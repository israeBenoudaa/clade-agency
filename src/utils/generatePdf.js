import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

const fmtDateLong = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—'

const fmtNow = () =>
  new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

// Crop an image src to a centered square and return a high-res data URL
function cropSquare(src, outputPx = 700) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const side = Math.min(img.naturalWidth, img.naturalHeight)
      const sx   = (img.naturalWidth  - side) / 2
      const sy   = (img.naturalHeight - side) / 2
      const canvas = document.createElement('canvas')
      canvas.width  = outputPx
      canvas.height = outputPx
      canvas.getContext('2d').drawImage(img, sx, sy, side, side, 0, 0, outputPx, outputPx)
      resolve(canvas.toDataURL('image/jpeg', 0.93))
    }
    img.onerror = () => resolve(src)
    img.src = src
  })
}

// Build pairs of images as rows — each row div gets data-image-row so we can measure it
function buildImagesSection(processedImages) {
  if (!processedImages.length) return ''
  const rows = []
  for (let i = 0; i < processedImages.length; i += 2) {
    rows.push(processedImages.slice(i, i + 2))
  }
  return `
    <div style="padding:0 48px 40px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
        <div style="width:4px;height:20px;background:#06B6D4;border-radius:2px;flex-shrink:0;"></div>
        <div style="font-size:10px;color:#06B6D4;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;">Documents &amp; Photos</div>
      </div>
      ${rows.map((row, ri) => `
        <div data-image-row="${ri}" style="display:grid;grid-template-columns:1fr 1fr;gap:20px;${ri < rows.length - 1 ? 'margin-bottom:20px;' : ''}">
          ${row.map((img, ci) => `
            <div style="border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;box-shadow:0 2px 10px rgba(0,0,0,0.06);">
              <img src="${img.squareSrc}" width="100%" style="display:block;width:100%;height:auto;">
              <div style="background:#F9FAFB;padding:10px 14px;border-top:1px solid #E5E7EB;min-height:32px;">
                ${img.caption
                  ? `<div style="font-size:11px;color:#374151;font-style:italic;line-height:1.6;">${img.caption}</div>`
                  : `<div style="font-size:9px;color:#9CA3AF;letter-spacing:1px;font-weight:600;text-transform:uppercase;">Photo ${ri * 2 + ci + 1}</div>`
                }
              </div>
            </div>`).join('')}
        </div>`).join('')}
    </div>`
}

function buildTemplate({ titre, date, participants, contenu, processedImages, projectNom }) {
  const dateFormatted = fmtDateLong(date)
  const now = fmtNow()
  const hasContent = contenu && contenu.trim() !== '' && contenu !== '<p></p>'
  return `
    <div style="background:#ffffff;font-family:'Helvetica Neue',Arial,sans-serif;width:794px;">

      <div style="height:5px;background:linear-gradient(90deg,#0A1E3F 0%,#3B7BF6 55%,#06B6D4 100%);"></div>

      <div style="background:#0A1E3F;padding:40px 48px 36px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:24px;">
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:22px;">
              <div style="width:38px;height:38px;background:#3B7BF6;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <span style="color:white;font-size:17px;font-weight:900;font-family:Georgia,serif;">C</span>
              </div>
              <div>
                <div style="color:#3B7BF6;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;line-height:1;">CLADE</div>
                <div style="color:rgba(255,255,255,0.45);font-size:9px;letter-spacing:1px;margin-top:2px;">Agence d'Architecture</div>
              </div>
            </div>
            <div style="color:rgba(255,255,255,0.45);font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:10px;">Compte Rendu de Réunion</div>
            <div style="color:white;font-size:26px;font-weight:800;line-height:1.25;max-width:480px;">${titre}</div>
          </div>
          <div style="flex-shrink:0;">
            <div style="background:rgba(59,123,246,0.12);border:1px solid rgba(59,123,246,0.25);border-radius:12px;padding:16px 20px;text-align:right;min-width:140px;">
              <div style="color:rgba(255,255,255,0.4);font-size:8px;letter-spacing:2px;text-transform:uppercase;margin-bottom:5px;">Projet</div>
              <div style="color:white;font-size:13px;font-weight:700;word-break:break-word;">${projectNom || 'CLADE'}</div>
            </div>
          </div>
        </div>
      </div>

      <div style="background:#F4F3EF;padding:18px 48px;display:flex;gap:36px;flex-wrap:wrap;border-bottom:1px solid #E5E7EB;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:34px;height:34px;background:#0A1E3F;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:15px;">📅</div>
          <div>
            <div style="font-size:8px;color:#6B7280;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">Date</div>
            <div style="font-size:13px;color:#0A1E3F;font-weight:700;margin-top:2px;">${dateFormatted}</div>
          </div>
        </div>
        ${participants ? `
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:34px;height:34px;background:#0A1E3F;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:15px;">👥</div>
          <div>
            <div style="font-size:8px;color:#6B7280;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">Participants</div>
            <div style="font-size:13px;color:#0A1E3F;font-weight:700;margin-top:2px;">${participants}</div>
          </div>
        </div>` : ''}
      </div>

      <div style="padding:40px 48px 32px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">
          <div style="width:4px;height:20px;background:#3B7BF6;border-radius:2px;flex-shrink:0;"></div>
          <div style="font-size:10px;color:#3B7BF6;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;">Contenu de la réunion</div>
        </div>
        <div style="background:#FAFAF8;border:1px solid #E5E7EB;border-left:3px solid #3B7BF6;border-radius:8px;padding:24px 28px;min-height:80px;">
          ${hasContent
            ? `<style>
                .cr-content p{font-size:13px;line-height:1.85;color:#374151;margin:0 0 10px;}
                .cr-content p:last-child{margin-bottom:0;}
                .cr-content strong{font-weight:700;color:#1F2937;}
                .cr-content em{font-style:italic;}
                .cr-content h2{font-size:17px;font-weight:800;color:#0A1E3F;margin:18px 0 8px;line-height:1.3;}
                .cr-content h3{font-size:14px;font-weight:700;color:#1F2937;margin:14px 0 6px;line-height:1.3;}
                .cr-content ul,.cr-content ol{margin:8px 0 10px;padding-left:22px;}
                .cr-content ul li{list-style-type:disc;font-size:13px;line-height:1.75;color:#374151;margin-bottom:3px;}
                .cr-content ol li{list-style-type:decimal;font-size:13px;line-height:1.75;color:#374151;margin-bottom:3px;}
              </style>
              <div class="cr-content">${contenu}</div>`
            : '<span style="color:#9CA3AF;font-style:italic;font-size:13px;">Aucun contenu renseigné.</span>'
          }
        </div>
      </div>

      ${buildImagesSection(processedImages)}

      <div style="background:#0A1E3F;padding:18px 48px;display:flex;justify-content:space-between;align-items:center;">
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="width:18px;height:18px;background:#3B7BF6;border-radius:4px;display:flex;align-items:center;justify-content:center;">
            <span style="color:white;font-size:8px;font-weight:900;">C</span>
          </div>
          <span style="color:rgba(255,255,255,0.4);font-size:10px;">CLADE — Document confidentiel</span>
        </div>
        <div style="color:rgba(255,255,255,0.35);font-size:10px;">Généré le ${now}</div>
      </div>

      <div style="height:4px;background:linear-gradient(90deg,#3B7BF6 0%,#06B6D4 100%);"></div>
    </div>`
}

export async function generateCompteRenduPdf({ rdv, compteRendu, projectNom }) {
  const titre       = rdv.nom      ?? ''
  const date        = rdv.date     ?? ''
  const participants = rdv.personnes ?? ''
  const { contenu = '', images = [] } = compteRendu

  // Pre-process: crop every image to a centered square at high resolution
  const processedImages = await Promise.all(
    images.map(async (img) => {
      const src     = typeof img === 'string' ? img : img.src
      const caption = typeof img === 'string' ? '' : (img.caption || '')
      return { squareSrc: await cropSquare(src, 700), caption }
    })
  )

  // Inject template into DOM (offscreen but visible for layout)
  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;visibility:visible;z-index:-1;'
  container.innerHTML = buildTemplate({ titre, date, participants, contenu, processedImages, projectNom })
  document.body.appendChild(container)

  // Wait for layout and image loads
  await Promise.all(
    Array.from(container.querySelectorAll('img')).map(
      el => el.complete ? Promise.resolve() : new Promise(r => { el.onload = r; el.onerror = r })
    )
  )
  await new Promise(r => setTimeout(r, 80))

  // Measure each image row's position in DOM pixels BEFORE html2canvas changes the DOM
  const SCALE = 2
  const containerTop = container.getBoundingClientRect().top
  const rowBounds = Array.from(container.querySelectorAll('[data-image-row]')).map(el => {
    const rect = el.getBoundingClientRect()
    return {
      top:    (rect.top    - containerTop) * SCALE,
      bottom: (rect.bottom - containerTop) * SCALE,
    }
  })

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

  // --- Smart pagination: avoid cutting through image rows ---
  const TOP_MARGIN_MM = 14                       // top margin on continuation pages
  const pxPerMm       = canvas.width / 210       // canvas pixels per mm (A4 width)
  const pageH_px      = Math.round(297 * pxPerMm)
  const contH_px      = Math.round((297 - TOP_MARGIN_MM) * pxPerMm) // usable content height on pages 2+
  const totalH_px     = canvas.height

  // Build list of page start positions (in canvas pixels), then append totalH_px as sentinel
  const pageStarts = [0]
  let nextCut = pageH_px
  while (nextCut < totalH_px) {
    let cut = nextCut
    for (const row of rowBounds) {
      if (cut > row.top && cut < row.bottom) {
        cut = Math.floor(row.top)
        break
      }
    }
    pageStarts.push(cut)
    nextCut = cut + contH_px  // subsequent pages use the reduced content height
  }
  pageStarts.push(totalH_px)

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  for (let i = 0; i < pageStarts.length - 1; i++) {
    if (i > 0) pdf.addPage()

    const startPx  = pageStarts[i]
    const endPx    = pageStarts[i + 1]
    const sliceH   = endPx - startPx
    const sliceHmm = sliceH / pxPerMm
    const yMm      = i === 0 ? 0 : TOP_MARGIN_MM

    const slice = document.createElement('canvas')
    slice.width  = canvas.width
    slice.height = sliceH
    slice.getContext('2d').drawImage(
      canvas,
      0, startPx, canvas.width, sliceH,
      0, 0,       canvas.width, sliceH
    )

    pdf.addImage(slice.toDataURL('image/jpeg', 0.93), 'JPEG', 0, yMm, 210, sliceHmm)
  }

  const slug = titre.replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 40)
  pdf.save(`CR_${slug}_${date || 'sans-date'}.pdf`)
}
