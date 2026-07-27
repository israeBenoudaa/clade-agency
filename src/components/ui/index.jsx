// Avatar avec gradient personnalisé selon les initiales
export function Avatar({ initials, size = 36 }) {
  const gradients = [
    'linear-gradient(135deg, #0A1E3F, #3B82F6)',
    'linear-gradient(135deg, #1B3260, #06B6D4)',
    'linear-gradient(135deg, #3B82F6, #10B981)',
    'linear-gradient(135deg, #06B6D4, #0A1E3F)',
    'linear-gradient(135deg, #1B3260, #F59E0B)',
  ]
  const idx = initials
    ? (initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % gradients.length
    : 0
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: gradients[idx],
        fontSize: size * 0.36,
        letterSpacing: '-0.02em',
      }}
    >
      {initials}
    </div>
  )
}

// Badge de statut
export function StatusBadge({ statut }) {
  const map = {
    'En cours': { bg: '#E0F2FE', fg: '#0369A1', dot: '#06B6D4' },
    'À valider': { bg: '#FEF3C7', fg: '#92400E', dot: '#F59E0B' },
    'Terminée': { bg: '#D1FAE5', fg: '#065F46', dot: '#10B981' },
    'Terminé': { bg: '#D1FAE5', fg: '#065F46', dot: '#10B981' },
    'Retardée': { bg: '#FEE2E2', fg: '#991B1B', dot: '#F43F5E' },
    'Payée': { bg: '#D1FAE5', fg: '#065F46', dot: '#10B981' },
    'Réglé': { bg: '#D1FAE5', fg: '#065F46', dot: '#10B981' },
    'En attente': { bg: '#FEF3C7', fg: '#92400E', dot: '#F59E0B' },
    'En retard': { bg: '#FEE2E2', fg: '#991B1B', dot: '#F43F5E' },
    'Approuvé': { bg: '#D1FAE5', fg: '#065F46', dot: '#10B981' },
    'Critique': { bg: '#FEE2E2', fg: '#991B1B', dot: '#F43F5E' },
    'Haute': { bg: '#FED7AA', fg: '#9A3412', dot: '#F59E0B' },
    'Moyenne': { bg: '#E0F2FE', fg: '#0369A1', dot: '#06B6D4' },
    'À venir': { bg: '#F1F5F9', fg: '#475569', dot: '#94A3B8' },
    'Prévue': { bg: '#F1F5F9', fg: '#475569', dot: '#94A3B8' },
  }
  const s = map[statut] || map['En cours']
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide"
      style={{ background: s.bg, color: s.fg }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
      {statut}
    </span>
  )
}

// Mini sparkline SVG
export function Sparkline({ data, color = '#06B6D4', height = 40 }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * 100
      const y = 100 - ((v - min) / range) * 100
      return `${x},${y}`
    })
    .join(' ')
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ width: '100%', height }}
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

// Progress bar
export function ProgressBar({ value, color }) {
  const autoColor = color || (value > 75 ? '#10B981' : value > 40 ? '#06B6D4' : '#F59E0B')
  return (
    <div className="h-1.5 bg-border rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-1000"
        style={{ width: `${value}%`, background: autoColor }}
      />
    </div>
  )
}
