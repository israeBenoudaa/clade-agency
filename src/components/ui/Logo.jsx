export function CladeLogo({ size = 36, light = false }) {
  const bg = light ? '#FAFBFD' : '#0A1E3F'
  const fg = light ? '#0A1E3F' : '#FAFBFD'
  const accent = '#06B6D4'
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill={bg} />
      <path d="M16 20 L16 44 L48 44" stroke={accent} strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="16" cy="20" r="3" fill={accent} />
      <circle cx="48" cy="44" r="3" fill={accent} />
      <path d="M16 44 L32 20 L48 44" stroke={fg} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function CladeBrand({ light = false, vertical = false }) {
  return (
    <div className={`flex items-center gap-3 ${vertical ? 'flex-col' : ''}`}>
      <CladeLogo size={40} light={light} />
      <div>
        <div className={`font-display text-2xl leading-none tracking-tight ${light ? 'text-paper' : 'text-ink'}`}>
          CLADE<span className="text-electric">.</span>
        </div>
        <div className={`text-[10px] tracking-[0.2em] uppercase mt-1 ${light ? 'text-paper/60' : 'text-muted'}`}>
          Agence d'Architecture
        </div>
      </div>
    </div>
  )
}
