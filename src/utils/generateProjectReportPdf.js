import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

const fmtDate = (d) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'

const fmtNow = () =>
  new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const STATUT_COLORS = {
  'Done':          { bg: '#D1FAE5', fg: '#065F46', label: 'Terminé' },
  'Working on it': { bg: '#FEF3C7', fg: '#92400E', label: 'En cours' },
  'Stuck':         { bg: '#FFE4E6', fg: '#9F1239', label: 'Bloqué' },
  'Not Started':   { bg: '#F1F5F9', fg: '#475569', label: 'Non démarré' },
}

const APPROVAL_COLORS = {
  'Approved':   { bg: '#D1FAE5', fg: '#065F46', label: 'Approuvé' },
  'Great work': { bg: '#FEF3C7', fg: '#92400E', label: 'Excellent !' },
  'Not yet':    { bg: '#FFE4E6', fg: '#9F1239', label: 'Pas encore' },
}

function badge(text, bg, fg) {
  return `<span style="display:inline-block;background:${bg};color:${fg};font-size:9px;font-weight:700;padding:2px 8px;border-radius:20px;">${text}</span>`
}

function buildTemplate({ project, tasks, missions, agenceSettings }) {
  const now = fmtNow()
  const agencyName = agenceSettings?.nom || 'CLADE'

  const allTasks = tasks
  const totalTasks = allTasks.length
  const doneTasks  = allTasks.filter(t => t.statut === 'Done').length
  const approvedTasks = allTasks.filter(t => t.approval === 'Approved' || t.approval === 'Great work').length
  const stuckTasks = allTasks.filter(t => t.statut === 'Stuck').length
  const progressPct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0
  const approvalPct = doneTasks ? Math.round((approvedTasks / doneTasks) * 100) : 0

  const missionsList = missions.filter(m => m.type === 'mission')
  const validatedMissions = missionsList.filter(m => m.statut === 'valide').length

  // ── KPI cards ──
  const kpiCards = [
    { label: 'Tâches terminées', value: `${doneTasks} / ${totalTasks}`, sub: `${progressPct}% d'avancement`, color: '#06B6D4' },
    { label: 'Missions validées', value: `${validatedMissions} / ${missionsList.length}`, sub: missionsList.length ? `${Math.round((validatedMissions/missionsList.length)*100)}% complètes` : 'Aucune mission', color: '#10B981' },
    { label: 'Taux d\'approbation', value: `${approvalPct}%`, sub: `${approvedTasks} tâches approuvées`, color: '#8B5CF6' },
    { label: 'Tâches bloquées', value: stuckTasks, sub: stuckTasks > 0 ? 'Nécessite attention' : 'Aucun blocage', color: stuckTasks > 0 ? '#F43F5E' : '#10B981' },
  ]

  // ── Missions section ──
  const missionsHtml = missionsList.length === 0 ? '<div style="color:#9CA3AF;font-style:italic;font-size:12px;">Aucune mission définie.</div>' :
    missionsList.map(m => {
      const mTasks = allTasks.filter(t => String(t.missionId) === String(m.id))
      const mDone  = mTasks.filter(t => t.statut === 'Done').length
      const pct    = mTasks.length ? Math.round((mDone / mTasks.length) * 100) : 0
      const isVal  = m.statut === 'valide'
      return `
      <div style="display:flex;align-items:center;gap:14px;padding:10px 0;border-bottom:1px solid #F1F5F9;">
        <div style="flex-shrink:0;width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:13px;" style="background:${m.couleur || '#3B7BF6'}20;">
          <span style="background:${m.couleur || '#3B7BF6'};width:10px;height:10px;border-radius:50%;display:inline-block;"></span>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:12px;font-weight:700;color:#0A1E3F;margin-bottom:4px;">${m.nom}</div>
          <div style="background:#F1F5F9;height:5px;border-radius:3px;overflow:hidden;">
            <div style="background:${isVal ? '#10B981' : '#06B6D4'};height:100%;width:${pct}%;border-radius:3px;"></div>
          </div>
        </div>
        <div style="flex-shrink:0;text-align:right;">
          <div style="font-size:11px;font-weight:700;color:${isVal ? '#065F46' : '#374151'};">${pct}%</div>
          <div style="font-size:9px;color:#9CA3AF;margin-top:1px;">${mTasks.length} tâche${mTasks.length !== 1 ? 's' : ''}</div>
        </div>
        <div style="flex-shrink:0;">
          ${isVal ? badge('Validée', '#D1FAE5', '#065F46') : badge('En cours', '#DBEAFE', '#1D4ED8')}
        </div>
      </div>`
    }).join('')

  // ── Tasks table ──
  const tasksHtml = allTasks.length === 0 ? '<div style="color:#9CA3AF;font-style:italic;font-size:12px;padding:12px 0;">Aucune tâche pour ce projet.</div>' :
    `<table style="width:100%;border-collapse:collapse;font-size:10px;">
      <thead>
        <tr style="background:#F8F9FA;">
          <th style="text-align:left;padding:8px 10px;color:#6B7280;font-weight:700;font-size:9px;letter-spacing:0.5px;text-transform:uppercase;border-bottom:1px solid #E5E7EB;width:28%;">Tâche</th>
          <th style="text-align:left;padding:8px 10px;color:#6B7280;font-weight:700;font-size:9px;letter-spacing:0.5px;text-transform:uppercase;border-bottom:1px solid #E5E7EB;width:18%;">Mission</th>
          <th style="text-align:left;padding:8px 10px;color:#6B7280;font-weight:700;font-size:9px;letter-spacing:0.5px;text-transform:uppercase;border-bottom:1px solid #E5E7EB;width:16%;">Responsable</th>
          <th style="text-align:center;padding:8px 10px;color:#6B7280;font-weight:700;font-size:9px;letter-spacing:0.5px;text-transform:uppercase;border-bottom:1px solid #E5E7EB;width:14%;">Statut</th>
          <th style="text-align:center;padding:8px 10px;color:#6B7280;font-weight:700;font-size:9px;letter-spacing:0.5px;text-transform:uppercase;border-bottom:1px solid #E5E7EB;width:12%;">Deadline</th>
          <th style="text-align:center;padding:8px 10px;color:#6B7280;font-weight:700;font-size:9px;letter-spacing:0.5px;text-transform:uppercase;border-bottom:1px solid #E5E7EB;width:12%;">Approbation</th>
        </tr>
      </thead>
      <tbody>
        ${allTasks.map((t, i) => {
          const sCfg = STATUT_COLORS[t.statut] || STATUT_COLORS['Not Started']
          const aCfg = t.approval ? APPROVAL_COLORS[t.approval] : null
          return `
          <tr style="background:${i % 2 === 0 ? '#ffffff' : '#FAFAF8'};">
            <td style="padding:8px 10px;color:#1F2937;font-weight:600;border-bottom:1px solid #F1F5F9;">${t.nom || '—'}</td>
            <td style="padding:8px 10px;color:#6B7280;border-bottom:1px solid #F1F5F9;">${t.missionNom || '—'}</td>
            <td style="padding:8px 10px;color:#374151;border-bottom:1px solid #F1F5F9;">${t.personnelNom || '—'}</td>
            <td style="padding:8px 10px;text-align:center;border-bottom:1px solid #F1F5F9;">${badge(sCfg.label, sCfg.bg, sCfg.fg)}</td>
            <td style="padding:8px 10px;text-align:center;color:#374151;border-bottom:1px solid #F1F5F9;">${fmtDate(t.deadline)}</td>
            <td style="padding:8px 10px;text-align:center;border-bottom:1px solid #F1F5F9;">${aCfg ? badge(aCfg.label, aCfg.bg, aCfg.fg) : '<span style="color:#9CA3AF;">—</span>'}</td>
          </tr>`
        }).join('')}
      </tbody>
    </table>`

  // ── Livrables ──
  const livrablesMissions = missionsList.filter(m => m.livrables?.files?.length > 0 || m.livrables?.links?.length > 0)
  const livrablesHtml = livrablesMissions.length === 0 ? '' : `
    <div style="margin-top:28px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
        <div style="width:3px;height:18px;background:#8B5CF6;border-radius:2px;flex-shrink:0;"></div>
        <div style="font-size:9px;color:#8B5CF6;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Livrables par mission</div>
      </div>
      ${livrablesMissions.map(m => `
        <div style="margin-bottom:12px;padding:12px 14px;background:#F9F7FF;border:1px solid #EDE9FE;border-radius:10px;">
          <div style="font-size:11px;font-weight:700;color:#5B21B6;margin-bottom:8px;">${m.nom}</div>
          ${(m.livrables?.files || []).map(f => `
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
              <span style="font-size:12px;">📄</span>
              <span style="font-size:11px;color:#374151;">${typeof f === 'string' ? f : f.name}</span>
            </div>`).join('')}
          ${(m.livrables?.links || []).map(l => `
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
              <span style="font-size:12px;">🔗</span>
              <span style="font-size:11px;color:#6B7280;word-break:break-all;">${l}</span>
            </div>`).join('')}
        </div>`).join('')}
    </div>`

  return `
  <div style="background:#ffffff;font-family:'Helvetica Neue',Arial,sans-serif;width:794px;">

    <!-- Gradient top bar -->
    <div style="height:5px;background:linear-gradient(90deg,#0A1E3F 0%,#3B7BF6 55%,#06B6D4 100%);"></div>

    <!-- Header -->
    <div style="background:#0A1E3F;padding:40px 48px 36px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:24px;">
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:22px;">
            <div style="width:38px;height:38px;background:#3B7BF6;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <span style="color:white;font-size:17px;font-weight:900;font-family:Georgia,serif;">C</span>
            </div>
            <div>
              <div style="color:#3B7BF6;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;line-height:1;">${agencyName}</div>
              <div style="color:rgba(255,255,255,0.45);font-size:9px;letter-spacing:1px;margin-top:2px;">Agence d'Architecture</div>
            </div>
          </div>
          <div style="color:rgba(255,255,255,0.45);font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:10px;">Rapport de Projet</div>
          <div style="color:white;font-size:28px;font-weight:800;line-height:1.2;max-width:460px;">${project.nom}</div>
        </div>
        <div style="flex-shrink:0;">
          <div style="background:rgba(59,123,246,0.12);border:1px solid rgba(59,123,246,0.25);border-radius:12px;padding:16px 20px;text-align:right;min-width:150px;">
            ${project.client ? `<div style="color:rgba(255,255,255,0.4);font-size:8px;letter-spacing:2px;text-transform:uppercase;margin-bottom:5px;">Client</div>
            <div style="color:white;font-size:13px;font-weight:700;margin-bottom:10px;word-break:break-word;">${project.client}</div>` : ''}
            <div style="color:rgba(255,255,255,0.4);font-size:8px;letter-spacing:2px;text-transform:uppercase;margin-bottom:5px;">Statut</div>
            <div style="color:#06B6D4;font-size:12px;font-weight:700;">${project.projetStatut || 'En cours'}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Meta band -->
    <div style="background:#F4F3EF;padding:14px 48px;display:flex;gap:32px;flex-wrap:wrap;border-bottom:1px solid #E5E7EB;">
      ${project.type ? `<div><div style="font-size:8px;color:#6B7280;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">Type</div><div style="font-size:11px;color:#0A1E3F;font-weight:700;margin-top:2px;">${project.type}</div></div>` : ''}
      ${project.localisation && project.localisation !== '—' ? `<div><div style="font-size:8px;color:#6B7280;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">Localisation</div><div style="font-size:11px;color:#0A1E3F;font-weight:700;margin-top:2px;">${project.localisation}</div></div>` : ''}
      ${project.budget && project.budget !== '—' ? `<div><div style="font-size:8px;color:#6B7280;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">Budget</div><div style="font-size:11px;color:#0A1E3F;font-weight:700;margin-top:2px;">${project.budget}</div></div>` : ''}
      ${project.deadline && project.deadline !== '—' ? `<div><div style="font-size:8px;color:#6B7280;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">Deadline</div><div style="font-size:11px;color:#0A1E3F;font-weight:700;margin-top:2px;">${fmtDate(project.deadline)}</div></div>` : ''}
      ${project.architecteReferentNom ? `<div><div style="font-size:8px;color:#6B7280;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">Référent</div><div style="font-size:11px;color:#0A1E3F;font-weight:700;margin-top:2px;">${project.architecteReferentNom}</div></div>` : ''}
    </div>

    <!-- KPIs -->
    <div style="padding:28px 48px 0;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
        <div style="width:3px;height:18px;background:#3B7BF6;border-radius:2px;flex-shrink:0;"></div>
        <div style="font-size:9px;color:#3B7BF6;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Résumé d'avancement</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;">
        ${kpiCards.map(k => `
          <div style="background:#FAFAF8;border:1px solid #E5E7EB;border-top:3px solid ${k.color};border-radius:10px;padding:14px;">
            <div style="font-size:22px;font-weight:900;color:#0A1E3F;line-height:1;">${k.value}</div>
            <div style="font-size:10px;font-weight:700;color:#374151;margin-top:5px;">${k.label}</div>
            <div style="font-size:9px;color:#9CA3AF;margin-top:3px;">${k.sub}</div>
          </div>`).join('')}
      </div>

      <!-- Progress bar -->
      <div style="margin-top:16px;background:#F1F5F9;height:8px;border-radius:4px;overflow:hidden;">
        <div style="background:linear-gradient(90deg,#3B7BF6,#06B6D4);height:100%;width:${progressPct}%;border-radius:4px;transition:width 0.3s;"></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:5px;">
        <span style="font-size:9px;color:#9CA3AF;">0%</span>
        <span style="font-size:9px;font-weight:700;color:#3B7BF6;">${progressPct}% complété</span>
        <span style="font-size:9px;color:#9CA3AF;">100%</span>
      </div>
    </div>

    <!-- Missions -->
    ${missionsList.length > 0 ? `
    <div style="padding:24px 48px 0;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
        <div style="width:3px;height:18px;background:#10B981;border-radius:2px;flex-shrink:0;"></div>
        <div style="font-size:9px;color:#10B981;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Planning des missions</div>
      </div>
      <div style="border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;background:#FAFAF8;padding:0 16px;">
        ${missionsHtml}
      </div>
    </div>` : ''}

    <!-- Tasks -->
    <div style="padding:24px 48px 0;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
        <div style="width:3px;height:18px;background:#F59E0B;border-radius:2px;flex-shrink:0;"></div>
        <div style="font-size:9px;color:#F59E0B;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Tableau des tâches (${totalTasks})</div>
      </div>
      <div style="border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;">
        ${tasksHtml}
      </div>
    </div>

    <!-- Livrables -->
    ${livrablesHtml ? `<div style="padding:0 48px;">${livrablesHtml}</div>` : ''}

    <!-- Footer -->
    <div style="margin-top:32px;background:#0A1E3F;padding:16px 48px;display:flex;justify-content:space-between;align-items:center;">
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="width:18px;height:18px;background:#3B7BF6;border-radius:4px;display:flex;align-items:center;justify-content:center;">
          <span style="color:white;font-size:8px;font-weight:900;">C</span>
        </div>
        <span style="color:rgba(255,255,255,0.4);font-size:10px;">${agencyName} — Document confidentiel</span>
      </div>
      <div style="color:rgba(255,255,255,0.35);font-size:10px;">Généré le ${now}</div>
    </div>
    <div style="height:4px;background:linear-gradient(90deg,#3B7BF6 0%,#06B6D4 100%);"></div>
  </div>`
}

