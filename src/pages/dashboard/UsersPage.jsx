import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, ToggleLeft, ToggleRight,
  Copy, RefreshCw, Key, Eye, EyeOff,
  Globe, ChevronRight, Lock, Unlock, Users, CheckCircle2, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Avatar } from '../../components/ui'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { ALL_MODULES } from '../../lib/modules'
import { supabase } from '../../lib/supabase'

function generatePassword() {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 10 }, () => charset[Math.floor(Math.random() * charset.length)]).join('')
}

function normalizeStr(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '')
}

function copyToClipboard(text) {
  navigator.clipboard?.writeText(text)
  toast.success('Copié !', { duration: 1200 })
}

function CredentialRow({ label, value, onRefresh }) {
  const [show, setShow] = useState(false)
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted w-16 flex-shrink-0">{label}</span>
      <span className="text-xs font-mono text-ink flex-1 truncate">
        {label === 'Mot de passe' && !show ? '••••••••••' : value}
      </span>
      <div className="flex gap-1 flex-shrink-0">
        {label === 'Mot de passe' && (
          <button onClick={() => setShow(v => !v)} className="w-6 h-6 rounded-md hover:bg-paper-warm flex items-center justify-center text-muted hover:text-ink transition-colors">
            {show ? <EyeOff size={11} /> : <Eye size={11} />}
          </button>
        )}
        <button onClick={() => copyToClipboard(value)} className="w-6 h-6 rounded-md hover:bg-paper-warm flex items-center justify-center text-muted hover:text-electric transition-colors">
          <Copy size={11} />
        </button>
        {onRefresh && (
          <button onClick={onRefresh} className="w-6 h-6 rounded-md hover:bg-paper-warm flex items-center justify-center text-muted hover:text-electric transition-colors">
            <RefreshCw size={11} />
          </button>
        )}
      </div>
    </div>
  )
}

