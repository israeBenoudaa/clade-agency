import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'

export const CLIENT_LANGS = ['fr', 'en', 'es']

export const CLIENT_LANG_LABELS = { fr: 'FR', en: 'EN', es: 'ES' }

const T = {
  fr: {
    // Nav
    'nav.projects':  'Projets',
    'nav.concept':   'Concept',
    'nav.livrables': 'Livrables',
    'nav.expenses':  'Mes Dépenses',
    'nav.messages':  'Messages',
    'nav.rdvs':      'Mes RDVs',
    'portal.title':  'Portail Client',
    'signout':       'Déconnexion',
    'search.placeholder': 'Rechercher dans le portail…',
    'search.no_results': 'Aucun résultat',
    'search.close': 'pour fermer',
    'client': 'Client',
    'cancel': 'Annuler',

    // Common
    'portal.label': '◆ Portail Client',
    'no_data': 'Aucune donnée disponible.',

    // Project page
    'projects.title': 'Mes projets',
    'projects.subtitle': 'Retrouvez ici l\'ensemble de vos projets et leur état d\'avancement en temps réel.',
    'projects.empty': 'Aucun projet pour l\'instant',
    'projects.empty_sub': 'Vos projets apparaîtront ici dès leur création.',
    'projects.completed': 'complété',
    'projects.mission_current': 'Mission en cours :',
    'projects.missions_done': 'Toutes missions validées',
    'projects.missions': 'missions',
    'status.en_cours': 'En cours',
    'status.termine': 'Terminé',
    'status.pause': 'En pause',
    'status.prospect': 'Prospect',

    // RDVs page
    'rdvs.title': 'Mes rendez-vous',
    'rdvs.empty': 'Aucun rendez-vous planifié',
    'rdvs.empty_sub': 'Les rendez-vous créés par votre équipe apparaîtront ici.',
    'rdvs.upcoming': 'À venir',
    'rdvs.past': 'Passés',
    'rdvs.project': 'Projet :',
    'rdvs.join_meet': 'Rejoindre',
    'rdvs.format.meet': 'Google Meet',
    'rdvs.format.telephonique': 'Téléphonique',
    'rdvs.format.presentiel': 'Présentiel',

    // Deliverables page
    'livrables.label': '◆ Bibliothèque projet',
    'livrables.title': 'Vos livrables',
    'livrables.subtitle': 'Plans, documents, modèles et liens Drive mis à votre disposition au fil de l\'avancement.',
    'livrables.total_files': 'Total fichiers',
    'livrables.drive_links': 'Liens Drive',
    'livrables.projects': 'Projets',
    'livrables.empty': 'Aucun livrable pour l\'instant',
    'livrables.empty_sub': 'Les documents et liens partagés apparaîtront ici au fur et à mesure de l\'avancement.',
    'livrables.project': 'Projet',
    'livrables.download': 'Télécharger',
    'livrables.open_link': 'Ouvrir le lien',

    // Expenses page
    'expenses.label': '◆ Suivi financier',
    'expenses.title': 'Mes dépenses',
    'expenses.subtitle': 'Suivi de vos dépenses personnelles et des échéances d\'honoraires à régler.',
    'expenses.add': 'Ajouter une dépense',
    'expenses.add_sub': 'Saisie d\'une dépense projet',
    'expenses.name': 'Nom de la dépense',
    'expenses.company': 'Entreprise / Prestataire',
    'expenses.date': 'Date',
    'expenses.amount': 'Montant (DH)',
    'expenses.submit': 'Ajouter',
    'expenses.delete_confirm': 'Supprimer cette dépense ?',
    'expenses.delete': 'Supprimer',
    'expenses.added': 'Dépense ajoutée',
    'expenses.deleted': 'Dépense supprimée',
    'expenses.my_expenses': 'Mes dépenses',
    'expenses.total': 'Total dépenses',
    'expenses.honoraires': 'Honoraires',
    'expenses.paid': 'Réglé',
    'expenses.remaining': 'Restant',
    'expenses.pending_invoices': 'Échéances en attente',
    'expenses.none': 'Aucune dépense enregistrée',
    'expenses.none_sub': 'Ajoutez vos dépenses liées au projet (frais notariaux, études, etc.)',

    // Concept page
    'concept.label': '✨ Sélection de concept',
    'concept.title': 'Choisissez vos inspirations',
    'concept.hint': 'Glissez à droite si vous aimez, à gauche sinon, vers le haut pour un super like !',
    'concept.done_title': 'Merci pour vos choix !',
    'concept.done_sub': 'Votre sélection a été transmise à votre architecte. Un rapport complet est disponible ci-dessous.',
    'concept.superlikes': 'Super aimées',
    'concept.likes': 'Aimées',
    'concept.dislikes': 'Non retenues',
    'concept.download_pdf': 'Télécharger mon rapport PDF',
    'concept.restart': 'Recommencer la sélection',
    'concept.category.superlike': 'Mes super coups de cœur',
    'concept.category.like': 'Ce que j\'ai aimé',
    'concept.category.dislike': 'Non retenu',
    'concept.answers': 'Mes réponses',
    'concept.no_answer': 'Sans réponse',
    'concept.programme': 'Programmation de votre projet',
    'concept.estimation': 'Estimation budgétaire',
    'concept.coming_soon': 'Le concept de votre projet sera disponible prochainement !',
    'concept.questionnaire_title': 'Quelques questions',
    'concept.questionnaire_sub': 'Aidez votre architecte à mieux cerner vos attentes.',
    'concept.next': 'Suivant',
    'concept.finish': 'Terminer',
    'concept.generating': 'Génération du rapport…',
  },

  en: {
    // Nav
    'nav.projects':  'Projects',
    'nav.concept':   'Concept',
    'nav.livrables': 'Documents',
    'nav.expenses':  'My Expenses',
    'nav.messages':  'Messages',
    'nav.rdvs':      'My Meetings',
    'portal.title':  'Client Portal',
    'signout':       'Sign out',
    'search.placeholder': 'Search in the portal…',
    'search.no_results': 'No results',
    'search.close': 'to close',
    'client': 'Client',
    'cancel': 'Cancel',

    // Common
    'portal.label': '◆ Client Portal',
    'no_data': 'No data available.',

    // Project page
    'projects.title': 'My Projects',
    'projects.subtitle': 'Track all your projects and their real-time progress here.',
    'projects.empty': 'No projects yet',
    'projects.empty_sub': 'Your projects will appear here once created.',
    'projects.completed': 'completed',
    'projects.mission_current': 'Current mission:',
    'projects.missions_done': 'All missions validated',
    'projects.missions': 'missions',
    'status.en_cours': 'In progress',
    'status.termine': 'Completed',
    'status.pause': 'On hold',
    'status.prospect': 'Prospect',

    // RDVs page
    'rdvs.title': 'My Meetings',
    'rdvs.empty': 'No meetings scheduled',
    'rdvs.empty_sub': 'Meetings created by your team will appear here.',
    'rdvs.upcoming': 'Upcoming',
    'rdvs.past': 'Past',
    'rdvs.project': 'Project:',
    'rdvs.join_meet': 'Join',
    'rdvs.format.meet': 'Google Meet',
    'rdvs.format.telephonique': 'Phone call',
    'rdvs.format.presentiel': 'In person',

    // Deliverables page
    'livrables.label': '◆ Project Library',
    'livrables.title': 'Your Documents',
    'livrables.subtitle': 'Plans, documents, models and Drive links shared with you as the project progresses.',
    'livrables.total_files': 'Total files',
    'livrables.drive_links': 'Drive Links',
    'livrables.projects': 'Projects',
    'livrables.empty': 'No documents yet',
    'livrables.empty_sub': 'Shared documents and links will appear here as the project progresses.',
    'livrables.project': 'Project',
    'livrables.download': 'Download',
    'livrables.open_link': 'Open link',

    // Expenses page
    'expenses.label': '◆ Financial tracking',
    'expenses.title': 'My Expenses',
    'expenses.subtitle': 'Track your personal project expenses and pending fee deadlines.',
    'expenses.add': 'Add an expense',
    'expenses.add_sub': 'Record a project expense',
    'expenses.name': 'Expense name',
    'expenses.company': 'Company / Provider',
    'expenses.date': 'Date',
    'expenses.amount': 'Amount (DH)',
    'expenses.submit': 'Add',
    'expenses.delete_confirm': 'Delete this expense?',
    'expenses.delete': 'Delete',
    'expenses.added': 'Expense added',
    'expenses.deleted': 'Expense deleted',
    'expenses.my_expenses': 'My expenses',
    'expenses.total': 'Total expenses',
    'expenses.honoraires': 'Fees',
    'expenses.paid': 'Paid',
    'expenses.remaining': 'Remaining',
    'expenses.pending_invoices': 'Pending invoices',
    'expenses.none': 'No expenses recorded',
    'expenses.none_sub': 'Add your project-related expenses (notary fees, studies, etc.)',

    // Concept page
    'concept.label': '✨ Concept selection',
    'concept.title': 'Choose your inspirations',
    'concept.hint': 'Swipe right if you like, left if you don\'t, up for a super like!',
    'concept.done_title': 'Thank you for your choices!',
    'concept.done_sub': 'Your selection has been sent to your architect. A full report is available below.',
    'concept.superlikes': 'Super liked',
    'concept.likes': 'Liked',
    'concept.dislikes': 'Not selected',
    'concept.download_pdf': 'Download my PDF report',
    'concept.restart': 'Restart selection',
    'concept.category.superlike': 'My top favorites',
    'concept.category.like': 'What I liked',
    'concept.category.dislike': 'Not selected',
    'concept.answers': 'My answers',
    'concept.no_answer': 'No answer',
    'concept.programme': 'Project programme',
    'concept.estimation': 'Budget estimation',
    'concept.coming_soon': 'Your project concept will be available soon!',
    'concept.questionnaire_title': 'A few questions',
    'concept.questionnaire_sub': 'Help your architect better understand your expectations.',
    'concept.next': 'Next',
    'concept.finish': 'Finish',
    'concept.generating': 'Generating report…',
  },

  es: {
    // Nav
    'nav.projects':  'Proyectos',
    'nav.concept':   'Concepto',
    'nav.livrables': 'Documentos',
    'nav.expenses':  'Mis Gastos',
    'nav.messages':  'Mensajes',
    'nav.rdvs':      'Mis Reuniones',
    'portal.title':  'Portal Cliente',
    'signout':       'Cerrar sesión',
    'search.placeholder': 'Buscar en el portal…',
    'search.no_results': 'Sin resultados',
    'search.close': 'para cerrar',
    'client': 'Cliente',
    'cancel': 'Cancelar',

    // Common
    'portal.label': '◆ Portal Cliente',
    'no_data': 'Sin datos disponibles.',

    // Project page
    'projects.title': 'Mis Proyectos',
    'projects.subtitle': 'Consulta aquí todos tus proyectos y su avance en tiempo real.',
    'projects.empty': 'Sin proyectos por ahora',
    'projects.empty_sub': 'Tus proyectos aparecerán aquí una vez creados.',
    'projects.completed': 'completado',
    'projects.mission_current': 'Misión actual:',
    'projects.missions_done': 'Todas las misiones validadas',
    'projects.missions': 'misiones',
    'status.en_cours': 'En curso',
    'status.termine': 'Terminado',
    'status.pause': 'En pausa',
    'status.prospect': 'Prospecto',

    // RDVs page
    'rdvs.title': 'Mis Reuniones',
    'rdvs.empty': 'Sin reuniones programadas',
    'rdvs.empty_sub': 'Las reuniones creadas por tu equipo aparecerán aquí.',
    'rdvs.upcoming': 'Próximas',
    'rdvs.past': 'Pasadas',
    'rdvs.project': 'Proyecto:',
    'rdvs.join_meet': 'Unirse',
    'rdvs.format.meet': 'Google Meet',
    'rdvs.format.telephonique': 'Telefónico',
    'rdvs.format.presentiel': 'Presencial',

    // Deliverables page
    'livrables.label': '◆ Biblioteca del proyecto',
    'livrables.title': 'Sus documentos',
    'livrables.subtitle': 'Planos, documentos, modelos y enlaces de Drive a su disposición conforme avanza el proyecto.',
    'livrables.total_files': 'Total archivos',
    'livrables.drive_links': 'Enlaces Drive',
    'livrables.projects': 'Proyectos',
    'livrables.empty': 'Sin documentos por ahora',
    'livrables.empty_sub': 'Los documentos y enlaces compartidos aparecerán aquí conforme avance el proyecto.',
    'livrables.project': 'Proyecto',
    'livrables.download': 'Descargar',
    'livrables.open_link': 'Abrir enlace',

    // Expenses page
    'expenses.label': '◆ Seguimiento financiero',
    'expenses.title': 'Mis Gastos',
    'expenses.subtitle': 'Seguimiento de tus gastos personales y los plazos de honorarios pendientes.',
    'expenses.add': 'Añadir un gasto',
    'expenses.add_sub': 'Registrar un gasto del proyecto',
    'expenses.name': 'Nombre del gasto',
    'expenses.company': 'Empresa / Proveedor',
    'expenses.date': 'Fecha',
    'expenses.amount': 'Importe (DH)',
    'expenses.submit': 'Añadir',
    'expenses.delete_confirm': '¿Eliminar este gasto?',
    'expenses.delete': 'Eliminar',
    'expenses.added': 'Gasto añadido',
    'expenses.deleted': 'Gasto eliminado',
    'expenses.my_expenses': 'Mis gastos',
    'expenses.total': 'Total gastos',
    'expenses.honoraires': 'Honorarios',
    'expenses.paid': 'Pagado',
    'expenses.remaining': 'Pendiente',
    'expenses.pending_invoices': 'Facturas pendientes',
    'expenses.none': 'Sin gastos registrados',
    'expenses.none_sub': 'Añade tus gastos relacionados con el proyecto (notaría, estudios, etc.)',

    // Concept page
    'concept.label': '✨ Selección de concepto',
    'concept.title': 'Elige tus inspiraciones',
    'concept.hint': '¡Desliza a la derecha si te gusta, a la izquierda si no, hacia arriba para un super like!',
    'concept.done_title': '¡Gracias por tus elecciones!',
    'concept.done_sub': 'Tu selección ha sido enviada a tu arquitecto. Un informe completo está disponible a continuación.',
    'concept.superlikes': 'Super gustadas',
    'concept.likes': 'Gustadas',
    'concept.dislikes': 'No seleccionadas',
    'concept.download_pdf': 'Descargar mi informe PDF',
    'concept.restart': 'Reiniciar selección',
    'concept.category.superlike': 'Mis favoritas',
    'concept.category.like': 'Lo que me gustó',
    'concept.category.dislike': 'No seleccionado',
    'concept.answers': 'Mis respuestas',
    'concept.no_answer': 'Sin respuesta',
    'concept.programme': 'Programa del proyecto',
    'concept.estimation': 'Estimación presupuestaria',
    'concept.coming_soon': '¡El concepto de tu proyecto estará disponible pronto!',
    'concept.questionnaire_title': 'Algunas preguntas',
    'concept.questionnaire_sub': 'Ayuda a tu arquitecto a entender mejor tus expectativas.',
    'concept.next': 'Siguiente',
    'concept.finish': 'Finalizar',
    'concept.generating': 'Generando informe…',
  },
}

const Ctx = createContext(null)

export function ClientLangProvider({ children }) {
  const { profile } = useAuth()
  const storageKey = profile ? `clade_client_lang_${profile.id}` : 'clade_client_lang'

  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem(storageKey) || 'fr' } catch { return 'fr' }
  })

  useEffect(() => {
    if (!profile) return
    const stored = localStorage.getItem(storageKey)
    if (stored && CLIENT_LANGS.includes(stored)) setLangState(stored)
  }, [profile, storageKey])

  const setLang = (l) => {
    if (!CLIENT_LANGS.includes(l)) return
    setLangState(l)
    try { localStorage.setItem(storageKey, l) } catch {}
  }

  const t = (key) => T[lang]?.[key] ?? T.fr?.[key] ?? key

  const locale = lang === 'fr' ? 'fr-FR' : lang === 'es' ? 'es-ES' : 'en-GB'

  return <Ctx.Provider value={{ lang, setLang, t, locale }}>{children}</Ctx.Provider>
}

export const useClientLang = () => {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useClientLang must be used inside ClientLangProvider')
  return ctx
}
