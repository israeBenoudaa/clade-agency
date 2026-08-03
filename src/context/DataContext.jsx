import { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { createSupabaseUser } from '../lib/supabaseAuth'
import { projets as mockProjets, clients as mockClients, employes as mockEmployes } from '../data/mockData'

const DataContext = createContext(null)

// ── CONSTANTS ────────────────────────────────────────────────────────────────

const MOCK_PROSPECTS = []

const MOCK_PROSPECT_LINKS = { 1: 'p4', 2: 'p6' }

export const DIRECTOR_EMP_DEFAULT = {
  id: 'director-achraf',
  nom: 'Achraf Benouda', prenom: 'Achraf', nomFamille: 'Benouda',
  poste: 'Directeur Général', dept: 'Direction Générale',
  email: 'a.benouda@clade.ma', telephone: '', cin: '', adresse: '',
  contrat: 'CDI', salaireNet: '', salaireBrut: '',
  statut: 'actif', isDirecteur: true,
  planning: [], conges: { solde: 30, history: [] }, workSessions: [],
  credentials: { username: 'a.benouda', password: null },
}

// ── HELPERS ──────────────────────────────────────────────────────────────────

function nextPeriod(date, periodicite) {
  const d = new Date(date)
  if (periodicite === 'hebdomadaire') d.setDate(d.getDate() + 7)
  else if (periodicite === 'mensuel') d.setMonth(d.getMonth() + 1)
  else if (periodicite === 'trimestriel') d.setMonth(d.getMonth() + 3)
  else if (periodicite === 'annuel') d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

function periodKey(date, periodicite) {
  if (periodicite === 'hebdomadaire') return date.slice(0, 10)
  if (periodicite === 'mensuel' || periodicite === 'trimestriel') return date.slice(0, 7)
  return date.slice(0, 4)
}

function generateChargeTx(chargesFixe) {
  const today = new Date().toISOString().slice(0, 10)
  const txs = []
  for (const charge of chargesFixe) {
    let d = charge.dateDebut
    let count = 0
    while (d <= today && count < 24) {
      const pk = periodKey(d, charge.periodicite)
      txs.push({ id: `cf_${charge.id}_${pk}`, type: 'sortie', montant: Number(charge.montant) || 0, libelle: charge.libelle, date: d, categorie: charge.categorie, auto: true, chargeId: charge.id })
      d = nextPeriod(d, charge.periodicite)
      count++
    }
  }
  return txs
}

function generateSalaryTx(employes) {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return employes
    .filter(e => e.statut === 'actif' && Number(e.salaireBrut) > 0)
    .map(e => ({ id: `sal_${e.id}_${year}-${month}`, type: 'sortie', montant: Number(e.salaireBrut), libelle: `Salaire ${e.prenom} ${e.nom} — ${year}/${month}`, date: `${year}-${month}-25`, categorie: 'Salaires', auto: true, employeId: e.id }))
}

function calcAvancement(missions) {
  const all = missions.filter(m => m.type === 'mission')
  if (!all.length) return null
  return Math.round((all.filter(m => m.statut === 'valide').length / all.length) * 100)
}

const enrichMock = (p) => ({
  ...p,
  missions: p.missions || [],
  tasks: p.tasks || [],
  avancement: p.avancement,
  finances: p.finances || { honoraires: {}, paiements: {} },
  prospectId: p.prospectId || MOCK_PROSPECT_LINKS[p.id] || null,
})

const uid = (prefix = '') => `${prefix}${Date.now()}${Math.random().toString(36).slice(2, 6)}`

// ── MAPPERS (JS camelCase ↔ SQL snake_case) ──────────────────────────────────

const toDbClient = (c) => ({ id: c.id, nom: c.nom, email: c.email || null, telephone: c.telephone || null, secteur: c.secteur || null, ville: c.ville || null, pays: c.pays || null, sante: c.sante ?? 85, projets: c.projets ?? 0, depuis: c.depuis || null, ca: c.ca || null, contact: c.contact || null, notes: c.notes || null, prospect_id: c.prospectId || null })
const fromDbClient = (r) => ({ id: r.id, nom: r.nom, email: r.email, telephone: r.telephone, secteur: r.secteur, ville: r.ville, pays: r.pays, sante: r.sante ?? 85, projets: r.projets ?? 0, depuis: r.depuis, ca: r.ca, contact: r.contact, notes: r.notes, prospectId: r.prospect_id })

const toDbProspect = (p) => ({ id: p.id, prenom: p.prenom || null, nom: p.nom || null, email: p.email || null, telephone: p.telephone || null, statut: p.statut || null, type_projet: p.typeProjet || null, budget: p.budget || null, created_at: p.createdAt || null, sim: p.sim || {}, devis_missions: p.devisMissions || [], client_expenses: p.clientExpenses || [], client_credentials: p.clientCredentials || null, rdvs: p.rdvs || [], notes: p.notes || null, localisation: p.localisation || null, surface: p.surface || null, source: p.source || null, portal_blocked: p.portalBlocked ?? false })
const fromDbProspect = (r) => ({ id: r.id, prenom: r.prenom, nom: r.nom, email: r.email, telephone: r.telephone, statut: r.statut, typeProjet: r.type_projet, budget: r.budget, createdAt: r.created_at, sim: r.sim || {}, devisMissions: r.devis_missions || [], clientExpenses: r.client_expenses || [], clientCredentials: r.client_credentials, rdvs: r.rdvs || [], notes: r.notes, localisation: r.localisation || null, surface: r.surface || null, source: r.source || null, portalBlocked: r.portal_blocked ?? false })

const toDbEmploye = (e) => ({ id: String(e.id), nom: e.nom, prenom: e.prenom || null, nom_famille: e.nomFamille || null, poste: e.poste || null, dept: e.dept || null, email: e.email || null, telephone: e.telephone || null, cin: e.cin || null, adresse: e.adresse || null, contrat: e.contrat || null, salaire_net: Number(e.salaireNet) || 0, salaire_brut: Number(e.salaireBrut) || 0, statut: e.statut || 'actif', is_directeur: e.isDirecteur || false, manager_id: e.managerId ? String(e.managerId) : null, avatar: e.avatar || null, planning: e.planning || [], conges: e.conges || { solde: 25, history: [] }, work_sessions: e.workSessions || [], credentials: e.credentials || null, evaluations: e.evaluations || [], heures_sup_manual: e.heuresSupManual || [], from_recruitment: e.fromRecruitment || null, permissions: e.permissions || null, primes: e.primes || [], payslips: e.payslips || [], mode_remuneration: e.modeRemuneration || 'mensuel', role: e.role || null })
const fromDbEmploye = (r) => ({ id: r.id, nom: r.nom, prenom: r.prenom, nomFamille: r.nom_famille, poste: r.poste, dept: r.dept, email: r.email, telephone: r.telephone, cin: r.cin, adresse: r.adresse, contrat: r.contrat, salaireNet: r.salaire_net, salaireBrut: r.salaire_brut, statut: r.statut, isDirecteur: r.is_directeur, managerId: r.manager_id, avatar: r.avatar, planning: r.planning || [], conges: r.conges || { solde: 25, history: [] }, workSessions: r.work_sessions || [], credentials: r.credentials, evaluations: r.evaluations || [], heuresSupManual: r.heures_sup_manual || [], fromRecruitment: r.from_recruitment, permissions: r.permissions || null, primes: r.primes || [], payslips: r.payslips || [], modeRemuneration: r.mode_remuneration || 'mensuel', role: r.role || null })

const toDbProject = (p) => ({ id: p.id, nom: p.nom, client: p.client || null, client_id: p.clientId || null, prospect_id: p.prospectId || null, statut: p.statut || 'En cours', avancement: p.avancement ?? 0, type_projet: p.typeProjet || p.type || null, budget: p.budget ? String(p.budget) : null, date_debut: p.dateDebut || null, date_fin: p.dateFin || null, description: p.description || null, equipe: p.equipe ?? 0, equipe_projet: p.equipeProjet || [], missions: p.missions || [], tasks: p.tasks || [], livrables: p.livrables || [], finances: p.finances || { honoraires: {}, paiements: {} }, concept: p.concept ? { ...p.concept, images: (p.concept.images || []).map(img => ({ id: img.id, url: img.url || null, storagePath: img.storagePath || null, name: img.name })) } : null, programme: p.programme || null, estimation: p.estimation || null, client_feedback: p.clientFeedback || [], architecte_referent_id: p.architecteReferentId || null, architecte_referent_nom: p.architecteReferentNom || null })
const fromDbProject = (r) => ({ id: r.id, nom: r.nom, client: r.client, clientId: r.client_id, prospectId: r.prospect_id, statut: r.statut, avancement: r.avancement ?? 0, typeProjet: r.type_projet, type: r.type_projet, budget: r.budget, dateDebut: r.date_debut, dateFin: r.date_fin, description: r.description, equipe: r.equipe ?? 0, equipeProjet: r.equipe_projet || [], missions: r.missions || [], tasks: r.tasks || [], livrables: r.livrables || [], finances: r.finances || { honoraires: {}, paiements: {} }, concept: r.concept, programme: r.programme, estimation: r.estimation, clientFeedback: r.client_feedback || [], architecteReferentId: r.architecte_referent_id || null, architecteReferentNom: r.architecte_referent_nom || null })

const toDbTransaction = (t) => ({ id: t.id, type: t.type, montant: Number(t.montant) || 0, libelle: t.libelle || null, date: t.date, categorie: t.categorie || null, auto: t.auto || false, charge_id: t.chargeId || null, employe_id: t.employeId ? String(t.employeId) : null, project_id: t.projectId ? String(t.projectId) : null })
const fromDbTransaction = (r) => ({ id: r.id, type: r.type, montant: Number(r.montant) || 0, libelle: r.libelle, date: r.date, categorie: r.categorie, auto: r.auto, chargeId: r.charge_id, employeId: r.employe_id, projectId: r.project_id })

const toDbChargeFixe = (c) => ({ id: c.id, libelle: c.libelle, montant: Number(c.montant) || 0, categorie: c.categorie || null, periodicite: c.periodicite || null, date_debut: c.dateDebut || null })
const fromDbChargeFixe = (r) => ({ id: r.id, libelle: r.libelle, montant: r.montant, categorie: r.categorie, periodicite: r.periodicite, dateDebut: r.date_debut })

const toDbMessage = (m) => ({ id: m.id, conversation_id: m.conversationId, sender_id: m.senderId, sender_name: m.senderName || null, sender_role: m.senderRole || null, content: m.content || null, type: m.type || 'text', reply_to: m.replyTo || null, attachments: m.attachments || [], reactions: m.reactions || {}, members: m.members || null, edited_at: m.editedAt || null, timestamp: m.timestamp || new Date().toISOString() })
const fromDbMessage = (r) => ({ id: r.id, conversationId: r.conversation_id, senderId: r.sender_id, senderName: r.sender_name, senderRole: r.sender_role, content: r.content, type: r.type || 'text', replyTo: r.reply_to, attachments: r.attachments || [], reactions: r.reactions || {}, members: r.members, editedAt: r.edited_at, timestamp: r.timestamp })

const toDbDemandeRH = (d) => ({ id: d.id, employe_id: String(d.employeId), employe_nom: d.employeNom || null, type: d.type, statut: d.statut || 'en_attente', manager_approval: d.managerApproval || 'non_requis', rh_approval: d.rhApproval || 'en_attente', manager_id: d.managerId ? String(d.managerId) : null, date_debut: d.dateDebut || null, date_fin: d.dateFin || null, commentaire: d.commentaire || null, commentaire_rh: d.commentaireRH || null, commentaire_manager: d.commentaireManager || null, archived_by_managers: d.archivedByManagers || [], created_at: d.createdAt || new Date().toISOString(), processed_at: d.processedAt || null })
const fromDbDemandeRH = (r) => ({ id: r.id, employeId: r.employe_id, employeNom: r.employe_nom, type: r.type, statut: r.statut, managerApproval: r.manager_approval, rhApproval: r.rh_approval, managerId: r.manager_id, dateDebut: r.date_debut, dateFin: r.date_fin, commentaire: r.commentaire, commentaireRH: r.commentaire_rh, commentaireManager: r.commentaire_manager, archivedByManagers: r.archived_by_managers || [], createdAt: r.created_at, processedAt: r.processed_at })

const toDbRecrutement = (r) => ({ id: r.id, intitule: r.intitule, dept: r.dept || null, type_contrat: r.typeContrat || null, description: r.description || null, missions: r.missions || null, salaire_min: r.salaireMin ? Number(r.salaireMin) : null, salaire_max: r.salaireMax ? Number(r.salaireMax) : null, statut: r.statut || 'ouvert', candidats: r.candidats || [], created_at: r.createdAt || null })
const fromDbRecrutement = (r) => ({ id: r.id, intitule: r.intitule, dept: r.dept, typeContrat: r.type_contrat, description: r.description, missions: r.missions, salaireMin: r.salaire_min, salaireMax: r.salaire_max, statut: r.statut, candidats: r.candidats || [], createdAt: r.created_at })

const toDbCandidatureSpont = (c) => ({ id: c.id, prenom: c.prenom || null, nom: c.nom || null, email: c.email || null, telephone: c.telephone || null, poste_vise: c.posteVise || c.posteSouhaite || null, message: c.message || null, cv_url: c.cvUrl || null, statut: c.statut || 'nouveau', date_reception: c.dateReception || null, notes: c.notes || null, offre_id: c.offreId || null, departement: c.departement || null, portfolio_url: c.portfolioUrl || null })
const fromDbCandidatureSpont = (r) => ({ id: r.id, prenom: r.prenom, nom: r.nom, email: r.email, telephone: r.telephone, posteVise: r.poste_vise, posteSouhaite: r.poste_vise, message: r.message, cvUrl: r.cv_url, statut: r.statut, dateReception: r.date_reception, notes: r.notes, offreId: r.offre_id || null, departement: r.departement || null, portfolioUrl: r.portfolio_url || null })

const toDbFormation = (f) => ({ id: f.id, nom: f.nom, date: f.date || null, duree: f.duree || null, formateur: f.formateur || null, participants: f.personnes || f.participants || [], confirmed_by: f.confirmedBy || [], heure_debut: f.heureDebut || null, heure_fin: f.heureFin || null, budget: Number(f.budget) || null, statut: f.statut || null, description: f.description || null })
const fromDbFormation = (r) => ({ id: r.id, nom: r.nom, date: r.date, duree: r.duree, formateur: r.formateur, personnes: r.participants || [], participants: r.participants || [], confirmedBy: r.confirmed_by || [], heureDebut: r.heure_debut || null, heureFin: r.heure_fin || null, budget: r.budget, statut: r.statut, description: r.description })

const toDbCollaborateur = (c) => ({ id: c.id, nom: c.nom, specialite: c.specialite || null, categorie_id: c.categorieId || null, email: c.email || null, telephone: c.telephone || null, tarif: Number(c.tarif) || null, notes: c.notes || null })
const fromDbCollaborateur = (r) => ({ id: r.id, nom: r.nom, specialite: r.specialite, categorieId: r.categorie_id, email: r.email, telephone: r.telephone, tarif: r.tarif, notes: r.notes })

const toDbJourFerie = (j) => ({ id: j.id, date: j.date, nom: j.nom, date_fin: j.dateFin || null })
const fromDbJourFerie = (r) => ({ id: r.id, date: r.date, nom: r.nom, dateFin: r.date_fin || null })

const toDbWorkflow = (w) => ({ id: w.id, title: w.title || null, description: w.description || null, blocks: w.blocks || [], shared_with: w.sharedWith || [], versions: w.versions || [], deleted_at: w.deletedAt || null, created_at: w.createdAt || new Date().toISOString(), updated_at: w.updatedAt || new Date().toISOString(), created_by_id: w.createdById || null, created_by_nom: w.createdByNom || null, category: w.category || null })
const fromDbWorkflow = (r) => ({ id: r.id, title: r.title, description: r.description, blocks: r.blocks || [], sharedWith: r.shared_with || [], versions: r.versions || [], deletedAt: r.deleted_at, createdAt: r.created_at, updatedAt: r.updated_at, createdById: r.created_by_id || null, createdByNom: r.created_by_nom || null, category: r.category || null })

const toDbNotification = (n) => ({ id: n.id, type: n.type || null, message: n.message, target_user_id: n.targetUserId || null, read: n.read || false, link: n.link || null, for_hr: n.forHR || false, created_at: n.createdAt || new Date().toISOString() })
const fromDbNotification = (r) => ({ id: r.id, type: r.type, message: r.message, targetUserId: r.target_user_id, read: r.read, link: r.link, forHR: r.for_hr, createdAt: r.created_at })

const toDbActivityLog = (e) => ({ id: e.id, action: e.action, details: e.details || null, category: e.category || null, by: e.by || null, timestamp: e.timestamp || new Date().toISOString() })

// ── SUPABASE HELPERS ─────────────────────────────────────────────────────────

const sbUpsert = (table, data) => {
  if (!supabase) return
  supabase.from(table).upsert(data, { onConflict: 'id' })
    .then(({ error }) => {
      if (error) console.warn(`[Supabase upsert:${table}]`, error.message)
    })
    .catch(err => console.warn(`[Supabase upsert:${table}] fetch error:`, err?.message))
}

const sbDelete = (table, id) => {
  if (!supabase) return
  supabase.from(table).delete().eq('id', id).then(({ error }) => {
    if (error) console.warn(`[Supabase delete:${table}]`, error.message)
  })
}

const sbDeleteWhere = (table, col, val) => {
  if (!supabase) return
  supabase.from(table).delete().eq(col, val).then(({ error }) => {
    if (error) console.warn(`[Supabase deleteWhere:${table}]`, error.message)
  })
}

// ── DATA PROVIDER ────────────────────────────────────────────────────────────

export function DataProvider({ children }) {
  // ── State (initialised from localStorage as fast cache) ────────────────────
  const [projects, setProjects] = useState(() => {
    try {
      const saved = localStorage.getItem('clade_projects')
      if (saved) {
        let parsed = JSON.parse(saved)
        parsed = parsed.map(p => MOCK_PROSPECT_LINKS[p.id] && !p.prospectId ? { ...p, prospectId: MOCK_PROSPECT_LINKS[p.id] } : p)
        const missing = mockProjets.filter(mp => !parsed.some(p => p.id === mp.id))
        if (missing.length) return [...missing.map(enrichMock), ...parsed]
        return parsed
      }
    } catch {}
    return mockProjets.map(enrichMock)
  })

  const [clients, setClients] = useState(() => {
    try { const s = localStorage.getItem('clade_clients'); if (s) return JSON.parse(s) } catch {}
    return mockClients
  })

  const [employes, setEmployes] = useState(() => {
    try {
      const s = localStorage.getItem('clade_employes')
      if (s) {
        const arr = JSON.parse(s)
        if (!arr.find(e => e.id === 'director-achraf')) return [DIRECTOR_EMP_DEFAULT, ...arr]
        return arr
      }
    } catch {}
    return [DIRECTOR_EMP_DEFAULT, ...mockEmployes]
  })

  const [transactions, setTransactions] = useState(() => {
    try { const s = localStorage.getItem('clade_transactions'); if (s) return JSON.parse(s) } catch {}
    return []
  })

  const [prospects, setProspects] = useState(() => {
    try {
      const s = localStorage.getItem('clade_prospects')
      if (s) {
        const parsed = JSON.parse(s)
        const missing = MOCK_PROSPECTS.filter(mp => !parsed.some(p => p.id === mp.id))
        if (missing.length) return [...missing, ...parsed]
        return parsed
      }
    } catch {}
    return MOCK_PROSPECTS
  })

  const [chargesFixe, setChargesFixe] = useState(() => {
    try { const s = localStorage.getItem('clade_charges_fixes'); if (s) return JSON.parse(s) } catch {}
    return []
  })

  const [agenceSettings, setAgenceSettingsState] = useState(() => {
    try { const s = localStorage.getItem('clade_agence_settings'); if (s) return JSON.parse(s) } catch {}
    return { nbCollaborateurs: 5, heuresParAn: 1500, tjh: 250 }
  })

  const [categoriesCollab, setCategoriesCollab] = useState(() => {
    try { const s = localStorage.getItem('clade_categories_collab'); if (s) return JSON.parse(s) } catch {}
    return []
  })

  const [collaborateurs, setCollaborateurs] = useState(() => {
    try { const s = localStorage.getItem('clade_collaborateurs'); if (s) return JSON.parse(s) } catch {}
    return []
  })

  const [formations, setFormations] = useState(() => {
    try { const s = localStorage.getItem('clade_formations'); if (s) return JSON.parse(s) } catch {}
    return []
  })

  const [recrutements, setRecrutements] = useState(() => {
    try { const s = localStorage.getItem('clade_recrutements'); if (s) return JSON.parse(s) } catch {}
    return []
  })

  const [messages, setMessages] = useState(() => {
    try { const s = localStorage.getItem('clade_messages'); if (s) return JSON.parse(s) } catch {}
    return []
  })

  const [demandesRH, setDemandesRH] = useState(() => {
    try { return JSON.parse(localStorage.getItem('clade_demandes_rh') || '[]') } catch { return [] }
  })

  const [candidaturesSpont, setCandidaturesSpont] = useState(() => {
    try { return JSON.parse(localStorage.getItem('clade_candidatures_spont') || '[]') } catch { return [] }
  })

  const [joursFerier, setJoursFerier] = useState(() => {
    try { return JSON.parse(localStorage.getItem('clade_jours_ferier') || '[]') } catch { return [] }
  })

  const [hiddenMessages, setHiddenMessages] = useState(() => {
    try { return JSON.parse(localStorage.getItem('clade_hidden_msgs') || '{}') } catch { return {} }
  })

  const [hiddenConvs, setHiddenConvs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('clade_hidden_convs') || '{}') } catch { return {} }
  })

  const [msgReadState, setMsgReadState] = useState(() => {
    try { return JSON.parse(localStorage.getItem('clade_msg_read') || '{}') } catch { return {} }
  })

  const [notifications, setNotifications] = useState(() => {
    try { const s = localStorage.getItem('clade_notifications'); if (s) return JSON.parse(s) } catch {}
    return []
  })

  const [checkpoints, setCheckpoints] = useState(() => {
    try { const s = localStorage.getItem('clade_checkpoints'); return s ? JSON.parse(s) : [] } catch { return [] }
  })

  const PRUNE_MS = 30 * 24 * 60 * 60 * 1000
  const [activityLog, setActivityLog] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('clade_activity_log') || '[]')
      const cutoff = Date.now() - PRUNE_MS
      return saved.filter(e => new Date(e.timestamp).getTime() > cutoff)
    } catch { return [] }
  })

  const [workflows, setWorkflows] = useState(() => {
    try { return JSON.parse(localStorage.getItem('clade_workflows') || '[]') } catch { return [] }
  })

  const [tauxImpot, setTauxImpotState] = useState(() => {
    try { const s = localStorage.getItem('clade_taux_impot'); if (s) return parseFloat(s) } catch {}
    return 20
  })

  const [supaLoaded, setSupaLoaded] = useState(false)

  // ── Refs ──────────────────────────────────────────────────────────────────
  const stateRef = useRef({})
  // Prevents debounced mass-upsert effects from firing right after the initial DB load
  const syncReadyRef = useRef(false)
  useEffect(() => {
    stateRef.current = { projects, employes, clients, prospects, transactions, chargesFixe, messages, formations, recrutements, collaborateurs, categoriesCollab, demandesRH, candidaturesSpont, joursFerier, workflows, agenceSettings, tauxImpot, hiddenMessages, hiddenConvs, msgReadState, notifications }
  }, [projects, employes, clients, prospects, transactions, chargesFixe, messages, formations, recrutements, collaborateurs, categoriesCollab, demandesRH, candidaturesSpont, joursFerier, workflows, agenceSettings, tauxImpot, hiddenMessages, hiddenConvs, msgReadState, notifications])

  const checkpointsRef = useRef(checkpoints)
  useEffect(() => { checkpointsRef.current = checkpoints }, [checkpoints])

  // ── LOAD FROM SUPABASE on mount ───────────────────────────────────────────
  useEffect(() => {
    if (!supabase) { setSupaLoaded(true); return }

    const load = async () => {
      try {
        const [
          { data: dbClients,   error: eClients },
          { data: dbProspects, error: eProspects },
          { data: dbEmployes,  error: eEmployes },
          { data: dbProjects,  error: eProjects },
          { data: dbTx,        error: eTx },
          { data: dbCharges },
          { data: dbMessages },
          { data: dbDemandesRH },
          { data: dbRecs },
          { data: dbCands },
          { data: dbFormations },
          { data: dbCollabs },
          { data: dbCatCollabs },
          { data: dbJF },
          { data: dbWF },
          { data: dbNotifs },
          { data: dbSettings },
          { data: dbLog },
        ] = await Promise.all([
          supabase.from('clients').select('*'),
          supabase.from('prospects').select('*'),
          supabase.from('employes').select('*'),
          supabase.from('projects').select('*'),
          supabase.from('transactions').select('*').order('date', { ascending: false }),
          supabase.from('charges_fixes').select('*'),
          supabase.from('messages').select('*').order('timestamp'),
          supabase.from('demandes_rh').select('*').order('created_at', { ascending: false }),
          supabase.from('recrutements').select('*'),
          supabase.from('candidatures_spont').select('*'),
          supabase.from('formations').select('*'),
          supabase.from('collaborateurs').select('*'),
          supabase.from('categories_collab').select('*'),
          supabase.from('jours_ferier').select('*').order('date'),
          supabase.from('workflows').select('*'),
          supabase.from('notifications').select('*').order('created_at', { ascending: false }),
          supabase.from('agence_settings').select('*').eq('id', 1).single(),
          supabase.from('activity_log').select('*').order('timestamp', { ascending: false }).limit(500),
        ])

        // Log Supabase errors so we can diagnose RLS / schema issues
        if (eClients)   console.error('[Supabase] clients:', eClients.message)
        if (eProspects) console.error('[Supabase] prospects:', eProspects.message)
        if (eEmployes)  console.error('[Supabase] employes:', eEmployes.message)
        if (eProjects)  console.error('[Supabase] projects:', eProjects.message)
        if (eTx)        console.error('[Supabase] transactions:', eTx.message)

        if (dbClients?.length)   setClients(dbClients.map(fromDbClient))
        else if (mockClients?.length) {
          // Premier lancement : pousser les données mock vers Supabase
          supabase.from('clients').upsert(mockClients.map(toDbClient), { onConflict: 'id' })
        }

        if (dbProspects?.length) {
          setProspects(dbProspects.map(fromDbProspect))
        } else if (prospects.length) {
          // DB vide mais localStorage a des données réelles → synchroniser vers Supabase
          supabase.from('prospects').upsert(prospects.map(toDbProspect), { onConflict: 'id' })
        } else {
          supabase.from('prospects').upsert(MOCK_PROSPECTS.map(toDbProspect), { onConflict: 'id' })
        }

        if (dbEmployes?.length) {
          const arr = dbEmployes.map(fromDbEmploye)
          setEmployes(arr.find(e => e.id === 'director-achraf') ? arr : [DIRECTOR_EMP_DEFAULT, ...arr])
        } else if (employes.length) {
          supabase.from('employes').upsert(employes.map(toDbEmploye), { onConflict: 'id' })
        } else {
          const dirSafe = { ...DIRECTOR_EMP_DEFAULT, credentials: null }
          supabase.from('employes').upsert([dirSafe, ...mockEmployes].map(toDbEmploye), { onConflict: 'id' })
        }

        if (dbProjects?.length) {
          setProjects(dbProjects.map(fromDbProject))
        } else if (projects.length) {
          // DB vide mais localStorage a des projets réels → les pousser vers Supabase
          supabase.from('projects').upsert(projects.map(toDbProject), { onConflict: 'id' })
        } else {
          supabase.from('projects').upsert(mockProjets.map(p => toDbProject(enrichMock(p))), { onConflict: 'id' })
        }

        if (dbTx?.length) {
          setTransactions(dbTx.map(fromDbTransaction))
        } else if (dbTx !== null && !eTx && transactions.length) {
          // Supabase vide mais localStorage a des données réelles → récupérer et synchroniser
          supabase.from('transactions').upsert(transactions.map(toDbTransaction), { onConflict: 'id' })
        }

        if (dbCharges?.length) {
          setChargesFixe(dbCharges.map(fromDbChargeFixe))
        } else if (dbCharges !== null && chargesFixe.length) {
          supabase.from('charges_fixes').upsert(chargesFixe.map(toDbChargeFixe), { onConflict: 'id' })
        }
        if (dbMessages)    setMessages(dbMessages.map(fromDbMessage))
        if (dbDemandesRH)  setDemandesRH(dbDemandesRH.map(fromDbDemandeRH))
        if (dbRecs)        setRecrutements(dbRecs.map(fromDbRecrutement))
        if (dbCands)       setCandidaturesSpont(dbCands.map(fromDbCandidatureSpont))
        if (dbFormations)  setFormations(dbFormations.map(fromDbFormation))
        if (dbCollabs)     setCollaborateurs(dbCollabs.map(fromDbCollaborateur))
        if (dbCatCollabs)  setCategoriesCollab(dbCatCollabs)
        if (dbJF)          setJoursFerier(dbJF.map(fromDbJourFerie))
        if (dbWF)          setWorkflows(dbWF.map(fromDbWorkflow))
        if (dbNotifs)      setNotifications(dbNotifs.map(fromDbNotification))
        if (dbSettings) {
          setAgenceSettingsState({ nbCollaborateurs: dbSettings.nb_collaborateurs ?? 5, heuresParAn: dbSettings.heures_par_an ?? 1500, tjh: dbSettings.tjh ?? 250 })
          setTauxImpotState(dbSettings.taux_impot ?? 20)
        }
        if (dbLog?.length) setActivityLog(dbLog.map(e => ({ id: e.id, action: e.action, details: e.details, category: e.category, by: e.by, timestamp: e.timestamp })))

      } catch (err) {
        console.warn('[Supabase] Erreur chargement initial:', err.message)
      } finally {
        setSupaLoaded(true)
      }
    }

    load()
  }, []) // eslint-disable-line

  // Activate debounced sync 3s after initial DB load — force full sync via stateRef
  // (stateRef always holds latest state, avoiding stale closure issues)
  useEffect(() => {
    if (!supaLoaded || !supabase) return
    const t = setTimeout(() => {
      syncReadyRef.current = true
      const s = stateRef.current
      if (s.projects?.length)     supabase.from('projects').upsert(s.projects.map(toDbProject), { onConflict: 'id' })
      if (s.employes?.length)     supabase.from('employes').upsert(s.employes.map(toDbEmploye), { onConflict: 'id' })
      if (s.transactions?.length) supabase.from('transactions').upsert(s.transactions.map(toDbTransaction), { onConflict: 'id' })
      if (s.workflows?.length)    supabase.from('workflows').upsert(s.workflows.map(toDbWorkflow), { onConflict: 'id' })
      if (s.formations?.length)   supabase.from('formations').upsert(s.formations.map(toDbFormation), { onConflict: 'id' })
      if (s.demandesRH?.length)   supabase.from('demandes_rh').upsert(s.demandesRH.map(toDbDemandeRH), { onConflict: 'id' })
    }, 3000)
    return () => clearTimeout(t)
  }, [supaLoaded]) // eslint-disable-line

  // ── SUPABASE SYNC (debounced, 1.5s) ───────────────────────────────────────
  // Upsert collections vers Supabase dès qu'elles changent (après le chargement initial)

  useEffect(() => {
    if (!supaLoaded || !supabase || !syncReadyRef.current) return
    const t = setTimeout(() => {
      if (projects.length) supabase.from('projects').upsert(projects.map(toDbProject), { onConflict: 'id' })
        .then(({ error }) => { if (error) console.warn('[Supabase projects sync]', error.message) })
        .catch(err => console.warn('[Supabase projects sync] error:', err?.message))
    }, 1500)
    return () => clearTimeout(t)
  }, [projects, supaLoaded])

  useEffect(() => {
    if (!supaLoaded || !supabase || !syncReadyRef.current) return
    const t = setTimeout(() => { if (employes.length) supabase.from('employes').upsert(employes.map(toDbEmploye), { onConflict: 'id' }) }, 1500)
    return () => clearTimeout(t)
  }, [employes, supaLoaded])

  useEffect(() => {
    if (!supaLoaded || !supabase || !syncReadyRef.current) return
    const t = setTimeout(() => { if (clients.length) supabase.from('clients').upsert(clients.map(toDbClient), { onConflict: 'id' }) }, 1500)
    return () => clearTimeout(t)
  }, [clients, supaLoaded])

  useEffect(() => {
    if (!supaLoaded || !supabase || !syncReadyRef.current) return
    const t = setTimeout(() => { if (prospects.length) supabase.from('prospects').upsert(prospects.map(toDbProspect), { onConflict: 'id' }) }, 1500)
    return () => clearTimeout(t)
  }, [prospects, supaLoaded])

  useEffect(() => {
    if (!supaLoaded || !supabase || !syncReadyRef.current) return
    const t = setTimeout(() => { supabase.from('transactions').upsert(transactions.map(toDbTransaction), { onConflict: 'id' }) }, 1500)
    return () => clearTimeout(t)
  }, [transactions, supaLoaded])

  useEffect(() => {
    if (!supaLoaded || !supabase || !syncReadyRef.current) return
    const t = setTimeout(() => { supabase.from('charges_fixes').upsert(chargesFixe.map(toDbChargeFixe), { onConflict: 'id' }) }, 1500)
    return () => clearTimeout(t)
  }, [chargesFixe, supaLoaded])

  useEffect(() => {
    if (!supaLoaded || !supabase || !syncReadyRef.current) return
    const t = setTimeout(() => { if (recrutements.length) supabase.from('recrutements').upsert(recrutements.map(toDbRecrutement), { onConflict: 'id' }) }, 1500)
    return () => clearTimeout(t)
  }, [recrutements, supaLoaded])

  useEffect(() => {
    if (!supaLoaded || !supabase || !syncReadyRef.current) return
    const t = setTimeout(() => { if (formations.length) supabase.from('formations').upsert(formations.map(toDbFormation), { onConflict: 'id' }) }, 1500)
    return () => clearTimeout(t)
  }, [formations, supaLoaded])

  useEffect(() => {
    if (!supaLoaded || !supabase || !syncReadyRef.current) return
    const t = setTimeout(() => { if (collaborateurs.length) supabase.from('collaborateurs').upsert(collaborateurs.map(toDbCollaborateur), { onConflict: 'id' }) }, 1500)
    return () => clearTimeout(t)
  }, [collaborateurs, supaLoaded])

  useEffect(() => {
    if (!supaLoaded || !supabase || !syncReadyRef.current) return
    const t = setTimeout(() => { if (categoriesCollab.length) supabase.from('categories_collab').upsert(categoriesCollab, { onConflict: 'id' }) }, 1500)
    return () => clearTimeout(t)
  }, [categoriesCollab, supaLoaded])

  useEffect(() => {
    if (!supaLoaded || !supabase || !syncReadyRef.current) return
    const t = setTimeout(() => { if (joursFerier.length) supabase.from('jours_ferier').upsert(joursFerier.map(toDbJourFerie), { onConflict: 'id' }) }, 1500)
    return () => clearTimeout(t)
  }, [joursFerier, supaLoaded])

  useEffect(() => {
    if (!supaLoaded || !supabase || !syncReadyRef.current) return
    const t = setTimeout(() => { if (workflows.length) supabase.from('workflows').upsert(workflows.map(toDbWorkflow), { onConflict: 'id' }) }, 1500)
    return () => clearTimeout(t)
  }, [workflows, supaLoaded])

  useEffect(() => {
    if (!supaLoaded || !supabase || !syncReadyRef.current) return
    const t = setTimeout(() => { if (demandesRH.length) supabase.from('demandes_rh').upsert(demandesRH.map(toDbDemandeRH), { onConflict: 'id' }) }, 1500)
    return () => clearTimeout(t)
  }, [demandesRH, supaLoaded])

  useEffect(() => {
    if (!supaLoaded || !supabase || !syncReadyRef.current) return
    const t = setTimeout(() => { if (candidaturesSpont.length) supabase.from('candidatures_spont').upsert(candidaturesSpont.map(toDbCandidatureSpont), { onConflict: 'id' }) }, 1500)
    return () => clearTimeout(t)
  }, [candidaturesSpont, supaLoaded])

  useEffect(() => {
    if (!supaLoaded || !supabase || !syncReadyRef.current) return
    const t = setTimeout(() => { if (messages.length) supabase.from('messages').upsert(messages.map(toDbMessage), { onConflict: 'id' }) }, 1500)
    return () => clearTimeout(t)
  }, [messages, supaLoaded])

  useEffect(() => {
    if (!supaLoaded || !supabase || !syncReadyRef.current) return
    const t = setTimeout(() => { if (notifications.length) supabase.from('notifications').upsert(notifications.map(toDbNotification), { onConflict: 'id' }) }, 1500)
    return () => clearTimeout(t)
  }, [notifications, supaLoaded])

  // agence_settings : ligne unique
  useEffect(() => {
    if (!supaLoaded || !supabase || !syncReadyRef.current) return
    const t = setTimeout(() => {
      supabase.from('agence_settings').upsert({ id: 1, nb_collaborateurs: agenceSettings.nbCollaborateurs, heures_par_an: agenceSettings.heuresParAn, tjh: agenceSettings.tjh, taux_impot: tauxImpot, updated_at: new Date().toISOString() }, { onConflict: 'id' })
    }, 1500)
    return () => clearTimeout(t)
  }, [agenceSettings, tauxImpot, supaLoaded])

  // ── Realtime : prospects & candidatures insérés depuis le portfolio ──────────
  useEffect(() => {
    if (!supaLoaded || !supabase) return
    const channel = supabase
      .channel('portfolio-inserts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'prospects' }, ({ new: row }) => {
        setProspects(prev => prev.some(p => p.id === row.id) ? prev : [fromDbProspect(row), ...prev])
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'candidatures_spont' }, ({ new: row }) => {
        setCandidaturesSpont(prev => prev.some(c => c.id === row.id) ? prev : [fromDbCandidatureSpont(row), ...prev])
        const name = [row.prenom, row.nom].filter(Boolean).join(' ') || 'Un candidat'
        const isSpontaneous = !row.offre_id
        const message = isSpontaneous
          ? `Nouvelle candidature spontanée de ${name}${row.poste_vise ? ` — ${row.poste_vise}` : ''}`
          : `${name} a postulé pour un poste ouvert`
        const notif = { id: uid('notif'), type: 'new_candidature', message, forHR: true, read: false, createdAt: new Date().toISOString(), link: isSpontaneous ? '/app/hr' : '/app/recrutement' }
        setNotifications(prev => [notif, ...prev])
        sbUpsert('notifications', toDbNotification(notif))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supaLoaded]) // eslint-disable-line

  // ── Realtime : sync core tables across all connected users ───────────────────
  useEffect(() => {
    if (!supaLoaded || !supabase) return
    const ch = supabase
      .channel('app-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, ({ eventType, new: row, old }) => {
        if (eventType === 'DELETE') {
          setProjects(prev => prev.filter(p => p.id !== old.id))
        } else if (row?.id) {
          setProjects(prev => [...prev.filter(p => p.id !== row.id), fromDbProject(row)])
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employes' }, ({ eventType, new: row, old }) => {
        if (eventType === 'DELETE') {
          setEmployes(prev => prev.filter(e => e.id !== old.id))
        } else if (row?.id) {
          setEmployes(prev => [...prev.filter(e => e.id !== row.id), fromDbEmploye(row)])
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workflows' }, ({ eventType, new: row, old }) => {
        if (eventType === 'DELETE') {
          setWorkflows(prev => prev.filter(w => w.id !== old.id))
        } else if (row?.id) {
          setWorkflows(prev => [...prev.filter(w => w.id !== row.id), fromDbWorkflow(row)])
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'formations' }, ({ eventType, new: row, old }) => {
        if (eventType === 'DELETE') {
          setFormations(prev => prev.filter(f => f.id !== old.id))
        } else if (row?.id) {
          setFormations(prev => [...prev.filter(f => f.id !== row.id), fromDbFormation(row)])
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, ({ eventType, new: row, old }) => {
        if (eventType === 'DELETE') {
          setTransactions(prev => prev.filter(t => t.id !== old.id))
        } else if (row?.id) {
          setTransactions(prev => [...prev.filter(t => t.id !== row.id), fromDbTransaction(row)])
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'demandes_rh' }, ({ eventType, new: row, old }) => {
        if (eventType === 'DELETE') {
          setDemandesRH(prev => prev.filter(d => d.id !== old.id))
        } else if (row?.id) {
          setDemandesRH(prev => [...prev.filter(d => d.id !== row.id), fromDbDemandeRH(row)])
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'charges_fixes' }, ({ eventType, new: row, old }) => {
        if (eventType === 'DELETE') {
          setChargesFixe(prev => prev.filter(c => c.id !== old.id))
        } else if (row?.id) {
          setChargesFixe(prev => [...prev.filter(c => c.id !== row.id), fromDbChargeFixe(row)])
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, ({ eventType, new: row, old }) => {
        if (eventType === 'DELETE') {
          setMessages(prev => prev.filter(m => m.id !== old.id))
        } else if (row?.id) {
          setMessages(prev => prev.some(m => m.id === row.id)
            ? prev.map(m => m.id === row.id ? fromDbMessage(row) : m)
            : [...prev, fromDbMessage(row)]
          )
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, ({ eventType, new: row, old }) => {
        if (eventType === 'DELETE') {
          setNotifications(prev => prev.filter(n => n.id !== old.id))
        } else if (row?.id) {
          setNotifications(prev => prev.some(n => n.id === row.id)
            ? prev.map(n => n.id === row.id ? fromDbNotification(row) : n)
            : [fromDbNotification(row), ...prev]
          )
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [supaLoaded]) // eslint-disable-line

  // ── Migration : créer les entrées clients manquantes pour les prospects contrat_signe ──
  useEffect(() => {
    if (!supaLoaded) return
    const existingProspectIds = new Set(clients.filter(c => c.prospectId).map(c => c.prospectId))
    const existingEmails = new Set(clients.filter(c => c.email).map(c => c.email))
    const missing = prospects.filter(p =>
      p.statut === 'contrat_signe' &&
      !existingProspectIds.has(p.id) &&
      !(p.email && existingEmails.has(p.email))
    )
    if (!missing.length) return
    const newClients = missing.map((p, i) => ({
      id: Date.now() + i,
      nom: [p.prenom, p.nom].filter(Boolean).join(' ') || p.nom || 'Client',
      email: p.email || null,
      telephone: p.telephone || null,
      secteur: p.typeProjet || null,
      prospectId: p.id,
      sante: 85,
      projets: 0,
      depuis: new Date().getFullYear().toString(),
      ca: '0 DH',
    }))
    setClients(prev => [...newClients, ...prev])
    newClients.forEach(c => sbUpsert('clients', toDbClient(c)))
  }, [supaLoaded]) // eslint-disable-line

  // ── localStorage backup (garde localStorage comme cache offline) ───────────
  useEffect(() => { try { localStorage.setItem('clade_projects', JSON.stringify(projects)) } catch {} }, [projects])
  useEffect(() => { try { localStorage.setItem('clade_clients', JSON.stringify(clients)) } catch {} }, [clients])
  useEffect(() => { try { localStorage.setItem('clade_employes', JSON.stringify(employes)) } catch {} }, [employes])
  useEffect(() => { try { localStorage.setItem('clade_transactions', JSON.stringify(transactions)) } catch {} }, [transactions])
  useEffect(() => { try { localStorage.setItem('clade_prospects', JSON.stringify(prospects)) } catch {} }, [prospects])
  useEffect(() => { try { localStorage.setItem('clade_charges_fixes', JSON.stringify(chargesFixe)) } catch {} }, [chargesFixe])
  useEffect(() => { try { localStorage.setItem('clade_agence_settings', JSON.stringify(agenceSettings)) } catch {} }, [agenceSettings])
  useEffect(() => { try { localStorage.setItem('clade_taux_impot', String(tauxImpot)) } catch {} }, [tauxImpot])
  useEffect(() => { try { localStorage.setItem('clade_categories_collab', JSON.stringify(categoriesCollab)) } catch {} }, [categoriesCollab])
  useEffect(() => { try { localStorage.setItem('clade_collaborateurs', JSON.stringify(collaborateurs)) } catch {} }, [collaborateurs])
  useEffect(() => { try { localStorage.setItem('clade_formations', JSON.stringify(formations)) } catch {} }, [formations])
  useEffect(() => { try { localStorage.setItem('clade_recrutements', JSON.stringify(recrutements)) } catch {} }, [recrutements])
  useEffect(() => { try { localStorage.setItem('clade_messages', JSON.stringify(messages)) } catch {} }, [messages])
  useEffect(() => { try { localStorage.setItem('clade_demandes_rh', JSON.stringify(demandesRH)) } catch {} }, [demandesRH])
  useEffect(() => { try { localStorage.setItem('clade_candidatures_spont', JSON.stringify(candidaturesSpont)) } catch {} }, [candidaturesSpont])
  useEffect(() => { try { localStorage.setItem('clade_jours_ferier', JSON.stringify(joursFerier)) } catch {} }, [joursFerier])
  useEffect(() => { try { localStorage.setItem('clade_hidden_msgs', JSON.stringify(hiddenMessages)) } catch {} }, [hiddenMessages])
  useEffect(() => { try { localStorage.setItem('clade_hidden_convs', JSON.stringify(hiddenConvs)) } catch {} }, [hiddenConvs])
  useEffect(() => { try { localStorage.setItem('clade_msg_read', JSON.stringify(msgReadState)) } catch {} }, [msgReadState])
  useEffect(() => { try { localStorage.setItem('clade_workflows', JSON.stringify(workflows)) } catch {} }, [workflows])
  useEffect(() => { try { localStorage.setItem('clade_notifications', JSON.stringify(notifications)) } catch {} }, [notifications])
  useEffect(() => { try { localStorage.setItem('clade_checkpoints', JSON.stringify(checkpoints)) } catch {} }, [checkpoints])
  useEffect(() => { try { localStorage.setItem('clade_activity_log', JSON.stringify(activityLog)) } catch {} }, [activityLog])

  // ── allTransactions (computed) ────────────────────────────────────────────
  const allTransactions = useMemo(() => {
    const chargeTxs = generateChargeTx(chargesFixe)
    const salaryTxs = generateSalaryTx(employes)
    const autoIds = new Set([...chargeTxs, ...salaryTxs].map(t => t.id))
    const manual = transactions.filter(t => !autoIds.has(t.id))
    return [...manual, ...chargeTxs, ...salaryTxs]
      .map(t => ({ ...t, montant: Number(t.montant) || 0 }))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [transactions, chargesFixe, employes])

  // ── Activity log ──────────────────────────────────────────────────────────
  const logActivity = useCallback((entry) => {
    setActivityLog(prev => {
      const item = { id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, timestamp: new Date().toISOString(), by: '', ...entry }
      if (supabase) supabase.from('activity_log').insert(toDbActivityLog(item))
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
      const pruned = prev.filter(e => new Date(e.timestamp).getTime() > cutoff)
      return [item, ...pruned].slice(0, 500)
    })
  }, [])

  const clearActivityLog = useCallback(() => {
    setActivityLog([])
    if (supabase) supabase.from('activity_log').delete().neq('id', '')
  }, [])

  const clearActivityLogBefore = useCallback((cutoffMs) => {
    setActivityLog(prev => prev.filter(e => Date.now() - new Date(e.timestamp).getTime() < cutoffMs))
    if (supabase) {
      const cutoffIso = new Date(Date.now() - cutoffMs).toISOString()
      supabase.from('activity_log').delete().lte('timestamp', cutoffIso)
    }
  }, [])

  // ── Checkpoint system ─────────────────────────────────────────────────────
  const stripHeavy = (data) => {
    const walk = (val) => {
      if (typeof val === 'string') return val.startsWith('data:') ? '[fichier]' : val
      if (Array.isArray(val)) return val.map(walk)
      if (val && typeof val === 'object') {
        const out = {}
        for (const k of Object.keys(val)) {
          if (k === 'concept') { out[k] = null; continue }
          out[k] = walk(val[k])
        }
        return out
      }
      return val
    }
    return walk(data)
  }

  const createCheckpoint = useCallback((label, trigger = 'manuel', by = '') => {
    const raw = stateRef.current
    const data = stripHeavy({ projects: raw.projects || [], employes: raw.employes || [], clients: raw.clients || [], prospects: raw.prospects || [], transactions: raw.transactions || [], chargesFixe: raw.chargesFixe || [], messages: raw.messages || [], formations: raw.formations || [], recrutements: raw.recrutements || [], collaborateurs: raw.collaborateurs || [], categoriesCollab: raw.categoriesCollab || [], demandesRH: raw.demandesRH || [], candidaturesSpont: raw.candidaturesSpont || [], joursFerier: raw.joursFerier || [], workflows: raw.workflows || [], agenceSettings: raw.agenceSettings || {}, tauxImpot: raw.tauxImpot ?? 20, hiddenMessages: raw.hiddenMessages || {}, hiddenConvs: raw.hiddenConvs || {}, msgReadState: raw.msgReadState || {}, notifications: raw.notifications || [] })
    const snapshot = { id: `cp_${Date.now()}`, label, trigger, createdAt: new Date().toISOString(), size: Math.round(JSON.stringify(data).length / 1024), data }
    setCheckpoints(prev => [snapshot, ...prev].slice(0, 10))
    if (trigger === 'manuel') logActivity({ action: 'Sauvegarde créée', details: label, category: 'data', by })
    return snapshot.id
  }, [logActivity])

  const restoreCheckpoint = useCallback((checkpointId, by = '') => {
    const cp = checkpoints.find(c => c.id === checkpointId)
    if (!cp) return false
    logActivity({ action: 'Données restaurées', details: cp.label, category: 'data', by })
    createCheckpoint(`Avant restauration — ${cp.label}`, 'avant_restauration')
    const { data } = cp
    if (data.projects)          setProjects(data.projects)
    if (data.employes)          setEmployes(data.employes)
    if (data.clients)           setClients(data.clients)
    if (data.prospects)         setProspects(data.prospects)
    if (data.transactions)      setTransactions(data.transactions)
    if (data.chargesFixe)       setChargesFixe(data.chargesFixe)
    if (data.messages)          setMessages(data.messages)
    if (data.formations)        setFormations(data.formations)
    if (data.recrutements)      setRecrutements(data.recrutements)
    if (data.collaborateurs)    setCollaborateurs(data.collaborateurs)
    if (data.categoriesCollab)  setCategoriesCollab(data.categoriesCollab)
    if (data.demandesRH)        setDemandesRH(data.demandesRH)
    if (data.candidaturesSpont) setCandidaturesSpont(data.candidaturesSpont)
    if (data.joursFerier)       setJoursFerier(data.joursFerier)
    if (data.workflows)         setWorkflows(data.workflows)
    if (data.agenceSettings)    setAgenceSettingsState(data.agenceSettings)
    if (data.tauxImpot != null) setTauxImpotState(data.tauxImpot)
    if (data.hiddenMessages)    setHiddenMessages(data.hiddenMessages)
    if (data.hiddenConvs)       setHiddenConvs(data.hiddenConvs)
    if (data.msgReadState)      setMsgReadState(data.msgReadState)
    if (data.notifications)     setNotifications(data.notifications)
    return true
  }, [checkpoints, createCheckpoint, logActivity])

  const deleteCheckpoint = useCallback((checkpointId) => {
    setCheckpoints(prev => prev.filter(c => c.id !== checkpointId))
  }, [])

  // ── Demo / Preview mode ───────────────────────────────────────────────────
  const [demoCheckpoint, setDemoCheckpoint] = useState(null)
  const enterDemoMode = useCallback((cp) => { setDemoCheckpoint(cp) }, [])
  const exitDemoMode = useCallback(() => { setDemoCheckpoint(null) }, [])
  const confirmDemoRestore = useCallback(() => { if (!demoCheckpoint) return; restoreCheckpoint(demoCheckpoint.id); setDemoCheckpoint(null) }, [demoCheckpoint, restoreCheckpoint])
  const demoData = demoCheckpoint?.data || null

  const demoAllTransactions = useMemo(() => {
    if (!demoData) return null
    const chargeTxs = generateChargeTx(demoData.chargesFixe || [])
    const salaryTxs = generateSalaryTx(demoData.employes || [])
    const autoIds = new Set([...chargeTxs, ...salaryTxs].map(t => t.id))
    const manual = (demoData.transactions || []).filter(t => !autoIds.has(t.id))
    return [...manual, ...chargeTxs, ...salaryTxs].map(t => ({ ...t, montant: Number(t.montant) || 0 })).sort((a, b) => b.date.localeCompare(a.date))
  }, [demoData])

  // ── Auto-checkpoint ───────────────────────────────────────────────────────
  const BACKUP_INTERVAL_MS = 144 * 60 * 1000
  const autoCheckpointDone = useRef(false)
  useEffect(() => {
    if (autoCheckpointDone.current) return
    autoCheckpointDone.current = true
    const tryAutoBackup = () => {
      const last = checkpointsRef.current[0]
      if (!last || Date.now() - new Date(last.createdAt).getTime() >= BACKUP_INTERVAL_MS) {
        createCheckpoint('Sauvegarde automatique', 'auto')
      }
    }
    const initTimer = setTimeout(tryAutoBackup, 3000)
    const interval = setInterval(tryAutoBackup, BACKUP_INTERVAL_MS)
    return () => { clearTimeout(initTimer); clearInterval(interval) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── MUTATIONS ─────────────────────────────────────────────────────────────

  // Auto-create a client record when a prospect reaches contrat_signe status
  const ensureClientForProspect = (prospect) => {
    const existingClients = stateRef.current.clients || []
    const alreadyExists = existingClients.some(c => c.prospectId === prospect.id || (prospect.email && c.email === prospect.email))
    if (alreadyExists) return
    const nom = [prospect.prenom, prospect.nom].filter(Boolean).join(' ') || prospect.nom || 'Client'
    const client = {
      id: Date.now(),
      nom,
      email: prospect.email || null,
      telephone: prospect.telephone || null,
      secteur: prospect.typeProjet || null,
      prospectId: prospect.id,
      sante: 85,
      projets: 0,
      depuis: new Date().getFullYear().toString(),
      ca: '0 DH',
    }
    setClients(prev => [client, ...prev])
    sbUpsert('clients', toDbClient(client))
  }

  const addProspect = (data) => {
    const prospect = { id: uid('p'), statut: 'premier_appel', createdAt: new Date().toISOString().slice(0, 10), sim: { typeProjet: '1.0', coutM2: 12000, complexite: '1.1', risque: '1.30', tjh: 250, marge: 30 }, devisMissions: [], ...data }
    setProspects(prev => [prospect, ...prev])
    sbUpsert('prospects', toDbProspect(prospect))
    if (prospect.statut === 'contrat_signe') {
      ensureClientForProspect(prospect)
    }
    return prospect
  }

  const updateProspect = (id, updates) => {
    setProspects(prev => {
      const next = prev.map(p => p.id === id ? { ...p, ...updates } : p)
      const updated = next.find(p => p.id === id)
      if (updated) sbUpsert('prospects', toDbProspect(updated))
      return next
    })
    if (updates.statut === 'contrat_signe') {
      const existing = stateRef.current.prospects || []
      const prospect = { ...(existing.find(p => p.id === id) || {}), id, ...updates }
      ensureClientForProspect(prospect)
    }
  }

  const deleteProspect = (id) => {
    setProspects(prev => prev.filter(p => p.id !== id))
    // Clients table entry is intentionally kept — business relationship data is preserved
    sbDelete('prospects', id)
    // Revoke portal access
    supabase?.from('profiles').delete().eq('prospect_id', id).then(({ error }) => {
      if (error) console.warn('[Supabase] deleteProspect→profiles:', error.message)
    })
  }

  const addChargeFixe = (data, by = '') => {
    const charge = { id: `cf${Date.now()}`, ...data }
    setChargesFixe(prev => [charge, ...prev])
    sbUpsert('charges_fixes', toDbChargeFixe(charge))
    logActivity({ action: 'Charge fixe ajoutée', details: `${data.libelle} — ${data.montant} DH/${data.periodicite || 'mois'}`, category: 'finance', by })
    return charge
  }

  const updateChargeFixe = (id, updates) => {
    setChargesFixe(prev => {
      const next = prev.map(c => c.id === id ? { ...c, ...updates } : c)
      const updated = next.find(c => c.id === id)
      if (updated) sbUpsert('charges_fixes', toDbChargeFixe(updated))
      return next
    })
  }

  const deleteChargeFixe = (id, by = '') => {
    const charge = (stateRef.current.chargesFixe || []).find(c => c.id === id)
    logActivity({ action: 'Charge fixe supprimée', details: charge?.libelle || id, category: 'finance', by })
    setChargesFixe(prev => prev.filter(c => c.id !== id))
    sbDelete('charges_fixes', id)
  }

  const updateAgenceSettings = (updates) => {
    setAgenceSettingsState(prev => ({ ...prev, ...updates }))
  }

  const setTauxImpot = (val) => {
    const n = parseFloat(val)
    if (!isNaN(n) && n >= 0 && n <= 100) setTauxImpotState(n)
  }

  const addTransaction = (data, by = '') => {
    const tx = { id: data.id || `tx${Date.now()}`, ...data }
    setTransactions(prev => { const filtered = prev.filter(t => t.id !== tx.id); return [tx, ...filtered] })
    if (!data.auto) sbUpsert('transactions', toDbTransaction(tx))
    if (!data.auto) {
      const dir = data.type === 'entree' ? 'Entrée' : 'Sortie'
      logActivity({ action: `Transaction — ${dir}`, details: `${data.libelle || data.categorie || '—'} · ${Number(data.montant || 0).toLocaleString('fr-MA')} DH`, category: 'finance', by })
    }
    return tx
  }

  const removeTransaction = (id, by = '') => {
    const tx = (stateRef.current.transactions || []).find(t => t.id === id)
    if (tx && !tx.auto) logActivity({ action: 'Transaction supprimée', details: `${tx.libelle || tx.categorie || id} · ${Number(tx.montant || 0).toLocaleString('fr-MA')} DH`, category: 'finance', by })
    setTransactions(prev => prev.filter(t => t.id !== id))
    sbDelete('transactions', id)
  }

  const updateProjectFinances = (projectId, updates) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, finances: { ...(p.finances ?? {}), ...updates } } : p))
  }

  const addProject = (data, by = '') => {
    const project = { id: uid('prj'), avancement: 0, statut: 'En cours', equipe: 0, equipeProjet: [], missions: [], tasks: [], ...data }
    setProjects(prev => [project, ...prev])
    sbUpsert('projects', toDbProject(project))
    if (data.clientId) setClients(prev => prev.map(c => c.id === data.clientId ? { ...c, projets: c.projets + 1 } : c))
    const type = data.typeProjet === 'interne' ? 'interne' : 'externe'
    logActivity({ action: 'Projet créé', details: `${data.nom}${data.client ? ` — ${data.client}` : ''} (${type})`, category: 'project', by })
    return project
  }

  const addClient = (data) => {
    const client = { id: uid('cli'), sante: 85, projets: 0, depuis: new Date().getFullYear().toString(), ca: '€0', ...data }
    setClients(prev => [client, ...prev])
    sbUpsert('clients', toDbClient(client))
    return client
  }

  const addMission = (projectId, mission) => {
    const newMission = { id: `m${Date.now()}`, ...mission }
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p
      const missions = [...(p.missions || []), newMission]
      const computed = calcAvancement(missions)
      const updated = { ...p, missions, avancement: computed !== null ? computed : p.avancement }
      sbUpsert('projects', toDbProject(updated))
      return updated
    }))
  }

  const validateMission = (projectId, missionId) => {
    let missionNom = '', projectNom = '', equipeIds = []
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p
      const mission = p.missions.find(m => m.id === missionId)
      missionNom = mission?.nom || ''; projectNom = p.nom || ''
      equipeIds = (p.equipeProjet || []).map(String)
      const missions = p.missions.map(m => m.id === missionId ? { ...m, statut: 'valide', validatedAt: new Date().toISOString() } : m)
      const avancement = calcAvancement(missions) ?? p.avancement
      const updated = { ...p, missions, avancement }
      sbUpsert('projects', toDbProject(updated))
      return updated
    }))
    if (missionNom) {
      const base = { read: false, createdAt: new Date().toISOString(), type: 'mission_validated', message: `Mission "${missionNom}" validée sur le projet "${projectNom}"`, projectId, missionId }
      const targets = ['director-achraf', ...equipeIds.filter(id => id !== 'director-achraf')]
      const notifs = targets.map(targetUserId => ({ ...base, id: uid('notif'), targetUserId }))
      notifs.forEach(n => sbUpsert('notifications', toDbNotification(n)))
      setNotifications(prev => [...notifs, ...prev])
    }
  }

  const unvalidateMission = (projectId, missionId) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p
      const missions = p.missions.map(m => m.id === missionId ? { ...m, statut: undefined, validatedAt: undefined } : m)
      const avancement = calcAvancement(missions) ?? p.avancement
      const updated = { ...p, missions, avancement }
      sbUpsert('projects', toDbProject(updated))
      return updated
    }))
  }

  const addTask = (projectId, taskData) => {
    const _n = new Date()
    const localDate = `${_n.getFullYear()}-${String(_n.getMonth()+1).padStart(2,'0')}-${String(_n.getDate()).padStart(2,'0')}`
    const task = { id: `t${Date.now()}`, createdAt: localDate, approval: null, files: [], links: [], comments: [], ...taskData }
    setProjects(prev => prev.map(p => {
      if (String(p.id) !== String(projectId)) return p
      const updated = { ...p, tasks: [...(p.tasks || []), task] }
      sbUpsert('projects', toDbProject(updated))
      return updated
    }))
    if (taskData.personnelId) {
      setNotifications(prev => [{ id: uid('notif'), read: false, createdAt: new Date().toISOString(), type: 'new_task', message: `Nouvelle tâche assignée : "${taskData.nom}"`, targetUserId: String(taskData.personnelId), link: '/app' }, ...prev])
    }
    return task
  }

  const updateTask = (projectId, taskId, updates) => {
    const project = projects.find(p => p.id === projectId)
    const task = project?.tasks.find(t => t.id === taskId)
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p
      const updated = { ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t) }
      sbUpsert('projects', toDbProject(updated))
      return updated
    }))
    if (task) {
      if (updates.statut === 'Done' && task.statut !== 'Done') {
        setNotifications(prev => [{ id: uid('notif'), read: false, createdAt: new Date().toISOString(), type: 'task_done', targetUserId: 'director-achraf', message: `✅ Tâche terminée par ${task.personnelNom} : "${task.nom}"`, link: `/app/projects/${projectId}` }, ...prev])
      }
      if (updates.statut === 'Stuck' && task.statut !== 'Stuck') {
        setNotifications(prev => [{ id: uid('notif'), read: false, createdAt: new Date().toISOString(), type: 'task_stuck', targetUserId: 'director-achraf', message: `🚨 Tâche bloquée — ${task.personnelNom} : "${task.nom}"`, link: `/app/projects/${projectId}` }, ...prev])
      }
    }
  }

  const deleteTask = (projectId, taskId) => {
    setProjects(prev => prev.map(p => {
      if (String(p.id) !== String(projectId)) return p
      const updated = { ...p, tasks: (p.tasks || []).filter(t => t.id !== taskId) }
      sbUpsert('projects', toDbProject(updated))
      return updated
    }))
  }

  const addClientFeedback = (projectId, message) => {
    const entry = { id: `cf${Date.now()}`, message: message.trim(), createdAt: new Date().toISOString(), read: false }
    setProjects(prev => prev.map(p => {
      if (String(p.id) !== String(projectId)) return p
      const updated = { ...p, clientFeedback: [...(p.clientFeedback || []), entry] }
      sbUpsert('projects', toDbProject(updated))
      return updated
    }))
    setNotifications(prev => [{ id: uid('notif'), read: false, createdAt: new Date().toISOString(), type: 'client_feedback', targetUserId: 'director-achraf', message: `💬 Nouveau message client sur le projet`, link: `/app/projects/${projectId}` }, ...prev])
  }

  const markClientFeedbackRead = (projectId) => {
    setProjects(prev => prev.map(p => {
      if (String(p.id) !== String(projectId)) return p
      const updated = { ...p, clientFeedback: (p.clientFeedback || []).map(f => ({ ...f, read: true })) }
      sbUpsert('projects', toDbProject(updated))
      return updated
    }))
  }

  const addTaskComment = (projectId, taskId, comment) => {
    const newComment = { id: `cmt${Date.now()}`, createdAt: new Date().toISOString(), ...comment }
    const project = projects.find(p => p.id === projectId)
    const task = project?.tasks.find(t => t.id === taskId)
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p
      const updated = { ...p, tasks: p.tasks.map(t => t.id !== taskId ? t : { ...t, comments: [...(t.comments || []), newComment] }) }
      sbUpsert('projects', toDbProject(updated))
      return updated
    }))
    if (task?.personnelId && String(comment.authorId) !== String(task.personnelId)) {
      setNotifications(prev => [{ id: uid('notif'), read: false, createdAt: new Date().toISOString(), type: 'task_comment', message: `${comment.authorName} a commenté votre tâche "${task.nom}"`, targetUserId: String(task.personnelId), link: '/app' }, ...prev])
    }
    return newComment
  }

  const updateMission = (projectId, missionId, updates) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p
      const missions = p.missions.map(m => m.id === missionId ? { ...m, ...updates } : m)
      const avancement = calcAvancement(missions) ?? p.avancement
      const updated = { ...p, missions, avancement }
      sbUpsert('projects', toDbProject(updated))
      return updated
    }))
  }

  const deleteMission = (projectId, missionId) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p
      const missions = (p.missions || []).filter(m => m.id !== missionId)
      const avancement = calcAvancement(missions) ?? p.avancement
      const updated = { ...p, missions, avancement }
      sbUpsert('projects', toDbProject(updated))
      return updated
    }))
  }

  const updateProject = (id, updates) => {
    setProjects(prev => {
      const next = prev.map(p => p.id === id ? { ...p, ...updates } : p)
      const updated = next.find(p => p.id === id)
      if (updated) sbUpsert('projects', toDbProject(updated))
      return next
    })
  }

  const deleteProject = (id, by = '') => {
    const proj = (stateRef.current.projects || []).find(p => p.id === id)
    createCheckpoint(proj ? `Avant suppression : ${proj.nom}` : 'Avant suppression projet', 'auto_suppression')
    logActivity({ action: 'Projet supprimé', details: proj?.nom || String(id), category: 'project', by })
    setProjects(prev => prev.filter(p => p.id !== id))
    sbDelete('projects', id)
  }

  const updateProjectEquipe = (projectId, equipeIds) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p
      const updated = { ...p, equipeProjet: equipeIds }
      sbUpsert('projects', toDbProject(updated))
      return updated
    }))
  }

  const addLivrable = (projectId, livrable) => {
    const item = { id: `livrable_${Date.now()}`, addedAt: new Date().toISOString(), ...livrable }
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p
      const updated = { ...p, livrables: [...(p.livrables || []), item] }
      sbUpsert('projects', toDbProject(updated))
      return updated
    }))
  }

  const updateLivrable = (projectId, livrableId, updates) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p
      const updated = { ...p, livrables: (p.livrables || []).map(l => l.id === livrableId ? { ...l, ...updates, updatedAt: new Date().toISOString() } : l) }
      sbUpsert('projects', toDbProject(updated))
      return updated
    }))
  }

  const deleteLivrable = (projectId, livrableId) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p
      const updated = { ...p, livrables: (p.livrables || []).filter(l => l.id !== livrableId) }
      sbUpsert('projects', toDbProject(updated))
      return updated
    }))
  }

  const syncDept = (dept) => {
    if (dept?.trim() && supabase) {
      supabase.from('departements').upsert({ nom: dept.trim() }, { onConflict: 'nom', ignoreDuplicates: true })
        .then(({ error }) => { if (error) console.warn('[syncDept]', error.message) })
    }
  }

  const addEmploye = async (data, by = '') => {
    const employe = { id: uid('emp'), statut: 'actif', credentials: null, planning: [], conges: { solde: 25, history: [] }, ...data }
    setEmployes(prev => [employe, ...prev])
    sbUpsert('employes', toDbEmploye(employe))
    syncDept(data.dept)
    logActivity({ action: 'Employé ajouté', details: `${data.nom}${data.poste ? ` — ${data.poste}` : ''}`, category: 'employe', by })
    // Créer le compte Supabase Auth si des credentials sont fournis
    if (data.credentials?.password && data.email) {
      try {
        await createSupabaseUser({
          email: data.email,
          password: data.credentials.password,
          role: data.role || 'architecte',
          username: data.credentials.username,
          fullName: data.nom,
          employeId: employe.id,
        })
      } catch (err) {
        console.warn('[Auth] Création compte employé Supabase échouée:', err.message)
      }
    }
    return employe
  }

  const updateEmploye = (id, updates) => {
    const emp = (stateRef.current.employes || []).find(e => e.id === id)
    if (updates.dept) syncDept(updates.dept)
    setEmployes(prev => {
      const next = prev.map(e => e.id === id ? { ...e, ...updates } : e)
      const updated = next.find(e => e.id === id)
      if (updated) sbUpsert('employes', toDbEmploye(updated))
      return next
    })
    if (updates.statut === 'bloque') {
      logActivity({ action: 'Accès collaborateur bloqué', details: emp?.nom || id, category: 'employe' })
    } else if (updates.statut === 'actif' && emp?.statut === 'bloque') {
      logActivity({ action: 'Accès collaborateur rétabli', details: emp?.nom || id, category: 'employe' })
    }
  }

  const addEvaluation = (empId, evalData) => {
    setEmployes(prev => prev.map(e => {
      if (String(e.id) !== String(empId)) return e
      const updated = { ...e, evaluations: [...(e.evaluations || []), { ...evalData, id: String(Date.now()) }] }
      sbUpsert('employes', toDbEmploye(updated))
      return updated
    }))
  }

  const updateEvaluation = (empId, evalId, data) => {
    setEmployes(prev => prev.map(e => {
      if (String(e.id) !== String(empId)) return e
      const updated = { ...e, evaluations: (e.evaluations || []).map(ev => String(ev.id) === String(evalId) ? { ...ev, ...data } : ev) }
      sbUpsert('employes', toDbEmploye(updated))
      return updated
    }))
  }

  const deleteEvaluation = (empId, evalId) => {
    setEmployes(prev => prev.map(e => {
      if (String(e.id) !== String(empId)) return e
      const updated = { ...e, evaluations: (e.evaluations || []).filter(ev => String(ev.id) !== String(evalId)) }
      sbUpsert('employes', toDbEmploye(updated))
      return updated
    }))
  }

  const deleteEmploye = (id, by = '') => {
    if (id === 'director-achraf') return
    const emp = (stateRef.current.employes || []).find(e => e.id === id)
    createCheckpoint(emp ? `Avant suppression : ${emp.nom}` : 'Avant suppression employé', 'auto_suppression')
    logActivity({ action: 'Employé supprimé', details: emp?.nom || String(id), category: 'employe', by })
    setEmployes(prev => prev.filter(e => e.id !== id))
    sbDelete('employes', id)
    supabase?.from('profiles').delete().eq('employe_id', String(id)).then(({ error }) => {
      if (error) console.warn('[Supabase] deleteEmploye→profiles:', error.message)
    })
  }

  const addPlanningEvent = (employeId, event) => {
    setEmployes(prev => prev.map(e => {
      if (e.id !== employeId) return e
      const updated = { ...e, planning: [...(e.planning || []), event] }
      sbUpsert('employes', toDbEmploye(updated))
      return updated
    }))
  }

  const deletePlanningEvent = (employeId, eventId) => {
    setEmployes(prev => prev.map(e => {
      if (e.id !== employeId) return e
      const updated = { ...e, planning: (e.planning || []).filter(ev => ev.id !== eventId) }
      sbUpsert('employes', toDbEmploye(updated))
      return updated
    }))
  }

  const updatePlanningEvent = (employeId, eventId, updates) => {
    setEmployes(prev => prev.map(e => {
      if (e.id !== employeId) return e
      const updated = { ...e, planning: (e.planning || []).map(ev => ev.id === eventId ? { ...ev, ...updates } : ev) }
      sbUpsert('employes', toDbEmploye(updated))
      return updated
    }))
  }

  const updateGroupPlanningEvent = (groupId, updates) => {
    setEmployes(prev => {
      const next = prev.map(e => ({ ...e, planning: (e.planning || []).map(ev => ev.groupId === groupId ? { ...ev, ...updates } : ev) }))
      next.forEach(e => sbUpsert('employes', toDbEmploye(e)))
      return next
    })
  }

  const deleteGroupPlanningEvent = (groupId) => {
    setEmployes(prev => {
      const next = prev.map(e => ({ ...e, planning: (e.planning || []).filter(ev => ev.groupId !== groupId) }))
      next.forEach(e => sbUpsert('employes', toDbEmploye(e)))
      return next
    })
  }

  const addFormation = (data, by = '') => {
    const f = { id: `form${Date.now()}`, ...data }
    setFormations(prev => [f, ...prev])
    sbUpsert('formations', toDbFormation(f))
    logActivity({ action: 'Formation créée', details: `${data.nom}${data.date ? ` — ${data.date}` : ''}`, category: 'formation', by })
    return f
  }

  const updateFormation = (id, updates) => {
    setFormations(prev => {
      const next = prev.map(f => f.id === id ? { ...f, ...updates } : f)
      const updated = next.find(f => f.id === id)
      if (updated) sbUpsert('formations', toDbFormation(updated))
      return next
    })
  }

  const deleteFormation = (id) => {
    setFormations(prev => prev.filter(f => f.id !== id))
    sbDelete('formations', id)
  }

  const addCategorieCollab = (nom) => {
    const cat = { id: `cat${Date.now()}`, nom: nom.trim() }
    setCategoriesCollab(prev => [...prev, cat])
    sbUpsert('categories_collab', cat)
    return cat
  }

  const deleteCategorieCollab = (id) => {
    setCategoriesCollab(prev => prev.filter(c => c.id !== id))
    setCollaborateurs(prev => prev.filter(c => c.categorieId !== id))
    sbDelete('categories_collab', id)
    sbDeleteWhere('collaborateurs', 'categorie_id', id)
  }

  const addCollaborateur = (data, by = '') => {
    const collab = { id: `co${Date.now()}`, ...data }
    setCollaborateurs(prev => [collab, ...prev])
    sbUpsert('collaborateurs', toDbCollaborateur(collab))
    logActivity({ action: 'Collaborateur ajouté', details: `${data.nom}${data.specialite ? ` — ${data.specialite}` : ''}`, category: 'collab', by })
    return collab
  }

  const updateCollaborateur = (id, updates) => {
    setCollaborateurs(prev => {
      const next = prev.map(c => c.id === id ? { ...c, ...updates } : c)
      const updated = next.find(c => c.id === id)
      if (updated) sbUpsert('collaborateurs', toDbCollaborateur(updated))
      return next
    })
  }

  const deleteCollaborateur = (id, by = '') => {
    const c = (stateRef.current.collaborateurs || []).find(co => co.id === id)
    logActivity({ action: 'Collaborateur supprimé', details: c?.nom || String(id), category: 'collab', by })
    setCollaborateurs(prev => prev.filter(co => co.id !== id))
    sbDelete('collaborateurs', id)
  }

  const addMessage = (data) => {
    const msg = { id: uid('msg'), timestamp: new Date().toISOString(), ...data }
    setMessages(prev => [...prev, msg])
    sbUpsert('messages', toDbMessage(msg))
    const convId = data.conversationId
    const senderStr = String(data.senderId)
    const ts = new Date().toISOString()
    const makeNotif = (targetUserId, message, link) => ({ id: `notif${Date.now()}_${Math.random().toString(36).slice(2, 5)}`, read: false, createdAt: ts, type: 'new_message', message, targetUserId, link })
    if (convId?.startsWith('dm_')) {
      const recipientId = convId.replace('dm_', '')
      if (recipientId !== senderStr) setNotifications(prev => [makeNotif(recipientId, `Nouveau message de ${data.senderName || 'Équipe'}`, '/app/messages'), ...prev])
    } else if (convId?.startsWith('cdm_')) {
      const prospect = prospects.find(p => convId.startsWith(`cdm_${p.id}_`))
      const staffId = prospect ? convId.replace(`cdm_${prospect.id}_`, '') : null
      if (data.senderRole === 'staff' && prospect) setNotifications(prev => [makeNotif(`client:${prospect.id}`, `Nouveau message de ${data.senderName || "l'équipe"}`, `/client/messages?conv=${convId}`), ...prev])
      else if (data.senderRole === 'client' && staffId && staffId !== senderStr) setNotifications(prev => [makeNotif(staffId, `Nouveau message de ${data.senderName || 'Client'}`, `/app/messages?conv=${convId}`), ...prev])
    } else if (convId?.startsWith('grp_')) {
      const systemMsg = messages.find(m => m.conversationId === convId && m.type === 'group_created')
      const members = systemMsg?.members || []
      const newNotifs = members.filter(id => id !== senderStr).map(memberId => memberId.startsWith('client:') ? makeNotif(memberId, `Nouveau message de ${data.senderName || 'Équipe'}`, '/client/messages') : makeNotif(memberId, `Nouveau message de ${data.senderName || 'Équipe'}`, '/app/messages'))
      if (newNotifs.length > 0) setNotifications(prev => [...newNotifs, ...prev])
    } else if (convId?.startsWith('cgrp_')) {
      const systemMsg = messages.find(m => m.conversationId === convId && m.type === 'group_created')
      const members = systemMsg?.members || []
      const newNotifs = members.filter(id => id !== senderStr).map(memberId => makeNotif(memberId, `Nouveau message de ${data.senderName || 'Client'}`, '/app/messages'))
      if (newNotifs.length > 0) setNotifications(prev => [...newNotifs, ...prev])
    } else if (convId?.startsWith('client_')) {
      const prospectId = convId.replace('client_', '')
      if (data.senderRole === 'staff') setNotifications(prev => [makeNotif(`client:${prospectId}`, `Nouveau message de ${data.senderName || "l'équipe"}`, `/client/messages?conv=${convId}`), ...prev])
      else if (data.senderRole === 'client') {
        const prospectId = convId.replace('client_', '')
        const linkedProject = projects.find(p => String(p.prospectId) === prospectId || String(p.clientId) === prospectId)
        const teamIds = new Set((linkedProject?.equipeProjet || []).map(String))
        const director = employes.find(e => e.id === 'director-achraf' || e.role === 'directeur')
        if (director) teamIds.add(String(director.id))
        teamIds.delete(senderStr)
        const newNotifs = [...teamIds].map(id => makeNotif(id, `Nouveau message de ${data.senderName || 'Client'}`, `/app/messages?conv=${convId}`))
        if (newNotifs.length > 0) setNotifications(prev => [...newNotifs, ...prev])
      }
    }
    return msg
  }

  const editMessage = (messageId, newContent) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: newContent, editedAt: new Date().toISOString() } : m))
    if (supabase) supabase.from('messages').update({ content: newContent, edited_at: new Date().toISOString() }).eq('id', messageId)
      .then(({ error }) => { if (error) console.warn('[editMessage] Supabase sync failed:', error.message) })
  }

  const deleteMessage = (messageId, deleteForAll, userId) => {
    if (deleteForAll) {
      setMessages(prev => prev.filter(m => m.id !== messageId))
      sbDelete('messages', messageId)
    } else {
      setHiddenMessages(prev => ({ ...prev, [userId]: [...new Set([...(prev[userId] || []), messageId])] }))
    }
  }

  const markConvRead = (userId, convId) => {
    setMsgReadState(prev => ({ ...prev, [userId]: { ...(prev[userId] || {}), [convId]: new Date().toISOString() } }))
  }

  const deleteConversation = (conversationId, deleteForAll, userId) => {
    if (deleteForAll) {
      setMessages(prev => prev.filter(m => m.conversationId !== conversationId))
      sbDeleteWhere('messages', 'conversation_id', conversationId)
    } else {
      const hiddenAt = new Date().toISOString()
      setHiddenConvs(prev => { const existing = (prev[userId] || []).filter(h => h.convId !== conversationId); return { ...prev, [userId]: [...existing, { convId: conversationId, hiddenAt }] } })
    }
  }

  const DEMANDE_LABELS = { conge: 'congé', absence: 'absence', arret_maladie: 'arrêt maladie', attestation: 'attestation de travail', attestation_salaire: 'attestation de salaire', autre: 'demande', demission: 'démission' }
  const MANAGER_VISIBLE_TYPES = ['conge', 'absence', 'arret_maladie', 'demission']

  const addDemandeRH = (data) => {
    const emp = employes.find(e => String(e.id) === String(data.employeId))
    const managerId = emp?.managerId || null
    const isLeave = ['conge', 'absence', 'arret_maladie'].includes(data.type)
    const dem = { id: `dem${Date.now()}`, statut: 'en_attente', managerApproval: (isLeave && managerId) ? 'en_attente' : 'non_requis', rhApproval: 'en_attente', managerId: managerId || null, createdAt: new Date().toISOString(), processedAt: null, commentaireRH: null, ...data }
    setDemandesRH(prev => [dem, ...prev])
    sbUpsert('demandes_rh', toDbDemandeRH(dem))
    const notifs = []
    const isLeaveType = MANAGER_VISIBLE_TYPES.includes(data.type)
    // Notify the manager if there's one and the request is a leave type
    if (isLeaveType && managerId) {
      const label = data.type === 'demission' ? `Démission de ${data.employeNom}` : `Demande de congé de ${data.employeNom} — approbation requise`
      notifs.push({ id: uid('notif'), read: false, createdAt: new Date().toISOString(), type: 'new_request', message: label, targetUserId: String(managerId), link: '/app/my-team' })
    }
    // Notify director for non-leave types, or when there's no manager
    if (!isLeaveType || !managerId) {
      notifs.push({ id: uid('notif'), read: false, createdAt: new Date().toISOString(), type: 'new_request', message: `Demande de ${data.employeNom} : ${DEMANDE_LABELS[data.type] || data.type}`, targetUserId: 'director-achraf', link: '/app/hr' })
    }
    if (notifs.length > 0) setNotifications(prev => [...notifs, ...prev])
    return dem
  }

  const approveDemandeRHManager = (id, decision, comment = null) => {
    const dem = demandesRH.find(d => d.id === id)
    if (!dem) return
    const rhDone = dem.rhApproval === 'approuve'
    const newManagerApproval = decision
    const newStatut = decision === 'refuse' ? 'refuse' : (rhDone ? 'approuve' : 'en_attente')
    setDemandesRH(prev => {
      const next = prev.map(d => d.id === id ? { ...d, managerApproval: newManagerApproval, statut: newStatut, commentaireManager: comment } : d)
      const updated = next.find(d => d.id === id)
      if (updated) sbUpsert('demandes_rh', toDbDemandeRH(updated))
      return next
    })
    if (newStatut === 'approuve') _finalizeApprovedLeave(dem)
    let label = decision === 'approuve' ? (rhDone ? 'approuvée définitivement ✓' : 'approuvée par votre responsable — en attente de validation RH finale') : 'refusée par votre responsable'
    setNotifications(prev => [{ id: uid('notif'), read: false, createdAt: new Date().toISOString(), type: 'request_processed', message: `Votre demande de ${DEMANDE_LABELS[dem.type] || 'demande'} a été ${label}`, targetUserId: String(dem.employeId), link: '/app' }, ...prev])
    if (decision === 'approuve' && !rhDone) setNotifications(prev => [{ id: uid('notif'), read: false, createdAt: new Date().toISOString(), type: 'new_request', message: `Demande de ${dem.employeNom} approuvée par responsable — en attente RH`, forHR: true, link: '/app/hr' }, ...prev])
  }

  const _finalizeApprovedLeave = (dem) => {
    if (!['conge', 'arret_maladie', 'absence'].includes(dem.type)) return
    const dateDebut = dem.dateDebut
    const dateFin = dem.dateFin || dem.dateDebut
    const d1 = new Date(dateDebut), d2 = new Date(dateFin)
    const duree = Math.max(1, Math.round((d2 - d1) / 86400000) + 1)
    const congeEntry = { id: `c_dem_${dem.id}`, type: DEMANDE_LABELS[dem.type] || dem.type, debut: dateDebut, fin: dateFin, duree, statut: 'Approuvé', fromDemande: dem.id }
    const planningEvent = { id: `ev${Date.now()}`, titre: DEMANDE_LABELS[dem.type] || dem.type, date: dateDebut, dateFin, heureDebut: '00:00', heureFin: '23:59', couleur: dem.type === 'arret_maladie' ? '#F43F5E' : '#F59E0B', type: dem.type, fromDemande: dem.id }
    setEmployes(prev => prev.map(e => {
      if (String(e.id) !== String(dem.employeId)) return e
      const alreadyInHistory = (e.conges?.history || []).some(c => c.fromDemande === dem.id)
      const leaveStartsToday = dem.dateDebut <= new Date().toISOString().slice(0, 10)
      const updated = { ...e, planning: [...(e.planning || []), planningEvent], statut: (dem.type === 'conge' && leaveStartsToday) ? 'conge' : e.statut, conges: { ...e.conges, history: alreadyInHistory ? (e.conges?.history || []) : [...(e.conges?.history || []), congeEntry] } }
      sbUpsert('employes', toDbEmploye(updated))
      return updated
    }))
  }

  const updateDemandeRH = (id, updates) => {
    const dem = demandesRH.find(d => d.id === id)
    if (!dem) return
    let finalUpdates = { ...updates, processedAt: new Date().toISOString() }
    if (updates.statut === 'approuve') {
      finalUpdates.rhApproval = 'approuve'
      const managerOk = dem.managerApproval === 'approuve' || dem.managerApproval === 'non_requis'
      if (!managerOk) { finalUpdates.statut = 'en_attente'; finalUpdates.rhApproval = 'approuve' }
    } else if (updates.statut === 'refuse') {
      finalUpdates.rhApproval = 'refuse'
    }
    setDemandesRH(prev => {
      const next = prev.map(d => d.id === id ? { ...d, ...finalUpdates } : d)
      const updated = next.find(d => d.id === id)
      if (updated) sbUpsert('demandes_rh', toDbDemandeRH(updated))
      return next
    })
    if (finalUpdates.statut === 'approuve') _finalizeApprovedLeave(dem)
    if (updates.statut && dem) {
      let label = updates.statut === 'approuve' ? (finalUpdates.statut === 'approuve' ? 'définitivement approuvée par le RH ✓' : 'approuvée par le RH — en attente de votre responsable') : 'refusée par le RH'
      setNotifications(prev => [{ id: uid('notif'), read: false, createdAt: new Date().toISOString(), type: 'request_processed', message: `Votre demande de ${DEMANDE_LABELS[dem.type] || 'demande'} a été ${label}`, targetUserId: String(dem.employeId), link: '/app' }, ...prev])
    }
  }

  const deleteDemandeRH = (id) => {
    setDemandesRH(prev => prev.filter(d => d.id !== id))
    sbDelete('demandes_rh', id)
  }

  const archiveDemandeForManager = (id, managerId) => {
    setDemandesRH(prev => {
      const next = prev.map(d => d.id === id ? { ...d, archivedByManagers: [...(d.archivedByManagers || []), String(managerId)] } : d)
      const updated = next.find(d => d.id === id)
      if (updated) sbUpsert('demandes_rh', toDbDemandeRH(updated))
      return next
    })
  }

  const addNotification = (data) => {
    const notif = { id: uid('notif'), read: false, createdAt: new Date().toISOString(), ...data }
    setNotifications(prev => [notif, ...prev])
    sbUpsert('notifications', toDbNotification(notif))
    return notif
  }

  const markAllNotificationsRead = () => {
    const ids = notifications.filter(n => !n.read).map(n => n.id)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    if (supabase && ids.length) supabase.from('notifications').update({ read: true }).in('id', ids)
      .then(({ error }) => { if (error) console.warn('[markAllRead] Supabase sync failed:', error.message) })
  }

  const markNotificationsReadForTarget = (targetUserId) => {
    setNotifications(prev => prev.map(n => n.targetUserId === targetUserId ? { ...n, read: true } : n))
    if (supabase) supabase.from('notifications').update({ read: true }).eq('target_user_id', targetUserId).eq('read', false)
      .then(({ error }) => { if (error) console.warn('[markReadForTarget] Supabase sync failed:', error.message) })
  }

  const deleteNotification = (notifId) => {
    setNotifications(prev => prev.filter(n => n.id !== notifId))
    sbDelete('notifications', notifId)
  }

  const updateConceptImages = (projectId, images) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p
      const prev_concept = p.concept || {}
      const updated = { ...p, concept: { images: [], questions: [], clientResponse: null, ...prev_concept, images } }
      sbUpsert('projects', toDbProject(updated))
      return updated
    }))
  }

  const updateConceptQuestions = (projectId, questions) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p
      const prev_concept = p.concept || {}
      const updated = { ...p, concept: { images: [], questions: [], clientResponse: null, ...prev_concept, questions } }
      sbUpsert('projects', toDbProject(updated))
      return updated
    }))
  }

  const saveConceptResponse = (projectId, response) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p
      const updated = { ...p, concept: { ...(p.concept || {}), clientResponse: response } }
      sbUpsert('projects', toDbProject(updated))
      return updated
    }))
  }

  const clearConceptResponse = (projectId) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p
      const updated = { ...p, concept: { ...(p.concept || {}), clientResponse: null } }
      sbUpsert('projects', toDbProject(updated))
      return updated
    }))
  }

  const updateProgramme = (projectId, data) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p
      const updated = { ...p, programme: { ...(p.programme || {}), ...data } }
      sbUpsert('projects', toDbProject(updated))
      return updated
    }))
  }

  const updateEstimation = (projectId, data) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p
      const updated = { ...p, estimation: { ...(p.estimation || {}), ...data } }
      sbUpsert('projects', toDbProject(updated))
      return updated
    }))
  }

  const setupEmployeePortal = async (empId, credentials) => {
    const emp = (stateRef.current.employes || []).find(e => String(e.id) === String(empId))
    if (!emp) return
    logActivity({ action: 'Compte collaborateur créé', details: `${emp.nom} — @${credentials.username}`, category: 'employe' })
    // Mettre à jour les credentials dans l'employé
    setEmployes(prev => {
      const next = prev.map(e => String(e.id) === String(empId) ? { ...e, credentials } : e)
      const updated = next.find(e => String(e.id) === String(empId))
      if (updated) sbUpsert('employes', toDbEmploye(updated))
      return next
    })
    // Créer le compte Supabase Auth
    const email = emp.email || `${credentials.username}@clade.ma`
    try {
      await createSupabaseUser({
        email,
        password: credentials.password,
        role: emp.role || 'architecte',
        username: credentials.username,
        fullName: emp.nom,
        employeId: empId,
      })
    } catch (err) {
      // Compte peut-être déjà existant — on ignore l'erreur "User already registered"
      if (!err.message?.includes('already')) {
        console.warn('[Auth] Création compte employé Supabase échouée:', err.message)
        throw err
      }
    }
  }

  const setupClientPortal = async (prospectId, credentials) => {
    const prospect = (stateRef.current.prospects || []).find(p => p.id === prospectId)
    if (!prospect) return
    logActivity({ action: 'Compte client créé', details: `${prospect.prenom || ''} ${prospect.nom || ''} — @${credentials.username}`.trim(), category: 'client' })
    // Mettre à jour les credentials dans le prospect
    setProspects(prev => prev.map(p => {
      if (p.id !== prospectId) return p
      const updated = { ...p, clientCredentials: credentials }
      sbUpsert('prospects', toDbProspect(updated))
      return updated
    }))
    // Créer le compte Supabase Auth
    const email = prospect.email || `${credentials.username}@client.clade.ma`
    try {
      await createSupabaseUser({
        email,
        password: credentials.password,
        role: 'client',
        username: credentials.username,
        fullName: `${prospect.prenom || ''} ${prospect.nom || ''}`.trim(),
        prospectId,
      })
    } catch (err) {
      if (!err.message?.includes('already')) {
        console.warn('[Auth] Création compte client Supabase échouée:', err.message)
        throw err
      }
    }
  }

  const blockClientPortal = (prospectId) => {
    const prospect = (stateRef.current.prospects || []).find(p => p.id === prospectId)
    logActivity({ action: 'Accès client bloqué', details: `${prospect?.prenom || ''} ${prospect?.nom || ''}`.trim() || prospectId, category: 'client' })
    updateProspect(prospectId, { portalBlocked: true })
  }

  const unblockClientPortal = async (prospectId) => {
    const prospect = (stateRef.current.prospects || []).find(p => p.id === prospectId)
    logActivity({ action: 'Accès client rétabli', details: `${prospect?.prenom || ''} ${prospect?.nom || ''}`.trim() || prospectId, category: 'client' })
    updateProspect(prospectId, { portalBlocked: false })
  }

  const addClientExpense = (prospectId, expense) => {
    const exp = { id: `exp${Date.now()}`, ...expense }
    setProspects(prev => prev.map(p => {
      if (p.id !== prospectId) return p
      const updated = { ...p, clientExpenses: [...(p.clientExpenses || []), exp] }
      sbUpsert('prospects', toDbProspect(updated))
      return updated
    }))
    return exp
  }

  const deleteClientExpense = (prospectId, expenseId) => {
    setProspects(prev => prev.map(p => {
      if (p.id !== prospectId) return p
      const updated = { ...p, clientExpenses: (p.clientExpenses || []).filter(e => e.id !== expenseId) }
      sbUpsert('prospects', toDbProspect(updated))
      return updated
    }))
  }

  const addProspectRdv = (prospectId, rdv) => {
    const newRdv = { id: `rdv${Date.now()}`, ...rdv }
    setProspects(prev => prev.map(p => {
      if (p.id !== prospectId) return p
      const updated = { ...p, rdvs: [...(p.rdvs || []), newRdv] }
      sbUpsert('prospects', toDbProspect(updated))
      return updated
    }))
    return newRdv
  }

  const deleteProspectRdv = (prospectId, rdvId) => {
    setProspects(prev => prev.map(p => {
      if (p.id !== prospectId) return p
      const updated = { ...p, rdvs: (p.rdvs || []).filter(r => r.id !== rdvId) }
      sbUpsert('prospects', toDbProspect(updated))
      return updated
    }))
  }

  const addCongeEmploye = (employeId, conge) => {
    setEmployes(prev => prev.map(e => {
      if (e.id !== employeId) return e
      const updated = { ...e, conges: { ...e.conges, history: [...(e.conges?.history || []), conge] } }
      sbUpsert('employes', toDbEmploye(updated))
      return updated
    }))
  }

  const addRecrutement = (data) => {
    const rec = { id: uid('rec'), statut: 'ouvert', candidats: [], createdAt: new Date().toISOString().slice(0, 10), ...data }
    setRecrutements(prev => [rec, ...prev])
    sbUpsert('recrutements', toDbRecrutement(rec))
    syncDept(data.dept)
    return rec
  }

  const updateRecrutement = (id, updates) => {
    setRecrutements(prev => {
      const next = prev.map(r => r.id === id ? { ...r, ...updates } : r)
      const updated = next.find(r => r.id === id)
      if (updated) sbUpsert('recrutements', toDbRecrutement(updated))
      return next
    })
  }

  const deleteRecrutement = (id) => {
    setRecrutements(prev => prev.filter(r => r.id !== id))
    sbDelete('recrutements', id)
  }

  const addCandidat = (recrutementId, candidatData) => {
    const cand = { id: `cand${Date.now()}`, statut: 'recu', entretien: null, cv: null, portfolio: null, createdAt: new Date().toISOString().slice(0, 10), ...candidatData }
    setRecrutements(prev => {
      const next = prev.map(r => r.id === recrutementId ? { ...r, candidats: [...(r.candidats || []), cand] } : r)
      const updated = next.find(r => r.id === recrutementId)
      if (updated) sbUpsert('recrutements', toDbRecrutement(updated))
      return next
    })
    return cand
  }

  const updateCandidat = (recrutementId, candidatId, updates, { intervieweurId, entretienEvent } = {}) => {
    if (updates.statut === 'accepte') {
      const rec = recrutements.find(r => r.id === recrutementId)
      const cand = rec?.candidats.find(c => c.id === candidatId)
      if (cand) {
        const nom = `${cand.prenom} ${cand.nom}`
        const av = ((cand.prenom?.[0] || '') + (cand.nom?.[0] || '')).toUpperCase()
        setEmployes(prev => {
          if (prev.find(e => e.email === cand.email)) return prev
          const newEmp = { id: Date.now(), nom, prenom: cand.prenom, nomFamille: cand.nom, avatar: av, poste: rec.intitule, dept: rec.dept || '—', email: cand.email, telephone: cand.telephone || '', contrat: 'CDI', salaireNet: Number(cand.pretentionSalariale) || 0, salaireBrut: 0, statut: 'actif', planning: [], conges: { solde: 25, history: [] }, workSessions: [], credentials: null, fromRecruitment: recrutementId }
          sbUpsert('employes', toDbEmploye(newEmp))
          return [newEmp, ...prev]
        })
      }
    }
    if (intervieweurId && entretienEvent) {
      setEmployes(prev => prev.map(e => {
        if (String(e.id) !== String(intervieweurId)) return e
        const updated = { ...e, planning: [...(e.planning || []), entretienEvent] }
        sbUpsert('employes', toDbEmploye(updated))
        return updated
      }))
    }
    setRecrutements(prev => {
      const next = prev.map(r => r.id === recrutementId ? { ...r, candidats: (r.candidats || []).map(c => c.id === candidatId ? { ...c, ...updates } : c) } : r)
      const updated = next.find(r => r.id === recrutementId)
      if (updated) sbUpsert('recrutements', toDbRecrutement(updated))
      return next
    })
  }

  const deleteCandidat = (recrutementId, candidatId) => {
    setRecrutements(prev => {
      const next = prev.map(r => r.id === recrutementId ? { ...r, candidats: (r.candidats || []).filter(c => c.id !== candidatId) } : r)
      const updated = next.find(r => r.id === recrutementId)
      if (updated) sbUpsert('recrutements', toDbRecrutement(updated))
      return next
    })
  }

  const addWorkflow = useCallback((data) => {
    const wf = { id: `wf_${Date.now()}`, blocks: [], sharedWith: [], ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    setWorkflows(prev => [wf, ...prev])
    sbUpsert('workflows', toDbWorkflow(wf))
    return wf.id
  }, [])

  const updateWorkflow = useCallback((id, data, { saveVersion = false, savedByNom = '' } = {}) => {
    setWorkflows(prev => {
      const next = prev.map(w => {
        if (w.id !== id) return w
        let versions = w.versions || []
        if (saveVersion && (w.title || w.blocks?.length)) {
          const lastV = versions[0]
          const today = new Date().toDateString()
          const lastVDay = lastV ? new Date(lastV.savedAt).toDateString() : null
          const isNewDay = !lastV || lastVDay !== today
          const contentChanged = !lastV || lastV.title !== w.title || JSON.stringify(lastV.blocks) !== JSON.stringify(w.blocks)
          if (contentChanged && isNewDay) versions = [{ versionId: `v_${Date.now()}`, savedAt: new Date().toISOString(), savedByNom, title: w.title, blocks: w.blocks || [] }, ...versions].slice(0, 10)
        }
        const updated = { ...w, ...data, versions, updatedAt: new Date().toISOString() }
        sbUpsert('workflows', toDbWorkflow(updated))
        return updated
      })
      return next
    })
  }, [])

  const restoreWorkflowVersion = useCallback((workflowId, versionId) => {
    setWorkflows(prev => prev.map(w => {
      if (w.id !== workflowId) return w
      const version = (w.versions || []).find(v => v.versionId === versionId)
      if (!version) return w
      const currentSnap = { versionId: `v_${Date.now()}`, savedAt: new Date().toISOString(), savedByNom: '(avant restauration)', title: w.title, blocks: w.blocks || [] }
      const versions = [currentSnap, ...(w.versions || [])].slice(0, 20)
      const updated = { ...w, title: version.title, blocks: version.blocks, versions, updatedAt: new Date().toISOString() }
      sbUpsert('workflows', toDbWorkflow(updated))
      return updated
    }))
  }, [])

  const deleteWorkflow = useCallback((id) => {
    setWorkflows(prev => {
      const next = prev.map(w => w.id === id ? { ...w, deletedAt: new Date().toISOString() } : w)
      const updated = next.find(w => w.id === id)
      if (updated) sbUpsert('workflows', toDbWorkflow(updated))
      return next
    })
  }, [])

  const restoreWorkflow = useCallback((id) => {
    setWorkflows(prev => {
      const next = prev.map(w => w.id === id ? { ...w, deletedAt: null } : w)
      const updated = next.find(w => w.id === id)
      if (updated) sbUpsert('workflows', toDbWorkflow(updated))
      return next
    })
  }, [])

  const permanentDeleteWorkflow = useCallback((id) => {
    setWorkflows(prev => prev.filter(w => w.id !== id))
    sbDelete('workflows', id)
  }, [])

  useEffect(() => {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    setWorkflows(prev => prev.filter(w => !w.deletedAt || w.deletedAt > cutoff))
  }, []) // eslint-disable-line

  const addCandidatureSpont = (data) => {
    const c = { id: uid('cs'), ...data, dateReception: new Date().toISOString().slice(0, 10), statut: 'nouveau' }
    setCandidaturesSpont(prev => [c, ...prev])
    sbUpsert('candidatures_spont', toDbCandidatureSpont(c))
    return c
  }

  const updateCandidatureSpont = (id, updates) => {
    setCandidaturesSpont(prev => {
      const next = prev.map(c => String(c.id) === String(id) ? { ...c, ...updates } : c)
      const updated = next.find(c => String(c.id) === String(id))
      if (updated) sbUpsert('candidatures_spont', toDbCandidatureSpont(updated))
      return next
    })
  }

  const deleteCandidatureSpont = (id) => {
    setCandidaturesSpont(prev => prev.filter(c => String(c.id) !== String(id)))
    sbDelete('candidatures_spont', id)
  }

  const refreshCandidatures = async () => {
    if (!supabase) return
    const { data } = await supabase.from('candidatures_spont').select('*').order('created_at', { ascending: false })
    if (data) setCandidaturesSpont(data.map(fromDbCandidatureSpont))
  }

  const addJourFerie = (data) => {
    const jf = { id: `jf${Date.now()}`, ...data }
    setJoursFerier(prev => [...prev, jf].sort((a, b) => a.date.localeCompare(b.date)))
    sbUpsert('jours_ferier', toDbJourFerie(jf))
    return jf
  }

  const updateJourFerie = (id, updates) => {
    setJoursFerier(prev => {
      const next = prev.map(jf => jf.id === id ? { ...jf, ...updates } : jf).sort((a, b) => a.date.localeCompare(b.date))
      const updated = next.find(jf => jf.id === id)
      if (updated) sbUpsert('jours_ferier', toDbJourFerie(updated))
      return next
    })
  }

  const deleteJourFerie = (id) => {
    setJoursFerier(prev => prev.filter(jf => jf.id !== id))
    sbDelete('jours_ferier', id)
  }

  const addHeureSupManuelle = (employeId, entry) => {
    const newEntry = { id: `hs${Date.now()}`, ...entry }
    setEmployes(prev => prev.map(e => {
      if (e.id !== employeId) return e
      const updated = { ...e, heuresSupManual: [...(e.heuresSupManual || []), newEntry] }
      sbUpsert('employes', toDbEmploye(updated))
      return updated
    }))
    return newEntry
  }

  const deleteHeureSupManuelle = (employeId, entryId) => {
    setEmployes(prev => prev.map(e => {
      if (e.id !== employeId) return e
      const updated = { ...e, heuresSupManual: (e.heuresSupManual || []).filter(h => h.id !== entryId) }
      sbUpsert('employes', toDbEmploye(updated))
      return updated
    }))
  }

  // ── CONTEXT VALUE ─────────────────────────────────────────────────────────
  return (
    <DataContext.Provider value={{
      projects:          demoData ? (demoData.projects          || []) : projects,
      clients:           demoData ? (demoData.clients           || []) : clients,
      employes:          demoData ? (demoData.employes          || []) : employes,
      transactions:      demoData ? (demoData.transactions      || []) : transactions,
      allTransactions:   demoData ? (demoAllTransactions        || []) : allTransactions,
      chargesFixe:       demoData ? (demoData.chargesFixe       || []) : chargesFixe,
      tauxImpot:         demoData ? (demoData.tauxImpot         ?? tauxImpot) : tauxImpot,
      agenceSettings:    demoData ? (demoData.agenceSettings    || agenceSettings) : agenceSettings,
      prospects:         demoData ? (demoData.prospects         || []) : prospects,
      categoriesCollab:  demoData ? (demoData.categoriesCollab  || []) : categoriesCollab,
      collaborateurs:    demoData ? (demoData.collaborateurs    || []) : collaborateurs,
      formations:        demoData ? (demoData.formations        || []) : formations,
      recrutements:      demoData ? (demoData.recrutements      || []) : recrutements,
      messages:          demoData ? (demoData.messages          || []) : messages,
      demandesRH:        demoData ? (demoData.demandesRH        || []) : demandesRH,
      candidaturesSpont: demoData ? (demoData.candidaturesSpont || []) : candidaturesSpont,
      joursFerier:       demoData ? (demoData.joursFerier       || []) : joursFerier,
      workflows:         demoData ? (demoData.workflows         || []) : workflows,
      hiddenMessages:    demoData ? (demoData.hiddenMessages    || {}) : hiddenMessages,
      hiddenConvs:       demoData ? (demoData.hiddenConvs       || {}) : hiddenConvs,
      msgReadState:      demoData ? (demoData.msgReadState      || {}) : msgReadState,
      notifications:     demoData ? (demoData.notifications     || []) : notifications,
      supaLoaded,
      addCategorieCollab, deleteCategorieCollab,
      addCollaborateur, updateCollaborateur, deleteCollaborateur,
      addProspect, updateProspect, deleteProspect,
      addProject, addClient, addMission, updateMission, deleteMission, validateMission, unvalidateMission, addTask, updateTask, deleteTask, updateProject, deleteProject, updateProjectEquipe, addLivrable, updateLivrable, deleteLivrable,
      addEmploye, updateEmploye, deleteEmploye, addEvaluation, updateEvaluation, deleteEvaluation, addPlanningEvent, deletePlanningEvent, updatePlanningEvent, updateGroupPlanningEvent, deleteGroupPlanningEvent, addCongeEmploye,
      addHeureSupManuelle, deleteHeureSupManuelle,
      addFormation, updateFormation, deleteFormation,
      addRecrutement, updateRecrutement, deleteRecrutement,
      addCandidat, updateCandidat, deleteCandidat,
      addTransaction, removeTransaction, updateProjectFinances,
      addChargeFixe, updateChargeFixe, deleteChargeFixe, setTauxImpot, updateAgenceSettings,
      addMessage, editMessage, deleteMessage, deleteConversation, markConvRead,
      addDemandeRH, updateDemandeRH, approveDemandeRHManager, deleteDemandeRH, archiveDemandeForManager,
      addCandidatureSpont, updateCandidatureSpont, deleteCandidatureSpont, refreshCandidatures,
      addJourFerie, updateJourFerie, deleteJourFerie,
      addTaskComment, addClientFeedback, markClientFeedbackRead,
      addNotification, markAllNotificationsRead, markNotificationsReadForTarget, deleteNotification,
      checkpoints, createCheckpoint, restoreCheckpoint, deleteCheckpoint,
      activityLog, logActivity, clearActivityLog, clearActivityLogBefore,
      setupEmployeePortal, setupClientPortal, blockClientPortal, unblockClientPortal,
      addClientExpense, deleteClientExpense, addProspectRdv, deleteProspectRdv,
      updateConceptImages, updateConceptQuestions, saveConceptResponse, clearConceptResponse,
      updateProgramme, updateEstimation,
      addWorkflow, updateWorkflow, deleteWorkflow, restoreWorkflow, permanentDeleteWorkflow, restoreWorkflowVersion,
      demoCheckpoint, enterDemoMode, exitDemoMode, confirmDemoRestore,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData doit être utilisé dans DataProvider')
  return ctx
}
