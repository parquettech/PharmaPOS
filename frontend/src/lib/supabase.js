import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Only create client if we have valid credentials
// If not configured, supabase will be null and app will work in demo mode
export const supabase = supabaseUrl && supabaseAnonKey && supabaseUrl.trim() !== '' && supabaseAnonKey.trim() !== ''
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null
