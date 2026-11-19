import { supabase } from '../lib/supabase'

/** Servicio de datos del módulo IoT: lecturas, umbrales, alertas y tiempo real. */

export async function ultimasLecturas(contenedorId, limite = 60) {
  const { data, error } = await supabase
    .from('lecturas')
    .select('id, temperatura, humedad, ph, conductividad, registrado_en')
    .eq('contenedor_id', contenedorId)
    .order('registrado_en', { ascending: false })
    .limit(limite)
  if (error) throw error
  return data.reverse() // orden cronológico para la gráfica
}

export async function enviarLectura(contenedorId, lectura) {
  const { error } = await supabase.from('lecturas').insert({ contenedor_id: contenedorId, ...lectura })
  if (error) throw error
}

export async function obtenerUmbrales(contenedorId) {
  const { data, error } = await supabase.from('umbrales').select('*').eq('contenedor_id', contenedorId).single()
  if (error) throw error
  return data
}

export async function guardarUmbrales(contenedorId, valores) {
  const { data, error } = await supabase.from('umbrales').update(valores).eq('contenedor_id', contenedorId).select('contenedor_id')
  if (error) throw error
  if (!data.length) throw new Error('Tu rol no tiene permiso para cambiar umbrales')
}

export async function listarAlertas(contenedorId, { nivel = '', limite = 50 } = {}) {
  let consulta = supabase
    .from('alertas')
    .select('id, sensor, valor, nivel, mensaje, creado_en')
    .eq('contenedor_id', contenedorId)
    .order('creado_en', { ascending: false })
    .limit(limite)
  if (nivel) consulta = consulta.eq('nivel', nivel)
  const { data, error } = await consulta
  if (error) throw error
  return data
}

/**
 * Se suscribe a lecturas y alertas nuevas de un contenedor (Supabase Realtime).
 * Devuelve una función para cancelar la suscripción.
 */
export function suscribirTelemetria(contenedorId, { alLeer, alAlertar }) {
  const filtro = `contenedor_id=eq.${contenedorId}`
  const canal = supabase
    .channel(`telemetria-${contenedorId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'lecturas', filter: filtro }, (p) => alLeer?.(p.new))
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alertas', filter: filtro }, (p) => alAlertar?.(p.new))
    .subscribe()
  return () => supabase.removeChannel(canal)
}
