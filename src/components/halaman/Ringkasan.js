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
function hariIni() {
  return new Date().toISOString().split('T')[0]
}
function statusStok(n) {
  if (n === 0)  return { label: 'Habis',   warna: '#fee2e2', teks: '#991b1b' }
  if (n <= 5)   return { label: 'Menipis', warna: '#fef3c7', teks: '#92400e' }
  return               { label: 'Aman',    warna: '#dcfce7', teks: '#14532d' }
}
function statusHutang(total, bayar) {
  const sisa = total - bayar
  if (sisa <= 0)   return { label: 'Lunas',       warna: '#dcfce7', teks: '#14532d' }
  if (bayar === 0) return { label: 'Belum Bayar', warna: '#fee2e2', teks: '#991b1b' }
  return                  { label: 'Sebagian',    warna: '#fef3c7', teks: '#92400e' }
}

const panel = {
  background: '#1e293b', border: '1px solid #334155',
  borderRadius: 12, overflow: 'hidden', marginBottom: 20,
}
const th = {
  padding: '11px 20px', textAlign: 'left', fontSize: 11,
  fontWeight: 700, color: '#475569', textTransform: 'uppercase',
  letterSpacing: '0.8px', borderBottom: '1px solid #334155',
}
const td = {
  padding: '12px 20px', borderBottom: '1px solid rgba(51,65,85,0.5)',
  verticalAlign: 'middle',
}

