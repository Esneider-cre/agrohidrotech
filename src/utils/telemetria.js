/**
 * Utilidades de telemetría: definición de sensores, evaluación contra umbrales
 * y generación de lecturas simuladas (emula al ESP32 instalado en el contenedor).
 */

export const SENSORES = [
  { clave: 'temperatura', nombre: 'Temperatura', unidad: '°C', min: 'temp_min', max: 'temp_max', color: '#D97706', icono: 'temp' },
  { clave: 'humedad', nombre: 'Humedad relativa', unidad: '%', min: 'hum_min', max: 'hum_max', color: '#1E7FCB', icono: 'drop' },
  { clave: 'ph', nombre: 'pH solución', unidad: '', min: 'ph_min', max: 'ph_max', color: '#1F7A4D', icono: 'flask' },
  { clave: 'conductividad', nombre: 'Conductividad', unidad: 'mS/cm', min: 'ce_min', max: 'ce_max', color: '#7C3AED', icono: 'zap' },
]

/**
 * Clasifica un valor respecto a su rango óptimo.
 * - 'ok'          dentro del rango
 * - 'cerca'       dentro, pero en el 10 % más cercano a un límite
 * - 'advertencia' fuera del rango por menos del 10 % del ancho
 * - 'critica'     fuera por más del 10 % (misma regla que el trigger SQL)
 */
export function evaluarValor(valor, minimo, maximo) {
  const margen = (maximo - minimo) * 0.1
  if (valor < minimo - margen || valor > maximo + margen) return 'critica'
  if (valor < minimo || valor > maximo) return 'advertencia'
  if (valor < minimo + margen || valor > maximo - margen) return 'cerca'
  return 'ok'
}

export const ESTILO_ESTADO = {
  ok: { clase: 'ok', texto: 'Óptimo' },
  cerca: { clase: 'wr', texto: 'Cerca del límite' },
  advertencia: { clase: 'wr', texto: 'Fuera de rango' },
  critica: { clase: 'cr', texto: 'Crítico' },
}

const limitar = (v, a, b) => Math.min(b, Math.max(a, v))
const redondear = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d

/**
 * Genera la siguiente lectura a partir de la anterior con una caminata aleatoria
 * suave (como varían las variables reales). `azar` permite inyectar un generador
 * determinista en las pruebas.
 */
export function siguienteLectura(anterior, azar = Math.random) {
  const base = anterior ?? { temperatura: 24, humedad: 80, ph: 6, conductividad: 1.7 }
  const paso = (rango) => (azar() - 0.5) * rango
  return {
    temperatura: redondear(limitar(base.temperatura + paso(1.6), 15, 36)),
    humedad: redondear(limitar(base.humedad + paso(4), 50, 99)),
    ph: redondear(limitar(base.ph + paso(0.2), 4.5, 7.5)),
    conductividad: redondear(limitar(base.conductividad + paso(0.16), 0.6, 3)),
  }
}

/** Resume una lista de cosechas para el panel de reportes. */
export function resumenProduccion(cosechas) {
  const cerradas = cosechas.filter((c) => c.estado !== 'crecimiento')
  const cosechadas = cosechas.filter((c) => c.estado === 'cosechado')
  const totalKg = cosechadas.reduce((s, c) => s + Number(c.produccion_kg ?? 0), 0)
  const totalBandejas = cosechadas.reduce((s, c) => s + c.bandejas, 0)
  const perdidas = cosechas.filter((c) => c.estado === 'perdido').length
  return {
    totalKg: redondear(totalKg, 1),
    rendimiento: totalBandejas ? redondear(totalKg / totalBandejas, 1) : 0,
    lotesCosechados: cosechadas.length,
    enCrecimiento: cosechas.length - cerradas.length,
    tasaPerdida: cerradas.length ? Math.round((perdidas / cerradas.length) * 100) : 0,
  }
}