/* ── Confirm block modal ──────────────────────────────────────────────────── */
function ConfirmBlockModal({ target, action, entityType, onCancel, onConfirm }) {
  const isBlock = action === 'block'
  const typeLabel = entityType === 'emp' ? 'le collaborateur' : 'le client'
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden"
        initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 12 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isBlock ? 'bg-rose-50' : 'bg-emerald-50'}`}>
            {isBlock ? <Lock size={18} className="text-rose-500" /> : <Unlock size={18} className="text-emerald-600" />}
          </div>
          <button onClick={onCancel} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-paper-warm text-muted transition-colors">
            <X size={14} />
          </button>
        </div>
        <div className="px-5 pt-3 pb-5">
          <div className="font-semibold text-ink text-sm mb-0.5">
            {isBlock ? 'Bloquer' : 'Réactiver'} {typeLabel} ?
          </div>
          <div className="text-sm font-medium text-electric mb-2">{target}</div>
          <div className="text-xs text-muted leading-relaxed mb-5">
            {isBlock
              ? "L'accès au portail sera immédiatement révoqué."
              : "Le compte portail sera recréé avec les mêmes identifiants."}
          </div>
          <div className="flex gap-2">
            <button onClick={onCancel} className="btn-ghost flex-1 text-sm">Annuler</button>
            <button
              onClick={onConfirm}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors flex items-center justify-center gap-1.5 ${
                isBlock ? 'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {isBlock ? <Lock size={13} /> : <Unlock size={13} />}
              {isBlock ? 'Bloquer' : 'Réactiver'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ── Filter pills ─────────────────────────────────────────────────────────── */
function FilterPills({ options, value, onChange }) {
  return (
    <div className="flex items-center justify-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0 ${
            value === opt.value
              ? opt.activeClass || 'bg-electric text-white'
              : 'bg-paper-warm border border-border text-muted hover:text-ink'
          }`}
        >
          {opt.icon && <opt.icon size={11} />}
          {opt.shortLabel ? (
            <>
              <span className="sm:hidden">{opt.shortLabel}</span>
              <span className="hidden sm:inline">{opt.label}</span>
            </>
          ) : opt.label}
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            value === opt.value ? 'bg-white/20 text-white' : 'bg-border text-muted'
          }`}>{opt.count}</span>
        </button>
      ))}
    </div>
  )
}

/* ── Employee card ────────────────────────────────────────────────────────── */
function EmployeeCard({ emp, onUpdateEmploye, onSetupPortal, onToggleBlock, isCreating, i }) {
  const isBlocked = emp.statut === 'bloque'

  const VALID_IDS = new Set(ALL_MODULES.map(m => m.id))
  const enabledModules = (emp.permissions?.modules ?? ALL_MODULES.map(m => m.id))
    .filter(id => VALID_IDS.has(id))

  const toggleModule = (moduleId) => {
    const updated = enabledModules.includes(moduleId)
      ? enabledModules.filter(id => id !== moduleId)
      : [...enabledModules, moduleId]
    onUpdateEmploye(emp.id, { permissions: { ...(emp.permissions || {}), modules: updated } })
    toast.success('Permissions mises à jour', { duration: 1200 })
  }

  const generateCreds = () => {
    const first = normalizeStr(emp.prenom)[0] ?? 'u'
    const last = normalizeStr(emp.nomFamille)
    const username = `${first}.${last}`
    const password = generatePassword()
    onSetupPortal(emp.id, { username, password })
  }

  const refreshPassword = async () => {
    const newPassword = generatePassword()
    onUpdateEmploye(emp.id, { credentials: { ...emp.credentials, password: newPassword } })
    const email = emp.email || `${emp.credentials?.username}@clade.ma`
    const { error } = await supabase.rpc('update_user_password', { user_email: email, new_password: newPassword })
    if (error) {
      console.warn('[Auth] Sync password échoué:', error.message)
      toast.error('Mot de passe mis à jour localement mais non synchronisé. Contactez l\'administrateur.')
      return
    }
    toast.success('Mot de passe mis à jour')
  }

  const initials = ((emp.nom || '').split(' ').map(w => w[0] || '').join('').slice(0, 2)).toUpperCase()

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04 }}
      className={`rounded-2xl border bg-white overflow-hidden transition-colors ${
        isBlocked ? 'border-rose-200 opacity-75' : 'border-border'
      }`}
    >
      {/* Header */}
      <div className={`flex items-center gap-3 p-4 border-b border-border/60 ${isBlocked ? 'bg-rose-50/40' : 'bg-paper-warm/40'}`}>
        <Avatar initials={initials || '?'} size={38} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-ink truncate">{emp.nom}</div>
          <div className="text-xs text-muted truncate">{emp.poste || 'Collaborateur'}</div>
        </div>

        {/* Status badge + block toggle */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
            isBlocked
              ? 'bg-rose-50 text-rose-600 border-rose-200'
              : 'bg-emerald-50 text-emerald-600 border-emerald-200'
          }`}>
            {isBlocked ? 'Bloqué' : 'Actif'}
          </span>
          {!emp.isDirecteur && (
            <button
              onClick={onToggleBlock}
              title={isBlocked ? "Débloquer l'accès" : "Bloquer l'accès"}
              className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors ${
                isBlocked
                  ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                  : 'bg-rose-50 text-rose-500 hover:bg-rose-100'
              }`}
            >
              {isBlocked ? <Unlock size={13} /> : <Lock size={13} />}
            </button>
          )}
        </div>
      </div>

      {/* Credentials */}
      <div className="px-4 py-3 border-b border-border/60">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted uppercase tracking-wide">
            <Key size={10} /> Identifiants
          </div>
          {!emp.credentials && !emp.isDirecteur && (
            <button onClick={generateCreds} disabled={isCreating}
              className="text-[10px] text-electric hover:text-electric/80 font-semibold transition-colors disabled:opacity-50">
              {isCreating ? 'Création...' : '+ Générer'}
            </button>
          )}
        </div>
        {emp.credentials ? (
          <div className="space-y-1.5">
            <CredentialRow label="Identifiant" value={emp.credentials.username} />
            <CredentialRow label="Mot de passe" value={emp.credentials.password}
              onRefresh={emp.isDirecteur ? undefined : refreshPassword} />
          </div>
        ) : (
          <div className="text-xs text-muted italic">Aucun identifiant</div>
        )}
      </div>

      {/* Modules */}
      <div className="p-3">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted uppercase tracking-wide mb-2.5 px-0.5">
          <Shield size={10} /> Modules accessibles
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {ALL_MODULES.map(mod => {
            const Icon = mod.icon
            const active = enabledModules.includes(mod.id)
            return (
              <button key={mod.id} onClick={() => !isBlocked && toggleModule(mod.id)} disabled={isBlocked}
                className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl border text-xs font-medium transition-colors ${
                  active ? 'bg-electric/8 border-electric/20 text-ink' : 'bg-paper-warm border-border text-muted'
                } ${isBlocked ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-paper-warm'}`}>
                <div className="flex items-center gap-1.5 min-w-0">
                  <Icon size={12} className={active ? 'text-electric' : 'text-muted'} />
                  <span className="truncate">{mod.label}</span>
                </div>
                {active ? <ToggleRight size={14} className="text-electric flex-shrink-0" /> : <ToggleLeft size={14} className="text-muted flex-shrink-0" />}
              </button>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}