export default function Ringkasan() {
  const [kas, setKas]       = useState([])
  const [hutang, setHutang] = useState([])
  const [stok, setStok]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function muatSemua() {
      setLoading(true)
      const [resKas, resHutang, resStok] = await Promise.all([
        supabase.from('kas').select('*').order('tanggal', { ascending: false }),
        supabase.from('hutang').select('*').order('created_at', { ascending: false }),
        supabase.from('stok').select('*'),
      ])
      if (!resKas.error)    setKas(resKas.data)
      if (!resHutang.error) setHutang(resHutang.data)
      if (!resStok.error)   setStok(resStok.data)
      setLoading(false)
    }
    muatSemua()
  }, [])

  // ── KALKULASI KAS ─────────────────────────────────────────
  const totalMasuk  = kas.filter(t => t.jenis === 'masuk').reduce((s, t) => s + t.nominal, 0)
  const totalKeluar = kas.filter(t => t.jenis === 'keluar').reduce((s, t) => s + t.nominal, 0)
  const saldo       = totalMasuk - totalKeluar

  const bulanIni = hariIni().substring(0, 7)
  const masukBulanIni = kas
    .filter(t => t.jenis === 'masuk' && t.tanggal && t.tanggal.startsWith(bulanIni))
    .reduce((s, t) => s + t.nominal, 0)

  // ── KALKULASI HUTANG ──────────────────────────────────────
  const totalSisaHutang = hutang.reduce((s, h) => s + Math.max(0, h.total_hutang - h.sudah_bayar), 0)
  const hutangAktif     = hutang.filter(h => statusHutang(h.total_hutang, h.sudah_bayar).label !== 'Lunas')

  // ── KALKULASI STOK ────────────────────────────────────────
  const stokBermasalah = stok.filter(p => statusStok(p.stok).label !== 'Aman')

  // 5 transaksi terakhir
  const kasRecent = kas.slice(0, 5)

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
        <div>Memuat data ringkasan...</div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5, marginBottom: 4 }}>
          📊 Ringkasan Bisnis
        </div>
        <div style={{ fontSize: 14, color: '#94a3b8' }}>
          Overview performa bisnis — {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* 4 Kartu Utama */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
        {[
          {
            label: '💰 Saldo Kas',
            nilai: formatRupiah(Math.abs(saldo)),
            warna: '#16a34a',
            sub: saldo >= 0 ? '↑ Surplus' : '↓ Defisit',
            subWarna: saldo >= 0 ? '#4ade80' : '#dc2626',
          },
          {
            label: '💳 Total Sisa Hutang',
            nilai: formatRupiah(totalSisaHutang),
            warna: '#dc2626',
            sub: hutangAktif.length + ' pelanggan aktif',
            subWarna: '#94a3b8',
          },
          {
            label: '📦 Stok Bermasalah',
            nilai: stokBermasalah.length + ' item',
            warna: '#f59e0b',
            sub: stokBermasalah.length > 0 ? 'Perlu perhatian' : 'Semua stok aman',
            subWarna: stokBermasalah.length > 0 ? '#f59e0b' : '#4ade80',
          },
          {
            label: '📈 Pemasukan Bulan Ini',
            nilai: formatRupiah(masukBulanIni),
            warna: '#2563eb',
            sub: new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
            subWarna: '#94a3b8',
          },
        ].map((k, i) => (
          <div key={i} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 20, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: k.warna }} />
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'monospace', marginBottom: 6 }}>{k.nilai}</div>
            <div style={{ fontSize: 12, color: k.subWarna }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* 2 Kolom Bawah */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Transaksi Terakhir */}
        <div style={panel}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Transaksi Terakhir</span>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>{kas.length} total</span>
          </div>
          {kasRecent.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: '#475569', fontSize: 13 }}>
              Belum ada transaksi
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Keterangan', 'Jenis', 'Nominal'].map(h => <th key={h} style={th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {kasRecent.map(t => (
                  <tr key={t.id}>
                    <td style={td}>
                      <div>{t.keterangan}</div>
                      <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{formatTanggal(t.tanggal)}</div>
                    </td>
                    <td style={td}>
                      <span style={{
                        background: t.jenis === 'masuk' ? '#dcfce7' : '#fee2e2',
                        color:      t.jenis === 'masuk' ? '#14532d' : '#991b1b',
                        padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                      }}>
                        {t.jenis === 'masuk' ? 'Masuk' : 'Keluar'}
                      </span>
                    </td>
                    <td style={{ ...td, fontFamily: 'monospace', fontWeight: 700, color: t.jenis === 'masuk' ? '#4ade80' : '#dc2626' }}>
                      {t.jenis === 'masuk' ? '+' : '-'}{formatRupiah(t.nominal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Hutang Aktif */}
        <div style={panel}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Hutang Aktif</span>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>{hutangAktif.length} pelanggan</span>
          </div>
          {hutangAktif.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: '#4ade80', fontSize: 13 }}>
              ✅ Tidak ada hutang aktif
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Nama', 'Sisa Hutang', 'Status'].map(h => <th key={h} style={th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {hutangAktif.slice(0, 5).map(h => {
                  const sisa = h.total_hutang - h.sudah_bayar
                  const s    = statusHutang(h.total_hutang, h.sudah_bayar)
                  return (
                    <tr key={h.id}>
                      <td style={td}>
                        <div style={{ fontWeight: 600 }}>{h.nama}</div>
                        <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{formatTanggal(h.tanggal)}</div>
                      </td>
                      <td style={{ ...td, fontFamily: 'monospace', color: '#dc2626', fontWeight: 700 }}>
                        {formatRupiah(Math.max(0, sisa))}
                      </td>
                      <td style={td}>
                        <span style={{ background: s.warna, color: s.teks, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                          {s.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {/* Stok Bermasalah — tampil hanya kalau ada */}
      {stokBermasalah.length > 0 && (
        <div style={panel}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>⚠️ Stok Perlu Perhatian</span>
            <span style={{ fontSize: 12, color: '#f59e0b' }}>{stokBermasalah.length} item</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Nama Produk', 'Kategori', 'Stok', 'Status'].map(h => <th key={h} style={th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {stokBermasalah.map(p => {
                const s = statusStok(p.stok)
                return (
                  <tr key={p.id}>
                    <td style={td}><strong>{p.nama}</strong></td>
                    <td style={{ ...td, color: '#94a3b8' }}>{p.kategori}</td>
                    <td style={{ ...td, fontFamily: 'monospace' }}>{p.stok} {p.satuan}</td>
                    <td style={td}>
                      <span style={{ background: s.warna, color: s.teks, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                        {s.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  )
}