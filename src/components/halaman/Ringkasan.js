'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

function formatRupiah(n) {
  return 'Rp ' + Number(n).toLocaleString('id-ID')
}
function formatTanggal(t) {
  if (!t) return '–'
  return new Date(t + 'T00:00:00').toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}
function hariIni() { return new Date().toISOString().split('T')[0] }
function tampilStok(stok_pcs, isi, satuan_besar, satuan_kecil) {
  if (!isi || isi <= 0) return `${stok_pcs} ${satuan_kecil}`
  const besar = Math.floor(stok_pcs / isi)
  const sisa  = stok_pcs % isi
  if (besar === 0) return `${sisa} ${satuan_kecil}`
  if (sisa === 0)  return `${besar} ${satuan_besar}`
  return `${besar} ${satuan_besar} ${sisa} ${satuan_kecil}`
}
function statusStok(n) {
  if (n === 0) return { label: 'Habis',   warna: '#fee2e2', teks: '#991b1b' }
  if (n <= 5)  return { label: 'Menipis', warna: '#fef3c7', teks: '#92400e' }
  return              { label: 'Aman',    warna: '#dcfce7', teks: '#14532d' }
}
function statusHutang(total, bayar) {
  const sisa = total - bayar
  if (sisa <= 0)   return { label: 'Lunas',       warna: '#dcfce7', teks: '#14532d' }
  if (bayar === 0) return { label: 'Belum Bayar', warna: '#fee2e2', teks: '#991b1b' }
  return                  { label: 'Sebagian',    warna: '#fef3c7', teks: '#92400e' }
}
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    function cek() { setIsMobile(window.innerWidth <= 768) }
    cek()
    window.addEventListener('resize', cek)
    return () => window.removeEventListener('resize', cek)
  }, [])
  return isMobile
}

