import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, ArrowRight, Eye, EyeOff, User, Briefcase, ShieldCheck, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { CladeBrand } from '../../components/ui/Logo'

function LeftPanel({ mouse }) {
  return (
    <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden" style={{ background: '#06101F' }}>
      {/* Subtle radial glows */}
      <div className="absolute rounded-full"
        style={{ width: 600, height: 600, background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 65%)',
          top: `${-5 + mouse.y * 0.04}%`, left: `${-10 + mouse.x * 0.04}%`, pointerEvents: 'none' }} />
      <div className="absolute rounded-full"
        style={{ width: 400, height: 400, background: 'radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 65%)',
          bottom: `${10 + mouse.y * 0.025}%`, right: `${5 + mouse.x * 0.025}%`, pointerEvents: 'none' }} />

      {/* Fine dot grid */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.06 }} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.8" fill="#06B6D4" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)" />
      </svg>

      {/* Architectural blueprint — floor plan */}
      <svg className="absolute" style={{ bottom: '8%', right: '-2%', width: 340, height: 340, opacity: 0.13 }} viewBox="0 0 200 200">
        <rect x="18" y="30" width="164" height="130" fill="none" stroke="#06B6D4" strokeWidth="1" />
        <rect x="18" y="30" width="80" height="70"  fill="none" stroke="#06B6D4" strokeWidth="0.6" />
        <rect x="98" y="30" width="84" height="50"  fill="none" stroke="#06B6D4" strokeWidth="0.6" />
        <rect x="18" y="100" width="164" height="60" fill="none" stroke="#06B6D4" strokeWidth="0.6" />
        <line x1="18"  y1="160" x2="182" y2="160" stroke="#FAFBFD" strokeWidth="0.4" strokeDasharray="3 3" />
        <line x1="18"  y1="170" x2="182" y2="170" stroke="#FAFBFD" strokeWidth="0.4" />
        <text x="100" y="180" fill="#FAFBFD" fontSize="5" textAnchor="middle" opacity="0.5" letterSpacing="1">16.00 m</text>
        <line x1="8"  y1="30" x2="8"  y2="160" stroke="#FAFBFD" strokeWidth="0.4" />
        <text x="4"  y="98" fill="#FAFBFD" fontSize="5" textAnchor="middle" opacity="0.5" transform="rotate(-90,4,98)" letterSpacing="1">8.60 m</text>
      </svg>

      {/* Thin vertical accent line */}
      <div className="absolute top-0 bottom-0 left-0 w-px" style={{ background: 'linear-gradient(to bottom, transparent, rgba(6,182,212,0.3) 30%, rgba(6,182,212,0.3) 70%, transparent)' }} />

      <div className="relative z-10 flex flex-col justify-between p-14 xl:p-18 w-full">
        {/* Logo */}
        <div className="animate-fade-in">
          <CladeBrand light size="lg" />
        </div>

        {/* Headline */}
        <div className="max-w-md animate-slide-up" style={{ marginBottom: '4rem' }}>
          <div className="mb-5" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 20, height: 1, background: '#06B6D4', opacity: 0.7 }} />
            <span style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(6,182,212,0.8)' }}>
              Plateforme de gestion intégrée
            </span>
          </div>
          <h1 className="font-display text-paper leading-[1.08] tracking-tight" style={{ fontSize: 'clamp(2.4rem, 3.5vw, 3.6rem)' }}>
            Construire avec <em className="text-electric">précision</em>.<br />
            Gérer avec <em className="text-electric">intelligence</em>.
          </h1>
        </div>

        {/* Footer meta */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: "'Inter Tight', sans-serif", fontSize: 10, color: 'rgba(250,251,253,0.25)', letterSpacing: '0.06em' }}>
          <span>© 2026 Clade Architecture</span>
          <span>v1.0 · Rabat, MA</span>
        </div>
      </div>
    </div>
  )
}

