import { createClient } from '@supabase/supabase-js'

// Service role key — HANYA dipakai di server (API Route ini), bypass RLS.
// Validasi token tetap dilakukan manual di bawah, jadi tetap aman meski bypass RLS.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { token } = await request.json()
    if (!token) {
      return Response.json({ error: 'Token wajib disertakan' }, { status: 400 })
    }

    // 1. Validasi token dulu — sama seperti /api/pemain/me, supaya tidak ada yang bisa
    // memanggil endpoint ini tanpa sesi yang valid (bypass RLS HARUS tetap dijaga manual di sini).
    const { data: sesi, error: errSesi } = await supabaseAdmin
      .from('sesi_pemain')
      .select('pemain_id, expired_at')
      .eq('token', token)
      .maybeSingle()

    if (errSesi || !sesi) {
      return Response.json({ error: 'Sesi tidak valid' }, { status: 401 })
    }
    if (new Date(sesi.expired_at) < new Date()) {
      return Response.json({ error: 'Sesi sudah berakhir, silakan login ulang' }, { status: 401 })
    }

    const pemainId = sesi.pemain_id

    // 2. Ambil semua data yang dibutuhkan Beranda Pemain dalam satu panggilan paralel
    const [resMatchPemain, resHutang, resBelanja, resInfo] = await Promise.all([
      supabaseAdmin
        .from('match_pemain')
        .select('match:match_id(id, nomor_match, jumlah_bola_pcs, created_at, sesi_main:sesi_main_id(id, tanggal, waktu, status), match_pemain(pemain:pemain_id(nama)))')
        .eq('pemain_id', pemainId),
      supabaseAdmin
        .from('hutang')
        .select('*')
        .eq('pemain_id', pemainId)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('sesi_belanja')
        .select('*, stok:produk_id(nama, satuan_kecil), biaya_terkait:sesi_pemain_biaya_id(status_bayar)')
        .eq('pemain_id', pemainId)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('info_admin')
        .select('*')
        .eq('aktif', true)
        .order('urutan'),
    ])

    if (resMatchPemain.error) throw resMatchPemain.error
    if (resHutang.error) throw resHutang.error
    if (resBelanja.error) throw resBelanja.error
    if (resInfo.error) throw resInfo.error

    const semuaMatch = resMatchPemain.data.map(r => r.match).filter(Boolean)
    const matchAktif = semuaMatch.filter(m => m.sesi_main?.status === 'aktif')

    // 3. Kalau ada sesi aktif yang diikuti, ambil juga riwayat sesi_pemain_biaya untuk sesi itu
    let biayaSesiIni = []
    if (matchAktif.length > 0) {
      const sesiMainId = matchAktif[0].sesi_main.id
      const { data: biayaRows, error: errBiaya } = await supabaseAdmin
        .from('sesi_pemain_biaya')
        .select('*')
        .eq('sesi_main_id', sesiMainId)
        .eq('pemain_id', pemainId)
      if (errBiaya) throw errBiaya
      biayaSesiIni = biayaRows || []
    }

    return Response.json({
      semuaMatch,
      matchAktif,
      biayaSesiIni,
      hutang: resHutang.data || [],
      belanja: resBelanja.data || [],
      infoAdmin: resInfo.data || [],
    })
  } catch (err) {
    return Response.json({ error: 'Gagal memuat data: ' + err.message }, { status: 500 })
  }
}