export default function Ringkasan() {
  const [kas, setKas]         = useState([])
  const [hutang, setHutang]   = useState([])
  const [stok, setStok]       = useState([])
  const [trx, setTrx]         = useState([])
  const [loading, setLoading] = useState(true)
  const isMobile = useIsMobile()

  useEffect(() => {
    async function muatSemua() {
      setLoading(true)
      const [resKas, resHutang, resStok, resTrx] = await Promise.all([
        supabase.from('kas').select('*').order('tanggal', { ascending: false }),
        supabase.from('hutang').select('*').order('created_at', { ascending: false }),
        supabase.from('stok').select('*'),
        supabase.from('transaksi_stok').select('*, stok(nama, kategori)').order('tanggal', { ascending: false }),
      ])
      if (!resKas.error)    setKas(resKas.data)
      if (!resHutang.error) setHutang(resHutang.data)
      if (!resStok.error)   setStok(resStok.data)
      if (!resTrx.error)    setTrx(resTrx.data)
      setLoading(false)
    }
    muatSemua()
  }, [])

  const totalMasuk  = kas.filter(t=>t.jenis==='masuk').reduce((s,t)=>s+t.nominal,0)
  const totalKeluar = kas.filter(t=>t.jenis==='keluar').reduce((s,t)=>s+t.nominal,0)
  const saldo       = totalMasuk - totalKeluar
  const bulanIni    = hariIni().substring(0,7)
  const masukBulanIni = kas.filter(t=>t.jenis==='masuk'&&t.tanggal&&t.tanggal.startsWith(bulanIni)).reduce((s,t)=>s+t.nominal,0)

  const totalSisaHutang = hutang.reduce((s,h)=>s+Math.max(0,h.total_hutang-h.sudah_bayar),0)
  const hutangAktif     = hutang.filter(h=>statusHutang(h.total_hutang,h.sudah_bayar).label!=='Lunas')
  const stokBermasalah  = stok.filter(p=>statusStok(p.stok_pcs).label!=='Aman')
  const kasRecent       = kas.slice(0,5)

  // ── Shuttlecock — semua produk bertipe shuttle ────────────
  const shuttleList = stok.filter(p => p.tipe_produk === 'shuttle')

  // ── Penjualan bulan ini (dari transaksi_stok, tipe jual + pakai) ──
  const trxBulanIni = trx.filter(t => t.tanggal && t.tanggal.startsWith(bulanIni))
  const jualBulanIni  = trxBulanIni.filter(t => t.tipe === 'jual')
  const pakaiBulanIni = trxBulanIni.filter(t => t.tipe === 'pakai')
  const totalJualBulanIni  = jualBulanIni.reduce((s,t) => s + t.total, 0)
  const totalPakaiBulanIni = pakaiBulanIni.reduce((s,t) => s + t.total, 0)
  const pcsTerjualBulanIni = jualBulanIni.reduce((s,t) => s + t.jumlah_pcs, 0)
  const pcsPakaiBulanIni   = pakaiBulanIni.reduce((s,t) => s + t.jumlah_pcs, 0)

  if (loading) return (
    <div style={{textAlign:'center',padding:80,color:'#94a3b8'}}>
      <div style={{fontSize:32,marginBottom:12}}>⏳</div>
      <div>Memuat data ringkasan...</div>
    </div>
  )

  const kartuData = [
    { label:'💰 Saldo Kas',    nilai:formatRupiah(Math.abs(saldo)),    warna:'#16a34a', sub:saldo>=0?'↑ Surplus':'↓ Defisit',              subWarna:saldo>=0?'#4ade80':'#dc2626' },
    { label:'💳 Sisa Hutang',  nilai:formatRupiah(totalSisaHutang),    warna:'#dc2626', sub:hutangAktif.length+' pelanggan aktif',          subWarna:'#94a3b8' },
    { label:'📦 Stok Masalah', nilai:stokBermasalah.length+' item',    warna:'#f59e0b', sub:stokBermasalah.length>0?'Perlu perhatian':'Semua aman', subWarna:stokBermasalah.length>0?'#f59e0b':'#4ade80' },
    { label:'📈 Pemasukan',    nilai:formatRupiah(masukBulanIni),       warna:'#2563eb', sub:new Date().toLocaleDateString('id-ID',{month:'long',year:'numeric'}), subWarna:'#94a3b8' },
  ]

  return (
    <div>
      {/* Header */}
      <div style={{marginBottom:isMobile?16:24}}>
        <div style={{fontSize:isMobile?20:24,fontWeight:800,letterSpacing:-0.5,marginBottom:4}}>📊 Ringkasan Bisnis</div>
        <div style={{fontSize:13,color:'#94a3b8'}}>
          {new Date().toLocaleDateString('id-ID',{weekday:isMobile?'short':'long',day:'numeric',month:'long',year:'numeric'})}
        </div>
      </div>

      {/* Kartu utama */}
      <div style={{display:'grid',gridTemplateColumns:isMobile?'repeat(2,1fr)':'repeat(4,1fr)',gap:isMobile?10:16,marginBottom:isMobile?16:28}}>
        {kartuData.map((k,i)=>(
          <div key={i} style={{background:'#1e293b',border:'1px solid #334155',borderRadius:isMobile?10:12,padding:isMobile?'12px':'20px',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:k.warna}}/>
            <div style={{fontSize:isMobile?10:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:0.3,marginBottom:isMobile?6:10,lineHeight:1.3}}>{k.label}</div>
            <div style={{fontSize:isMobile?15:20,fontWeight:800,fontFamily:'monospace',marginBottom:isMobile?3:6,lineHeight:1.2,wordBreak:'break-all'}}>{k.nilai}</div>
            <div style={{fontSize:isMobile?11:12,color:k.subWarna,lineHeight:1.3}}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── BARU: Sisa Stok Shuttlecock ── */}
      <div style={{background:'#1e293b',border:'1px solid #334155',borderRadius:12,overflow:'hidden',marginBottom:isMobile?12:20}}>
        <div style={{padding:'14px 16px',borderBottom:'1px solid #334155',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontWeight:700,fontSize:14}}>🏸 Stok Shuttlecock</span>
          <span style={{fontSize:12,color:'#94a3b8'}}>{shuttleList.length} merk</span>
        </div>
        {shuttleList.length === 0 ? (
          <div style={{textAlign:'center',padding:24,color:'#475569',fontSize:13}}>Belum ada produk shuttlecock</div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'repeat(3,1fr)',gap:0}}>
            {shuttleList.map((p,i) => {
              const s = statusStok(p.stok_pcs)
              return (
                <div key={p.id} style={{
                  padding:'12px 16px',
                  borderBottom: isMobile || Math.floor(i/3) < Math.floor((shuttleList.length-1)/3) ? '1px solid rgba(51,65,85,0.5)' : 'none',
                  borderRight: !isMobile && (i+1)%3!==0 ? '1px solid rgba(51,65,85,0.5)' : 'none',
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                }}>
                  <div>
                    <div style={{fontWeight:600,fontSize:13}}>{p.nama}</div>
                    <div style={{fontFamily:'monospace',fontSize:13,color:'#4ade80',marginTop:3}}>
                      {tampilStok(p.stok_pcs, p.isi_per_satuan, p.satuan_besar, p.satuan_kecil)}
                    </div>
                  </div>
                  <span style={{background:s.warna,color:s.teks,padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:700,flexShrink:0}}>{s.label}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── BARU: Penjualan Bulan Ini ── */}
      <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'1fr 1fr',gap:isMobile?10:16,marginBottom:isMobile?12:20}}>
        <div style={{background:'#1e293b',border:'1px solid #334155',borderRadius:12,padding:isMobile?14:18,position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:'#16a34a'}}/>
          <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:0.3,marginBottom:8}}>🛒 Jual Bulan Ini</div>
          <div style={{fontSize:isMobile?16:20,fontWeight:800,fontFamily:'monospace',color:'#4ade80',marginBottom:4}}>{formatRupiah(totalJualBulanIni)}</div>
          <div style={{fontSize:12,color:'#94a3b8'}}>{jualBulanIni.length} transaksi · {pcsTerjualBulanIni} pcs</div>
        </div>
        <div style={{background:'#1e293b',border:'1px solid #334155',borderRadius:12,padding:isMobile?14:18,position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:'#7c3aed'}}/>
          <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:0.3,marginBottom:8}}>🏸 Lapangan Bulan Ini</div>
          <div style={{fontSize:isMobile?16:20,fontWeight:800,fontFamily:'monospace',color:'#c4b5fd',marginBottom:4}}>{formatRupiah(totalPakaiBulanIni)}</div>
          <div style={{fontSize:12,color:'#94a3b8'}}>{pakaiBulanIni.length} sesi · {pcsPakaiBulanIni} pcs</div>
        </div>
      </div>

      {/* Panel bawah */}
      <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:isMobile?12:20}}>

        {/* Transaksi Terakhir */}
        <div style={{background:'#1e293b',border:'1px solid #334155',borderRadius:12,overflow:'hidden'}}>
          <div style={{padding:'14px 16px',borderBottom:'1px solid #334155',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontWeight:700,fontSize:14}}>Transaksi Terakhir</span>
            <span style={{fontSize:12,color:'#94a3b8'}}>{kas.length} total</span>
          </div>
          {kasRecent.length===0 ? (
            <div style={{textAlign:'center',padding:24,color:'#475569',fontSize:13}}>Belum ada transaksi</div>
          ) : (
            <div>
              {kasRecent.map(t=>(
                <div key={t.id} style={{padding:'10px 16px',borderBottom:'1px solid rgba(51,65,85,0.5)',display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.keterangan}</div>
                    <div style={{fontSize:11,color:'#475569',marginTop:2}}>{formatTanggal(t.tanggal)}</div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{fontSize:13,fontWeight:700,fontFamily:'monospace',color:t.jenis==='masuk'?'#4ade80':'#dc2626'}}>
                      {t.jenis==='masuk'?'+':'-'}{formatRupiah(t.nominal)}
                    </div>
                    <span style={{fontSize:10,fontWeight:700,background:t.jenis==='masuk'?'#dcfce7':'#fee2e2',color:t.jenis==='masuk'?'#14532d':'#991b1b',padding:'1px 6px',borderRadius:20}}>
                      {t.jenis==='masuk'?'Masuk':'Keluar'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hutang Aktif */}
        <div style={{background:'#1e293b',border:'1px solid #334155',borderRadius:12,overflow:'hidden'}}>
          <div style={{padding:'14px 16px',borderBottom:'1px solid #334155',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontWeight:700,fontSize:14}}>Hutang Aktif</span>
            <span style={{fontSize:12,color:'#94a3b8'}}>{hutangAktif.length} pelanggan</span>
          </div>
          {hutangAktif.length===0 ? (
            <div style={{textAlign:'center',padding:24,color:'#4ade80',fontSize:13}}>✅ Tidak ada hutang aktif</div>
          ) : (
            <div>
              {hutangAktif.slice(0,5).map(h=>{
                const sisa=h.total_hutang-h.sudah_bayar
                const s=statusHutang(h.total_hutang,h.sudah_bayar)
                return (
                  <div key={h.id} style={{padding:'10px 16px',borderBottom:'1px solid rgba(51,65,85,0.5)',display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{h.nama}</div>
                      <div style={{fontSize:11,color:'#475569',marginTop:2}}>{formatTanggal(h.tanggal)}</div>
                    </div>
                    <div style={{textAlign:'right',flexShrink:0}}>
                      <div style={{fontSize:13,fontWeight:700,fontFamily:'monospace',color:'#dc2626',marginBottom:3}}>{formatRupiah(Math.max(0,sisa))}</div>
                      <span style={{fontSize:10,fontWeight:700,background:s.warna,color:s.teks,padding:'1px 6px',borderRadius:20}}>{s.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Stok Bermasalah */}
      {stokBermasalah.length>0 && (
        <div style={{background:'#1e293b',border:'1px solid #334155',borderRadius:12,overflow:'hidden',marginTop:isMobile?12:20}}>
          <div style={{padding:'14px 16px',borderBottom:'1px solid #334155',display:'flex',justifyContent:'space-between'}}>
            <span style={{fontWeight:700,fontSize:14}}>⚠️ Stok Perlu Perhatian</span>
            <span style={{fontSize:12,color:'#f59e0b'}}>{stokBermasalah.length} item</span>
          </div>
          {stokBermasalah.map(p=>{
            const s=statusStok(p.stok_pcs)
            return (
              <div key={p.id} style={{padding:'10px 16px',borderBottom:'1px solid rgba(51,65,85,0.5)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{fontWeight:600,fontSize:13}}>{p.nama}</div>
                  <div style={{fontSize:11,color:'#475569',marginTop:2}}>{p.kategori}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:13,fontFamily:'monospace',marginBottom:4}}>{p.stok_pcs} {p.satuan_kecil}</div>
                  <span style={{background:s.warna,color:s.teks,padding:'2px 8px',borderRadius:20,fontSize:11,fontWeight:700}}>{s.label}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}