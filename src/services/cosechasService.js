import { supabase } from '../lib/supabase'

/**
 * Servicio de datos del módulo CRUD de cosechas.
 * Cada función devuelve los datos o lanza un Error con un mensaje legible.
 */

const CAMPOS = 'id, lote, cultivo, estado, fecha_siembra, fecha_cosecha, bandejas, produccion_kg, observaciones, contenedor_id, contenedores(codigo, nombre)'

// Traduce los errores de Postgres más comunes a mensajes para el usuario
function traducirError(error) {
  if (error.code === '23505') return new Error('Ya existe una cosecha con ese código de lote')
  if (error.code === '23514') return new Error('Los datos no cumplen las reglas de validación')
  if (error.code === '42501') return new Error('Tu rol no tiene permiso para esta acción')
  return new Error(error.message)
}

/** Consultar: lista con filtros opcionales (texto, estado, cultivo). */
export async function listarCosechas({ texto = '', estado = '', cultivo = '' } = {}) {
  let consulta = supabase.from('cosechas').select(CAMPOS).order('fecha_siembra', { ascending: false })
  if (estado) consulta = consulta.eq('estado', estado)
  if (cultivo) consulta = consulta.eq('cultivo', cultivo)
  if (texto.trim()) consulta = consulta.ilike('lote', `%${texto.trim()}%`)
  const { data, error } = await consulta
  if (error) throw traducirError(error)
  return data
}

export async function obtenerCosecha(id) {
  const { data, error } = await supabase.from('cosechas').select(CAMPOS).eq('id', id).single()
  if (error) throw traducirError(error)
  return data
}

/** Crear */
export async function crearCosecha(registro) {
  const { data, error } = await supabase.from('cosechas').insert(registro).select('id').single()
  if (error) throw traducirError(error)
  return data
}

/** Actualizar */
export async function actualizarCosecha(id, registro) {
  const { data, error } = await supabase.from('cosechas').update(registro).eq('id', id).select('id')
  if (error) throw traducirError(error)
  if (!data.length) throw new Error('No se pudo actualizar (¿permisos?)')
}

/** Eliminar */
export async function eliminarCosecha(id) {
  const { data, error } = await supabase.from('cosechas').delete().eq('id', id).select('id')
  if (error) throw traducirError(error)
  if (!data.length) throw new Error('No se pudo eliminar (¿permisos?)')
}

export async function listarContenedores() {
  const { data, error } = await supabase.from('contenedores').select('id, codigo, nombre').order('codigo')
  if (error) throw traducirError(error)
  return data
}
