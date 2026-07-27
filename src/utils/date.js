// Shared date formatting — all dates displayed as DD/MM/YYYY
export const fmtDate = (d) =>
  d ? new Date(typeof d === 'string' && d.length === 10 ? d + 'T00:00:00' : d)
        .toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—'

export const fmtShort = (d) =>
  d ? new Date(typeof d === 'string' && d.length === 10 ? d + 'T00:00:00' : d)
        .toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
    : '—'

export const fmtDateTime = (d) => {
  if (!d) return '—'
  const dt = new Date(d)
  return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
