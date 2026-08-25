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

/* Base logo — valeurs fixes identiques au Navbar portfolio validé.
   `scale` zoome tout uniformément sans déformer les proportions. */
export function CladeBrand({ light = false, scale = 1 }) {
  const nameColor    = light ? '#FAFBFD'                : '#0A1E3F'
  const bracketColor = light ? 'rgba(250,251,253,0.45)' : 'rgba(10,30,63,0.35)'
  const subColor     = light ? 'rgba(250,251,253,0.62)' : 'rgba(10,30,63,0.48)'

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.18em', zoom: scale }}>
      <span style={{ fontFamily: "'Averia Libre', serif", fontSize: 32, fontWeight: 400, color: bracketColor, lineHeight: 1, userSelect: 'none' }}>
        [
      </span>

      <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'stretch', gap: 0 }}>
        <span style={{ fontFamily: "'Averia Libre', serif", fontSize: 22, fontWeight: 400, letterSpacing: '0.05em', color: nameColor, lineHeight: 1 }}>
          Clade
        </span>
        <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 7.5, fontWeight: 500, color: subColor, letterSpacing: '0.16em', lineHeight: 1, textAlign: 'center' }}>
          architects &amp; co
        </span>
      </span>

      <span style={{ fontFamily: "'Averia Libre', serif", fontSize: 32, fontWeight: 400, color: bracketColor, lineHeight: 1, userSelect: 'none' }}>
        ]
      </span>
    </div>
  )
}
