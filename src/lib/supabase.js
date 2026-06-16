import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// Fungsi login
export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email, password,
  })
  return { data, error }
}

// Fungsi logout
export async function logout() {
  await supabase.auth.signOut()
}

// Ambil user yang sedang login
export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Ambil profile + role user
export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return { data, error }
}