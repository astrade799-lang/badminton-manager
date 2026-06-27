'use client'
import { useState, useEffect } from 'react'
import LoginPemain from '@/components/pemain/LoginPemain'
import GantiPin from '@/components/pemain/GantiPin'
import LayoutPemain from '@/components/pemain/LayoutPemain'
import Beranda from '@/components/pemain/Beranda'
import MatchSaya from '@/components/pemain/MatchSaya'
import SettingAkun from '@/components/pemain/SettingAkun'

function LoadingScreen() {
  return (
    <div style={{ minHeight:'100vh', background:'#0f172a', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center', color:'#94a3b8' }}>
        <div style={{ fontSize:32, marginBottom:12 }}>⏳</div>
        <div>Memuat...</div>
      </div>
    </div>
  )
}

export default function PemainPage() {
  const [status, setStatus] = useState('loading') // loading | login | wajib-ganti-pin | dashboard
  const [pemain, setPemain] = useState(null)
  const [token, setToken] = useState(null)
  const [tabAktif, setTabAktif] = useState('beranda')

  useEffect(() => { cekTokenTersimpan() }, [])

  async function cekTokenTersimpan() {
    const tokenTersimpan = localStorage.getItem('pemain_token')
    if (!tokenTersimpan) { setStatus('login'); return }

    try {
      const res = await fetch('/api/pemain/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenTersimpan }),
      })
      const data = await res.json()

      if (!res.ok) {
        // Token tidak valid/kedaluwarsa — bersihkan, balik ke login
        localStorage.removeItem('pemain_token')
        setStatus('login')
        return
      }

      setToken(tokenTersimpan)
      setPemain(data)
      setStatus(data.wajib_ganti_pin ? 'wajib-ganti-pin' : 'dashboard')
    } catch (err) {
      setStatus('login')
    }
  }

  function handleLoginSuccess(data) {
    setToken(data.token)
    setPemain(data)
    setStatus(data.wajib_ganti_pin ? 'wajib-ganti-pin' : 'dashboard')
  }

  function handleGantiPinSelesai() {
    setStatus('dashboard')
  }

  async function handleLogout() {
    const tokenTersimpan = localStorage.getItem('pemain_token')
    if (tokenTersimpan) {
      await fetch('/api/pemain/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenTersimpan }),
      })
    }
    localStorage.removeItem('pemain_token')
    setToken(null)
    setPemain(null)
    setStatus('login')
  }

  if (status === 'loading') return <LoadingScreen />
  if (status === 'login') return <LoginPemain onLoginSuccess={handleLoginSuccess} />
  if (status === 'wajib-ganti-pin') return <GantiPin token={token} onSelesai={handleGantiPinSelesai} wajib />

  const halaman = {
    beranda: <Beranda pemainId={pemain.pemain_id} nama={pemain.nama} />,
    match:   <MatchSaya pemainId={pemain.pemain_id} />,
    akun:    <SettingAkun pemain={pemain} token={token} />,
  }

  return (
    <LayoutPemain pemain={pemain} onLogout={handleLogout} aktif={tabAktif} onChangeTab={setTabAktif}>
      {halaman[tabAktif]}
    </LayoutPemain>
  )
}