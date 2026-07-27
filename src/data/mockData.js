// Données mockées adaptées au métier d'agence d'architecture
// À remplacer progressivement par des requêtes Supabase

export const kpisOverview = [
  { label: 'Projets en cours', value: '18', delta: '+3', trend: 'up', spark: [4,6,5,8,7,9,11,10,12,14] },
  { label: 'Chiffre d\'affaires', value: '€2.4M', delta: '+18%', trend: 'up', spark: [20,25,22,30,28,35,33,40,38,45] },
  { label: 'Surface bâtie (m²)', value: '47K', delta: '+12%', trend: 'up', spark: [30,32,35,38,40,42,44,45,46,47] },
  { label: 'Architectes actifs', value: '24', delta: '+2', trend: 'up', spark: [20,21,21,22,22,23,23,24,24,24] },
]

export const revenueData = [
  { mois: 'Jan', revenus: 145, depenses: 92 },
  { mois: 'Fév', revenus: 162, depenses: 95 },
  { mois: 'Mar', revenus: 178, depenses: 108 },
  { mois: 'Avr', revenus: 195, depenses: 112 },
  { mois: 'Mai', revenus: 212, depenses: 128 },
  { mois: 'Jun', revenus: 245, depenses: 145 },
  { mois: 'Jui', revenus: 268, depenses: 158 },
  { mois: 'Aoû', revenus: 252, depenses: 152 },
  { mois: 'Sep', revenus: 285, depenses: 168 },
]

// Projets architecturaux
export const projets = [
  {
    id: 1001,
    nom: 'Villa Benali',
    client: 'Ahmed Benali',
    type: 'Résidentiel',
    adresse: 'Californie, Casablanca',
    budget: 2500000,
    statut: 'En cours',
    avancement: 25,
    isInterne: false,
    dateDebut: '2025-02-01',
    dateFin: '2026-08-01',
    equipe: 3,
    description: 'Villa individuelle de standing, 350 m², 4 chambres, piscine',
    missions: [],
    tasks: [],
    concept: { images: [], questions: [], clientResponse: null },
    programme: {
      statut: 'partage',
      groupes: [
        {
          id: 'g1',
          nom: 'Rez-de-chaussée',
          items: [
            { id: 'i1', programme: 'Salon / Séjour', unite: 'u', quantite: 1, superficieUnitaire: 45 },
            { id: 'i2', programme: 'Cuisine', unite: 'u', quantite: 1, superficieUnitaire: 18 },
            { id: 'i3', programme: 'Bureau', unite: 'u', quantite: 1, superficieUnitaire: 14 },
            { id: 'i4', programme: 'Toilettes invités', unite: 'u', quantite: 1, superficieUnitaire: 4 },
          ],
        },
        {
          id: 'g2',
          nom: 'Étage',
          items: [
            { id: 'i5', programme: 'Chambre parentale', unite: 'u', quantite: 1, superficieUnitaire: 35 },
            { id: 'i6', programme: 'Salle de bain parentale', unite: 'u', quantite: 1, superficieUnitaire: 12 },
            { id: 'i7', programme: 'Chambres enfants', unite: 'u', quantite: 3, superficieUnitaire: 16 },
            { id: 'i8', programme: 'Salle de bain', unite: 'u', quantite: 1, superficieUnitaire: 8 },
          ],
        },
        {
          id: 'g3',
          nom: 'Extérieurs',
          items: [
            { id: 'i9', programme: 'Piscine', unite: 'u', quantite: 1, superficieUnitaire: 60 },
            { id: 'i10', programme: 'Terrasse', unite: 'u', quantite: 1, superficieUnitaire: 80 },
          ],
        },
      ],
    },
    estimation: {
      statut: 'partage',
      groupes: [
        {
          id: 'g1',
          nom: 'Rez-de-chaussée',
          items: [
            { id: 'i1', programme: 'Salon / Séjour', unite: 'u', quantite: 1, superficieUnitaire: 45, prixEstimation: 8000 },
            { id: 'i2', programme: 'Cuisine', unite: 'u', quantite: 1, superficieUnitaire: 18, prixEstimation: 10000 },
            { id: 'i3', programme: 'Bureau', unite: 'u', quantite: 1, superficieUnitaire: 14, prixEstimation: 7500 },
            { id: 'i4', programme: 'Toilettes invités', unite: 'u', quantite: 1, superficieUnitaire: 4, prixEstimation: 9000 },
          ],
        },
        {
          id: 'g2',
          nom: 'Étage',
          items: [
            { id: 'i5', programme: 'Chambre parentale', unite: 'u', quantite: 1, superficieUnitaire: 35, prixEstimation: 8500 },
            { id: 'i6', programme: 'Salle de bain parentale', unite: 'u', quantite: 1, superficieUnitaire: 12, prixEstimation: 11000 },
            { id: 'i7', programme: 'Chambres enfants', unite: 'u', quantite: 3, superficieUnitaire: 16, prixEstimation: 7500 },
            { id: 'i8', programme: 'Salle de bain', unite: 'u', quantite: 1, superficieUnitaire: 8, prixEstimation: 9000 },
          ],
        },
        {
          id: 'g3',
          nom: 'Extérieurs',
          items: [
            { id: 'i9', programme: 'Piscine', unite: 'u', quantite: 1, superficieUnitaire: 60, prixEstimation: 15000 },
            { id: 'i10', programme: 'Terrasse', unite: 'u', quantite: 1, superficieUnitaire: 80, prixEstimation: 5000 },
          ],
        },
      ],
    },
  },
]

