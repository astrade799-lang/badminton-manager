'use client'
import { useState } from 'react'
import GantiPin from '@/components/pemain/GantiPin'

export default function SettingAkun({ pemain, token }) {
  const [showGantiPin, setShowGantiPin] = useState(false)
  const [pesanSukses, setPesanSukses] = useState(false)

  if (showGantiPin) {
    return (
      <GantiPin
        token={token}
        wajib={false}
        onSelesai={() => {
          setShowGantiPin(false)
          setPesanSukses(true)
          setTimeout(() => setPesanSukses(false), 3000)
        }}
      />
    )
  }

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:18, fontWeight:800, marginBottom:4 }}>⚙️ Setting & Akun</div>
        <div style={{ fontSize:13, color:'#94a3b8' }}>Kelola informasi akun Anda</div>
      </div>

      {pesanSukses && (
        <div style={{ background:'#14532d', color:'#4ade80', padding:'10px 14px', borderRadius:8, fontSize:13, marginBottom:16 }}>
          ✅ PIN berhasil diganti!
        </div>
      )}

      <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:12, overflow:'hidden', marginBottom:16 }}>
        <div style={{ padding:'14px 16px', borderBottom:'1px solid #334155', fontWeight:700, fontSize:14 }}>
          👤 Info Akun
        </div>
        <div style={{ padding:16, display:'flex', flexDirection:'column', gap:10, fontSize:14 }}>
          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <span style={{ color:'#94a3b8' }}>Nama</span>
            <span style={{ fontWeight:600 }}>{pemain?.nama || '–'}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <span style={{ color:'#94a3b8' }}>No. HP</span>
            <span style={{ fontFamily:'monospace' }}>{pemain?.no_hp || '–'}</span>
          </div>
        </div>
      </div>

      <button
        onClick={() => setShowGantiPin(true)}
        style={{ width:'100%', padding:'14px', borderRadius:10, background:'#1e293b', border:'1px solid #334155', color:'#f1f5f9', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'space-between' }}
      >
        <span>🔒 Ganti PIN</span>
        <span style={{ color:'#64748b' }}>›</span>
      </button>
    </div>
  )
}