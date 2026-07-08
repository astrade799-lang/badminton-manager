import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { token } = await request.json()
    if (!token) {
      return Response.json({ error: 'Token wajib disertakan' }, { status: 400 })
    }

    await supabase.from('sesi_pemain').delete().eq('token', token)

    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: 'Permintaan tidak valid' }, { status: 400 })
  }
}