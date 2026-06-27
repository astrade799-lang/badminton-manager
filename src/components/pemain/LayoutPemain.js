'use client'
import { useState } from 'react'

export default function LayoutPemain({ pemain, onLogout, children, aktif, onChangeTab }) {
  const menus = [
    { id: 'beranda', label: 'Beranda', ikon: '🏠' },
    { id: 'match',   label: 'Match',   ikon: '🏸' },
    { id: 'akun',    label: 'Akun',    ikon: '⚙️' },
  ]

  return (
    <div style={{ minHeight:'100vh', background:'#0f172a' }}>
      {/* Header */}
      <header style={{ position:'fixed', top:0, left:0, right:0, height:60, background:'#1e293b', borderBottom:'1px solid #334155', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px', zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:22 }}>🏸</span>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:'#f1f5f9' }}>{pemain?.nama}</div>
            <div style={{ fontSize:11, color:'#64748b' }}>Halo, pemain!</div>
          </div>
        </div>
        <button
          onClick={onLogout}
          style={{ padding:'6px 14px', borderRadius:8, background:'#334155', color:'#f1f5f9', border:'none', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}
        >
          Keluar
        </button>
      </header>

      {/* Konten */}
      <main style={{ paddingTop:60, paddingBottom:80, padding:'76px 16px 80px', maxWidth:600, margin:'0 auto' }}>
        {children}
      </main>

      {/* Bottom Nav */}
      <nav style={{ position:'fixed', bottom:0, left:0, right:0, background:'#1e293b', borderTop:'1px solid #334155', display:'flex', zIndex:100, paddingBottom:'env(safe-area-inset-bottom)' }}>
        {menus.map(menu => (
          <button
            key={menu.id}
            onClick={() => onChangeTab(menu.id)}
            style={{
              flex:1, padding:'10px 4px', background:'none', border:'none', cursor:'pointer',
              display:'flex', flexDirection:'column', alignItems:'center', gap:3,
              color: aktif === menu.id ? '#4ade80' : '#475569', fontFamily:'inherit',
            }}
          >
            <span style={{ fontSize:22 }}>{menu.ikon}</span>
            <span style={{ fontSize:11, fontWeight: aktif === menu.id ? 700 : 500 }}>{menu.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}