// Phases d'architecture pour le Gantt (méthodologie loi MOP)
export const ganttTasks = [
  { nom: 'ESQ — Esquisse', start: 0, duree: 10, couleur: '#3B82F6', equipe: 'Architectes seniors' },
  { nom: 'APS — Avant-Projet Sommaire', start: 8, duree: 15, couleur: '#06B6D4', equipe: 'Équipe conception' },
  { nom: 'APD — Avant-Projet Détaillé', start: 22, duree: 20, couleur: '#10B981', equipe: 'Bureau d\'études' },
  { nom: 'PRO — Études Projet', start: 40, duree: 25, couleur: '#F59E0B', equipe: 'Techniciens' },
  { nom: 'DCE — Dossier Consultation Entreprises', start: 60, duree: 15, couleur: '#F43F5E', equipe: 'Économistes' },
  { nom: 'EXE — Suivi d\'Exécution', start: 72, duree: 13, couleur: '#0A1E3F', equipe: 'Chef de chantier' },
]

// Équipe agence (architectes, dessinateurs, etc.)
export const employes = []

export const conges = [
  { id: 1, nom: 'Karim Tazi', type: 'Congés annuels', debut: '15 Déc', duree: '5j', statut: 'En attente' },
  { id: 2, nom: 'Yasmine Benali', type: 'RTT', debut: '22 Déc', duree: '2j', statut: 'Approuvé' },
  { id: 3, nom: 'Omar El Fassi', type: 'Congés annuels', debut: '02 Jan', duree: '10j', statut: 'En attente' },
]

export const factures = [
  { num: 'FAC-2025-0142', client: 'Famille Bensouda', projet: 'Villa Anfa', montant: '€32,500', date: '15 Nov', statut: 'Payée' },
  { num: 'FAC-2025-0143', client: 'TechMaroc SA', projet: 'Siège Social', montant: '€84,000', date: '18 Nov', statut: 'En attente' },
  { num: 'FAC-2025-0144', client: 'Hôtels du Sud', projet: 'Riad Médina', montant: '€26,750', date: '22 Nov', statut: 'En retard' },
  { num: 'FAC-2025-0145', client: 'Fondation Éducation+', projet: 'École Maternelle', montant: '€42,000', date: '25 Nov', statut: 'Payée' },
  { num: 'FAC-2025-0146', client: 'Promoteurs Atlantique', projet: 'Complexe Marina', montant: '€118,750', date: '28 Nov', statut: 'En attente' },
]

export const clients = []

export const pipelineData = [
  { etape: 'Prospects', valeur: 28 },
  { etape: 'Qualifiés', valeur: 16 },
  { etape: 'Esquisse offerte', valeur: 9 },
  { etape: 'Négociation', valeur: 5 },
  { etape: 'Signés', valeur: 3 },
]

export const repartitionDept = [
  { name: 'Conception', value: 9, fill: '#0A1E3F' },
  { name: 'BIM / 3D', value: 5, fill: '#3B82F6' },
  { name: 'Management', value: 3, fill: '#06B6D4' },
  { name: 'Design Int.', value: 4, fill: '#10B981' },
  { name: 'Support', value: 3, fill: '#F59E0B' },
]
