'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'

function formatRupiah(n) {
  return 'Rp ' + Number(n).toLocaleString('id-ID')
}
function formatTanggal(t) {
  if (!t) return '–'
  return new Date(t + 'T00:00:00').toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}
function tampilStok(stok_pcs, isi, satuan_besar, satuan_kecil) {
  if (!isi || isi <= 0) return `${stok_pcs} ${satuan_kecil}`
  const besar = Math.floor(stok_pcs / isi)
  const sisa  = stok_pcs % isi
  if (besar === 0) return `${sisa} ${satuan_kecil}`
  if (sisa === 0)  return `${besar} ${satuan_besar}`
  return `${besar} ${satuan_besar} ${sisa} ${satuan_kecil}`
}
function hariIni() {
  return new Date().toISOString().split('T')[0]
}

const panel = {
  background: '#1e293b', border: '1px solid #334155',
  borderRadius: 12, overflow: 'hidden', marginBottom: 20,
}
const btnBiru  = { padding: '9px 18px', borderRadius: 8, background: '#2563eb', color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
const btnUngu  = { padding: '9px 18px', borderRadius: 8, background: '#7c3aed', color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
const btnHijau = { padding: '9px 18px', borderRadius: 8, background: '#16a34a', color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
const inp = { background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontFamily: 'inherit', fontSize: 14, padding: '9px 14px', outline: 'none' }

export default function Export() {
  const [loading, setLoading] = useState(false)
  const [pesan, setPesan]     = useState(null)
  const [filterBulan, setFilterBulan] = useState(hariIni().substring(0, 7))

  function tampilPesan(teks) {
    setPesan(teks)
    setTimeout(() => setPesan(null), 4000)
  }

  // ── AMBIL SEMUA DATA DARI SUPABASE ────────────────────────
  async function ambilData() {
    const [resStok, resHutang, resKas, resTrx] = await Promise.all([
      supabase.from('stok').select('*').order('kategori').order('nama'),
      supabase.from('hutang').select('*').order('created_at', { ascending: false }),
      supabase.from('kas').select('*').order('tanggal', { ascending: false }),
      supabase.from('transaksi_stok')
        .select('*, stok(nama, kategori, satuan_besar, satuan_kecil)')
        .order('tanggal', { ascending: false }),
    ])
    return {
      stok:   resStok.data   || [],
      hutang: resHutang.data || [],
      kas:    resKas.data    || [],
      trx:    resTrx.data    || [],
    }
  }

  // ── EXPORT SEMUA — 4 SHEET ────────────────────────────────
  async function exportSemua() {
    setLoading(true)
    tampilPesan('⏳ Mengambil data...')

    const { stok, hutang, kas, trx } = await ambilData()

    // Sheet 1: Stok
    const dataStok = stok.map(p => ({
      'Nama Produk':    p.nama,
      'Kategori':       p.kategori,
      'Tipe':           p.tipe_produk === 'shuttle' ? 'Shuttle' : 'Jual',
      'Stok (Tampilan)': tampilStok(p.stok_pcs, p.isi_per_satuan, p.satuan_besar, p.satuan_kecil),
      'Stok (Pcs)':     p.stok_pcs,
      'Satuan Besar':   p.satuan_besar,
      'Isi per Satuan': p.isi_per_satuan,
      'Harga Modal/Lusin': p.harga_modal_besar,
      'Harga Modal/Pcs':   p.harga_modal_pcs,
      'Harga Jual/Lusin':  p.harga_jual_besar,
      'Harga Jual/Pcs':    p.harga_jual_pcs,
      'Harga Lapangan/Pcs':p.harga_pakai_pcs,
    }))

    // Sheet 2: Hutang
    const dataHutang = hutang.map(h => {
      const sisa = h.total_hutang - h.sudah_bayar
      return {
        'Nama Pelanggan': h.nama,
        'Keterangan':     h.keterangan,
        'Tanggal':        formatTanggal(h.tanggal),
        'Total Hutang':   h.total_hutang,
        'Sudah Bayar':    h.sudah_bayar,
        'Sisa Hutang':    Math.max(0, sisa),
        'Status':         sisa <= 0 ? 'Lunas' : h.sudah_bayar === 0 ? 'Belum Bayar' : 'Sebagian',
      }
    })

    // Sheet 3: Kas
    const totalMasuk  = kas.filter(t => t.jenis === 'masuk').reduce((s, t) => s + t.nominal, 0)
    const totalKeluar = kas.filter(t => t.jenis === 'keluar').reduce((s, t) => s + t.nominal, 0)
    const dataKas = [
      ...kas.map(t => ({
        'Tanggal':     formatTanggal(t.tanggal),
        'Keterangan':  t.keterangan,
        'Kategori':    t.kategori,
        'Sub Kategori':t.sub_kategori || '',
        'Jenis':       t.jenis === 'masuk' ? 'Pemasukan' : 'Pengeluaran',
        'Nominal':     t.nominal,
      })),
      {},
      { 'Tanggal': 'RINGKASAN', 'Keterangan': 'Total Pemasukan',  'Nominal': totalMasuk  },
      { 'Tanggal': '',          'Keterangan': 'Total Pengeluaran', 'Nominal': totalKeluar },
      { 'Tanggal': '',          'Keterangan': 'Saldo Bersih',      'Nominal': totalMasuk - totalKeluar },
    ]

    // Sheet 4: Transaksi Stok
    const dataTrx = trx.map(t => ({
      'Tanggal':    formatTanggal(t.tanggal),
      'Produk':     t.stok?.nama || '–',
      'Kategori':   t.stok?.kategori || '–',
      'Tipe':       t.tipe === 'jual' ? 'Jual' : t.tipe === 'pakai' ? 'Lapangan' : 'Restock',
      'Sesi':       t.sesi || '–',
      'Jumlah Pcs': t.jumlah_pcs,
      'Harga/Pcs':  t.harga_per_pcs,
      'Diskon':     t.diskon || 0,
      'Total':      t.total,
      'Keterangan': t.keterangan,
    }))

    // Buat workbook dengan 4 sheet
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dataStok),   'Stok')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dataHutang), 'Hutang')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dataKas),    'Kas')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dataTrx),    'Transaksi')

    // Download
    XLSX.writeFile(wb, `badminton-manager-${hariIni()}.xlsx`)

    setLoading(false)
    tampilPesan('✅ File Excel berhasil didownload!')
  }

  // ── EXPORT PER MODUL ──────────────────────────────────────
  async function exportStok() {
    setLoading(true)
    const { stok } = await ambilData()
    const data = stok.map(p => ({
      'Nama Produk':     p.nama,
      'Kategori':        p.kategori,
      'Stok':            tampilStok(p.stok_pcs, p.isi_per_satuan, p.satuan_besar, p.satuan_kecil),
      'Stok (Pcs)':      p.stok_pcs,
      'Harga Modal/Lusin': p.harga_modal_besar,
      'Harga Jual/Lusin':  p.harga_jual_besar,
      'Harga Lapangan':    p.harga_pakai_pcs,
    }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Stok')
    XLSX.writeFile(wb, `laporan-stok-${hariIni()}.xlsx`)
    setLoading(false)
    tampilPesan('✅ Laporan Stok didownload!')
  }

  async function exportHutang() {
    setLoading(true)
    const { hutang } = await ambilData()
    const data = hutang.map(h => {
      const sisa = h.total_hutang - h.sudah_bayar
      return {
        'Nama':         h.nama,
        'Keterangan':   h.keterangan,
        'Tanggal':      formatTanggal(h.tanggal),
        'Total Hutang': h.total_hutang,
        'Sudah Bayar':  h.sudah_bayar,
        'Sisa':         Math.max(0, sisa),
        'Status':       sisa <= 0 ? 'Lunas' : h.sudah_bayar === 0 ? 'Belum Bayar' : 'Sebagian',
      }
    })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Hutang')
    XLSX.writeFile(wb, `laporan-hutang-${hariIni()}.xlsx`)
    setLoading(false)
    tampilPesan('✅ Laporan Hutang didownload!')
  }

  async function exportKas() {
    setLoading(true)
    const { kas } = await ambilData()
    const totalMasuk  = kas.filter(t => t.jenis === 'masuk').reduce((s, t) => s + t.nominal, 0)
    const totalKeluar = kas.filter(t => t.jenis === 'keluar').reduce((s, t) => s + t.nominal, 0)
    const data = [
      ...kas.map(t => ({
        'Tanggal':    formatTanggal(t.tanggal),
        'Keterangan': t.keterangan,
        'Kategori':   t.kategori,
        'Jenis':      t.jenis === 'masuk' ? 'Pemasukan' : 'Pengeluaran',
        'Nominal':    t.nominal,
      })),
      {},
      { 'Tanggal': 'TOTAL', 'Keterangan': 'Total Pemasukan',  'Nominal': totalMasuk  },
      { 'Tanggal': '',      'Keterangan': 'Total Pengeluaran', 'Nominal': totalKeluar },
      { 'Tanggal': '',      'Keterangan': 'Saldo Bersih',      'Nominal': totalMasuk - totalKeluar },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Kas')
    XLSX.writeFile(wb, `laporan-kas-${hariIni()}.xlsx`)
    setLoading(false)
    tampilPesan('✅ Laporan Kas didownload!')
  }

  async function exportTransaksi() {
    setLoading(true)
    const { trx } = await ambilData()
    const data = trx.map(t => ({
      'Tanggal':    formatTanggal(t.tanggal),
      'Produk':     t.stok?.nama || '–',
      'Tipe':       t.tipe === 'jual' ? 'Jual' : t.tipe === 'pakai' ? 'Lapangan' : 'Restock',
      'Sesi':       t.sesi || '–',
      'Jumlah Pcs': t.jumlah_pcs,
      'Harga/Pcs':  t.harga_per_pcs,
      'Diskon':     t.diskon || 0,
      'Total':      t.total,
      'Keterangan': t.keterangan,
    }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Transaksi')
    XLSX.writeFile(wb, `laporan-transaksi-${hariIni()}.xlsx`)
    setLoading(false)
    tampilPesan('✅ Laporan Transaksi didownload!')
  }

  // ── EXPORT PDF (print) ────────────────────────────────────
  function printHalaman() {
    window.print()
  }

  return (
    <div>
      {/* Toast */}
      {pesan && (
        <div style={{ position: 'fixed', bottom: 28, right: 28, background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '12px 18px', fontSize: 14, fontWeight: 600, zIndex: 300, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', maxWidth: 400 }}>
          {pesan}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5, marginBottom: 4 }}>📤 Export Laporan</div>
        <div style={{ fontSize: 14, color: '#94a3b8' }}>Download data dalam format Excel atau cetak PDF</div>
      </div>

      {/* Export Excel Semua */}
      <div style={panel}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #334155', fontWeight: 700, fontSize: 15 }}>
          📊 Export Excel
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Export Semua — highlight utama */}
          <div style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: 10, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>📋 Export Semua (4 Sheet)</div>
              <div style={{ fontSize: 13, color: '#94a3b8' }}>Stok + Hutang + Kas + Transaksi dalam 1 file Excel</div>
            </div>
            <button style={{ ...btnHijau, fontSize: 14, padding: '10px 24px' }} onClick={exportSemua} disabled={loading}>
              {loading ? '⏳ Memproses...' : '⬇️ Download Semua'}
            </button>
          </div>

          {/* Export Per Modul */}
          <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 1, marginTop: 8 }}>
            Atau download per modul:
          </div>

          {[
            { label: '📦 Laporan Stok',        sub: 'Produk, stok saat ini, harga',           fn: exportStok },
            { label: '💳 Laporan Hutang',       sub: 'Pelanggan, total, sisa, status',         fn: exportHutang },
            { label: '💰 Laporan Kas',          sub: 'Pemasukan, pengeluaran, saldo bersih',   fn: exportKas },
            { label: '🛒 Laporan Transaksi',    sub: 'Jual, lapangan, restock + history',      fn: exportTransaksi },
          ].map((item, i) => (
            <div key={i} style={{ background: '#0f172a', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{item.label}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{item.sub}</div>
              </div>
              <button style={btnBiru} onClick={item.fn} disabled={loading}>
                ⬇️ Download
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Export PDF */}
      <div style={panel}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #334155', fontWeight: 700, fontSize: 15 }}>
          🖨️ Cetak / Export PDF
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 8, padding: 12, fontSize: 13, color: '#c4b5fd', marginBottom: 16 }}>
            💡 Klik Print → di dialog browser pilih <strong>"Save as PDF"</strong> sebagai printer → halaman yang sedang aktif akan tersimpan sebagai PDF
          </div>
          <button style={btnUngu} onClick={printHalaman}>
            🖨️ Print / Save as PDF
          </button>
        </div>
      </div>

    </div>
  )
}