/**
 * simulator-engine.js
 * Logique de calcul du TJH (taux horaire interne) depuis les charges réelles de l'agence.
 * Complètement isolé de React — aucun import de composants ou de hooks.
 */

// ── Annualise un montant selon la périodicité ──────────────────────────────
function annualiser(montant, periodicite) {
  const m = Number(montant) || 0
  switch (periodicite) {
    case 'hebdomadaire': return m * 52
    case 'mensuel':      return m * 12
    case 'trimestriel':  return m * 4
    case 'annuel':       return m
    default:             return m * 12 // traitement mensuel par défaut
  }
}

/**
 * Calcule le TJH (taux horaire interne) depuis les charges réelles de l'agence.
 *
 * Formule :
 *   TJH = total_charges_annuelles / (nb_collaborateurs × heures_par_an)
 *
 * Entrées :
 *   chargesFixe    — charges fixes manuelles (libellé, montant, périodicité, catégorie)
 *   employes       — liste des employés (statut, salaireBrut, nom, poste)
 *   agenceSettings — { nbCollaborateurs: number, heuresParAn: number }
 *
 * Retourne :
 *   tjh                    — taux horaire calculé (MAD/h), 0 si données insuffisantes
 *   totalChargesAnnuelles  — somme totale des charges annualisées (MAD)
 *   salaireAnnuel          — part salaires dans le total
 *   chargesAnnuelles       — part charges fixes dans le total
 *   totalHeuresProductives — nb_collaborateurs × heures_par_an
 *   nbCollaborateurs       — paramètre agence utilisé
 *   heuresParAn            — paramètre agence utilisé
 *   hasData                — true si les données permettent un calcul fiable
 *   breakdown              — détail ligne par ligne pour affichage
 */
export function computeTJH({ chargesFixe = [], employes = [], agenceSettings = {} }) {
  const nbCollaborateurs = Number(agenceSettings.nbCollaborateurs) || 0
  const heuresParAn      = Number(agenceSettings.heuresParAn)      || 1500

  // 1. Salaires annuels des employés actifs avec salaire renseigné
  const employesActifs = employes.filter(
    e => e.statut === 'actif' && Number(e.salaireBrut || 0) > 0
  )
  const salaireAnnuel = employesActifs.reduce(
    (s, e) => s + Number(e.salaireBrut) * 12,
    0
  )

  // 2. Charges fixes annualisées
  const chargesAnnuelles = chargesFixe.reduce(
    (s, c) => s + annualiser(c.montant, c.periodicite),
    0
  )

  // 3. Totaux
  const totalChargesAnnuelles  = salaireAnnuel + chargesAnnuelles
  const totalHeuresProductives = nbCollaborateurs * heuresParAn

  // 4. TJH — protégé contre la division par zéro
  const tjh = totalHeuresProductives > 0
    ? Math.round(totalChargesAnnuelles / totalHeuresProductives)
    : 0

  // 5. Données suffisantes = au moins des charges ET des heures configurées
  const hasData = totalChargesAnnuelles > 0 && totalHeuresProductives > 0

  // 6. Détail pour le panneau "Voir le détail du calcul"
  const breakdown = {
    salaires: employesActifs.map(e => ({
      libelle:       e.nom,
      poste:         e.poste || '',
      montantAnnuel: Number(e.salaireBrut) * 12,
    })),
    charges: chargesFixe.map(c => ({
      libelle:       c.libelle,
      categorie:     c.categorie || '',
      periodicite:   c.periodicite,
      montantAnnuel: annualiser(c.montant, c.periodicite),
    })),
  }

  return {
    tjh,
    totalChargesAnnuelles,
    salaireAnnuel,
    chargesAnnuelles,
    totalHeuresProductives,
    nbCollaborateurs,
    heuresParAn,
    hasData,
    breakdown,
  }
}

/**
 * Calcule le prix d'honoraires à partir des paramètres du simulateur.
 * Isolé ici pour pouvoir être réutilisé hors composant React si besoin.
 *
 * Formule : Heures × TJH × Risque × (1 + Marge)
 */
export function calcSimulateur({ surface, typeProjet, complexite, risque, tjh, marge, coutM2 }) {
  const tp   = parseFloat(typeProjet)  || 1
  const cx   = parseFloat(complexite)  || 1
  const ri   = parseFloat(risque)      || 1
  const h    = parseFloat(tjh)         || 0
  const mg   = (parseFloat(marge) || 0) / 100
  const cout = parseFloat(coutM2)      || 0
  const surf = parseFloat(surface)     || 0

  const heures = Math.round(surf * tp * cx)
  const jours  = Math.round(heures / 8)
  const coutInterne = Math.round(heures * h)
  const prix   = Math.round(coutInterne * ri * (1 + mg))
  const travaux = surf * cout
  const ratio  = travaux > 0 ? (prix / travaux) * 100 : 0

  // Barème ordinal selon type de projet
  let bareme = { min: 8, max: 12, label: '8–12%' }
  if (tp === 0.4) bareme = { min: 6, max: 9,  label: '6–9%' }
  else if (tp === 0.5) bareme = { min: 5, max: 8,  label: '5–8%' }
  else if (tp === 0.9) bareme = { min: 7, max: 10, label: '7–10%' }
  else if (tp === 1.5) bareme = { min: 10, max: 15, label: '10–15%' }

  const prixSuggereMin = Math.round(travaux * (bareme.min + 1) / 100)
  const prixSuggereMax = Math.round(travaux * bareme.max / 100)

  let alerte = null
  if (ratio < bareme.min) {
    alerte = {
      type: 'warning',
      msg: `Ratio sous le barème ordinal — vous pouvez facturer plus sans perdre le marché. Suggéré : ${prixSuggereMin.toLocaleString('fr-FR')} MAD (${bareme.min + 1}%)`,
    }
  } else if (ratio > bareme.max) {
    alerte = {
      type: 'danger',
      msg: `Ratio au-dessus du marché — risque de perdre l'appel d'offres. Suggéré : ${prixSuggereMax.toLocaleString('fr-FR')} MAD (${bareme.max}%)`,
    }
  } else {
    alerte = {
      type: 'success',
      msg: 'Prix dans la fourchette du marché — bon positionnement, marge garantie.',
    }
  }

  return { heures, jours, coutInterne, prix, ratio, bareme, alerte }
}
