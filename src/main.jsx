import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { DataProvider } from './context/DataContext.jsx'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <App />
          <Toaster
            position="top-center"
            gutter={10}
            toastOptions={(() => {
              const base = {
                background: 'rgba(10,11,13,0.82)',
                backdropFilter: 'blur(32px)',
                WebkitBackdropFilter: 'blur(32px)',
                color: '#F5F0EA',
                borderRadius: '16px',
                fontSize: '13px',
                fontFamily: 'Inter Tight, sans-serif',
                fontWeight: 500,
                letterSpacing: '0.015em',
                padding: '13px 18px',
                maxWidth: '400px',
                border: '1px solid rgba(245,240,234,0.08)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.55), inset 0 1px 0 rgba(245,240,234,0.06)',
              }
              return {
                duration: 3800,
                style: base,
                success: {
                  iconTheme: { primary: '#8DBE8A', secondary: 'rgba(10,11,13,0.85)' },
                  style: { ...base, border: '1px solid rgba(141,190,138,0.2)', boxShadow: '0 16px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(141,190,138,0.07), inset 0 1px 0 rgba(141,190,138,0.1)' },
                },
                error: {
                  iconTheme: { primary: '#C8A47B', secondary: 'rgba(10,11,13,0.85)' },
                  style: { ...base, border: '1px solid rgba(200,164,123,0.2)', boxShadow: '0 16px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(200,164,123,0.07), inset 0 1px 0 rgba(200,164,123,0.1)' },
                },
              }
            })()}
          />
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
