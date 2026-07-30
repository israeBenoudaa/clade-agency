import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

export default function SelectField({ value, onChange, options, placeholder = '— Sélectionner —', className = '', error = false }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const selected = options.find(o => (o.value ?? o) === value)
  const label = selected ? (selected.label ?? selected) : null

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border text-sm text-left transition-all cursor-pointer
          ${open
            ? 'border-electric shadow-[0_0_0_3px_rgba(56,189,248,0.12)] bg-white'
            : error
              ? 'border-rose-400 bg-white'
              : 'border-border bg-white hover:border-electric/40 shadow-[0_1px_3px_rgba(10,30,63,0.05)]'
          }`}
      >
        <span className={label ? 'text-ink' : 'text-muted'}>{label || placeholder}</span>
        <ChevronDown
          size={14}
          className={`flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180 text-electric' : 'text-muted'}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.13, ease: 'easeOut' }}
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-[200] bg-white border border-border rounded-xl shadow-[0_8px_32px_rgba(10,30,63,0.12),0_2px_8px_rgba(10,30,63,0.06)] overflow-hidden"
          >
            {options.map((opt) => {
              const val = opt.value ?? opt
              const lbl = opt.label ?? opt
              const isSelected = val === value
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => { onChange(val); setOpen(false) }}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-left transition-colors
                    ${isSelected
                      ? 'bg-electric/6 text-electric font-semibold'
                      : 'text-ink hover:bg-paper-warm'
                    }`}
                >
                  <span>{lbl}</span>
                  {isSelected && <Check size={13} className="flex-shrink-0 text-electric" />}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
