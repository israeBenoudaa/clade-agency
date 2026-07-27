const HEADER_STYLE = 'background:#0A1E3F;color:white;font-weight:bold;padding:8px 10px;border:1px solid #1e3a6e;font-size:12px;'
const CAT_STYLE = 'background:#C5D3E8;color:#0A1E3F;font-weight:bold;padding:8px 10px;border:1px solid #b0c0d8;font-size:12px;vertical-align:middle;'
const CELL_STYLE = 'padding:7px 10px;border:1px solid #E5E7EB;font-size:12px;'
const NUM_STYLE = 'padding:7px 10px;border:1px solid #E5E7EB;font-size:12px;text-align:right;'
const SUB_STYLE = 'background:#F3F4F6;font-weight:600;padding:7px 10px;border:1px solid #E5E7EB;font-size:12px;'
const SUBN_STYLE = 'background:#F3F4F6;font-weight:600;padding:7px 10px;border:1px solid #E5E7EB;font-size:12px;text-align:right;'
const TOT_STYLE = 'background:#0A1E3F;color:white;font-weight:bold;padding:8px 10px;border:1px solid #1e3a6e;font-size:12px;'
const TOTN_STYLE = 'background:#0A1E3F;color:white;font-weight:bold;padding:8px 10px;border:1px solid #1e3a6e;font-size:12px;text-align:right;'

function download(html, filename) {
  const full = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="UTF-8"></head><body>${html}</body></html>`
  const blob = new Blob([full], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click()
  document.body.removeChild(a); URL.revokeObjectURL(url)
}

export function exportProgrammeExcel(programme, projectName) {
  const headers = ['Catégorie', 'Programme', 'Unité', 'Quantité', 'Superficie unit. (m²)', 'Superficie totale (m²)']
  let rows = ''

  for (const group of (programme.groupes || [])) {
    const items = group.items || []
    const count = items.length
    items.forEach((item, idx) => {
      const st = (Number(item.quantite) || 0) * (Number(item.superficieUnitaire) || 0)
      rows += `<tr>
        ${idx === 0 ? `<td rowspan="${count}" style="${CAT_STYLE}">${group.nom}</td>` : ''}
        <td style="${CELL_STYLE}">${item.programme || ''}</td>
        <td style="${CELL_STYLE}">${item.unite || ''}</td>
        <td style="${NUM_STYLE}">${item.quantite ?? ''}</td>
        <td style="${NUM_STYLE}">${item.superficieUnitaire ?? ''}</td>
        <td style="${NUM_STYLE}">${st || ''}</td>
      </tr>`
    })
    const sub = items.reduce((s, i) => s + (Number(i.quantite)||0)*(Number(i.superficieUnitaire)||0), 0)
    rows += `<tr>
      <td colspan="5" style="${SUB_STYLE}">Sous-total — ${group.nom}</td>
      <td style="${SUBN_STYLE}">${sub}</td>
    </tr>`
  }

  const grand = (programme.groupes || []).flatMap(g => g.items || [])
    .reduce((s, i) => s + (Number(i.quantite)||0)*(Number(i.superficieUnitaire)||0), 0)
  rows += `<tr>
    <td colspan="5" style="${TOT_STYLE}">SUPERFICIE TOTALE GLOBALE</td>
    <td style="${TOTN_STYLE}">${grand} m²</td>
  </tr>`

  const table = `<table border="1" cellspacing="0" style="border-collapse:collapse;font-family:Arial;width:100%;">
    <thead><tr>${headers.map(h => `<th style="${HEADER_STYLE}">${h}</th>`).join('')}</tr></thead>
    <tbody>${rows}</tbody>
  </table>`

  download(table, `Programme_${projectName.replace(/[^a-z0-9]/gi,'_')}.xls`)
}

export function exportEstimationExcel(estimation, projectName) {
  const headers = ['Catégorie', 'Programme', 'Unité', 'Quantité', 'Superficie unit. (m²)', 'Superficie totale (m²)', 'Prix estim. (DH/m²)', 'Prix total (DH)']
  let rows = ''

  for (const group of (estimation.groupes || [])) {
    const items = group.items || []
    const count = items.length
    items.forEach((item, idx) => {
      const st = (Number(item.quantite)||0) * (Number(item.superficieUnitaire)||0)
      const pt = st * (Number(item.prixEstimation)||0)
      rows += `<tr>
        ${idx === 0 ? `<td rowspan="${count}" style="${CAT_STYLE}">${group.nom}</td>` : ''}
        <td style="${CELL_STYLE}">${item.programme || ''}</td>
        <td style="${CELL_STYLE}">${item.unite || ''}</td>
        <td style="${NUM_STYLE}">${item.quantite ?? ''}</td>
        <td style="${NUM_STYLE}">${item.superficieUnitaire ?? ''}</td>
        <td style="${NUM_STYLE}">${st || ''}</td>
        <td style="${NUM_STYLE}">${item.prixEstimation ? Number(item.prixEstimation).toLocaleString('fr-FR') : ''}</td>
        <td style="${NUM_STYLE}">${pt ? Number(pt).toLocaleString('fr-FR') : ''}</td>
      </tr>`
    })
    const subSt = items.reduce((s, i) => s + (Number(i.quantite)||0)*(Number(i.superficieUnitaire)||0), 0)
    const subPt = items.reduce((s, i) => {
      const st2 = (Number(i.quantite)||0)*(Number(i.superficieUnitaire)||0)
      return s + st2 * (Number(i.prixEstimation)||0)
    }, 0)
    rows += `<tr>
      <td colspan="5" style="${SUB_STYLE}">Sous-total — ${group.nom}</td>
      <td style="${SUBN_STYLE}">${subSt} m²</td>
      <td style="${SUB_STYLE}"></td>
      <td style="${SUBN_STYLE}">${Number(subPt).toLocaleString('fr-FR')} DH</td>
    </tr>`
  }

  const allItems = (estimation.groupes || []).flatMap(g => g.items || [])
  const grandSt = allItems.reduce((s, i) => s + (Number(i.quantite)||0)*(Number(i.superficieUnitaire)||0), 0)
  const grandPt = allItems.reduce((s, i) => {
    const st = (Number(i.quantite)||0)*(Number(i.superficieUnitaire)||0)
    return s + st * (Number(i.prixEstimation)||0)
  }, 0)
  rows += `<tr>
    <td colspan="5" style="${TOT_STYLE}">TOTAL GÉNÉRAL</td>
    <td style="${TOTN_STYLE}">${grandSt} m²</td>
    <td style="${TOT_STYLE}"></td>
    <td style="${TOTN_STYLE}">${Number(grandPt).toLocaleString('fr-FR')} DH</td>
  </tr>`

  const table = `<table border="1" cellspacing="0" style="border-collapse:collapse;font-family:Arial;width:100%;">
    <thead><tr>${headers.map(h => `<th style="${HEADER_STYLE}">${h}</th>`).join('')}</tr></thead>
    <tbody>${rows}</tbody>
  </table>`

  download(table, `Estimation_${projectName.replace(/[^a-z0-9]/gi,'_')}.xls`)
}
