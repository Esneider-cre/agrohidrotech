import { createClient } from '@supabase/supabase-js'

// Credenciales públicas del proyecto (archivo .env). La anon key es segura en el
// navegador porque el acceso real lo controlan las políticas RLS de la base de datos.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigurado = Boolean(url && anonKey && !url.includes('TU-PROYECTO'))

export const supabase = supabaseConfigurado ? createClient(url, anonKey) : null