/* ── Main page ────────────────────────────────────────────────────────────── */
export default function UsersPage() {
  const { employes, updateEmploye, prospects, updateProspect, setupEmployeePortal, setupClientPortal, blockClientPortal, unblockClientPortal } = useData()
  const { isDirector } = useAuth()

  const [activeTab, setActiveTab]         = useState('collab')
  const [empFilter, setEmpFilter]         = useState('all')
  const [clientFilter, setClientFilter]   = useState('all')
  const [loadingPortal, setLoadingPortal] = useState(null)
  const [confirmBlock, setConfirmBlock]   = useState(null)
  // confirmBlock = { action:'block'|'unblock', entityType:'emp'|'client', label:string, onConfirm:fn }

  /* ── Derived data ─────────────────────────────────────────────────────── */
  const confirmedProspects = (prospects || []).filter(p => p.statut === 'contrat_signe')

  const clientGroups = Object.values(
    confirmedProspects.reduce((acc, p) => {
      const key = `${(p.prenom || '').toLowerCase().trim()}_${(p.nom || '').toLowerCase().trim()}`
      if (!acc[key]) acc[key] = []
      acc[key].push(p)
      return acc
    }, {})
  )

  const empActifs  = employes.filter(e => e.statut !== 'bloque')
  const empBloques = employes.filter(e => e.statut === 'bloque')

  const filteredEmployes = empFilter === 'actif'
    ? empActifs
    : empFilter === 'bloque'
    ? empBloques
    : employes

  const clientsActifs  = clientGroups.filter(g => !g.some(p => p.portalBlocked) && g.find(p => p.clientCredentials))
  const clientsBloques = clientGroups.filter(g => g.some(p => p.portalBlocked))
  const clientsSansAcces = clientGroups.filter(g => !g.some(p => p.clientCredentials))

  const filteredClients = clientFilter === 'actif'
    ? clientsActifs
    : clientFilter === 'bloque'
    ? clientsBloques
    : clientFilter === 'sans_acces'
    ? clientsSansAcces
    : clientGroups

  /* ── Handlers ─────────────────────────────────────────────────────────── */
  const handleToggleBlockEmployee = (emp) => {
    const isBlocked = emp.statut === 'bloque'
    setConfirmBlock({
      action: isBlocked ? 'unblock' : 'block',
      entityType: 'emp',
      label: emp.nom,
      onConfirm: () => {
        const next = isBlocked ? 'actif' : 'bloque'
        updateEmploye(emp.id, { statut: next })
        toast(next === 'bloque' ? 'Accès bloqué' : 'Accès rétabli', { icon: next === 'bloque' ? '🔒' : '🔓' })
        setConfirmBlock(null)
      },
    })
  }

  const handleSetupEmployeePortal = async (empId, credentials) => {
    setLoadingPortal(empId)
    try {
      await setupEmployeePortal(empId, credentials)
      toast.success('Compte collaborateur créé')
    } catch (err) {
      toast.error(`Erreur : ${err.message}`)
    } finally {
      setLoadingPortal(null)
    }
  }

  const generateClientCreds = async (group) => {
    const rep = group[0]
    const prenom = (rep.prenom || '').toLowerCase().replace(/[^a-z]/g, '')
    const nom    = (rep.nom    || '').toLowerCase().replace(/[^a-z]/g, '')
    const username = `${prenom[0] || ''}${nom}`.slice(0, 16)
    const password = generatePassword()
    const credentials = { username, password }
    const groupKey = `${rep.prenom}_${rep.nom}`
    setLoadingPortal(groupKey)
    try {
      const withEmail = group.find(p => p.email) || group[0]
      await setupClientPortal(withEmail.id, credentials)
      group.filter(p => p.id !== withEmail.id).forEach(p =>
        updateProspect(p.id, { clientCredentials: credentials })
      )
      toast.success('Compte client créé et identifiants générés')
    } catch (err) {
      toast.error(`Erreur : ${err.message}`)
    } finally {
      setLoadingPortal(null)
    }
  }

  const refreshClientPassword = async (group) => {
    const existing = group.find(p => p.clientCredentials)?.clientCredentials
    if (!existing) return
    const newPassword = generatePassword()
    const newCreds = { ...existing, password: newPassword }
    const rep = group[0]
    const groupKey = `${rep.prenom}_${rep.nom}`
    setLoadingPortal(groupKey)
    try {
      const withEmail = group.find(p => p.email) || group[0]
      const email = withEmail.email || `${existing.username}@clade.ma`
      group.forEach(p => updateProspect(p.id, { clientCredentials: newCreds }))
      const { error } = await supabase.rpc('update_user_password', { user_email: email, new_password: newPassword })
      if (error) console.warn('[Auth] Sync password client échoué:', error.message)
      toast.success('Mot de passe mis à jour')
    } catch (err) {
      toast.error(`Erreur : ${err.message}`)
    } finally {
      setLoadingPortal(null)
    }
  }

  const handleBlockClient = (group) => {
    const rep = group[0]
    const label = `${rep.prenom || ''} ${rep.nom || ''}`.trim()
    setConfirmBlock({
      action: 'block',
      entityType: 'client',
      label,
      onConfirm: () => {
        group.forEach(p => blockClientPortal(p.id))
        toast('Accès révoqué', { icon: '🔒' })
        setConfirmBlock(null)
      },
    })
  }

  const handleUnblockClient = (group) => {
    const creds = group.find(p => p.clientCredentials)?.clientCredentials
    if (!creds) return
    const rep = group[0]
    const label = `${rep.prenom || ''} ${rep.nom || ''}`.trim()
    setConfirmBlock({
      action: 'unblock',
      entityType: 'client',
      label,
      onConfirm: async () => {
        setConfirmBlock(null)
        const groupKey = `${rep.prenom}_${rep.nom}`
        setLoadingPortal(groupKey)
        try {
          const withEmail = group.find(p => p.email) || group[0]
          await unblockClientPortal(withEmail.id, creds)
          group.filter(p => p.id !== withEmail.id).forEach(p =>
            updateProspect(p.id, { portalBlocked: false })
          )
          toast('Accès rétabli', { icon: '🔓' })
        } catch (err) {
          toast.error(`Erreur : ${err.message}`)
        } finally {
          setLoadingPortal(null)
        }
      },
    })
  }

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <div className="p-4 lg:p-10 space-y-5">

      {/* Tabs */}
      <div className="flex items-center justify-center gap-1 border-b border-border">
        {[
          { id: 'collab',  label: 'Collaborateurs', count: employes.length,     icon: Users       },
          { id: 'clients', label: 'Clients',         count: clientGroups.length, icon: CheckCircle2 },
        ].map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                activeTab === t.id ? 'border-electric text-electric' : 'border-transparent text-muted hover:text-ink'
              }`}>
              <Icon size={14} />
              {t.label}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === t.id ? 'bg-electric/10 text-electric' : 'bg-border text-muted'
              }`}>{t.count}</span>
            </button>
          )
        })}
      </div>

      {/* ── Collaborateurs ── */}
      {activeTab === 'collab' && (
        <div className="space-y-4">
          {/* Filters */}
          <FilterPills
            value={empFilter}
            onChange={setEmpFilter}
            options={[
              { value: 'actif',  label: 'Actifs',  count: empActifs.length,   activeClass: 'bg-emerald-600 text-white', icon: Unlock },
              { value: 'bloque', label: 'Bloqués', count: empBloques.length,  activeClass: 'bg-rose-500 text-white',    icon: Lock },
            ]}
          />

          {filteredEmployes.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="font-display text-xl text-ink mb-2">Aucun collaborateur</div>
              <p className="text-sm text-muted">
                {empFilter !== 'all' ? 'Aucun collaborateur dans cette catégorie.' : 'Ajoutez des employés dans le module RH.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredEmployes.map((emp, i) => (
                <EmployeeCard
                  key={emp.id}
                  emp={emp}
                  i={i}
                  onUpdateEmploye={updateEmploye}
                  onSetupPortal={handleSetupEmployeePortal}
                  onToggleBlock={() => handleToggleBlockEmployee(emp)}
                  isCreating={loadingPortal === emp.id}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Clients ── */}
      {activeTab === 'clients' && (
        <div className="space-y-4">
          {/* Filters */}
          <FilterPills
            value={clientFilter}
            onChange={setClientFilter}
            options={[
              { value: 'actif',      label: 'Actifs',      count: clientsActifs.length,    activeClass: 'bg-emerald-600 text-white', icon: Unlock },
              { value: 'bloque',     label: 'Bloqués',     count: clientsBloques.length,   activeClass: 'bg-rose-500 text-white',    icon: Lock },
              { value: 'sans_acces', label: 'Sans accès',  count: clientsSansAcces.length, activeClass: 'bg-amber-500 text-white',   icon: Globe },
            ]}
          />

          {clientGroups.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-paper-warm flex items-center justify-center mx-auto mb-4">
                <Globe size={24} className="text-muted" />
              </div>
              <div className="font-display text-xl text-ink mb-2">Aucun client confirmé</div>
              <p className="text-sm text-muted">Les clients avec un contrat signé apparaîtront ici.</p>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="card p-10 text-center text-sm text-muted">
              Aucun client dans cette catégorie.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredClients.map((group, i) => {
                const rep      = group[0]
                const creds    = group.find(p => p.clientCredentials)?.clientCredentials || null
                const isBlocked = group.some(p => p.portalBlocked)
                const initials = ((rep.prenom?.[0] || '') + (rep.nom?.[0] || '')).toUpperCase()
                const groupKey = `${rep.prenom}_${rep.nom}`
                const busy     = loadingPortal === groupKey

                return (
                  <motion.div
                    key={groupKey + i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`rounded-2xl border bg-white overflow-hidden ${
                      isBlocked ? 'border-rose-200' : 'border-border'
                    }`}
                  >
                    {/* Header */}
                    <div className={`flex items-center gap-3 p-4 border-b border-border/60 ${isBlocked ? 'bg-rose-50/40' : 'bg-paper-warm/40'}`}>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xs font-bold ${
                        isBlocked ? 'bg-gradient-to-br from-rose-400 to-rose-600' : 'bg-gradient-to-br from-ink to-electric'
                      }`}>
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-ink truncate">{rep.prenom} {rep.nom}</div>
                        <div className="text-xs text-muted truncate">
                          {group.length === 1 ? (rep.typeProjet || 'Client') : `${group.length} projets`}
                        </div>
                      </div>

                      {/* Status badge + block toggle */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          isBlocked
                            ? 'bg-rose-50 text-rose-600 border-rose-200'
                            : creds
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                            : 'bg-paper-warm text-muted border-border'
                        }`}>
                          {isBlocked ? 'Bloqué' : creds ? 'Actif' : 'Sans accès'}
                        </span>
                        {creds && (
                          <button
                            onClick={() => isBlocked ? handleUnblockClient(group) : handleBlockClient(group)}
                            disabled={busy}
                            title={isBlocked ? "Réactiver l'accès" : "Bloquer l'accès"}
                            className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 ${
                              isBlocked
                                ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-500 hover:bg-rose-100'
                            }`}
                          >
                            {isBlocked ? <Unlock size={13} /> : <Lock size={13} />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Projects list */}
                    {group.length > 1 && (
                      <div className="px-4 py-2.5 border-b border-border/60 space-y-0.5">
                        <div className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-1.5">Projets</div>
                        {group.map(p => (
                          <div key={p.id} className="flex items-center gap-1.5 text-xs text-ink">
                            <ChevronRight size={10} className="text-muted flex-shrink-0" />
                            <span className="truncate">{p.typeProjet || p.nom || 'Projet'}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Credentials */}
                    <div className="px-4 py-3">
                      {creds ? (
                        <div className="space-y-1.5">
                          <CredentialRow label="Identifiant" value={creds.username} />
                          <CredentialRow
                            label="Mot de passe"
                            value={creds.password}
                            onRefresh={(!isBlocked && !busy) ? () => refreshClientPassword(group) : undefined}
                          />
                          {busy && <p className="text-[10px] text-muted text-center pt-1">Opération en cours...</p>}
                        </div>
                      ) : (
                        <button
                          onClick={() => generateClientCreds(group)}
                          disabled={busy}
                          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-border text-xs text-muted hover:text-electric hover:border-electric transition-colors disabled:opacity-50"
                        >
                          <Key size={11} />
                          {busy ? 'Création du compte...' : 'Générer les identifiants'}
                        </button>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Confirmation modal */}
      <AnimatePresence>
        {confirmBlock && (
          <ConfirmBlockModal
            action={confirmBlock.action}
            entityType={confirmBlock.entityType}
            target={confirmBlock.label}
            onCancel={() => setConfirmBlock(null)}
            onConfirm={confirmBlock.onConfirm}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
