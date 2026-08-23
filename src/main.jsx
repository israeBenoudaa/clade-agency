import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster, useToasterStore, toast } from 'react-hot-toast'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { DataProvider } from './context/DataContext.jsx'
import './styles/index.css'

const base = {
  background: 'rgba(255, 255, 255, 0.72)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  color: '#0A1E3F',
  borderRadius: '14px',
  fontSize: '13px',
  fontFamily: 'Inter Tight, sans-serif',
  fontWeight: 600,
  letterSpacing: '0.01em',
  padding: '12px 16px',
  maxWidth: '340px',
  border: '1px solid rgba(255,255,255,0.9)',
  boxShadow: '0 4px 24px rgba(10,30,63,0.10), 0 1px 4px rgba(10,30,63,0.06)',
}

const TOAST_OPTIONS = {
  duration: 3200,
  style: base,
  success: {
    iconTheme: { primary: '#16a34a', secondary: '#fff' },
    style: {
      ...base,
      border: '1px solid rgba(22,163,74,0.18)',
      boxShadow: '0 4px 24px rgba(22,163,74,0.10), 0 1px 4px rgba(10,30,63,0.06)',
    },
  },
  error: {
    iconTheme: { primary: '#dc2626', secondary: '#fff' },
    style: {
      ...base,
      border: '1px solid rgba(220,38,38,0.18)',
      boxShadow: '0 4px 24px rgba(220,38,38,0.10), 0 1px 4px rgba(10,30,63,0.06)',
    },
  },
  loading: {
    iconTheme: { primary: '#06B6D4', secondary: 'rgba(255,255,255,0.4)' },
    style: { ...base },
  },
}

function SingleToaster() {
  const { toasts } = useToasterStore()
  useEffect(() => {
    const visible = toasts.filter(t => t.visible)
    if (visible.length > 1) {
      visible.slice(0, visible.length - 1).forEach(t => toast.dismiss(t.id))
    }
  }, [toasts])

  return (
    <Toaster
      position="bottom-center"
      gutter={8}
      toastOptions={TOAST_OPTIONS}
      containerStyle={{ bottom: 24 }}
    />
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <App />
          <SingleToaster />
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
