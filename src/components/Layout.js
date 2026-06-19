'use client'
import { useState, useEffect } from 'react'
import { supabase, logout, getUserProfile } from '@/lib/supabase'
import Header from './Header'
import Sidebar from './Sidebar'
import Login from './Login'
import Ringkasan from './halaman/Ringkasan'
import Stok from './halaman/Stok'
import Transaksi from './halaman/Transaksi'
import Hutang from './halaman/Hutang'
import Kas from './halaman/Kas'
import Export from './halaman/Export'

export default function Layout() {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [aktif, setAktif]     = useState('ringkasan')
  const [authLoading, setAuthLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  // Deteksi mobile
  useEffect(() => {
    function cekUkuran() {
      setIsMobile(window.innerWidth <= 768)
    }
    cekUkuran()
    window.addEventListener('resize', cekUkuran)
    return () => window.removeEventListener('resize', cekUkuran)
  }, [])

  useEffect(() => {
    async function cekSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        await muatProfile(session.user.id)
      }
      setAuthLoading(false)
    }
    cekSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          await muatProfile(session.user.id)
        } else {
          setUser(null)
          setProfile(null)
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  async function muatProfile(userId) {
    const { data } = await getUserProfile(userId)
    if (data) setProfile(data)
  }

  async function handleLogout() {
    await logout()
    setUser(null)
    setProfile(null)
    setAktif('ringkasan')
  }

  const isAdmin = profile?.role === 'admin'

  const menuAdmin = [
    { id: 'ringkasan',  label: 'Ringkasan',       ikon: '📊' },
    { id: 'stok',       label: 'Stok',             ikon: '📦' },
    { id: 'transaksi',  label: 'Transaksi',        ikon: '🛒' },
    { id: 'hutang',     label: 'Hutang',           ikon: '💳' },
    { id: 'kas',        label: 'Kas',              ikon: '💰' },
    { id: 'export',     label: 'Export',           ikon: '📤' },
    { id: 'pengaturan', label: 'Pengaturan',       ikon: '⚙️' },
  ]

  const menuKasir = [
    { id: 'ringkasan',  label: 'Ringkasan',       ikon: '📊' },
    { id: 'stok',       label: 'Stok',            ikon: '📦' },
    { id: 'transaksi',  label: 'Transaksi',       ikon: '🛒' },
    { id: 'hutang',     label: 'Hutang',          ikon: '💳' },
    { id: 'kas',        label: 'Kas',             ikon: '💰' },
  ]

  const menus = isAdmin ? menuAdmin : menuKasir

  // Menu yang tampil di bottom nav mobile (max 5)
  const menuMobile = [
    { id: 'ringkasan',  label: 'Beranda',    ikon: '📊' },
    { id: 'transaksi',  label: 'Transaksi',  ikon: '🛒' },
    { id: 'stok',       label: 'Stok',       ikon: '📦' },
    { id: 'hutang',     label: 'Hutang',     ikon: '💳' },
    { id: 'kas',        label: 'Kas',        ikon: '💰' },
  ]

  const halaman = {
    ringkasan:  <Ringkasan />,
    stok:       <Stok isAdmin={isAdmin} />,
    transaksi:  <Transaksi />,
    hutang:     <Hutang />,
    kas:        <Kas />,
    ...(isAdmin && {
      export:     <Export />,
      pengaturan: <Pengaturan profile={profile} />,
    }),
  }

  if (authLoading) {
  return <LoadingScreen />
}

  if (!user) return <Login onLoginSuccess={setUser} />

  return (
    <div>
      <Header profile={profile} onLogout={handleLogout} isMobile={isMobile} />

      <div style={{ display: 'flex', paddingTop: 60, minHeight: '100vh' }}>

        {/* Sidebar — hanya tampil di desktop */}
        {!isMobile && (
          <Sidebar aktif={aktif} onChange={setAktif} menus={menus} />
        )}

        {/* Konten Utama */}
        <main style={{
          marginLeft: isMobile ? 0 : 240,
          flex: 1,
          padding: isMobile ? '16px' : '28px',
          paddingBottom: isMobile ? '80px' : '28px',
          minHeight: 'calc(100vh - 60px)',
        }}>
          {halaman[aktif] || <Ringkasan />}
        </main>
      </div>

      {/* Bottom Navigation — hanya tampil di mobile */}
      {isMobile && (
        <nav style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          background: '#1e293b',
          borderTop: '1px solid #334155',
          display: 'flex',
          zIndex: 100,
          paddingBottom: 'env(safe-area-inset-bottom)', // iPhone notch support
        }}>
          {menuMobile.map(menu => (
            <button
              key={menu.id}
              onClick={() => setAktif(menu.id)}
              style={{
                flex: 1,
                padding: '8px 4px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                color: aktif === menu.id ? '#4ade80' : '#475569',
                fontFamily: 'inherit',
                transition: 'color 0.15s',
              }}
            >
              <span style={{ fontSize: 20 }}>{menu.ikon}</span>
              <span style={{
                fontSize: 10, fontWeight: aktif === menu.id ? 700 : 500,
              }}>
                {menu.label}
              </span>
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}

// ── LOADING SCREEN — dengan pesan progresif ──────────────────
function LoadingScreen() {
  const [detik, setDetik] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setDetik(d => d + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  // Pesan berubah sesuai lama loading — supaya user tahu app tidak hang
  let pesan = 'Memuat aplikasi...'
  let subpesan = ''
  if (detik >= 5 && detik < 15) {
    pesan = 'Menghubungkan ke server...'
    subpesan = 'Mohon tunggu sebentar'
  } else if (detik >= 15 && detik < 30) {
    pesan = 'Server sedang bangun...'
    subpesan = 'Ini terjadi saat pertama kali dibuka setelah lama tidak aktif'
  } else if (detik >= 30) {
    pesan = 'Hampir selesai...'
    subpesan = 'Koneksi pertama memang lebih lama, setelah ini akan lebih cepat'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 320 }}>
        <div style={{
          fontSize: 48, marginBottom: 20,
          animation: 'bounce 1.5s ease-in-out infinite',
        }}>🏸</div>

        {/* Progress bar animasi */}
        <div style={{ width: '100%', height: 4, background: '#1e293b', borderRadius: 4, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{
            height: '100%', background: 'linear-gradient(90deg, #16a34a, #22c55e)',
            width: '40%', borderRadius: 4,
            animation: 'loading-slide 1.5s ease-in-out infinite',
          }} />
        </div>

        <div style={{ color: '#f1f5f9', fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
          {pesan}
        </div>
        {subpesan && (
          <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5 }}>
            {subpesan}
          </div>
        )}

        {detik >= 3 && (
          <div style={{ color: '#475569', fontSize: 12, marginTop: 16, fontFamily: 'monospace' }}>
            {detik}s
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes loading-slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  )
}


// Halaman Pengaturan
function Pengaturan({ profile }) {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5, marginBottom: 4 }}>⚙️ Pengaturan</div>
        <div style={{ fontSize: 14, color: '#94a3b8' }}>Kelola akun dan pengaturan aplikasi</div>
      </div>
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #334155' }}>
          👤 Info Akun
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ color: '#94a3b8', minWidth: 100 }}>Nama:</span>
            <span style={{ fontWeight: 600 }}>{profile?.nama || '–'}</span>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ color: '#94a3b8', minWidth: 100 }}>Email:</span>
            <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{profile?.email || '–'}</span>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ color: '#94a3b8', minWidth: 100 }}>Role:</span>
            <span style={{
              background: profile?.role === 'admin' ? '#dcfce7' : '#dbeafe',
              color: profile?.role === 'admin' ? '#14532d' : '#1e40af',
              padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
            }}>
              {profile?.role === 'admin' ? '👑 Admin' : '🧑‍💼 Kasir'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}