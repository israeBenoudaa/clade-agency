import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Plus, Trash2, Download, Share2, Clock, CheckCircle2, GripVertical, RefreshCw,
} from 'lucide-react'
import { useData } from '../../context/DataContext'
import { exportEstimationExcel } from '../../utils/exportTableExcel'
import toast from 'react-hot-toast'

const STATUT_CFG = {
  en_cours: { label: 'En cours', Icon: Clock, cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  partage:  { label: 'Partagé avec le client', Icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
}

const DEFAULT_GROUPE = () => ({
  id: `g${Date.now()}`,
  nom: 'Nouvelle catégorie',
  items: [defaultItem()],
})

function defaultItem() {
  return { id: `i${Date.now() + Math.random()}`, programme: '', unite: 'u', quantite: 1, superficieUnitaire: 0, prixEstimation: 0 }
}

function calcSt(item) {
  return (Number(item.quantite) || 0) * (Number(item.superficieUnitaire) || 0)
}

function calcPt(item) {
  return calcSt(item) * (Number(item.prixEstimation) || 0)
}

function fmtNum(n) {
  return n ? Number(n).toLocaleString('fr-FR') : '—'
}

function CellInput({ value, onChange, className = '', type = 'text', placeholder = '' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full bg-transparent outline-none text-sm text-ink placeholder-muted/40 ${className}`}
    />
  )
}

export default function EstimationPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { projects, updateEstimation } = useData()

  const projectId = isNaN(Number(id)) ? id : Number(id)
  const project = projects.find(p => p.id === projectId)

  const [groupes, setGroupes] = useState([])
  const [statut, setStatut] = useState('en_cours')

  useEffect(() => {
    if (!project) return
    const est = project.estimation || {}
    setStatut(est.statut || 'en_cours')
    setGroupes(
      est.groupes?.length
        ? est.groupes
        : [DEFAULT_GROUPE()]
    )
  }, [project?.id]) // eslint-disable-line

  const save = useCallback((newGroupes, newStatut) => {
    if (!project) return
    updateEstimation(project.id, { statut: newStatut, groupes: newGroupes })
  }, [project, updateEstimation])

  if (!project) {
    return (
      <div className="flex items-center justify-center h-64 text-muted">
        Projet introuvable
      </div>
    )
  }

  const handleStatut = (s) => {
    setStatut(s)
    save(groupes, s)
    toast.success(s === 'partage' ? 'Partagé avec le client ✓' : 'Statut mis à jour')
  }

  const updateGroupeNom = (gId, nom) => {
    const next = groupes.map(g => g.id === gId ? { ...g, nom } : g)
    setGroupes(next); save(next, statut)
  }

  const addGroupe = () => {
    const next = [...groupes, DEFAULT_GROUPE()]
    setGroupes(next); save(next, statut)
  }

  const removeGroupe = (gId) => {
    if (groupes.length === 1) { toast.error('Minimum 1 catégorie'); return }
    const next = groupes.filter(g => g.id !== gId)
    setGroupes(next); save(next, statut)
  }

  const addItem = (gId) => {
    const next = groupes.map(g => g.id === gId ? { ...g, items: [...g.items, defaultItem()] } : g)
    setGroupes(next); save(next, statut)
  }

  const removeItem = (gId, iId) => {
    const group = groupes.find(g => g.id === gId)
    if (group.items.length === 1) { toast.error('Minimum 1 ligne par catégorie'); return }
    const next = groupes.map(g => g.id === gId ? { ...g, items: g.items.filter(i => i.id !== iId) } : g)
    setGroupes(next); save(next, statut)
  }

  const updateItem = (gId, iId, field, value) => {
    const next = groupes.map(g =>
      g.id === gId
        ? { ...g, items: g.items.map(i => i.id === iId ? { ...i, [field]: value } : i) }
        : g
    )
    setGroupes(next); save(next, statut)
  }

  const allItems = groupes.flatMap(g => g.items)
  const grandSt = allItems.reduce((s, i) => s + calcSt(i), 0)
  const grandPt = allItems.reduce((s, i) => s + calcPt(i), 0)
  const cfg = STATUT_CFG[statut]

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate(`/app/projects/${project.id}`)} className="btn-ghost">
          <ArrowLeft size={16} />
          Retour
        </button>
        <div className="flex-1 min-w-0">
          <div className="label-text text-[10px]">{project.nom}</div>
          <h1 className="font-display text-2xl text-ink">Estimation</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 p-1 bg-paper-warm rounded-xl border border-border">
            {Object.entries(STATUT_CFG).map(([key, c]) => {
              const Ic = c.Icon
              return (
                <button
                  key={key}
                  onClick={() => handleStatut(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    statut === key ? c.cls + ' border shadow-sm' : 'text-muted hover:text-ink'
                  }`}
                >
                  <Ic size={13} />
                  {c.label}
                </button>
              )
            })}
          </div>
          <button
            onClick={() => {
              save(groupes, statut)
              toast.success('Données actualisées pour le client')
            }}
            className="btn-ghost text-sm"
          >
            <RefreshCw size={14} />
            Actualiser
          </button>
          <button
            onClick={() => exportEstimationExcel({ statut, groupes }, project.nom)}
            className="btn-ghost text-sm"
          >
            <Download size={15} />
            Excel
          </button>
        </div>
      </div>

      {/* Table card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="card overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr style={{ background: '#0A1E3F' }}>
                {['Catégorie', 'Programme', 'Unité', 'Quantité', 'Sup. unit. (m²)', 'Sup. totale (m²)', 'Prix estim. (DH/m²)', 'Prix total (DH)', ''].map(h => (
                  <th
                    key={h}
                    className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: h ? 'rgba(255,255,255,0.85)' : 'transparent' }}
                  >
                    {h || '·'}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groupes.flatMap(group => {
                const items = group.items
                const subSt = items.reduce((s, i) => s + calcSt(i), 0)
                const subPt = items.reduce((s, i) => s + calcPt(i), 0)

                return [
                  ...items.map((item, idx) => (
                    <tr
                      key={item.id}
                      className="border-b border-border/50 hover:bg-paper-warm/40 transition-colors"
                    >
                      {idx === 0 && (
                        <td
                          rowSpan={items.length}
                          style={{ background: '#C5D3E8', verticalAlign: 'middle', width: 130 }}
                          className="px-3 py-2 border-r border-[#b0c0d8] align-middle"
                        >
                          <div className="flex items-start gap-1">
                            <GripVertical size={12} className="text-[#5a7a9a] mt-0.5 flex-shrink-0" />
                            <input
                              type="text"
                              value={group.nom}
                              onChange={e => updateGroupeNom(group.id, e.target.value)}
                              placeholder="Catégorie"
                              className="w-full bg-transparent outline-none font-semibold text-[#0A1E3F] text-[11px] uppercase tracking-wide placeholder-[#5a7a9a]/50"
                            />
                          </div>
                          <button
                            onClick={() => removeGroupe(group.id)}
                            className="mt-2 flex items-center gap-1 text-[10px] text-red-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={10} /> Supprimer
                          </button>
                        </td>
                      )}
                      <td className="px-3 py-2 border-r border-border/30" style={{ minWidth: 160 }}>
                        <CellInput value={item.programme} onChange={v => updateItem(group.id, item.id, 'programme', v)} placeholder="Nom de l'espace" />
                      </td>
                      <td className="px-3 py-2 border-r border-border/30" style={{ width: 70 }}>
                        <CellInput value={item.unite} onChange={v => updateItem(group.id, item.id, 'unite', v)} placeholder="u" className="text-center" />
                      </td>
                      <td className="px-3 py-2 border-r border-border/30" style={{ width: 80 }}>
                        <CellInput type="number" value={item.quantite} onChange={v => updateItem(group.id, item.id, 'quantite', v)} className="text-right" />
                      </td>
                      <td className="px-3 py-2 border-r border-border/30" style={{ width: 120 }}>
                        <CellInput type="number" value={item.superficieUnitaire} onChange={v => updateItem(group.id, item.id, 'superficieUnitaire', v)} className="text-right" />
                      </td>
                      <td className="px-3 py-2 border-r border-border/30 text-right font-semibold text-ink" style={{ width: 120 }}>
                        {calcSt(item) || '—'}
                      </td>
                      <td className="px-3 py-2 border-r border-border/30" style={{ width: 140 }}>
                        <CellInput type="number" value={item.prixEstimation} onChange={v => updateItem(group.id, item.id, 'prixEstimation', v)} className="text-right" />
                      </td>
                      <td className="px-3 py-2 border-r border-border/30 text-right font-semibold text-electric" style={{ width: 140 }}>
                        {calcPt(item) ? fmtNum(calcPt(item)) + ' DH' : '—'}
                      </td>
                      <td className="px-2 py-2" style={{ width: 36 }}>
                        <button
                          onClick={() => removeItem(group.id, item.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  )),

                  <tr key={`add_${group.id}`} className="border-b border-border/30">
                    <td style={{ background: '#C5D3E8' }} className="px-3 py-1.5 border-r border-[#b0c0d8]" />
                    <td colSpan={7} className="px-3 py-1.5">
                      <button
                        onClick={() => addItem(group.id)}
                        className="flex items-center gap-1.5 text-xs text-electric hover:text-electric/70 transition-colors"
                      >
                        <Plus size={12} /> Ajouter une ligne
                      </button>
                    </td>
                    <td />
                  </tr>,

                  <tr key={`st_${group.id}`} style={{ background: '#F3F4F6' }} className="border-b border-border">
                    <td colSpan={5} className="px-4 py-2 text-xs font-bold text-ink/70 uppercase tracking-wide">
                      Sous-total — {group.nom}
                    </td>
                    <td className="px-4 py-2 text-right font-bold text-ink">
                      {subSt} <span className="text-xs font-normal text-muted">m²</span>
                    </td>
                    <td className="px-4 py-2" />
                    <td className="px-4 py-2 text-right font-bold text-electric">
                      {fmtNum(subPt)} <span className="text-xs font-normal text-muted">DH</span>
                    </td>
                    <td />
                  </tr>,
                ]
              })}

              {/* Grand total */}
              <tr style={{ background: '#0A1E3F' }}>
                <td colSpan={5} className="px-4 py-3 font-bold text-xs uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  TOTAL GÉNÉRAL
                </td>
                <td className="px-4 py-3 text-right font-bold text-white text-base">
                  {grandSt} <span className="text-xs font-normal opacity-70">m²</span>
                </td>
                <td style={{ background: '#0A1E3F' }} />
                <td className="px-4 py-3 text-right font-bold text-cyan-300 text-base">
                  {fmtNum(grandPt)} <span className="text-xs font-normal opacity-70">DH</span>
                </td>
                <td style={{ background: '#0A1E3F' }} />
              </tr>
            </tbody>
          </table>
        </div>

        <div className="px-5 py-4 border-t border-border bg-paper-warm/30">
          <button
            onClick={addGroupe}
            className="flex items-center gap-2 text-sm text-muted hover:text-ink transition-colors font-medium"
          >
            <div className="w-6 h-6 rounded-lg border-2 border-dashed border-muted/40 flex items-center justify-center">
              <Plus size={13} />
            </div>
            Ajouter une catégorie
          </button>
        </div>
      </motion.div>

      {statut === 'partage' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700"
        >
          <Share2 size={18} className="flex-shrink-0" />
          <div className="text-sm">
            <span className="font-semibold">Partagé avec le client.</span> Ce tableau est visible dans le portail client dans la section Concept.
          </div>
        </motion.div>
      )}
    </div>
  )
}
