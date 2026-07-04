'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import ExcelJS from 'exceljs'

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

// Helper: buat workbook exceljs dari array objek, lalu download sebagai file
async function downloadExcel(sheets, namaFile) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Badminton Manager'
  wb.created = new Date()

  for (const { nama, data } of sheets) {
    if (!data || data.length === 0) continue
    const ws = wb.addWorksheet(nama)

    // Ambil kolom dari baris pertama yang tidak kosong
    const kolomKunci = Object.keys(data.find(r => Object.keys(r).length > 0) || {})
    ws.columns = kolomKunci.map(k => ({ header: k, key: k, width: 20 }))

    // Style header
    ws.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } }
    })

    // Isi baris data
    data.forEach(row => {
      const barisKosong = Object.keys(row).length === 0
      if (barisKosong) {
        ws.addRow({})
      } else {
        const baris = ws.addRow(row)
        // Warna baris genap supaya lebih mudah dibaca
        if (baris.number % 2 === 0) {
          baris.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F2744' } }
          })
        }
      }
    })
  }

  // Download file lewat browser
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = namaFile
  a.click()
  URL.revokeObjectURL(url)
}

const panel = {
  background: '#1e293b', border: '1px solid #334155',
  borderRadius: 12, overflow: 'hidden', marginBottom: 20,
}
const btnBiru  = { padding: '9px 18px', borderRadius: 8, background: '#2563eb', color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
const btnUngu  = { padding: '9px 18px', borderRadius: 8, background: '#7c3aed', color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
const btnHijau = { padding: '9px 18px', borderRadius: 8, background: '#16a34a', color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }

export default function Export() {
  const [loading, setLoading] = useState(false)
  const [pesan, setPesan]     = useState(null)

  function tampilPesan(teks) {
    setPesan(teks)
    setTimeout(() => setPesan(null), 4000)
  }

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

  async function exportSemua() {
    setLoading(true)
    tampilPesan('⏳ Mengambil data...')
    try {
      const { stok, hutang, kas, trx } = await ambilData()
      const totalMasuk  = kas.filter(t => t.jenis === 'masuk').reduce((s, t) => s + t.nominal, 0)
      const totalKeluar = kas.filter(t => t.jenis === 'keluar').reduce((s, t) => s + t.nominal, 0)

      await downloadExcel([
        {
          nama: 'Stok',
          data: stok.map(p => ({
            'Nama Produk':       p.nama,
            'Kategori':          p.kategori,
            'Tipe':              p.tipe_produk === 'shuttle' ? 'Shuttle' : 'Jual',
            'Stok (Tampilan)':   tampilStok(p.stok_pcs, p.isi_per_satuan, p.satuan_besar, p.satuan_kecil),
            'Stok (Pcs)':        p.stok_pcs,
            'Satuan Besar':      p.satuan_besar,
            'Isi per Satuan':    p.isi_per_satuan,
            'Harga Modal/Lusin': p.harga_modal_besar,
            'Harga Jual/Lusin':  p.harga_jual_besar,
            'Harga Jual/Pcs':    p.harga_jual_pcs,
            'Harga Lapangan/Pcs':p.harga_pakai_pcs,
          }))
        },
        {
          nama: 'Hutang',
          data: hutang.map(h => {
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
        },
        {
          nama: 'Kas',
          data: [
            ...kas.map(t => ({
              'Tanggal':     formatTanggal(t.tanggal),
              'Keterangan':  t.keterangan,
              'Kategori':    t.kategori,
              'Sub Kategori':t.sub_kategori || '',
              'Jenis':       t.jenis === 'masuk' ? 'Pemasukan' : 'Pengeluaran',
              'Nominal':     t.nominal,
            })),
            {},
            { 'Tanggal': 'RINGKASAN', 'Keterangan': 'Total Pemasukan',  'Nominal': totalMasuk },
            { 'Tanggal': '',          'Keterangan': 'Total Pengeluaran', 'Nominal': totalKeluar },
            { 'Tanggal': '',          'Keterangan': 'Saldo Bersih',      'Nominal': totalMasuk - totalKeluar },
          ]
        },
        {
          nama: 'Transaksi',
          data: trx.map(t => ({
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
        },
      ], `badminton-manager-${hariIni()}.xlsx`)

      tampilPesan('✅ File Excel berhasil didownload!')
    } catch (err) {
      tampilPesan('❌ Gagal export: ' + err.message)
    }
    setLoading(false)
  }

  async function exportStok() {
    setLoading(true)
    try {
      const { stok } = await ambilData()
      await downloadExcel([{
        nama: 'Stok',
        data: stok.map(p => ({
          'Nama Produk':       p.nama,
          'Kategori':          p.kategori,
          'Stok':              tampilStok(p.stok_pcs, p.isi_per_satuan, p.satuan_besar, p.satuan_kecil),
          'Stok (Pcs)':        p.stok_pcs,
          'Harga Modal/Lusin': p.harga_modal_besar,
          'Harga Jual/Lusin':  p.harga_jual_besar,
          'Harga Lapangan':    p.harga_pakai_pcs,
        }))
      }], `laporan-stok-${hariIni()}.xlsx`)
      tampilPesan('✅ Laporan Stok didownload!')
    } catch (err) { tampilPesan('❌ ' + err.message) }
    setLoading(false)
  }

  async function exportHutang() {
    setLoading(true)
    try {
      const { hutang } = await ambilData()
      await downloadExcel([{
        nama: 'Hutang',
        data: hutang.map(h => {
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
      }], `laporan-hutang-${hariIni()}.xlsx`)
      tampilPesan('✅ Laporan Hutang didownload!')
    } catch (err) { tampilPesan('❌ ' + err.message) }
    setLoading(false)
  }

  async function exportKas() {
    setLoading(true)
    try {
      const { kas } = await ambilData()
      const totalMasuk  = kas.filter(t => t.jenis === 'masuk').reduce((s, t) => s + t.nominal, 0)
      const totalKeluar = kas.filter(t => t.jenis === 'keluar').reduce((s, t) => s + t.nominal, 0)
      await downloadExcel([{
        nama: 'Kas',
        data: [
          ...kas.map(t => ({
            'Tanggal':    formatTanggal(t.tanggal),
            'Keterangan': t.keterangan,
            'Kategori':   t.kategori,
            'Jenis':      t.jenis === 'masuk' ? 'Pemasukan' : 'Pengeluaran',
            'Nominal':    t.nominal,
          })),
          {},
          { 'Tanggal': 'TOTAL', 'Keterangan': 'Total Pemasukan',  'Nominal': totalMasuk },
          { 'Tanggal': '',      'Keterangan': 'Total Pengeluaran', 'Nominal': totalKeluar },
          { 'Tanggal': '',      'Keterangan': 'Saldo Bersih',      'Nominal': totalMasuk - totalKeluar },
        ]
      }], `laporan-kas-${hariIni()}.xlsx`)
      tampilPesan('✅ Laporan Kas didownload!')
    } catch (err) { tampilPesan('❌ ' + err.message) }
    setLoading(false)
  }

  async function exportTransaksi() {
    setLoading(true)
    try {
      const { trx } = await ambilData()
      await downloadExcel([{
        nama: 'Transaksi',
        data: trx.map(t => ({
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
      }], `laporan-transaksi-${hariIni()}.xlsx`)
      tampilPesan('✅ Laporan Transaksi didownload!')
    } catch (err) { tampilPesan('❌ ' + err.message) }
    setLoading(false)
  }

  return (
    <div>
      {pesan && (
        <div style={{ position: 'fixed', bottom: 28, right: 28, background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '12px 18px', fontSize: 14, fontWeight: 600, zIndex: 300, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', maxWidth: 400 }}>
          {pesan}
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5, marginBottom: 4 }}>📤 Export Laporan</div>
        <div style={{ fontSize: 14, color: '#94a3b8' }}>Download data dalam format Excel atau cetak PDF</div>
      </div>

      <div style={panel}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #334155', fontWeight: 700, fontSize: 15 }}>
          📊 Export Excel
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>

          <div style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: 10, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>📋 Export Semua (4 Sheet)</div>
              <div style={{ fontSize: 13, color: '#94a3b8' }}>Stok + Hutang + Kas + Transaksi dalam 1 file Excel</div>
            </div>
            <button style={{ ...btnHijau, fontSize: 14, padding: '10px 24px' }} onClick={exportSemua} disabled={loading}>
              {loading ? '⏳ Memproses...' : '⬇️ Download Semua'}
            </button>
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 1, marginTop: 8 }}>
            Atau download per modul:
          </div>

          {[
            { label: '📦 Laporan Stok',     sub: 'Produk, stok saat ini, harga',         fn: exportStok },
            { label: '💳 Laporan Hutang',    sub: 'Pelanggan, total, sisa, status',       fn: exportHutang },
            { label: '💰 Laporan Kas',       sub: 'Pemasukan, pengeluaran, saldo bersih', fn: exportKas },
            { label: '🛒 Laporan Transaksi', sub: 'Jual, lapangan, restock + history',    fn: exportTransaksi },
          ].map((item, i) => (
            <div key={i} style={{ background: '#0f172a', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{item.label}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{item.sub}</div>
              </div>
              <button style={btnBiru} onClick={item.fn} disabled={loading}>⬇️ Download</button>
            </div>
          ))}
        </div>
      </div>

      <div style={panel}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #334155', fontWeight: 700, fontSize: 15 }}>
          🖨️ Cetak / Export PDF
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 8, padding: 12, fontSize: 13, color: '#c4b5fd', marginBottom: 16 }}>
            💡 Klik Print → di dialog browser pilih <strong>"Save as PDF"</strong> sebagai printer → halaman yang sedang aktif akan tersimpan sebagai PDF
          </div>
          <button style={btnUngu} onClick={() => window.print()}>🖨️ Print / Save as PDF</button>
        </div>
      </div>
    </div>
  )
}