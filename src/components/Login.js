'use client'
import { useState } from 'react'
import { login } from '@/lib/supabase'

export default function Login({ onLoginSuccess }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  async function handleLogin() {
    if (!email || !password) {
      setError('Email dan password wajib diisi!')
      return
    }
    setLoading(true)
    setError(null)

    const { data, error: errLogin } = await login(email, password)

    if (errLogin) {
      setError('Email atau password salah. Coba lagi.')
      setLoading(false)
      return
    }

    // Login berhasil — panggil callback
    onLoginSuccess(data.user)
    setLoading(false)
  }

  // Enter untuk login
  function handleKeyDown(e) {
    if (e.key === 'Enter') handleLogin()
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f172a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
    }}>
      <div style={{
        width: 400, maxWidth: '90vw',
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: 16,
        padding: 40,
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56,
            background: 'linear-gradient(135deg, #16a34a, #22c55e)',
            borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, margin: '0 auto 16px',
          }}>🏸</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', letterSpacing: -0.5 }}>
            Badminton <span style={{ color: '#16a34a' }}>Manager</span>
          </div>
          <div style={{ fontSize: 14, color: '#94a3b8', marginTop: 6 }}>
            Masuk untuk mengelola bisnis kamu
          </div>
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
              Email
            </label>
            <input
              style={{
                background: '#0f172a', border: '1px solid #334155',
                borderRadius: 8, color: '#f1f5f9',
                fontFamily: 'inherit', fontSize: 14,
                padding: '10px 14px', outline: 'none', width: '100%',
                boxSizing: 'border-box',
              }}
              type="email"
              placeholder="email@kamu.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
              Password
            </label>
            <input
              style={{
                background: '#0f172a', border: '1px solid #334155',
                borderRadius: 8, color: '#f1f5f9',
                fontFamily: 'inherit', fontSize: 14,
                padding: '10px 14px', outline: 'none', width: '100%',
                boxSizing: 'border-box',
              }}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(220,38,38,0.1)',
              border: '1px solid rgba(220,38,38,0.3)',
              borderRadius: 8, padding: '10px 14px',
              fontSize: 13, color: '#fca5a5',
            }}>
              ❌ {error}
            </div>
          )}

          {/* Tombol Login */}
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              padding: '11px',
              borderRadius: 8,
              background: loading ? '#334155' : '#16a34a',
              color: 'white', border: 'none',
              fontSize: 14, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              marginTop: 4,
            }}
          >
            {loading ? '⏳ Memproses...' : '🔐 Masuk'}
          </button>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: '#475569' }}>
          Badminton Manager v1.0 · Data aman di Supabase
        </div>
      </div>
    </div>
  )
}