function MobileHero() {
  const containerRef = useRef(null)
  const dotRef = useRef(null)
  const [center, setCenter] = useState({ cx: '74%', cy: '74%' })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const measure = () => {
      if (!containerRef.current || !dotRef.current) return
      const cRect = containerRef.current.getBoundingClientRect()
      const dRect = dotRef.current.getBoundingClientRect()
      const cx = ((dRect.left + dRect.width / 2 - cRect.left) / cRect.width * 100).toFixed(1) + '%'
      // period glyph centre ≈ 28% above the bottom edge of the line box
      const cy = ((dRect.bottom - dRect.height * 0.28 - cRect.top) / cRect.height * 100).toFixed(1) + '%'
      setCenter({ cx, cy })
      setReady(true)
    }
    // Wait for framer-motion entrance animation to settle (~0.28 + 0.6s)
    const timer = setTimeout(measure, 950)
    window.addEventListener('resize', measure)
    return () => { clearTimeout(timer); window.removeEventListener('resize', measure) }
  }, [])

  return (
    <div ref={containerRef} className="lg:hidden relative bg-gradient-ink overflow-hidden flex-shrink-0" style={{ height: 242 }}>
      <div className="absolute mesh-blob rounded-full blur-3xl opacity-40"
        style={{ width: 300, height: 300, background: 'radial-gradient(circle, #06B6D4 0%, transparent 70%)', top: -100, left: -100 }} />
      <div className="absolute mesh-blob rounded-full blur-3xl opacity-20"
        style={{ width: 200, height: 200, background: 'radial-gradient(circle, #3B82F6 0%, transparent 70%)', bottom: -50, right: 10, animationDelay: '5s' }} />

      <svg className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-700 ${ready ? 'opacity-100' : 'opacity-0'}`}>
        {[0, 1.9, 3.8].map((delay, i) => (
          <circle key={i} cx={center.cx} cy={center.cy} r="5" fill="none" stroke="#06B6D4" strokeWidth="1.1">
            <animate attributeName="r" from="5" to="158" dur="5.7s" begin={`${delay}s`} repeatCount="indefinite"
              calcMode="spline" keySplines="0.25 0 0.75 1" />
            <animate attributeName="opacity" from="0.38" to="0" dur="5.7s" begin={`${delay}s`} repeatCount="indefinite" />
          </circle>
        ))}
        {/* Pulsing dot centred on the "." measured via dotRef */}
        <circle cx={center.cx} cy={center.cy} r="2.5" fill="#06B6D4">
          <animate attributeName="opacity" values="0.35;1;0.35" dur="2.4s" repeatCount="indefinite" />
          <animate attributeName="r" values="2;3.2;2" dur="2.4s" repeatCount="indefinite" />
        </circle>
      </svg>

      <div className="relative z-10 h-full flex flex-col px-6 pt-6 pb-8">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}>
          <CladeBrand light size="sm" />
        </motion.div>
        <div className="flex-1 flex flex-col justify-end">
          <motion.h2
            className="font-display text-paper tracking-tight"
            style={{ fontSize: 'clamp(1.75rem, 9vw, 2.5rem)', lineHeight: 1.1 }}
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.6 }}>
            Construire avec <em className="text-electric">précision</em> <span ref={dotRef} className="text-electric">.</span>
          </motion.h2>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  const [accountType, setAccountType] = useState('staff')
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting,  setSubmitting]  = useState(false)
  const [mouse, setMouse] = useState({ x: 50, y: 50 })

  // PIN step
  const [step, setStep] = useState('credentials') // 'credentials' | 'pin'
  const [pin,  setPin]  = useState(['', '', '', '', '', ''])
  const pinRefs = useRef([])

  const { signIn, verifyDirectorPin, profile, session } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const handleMouse = (e) => setMouse({ x: (e.clientX / window.innerWidth) * 100, y: (e.clientY / window.innerHeight) * 100 })
    window.addEventListener('mousemove', handleMouse)
    return () => window.removeEventListener('mousemove', handleMouse)
  }, [])

  useEffect(() => {
    if (session && profile) {
      navigate(profile.role === 'client' ? '/client' : '/app', { replace: true })
    }
  }, [session, profile, navigate])

  // Auto-focus first PIN box when entering PIN step
  useEffect(() => {
    if (step === 'pin') {
      setTimeout(() => pinRefs.current[0]?.focus(), 100)
    }
  }, [step])

  const switchTab = (type) => { setAccountType(type); setEmail(''); setPassword('') }

  // ── Step 1: credentials ───────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) { toast.error('Renseigne ton identifiant et ton mot de passe'); return }
    setSubmitting(true)
    try {
      const result = await signIn(email, password)
      if (result?.requiresPin) {
        setStep('pin')
        return
      }
      toast.success('Connexion réussie')
    } catch (err) {
      toast.error(err.message || 'Identifiants invalides')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Step 2: PIN ───────────────────────────────────────────────────────────
  const handlePinInput = (index, value) => {
    const digit = value.replace(/\D/, '').slice(-1)
    const newPin = [...pin]
    newPin[index] = digit
    setPin(newPin)
    if (digit && index < 5) pinRefs.current[index + 1]?.focus()
    // Auto-submit when all digits filled
    if (digit && index === 5) {
      const full = newPin.join('')
      if (full.length === 6) submitPin(full)
    }
  }

  const handlePinKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinRefs.current[index - 1]?.focus()
    }
    if (e.key === 'Enter') {
      const full = pin.join('')
      if (full.length === 6) submitPin(full)
    }
  }

  const submitPin = async (pinStr) => {
    if (pinStr.length < 6) { toast.error('Saisissez les 6 chiffres du PIN'); return }
    setSubmitting(true)
    try {
      await verifyDirectorPin(pinStr)
      toast.success('Connexion réussie')
    } catch (err) {
      toast.error(err.message || 'PIN incorrect')
      setPin(['', '', '', '', '', ''])
      setTimeout(() => pinRefs.current[0]?.focus(), 50)
    } finally {
      setSubmitting(false)
    }
  }

  const handlePinSubmit = (e) => {
    e.preventDefault()
    submitPin(pin.join(''))
  }

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-paper overflow-hidden">
      <LeftPanel mouse={mouse} />

      {/* RIGHT PANEL */}
      <div className="flex-1 flex flex-col bg-paper overflow-y-auto lg:overflow-visible">
        <MobileHero />
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <AnimatePresence mode="wait">

          {/* ── STEP 1: CREDENTIALS ── */}
          {step === 'credentials' && (
            <motion.div key="credentials"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35 }}
              className="w-full max-w-md">

              <div className="mb-8">
                <div className="flex items-center gap-2 mb-5">
                  <div style={{ width: 16, height: 1, background: '#06B6D4' }} />
                  <span className="text-[10px] tracking-[0.28em] uppercase text-muted font-medium">Espace privé</span>
                </div>
                <h2 className="font-display leading-none mb-2.5" style={{ fontSize: 'clamp(2rem, 4vw, 2.6rem)', color: '#0A1E3F' }}>Bon retour.</h2>
                <p className="text-muted text-sm">Connectez-vous pour accéder à votre espace.</p>
              </div>

              {/* Staff / Client toggle */}
              <div className="relative bg-paper-warm rounded-2xl p-1 mb-6 flex border border-border">
                <motion.div className="absolute inset-y-1 bg-ink rounded-xl shadow-lg"
                  animate={{ left: accountType === 'staff' ? '0.25rem' : '50%', right: accountType === 'staff' ? '50%' : '0.25rem' }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
                <button type="button" onClick={() => switchTab('staff')}
                  className={`relative z-10 flex-1 py-3 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${accountType === 'staff' ? 'text-paper' : 'text-muted'}`}>
                  <Briefcase size={15} /> Collaborateur
                </button>
                <button type="button" onClick={() => switchTab('client')}
                  className={`relative z-10 flex-1 py-3 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${accountType === 'client' ? 'text-paper' : 'text-muted'}`}>
                  <User size={15} /> Client
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="label-text mb-2 block">Identifiant</label>
                  <div className="relative">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                    <input type="text" value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="votre identifiant"
                      className="input-field pl-11" autoComplete="username" required />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="label-text">Mot de passe</label>
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                    <input type={showPassword ? 'text' : 'password'} value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••" className="input-field pl-11 pr-11" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-ink">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <motion.button type="submit" disabled={submitting}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="w-full bg-ink text-paper py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-ink-soft transition-colors disabled:opacity-50 shadow-lg shadow-ink/10">
                  {submitting ? <><span className="w-4 h-4 border-2 border-paper/30 border-t-paper rounded-full animate-spin" />Vérification...</> : <>Se connecter <ArrowRight size={16} /></>}
                </motion.button>
              </form>

              <div className="mt-8 pt-6 border-t border-border text-center">
                <p className="text-xs text-muted">Pas encore de compte ? Contactez votre administrateur.</p>
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: PIN ── */}
          {step === 'pin' && (
            <motion.div key="pin"
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
              className="w-full max-w-md">

              {/* Back button */}
              <button onClick={() => { setStep('credentials'); setPin(['', '', '', '', '', '']) }}
                className="flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors mb-8">
                <ArrowLeft size={14} /> Retour à la connexion
              </button>

              {/* Icon + title */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-electric/10 flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck size={28} className="text-electric" />
                </div>
                <div className="text-xs tracking-widest uppercase text-muted mb-2">◆ Double sécurité</div>
                <h2 className="font-display text-3xl text-ink leading-none mb-2">Saisissez votre PIN</h2>
                <p className="text-sm text-muted">
                  Identifiant <strong className="text-ink">{email}</strong> · Entrez votre code PIN à 6 chiffres
                </p>
              </div>

              <form onSubmit={handlePinSubmit}>
                {/* 6 digit boxes */}
                <div className="flex gap-3 justify-center mb-8">
                  {pin.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => pinRefs.current[i] = el}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handlePinInput(i, e.target.value)}
                      onKeyDown={e => handlePinKeyDown(i, e)}
                      className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-xl transition-colors outline-none
                        focus:border-electric focus:ring-2 focus:ring-electric/20
                        ${digit ? 'border-electric bg-electric/5 text-electric' : 'border-border bg-paper-warm text-ink'}`}
                    />
                  ))}
                </div>

                <motion.button type="submit" disabled={submitting || pin.join('').length < 6}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="w-full bg-ink text-paper py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-ink-soft transition-colors disabled:opacity-40 shadow-lg shadow-ink/10">
                  {submitting
                    ? <><span className="w-4 h-4 border-2 border-paper/30 border-t-paper rounded-full animate-spin" />Vérification...</>
                    : <><ShieldCheck size={16} /> Valider le PIN</>}
                </motion.button>
              </form>

              <p className="text-center text-xs text-muted mt-6">
                Ce PIN est personnel et confidentiel. Ne le partagez jamais.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
