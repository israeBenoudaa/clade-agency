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

// Inline brand mark used in login page hero and sidebar
export function CladeBrand({ light = false, size = 'md' }) {
  const nameColor  = light ? '#FAFBFD' : '#0A1E3F'
  const subColor   = light ? 'rgba(250,251,253,0.45)' : 'rgba(10,30,63,0.4)'
  const nameSizes  = { sm: 20, md: 26, lg: 36 }
  const subSizes   = { sm: 7,  md: 8,  lg: 10 }
  const nameSize   = nameSizes[size] ?? nameSizes.md
  const subSize    = subSizes[size]  ?? subSizes.md

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
      <span style={{
        fontFamily: "'Averia Libre', serif",
        fontSize: nameSize,
        fontWeight: 400,
        lineHeight: 1,
        letterSpacing: '0.02em',
        color: nameColor,
      }}>
        Clade
      </span>
      <span style={{
        fontFamily: "'Inter Tight', -apple-system, sans-serif",
        fontSize: subSize,
        fontWeight: 500,
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        color: subColor,
        lineHeight: 1,
      }}>
        architects &amp; co
      </span>
    </div>
  )
}
