/**
 * Validaciones del formulario de cosechas.
 * Son las mismas reglas que imponen los CHECK de la base de datos, aplicadas
 * antes de enviar para dar mensajes claros al usuario.
 *
 * @param {object} datos  valores del formulario (strings, tal como vienen de los inputs)
 * @returns {Record<string,string>} objeto campo → mensaje de error (vacío si todo es válido)
 */
export function validarCosecha(datos) {
  const errores = {}
  const lote = (datos.lote ?? '').trim().toUpperCase()

  if (!lote) errores.lote = 'El código de lote es obligatorio'
  else if (!/^L-\d{3,6}$/.test(lote)) errores.lote = 'Formato esperado: L-2612'

  if (!datos.contenedor_id) errores.contenedor_id = 'Selecciona un contenedor'
  if (!['maiz', 'sorgo'].includes(datos.cultivo)) errores.cultivo = 'Selecciona un cultivo'
  if (!['crecimiento', 'cosechado', 'perdido'].includes(datos.estado)) errores.estado = 'Selecciona un estado'

  if (!datos.fecha_siembra) errores.fecha_siembra = 'La fecha de siembra es obligatoria'
  if (datos.fecha_cosecha && datos.fecha_siembra && datos.fecha_cosecha < datos.fecha_siembra) {
    errores.fecha_cosecha = 'La cosecha no puede ser anterior a la siembra'
  }

  const bandejas = Number(datos.bandejas)
  if (datos.bandejas === '' || datos.bandejas == null) errores.bandejas = 'Indica el número de bandejas'
  else if (!Number.isInteger(bandejas) || bandejas < 1 || bandejas > 200) errores.bandejas = 'Debe ser un entero entre 1 y 200'

  const tieneProduccion = datos.produccion_kg !== '' && datos.produccion_kg != null
  if (tieneProduccion && (Number.isNaN(Number(datos.produccion_kg)) || Number(datos.produccion_kg) < 0)) {
    errores.produccion_kg = 'La producción debe ser un número positivo'
  }

  if (datos.estado === 'cosechado') {
    if (!datos.fecha_cosecha) errores.fecha_cosecha ??= 'Requerida cuando el lote está cosechado'
    if (!tieneProduccion) errores.produccion_kg ??= 'Requerida cuando el lote está cosechado'
  }

  if ((datos.observaciones ?? '').length > 500) errores.observaciones = 'Máximo 500 caracteres'

  return errores
}

/** Convierte los valores del formulario al formato de la tabla `cosechas`. */
export function aRegistroCosecha(datos) {
  return {
    lote: datos.lote.trim().toUpperCase(),
    contenedor_id: Number(datos.contenedor_id),
    cultivo: datos.cultivo,
    estado: datos.estado,
    fecha_siembra: datos.fecha_siembra,
    fecha_cosecha: datos.fecha_cosecha || null,
    bandejas: Number(datos.bandejas),
    produccion_kg: datos.produccion_kg === '' || datos.produccion_kg == null ? null : Number(datos.produccion_kg),
    observaciones: datos.observaciones?.trim() || null,
  }
}
