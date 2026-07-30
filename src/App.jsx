import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'

// Layouts
import StaffLayout from './layouts/StaffLayout'
import ClientLayout from './layouts/ClientLayout'

// Auth
import LoginPage from './pages/auth/LoginPage'

// Staff pages
import OverviewPage from './pages/dashboard/OverviewPage'
import ProjectsPage from './pages/dashboard/ProjectsPage'
import ProjectDetailPage from './pages/dashboard/ProjectDetailPage'
import HRPage from './pages/dashboard/HRPage'
import EmployeDetailPage from './pages/dashboard/EmployeDetailPage'
import RecruitmentDetailPage from './pages/dashboard/RecruitmentDetailPage'
import FinancePage from './pages/dashboard/FinancePage'
import FinanceProjectDetailPage from './pages/dashboard/FinanceProjectDetailPage'
import CRMPage from './pages/dashboard/CRMPage'
import ProspectDetailPage from './pages/dashboard/ProspectDetailPage'
import UsersPage from './pages/dashboard/UsersPage'
import DonneesPage from './pages/dashboard/DonneesPage'
import SiteEditorPage from './pages/dashboard/SiteEditorPage'
import PortfolioPreviewPage from './pages/dashboard/PortfolioPreviewPage'
import CollaborateursPage from './pages/dashboard/CollaborateursPage'
import MessagesPage from './pages/dashboard/MessagesPage'
import MyTeamPage from './pages/dashboard/MyTeamPage'
import MyProjectsPage from './pages/dashboard/MyProjectsPage'
import MyProjectDetailPage from './pages/dashboard/MyProjectDetailPage'
import MyWorkflowPage from './pages/dashboard/MyWorkflowPage'
import WorkflowEditorPage from './pages/dashboard/WorkflowEditorPage'
import GestionWorkflowPage from './pages/dashboard/GestionWorkflowPage'

// Client pages
import ClientProjectPage from './pages/client/ClientProjectPage'
import ClientProjectDetailPage from './pages/client/ClientProjectDetailPage'
import ClientProjectFinancePage from './pages/client/ClientProjectFinancePage'
import ClientDeliverablesPage from './pages/client/ClientDeliverablesPage'
import ClientExpensesPage from './pages/client/ClientExpensesPage'
import ClientMessagesPage from './pages/client/ClientMessagesPage'
import ConceptPage from './pages/dashboard/ConceptPage'
import ProgrammePage from './pages/dashboard/ProgrammePage'
import EstimationPage from './pages/dashboard/EstimationPage'
import ProjectBoardPage from './pages/dashboard/ProjectBoardPage'
import ClientConceptPage from './pages/client/ClientConceptPage'

export default function App() {
  const location = useLocation()

  useEffect(() => {
    if (location.pathname === '/login') return
    const SKIP_TYPES = new Set(['email', 'password', 'number', 'tel', 'url', 'date', 'time', 'datetime-local', 'month', 'week', 'color', 'range', 'checkbox', 'radio', 'file', 'hidden', 'search'])
    const SKIP_WORDS = ['email', 'mail', 'password', 'pwd', 'pass', 'tel', 'phone', 'cin', 'url', 'link', 'http', 'code', 'pin', 'username', 'user', 'drive.google']

    const applyOff = (root) => {
      root.querySelectorAll('input, textarea, select').forEach(el => {
        if (!el.hasAttribute('autocomplete')) el.setAttribute('autocomplete', 'off')
      })
    }
    applyOff(document)

    // Global first-letter capitalize for text inputs
    const handleCap = (e) => {
      const el = e.target
      if (!el || (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA')) return
      if (SKIP_TYPES.has(el.type)) return
      const meta = [el.name, el.id, el.placeholder || '', el.className || ''].join(' ').toLowerCase()
      if (SKIP_WORDS.some(k => meta.includes(k))) return
      const val = el.value
      if (!val || val[0] === val[0].toUpperCase()) return
      const proto = el.tagName === 'INPUT' ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype
      const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value').set
      nativeSetter.call(el, val[0].toUpperCase() + val.slice(1))
      el.dispatchEvent(new Event('input', { bubbles: true }))
    }
    document.addEventListener('input', handleCap, true)

    const observer = new MutationObserver(mutations => {
      mutations.forEach(({ addedNodes }) => {
        addedNodes.forEach(node => {
          if (node.nodeType !== 1) return
          if (node.matches('input, textarea, select')) {
            if (!node.hasAttribute('autocomplete')) node.setAttribute('autocomplete', 'off')
          } else {
            applyOff(node)
          }
        })
      })
    })
    observer.observe(document.body, { childList: true, subtree: true })
    return () => { observer.disconnect(); document.removeEventListener('input', handleCap, true) }
  }, [location.pathname])

  return (
    <Routes>
      {/* Redirection racine vers login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Login public */}
      <Route path="/login" element={<LoginPage />} />

      {/* ===== ESPACE STAFF ===== */}
      <Route
        path="/app"
        element={
          <ProtectedRoute requireStaff>
            <StaffLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<OverviewPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route path="projects/:id/board" element={<ProjectBoardPage />} />
        <Route path="projects/:id/concept" element={<ConceptPage />} />
        <Route path="projects/:id/programme" element={<ProgrammePage />} />
        <Route path="projects/:id/estimation" element={<EstimationPage />} />
        <Route path="hr" element={<HRPage />} />
        <Route path="hr/:id" element={<EmployeDetailPage />} />
        <Route path="hr/recruitment/:id" element={<RecruitmentDetailPage />} />
        <Route path="finance" element={<FinancePage />} />
        <Route path="finance/:id" element={<FinanceProjectDetailPage />} />
        <Route path="crm" element={<CRMPage />} />
        <Route path="crm/prospect/:id" element={<ProspectDetailPage />} />
        <Route path="collaborateurs" element={<CollaborateursPage />} />
        <Route path="portfolio" element={<PortfolioPreviewPage />} />
        <Route path="site-editor" element={<SiteEditorPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="my-team" element={<MyTeamPage />} />
        <Route path="my-projects" element={<MyProjectsPage />} />
        <Route path="my-projects/:id" element={<MyProjectDetailPage />} />
        <Route path="my-projects/:id/board" element={<ProjectBoardPage />} />
        <Route path="my-workflow" element={<MyWorkflowPage />} />
        <Route path="my-workflow/:id" element={<WorkflowEditorPage />} />
        <Route path="workflow" element={<GestionWorkflowPage />} />
        <Route path="workflow/:id" element={<WorkflowEditorPage />} />
        <Route
          path="users"
          element={
            <ProtectedRoute requireDirector>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="donnees"
          element={
            <ProtectedRoute requireDirector>
              <DonneesPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* ===== ESPACE CLIENT ===== */}
      <Route
        path="/client"
        element={
          <ProtectedRoute requireClient>
            <ClientLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ClientProjectPage />} />
        <Route path="projects/:id" element={<ClientProjectDetailPage />} />
        <Route path="projects/:id/finance" element={<ClientProjectFinancePage />} />
        <Route path="livrables" element={<ClientDeliverablesPage />} />
        <Route path="depenses" element={<ClientExpensesPage />} />
        <Route path="messages" element={<ClientMessagesPage />} />
        <Route path="concept" element={<ClientConceptPage />} />
      </Route>

      {/* Fallback : tout le reste redirige vers login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
