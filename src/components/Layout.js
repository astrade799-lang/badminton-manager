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
import Match from './halaman/Match'
import Pemain from './halaman/Pemain'

export default function Layout() {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [aktif, setAktif]     = useState('ringkasan')
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showMenuLainnya, setShowMenuLainnya] = useState(false)

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
    let selesai = false

    async function cekSession() {
      try {
        // "Lomba" antara proses asli vs timer 10 detik — siapa duluan, itu yang menang.
        // Ini mencegah halaman macet selamanya kalau Supabase lambat bangun dari tidur.
        const hasil = await Promise.race([
          supabase.auth.getSession(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
        ])
        const { data: { session } } = hasil
        if (session?.user) {
          setUser(session.user)
          await Promise.race([
            muatProfile(session.user.id),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
          ])
        }
        selesai = true
        setAuthLoading(false)
      } catch (err) {
        if (!selesai) {
          setAuthError(true)
          setAuthLoading(false)
        }
      }
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
    { id: 'match',      label: 'Match',            ikon: '🏸' },
    { id: 'pemain',     label: 'Pemain',           ikon: '🧑‍🤝‍🧑' },
    { id: 'hutang',     label: 'Hutang',           ikon: '💳' },
    { id: 'kas',        label: 'Kas',              ikon: '💰' },
    { id: 'export',     label: 'Export',           ikon: '📤' },
    { id: 'pengaturan', label: 'Pengaturan',       ikon: '⚙️' },
  ]

  const menuKasir = [
    { id: 'ringkasan',  label: 'Ringkasan',       ikon: '📊' },
    { id: 'stok',       label: 'Stok',            ikon: '📦' },
    { id: 'transaksi',  label: 'Transaksi',       ikon: '🛒' },
    { id: 'match',      label: 'Match',           ikon: '🏸' },
    { id: 'pemain',     label: 'Pemain',          ikon: '🧑‍🤝‍🧑' },
    { id: 'hutang',     label: 'Hutang',          ikon: '💳' },
    { id: 'kas',        label: 'Kas',             ikon: '💰' },
  ]

  const menus = isAdmin ? menuAdmin : menuKasir

  // Menu yang tampil di bottom nav mobile (4 menu inti + 1 tombol "Lainnya")
  const menuMobile = [
    { id: 'ringkasan',  label: 'Beranda',    ikon: '📊' },
    { id: 'transaksi',  label: 'Transaksi',  ikon: '🛒' },
    { id: 'match',      label: 'Match',      ikon: '🏸' },
    { id: 'kas',        label: 'Kas',        ikon: '💰' },
  ]

  // Menu tambahan yang diakses lewat panel "Lainnya" di mobile (menu yang lebih jarang dipakai harian)
  const menuLainnyaAdmin = [
    { id: 'hutang',     label: 'Hutang',     ikon: '💳' },
    { id: 'pemain',     label: 'Pemain',     ikon: '🧑‍🤝‍🧑' },
    { id: 'stok',       label: 'Stok',       ikon: '📦' },
    { id: 'export',     label: 'Export',     ikon: '📤' },
    { id: 'pengaturan', label: 'Pengaturan', ikon: '⚙️' },
  ]
  const menuLainnyaKasir = [
    { id: 'hutang',     label: 'Hutang',     ikon: '💳' },
    { id: 'pemain',     label: 'Pemain',     ikon: '🧑‍🤝‍🧑' },
    { id: 'stok',       label: 'Stok',       ikon: '📦' },
  ]
  const menuLainnya = isAdmin ? menuLainnyaAdmin : menuLainnyaKasir

  const halaman = {
    ringkasan:  <Ringkasan onNavigate={setAktif} />,
    stok:       <Stok isAdmin={isAdmin} />,
    transaksi:  <Transaksi />,
    match:      <Match />,
    pemain:     <Pemain />,
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

  if (authError) {
    return <LoadingScreen gagal onCobaLagi={() => { setAuthError(false); setAuthLoading(true); window.location.reload() }} />
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
              onClick={() => { setAktif(menu.id); setShowMenuLainnya(false) }}
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

          {/* Tombol "Lainnya" — highlight kalau halaman aktif sekarang ada di dalam menuLainnya */}
          <button
            onClick={() => setShowMenuLainnya(true)}
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
              color: menuLainnya.some(m => m.id === aktif) ? '#4ade80' : '#475569',
              fontFamily: 'inherit',
              transition: 'color 0.15s',
            }}
          >
            <span style={{ fontSize: 20 }}>⋯</span>
            <span style={{ fontSize: 10, fontWeight: menuLainnya.some(m => m.id === aktif) ? 700 : 500 }}>
              Lainnya
            </span>
          </button>
        </nav>
      )}

      {/* Panel "Lainnya" — bottom sheet sederhana, isinya menu yang tidak masuk bottom nav utama */}
      {isMobile && showMenuLainnya && (
        <div
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:150, display:'flex', alignItems:'flex-end' }}
          onClick={() => setShowMenuLainnya(false)}
        >
          <div
            style={{ background:'#1e293b', borderTop:'1px solid #334155', borderRadius:'16px 16px 0 0', width:'100%', padding:'20px 16px', paddingBottom:'calc(20px + env(safe-area-inset-bottom))' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ width:36, height:4, background:'#334155', borderRadius:4, margin:'0 auto 16px' }} />
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12 }}>
              {menuLainnya.map(menu => (
                <button
                  key={menu.id}
                  onClick={() => { setAktif(menu.id); setShowMenuLainnya(false) }}
                  style={{
                    display:'flex', flexDirection:'column', alignItems:'center', gap:6,
                    padding:'16px 8px', borderRadius:12,
                    background: aktif === menu.id ? 'rgba(22,163,74,0.15)' : '#0f172a',
                    border:'none', cursor:'pointer', fontFamily:'inherit',
                  }}
                >
                  <span style={{ fontSize:24 }}>{menu.ikon}</span>
                  <span style={{ fontSize:12, fontWeight:600, color: aktif === menu.id ? '#4ade80' : '#94a3b8' }}>{menu.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── LOADING SCREEN — dengan pesan progresif ──────────────────
function LoadingScreen({ gagal, onCobaLagi }) {
  const [detik, setDetik] = useState(0)

  useEffect(() => {
    if (gagal) return
    const interval = setInterval(() => setDetik(d => d + 1), 1000)
    return () => clearInterval(interval)
  }, [gagal])

  if (gagal) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 320 }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>⚠️</div>
          <div style={{ color: '#f1f5f9', fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
            Gagal terhubung ke server
          </div>
          <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5, marginBottom: 20 }}>
            Server mungkin masih bangun dari tidur. Coba lagi sebentar.
          </div>
          <button
            onClick={onCobaLagi}
            style={{ padding: '10px 24px', borderRadius: 8, background: '#16a34a', color: 'white', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            🔄 Coba Lagi
          </button>
        </div>
      </div>
    )
  }

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
        <div style={{ fontSize: 48, marginBottom: 20 }}>🏸</div>

        {/* Progress bar — pakai CSS transition biasa, tanpa keyframes */}
        <div style={{ width: '100%', height: 4, background: '#1e293b', borderRadius: 4, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{
            height: '100%',
            background: 'linear-gradient(90deg, #16a34a, #22c55e)',
            width: `${Math.min(90, 20 + detik * 3)}%`,
            borderRadius: 4,
            transition: 'width 1s ease-out',
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
    </div>
  )
}

// ── HELPER (lokal untuk section Harga Paket Bola) ──────────────────
function formatRupiah(n) { return 'Rp ' + Number(n || 0).toLocaleString('id-ID') }

// Halaman Pengaturan
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

      <HargaPaketBola />
    </div>
  )
}

// ── SECTION: Harga Paket Bola ──────────────────
// CRUD sederhana untuk tabel paket_harga_bola. Karena harga diatur PER JUMLAH BOLA SPESIFIK
// (bukan rentang), tiap baris disimpan dengan min_bola = max_bola = jumlah bola itu sendiri.
// Ini supaya fungsi cariPaketHarga() yang sudah dipakai di Match.js tetap berfungsi tanpa diubah.
function HargaPaketBola() {
  const [daftar, setDaftar]   = useState([])
  const [loading, setLoading] = useState(true)
  const [pesan, setPesan]     = useState(null)

  // Form tambah baru
  const [showForm, setShowForm] = useState(false)
  const [formBola, setFormBola]   = useState('')
  const [formHarga, setFormHarga] = useState('')

  // Edit inline per baris
  const [editId, setEditId]       = useState(null)
  const [editHarga, setEditHarga] = useState('')

  function tampilPesan(teks) { setPesan(teks); setTimeout(() => setPesan(null), 3000) }

  async function muatData() {
    setLoading(true)
    const { data, error } = await supabase.from('paket_harga_bola').select('*').order('min_bola')
    if (!error) setDaftar(data)
    setLoading(false)
  }
  useEffect(() => { muatData() }, [])

  async function simpanBaru() {
    const bola = parseInt(formBola) || 0
    const harga = parseInt(formHarga) || 0
    if (bola <= 0) { tampilPesan('⚠️ Jumlah bola harus lebih dari 0!'); return }
    if (harga <= 0) { tampilPesan('⚠️ Harga harus lebih dari 0!'); return }
    if (daftar.some(p => p.min_bola === bola)) { tampilPesan(`⚠️ Harga untuk ${bola} bola sudah ada!`); return }

    const urutanBaru = daftar.length > 0 ? Math.max(...daftar.map(p => p.urutan || 0)) + 1 : 1
    const { error } = await supabase.from('paket_harga_bola').insert([{
      label: `${bola} Bola`,
      min_bola: bola,
      max_bola: bola,
      harga: harga,
      urutan: urutanBaru,
    }])
    if (error) { tampilPesan('❌ ' + error.message); return }

    tampilPesan(`✅ Harga untuk ${bola} bola ditambahkan!`)
    setFormBola(''); setFormHarga(''); setShowForm(false)
    muatData()
  }

  function bukaEdit(item) {
    setEditId(item.id)
    setEditHarga(String(item.harga))
  }

  async function simpanEdit() {
    const harga = parseInt(editHarga) || 0
    if (harga <= 0) { tampilPesan('⚠️ Harga harus lebih dari 0!'); return }
    const { error } = await supabase.from('paket_harga_bola').update({ harga }).eq('id', editId)
    if (error) { tampilPesan('❌ ' + error.message); return }
    tampilPesan('✅ Harga diperbarui!')
    setEditId(null)
    muatData()
  }

  async function hapus(item) {
    if (!confirm(`Hapus harga untuk ${item.label}?`)) return
    const { error } = await supabase.from('paket_harga_bola').delete().eq('id', item.id)
    if (error) { tampilPesan('❌ ' + error.message); return }
    tampilPesan('🗑️ Dihapus')
    muatData()
  }

  const inp = { background:'#0f172a', border:'1px solid #334155', borderRadius:8, color:'#f1f5f9', fontFamily:'inherit', fontSize:14, padding:'8px 12px', outline:'none', width:'100%' }
  const lbl = { fontSize:12, fontWeight:600, color:'#94a3b8', display:'block', marginBottom:4 }
  const btnG = { padding:'7px 14px', borderRadius:8, background:'#16a34a', color:'white', border:'none', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }
  const btnS = { padding:'7px 14px', borderRadius:8, background:'#334155', color:'#f1f5f9', border:'1px solid #475569', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }
  const btnR = { padding:'5px 10px', borderRadius:6, background:'#dc2626', color:'white', border:'none', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }

  return (
    <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:12, overflow:'hidden' }}>
      <div style={{ padding:'16px 24px', borderBottom:'1px solid #334155', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontWeight:700, fontSize:15 }}>🏸 Harga Paket Bola</div>
          <div style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>Saran harga otomatis di halaman Match, berdasarkan jumlah bola per pemain</div>
        </div>
        <button style={btnG} onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Tutup' : '➕ Tambah'}
        </button>
      </div>

      {pesan && (
        <div style={{ padding:'10px 24px', background:'#0f172a', fontSize:13, fontWeight:600 }}>{pesan}</div>
      )}

      {showForm && (
        <div style={{ padding:'16px 24px', background:'#0f172a', display:'flex', gap:12, alignItems:'flex-end', flexWrap:'wrap', borderBottom:'1px solid #334155' }}>
          <div style={{ flex:'1 1 140px' }}>
            <label style={lbl}>Jumlah Bola</label>
            <input style={inp} type="number" min="1" max="20" placeholder="cth: 5" value={formBola} onChange={e => setFormBola(e.target.value)} />
          </div>
          <div style={{ flex:'1 1 160px' }}>
            <label style={lbl}>Harga (Rp)</label>
            <input style={inp} type="number" min="0" placeholder="cth: 30000" value={formHarga} onChange={e => setFormHarga(e.target.value)} />
          </div>
          <button style={btnG} onClick={simpanBaru}>💾 Simpan</button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign:'center', padding:32, color:'#94a3b8', fontSize:13 }}>Memuat data...</div>
      ) : daftar.length === 0 ? (
        <div style={{ textAlign:'center', padding:32, color:'#94a3b8', fontSize:13 }}>Belum ada harga paket bola. Klik "Tambah" untuk mulai.</div>
      ) : (
        <div>
          {daftar.map(item => (
            <div key={item.id} style={{ padding:'12px 24px', borderBottom:'1px solid rgba(51,65,85,0.5)', display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap' }}>
              <div style={{ fontWeight:600, fontSize:14, minWidth:90 }}>{item.label}</div>

              {editId === item.id ? (
                <div style={{ display:'flex', gap:8, alignItems:'center', flex:1 }}>
                  <input style={{ ...inp, maxWidth:160 }} type="number" min="0" value={editHarga} onChange={e => setEditHarga(e.target.value)} autoFocus />
                  <button style={btnG} onClick={simpanEdit}>💾</button>
                  <button style={btnS} onClick={() => setEditId(null)}>✕</button>
                </div>
              ) : (
                <>
                  <div style={{ fontFamily:'monospace', fontSize:14, color:'#4ade80', flex:1 }}>{formatRupiah(item.harga)}</div>
                  <div style={{ display:'flex', gap:6 }}>
                    <button style={{ ...btnS, padding:'5px 10px', fontSize:12 }} onClick={() => bukaEdit(item)}>✏️ Edit</button>
                    <button style={btnR} onClick={() => hapus(item)}>🗑️</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}