/** Helpers de presentación compartidos por las páginas. */

export const CULTIVOS = { maiz: 'Maíz', sorgo: 'Sorgo' }

export const formatearFecha = (iso) =>
  iso ? new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export const formatearHora = (iso) =>
  new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })

/** Días transcurridos desde una fecha AAAA-MM-DD hasta hoy. */
export const diasDesde = (fecha) =>
  Math.max(0, Math.round((Date.now() - new Date(`${fecha}T00:00:00`).getTime()) / 86400000))
