import { buildDocHeader, sectionHead, renderToPdf } from './pdfBase.js'

const fmtDateLong = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—'

const SB = "font-family:'Inter Tight',-apple-system,BlinkMacSystemFont,sans-serif;"

function cropSquare(src, outputPx = 700) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const side = Math.min(img.naturalWidth, img.naturalHeight)
      const sx = (img.naturalWidth - side) / 2
      const sy = (img.naturalHeight - side) / 2
      const canvas = document.createElement('canvas')
      canvas.width = outputPx
      canvas.height = outputPx
      canvas.getContext('2d').drawImage(img, sx, sy, side, side, 0, 0, outputPx, outputPx)
      resolve(canvas.toDataURL('image/jpeg', 0.93))
    }
    img.onerror = () => resolve(src)
    img.src = src
  })
}

function buildImagesRows(processedImages) {
  if (!processedImages.length) return ''
  const rows = []
  for (let i = 0; i < processedImages.length; i += 2) rows.push(processedImages.slice(i, i + 2))
  return rows.map(row => `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
      ${row.map((img, ci) => `
        <div style="border-radius:6px;overflow:hidden;border:0.5px solid #E0DBD3;">
          <img src="${img.squareSrc}" style="display:block;width:100%;height:auto;" />
          <div style="${SB}background:#F8F5F0;padding:8px 12px;border-top:0.5px solid #E0DBD3;">
            ${img.caption
              ? `<span style="font-size:10.5px;color:#6B6760;font-style:italic;">${img.caption}</span>`
              : `<span style="font-size:8px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:#BAB5AE;">Photo ${ci + 1}</span>`
            }
          </div>
        </div>`).join('')}
    </div>`).join('')
}

export async function generateCompteRenduPdf({ rdv, compteRendu, projectNom }) {
  const titre       = rdv.nom      ?? ''
  const date        = rdv.date     ?? ''
  const participants = rdv.personnes ?? ''
  const { contenu = '', images = [] } = compteRendu

  const processedImages = await Promise.all(
    images.map(async (img) => {
      const src     = typeof img === 'string' ? img : img.src
      const caption = typeof img === 'string' ? '' : (img.caption || '')
      return { squareSrc: await cropSquare(src, 700), caption }
    })
  )

  const headerHTML = buildDocHeader({
    type: 'Compte rendu de réunion',
    title: titre,
    ref: projectNom ? `Projet : ${projectNom}` : '',
    meta: [
      { label: 'Date', value: fmtDateLong(date) },
      ...(participants ? [{ label: 'Participants', value: participants }] : []),
    ],
  })

  const hasContent = contenu && contenu.trim() !== '' && contenu !== '<p></p>'
  const imagesSection = processedImages.length ? `
    ${sectionHead(2, `Documents & Photos — ${processedImages.length}`)}
    ${buildImagesRows(processedImages)}` : ''

  const contentHTML = `
    <div style="${SB}background:#fff;padding:26px 48px 30px;">
      ${sectionHead(1, 'Contenu de la réunion')}
      <div style="background:#F8F5F0;border-left:2px solid #C4AD8A;border-radius:0 5px 5px 0;padding:16px 20px;min-height:60px;">
        ${hasContent
          ? `<style>
              .cr p{font-size:12.5px;line-height:1.8;color:#3A3830;margin:0 0 8px;}
              .cr p:last-child{margin-bottom:0;}
              .cr strong{font-weight:700;color:#0C0C0B;}
              .cr h2{font-size:16px;font-weight:700;color:#0C0C0B;margin:16px 0 7px;}
              .cr h3{font-size:13.5px;font-weight:600;color:#1A1816;margin:12px 0 5px;}
              .cr ul,.cr ol{margin:6px 0 8px;padding-left:20px;}
              .cr li{font-size:12.5px;line-height:1.75;color:#3A3830;margin-bottom:2px;}
            </style>
            <div class="cr">${contenu}</div>`
          : '<span style="color:#ABA79F;font-style:italic;font-size:12px;">Aucun contenu renseigné.</span>'
        }
      </div>
      ${imagesSection}
    </div>`

  const slug = titre.replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 40)
  await renderToPdf({ headerHTML, contentHTML, filename: `CR_${slug}_${date || 'sans-date'}.pdf` })
}
