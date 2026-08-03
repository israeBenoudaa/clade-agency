import { buildDocHeader, sectionHead, renderToPdf } from './pdfBase.js'

const fmtDate = (d) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'

const fmtNow = () =>
  new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

const STATUT_COLORS = {
  'Done':          { bg: '#EAFBF4', fg: '#1A6645', label: 'Terminé' },
  'Working on it': { bg: '#FFF8E1', fg: '#7A5000', label: 'En cours' },
  'Stuck':         { bg: '#FFF0F0', fg: '#9B1C1C', label: 'Bloqué' },
  'Not Started':   { bg: '#F2F4F8', fg: '#475569', label: 'Non démarré' },
}

const APPROVAL_COLORS = {
  'Approved':   { bg: '#EAFBF4', fg: '#1A6645', label: 'Approuvé' },
  'Great work': { bg: '#FFF8E1', fg: '#7A5000', label: 'Excellent !' },
  'Not yet':    { bg: '#FFF0F0', fg: '#9B1C1C', label: 'Pas encore' },
}

const SB = "font-family:'Inter Tight',-apple-system,BlinkMacSystemFont,sans-serif;"
const AV = "font-family:'Averia Libre',Georgia,serif;"

function badge(text, bg, fg) {
  return `<span style="${SB}display:inline-block;background:${bg};color:${fg};font-size:8px;font-weight:600;padding:2px 7px;border-radius:20px;letter-spacing:0.04em;">${text}</span>`
}

