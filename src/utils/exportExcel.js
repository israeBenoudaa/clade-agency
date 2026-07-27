const PCM = {
  Honoraires: '70611', Acompte: '70611', Remboursement: '70811', Subvention: '74811',
  Logiciels: '61430', Fournitures: '61261', Déplacements: '61351',
  Formation: '61621', Loyer: '61321', Salaires: '66111', 'Sous-traitance': '61231', Autre: '—',
}

const fmtMAD = (n) =>
  Number(n || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MAD'

const now = () => new Date().toLocaleDateString('fr-FR')

function downloadBlob(html, filename) {
  const blob = new Blob(['﻿' + html], { type: 'application/vnd.ms-excel;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const HEADER_DARK = 'background:#0A1E3F;color:white;padding:11px 16px;font-size:11px;font-weight:700;text-align:left;border:1px solid #1a3a6f;'
const CELL = (bg = '#fff') => `background:${bg};padding:9px 14px;border:1px solid #E5E7EB;font-size:11px;color:#1F2937;`

export function exportProjectFinancesExcel({ project, missions }) {
  const hon = project.finances?.honoraires ?? {}
  const pai = project.finances?.paiements ?? {}
  const STATUT = { paye: 'Payé', en_cours: 'En attente', non_paye: 'Non payé' }
  const SBGC = {
    paye: ['#D1FAE5', '#065F46'],
    en_cours: ['#FEF9C3', '#92400E'],
    non_paye: ['#FEE2E2', '#991B1B'],
  }

  const totalHT = missions.reduce((s, m) => s + (hon[m.id] || 0), 0)
  const totalTVA = totalHT * 0.2
  const totalTTC = totalHT * 1.2
  const paidHT = missions.reduce((s, m) => pai[m.id] === 'paye' ? s + (hon[m.id] || 0) : s, 0)
  const remainHT = totalHT - paidHT

  const rows = missions.map((m, i) => {
    const ht = hon[m.id] || 0
    const tva = ht * 0.2
    const st = pai[m.id] || 'non_paye'
    const [sbg, sc] = SBGC[st] || SBGC.non_paye
    const rowBg = i % 2 === 0 ? '#FFFFFF' : '#F9FAFB'
    return `<tr>
      <td style="${CELL(rowBg)}">${m.nom}</td>
      <td style="${CELL(rowBg)}text-align:right;font-weight:600;">${fmtMAD(ht)}</td>
      <td style="${CELL(rowBg)}text-align:right;color:#6B7280;">${fmtMAD(tva)}</td>
      <td style="${CELL(rowBg)}text-align:right;font-weight:700;">${fmtMAD(ht + tva)}</td>
      <td style="background:${sbg};color:${sc};padding:9px 14px;border:1px solid #E5E7EB;font-size:11px;font-weight:700;text-align:center;">${STATUT[st]}</td>
    </tr>`
  }).join('')

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
  <head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets>
    <x:ExcelWorksheet><x:Name>Honoraires</x:Name></x:ExcelWorksheet>
  </x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
  <body><table style="font-family:Calibri,Arial,sans-serif;border-collapse:collapse;width:100%;">
    <tr><td colspan="5" style="background:#0A1E3F;color:white;font-size:18px;font-weight:700;padding:16px 20px;letter-spacing:2px;">CLADE Architecture</td></tr>
    <tr><td colspan="5" style="background:#0A1E3F;color:rgba(255,255,255,0.5);font-size:10px;padding:3px 20px 14px;">Tableau des honoraires — Document confidentiel</td></tr>
    <tr><td colspan="5" style="background:#1a3a6f;color:white;font-size:13px;font-weight:600;padding:11px 20px;">${project.nom} · Client : ${project.client}</td></tr>
    <tr><td colspan="5" style="background:#1a3a6f;color:rgba(255,255,255,0.65);font-size:10px;padding:3px 20px 11px;">Généré le ${now()}</td></tr>
    <tr><td colspan="5" style="height:10px;background:#F9FAFB;"></td></tr>
    <tr>
      <th style="${HEADER_DARK}width:38%;">Mission</th>
      <th style="${HEADER_DARK}width:17%;text-align:right;">Honoraire HT</th>
      <th style="${HEADER_DARK}width:17%;text-align:right;">TVA 20%</th>
      <th style="${HEADER_DARK}width:17%;text-align:right;">Total TTC</th>
      <th style="${HEADER_DARK}width:11%;text-align:center;">Statut</th>
    </tr>
    ${rows}
    <tr><td colspan="5" style="height:10px;background:#F9FAFB;"></td></tr>
    <tr>
      <td style="${CELL('#F4F3EF')}font-weight:700;color:#0A1E3F;">Total HT</td>
      <td style="${CELL('#F4F3EF')}text-align:right;font-weight:800;color:#0A1E3F;">${fmtMAD(totalHT)}</td>
      <td style="${CELL('#F4F3EF')}text-align:right;font-weight:700;color:#0A1E3F;">${fmtMAD(totalTVA)}</td>
      <td style="${CELL('#F4F3EF')}text-align:right;font-weight:800;color:#0A1E3F;">${fmtMAD(totalTTC)}</td>
      <td style="${CELL('#F4F3EF')}"></td>
    </tr>
    <tr>
      <td style="background:#0A1E3F;color:white;padding:12px 16px;font-weight:700;font-size:12px;">Total TTC</td>
      <td colspan="3" style="background:#0A1E3F;color:#06B6D4;padding:12px 16px;text-align:right;font-weight:800;font-size:14px;">${fmtMAD(totalTTC)}</td>
      <td style="background:#0A1E3F;"></td>
    </tr>
    <tr>
      <td style="background:#1a3a6f;color:rgba(255,255,255,0.8);padding:9px 16px;font-size:11px;">Encaissé TTC</td>
      <td colspan="3" style="background:#1a3a6f;color:#34D399;padding:9px 16px;text-align:right;font-weight:700;font-size:12px;">${fmtMAD(paidHT * 1.2)}</td>
      <td style="background:#1a3a6f;"></td>
    </tr>
    <tr>
      <td style="background:#1a3a6f;color:rgba(255,255,255,0.8);padding:9px 16px;font-size:11px;">Restant dû TTC</td>
      <td colspan="3" style="background:#1a3a6f;color:#FBBF24;padding:9px 16px;text-align:right;font-weight:700;font-size:12px;">${fmtMAD(remainHT * 1.2)}</td>
      <td style="background:#1a3a6f;"></td>
    </tr>
    <tr><td colspan="5" style="height:12px;"></td></tr>
    <tr><td colspan="5" style="padding:9px 16px;background:#F9FAFB;color:#9CA3AF;font-size:9px;font-style:italic;">CLADE Architecture — Document confidentiel · ${now()}</td></tr>
  </table></body></html>`

  downloadBlob(html, `CLADE_Honoraires_${project.nom.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0, 10)}.xls`)
}

export function exportTransactionsExcel(transactions) {
  const entrees = transactions.filter(t => t.type === 'entree')
  const sorties = transactions.filter(t => t.type === 'sortie')
  const totalE = entrees.reduce((s, t) => s + (t.montant || 0), 0)
  const totalS = sorties.reduce((s, t) => s + (t.montant || 0), 0)
  const balance = totalE - totalS

  const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date))

  const rows = sorted.map(t => {
    const isE = t.type === 'entree'
    const bg = isE ? '#F0FDF4' : '#FFF1F2'
    const color = isE ? '#065F46' : '#991B1B'
    const pcm = PCM[t.categorie] || '—'
    return `<tr>
      <td style="${CELL(bg)}">${t.date}</td>
      <td style="${CELL(bg)}font-size:10px;color:#6B7280;">${pcm}</td>
      <td style="${CELL(bg)}">${t.libelle}</td>
      <td style="${CELL(bg)}">${t.categorie || '—'}</td>
      <td style="background:${bg};padding:9px 14px;border:1px solid #E5E7EB;font-size:11px;font-weight:700;color:${color};text-align:right;">${isE ? '+' : '-'}${fmtMAD(t.montant)}</td>
    </tr>`
  }).join('')

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
  <head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets>
    <x:ExcelWorksheet><x:Name>Bilan</x:Name></x:ExcelWorksheet>
  </x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
  <body><table style="font-family:Calibri,Arial,sans-serif;border-collapse:collapse;width:100%;">
    <tr><td colspan="5" style="background:#0A1E3F;color:white;font-size:18px;font-weight:700;padding:16px 20px;letter-spacing:2px;">CLADE Architecture</td></tr>
    <tr><td colspan="5" style="background:#0A1E3F;color:rgba(255,255,255,0.5);font-size:10px;padding:3px 20px 14px;">Plan Comptable Marocain — Exercice ${new Date().getFullYear()}</td></tr>
    <tr><td colspan="5" style="background:#1a3a6f;color:white;font-size:13px;font-weight:600;padding:11px 20px;">Journal de trésorerie — Bilan comptable</td></tr>
    <tr><td colspan="5" style="background:#1a3a6f;color:rgba(255,255,255,0.65);font-size:10px;padding:3px 20px 11px;">Généré le ${now()}</td></tr>
    <tr><td colspan="5" style="height:10px;background:#F9FAFB;"></td></tr>
    <tr>
      <td style="${CELL('#D1FAE5')}font-weight:700;color:#065F46;">Total Produits (Cl. 7)</td>
      <td colspan="3" style="${CELL('#D1FAE5')}"></td>
      <td style="${CELL('#D1FAE5')}text-align:right;font-weight:800;color:#065F46;">+${fmtMAD(totalE)}</td>
    </tr>
    <tr>
      <td style="${CELL('#FEE2E2')}font-weight:700;color:#991B1B;">Total Charges (Cl. 6)</td>
      <td colspan="3" style="${CELL('#FEE2E2')}"></td>
      <td style="${CELL('#FEE2E2')}text-align:right;font-weight:800;color:#991B1B;">-${fmtMAD(totalS)}</td>
    </tr>
    <tr>
      <td style="background:#0A1E3F;color:white;padding:11px 16px;font-size:12px;font-weight:700;">Résultat net</td>
      <td colspan="3" style="background:#0A1E3F;"></td>
      <td style="background:#0A1E3F;color:${balance >= 0 ? '#34D399' : '#F87171'};padding:11px 16px;text-align:right;font-size:13px;font-weight:800;">${balance >= 0 ? '+' : ''}${fmtMAD(balance)}</td>
    </tr>
    <tr><td colspan="5" style="height:12px;background:#F9FAFB;"></td></tr>
    <tr>
      <th style="${HEADER_DARK}width:12%;">Date</th>
      <th style="${HEADER_DARK}width:10%;">N° PCM</th>
      <th style="${HEADER_DARK}width:42%;">Libellé</th>
      <th style="${HEADER_DARK}width:18%;">Catégorie</th>
      <th style="${HEADER_DARK}width:18%;text-align:right;">Montant</th>
    </tr>
    ${rows}
    <tr><td colspan="5" style="height:12px;"></td></tr>
    <tr><td colspan="5" style="padding:9px 16px;background:#F9FAFB;color:#9CA3AF;font-size:9px;font-style:italic;">CLADE Architecture — Document confidentiel · ${now()}</td></tr>
  </table></body></html>`

  downloadBlob(html, `CLADE_Bilan_${new Date().getFullYear()}_${new Date().toISOString().slice(0, 10)}.xls`)
}
