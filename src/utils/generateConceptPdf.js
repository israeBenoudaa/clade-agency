import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

const fmtNow = () =>
  new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

function buildPortraitGrid(images, cols) {
  if (!images.length) return ''
  const rows = []
  for (let i = 0; i < images.length; i += cols) rows.push(images.slice(i, i + cols))
  const gap = 12
  const colStyle = `repeat(${cols},1fr)`
  return `
    <div style="display:grid;grid-template-columns:${colStyle};gap:${gap}px;">
      ${rows.map(row => row.map(img => `
        <div style="border-radius:10px;overflow:hidden;border:1.5px solid #E5E7EB;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <img src="${img.dataUrl}" style="display:block;width:100%;aspect-ratio:9/16;object-fit:cover;" />
        </div>
      `).join('')).join('')}
    </div>`
}

function buildSection({ title, color, emoji, images, cols }) {
  if (!images.length) return ''
  return `
    <div style="padding:28px 48px 0;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
        <div style="width:4px;height:20px;background:${color};border-radius:2px;flex-shrink:0;"></div>
        <div style="font-size:10px;color:${color};font-weight:700;letter-spacing:2.5px;text-transform:uppercase;">${emoji} ${title} — ${images.length}</div>
      </div>
      ${buildPortraitGrid(images, cols)}
    </div>`
}

function buildTemplate({ projectNom, clientNom, superImages, likeImages, dislikeImages, questions, answers }) {
  const now = fmtNow()
  const qaSection = questions.length > 0 ? `
    <div style="padding:28px 48px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
        <div style="width:4px;height:20px;background:#8B5CF6;border-radius:2px;flex-shrink:0;"></div>
        <div style="font-size:10px;color:#8B5CF6;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;">💬 Réponses au questionnaire</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px;">
        ${questions.map((q, i) => `
          <div style="background:#FAFAF8;border:1px solid #E5E7EB;border-left:3px solid #8B5CF6;border-radius:8px;padding:16px 20px;">
            <div style="font-size:9px;color:#6B7280;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;margin-bottom:6px;">Question ${i + 1}</div>
            <div style="font-size:13px;font-weight:600;color:#0A1E3F;margin-bottom:8px;">${q.text}</div>
            <div style="font-size:13px;color:#374151;line-height:1.6;">${answers[q.id] || '<span style="color:#9CA3AF;font-style:italic;">Sans réponse</span>'}</div>
          </div>
        `).join('')}
      </div>
    </div>` : ''

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
            <div style="color:rgba(255,255,255,0.45);font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:10px;">Rapport de Concept</div>
            <div style="color:white;font-size:26px;font-weight:800;line-height:1.25;max-width:420px;">${projectNom}</div>
          </div>
          <div style="flex-shrink:0;">
            <div style="background:rgba(59,123,246,0.12);border:1px solid rgba(59,123,246,0.25);border-radius:12px;padding:16px 20px;text-align:right;min-width:140px;">
              <div style="color:rgba(255,255,255,0.4);font-size:8px;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">Client</div>
              <div style="color:white;font-size:13px;font-weight:700;word-break:break-word;">${clientNom || 'CLADE'}</div>
              <div style="color:rgba(255,255,255,0.4);font-size:8px;letter-spacing:2px;text-transform:uppercase;margin:10px 0 4px;">Généré le</div>
              <div style="color:rgba(255,255,255,0.7);font-size:11px;">${now}</div>
            </div>
          </div>
        </div>
      </div>

      <div style="background:#F4F3EF;padding:16px 48px;display:flex;gap:36px;border-bottom:1px solid #E5E7EB;">
        <div>
          <div style="font-size:8px;color:#6B7280;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">⭐ Super aimées</div>
          <div style="font-size:26px;color:#D97706;font-weight:800;margin-top:2px;">${superImages.length}</div>
        </div>
        <div>
          <div style="font-size:8px;color:#6B7280;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">👍 Aimées</div>
          <div style="font-size:26px;color:#059669;font-weight:800;margin-top:2px;">${likeImages.length}</div>
        </div>
        <div>
          <div style="font-size:8px;color:#6B7280;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">👎 Non retenues</div>
          <div style="font-size:26px;color:#DC2626;font-weight:800;margin-top:2px;">${dislikeImages.length}</div>
        </div>
        ${questions.length > 0 ? `
        <div>
          <div style="font-size:8px;color:#6B7280;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">💬 Questions</div>
          <div style="font-size:26px;color:#8B5CF6;font-weight:800;margin-top:2px;">${questions.length}</div>
        </div>` : ''}
      </div>

      ${buildSection({ title: 'Super aimées', color: '#D97706', emoji: '⭐', images: superImages, cols: 3 })}
      ${buildSection({ title: 'Aimées', color: '#059669', emoji: '👍', images: likeImages, cols: 3 })}
      ${buildSection({ title: 'Non retenues', color: '#DC2626', emoji: '👎', images: dislikeImages, cols: 4 })}
      ${qaSection}

      <div style="height:24px;"></div>

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

export async function generateConceptPdf({ project, concept, response, download = true }) {
  const { images = [], questions = [] } = concept
  const { imageVotes = {}, questionAnswers = {} } = response

  const superImages  = images.filter(img => imageVotes[img.id] === 'superlike')
  const likeImages   = images.filter(img => imageVotes[img.id] === 'like')
  const dislikeImages = images.filter(img => imageVotes[img.id] === 'dislike')

  const clientNom = project.client || ''

  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;visibility:visible;z-index:-1;'
  container.innerHTML = buildTemplate({ projectNom: project.nom, clientNom, superImages, likeImages, dislikeImages, questions, answers: questionAnswers })
  document.body.appendChild(container)

  await Promise.all(
    Array.from(container.querySelectorAll('img')).map(
      el => el.complete ? Promise.resolve() : new Promise(r => { el.onload = r; el.onerror = r })
    )
  )
  await new Promise(r => setTimeout(r, 120))

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

  const TOP_MARGIN_MM = 14
  const pxPerMm   = canvas.width / 210
  const pageH_px  = Math.round(297 * pxPerMm)
  const contH_px  = Math.round((297 - TOP_MARGIN_MM) * pxPerMm)
  const totalH_px = canvas.height

  const pageStarts = [0]
  let nextCut = pageH_px
  while (nextCut < totalH_px) {
    pageStarts.push(nextCut)
    nextCut += contH_px
  }
  pageStarts.push(totalH_px)

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  for (let i = 0; i < pageStarts.length - 1; i++) {
    if (i > 0) pdf.addPage()
    const startPx = pageStarts[i]
    const endPx   = pageStarts[i + 1]
    const sliceH  = endPx - startPx
    const yMm     = i === 0 ? 0 : TOP_MARGIN_MM

    const slice = document.createElement('canvas')
    slice.width  = canvas.width
    slice.height = sliceH
    slice.getContext('2d').drawImage(canvas, 0, startPx, canvas.width, sliceH, 0, 0, canvas.width, sliceH)
    pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', 0, yMm, 210, sliceH / pxPerMm)
  }

  const slug = project.nom.replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 40)
  if (download) {
    pdf.save(`Concept_${slug}.pdf`)
  }
  return pdf.output('datauristring')
}