export async function generateProjectReportPdf({ project, tasks, missions, agenceSettings }) {
  const allTasks = tasks
  const totalTasks   = allTasks.length
  const doneTasks    = allTasks.filter(t => t.statut === 'Done').length
  const approvedTasks = allTasks.filter(t => t.approval === 'Approved' || t.approval === 'Great work').length
  const stuckTasks   = allTasks.filter(t => t.statut === 'Stuck').length
  const progressPct  = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0
  const approvalPct  = doneTasks ? Math.round((approvedTasks / doneTasks) * 100) : 0
  const missionsList = missions.filter(m => m.type === 'mission')
  const validatedMissions = missionsList.filter(m => m.statut === 'valide').length

  const headerHTML = buildDocHeader({
    type: 'Rapport d\'avancement',
    title: project.nom,
    ref: `${fmtNow()}${project.client ? ' · ' + project.client : ''}`,
    meta: [
      { label: 'Avancement', value: `${progressPct}%`, accent: progressPct < 50 },
      { label: 'Tâches terminées', value: `${doneTasks} / ${totalTasks}` },
      { label: 'Missions validées', value: `${validatedMissions} / ${missionsList.length}` },
      { label: 'Statut projet', value: project.statut || 'En cours' },
    ],
  })

  // KPI cards
  const kpis = [
    { label: 'Tâches terminées', value: `${doneTasks} / ${totalTasks}`, sub: `${progressPct}% d'avancement` },
    { label: 'Missions validées', value: `${validatedMissions} / ${missionsList.length}`, sub: missionsList.length ? `${Math.round((validatedMissions / (missionsList.length || 1)) * 100)}% complètes` : '—' },
    { label: 'Taux d\'approbation', value: `${approvalPct}%`, sub: `${approvedTasks} tâches approuvées` },
    { label: 'Tâches bloquées', value: stuckTasks, sub: stuckTasks > 0 ? 'Nécessite attention' : 'Aucun blocage' },
  ]

  const kpiHTML = `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:6px;">
      ${kpis.map(k => `
        <div style="background:#F8F5F0;border-radius:6px;padding:13px 14px;">
          <div style="${AV}font-size:20px;font-weight:400;color:#0C0C0B;line-height:1;margin-bottom:5px;">${k.value}</div>
          <div style="font-size:9.5px;font-weight:600;color:#3A3830;margin-bottom:2px;">${k.label}</div>
          <div style="font-size:8.5px;color:#9B968F;">${k.sub}</div>
        </div>`).join('')}
    </div>
    <div style="background:#EDEAE3;height:5px;border-radius:3px;overflow:hidden;margin-bottom:4px;">
      <div style="background:#0C0C0B;height:100%;width:${progressPct}%;border-radius:3px;"></div>
    </div>
    <div style="display:flex;justify-content:space-between;">
      <span style="font-size:8px;color:#ABA79F;">0%</span>
      <span style="font-size:8px;font-weight:600;color:#0C0C0B;">${progressPct}% complété</span>
      <span style="font-size:8px;color:#ABA79F;">100%</span>
    </div>`

  // Missions list
  const missionsHTML = missionsList.length === 0
    ? '<div style="color:#ABA79F;font-style:italic;font-size:11px;">Aucune mission définie.</div>'
    : missionsList.map(m => {
        const mTasks = allTasks.filter(t => String(t.missionId) === String(m.id))
        const mDone  = mTasks.filter(t => t.statut === 'Done').length
        const pct    = mTasks.length ? Math.round((mDone / mTasks.length) * 100) : 0
        const isVal  = m.statut === 'valide'
        return `
          <div style="display:flex;align-items:center;gap:14px;padding:9px 0;border-bottom:0.5px solid #F0ECE6;">
            <div style="flex-shrink:0;width:8px;height:8px;border-radius:50%;background:${m.couleur || '#9B8157'};"></div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:11.5px;font-weight:600;color:#0C0C0B;margin-bottom:4px;">${m.nom}</div>
              <div style="background:#EDEAE3;height:4px;border-radius:2px;overflow:hidden;">
                <div style="background:${isVal ? '#1A6645' : '#9B8157'};height:100%;width:${pct}%;border-radius:2px;"></div>
              </div>
            </div>
            <div style="flex-shrink:0;text-align:right;min-width:50px;">
              <div style="font-size:11px;font-weight:600;color:#0C0C0B;">${pct}%</div>
              <div style="font-size:8.5px;color:#ABA79F;">${mTasks.length} tâche${mTasks.length !== 1 ? 's' : ''}</div>
            </div>
            <div style="flex-shrink:0;">${isVal ? badge('Validée', '#EAFBF4', '#1A6645') : badge('En cours', '#F0ECF5', '#5A2A7A')}</div>
          </div>`
      }).join('')

  // Tasks table
  const tasksHTML = allTasks.length === 0
    ? '<div style="color:#ABA79F;font-style:italic;font-size:11px;padding:10px 0;">Aucune tâche pour ce projet.</div>'
    : `<table style="${SB}width:100%;border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:0.5px solid #0C0C0B;">
            <th style="font-size:7px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#ABA79F;padding:0 0 8px;text-align:left;width:28%;">Tâche</th>
            <th style="font-size:7px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#ABA79F;padding:0 0 8px;text-align:left;width:18%;">Mission</th>
            <th style="font-size:7px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#ABA79F;padding:0 0 8px;text-align:left;width:16%;">Responsable</th>
            <th style="font-size:7px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#ABA79F;padding:0 0 8px;text-align:center;width:14%;">Statut</th>
            <th style="font-size:7px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#ABA79F;padding:0 0 8px;text-align:center;width:12%;">Deadline</th>
            <th style="font-size:7px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#ABA79F;padding:0 0 8px;text-align:center;width:12%;">Approbation</th>
          </tr>
        </thead>
        <tbody>
          ${allTasks.map(t => {
            const sc = STATUT_COLORS[t.statut] || STATUT_COLORS['Not Started']
            const ac = t.approval ? APPROVAL_COLORS[t.approval] : null
            return `
              <tr style="border-bottom:0.5px solid #F0ECE6;">
                <td style="padding:8px 0;font-size:11px;font-weight:600;color:#0C0C0B;">${t.nom || '—'}</td>
                <td style="padding:8px 0;font-size:10.5px;color:#6B6760;">${t.missionNom || '—'}</td>
                <td style="padding:8px 0;font-size:10.5px;color:#3A3830;">${t.personnelNom || '—'}</td>
                <td style="padding:8px 0;text-align:center;">${badge(sc.label, sc.bg, sc.fg)}</td>
                <td style="padding:8px 0;text-align:center;font-size:10.5px;color:#6B6760;">${fmtDate(t.deadline)}</td>
                <td style="padding:8px 0;text-align:center;">${ac ? badge(ac.label, ac.bg, ac.fg) : '<span style="color:#BAB5AE;">—</span>'}</td>
              </tr>`
          }).join('')}
        </tbody>
      </table>`

  const livrablesMissions = missionsList.filter(m => m.livrables?.files?.length > 0 || m.livrables?.links?.length > 0)
  const livrablesHTML = livrablesMissions.length === 0 ? '' : `
    ${sectionHead(4, 'Livrables par mission')}
    ${livrablesMissions.map(m => `
      <div style="margin-bottom:10px;padding:11px 14px;background:#F5F2EE;border-radius:5px;">
        <div style="font-size:11px;font-weight:600;color:#0C0C0B;margin-bottom:6px;">${m.nom}</div>
        ${(m.livrables?.files || []).map(f => `<div style="font-size:10.5px;color:#6B6760;margin-bottom:3px;">📄 ${typeof f === 'string' ? f : f.name}</div>`).join('')}
        ${(m.livrables?.links || []).map(l => `<div style="font-size:10px;color:#9B968F;word-break:break-all;margin-bottom:3px;">🔗 ${l}</div>`).join('')}
      </div>`).join('')}`

  const contentHTML = `
    <div style="${SB}background:#fff;padding:26px 48px 30px;">
      ${sectionHead(1, 'Résumé d\'avancement')}
      ${kpiHTML}

      ${missionsList.length > 0 ? `
        ${sectionHead(2, 'Planning des missions')}
        ${missionsHTML}` : ''}

      ${sectionHead(3, `Tableau des tâches — ${totalTasks}`)}
      ${tasksHTML}

      ${livrablesHTML}
    </div>`

  const slug = (project.nom || 'projet').replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 40)
  await renderToPdf({ headerHTML, contentHTML, filename: `Rapport_${slug}_${new Date().toISOString().slice(0, 10)}.pdf` })
}
