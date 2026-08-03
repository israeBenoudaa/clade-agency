import { buildDocHeader, sectionHead, renderToPdf } from './pdfBase.js'

const fmtNow = () =>
  new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

const SB = "font-family:'Inter Tight',-apple-system,BlinkMacSystemFont,sans-serif;"
const AV = "font-family:'Averia Libre',Georgia,serif;"

function buildPortraitGrid(images, cols) {
  if (!images.length) return ''
  const rows = []
  for (let i = 0; i < images.length; i += cols) rows.push(images.slice(i, i + cols))
  return `
    <div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:10px;">
      ${rows.map(row => row.map(img => `
        <div style="border-radius:6px;overflow:hidden;border:0.5px solid #E0DBD3;">
          <img src="${img.dataUrl}" style="display:block;width:100%;aspect-ratio:9/16;object-fit:cover;" />
        </div>
      `).join('')).join('')}
    </div>`
}

function buildImgSection(title, color, images, cols, num) {
  if (!images.length) return ''
  const LABELS = { '#D97706': 'Aimées ★', '#059669': 'Retenues ✓', '#DC2626': 'Non retenues ✗' }
  return `
    <div style="margin-bottom:8px;">
      ${sectionHead(num, `${LABELS[color] || title} — ${images.length}`)}
      ${buildPortraitGrid(images, cols)}
    </div>`
}

export async function generateConceptPdf({ project, concept, response, download = true }) {
  const { images = [], questions = [] } = concept
  const { imageVotes = {}, questionAnswers = {} } = response

  const superImages   = images.filter(img => imageVotes[img.id] === 'superlike')
  const likeImages    = images.filter(img => imageVotes[img.id] === 'like')
  const dislikeImages = images.filter(img => imageVotes[img.id] === 'dislike')
  const clientNom     = project.client || '—'

  const statsBar = `
    <div style="${SB}display:flex;gap:0;background:#F8F5F0;border-bottom:0.5px solid #DDD8D0;padding:12px 48px;">
      ${[
        { label: 'Super aimées', value: superImages.length, color: '#D97706' },
        { label: 'Aimées', value: likeImages.length, color: '#059669' },
        { label: 'Non retenues', value: dislikeImages.length, color: '#DC2626' },
        ...(questions.length ? [{ label: 'Questions', value: questions.length, color: '#8B5CF6' }] : []),
      ].map((s, i) => `
        <div style="flex:1;${i > 0 ? 'border-left:0.5px solid #E0DBD3;padding-left:18px;' : ''}padding-right:18px;">
          <div style="font-size:7px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:#BAB5AE;margin-bottom:3px;">${s.label}</div>
          <div style="${AV}font-size:22px;font-weight:400;color:${s.color};line-height:1.1;">${s.value}</div>
        </div>`).join('')}
    </div>`

  const headerHTML = buildDocHeader({
    type: 'Rapport de concept',
    title: project.nom,
    ref: `Client : ${clientNom} · ${fmtNow()}`,
  }) + statsBar

  const qaSection = questions.length > 0 ? `
    ${sectionHead(4, 'Réponses au questionnaire')}
    <div style="display:flex;flex-direction:column;gap:10px;">
      ${questions.map((q, i) => `
        <div style="background:#F8F5F0;border-left:2px solid #C4AD8A;border-radius:0 5px 5px 0;padding:13px 16px;">
          <div style="font-size:7px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:#BAB5AE;margin-bottom:5px;">Question ${i + 1}</div>
          <div style="font-size:12.5px;font-weight:600;color:#0C0C0B;margin-bottom:6px;">${q.text}</div>
          <div style="font-size:12px;color:#3A3830;line-height:1.65;">${questionAnswers[q.id] || '<em style="color:#ABA79F;">Sans réponse</em>'}</div>
        </div>`).join('')}
    </div>` : ''

  const contentHTML = `
    <div style="${SB}background:#fff;padding:26px 48px 30px;">
      ${buildImgSection('Super aimées', '#D97706', superImages, 3, 1)}
      ${buildImgSection('Aimées', '#059669', likeImages, 3, 2)}
      ${buildImgSection('Non retenues', '#DC2626', dislikeImages, 4, 3)}
      ${qaSection}
    </div>`

  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;visibility:visible;z-index:-1;'
  container.innerHTML = contentHTML
  document.body.appendChild(container)
  await Promise.all(
    Array.from(container.querySelectorAll('img')).map(
      el => el.complete ? Promise.resolve() : new Promise(r => { el.onload = r; el.onerror = r })
    )
  )
  document.body.removeChild(container)

  const slug = project.nom.replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 40)
  if (download) {
    await renderToPdf({ headerHTML, contentHTML, filename: `Concept_${slug}.pdf` })
    return null
  }
  // For non-download calls, return a data URI via a temporary single-page render
  await renderToPdf({ headerHTML, contentHTML, filename: `Concept_${slug}.pdf` })
  return null
}
