'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatRupiah(n) { return 'Rp ' + Number(n || 0).toLocaleString('id-ID') }

function hariIni() { return new Date().toISOString().split('T')[0] }

function formatTanggal(t) {
  if (!t) return '–'
  return new Date(t + 'T00:00:00').toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })
}

// Generate nama sesi otomatis dari tanggal + waktu, contoh: "Sesi Malam — Senin, 22 Juni 2026"
function namaSesi(sesi) {
  if (!sesi || !sesi.tanggal) return 'Sesi'
  const labelWaktu = sesi.waktu === 'sore' ? 'Sore' : 'Malam'
  const tgl = new Date(sesi.tanggal + 'T00:00:00')
  const tglFormat = tgl.toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
  return `Sesi ${labelWaktu} — ${tglFormat}`
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

// Inti rekap: gabungkan data match (bola, dicatat utuh per pemain) + belanja, jadi rekap per pemain
// Dihitung ulang tiap render dari matchList + belanjaList — TIDAK disimpan permanen di state terpisah
//
// PENTING: setiap baris match_pemain dan sesi_belanja punya kolom sesi_pemain_biaya_id.
// NULL = belum termasuk pembayaran manapun (masih dihitung sebagai sisa).
// Terisi  = sudah ditandai lunas lewat pembayaran tertentu, TIDAK dihitung lagi di sini.
// Ini menggantikan pendekatan lama (bandingkan timestamp) yang rapuh terhadap klik cepat/race condition.
function hitungRekapPemain(matchList, belanjaList, daftarPemain, biayaList = []) {
  const rekap = {}

  function pastikanAda(pemainId) {
    if (!rekap[pemainId]) {
      const p = daftarPemain.find(p => p.id === pemainId)
      rekap[pemainId] = {
        pemain_id: pemainId,
        nama: p ? p.nama : '(tidak diketahui)',
        sisa_bola_pcs: 0,
        detail_match: [],
        sisa_belanja: 0,
        detail_belanja: [],
        total_sudah_dibayar: 0,
      }
    }
    return rekap[pemainId]
  }

  // Pemain yang sudah pernah bayar TETAP dimasukkan ke rekap, supaya tidak hilang dari daftar
  biayaList.forEach(b => {
    const r = pastikanAda(b.pemain_id)
    r.total_sudah_dibayar += b.biaya
  })

  // Akumulasi bola HANYA dari match_pemain yang BELUM ditandai (sesi_pemain_biaya_id masih NULL)
  matchList.forEach(m => {
    const pemainDiMatch = m.match_pemain || []
    pemainDiMatch.forEach(mp => {
      if (mp.sesi_pemain_biaya_id) return // sudah ditandai lunas, skip — TIDAK peduli waktu
      const r = pastikanAda(mp.pemain_id)
      r.sisa_bola_pcs += m.jumlah_bola_pcs
      r.detail_match.push({ nomor_match: m.nomor_match, bola_pcs: m.jumlah_bola_pcs })
    })
  })

  // Akumulasi belanja HANYA yang belum ditandai
  belanjaList.forEach(b => {
    if (b.sesi_pemain_biaya_id) return // sudah ditandai lunas, skip
    const r = pastikanAda(b.pemain_id)
    r.sisa_belanja += b.total
    r.detail_belanja.push(b)
  })

  return Object.values(rekap).sort((a, b) => a.nama.localeCompare(b.nama))
}

// Format rincian bola per match jadi teks ringkas, misal: "2 (M1) + 2 (M2)"
// Kalau cuma 1 match, cukup tampilkan angkanya saja tanpa rincian
function formatRincianBola(detailMatch) {
  if (detailMatch.length <= 1) return null
  return detailMatch.map(d => `${d.bola_pcs} (M${d.nomor_match})`).join(' + ')
}

// Cari paket harga yang cocok untuk jumlah bola tertentu, untuk ditampilkan sebagai REFERENSI saja
function cariPaketHarga(paketList, totalBola) {
  const bulat = Math.round(totalBola)
  return paketList.find(p => bulat >= p.min_bola && bulat <= p.max_bola) || null
}

// Normalisasi nama untuk deteksi mirip: lowercase + hapus spasi ekstra (sama seperti di Pemain.js)
function normalisasiNama(nama) {
  return nama.trim().toLowerCase().replace(/\s+/g, ' ')
}

// Cari pemain lain yang namanya mirip (normalisasi sama) — cuma untuk PERINGATAN, tidak blokir
function cariPemainMirip(nama, daftarPemain) {
  const target = normalisasiNama(nama)
  if (!target) return []
  return daftarPemain.filter(p => normalisasiNama(p.nama) === target)
}

// ============================================
// STYLE (konsisten dengan halaman lain)
// ============================================

const panel = { background:'#1e293b', border:'1px solid #334155', borderRadius:12, overflow:'hidden', marginBottom:20 }
const th = { padding:'11px 20px', textAlign:'left', fontSize:11, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'0.8px', borderBottom:'1px solid #334155' }
const td = { padding:'12px 20px', borderBottom:'1px solid rgba(51,65,85,0.5)', verticalAlign:'middle', fontSize:14 }
const inp = { background:'#0f172a', border:'1px solid #334155', borderRadius:8, color:'#f1f5f9', fontFamily:'inherit', fontSize:14, padding:'9px 14px', outline:'none', width:'100%' }
const lbl = { fontSize:13, fontWeight:600, color:'#94a3b8', display:'block', marginBottom:6 }
const btnG = { padding:'9px 16px', borderRadius:8, background:'#16a34a', color:'white', border:'none', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }
const btnS = { padding:'7px 16px', borderRadius:8, background:'#334155', color:'#f1f5f9', border:'1px solid #475569', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }
const btnR = { padding:'7px 16px', borderRadius:8, background:'#dc2626', color:'white', border:'none', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }

// ============================================
// KOMPONEN UTAMA
// ============================================

export default function Match() {
  const isMobile = useIsMobile()

  // ── Kotak data referensi (dimuat sekali) ──
  const [daftarPemain, setDaftarPemain] = useState([])
  const [daftarProdukShuttle, setDaftarProdukShuttle] = useState([])
  const [daftarProdukJual, setDaftarProdukJual] = useState([]) // untuk form belanja
  const [daftarPaketHarga, setDaftarPaketHarga] = useState([])
  const [historySesi, setHistorySesi] = useState([])

  // ── Kotak utama: penentu "wajah" mana yang tampil ──
  const [sesiAktif, setSesiAktif] = useState(null) // null = belum ada sesi aktif
  const [modeAkhirSesi, setModeAkhirSesi] = useState(false)
  const [tahapAkhirSesi, setTahapAkhirSesi] = useState('konfirmasi') // 'konfirmasi' | 'detail'
  const [tabKosong, setTabKosong] = useState('mulai') // 'mulai' / 'history' — hanya relevan saat sesiAktif === null

  // ── Kotak data sesi aktif (reload tiap ada perubahan) ──
  const [matchList, setMatchList] = useState([])
  const [belanjaList, setBelanjaList] = useState([])
  const [biayaList, setBiayaList] = useState([]) // riwayat sesi_pemain_biaya yang SUDAH dibayar di sesi ini (bisa lebih dari 1x per pemain)

  // ── State form: Mulai Sesi ──
  const [formWaktu, setFormWaktu] = useState('sore')
  const [formProdukShuttleId, setFormProdukShuttleId] = useState('')

  // ── State form: Tambah Match ──
  const [showFormMatch, setShowFormMatch] = useState(false)
  const [matchPemainTerpilih, setMatchPemainTerpilih] = useState([]) // array of {id, nama}
  const [matchJumlahBola, setMatchJumlahBola] = useState('')
  const [cariPemainMatch, setCariPemainMatch] = useState('')

  // ── State form: Tambah Belanja ──
  const [showFormBelanja, setShowFormBelanja] = useState(false)
  const [belanjaPemainId, setBelanjaPemainId] = useState('')
  const [belanjaProdukId, setBelanjaProdukId] = useState('')
  const [belanjaJumlah, setBelanjaJumlah] = useState('')
  const [cariPemainBelanja, setCariPemainBelanja] = useState('')

  // ── State form: Tambah Pemain Baru (inline) ──
  const [showFormPemainBaru, setShowFormPemainBaru] = useState(false)
  const [matchTerbuka, setMatchTerbuka] = useState(null) // nomor_match yang sedang di-expand di akordeon Daftar Match
  const [cariRekap, setCariRekap] = useState('') // search pemain di Rekap Sementara
  const [pemainRekapTerbuka, setPemainRekapTerbuka] = useState(null) // pemain_id yang sedang di-expand di Rekap Sementara mobile
  const [matchEditId, setMatchEditId] = useState(null) // id match yang sedang diedit jumlah bolanya
  const [matchEditBola, setMatchEditBola] = useState('')
  const [belanjaEditId, setBelanjaEditId] = useState(null) // id sesi_belanja yang sedang diedit
  const [belanjaEditJumlah, setBelanjaEditJumlah] = useState('')
  const [pemainBaruNama, setPemainBaruNama] = useState('')
  const [pemainBaruHp, setPemainBaruHp] = useState('')

  // ── State form: Akhiri Sesi ──
  const [formBiayaFinal, setFormBiayaFinal] = useState({}) // { [pemain_id]: { biaya: '', status: 'belum' } }

  // ── State modal: Bayar (per pemain, bisa dipakai kapan saja selama sesi aktif) ──
  const [modalBayarPemain, setModalBayarPemain] = useState(null) // object rekap pemain yang sedang dibayar, atau null
  const [modalBayarBiaya, setModalBayarBiaya] = useState('')

  // ── Misc ──
  const [loading, setLoading] = useState(false)
  const [pesan, setPesan] = useState(null)

  function tampilPesan(teks) { setPesan(teks); setTimeout(() => setPesan(null), 4000) }

  // ============================================
  // MUAT DATA
  // ============================================

  // Data referensi: dimuat sekali saat halaman dibuka
  async function muatDataReferensi() {
    const [resPemain, resStok, resPaket] = await Promise.all([
      supabase.from('pemain').select('*').order('nama'),
      supabase.from('stok').select('*').order('nama'),
      supabase.from('paket_harga_bola').select('*').order('urutan'),
    ])
    if (!resPemain.error) setDaftarPemain(resPemain.data)
    if (!resStok.error) {
      setDaftarProdukShuttle(resStok.data.filter(p => p.tipe_produk === 'shuttle'))
      setDaftarProdukJual(resStok.data) // semua produk boleh dibelanjakan saat sesi (termasuk shuttle ekstra)
    }
    if (!resPaket.error) setDaftarPaketHarga(resPaket.data)
  }

  // Cek apakah ada sesi yang sedang aktif. Kalau ada, langsung muat juga match & belanjanya.
  async function muatSesiAktif() {
    const { data: sesiRows, error } = await supabase
      .from('sesi_main')
      .select('*, stok:produk_shuttle_id(nama, satuan_besar, satuan_kecil, isi_per_satuan, stok_pcs)')
      .eq('status', 'aktif')
      .order('created_at', { ascending: false })
      .limit(1)

    if (error || !sesiRows || sesiRows.length === 0) {
      setSesiAktif(null)
      setMatchList([])
      setBelanjaList([])
      setBiayaList([])
      return
    }
    setSesiAktif(sesiRows[0])
    await muatDataSesiAktif(sesiRows[0].id)
  }

  // Muat match (+ pemain di tiap match), belanja, dan riwayat biaya yang sudah dibayar untuk sesi yang sedang aktif
  async function muatDataSesiAktif(sesiMainId) {
    const [resMatch, resBelanja, resBiaya] = await Promise.all([
      supabase.from('match').select('*, match_pemain(id, pemain_id, sesi_pemain_biaya_id)').eq('sesi_main_id', sesiMainId).order('nomor_match'),
      supabase.from('sesi_belanja').select('*, stok:produk_id(nama, satuan_kecil)').eq('sesi_main_id', sesiMainId).order('created_at'),
      supabase.from('sesi_pemain_biaya').select('*').eq('sesi_main_id', sesiMainId),
    ])
    if (!resMatch.error) setMatchList(resMatch.data)
    if (!resBelanja.error) setBelanjaList(resBelanja.data)
    if (!resBiaya.error) setBiayaList(resBiaya.data)
  }

  // History: sesi yang sudah selesai
  async function muatHistory() {
    const { data, error } = await supabase
      .from('sesi_main')
      .select('*, stok:produk_shuttle_id(nama), match(id, jumlah_bola_pcs), sesi_pemain_biaya(id, biaya, status_bayar)')
      .eq('status', 'selesai')
      .order('tanggal', { ascending: false })
      .limit(50)
    if (!error) setHistorySesi(data)
  }

  useEffect(() => {
    muatDataReferensi()
    muatSesiAktif()
    muatHistory()
  }, [])

  // Rekap per pemain, dihitung ulang otomatis tiap matchList/belanjaList berubah (bukan query terpisah)
  const rekapPemain = hitungRekapPemain(matchList, belanjaList, daftarPemain, biayaList)
  // Subset rekapPemain yang masih punya sisa belum dibayar — dipakai khusus di form Akhiri Sesi,
  // supaya pemain yang sudah lunas (lewat tombol Bayar di tengah sesi) tidak muncul lagi minta diisi.
  const rekapBelumLunas = rekapPemain.filter(r => r.sisa_bola_pcs > 0 || r.sisa_belanja > 0)

  // ============================================
  // AKSI: MULAI SESI
  // ============================================

  async function mulaiSesi() {
    if (!formProdukShuttleId) { tampilPesan('⚠️ Pilih shuttle yang dipakai dulu!'); return }
    setLoading(true)
    const { error } = await supabase.from('sesi_main').insert([{
      tanggal: hariIni(),
      waktu: formWaktu,
      status: 'aktif',
      produk_shuttle_id: formProdukShuttleId,
    }])
    setLoading(false)
    if (error) { tampilPesan('❌ ' + error.message); return }
    tampilPesan('✅ Sesi dimulai!')
    setFormProdukShuttleId('')
    await muatSesiAktif()
  }

  // ============================================
  // AKSI: TAMBAH MATCH
  // ============================================

  function toggleChipPemainMatch(p) {
    const sudahAda = matchPemainTerpilih.some(x => x.id === p.id)
    if (sudahAda) {
      setMatchPemainTerpilih(matchPemainTerpilih.filter(x => x.id !== p.id))
    } else {
      if (matchPemainTerpilih.length >= 4) { tampilPesan('⚠️ Maksimal 4 pemain per match!'); return }
      setMatchPemainTerpilih([...matchPemainTerpilih, p])
      setCariPemainMatch('')
    }
  }

  async function simpanMatch() {
    if (matchPemainTerpilih.length === 0) { tampilPesan('⚠️ Pilih minimal 1 pemain!'); return }
    const bola = parseInt(matchJumlahBola) || 0
    if (bola <= 0) { tampilPesan('⚠️ Jumlah bola harus lebih dari 0!'); return }

    setLoading(true)
    const nomorBerikutnya = matchList.length > 0 ? Math.max(...matchList.map(m => m.nomor_match)) + 1 : 1

    const { data: matchBaru, error: errMatch } = await supabase
      .from('match')
      .insert([{ sesi_main_id: sesiAktif.id, nomor_match: nomorBerikutnya, jumlah_bola_pcs: bola }])
      .select()
      .single()

    if (errMatch) { setLoading(false); tampilPesan('❌ ' + errMatch.message); return }

    const rowsMatchPemain = matchPemainTerpilih.map(p => ({ match_id: matchBaru.id, pemain_id: p.id }))
    const { error: errMP } = await supabase.from('match_pemain').insert(rowsMatchPemain)

    setLoading(false)
    if (errMP) { tampilPesan('❌ ' + errMP.message); return }

    tampilPesan(`✅ Match #${nomorBerikutnya} tercatat — ${bola} bola untuk ${matchPemainTerpilih.length} pemain`)
    setMatchPemainTerpilih([])
    setMatchJumlahBola('')
    setShowFormMatch(false)
    muatDataSesiAktif(sesiAktif.id)
  }

  // Cek apakah sebuah match/belanja sudah "terkunci" karena sudah ikut dihitung dalam pembayaran Lunas
  // sebelumnya untuk SALAH SATU pemain di dalamnya. Kalau terkunci, tidak boleh diedit/dihapus.
  function itemTerkunci(createdAt, pemainIds) {
    return pemainIds.some(pid => {
      const batas = biayaList
        .filter(b => b.pemain_id === pid)
        .reduce((latest, b) => (!latest || b.created_at > latest) ? b.created_at : latest, null)
      return batas && createdAt <= batas
    })
  }

  async function hapusMatch(m) {
    const pemainIds = (m.match_pemain || []).map(mp => mp.pemain_id)
    if (itemTerkunci(m.created_at, pemainIds)) {
      tampilPesan('⚠️ Match ini sudah ikut dihitung dalam pembayaran Lunas, tidak bisa dihapus.')
      return
    }
    if (!confirm(`Hapus Match #${m.nomor_match}?`)) return
    setLoading(true)
    await supabase.from('match_pemain').delete().eq('match_id', m.id)
    const { error } = await supabase.from('match').delete().eq('id', m.id)
    setLoading(false)
    if (error) { tampilPesan('❌ ' + error.message); return }
    tampilPesan(`🗑️ Match #${m.nomor_match} dihapus`)
    muatDataSesiAktif(sesiAktif.id)
  }

  async function simpanEditMatch(m, bolaBaru) {
    const pemainIds = (m.match_pemain || []).map(mp => mp.pemain_id)
    if (itemTerkunci(m.created_at, pemainIds)) {
      tampilPesan('⚠️ Match ini sudah ikut dihitung dalam pembayaran Lunas, tidak bisa diedit.')
      return
    }
    const bola = parseInt(bolaBaru) || 0
    if (bola <= 0) { tampilPesan('⚠️ Jumlah bola harus lebih dari 0!'); return }
    setLoading(true)
    const { error } = await supabase.from('match').update({ jumlah_bola_pcs: bola }).eq('id', m.id)
    setLoading(false)
    if (error) { tampilPesan('❌ ' + error.message); return }
    tampilPesan(`✅ Match #${m.nomor_match} diperbarui — ${bola} bola`)
    setMatchEditId(null)
    muatDataSesiAktif(sesiAktif.id)
  }

  // ============================================
  // AKSI: TAMBAH BELANJA
  // ============================================

  async function simpanBelanja() {
    if (!belanjaPemainId) { tampilPesan('⚠️ Pilih pemain dulu!'); return }
    if (!belanjaProdukId) { tampilPesan('⚠️ Pilih produk dulu!'); return }
    const jumlah = parseInt(belanjaJumlah) || 0
    if (jumlah <= 0) { tampilPesan('⚠️ Jumlah harus lebih dari 0!'); return }

    const produk = daftarProdukJual.find(p => p.id === parseInt(belanjaProdukId))
    if (!produk) return
    if (jumlah > produk.stok_pcs) { tampilPesan(`⚠️ Stok ${produk.nama} tidak cukup! Sisa: ${produk.stok_pcs} ${produk.satuan_kecil}`); return }

    const total = jumlah * produk.harga_jual_pcs

    setLoading(true)

    // 1. Kurangi stok produk dulu (pola sama seperti simpanJual di Transaksi.js)
    const { error: errStok } = await supabase
      .from('stok')
      .update({ stok_pcs: produk.stok_pcs - jumlah })
      .eq('id', produk.id)

    if (errStok) { setLoading(false); tampilPesan('❌ ' + errStok.message); return }

    // 2. Baru insert catatan belanja sesi
    const { error } = await supabase.from('sesi_belanja').insert([{
      sesi_main_id: sesiAktif.id,
      pemain_id: belanjaPemainId,
      produk_id: produk.id,
      jumlah_pcs: jumlah,
      total: total,
    }])
    setLoading(false)
    if (error) { tampilPesan('❌ ' + error.message); return }

    tampilPesan(`✅ Belanja tercatat: ${formatRupiah(total)} (stok ${produk.nama} -${jumlah})`)
    setBelanjaPemainId('')
    setBelanjaProdukId('')
    setBelanjaJumlah('')
    setShowFormBelanja(false)
    muatDataSesiAktif(sesiAktif.id)
    muatDataReferensi() // muat ulang daftar produk supaya angka stok di memori ikut update
  }

  async function hapusBelanja(b) {
    if (itemTerkunci(b.created_at, [b.pemain_id])) {
      tampilPesan('⚠️ Belanja ini sudah ikut dihitung dalam pembayaran Lunas, tidak bisa dihapus.')
      return
    }
    if (!confirm(`Hapus belanja ${b.stok?.nama || ''} (${b.jumlah_pcs} pcs)?`)) return
    setLoading(true)
    // Kembalikan stok yang sudah dikurangi sebelumnya
    const produk = daftarProdukJual.find(p => p.id === b.produk_id)
    if (produk) {
      await supabase.from('stok').update({ stok_pcs: produk.stok_pcs + b.jumlah_pcs }).eq('id', produk.id)
    }
    const { error } = await supabase.from('sesi_belanja').delete().eq('id', b.id)
    setLoading(false)
    if (error) { tampilPesan('❌ ' + error.message); return }
    tampilPesan('🗑️ Belanja dihapus, stok dikembalikan')
    muatDataSesiAktif(sesiAktif.id)
    muatDataReferensi()
  }

  async function simpanEditBelanja(b, jumlahBaru) {
    if (itemTerkunci(b.created_at, [b.pemain_id])) {
      tampilPesan('⚠️ Belanja ini sudah ikut dihitung dalam pembayaran Lunas, tidak bisa diedit.')
      return
    }
    const jumlah = parseInt(jumlahBaru) || 0
    if (jumlah <= 0) { tampilPesan('⚠️ Jumlah harus lebih dari 0!'); return }

    const produk = daftarProdukJual.find(p => p.id === b.produk_id)
    if (!produk) { tampilPesan('❌ Produk tidak ditemukan.'); return }

    // Selisih dari jumlah lama ke jumlah baru, lalu sesuaikan stok berdasarkan selisih itu
    const selisih = jumlah - b.jumlah_pcs // positif = stok harus berkurang lagi, negatif = stok dikembalikan sebagian
    if (selisih > 0 && selisih > produk.stok_pcs) {
      tampilPesan(`⚠️ Stok ${produk.nama} tidak cukup untuk tambahan ini!`)
      return
    }

    setLoading(true)
    await supabase.from('stok').update({ stok_pcs: produk.stok_pcs - selisih }).eq('id', produk.id)
    const totalBaru = jumlah * produk.harga_jual_pcs
    const { error } = await supabase.from('sesi_belanja').update({ jumlah_pcs: jumlah, total: totalBaru }).eq('id', b.id)
    setLoading(false)
    if (error) { tampilPesan('❌ ' + error.message); return }

    tampilPesan(`✅ Belanja diperbarui — ${jumlah} pcs`)
    setBelanjaEditId(null)
    muatDataSesiAktif(sesiAktif.id)
    muatDataReferensi()
  }

  // ============================================
  // AKSI: TAMBAH PEMAIN BARU (inline)
  // ============================================

  async function simpanPemainBaru() {
    if (!pemainBaruNama.trim()) { tampilPesan('⚠️ Nama pemain wajib diisi!'); return }
    setLoading(true)
    const namaBaru = pemainBaruNama.trim()
    const { data, error } = await supabase
      .from('pemain')
      .insert([{ nama: namaBaru, no_hp: pemainBaruHp.trim() || null }])
      .select()
      .single()

    if (error) { setLoading(false); tampilPesan('❌ ' + error.message); return }

    // Cek apakah ada hutang lama dengan nama SAMA PERSIS (case-insensitive) yang belum terhubung
    // ke pemain manapun — kalau ada, sambungkan otomatis ke pemain baru ini (konsisten dengan Pemain.js)
    const { data: hutangCocok } = await supabase
      .from('hutang')
      .select('id')
      .is('pemain_id', null)
      .ilike('nama', namaBaru)

    let pesanTambahan = ''
    if (hutangCocok && hutangCocok.length > 0) {
      await supabase.from('hutang').update({ pemain_id: data.id }).is('pemain_id', null).ilike('nama', namaBaru)
      pesanTambahan = ` — ${hutangCocok.length} hutang lama tersambung!`
    }

    setLoading(false)
    tampilPesan(`✅ Pemain "${data.nama}" ditambahkan!${pesanTambahan}`)
    setDaftarPemain([...daftarPemain, data].sort((a, b) => a.nama.localeCompare(b.nama)))
    setPemainBaruNama('')
    setPemainBaruHp('')
    setShowFormPemainBaru(false)
  }

  // ============================================
  // AKSI: BAYAR (per pemain, kapan saja selama sesi masih aktif)
  // ============================================

  function bukaModalBayar(r) {
    const saran = cariPaketHarga(daftarPaketHarga, r.sisa_bola_pcs)
    const totalSaran = (saran ? saran.harga : 0) + r.sisa_belanja
    setModalBayarBiaya(totalSaran > 0 ? String(totalSaran) : '')
    setModalBayarPemain(r)
  }

  async function prosesBayarSatuPemain() {
    if (!modalBayarPemain) return
    const biaya = parseInt(modalBayarBiaya) || 0
    if (biaya <= 0) { tampilPesan('⚠️ Isi biaya dulu!'); return }

    setLoading(true)
    try {
      // 1. Catat sebagai lunas di sesi_pemain_biaya — sesi TETAP aktif, ini cuma "nota" untuk porsi yang dibayar sekarang
      const { data: biayaRow, error: errBiaya } = await supabase.from('sesi_pemain_biaya').insert([{
        sesi_main_id: sesiAktif.id,
        pemain_id: modalBayarPemain.pemain_id,
        total_bola_pcs: modalBayarPemain.sisa_bola_pcs,
        biaya: biaya,
        status_bayar: 'lunas',
      }]).select().single()
      if (errBiaya) throw new Error(errBiaya.message)

      // 1b. Tandai EKSPLISIT semua match_pemain & sesi_belanja milik pemain ini yang masih
      // belum ditandai (NULL) — supaya tidak terhitung lagi sebagai sisa, terlepas dari waktu klik.
      const nomorMatchYangDibayar = modalBayarPemain.detail_match.map(d => d.nomor_match)
      if (nomorMatchYangDibayar.length > 0) {
        const matchIdYangDibayar = matchList
          .filter(m => nomorMatchYangDibayar.includes(m.nomor_match))
          .flatMap(m => (m.match_pemain || [])
            .filter(mp => mp.pemain_id === modalBayarPemain.pemain_id && !mp.sesi_pemain_biaya_id)
            .map(mp => mp.id))
        if (matchIdYangDibayar.length > 0) {
          const { error: errTandaMatch } = await supabase
            .from('match_pemain')
            .update({ sesi_pemain_biaya_id: biayaRow.id })
            .in('id', matchIdYangDibayar)
          if (errTandaMatch) throw new Error(errTandaMatch.message)
        }
      }
      if (modalBayarPemain.detail_belanja.length > 0) {
        const belanjaIdYangDibayar = modalBayarPemain.detail_belanja.map(b => b.id)
        const { error: errTandaBelanja } = await supabase
          .from('sesi_belanja')
          .update({ sesi_pemain_biaya_id: biayaRow.id })
          .in('id', belanjaIdYangDibayar)
        if (errTandaBelanja) throw new Error(errTandaBelanja.message)
      }

      // 2. Masuk ke kas
      const { error: errKas } = await supabase.from('kas').insert([{
        jenis: 'masuk',
        kategori: 'Pemasukan Match',
        sub_kategori: namaSesi(sesiAktif),
        keterangan: `${modalBayarPemain.nama} — ${modalBayarPemain.sisa_bola_pcs} bola${modalBayarPemain.sisa_belanja > 0 ? ` + belanja ${formatRupiah(modalBayarPemain.sisa_belanja)}` : ''} (bayar di tengah sesi)`,
        nominal: biaya,
        tanggal: sesiAktif.tanggal,
      }])
      if (errKas) throw new Error(errKas.message)

      tampilPesan(`✅ ${modalBayarPemain.nama} sudah bayar ${formatRupiah(biaya)}`)
      setModalBayarPemain(null)
      setModalBayarBiaya('')
      muatDataSesiAktif(sesiAktif.id) // muat ulang biayaList, supaya rekap mulai hitung dari nol untuk pemain ini
    } catch (err) {
      tampilPesan('❌ ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // AKSI: AKHIRI SESI
  // ============================================

  // Saat masuk mode Akhiri Sesi, siapkan formBiayaFinal awal dari rekapPemain (biaya kosong, status default 'belum')
  function bukaFormAkhirSesi() {
    const formAwal = {}
    // Hanya pemain dengan sisa belum dibayar yang perlu diisi form-nya; yang sudah lunas dilewati.
    rekapPemain.filter(r => r.sisa_bola_pcs > 0 || r.sisa_belanja > 0).forEach(r => {
      const paketSaran = cariPaketHarga(daftarPaketHarga, r.sisa_bola_pcs)
      formAwal[r.pemain_id] = {
        biaya: paketSaran ? String(paketSaran.harga) : '',
        status: 'belum',
      }
    })
    setFormBiayaFinal(formAwal)
    setTahapAkhirSesi('konfirmasi')
    setModeAkhirSesi(true)
  }

  function updateBiayaFinal(pemainId, field, value) {
    setFormBiayaFinal({
      ...formBiayaFinal,
      [pemainId]: { ...formBiayaFinal[pemainId], [field]: value },
    })
  }

  async function submitAkhirSesi() {
    // Validasi: semua pemain yang masih punya sisa harus punya biaya terisi
    const belumLengkap = rekapBelumLunas.some(r => {
      const f = formBiayaFinal[r.pemain_id]
      return !f || !f.biaya || parseInt(f.biaya) <= 0
    })
    if (belumLengkap) { tampilPesan('⚠️ Isi biaya untuk semua pemain dulu!'); return }

    setLoading(true)

    try {
      // Proses tiap pemain SATU PER SATU (berurutan), karena hutang_id baru ada setelah insert hutang sukses
      for (const r of rekapBelumLunas) {
        const f = formBiayaFinal[r.pemain_id]
        const biaya = parseInt(f.biaya) || 0
        const bolaBulat = Math.round(r.sisa_bola_pcs)

        // 1. Insert ke sesi_pemain_biaya dulu (hutang_id masih kosong di awal)
        const { data: biayaRow, error: errBiaya } = await supabase
          .from('sesi_pemain_biaya')
          .insert([{
            sesi_main_id: sesiAktif.id,
            pemain_id: r.pemain_id,
            total_bola_pcs: bolaBulat,
            biaya: biaya,
            status_bayar: f.status === 'lunas' ? 'lunas' : 'belum',
          }])
          .select()
          .single()

        if (errBiaya) throw new Error(`Gagal simpan biaya ${r.nama}: ${errBiaya.message}`)

        // 1b. Tandai eksplisit match_pemain & sesi_belanja milik pemain ini yang masih belum ditandai
        const nomorMatchPemainIni = r.detail_match.map(d => d.nomor_match)
        if (nomorMatchPemainIni.length > 0) {
          const matchIdPemainIni = matchList
            .filter(m => nomorMatchPemainIni.includes(m.nomor_match))
            .flatMap(m => (m.match_pemain || [])
              .filter(mp => mp.pemain_id === r.pemain_id && !mp.sesi_pemain_biaya_id)
              .map(mp => mp.id))
          if (matchIdPemainIni.length > 0) {
            await supabase.from('match_pemain').update({ sesi_pemain_biaya_id: biayaRow.id }).in('id', matchIdPemainIni)
          }
        }
        if (r.detail_belanja.length > 0) {
          const belanjaIdPemainIni = r.detail_belanja.map(b => b.id)
          await supabase.from('sesi_belanja').update({ sesi_pemain_biaya_id: biayaRow.id }).in('id', belanjaIdPemainIni)
        }

        if (f.status === 'lunas') {
          // 2a. LUNAS → masuk ke kas
          const { error: errKas } = await supabase.from('kas').insert([{
            jenis: 'masuk',
            kategori: 'Pemasukan Match',
            sub_kategori: namaSesi(sesiAktif),
            keterangan: `${r.nama} — ${bolaBulat} bola${r.sisa_belanja > 0 ? ` + belanja ${formatRupiah(r.sisa_belanja)}` : ''}`,
            nominal: biaya,
            tanggal: sesiAktif.tanggal,
          }])
          if (errKas) throw new Error(`Gagal simpan kas ${r.nama}: ${errKas.message}`)
        } else {
          // 2b. BELUM BAYAR → masuk ke hutang, lalu hubungkan balik ke sesi_pemain_biaya
          const { data: hutangRow, error: errHutang } = await supabase.from('hutang').insert([{
            nama: r.nama,
            pemain_id: r.pemain_id,
            keterangan: `${namaSesi(sesiAktif)} — ${bolaBulat} bola${r.sisa_belanja > 0 ? ` + belanja ${formatRupiah(r.sisa_belanja)}` : ''}`,
            total_hutang: biaya,
            sudah_bayar: 0,
            tanggal: sesiAktif.tanggal,
          }]).select().single()

          if (errHutang) throw new Error(`Gagal simpan hutang ${r.nama}: ${errHutang.message}`)

          const { error: errUpdate } = await supabase
            .from('sesi_pemain_biaya')
            .update({ hutang_id: hutangRow.id })
            .eq('id', biayaRow.id)

          if (errUpdate) throw new Error(`Gagal hubungkan hutang ${r.nama}: ${errUpdate.message}`)
        }
      }

      // 3. Kurangi stok shuttle berdasarkan total bola ASLI dari tabel match (bukan hasil pembulatan per pemain)
      const totalBolaAsli = matchList.reduce((s, m) => s + m.jumlah_bola_pcs, 0)
      const stokSekarang = sesiAktif.stok?.stok_pcs || 0
      const { error: errStok } = await supabase
        .from('stok')
        .update({ stok_pcs: Math.max(0, stokSekarang - totalBolaAsli) })
        .eq('id', sesiAktif.produk_shuttle_id)

      if (errStok) throw new Error(`Gagal update stok: ${errStok.message}`)

      // 4. Tandai sesi selesai
      const { error: errSesi } = await supabase
        .from('sesi_main')
        .update({ status: 'selesai' })
        .eq('id', sesiAktif.id)

      if (errSesi) throw new Error(`Gagal selesaikan sesi: ${errSesi.message}`)

      // 5. Reset, kembali ke Wajah A
      tampilPesan('✅ Sesi berhasil diselesaikan!')
      setModeAkhirSesi(false)
      setSesiAktif(null)
      setMatchList([])
      setBelanjaList([])
      setFormBiayaFinal({})
      setTabKosong('history')
      muatHistory()
      muatDataReferensi()

    } catch (err) {
      tampilPesan('❌ ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {pesan && (
        <div style={{ position:'fixed', bottom:isMobile?80:28, right:isMobile?16:28, left:isMobile?16:'auto', background:'#1e293b', border:'1px solid #334155', borderRadius:8, padding:'12px 18px', fontSize:14, fontWeight:600, zIndex:300, boxShadow:'0 8px 32px rgba(0,0,0,0.4)' }}>
          {pesan}
        </div>
      )}

      {/* ── MODAL BAYAR (per pemain, kapan saja selama sesi aktif) ── */}
      {modalBayarPemain && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:16 }}
          onClick={() => setModalBayarPemain(null)}>
          <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:12, padding:24, width:400, maxWidth:'100%' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:18, fontWeight:800, marginBottom:20, paddingBottom:14, borderBottom:'1px solid #334155' }}>💰 Bayar — {modalBayarPemain.nama}</div>

            <div style={{ background:'#0f172a', borderRadius:8, padding:14, marginBottom:20, fontSize:13, fontFamily:'monospace' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <span style={{ color:'#94a3b8' }}>Jumlah Bola:</span>
                <span>{modalBayarPemain.sisa_bola_pcs} pcs</span>
              </div>
              {(() => {
                const saran = cariPaketHarga(daftarPaketHarga, modalBayarPemain.sisa_bola_pcs)
                return saran ? (
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ color:'#94a3b8' }}>Saran Harga Bola:</span>
                    <span style={{ color:'#4ade80' }}>{formatRupiah(saran.harga)}</span>
                  </div>
                ) : null
              })()}
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <span style={{ color:'#94a3b8' }}>Belanja Produk Lain:</span>
                <span style={{ color:'#4ade80' }}>{formatRupiah(modalBayarPemain.sisa_belanja)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', borderTop:'1px solid #334155', paddingTop:8, marginTop:2 }}>
                <span style={{ color:'#94a3b8' }}>Total Saran Bayar:</span>
                <span style={{ color:'#4ade80', fontWeight:700 }}>
                  {(() => {
                    const saran = cariPaketHarga(daftarPaketHarga, modalBayarPemain.sisa_bola_pcs)
                    const totalSaran = (saran ? saran.harga : 0) + modalBayarPemain.sisa_belanja
                    return formatRupiah(totalSaran)
                  })()}
                </span>
              </div>
            </div>

            <div style={{ marginBottom:20 }}>
              <label style={lbl}>Total yang Dibayar Sekarang (Rp)</label>
              <input style={inp} type="number" min="0" value={modalBayarBiaya} onChange={e => setModalBayarBiaya(e.target.value)} autoFocus />
              <div style={{ fontSize:12, color:'#64748b', marginTop:6 }}>
                Sudah terisi otomatis dari saran di atas (bola + belanja) — boleh diubah kalau ada diskon atau kondisi khusus.
              </div>
            </div>

            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button style={btnS} onClick={() => setModalBayarPemain(null)} disabled={loading}>Batal</button>
              <button style={btnG} onClick={prosesBayarSatuPemain} disabled={loading}>
                {loading ? '⏳ Menyimpan...' : '💰 Konfirmasi Bayar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom:isMobile?16:24 }}>
        <div style={{ fontSize:isMobile?20:24, fontWeight:800, letterSpacing:-0.5, marginBottom:4 }}>🏸 Match Management</div>
        <div style={{ fontSize:13, color:'#94a3b8' }}>Kelola sesi main, match, dan biaya pemain</div>
      </div>

      {/* ============================================ */}
      {/* WAJAH A: BELUM ADA SESI AKTIF */}
      {/* ============================================ */}
      {!sesiAktif && (
        <div>
          <div style={{ display:'flex', gap:8, marginBottom:isMobile?16:24, overflowX:'auto', paddingBottom:4 }}>
            {[
              { id:'mulai', label: '▶️ Mulai Sesi' },
              { id:'history', label: '📋 History' },
            ].map(t => (
              <button key={t.id}
                style={{ padding: isMobile?'8px 14px':'8px 18px', borderRadius:8, fontSize: isMobile?13:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:'none', whiteSpace:'nowrap', flexShrink:0, background: tabKosong===t.id?'#2563eb':'#1e293b', color: tabKosong===t.id?'white':'#94a3b8' }}
                onClick={() => setTabKosong(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          {tabKosong === 'mulai' && (
            <div style={panel}>
              <div style={{ padding:'16px 20px', borderBottom:'1px solid #334155', fontWeight:700, fontSize:15 }}>▶️ Mulai Sesi Baru</div>
              <div style={{ padding:isMobile?16:20, display:'flex', flexDirection:'column', gap:16 }}>
                <div>
                  <label style={lbl}>Waktu</label>
                  <div style={{ display:'flex', gap:8 }}>
                    {[{v:'sore',l:'🌅 Sore'},{v:'malam',l:'🌙 Malam'}].map(w => (
                      <button key={w.v}
                        style={{ flex:1, padding:'10px', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:'none', background: formWaktu===w.v?'#7c3aed':'#334155', color:'white' }}
                        onClick={() => setFormWaktu(w.v)}>{w.l}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={lbl}>Shuttle yang Dipakai</label>
                  <select style={inp} value={formProdukShuttleId} onChange={e => setFormProdukShuttleId(e.target.value)}>
                    <option value="">-- Pilih shuttle --</option>
                    {daftarProdukShuttle.map(p => (
                      <option key={p.id} value={p.id}>{p.nama} — Stok: {p.stok_pcs} {p.satuan_kecil}</option>
                    ))}
                  </select>
                  {daftarProdukShuttle.length === 0 && (
                    <div style={{ marginTop:8, fontSize:12, color:'#f59e0b' }}>⚠️ Belum ada produk bertipe Shuttle. Tambahkan dulu di halaman Stok.</div>
                  )}
                </div>

                <div style={{ display:'flex', justifyContent:'flex-end' }}>
                  <button style={{ ...btnG, width: isMobile?'100%':'auto' }} onClick={mulaiSesi} disabled={loading}>
                    {loading ? '⏳ Memproses...' : '▶️ Mulai Sesi'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {tabKosong === 'history' && (
            <div style={panel}>
              <div style={{ padding:'16px 20px', borderBottom:'1px solid #334155', display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontWeight:700, fontSize:15 }}>Riwayat Sesi</span>
                <span style={{ fontSize:13, color:'#94a3b8' }}>{historySesi.length} sesi</span>
              </div>
              {historySesi.length === 0 ? (
                <div style={{ textAlign:'center', padding:48, color:'#94a3b8' }}>
                  <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
                  <p>Belum ada sesi yang selesai.</p>
                </div>
              ) : (
                <div>
                  {historySesi.map(s => {
                    const totalMatch = s.match?.length || 0
                    const totalBolaSesi = (s.match || []).reduce((sum, m) => sum + m.jumlah_bola_pcs, 0)
                    const biayaRows = s.sesi_pemain_biaya || []
                    const totalPemasukan = biayaRows.reduce((sum, b) => sum + (b.biaya || 0), 0)
                    const adaBelumBayar = biayaRows.some(b => b.status_bayar !== 'lunas')
                    return (
                      <div key={s.id} style={{ padding:'14px 20px', borderBottom:'1px solid rgba(51,65,85,0.5)' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8 }}>
                          <div>
                            <div style={{ fontWeight:700, fontSize:14 }}>{namaSesi(s)}</div>
                            <div style={{ fontSize:12, color:'#94a3b8', marginTop:4, fontFamily:'monospace' }}>
                              {biayaRows.length} pemain · {totalMatch} match · {totalBolaSesi} bola · {s.stok?.nama}
                            </div>
                          </div>
                          <div style={{ textAlign:'right' }}>
                            <div style={{ fontWeight:700, color:'#4ade80', fontFamily:'monospace' }}>{formatRupiah(totalPemasukan)}</div>
                            {adaBelumBayar && <span style={{ fontSize:11, color:'#f59e0b' }}>⚠️ ada yang belum bayar</span>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================ */}
      {/* WAJAH B: SESI AKTIF */}
      {/* ============================================ */}
      {sesiAktif && !modeAkhirSesi && (
        <div>
          {/* Info sesi berjalan */}
          <div style={{ ...panel, background:'#14241a', border:'1px solid #16a34a' }}>
            <div style={{ padding:isMobile?16:20, display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
              <div>
                <div style={{ fontSize:11, color:'#4ade80', fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>🟢 Sesi Berjalan</div>
                <div style={{ fontSize:isMobile?16:18, fontWeight:800 }}>{namaSesi(sesiAktif)}</div>
                <div style={{ fontSize:13, color:'#94a3b8', marginTop:4 }}>
                  Shuttle: <strong style={{color:'#f1f5f9'}}>{sesiAktif.stok?.nama}</strong> · Stok tersisa: <strong style={{color:'#f1f5f9'}}>{sesiAktif.stok?.stok_pcs} {sesiAktif.stok?.satuan_kecil}</strong>
                </div>
              </div>
              <button style={{ ...btnR, width: isMobile?'100%':'auto' }} onClick={bukaFormAkhirSesi}>
                🏁 Akhiri Sesi
              </button>
            </div>
          </div>

          {/* Tombol aksi cepat */}
          <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
            <button style={{ ...btnG, flex: isMobile?'1 1 100%':'none' }} onClick={() => { setShowFormMatch(!showFormMatch); setShowFormBelanja(false) }}>
              {showFormMatch ? '✕ Tutup Form' : '🏸 Tambah Match'}
            </button>
            <button style={{ ...btnS, flex: isMobile?'1 1 100%':'none' }} onClick={() => { setShowFormBelanja(!showFormBelanja); setShowFormMatch(false) }}>
              {showFormBelanja ? '✕ Tutup Form' : '🛒 Tambah Belanja'}
            </button>
          </div>

          {/* ── FORM: TAMBAH MATCH ── */}
          {showFormMatch && (
            <div style={panel}>
              <div style={{ padding:'16px 20px', borderBottom:'1px solid #334155', fontWeight:700, fontSize:15 }}>
                🏸 Match #{matchList.length > 0 ? Math.max(...matchList.map(m => m.nomor_match)) + 1 : 1}
              </div>
              <div style={{ padding:isMobile?16:20, display:'flex', flexDirection:'column', gap:16 }}>
                <div>
                  <label style={lbl}>Pemain ({matchPemainTerpilih.length}/4)</label>

                  {/* Chip pemain terpilih */}
                  {matchPemainTerpilih.length > 0 && (
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
                      {matchPemainTerpilih.map(p => (
                        <span key={p.id} style={{ background:'#2563eb', color:'white', padding:'5px 10px', borderRadius:20, fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
                          {p.nama}
                          <span style={{ cursor:'pointer', fontWeight:800 }} onClick={() => toggleChipPemainMatch(p)}>✕</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Search box */}
                  {matchPemainTerpilih.length < 4 && (
                    <>
                      <input
                        style={inp}
                        placeholder="🔍 Ketik nama pemain..."
                        value={cariPemainMatch}
                        onChange={e => setCariPemainMatch(e.target.value)}
                      />
                      {cariPemainMatch.trim() !== '' && (
                        <div style={{ marginTop:8, background:'#0f172a', border:'1px solid #334155', borderRadius:8, maxHeight:180, overflowY:'auto' }}>
                          {daftarPemain
                            .filter(p => !matchPemainTerpilih.some(x => x.id === p.id))
                            .filter(p => p.nama.toLowerCase().includes(cariPemainMatch.toLowerCase()))
                            .slice(0, 8)
                            .map(p => (
                              <div key={p.id}
                                style={{ padding:'10px 14px', cursor:'pointer', borderBottom:'1px solid rgba(51,65,85,0.5)', fontSize:14 }}
                                onClick={() => toggleChipPemainMatch(p)}>
                                {p.nama}
                              </div>
                            ))}
                          {daftarPemain.filter(p => p.nama.toLowerCase().includes(cariPemainMatch.toLowerCase())).length === 0 && (
                            <div style={{ padding:'10px 14px', fontSize:13, color:'#94a3b8' }}>Tidak ditemukan.</div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  <div style={{ marginTop:8 }}>
                    <span style={{ fontSize:12, color:'#4ade80', cursor:'pointer', fontWeight:600 }} onClick={() => setShowFormPemainBaru(!showFormPemainBaru)}>
                      {showFormPemainBaru ? '✕ Batal tambah pemain' : '➕ Pemain belum ada di daftar? Tambah baru'}
                    </span>
                  </div>

                  {/* Form inline: tambah pemain baru */}
                  {showFormPemainBaru && (
                    <div style={{ marginTop:10, background:'#0f172a', borderRadius:8, padding:14, display:'flex', flexDirection:'column', gap:10 }}>
                      <input style={inp} placeholder="Nama pemain" value={pemainBaruNama} onChange={e => setPemainBaruNama(e.target.value)} />
                      <input style={inp} placeholder="No. HP (opsional)" value={pemainBaruHp} onChange={e => setPemainBaruHp(e.target.value)} />
                      {pemainBaruNama.trim() !== '' && cariPemainMirip(pemainBaruNama, daftarPemain).length > 0 && (
                        <div style={{ background:'#422006', border:'1px solid #92400e', borderRadius:8, padding:10, fontSize:12 }}>
                          ⚠️ Sudah ada pemain bernama <strong>{cariPemainMirip(pemainBaruNama, daftarPemain).map(p => p.nama).join(', ')}</strong>.
                          Pastikan ini orang berbeda sebelum menyimpan.
                        </div>
                      )}
                      <button style={{ ...btnG, alignSelf:'flex-start' }} onClick={simpanPemainBaru} disabled={loading}>💾 Simpan Pemain</button>
                    </div>
                  )}
                </div>

                <div>
                  <label style={lbl}>Jumlah Bola (pcs)</label>
                  <input style={inp} type="number" min="1" placeholder="cth: 2" value={matchJumlahBola} onChange={e => setMatchJumlahBola(e.target.value)} />
                  {matchJumlahBola > 0 && matchPemainTerpilih.length > 0 && (
                    <div style={{ marginTop:6, fontSize:12, color:'#94a3b8', fontFamily:'monospace' }}>
                      Tiap pemain ({matchPemainTerpilih.length} orang) tercatat {matchJumlahBola} bola
                    </div>
                  )}
                </div>

                <div style={{ display:'flex', justifyContent:'flex-end' }}>
                  <button style={{ ...btnG, width: isMobile?'100%':'auto' }} onClick={simpanMatch} disabled={loading}>
                    {loading ? '⏳ Menyimpan...' : '💾 Simpan Match'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── FORM: TAMBAH BELANJA ── */}
          {showFormBelanja && (
            <div style={panel}>
              <div style={{ padding:'16px 20px', borderBottom:'1px solid #334155', fontWeight:700, fontSize:15 }}>🛒 Tambah Belanja Pemain</div>
              <div style={{ padding:isMobile?16:20, display:'flex', flexDirection:'column', gap:16 }}>
                <div>
                  <label style={lbl}>Pemain</label>
                  {!belanjaPemainId ? (
                    <>
                      <input style={inp} placeholder="🔍 Ketik nama pemain..." value={cariPemainBelanja} onChange={e => setCariPemainBelanja(e.target.value)} />
                      {cariPemainBelanja.trim() !== '' && (
                        <div style={{ marginTop:8, background:'#0f172a', border:'1px solid #334155', borderRadius:8, maxHeight:180, overflowY:'auto' }}>
                          {daftarPemain
                            .filter(p => p.nama.toLowerCase().includes(cariPemainBelanja.toLowerCase()))
                            .slice(0, 8)
                            .map(p => (
                              <div key={p.id}
                                style={{ padding:'10px 14px', cursor:'pointer', borderBottom:'1px solid rgba(51,65,85,0.5)', fontSize:14 }}
                                onClick={() => { setBelanjaPemainId(p.id); setCariPemainBelanja('') }}>
                                {p.nama}
                              </div>
                            ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <span style={{ background:'#2563eb', color:'white', padding:'6px 12px', borderRadius:20, fontSize:13, fontWeight:600, display:'inline-flex', alignItems:'center', gap:6 }}>
                      {daftarPemain.find(p => p.id === belanjaPemainId)?.nama}
                      <span style={{ cursor:'pointer', fontWeight:800 }} onClick={() => setBelanjaPemainId('')}>✕</span>
                    </span>
                  )}
                </div>

                <div>
                  <label style={lbl}>Produk</label>
                  <select style={inp} value={belanjaProdukId} onChange={e => setBelanjaProdukId(e.target.value)}>
                    <option value="">-- Pilih produk --</option>
                    {daftarProdukJual.map(p => (
                      <option key={p.id} value={p.id}>{p.nama} — {formatRupiah(p.harga_jual_pcs)}/{p.satuan_kecil}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={lbl}>Jumlah (pcs)</label>
                  <input style={inp} type="number" min="1" placeholder="cth: 2" value={belanjaJumlah} onChange={e => setBelanjaJumlah(e.target.value)} />
                </div>

                {belanjaProdukId && belanjaJumlah > 0 && (
                  <div style={{ background:'#0f172a', borderRadius:8, padding:14, fontSize:13, fontFamily:'monospace', display:'flex', justifyContent:'space-between' }}>
                    <span style={{ color:'#94a3b8' }}>Total:</span>
                    <span style={{ color:'#4ade80', fontWeight:700 }}>
                      {formatRupiah((parseInt(belanjaJumlah) || 0) * (daftarProdukJual.find(p => p.id === parseInt(belanjaProdukId))?.harga_jual_pcs || 0))}
                    </span>
                  </div>
                )}

                <div style={{ display:'flex', justifyContent:'flex-end' }}>
                  <button style={{ ...btnG, width: isMobile?'100%':'auto' }} onClick={simpanBelanja} disabled={loading}>
                    {loading ? '⏳ Menyimpan...' : '💾 Simpan Belanja'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── REKAP SEMENTARA PER PEMAIN ── */}
          <div style={panel}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid #334155', display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontWeight:700, fontSize:15 }}>📊 Rekap Sementara</span>
              <span style={{ fontSize:13, color:'#94a3b8' }}>{rekapPemain.length} pemain · {matchList.length} match</span>
            </div>
            <div style={{ padding:'10px 20px', fontSize:12, color:'#64748b', borderBottom:'1px solid rgba(51,65,85,0.5)' }}>
              💡 Klik "Bayar" untuk pemain yang mau bayar sekarang — sesi tetap berjalan untuk pemain lain.
            </div>
            {rekapPemain.length > 0 && (
              <div style={{ padding:'12px 20px', borderBottom:'1px solid rgba(51,65,85,0.5)' }}>
                <input style={inp} placeholder="🔍 Cari nama pemain..." value={cariRekap} onChange={e => setCariRekap(e.target.value)} />
              </div>
            )}

            {(() => {
              const rekapFiltered = rekapPemain.filter(r => r.nama.toLowerCase().includes(cariRekap.toLowerCase()))
              if (rekapPemain.length === 0) {
                return (
                  <div style={{ textAlign:'center', padding:48, color:'#94a3b8' }}>
                    <div style={{ fontSize:48, marginBottom:12 }}>🏸</div>
                    <p>Belum ada match atau belanja tercatat.</p>
                  </div>
                )
              }
              if (rekapFiltered.length === 0) {
                return (
                  <div style={{ textAlign:'center', padding:32, color:'#94a3b8', fontSize:13 }}>
                    Tidak ada pemain bernama "{cariRekap}".
                  </div>
                )
              }
              return isMobile ? (
                <div>
                  {rekapFiltered.map(r => {
                    const rincian = formatRincianBola(r.detail_match)
                    const saran = cariPaketHarga(daftarPaketHarga, r.sisa_bola_pcs)
                    const adaSisa = r.sisa_bola_pcs > 0 || r.sisa_belanja > 0
                    const terbuka = pemainRekapTerbuka === r.pemain_id
                    return (
                      <div key={r.pemain_id} style={{ borderBottom:'1px solid rgba(51,65,85,0.5)' }}>
                        <div
                          style={{ padding:'12px 16px', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}
                          onClick={() => setPemainRekapTerbuka(terbuka ? null : r.pemain_id)}
                        >
                          <div style={{ fontWeight:700, fontSize:14 }}>{r.nama}</div>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            {r.total_sudah_dibayar > 0 && (
                              <span style={{ background:'#14532d', color:'#4ade80', padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:700 }}>✅ Lunas</span>
                            )}
                            {adaSisa && (
                              <span style={{ fontFamily:'monospace', fontSize:12, color:'#f59e0b' }}>{r.sisa_bola_pcs} bola</span>
                            )}
                            <span style={{ color:'#64748b' }}>{terbuka ? '▲' : '▼'}</span>
                          </div>
                        </div>
                        {terbuka && (
                          <div style={{ padding:'0 16px 14px' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:4 }}>
                              <span style={{ color:'#94a3b8' }}>🏸 Sisa: <strong style={{color:'#f1f5f9'}}>{r.sisa_bola_pcs} bola</strong></span>
                              <span style={{ color:'#94a3b8' }}>🛒 {formatRupiah(r.sisa_belanja)}</span>
                            </div>
                            {rincian && (
                              <div style={{ fontSize:11, color:'#64748b', fontFamily:'monospace', marginBottom:4 }}>{rincian}</div>
                            )}
                            {saran && adaSisa && (
                              <div style={{ fontSize:11, color:'#4ade80', marginBottom:8 }}>💡 Saran: {saran.label} = {formatRupiah(saran.harga)}</div>
                            )}
                            {r.total_sudah_dibayar > 0 && (
                              <div style={{ fontSize:12, color:'#4ade80', marginBottom:8 }}>✅ Sudah dibayar: {formatRupiah(r.total_sudah_dibayar)}</div>
                            )}
                            <div style={{ display:'flex', gap:6, marginTop:8 }}>
                              <button style={{ ...btnS, flex:1, padding:'7px 10px', fontSize:12 }}
                                onClick={() => { setBelanjaPemainId(r.pemain_id); setShowFormBelanja(true); setShowFormMatch(false) }}>
                                🛒 Belanja
                              </button>
                              <button style={{ ...btnG, flex:1, padding:'7px 10px', fontSize:12, opacity: adaSisa?1:0.4 }}
                                onClick={() => adaSisa && bukaModalBayar(r)} disabled={!adaSisa}>
                                💰 Bayar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
                  <thead>
                    <tr>{['Pemain', 'Sisa Bola', 'Saran Harga', 'Sisa Belanja', 'Status', 'Aksi'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rekapFiltered.map(r => {
                      const rincian = formatRincianBola(r.detail_match)
                      const saran = cariPaketHarga(daftarPaketHarga, r.sisa_bola_pcs)
                      const adaSisa = r.sisa_bola_pcs > 0 || r.sisa_belanja > 0
                      return (
                        <tr key={r.pemain_id}>
                          <td style={td}><strong>{r.nama}</strong></td>
                          <td style={{ ...td, fontFamily:'monospace' }}>
                            {r.sisa_bola_pcs} pcs
                            {rincian && <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>{rincian}</div>}
                          </td>
                          <td style={{ ...td, fontFamily:'monospace', color: saran && adaSisa ? '#4ade80' : '#475569' }}>
                            {saran && adaSisa ? `${saran.label} = ${formatRupiah(saran.harga)}` : '–'}
                          </td>
                          <td style={{ ...td, fontFamily:'monospace', color:'#4ade80' }}>{formatRupiah(r.sisa_belanja)}</td>
                          <td style={td}>
                            {r.total_sudah_dibayar > 0 ? (
                              <span style={{ background:'#14532d', color:'#4ade80', padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700 }}>
                                ✅ Lunas {formatRupiah(r.total_sudah_dibayar)}
                              </span>
                            ) : (
                              <span style={{ color:'#475569', fontSize:12 }}>–</span>
                            )}
                          </td>
                        <td style={{ ...td, display:'flex', gap:6 }}>
                          <button style={{ ...btnS, padding:'6px 12px', fontSize:12 }}
                            onClick={() => { setBelanjaPemainId(r.pemain_id); setShowFormBelanja(true); setShowFormMatch(false) }}>
                            🛒 Belanja
                          </button>
                          <button style={{ ...btnG, padding:'6px 12px', fontSize:12, opacity: adaSisa?1:0.4 }}
                            onClick={() => adaSisa && bukaModalBayar(r)} disabled={!adaSisa}>
                            💰 Bayar
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              )
            })()}
          </div>

          {/* ── DAFTAR MATCH (akordeon, klik untuk lihat detail) ── */}
          {matchList.length > 0 && (
            <div style={panel}>
              <div style={{ padding:'16px 20px', borderBottom:'1px solid #334155' }}>
                <span style={{ fontWeight:700, fontSize:15 }}>📋 Daftar Match</span>
              </div>
              <div>
                {matchList.map(m => {
                  const terbuka = matchTerbuka === m.nomor_match
                  const namaPemainMatch = (m.match_pemain || []).map(mp => {
                    const p = daftarPemain.find(p => p.id === mp.pemain_id)
                    return p ? p.nama : '(tidak diketahui)'
                  })
                  const pemainIds = (m.match_pemain || []).map(mp => mp.pemain_id)
                  const terkunci = itemTerkunci(m.created_at, pemainIds)
                  const sedangEdit = matchEditId === m.id
                  return (
                    <div key={m.id} style={{ borderBottom:'1px solid rgba(51,65,85,0.5)' }}>
                      <div
                        style={{ padding:'12px 20px', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}
                        onClick={() => setMatchTerbuka(terbuka ? null : m.nomor_match)}
                      >
                        <span style={{ fontWeight:600, fontSize:14 }}>🏸 Match #{m.nomor_match}</span>
                        <span style={{ fontSize:13, color:'#94a3b8', fontFamily:'monospace' }}>
                          {terkunci && <span style={{ color:'#f59e0b', marginRight:8 }}>🔒</span>}
                          {m.jumlah_bola_pcs} bola · {namaPemainMatch.length} pemain {terbuka ? '▲' : '▼'}
                        </span>
                      </div>
                      {terbuka && (
                        <div style={{ padding:'0 20px 14px' }}>
                          <div style={{ fontSize:12, color:'#64748b', marginBottom:8 }}>
                            Tiap pemain di match ini tercatat memakai {m.jumlah_bola_pcs} bola (penuh, tidak dibagi):
                          </div>
                          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
                            {namaPemainMatch.map((nama, i) => (
                              <span key={i} style={{ background:'#0f172a', padding:'4px 10px', borderRadius:20, fontSize:12, color:'#94a3b8' }}>
                                {nama} <span style={{ color:'#4ade80' }}>({m.jumlah_bola_pcs})</span>
                              </span>
                            ))}
                          </div>

                          {terkunci ? (
                            <div style={{ fontSize:12, color:'#f59e0b' }}>🔒 Sudah dihitung dalam pembayaran Lunas — tidak bisa diedit/dihapus.</div>
                          ) : sedangEdit ? (
                            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                              <input style={{ ...inp, maxWidth:120 }} type="number" min="1" value={matchEditBola} onChange={e => setMatchEditBola(e.target.value)} autoFocus />
                              <button style={{ ...btnG, padding:'6px 12px', fontSize:12 }} onClick={() => simpanEditMatch(m, matchEditBola)}>💾</button>
                              <button style={{ ...btnS, padding:'6px 12px', fontSize:12 }} onClick={() => setMatchEditId(null)}>✕</button>
                            </div>
                          ) : (
                            <div style={{ display:'flex', gap:8 }}>
                              <button style={{ ...btnS, padding:'6px 12px', fontSize:12 }}
                                onClick={() => { setMatchEditId(m.id); setMatchEditBola(String(m.jumlah_bola_pcs)) }}>
                                ✏️ Edit Bola
                              </button>
                              <button style={{ ...btnR, padding:'6px 12px', fontSize:12 }} onClick={() => hapusMatch(m)}>
                                🗑️ Hapus
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── DAFTAR BELANJA (edit/hapus per item) ── */}
          {belanjaList.length > 0 && (
            <div style={panel}>
              <div style={{ padding:'16px 20px', borderBottom:'1px solid #334155' }}>
                <span style={{ fontWeight:700, fontSize:15 }}>🛒 Daftar Belanja</span>
              </div>
              <div>
                {belanjaList.map(b => {
                  const namaPemainBelanja = daftarPemain.find(p => p.id === b.pemain_id)?.nama || '(tidak diketahui)'
                  const terkunci = itemTerkunci(b.created_at, [b.pemain_id])
                  const sedangEdit = belanjaEditId === b.id
                  return (
                    <div key={b.id} style={{ padding:'10px 20px', borderBottom:'1px solid rgba(51,65,85,0.5)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
                      <div style={{ fontSize:13 }}>
                        <strong>{namaPemainBelanja}</strong>
                        <span style={{ color:'#94a3b8' }}> — {b.stok?.nama || 'produk'} </span>
                        {sedangEdit ? (
                          <input style={{ ...inp, width:80, display:'inline-block', padding:'4px 8px' }} type="number" min="1"
                            value={belanjaEditJumlah} onChange={e => setBelanjaEditJumlah(e.target.value)} autoFocus />
                        ) : (
                          <span style={{ fontFamily:'monospace' }}>{b.jumlah_pcs} {b.stok?.satuan_kecil}</span>
                        )}
                        <span style={{ color:'#4ade80', fontFamily:'monospace', marginLeft:8 }}>{formatRupiah(b.total)}</span>
                        {terkunci && <span style={{ color:'#f59e0b', marginLeft:8 }}>🔒</span>}
                      </div>
                      {!terkunci && (
                        <div style={{ display:'flex', gap:6 }}>
                          {sedangEdit ? (
                            <>
                              <button style={{ ...btnG, padding:'5px 10px', fontSize:12 }} onClick={() => simpanEditBelanja(b, belanjaEditJumlah)}>💾</button>
                              <button style={{ ...btnS, padding:'5px 10px', fontSize:12 }} onClick={() => setBelanjaEditId(null)}>✕</button>
                            </>
                          ) : (
                            <>
                              <button style={{ ...btnS, padding:'5px 10px', fontSize:12 }}
                                onClick={() => { setBelanjaEditId(b.id); setBelanjaEditJumlah(String(b.jumlah_pcs)) }}>
                                ✏️
                              </button>
                              <button style={{ ...btnR, padding:'5px 10px', fontSize:12 }} onClick={() => hapusBelanja(b)}>🗑️</button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================ */}
      {/* WAJAH C: MODE AKHIR SESI */}
      {/* ============================================ */}
      {sesiAktif && modeAkhirSesi && tahapAkhirSesi === 'konfirmasi' && (() => {
        const totalBolaSesi = matchList.reduce((s, m) => s + m.jumlah_bola_pcs, 0)
        const totalBelanjaSesi = belanjaList.reduce((s, b) => s + b.total, 0)
        const totalSudahMasukKas = biayaList.filter(b => b.status_bayar === 'lunas' || true).reduce((s, b) => s + b.biaya, 0)
        const pemainBelumBayar = rekapPemain.filter(r => r.sisa_bola_pcs > 0 || r.sisa_belanja > 0)
        const produkTerjual = {} // { nama_produk: { jumlah, total } }
        belanjaList.forEach(b => {
          const nama = b.stok?.nama || 'Produk'
          if (!produkTerjual[nama]) produkTerjual[nama] = { jumlah: 0, total: 0, satuan: b.stok?.satuan_kecil || 'pcs' }
          produkTerjual[nama].jumlah += b.jumlah_pcs
          produkTerjual[nama].total += b.total
        })

        return (
          <div>
            <div style={panel}>
              <div style={{ padding:'16px 20px', borderBottom:'1px solid #334155' }}>
                <div style={{ fontWeight:700, fontSize:15 }}>🏁 Konfirmasi Akhiri Sesi — {namaSesi(sesiAktif)}</div>
                <div style={{ fontSize:12, color:'#94a3b8', marginTop:4 }}>Tinjau ringkasan sesi sebelum lanjut ke detail pembayaran.</div>
              </div>

              <div style={{ padding:isMobile?16:20, display:'grid', gridTemplateColumns: isMobile?'1fr 1fr':'repeat(3, 1fr)', gap:12 }}>
                <div style={{ background:'#0f172a', borderRadius:8, padding:14 }}>
                  <div style={{ fontSize:11, color:'#94a3b8', marginBottom:4 }}>🏸 Total Bola Terpakai</div>
                  <div style={{ fontSize:18, fontWeight:800, fontFamily:'monospace' }}>{totalBolaSesi}</div>
                </div>
                <div style={{ background:'#0f172a', borderRadius:8, padding:14 }}>
                  <div style={{ fontSize:11, color:'#94a3b8', marginBottom:4 }}>🛒 Total Belanja</div>
                  <div style={{ fontSize:18, fontWeight:800, fontFamily:'monospace', color:'#4ade80' }}>{formatRupiah(totalBelanjaSesi)}</div>
                </div>
                <div style={{ background:'#0f172a', borderRadius:8, padding:14, gridColumn: isMobile?'span 2':'auto' }}>
                  <div style={{ fontSize:11, color:'#94a3b8', marginBottom:4 }}>💰 Sudah Masuk Kas (Bayar Sebagian)</div>
                  <div style={{ fontSize:18, fontWeight:800, fontFamily:'monospace', color:'#4ade80' }}>{formatRupiah(totalSudahMasukKas)}</div>
                </div>
              </div>

              {Object.keys(produkTerjual).length > 0 && (
                <div style={{ padding:isMobile?'0 16px 16px':'0 20px 20px' }}>
                  <div style={{ fontSize:13, fontWeight:700, marginBottom:8 }}>🛒 Produk Terjual</div>
                  <div style={{ background:'#0f172a', borderRadius:8, overflow:'hidden' }}>
                    {Object.entries(produkTerjual).map(([nama, d]) => (
                      <div key={nama} style={{ padding:'8px 14px', borderBottom:'1px solid rgba(51,65,85,0.5)', display:'flex', justifyContent:'space-between', fontSize:13 }}>
                        <span>{nama} ({d.jumlah} {d.satuan})</span>
                        <span style={{ fontFamily:'monospace', color:'#4ade80' }}>{formatRupiah(d.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ padding:isMobile?'0 16px 16px':'0 20px 20px' }}>
                <div style={{ fontSize:13, fontWeight:700, marginBottom:8 }}>
                  {pemainBelumBayar.length > 0 ? `⏳ Pemain Belum Bayar (${pemainBelumBayar.length})` : '✅ Semua Pemain Sudah Lunas'}
                </div>
                {pemainBelumBayar.length > 0 && (
                  <div style={{ background:'#0f172a', borderRadius:8, overflow:'hidden' }}>
                    {pemainBelumBayar.map(r => (
                      <div key={r.pemain_id} style={{ padding:'8px 14px', borderBottom:'1px solid rgba(51,65,85,0.5)', display:'flex', justifyContent:'space-between', fontSize:13 }}>
                        <span>{r.nama}</span>
                        <span style={{ fontFamily:'monospace', color:'#f59e0b' }}>{r.sisa_bola_pcs} bola{r.sisa_belanja > 0 ? ` + ${formatRupiah(r.sisa_belanja)}` : ''}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ padding:isMobile?16:20, display:'flex', gap:10, justifyContent:'flex-end', borderTop:'1px solid #334155' }}>
                <button style={btnS} onClick={() => setModeAkhirSesi(false)}>← Batal</button>
                <button style={{ ...btnG, flex: isMobile?1:'none' }} onClick={() => setTahapAkhirSesi('detail')}>
                  Lanjut Isi Detail →
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {sesiAktif && modeAkhirSesi && tahapAkhirSesi === 'detail' && (
        <div>
          <div style={panel}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid #334155' }}>
              <div style={{ fontWeight:700, fontSize:15 }}>🏁 Akhiri Sesi — {namaSesi(sesiAktif)}</div>
              <div style={{ fontSize:12, color:'#94a3b8', marginTop:4 }}>Isi biaya final per pemain. Referensi paket harga ditampilkan sebagai panduan — boleh diubah manual.</div>
              {rekapPemain.length > rekapBelumLunas.length && (
                <div style={{ fontSize:12, color:'#4ade80', marginTop:8 }}>
                  ✅ {rekapPemain.length - rekapBelumLunas.length} pemain sudah lunas (dibayar di tengah sesi), tidak perlu diisi ulang.
                </div>
              )}
            </div>

            <div>
              {rekapBelumLunas.length === 0 && (
                <div style={{ textAlign:'center', padding:32, color:'#94a3b8' }}>
                  <div style={{ fontSize:36, marginBottom:8 }}>✅</div>
                  <p>Semua pemain sudah dibayar lunas selama sesi berjalan. Tinggal klik Submit untuk menutup sesi ini.</p>
                </div>
              )}
              {rekapBelumLunas.map(r => {
                const f = formBiayaFinal[r.pemain_id] || { biaya:'', status:'belum' }
                const paketSaran = cariPaketHarga(daftarPaketHarga, r.sisa_bola_pcs)
                return (
                  <div key={r.pemain_id} style={{ padding:isMobile?16:20, borderBottom:'1px solid rgba(51,65,85,0.5)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12, flexWrap:'wrap', gap:8 }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:15 }}>{r.nama}</div>
                        <div style={{ fontSize:12, color:'#94a3b8', marginTop:2, fontFamily:'monospace' }}>
                          🏸 {r.sisa_bola_pcs} bola
                          {r.sisa_belanja > 0 && <> · 🛒 {formatRupiah(r.sisa_belanja)}</>}
                        </div>
                      </div>
                      {paketSaran && (
                        <div style={{ fontSize:12, color:'#4ade80', background:'#0f172a', padding:'4px 10px', borderRadius:6 }}>
                          💡 Saran: {paketSaran.label} = {formatRupiah(paketSaran.harga)}
                        </div>
                      )}
                    </div>

                    <div style={{ display:'grid', gridTemplateColumns: isMobile?'1fr':'1fr 1fr', gap:12 }}>
                      <div>
                        <label style={{ ...lbl, fontSize:12 }}>Biaya Bola (Rp)</label>
                        <input
                          style={inp} type="number" min="0"
                          value={f.biaya}
                          onChange={e => updateBiayaFinal(r.pemain_id, 'biaya', e.target.value)}
                        />
                      </div>
                      <div>
                        <label style={{ ...lbl, fontSize:12 }}>Status Bayar</label>
                        <div style={{ display:'flex', gap:8 }}>
                          {[{v:'lunas',l:'✅ Lunas'},{v:'belum',l:'⏳ Belum Bayar'}].map(s => (
                            <button key={s.v}
                              style={{ flex:1, padding:'9px', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:'none', background: f.status===s.v ? (s.v==='lunas'?'#16a34a':'#f59e0b') : '#334155', color:'white' }}
                              onClick={() => updateBiayaFinal(r.pemain_id, 'status', s.v)}>
                              {s.l}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Ringkasan total sebelum submit */}
            <div style={{ padding:isMobile?16:20, background:'#0f172a' }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:14, marginBottom:8 }}>
                <span style={{ color:'#94a3b8' }}>Total akan masuk Kas (Lunas):</span>
                <span style={{ color:'#4ade80', fontWeight:700, fontFamily:'monospace' }}>
                  {formatRupiah(rekapBelumLunas.reduce((s, r) => {
                    const f = formBiayaFinal[r.pemain_id]
                    return f?.status === 'lunas' ? s + (parseInt(f.biaya) || 0) : s
                  }, 0))}
                </span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:14 }}>
                <span style={{ color:'#94a3b8' }}>Total akan masuk Hutang (Belum Bayar):</span>
                <span style={{ color:'#f59e0b', fontWeight:700, fontFamily:'monospace' }}>
                  {formatRupiah(rekapBelumLunas.reduce((s, r) => {
                    const f = formBiayaFinal[r.pemain_id]
                    return f?.status !== 'lunas' ? s + (parseInt(f?.biaya) || 0) : s
                  }, 0))}
                </span>
              </div>
            </div>

            <div style={{ padding:isMobile?16:20, display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button style={btnS} onClick={() => setTahapAkhirSesi('konfirmasi')} disabled={loading}>← Kembali</button>
              <button style={{ ...btnG, flex: isMobile?1:'none' }} onClick={submitAkhirSesi} disabled={loading}>
                {loading ? '⏳ Menyimpan...' : '✅ Submit & Selesaikan Sesi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}