export async function generateProjectReportPdf({ project, tasks, missions, agenceSettings }) {
  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;visibility:visible;z-index:-1;'
  container.innerHTML = buildTemplate({ project, tasks, missions, agenceSettings })
  document.body.appendChild(container)

  await new Promise(r => setTimeout(r, 80))

  const SCALE = 2
  const canvas = await html2canvas(container, {
    scale: SCALE,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    width: 794,
    windowWidth: 794,
    logging: false,
  })

  document.body.removeChild(container)

  const pxPerMm   = canvas.width / 210
  const pageH_px  = Math.round(297 * pxPerMm)
  const contH_px  = Math.round(285 * pxPerMm)
  const totalH_px = canvas.height

  const pageStarts = [0]
  let nextCut = pageH_px
  while (nextCut < totalH_px) {
    pageStarts.push(nextCut)
    nextCut += contH_px
  }
  pageStarts.push(totalH_px)

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  for (let i = 0; i < pageStarts.length - 1; i++) {
    if (i > 0) pdf.addPage()
    const startPx = pageStarts[i]
    const endPx   = pageStarts[i + 1]
    const sliceH  = endPx - startPx
    const yMm     = i === 0 ? 0 : 6

    const slice = document.createElement('canvas')
    slice.width  = canvas.width
    slice.height = sliceH
    slice.getContext('2d').drawImage(canvas, 0, startPx, canvas.width, sliceH, 0, 0, canvas.width, sliceH)
    pdf.addImage(slice.toDataURL('image/jpeg', 0.93), 'JPEG', 0, yMm, 210, sliceH / pxPerMm)
  }

  const slug = (project.nom || 'projet').replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 40)
  pdf.save(`Rapport_${slug}_${new Date().toISOString().slice(0, 10)}.pdf`)
}
