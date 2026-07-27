/**
 * Calcul du solde de congés — Loi marocaine du travail (art. 231, 240, 245)
 * + circulaire CNSS juillet 2024.
 *
 * Règles :
 *  - Année d'embauche (partielle) : 1,5 jour par mois travaillé
 *  - Chaque 1er janvier suivant : +18 jours accordés automatiquement
 *  - Expiration : jours de l'année N annulés le 31 janvier de l'année N+2
 *  - Déduction : congés approuvés déduits en FIFO (plus anciens en premier)
 */

function monthsBetween(from, to) {
  const y = to.getFullYear() - from.getFullYear()
  const m = to.getMonth()   - from.getMonth()
  const d = to.getDate()    - from.getDate()
  return Math.max(0, y * 12 + m + (d > 0 ? d / 30 : 0))
}

export function computeCongesBalance(employe, demandesRH = []) {
  if (!employe?.dateEmbauche) return null

  const today = new Date()
  const hire  = new Date(employe.dateEmbauche + 'T00:00:00')
  if (isNaN(hire.getTime()) || hire > today) return null

  const hireYear    = hire.getFullYear()
  const currentYear = today.getFullYear()
  const todayStr    = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`

  // ── 1. Construire les crédits par année ──────────────────────────────────
  const yearEntries = []

  for (let y = hireYear; y <= currentYear; y++) {
    let days

    if (y === hireYear) {
      // Année d'embauche : proratisé au nombre de mois travaillés jusqu'au 31/12
      const yearEnd = y === currentYear
        ? today
        : new Date(y, 11, 31, 23, 59, 59)
      days = Math.min(18, Math.round(monthsBetween(hire, yearEnd) * 1.5 * 10) / 10)
    } else {
      // Années suivantes : 18 jours accordés le 1er janvier
      const grantDate = new Date(y, 0, 1)
      if (grantDate > today) break
      days = 18
    }

    if (days > 0) {
      yearEntries.push({
        year:        y,
        days,
        expiryDate:  `${y + 2}-01-31`,
        isPartial:   y === hireYear && y !== currentYear,
      })
    }
  }

  // ── 2. Jours utilisés (demandes approuvées) ──────────────────────────────
  const approvedLeave = (demandesRH || []).filter(d =>
    String(d.employeId) === String(employe.id) &&
    d.statut === 'approuve' &&
    ['conge', 'absence', 'arret_maladie'].includes(d.type)
  )

  let totalUsed = 0
  approvedLeave.forEach(d => {
    const d1 = d.dateDebut ? new Date(d.dateDebut + 'T00:00:00') : null
    const d2 = d.dateFin   ? new Date(d.dateFin   + 'T00:00:00') : d1
    if (!d1) return
    totalUsed += d.duree ?? Math.max(1, Math.round((d2 - d1) / 86400000) + 1)
  })

  // Absences saisies manuellement (exclure celles issues d'une demande = déjà comptées)
  ;(employe.conges?.history || [])
    .filter(c => !c.fromDemande)
    .forEach(c => {
      const d1 = c.debut ? new Date(c.debut + 'T00:00:00') : null
      const d2 = c.fin   ? new Date(c.fin   + 'T00:00:00') : d1
      if (!d1) return
      totalUsed += c.duree ?? Math.max(1, Math.round((d2 - d1) / 86400000) + 1)
    })

  // ── 3. Appliquer FIFO + expiration ───────────────────────────────────────
  let remainingUsed = totalUsed
  let totalExpired  = 0

  const enriched = yearEntries.map(entry => {
    const consumed  = Math.min(entry.days, remainingUsed)
    remainingUsed   = Math.max(0, remainingUsed - consumed)
    const leftDays  = entry.days - consumed
    const isExpired = entry.expiryDate < todayStr && leftDays > 0
    if (isExpired) totalExpired += leftDays

    const daysToExpiry = Math.round(
      (new Date(entry.expiryDate + 'T00:00:00') - today) / 86400000
    )
    return {
      ...entry,
      consumed,
      remaining:    isExpired ? 0 : leftDays,
      isExpired,
      expiringSoon: !isExpired && leftDays > 0 && daysToExpiry <= 120,
      daysToExpiry,
    }
  })

  const totalAccrued = yearEntries.reduce((s, e) => s + e.days, 0)
  const balance      = Math.max(0, totalAccrued - totalUsed - totalExpired)

  return {
    balance:        Math.round(balance        * 10) / 10,
    totalAccrued:   Math.round(totalAccrued   * 10) / 10,
    totalUsed:      Math.round(totalUsed      * 10) / 10,
    totalExpired:   Math.round(totalExpired   * 10) / 10,
    expiringSoon:   enriched.filter(e => e.expiringSoon),
    expiredEntries: enriched.filter(e => e.isExpired),
    entries:        enriched,
  }
}
