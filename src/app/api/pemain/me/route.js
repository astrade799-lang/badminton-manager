import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
    const { token } = await request.json()
    if (!token) {
      return Response.json({ error: 'Token wajib disertakan' }, { status: 400 })
    }

    const { data: sesi, error: errSesi } = await supabase
      .from('sesi_pemain')
      .select('pemain_id, expired_at, pemain(id, nama, no_hp, pin_sudah_diganti)')
      .eq('token', token)
      .maybeSingle()

    if (errSesi || !sesi) {
      return Response.json({ error: 'Sesi tidak valid' }, { status: 401 })
    }

    if (new Date(sesi.expired_at) < new Date()) {
      // Token sudah lewat masa berlaku — bersihkan baris sesi ini sekalian
      await supabase.from('sesi_pemain').delete().eq('token', token)
      return Response.json({ error: 'Sesi sudah berakhir, silakan login ulang' }, { status: 401 })
    }

    return Response.json({
      pemain_id: sesi.pemain.id,
      nama: sesi.pemain.nama,
      no_hp: sesi.pemain.no_hp,
      wajib_ganti_pin: !sesi.pemain.pin_sudah_diganti,
    })
  } catch (err) {
    return Response.json({ error: 'Permintaan tidak valid' }, { status: 400 })
  }
}