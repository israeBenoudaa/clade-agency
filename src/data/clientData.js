// Données mockées pour le portail client
// Côté client : un client voit SES projets et SES factures

export const clientProjects = [
  {
    id: 1,
    nom: 'Villa Contemporaine Anfa',
    type: 'Résidentiel haut de gamme',
    surface: '480 m²',
    phase: 'APD — Avant-Projet Détaillé',
    avancement: 78,
    statut: 'En cours',
    architecte: 'Yasmine Benali',
    debut: '15 Mars 2025',
    livraison: '12 Mars 2026',
    localisation: 'Casablanca, Anfa',
    description: 'Conception d\'une villa contemporaine de 480 m² sur deux niveaux avec piscine, jardin paysager et garage double.',
  },
]

export const clientPhases = [
  { nom: 'Esquisse (ESQ)', pourcentage: 100, statut: 'Terminé', date: '15 Avril 2025' },
  { nom: 'Avant-Projet Sommaire (APS)', pourcentage: 100, statut: 'Terminé', date: '28 Juin 2025' },
  { nom: 'Avant-Projet Détaillé (APD)', pourcentage: 78, statut: 'En cours', date: 'Estimé 20 Décembre 2025' },
  { nom: 'Études Projet (PRO)', pourcentage: 0, statut: 'À venir', date: 'Janvier 2026' },
  { nom: 'Dossier Consultation Entreprises (DCE)', pourcentage: 0, statut: 'À venir', date: 'Février 2026' },
  { nom: 'Suivi d\'Exécution (EXE)', pourcentage: 0, statut: 'À venir', date: 'Mars 2026' },
]

export const clientLivrables = [
  { nom: 'Esquisse — Plans d\'implantation', type: 'PDF', taille: '4.2 MB', date: '15 Avril 2025', url: '#' },
  { nom: 'Esquisse — Perspectives 3D extérieures', type: 'PDF', taille: '12.8 MB', date: '15 Avril 2025', url: '#' },
  { nom: 'APS — Plans niveaux RDC et R+1', type: 'PDF', taille: '6.4 MB', date: '28 Juin 2025', url: '#' },
  { nom: 'APS — Coupes et façades', type: 'PDF', taille: '5.1 MB', date: '28 Juin 2025', url: '#' },
  { nom: 'APS — Note descriptive', type: 'PDF', taille: '1.8 MB', date: '28 Juin 2025', url: '#' },
  { nom: 'APD — Plans détaillés (en cours)', type: 'DWG', taille: '24.6 MB', date: '15 Novembre 2025', url: '#' },
  { nom: 'Modèle BIM Revit (consultation)', type: 'RVT', taille: '187 MB', date: '15 Novembre 2025', url: '#' },
]

export const clientDepenses = [
  { categorie: 'Honoraires architecte', montant: 92500, total: 185000, statut: 'En cours' },
  { categorie: 'Études techniques (BET)', montant: 18000, total: 28000, statut: 'En cours' },
  { categorie: 'Permis de construire', montant: 4200, total: 4200, statut: 'Réglé' },
  { categorie: 'Géomètre', montant: 3500, total: 3500, statut: 'Réglé' },
  { categorie: 'Étude de sol', montant: 2800, total: 2800, statut: 'Réglé' },
]

export const clientFactures = [
  { num: 'FAC-2025-0089', date: '15 Avril 2025', libelle: 'Acompte 30% — Phase ESQ', montant: '€55,500', statut: 'Payée' },
  { num: 'FAC-2025-0115', date: '28 Juin 2025', libelle: 'Acompte phase APS', montant: '€37,000', statut: 'Payée' },
  { num: 'FAC-2025-0142', date: '15 Novembre 2025', libelle: 'Acompte phase APD', montant: '€32,500', statut: 'Payée' },
  { num: 'FAC-2026-0001', date: 'À venir Janvier 2026', libelle: 'Phase PRO — prévisionnel', montant: '€36,000', statut: 'Prévue' },
]

export const clientMessages = [
  {
    auteur: 'Yasmine Benali',
    poste: 'Architecte Associée',
    avatar: 'YB',
    date: 'Il y a 2 jours',
    message: 'Bonjour, j\'ai déposé les dernières mises à jour des plans APD dans vos livrables. N\'hésitez pas à me faire vos retours sur les choix de matériaux pour la façade.',
  },
  {
    auteur: 'Sophie Lambert',
    poste: 'Chef de Projet',
    avatar: 'SL',
    date: 'Il y a 1 semaine',
    message: 'Nous avons reçu l\'accord du permis de construire. Le projet peut continuer comme prévu. Je vous envoie le courrier officiel par email.',
  },
]
