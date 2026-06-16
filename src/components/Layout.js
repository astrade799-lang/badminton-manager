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
  const [user, setUser]       = useState(null)      // data user Supabase
  const [profile, setProfile] = useState(null)      // data role dari user_profiles
  const [aktif, setAktif]     = useState('ringkasan')
  const [authLoading, setAuthLoading] = useState(true) // cek session awal

  // ── CEK SESSION SAAT APP DIBUKA ───────────────────────────
  // Kenapa: supaya kalau user sudah pernah login,
  // tidak perlu login lagi saat refresh halaman
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

    // Listen perubahan auth (login/logout)
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

  function handleLoginSuccess(user) {
    setUser(user)
  }

  // ── MENU BERDASARKAN ROLE ─────────────────────────────────
  const isAdmin = profile?.role === 'admin'

  // Menu yang tampil di sidebar sesuai role
  const menuAdmin = [
    { id: 'ringkasan',  label: 'Ringkasan',        ikon: '📊' },
    { id: 'stok',       label: 'Manajemen Stok',   ikon: '📦' },
    { id: 'transaksi',  label: 'Transaksi',         ikon: '🛒' },
    { id: 'hutang',     label: 'Hutang Pelanggan',  ikon: '💳' },
    { id: 'kas',        label: 'Kas Bisnis',        ikon: '💰' },
    { id: 'export',     label: 'Export Laporan',    ikon: '📤' },
    { id: 'pengaturan', label: 'Pengaturan',        ikon: '⚙️' },
  ]

  const menuKasir = [
    { id: 'ringkasan',  label: 'Ringkasan',        ikon: '📊' },
    { id: 'stok',       label: 'Manajemen Stok',   ikon: '📦' },
    { id: 'transaksi',  label: 'Transaksi',         ikon: '🛒' },
    { id: 'hutang',     label: 'Hutang Pelanggan',  ikon: '💳' },
    { id: 'kas',        label: 'Kas Bisnis',        ikon: '💰' },
  ]

  const menus = isAdmin ? menuAdmin : menuKasir

  // Halaman yang bisa diakses
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

  // ── LOADING AWAL ──────────────────────────────────────────
  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>
        <div style={{ textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏸</div>
          <div>Memuat aplikasi...</div>
        </div>
      </div>
    )
  }

  // ── BELUM LOGIN → tampilkan halaman login ─────────────────
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />
  }

  // ── SUDAH LOGIN → tampilkan app ───────────────────────────
  return (
    <div>
      <Header
        profile={profile}
        onLogout={handleLogout}
      />
      <div style={{ display: 'flex', paddingTop: 60, minHeight: '100vh' }}>
        <Sidebar aktif={aktif} onChange={setAktif} menus={menus} />
        <main style={{ marginLeft: 240, flex: 1, padding: 28, minHeight: 'calc(100vh - 60px)' }}>
          {halaman[aktif] || <Ringkasan />}
        </main>
      </div>
    </div>
  )
}

// ── HALAMAN PENGATURAN (hanya admin) ─────────────────────────
function Pengaturan({ profile }) {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5, marginBottom: 4 }}>⚙️ Pengaturan</div>
        <div style={{ fontSize: 14, color: '#94a3b8' }}>Kelola akun dan pengaturan aplikasi</div>
      </div>
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #334155' }}>
          👤 Info Akun
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <span style={{ color: '#94a3b8', width: 100 }}>Nama:</span>
            <span style={{ fontWeight: 600 }}>{profile?.nama || '–'}</span>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <span style={{ color: '#94a3b8', width: 100 }}>Email:</span>
            <span style={{ fontFamily: 'monospace' }}>{profile?.email || '–'}</span>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <span style={{ color: '#94a3b8', width: 100 }}>Role:</span>
            <span style={{ background: profile?.role === 'admin' ? '#dcfce7' : '#dbeafe', color: profile?.role === 'admin' ? '#14532d' : '#1e40af', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
              {profile?.role === 'admin' ? '👑 Admin' : '🧑‍💼 Kasir'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}