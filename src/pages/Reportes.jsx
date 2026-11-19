import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { listarCosechas } from '../services/cosechasService'
import { resumenProduccion } from '../utils/telemetria'
import { CULTIVOS } from '../utils/formato'
import Icon from '../components/Icon'

/** Descarga la lista de cosechas como CSV (se abre en Excel). */
function exportarCsv(cosechas) {
  const filas = [
    ['Lote', 'Cultivo', 'Contenedor', 'Siembra', 'Cosecha', 'Bandejas', 'Produccion_kg', 'Estado'],
    ...cosechas.map((c) => [c.lote, CULTIVOS[c.cultivo], c.contenedores?.codigo, c.fecha_siembra, c.fecha_cosecha ?? '', c.bandejas, c.produccion_kg ?? '', c.estado]),
  ]
  const csv = '﻿' + filas.map((f) => f.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(';')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: 'cosechas-agrohidrotech.csv' })
  a.click()
  URL.revokeObjectURL(url)
}

/** Pantalla 07 · Reportes de producción */
export default function Reportes() {
  const [cosechas, setCosechas] = useState([])

  useEffect(() => { listarCosechas().then(setCosechas) }, [])

  const r = resumenProduccion(cosechas)
  const datos = cosechas
    .filter((c) => c.estado !== 'crecimiento')
    .reverse()
    .map((c) => ({ lote: c.lote, kg: Number(c.produccion_kg ?? 0), perdido: c.estado === 'perdido' }))

  return (
    <>
      <div className="top">
        <div><h1>Reportes de producción</h1><p className="sub">Todos los lotes registrados</p></div>
        <button className="btn btn-o btn-sm" onClick={() => exportarCsv(cosechas)} disabled={!cosechas.length}><Icon name="down" />Exportar CSV</button>
      </div>

      <div className="grid4">
        <div className="card kpi"><div className="h">Forraje producido</div><div className="v">{r.totalKg.toLocaleString('es-CO')} <small>kg</small></div></div>
        <div className="card kpi"><div className="h">Rendimiento promedio</div><div className="v">{r.rendimiento} <small>kg/bandeja</small></div></div>
        <div className="card kpi"><div className="h">Lotes cosechados</div><div className="v">{r.lotesCosechados}</div><span className="chip bl">{r.enCrecimiento} en crecimiento</span></div>
        <div className="card kpi"><div className="h">Tasa de pérdida</div><div className="v">{r.tasaPerdida} <small>%</small></div></div>
      </div>

      <div className="card">
        <h2>Producción por lote (kg)</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={datos} margin={{ top: 20, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid stroke="#EDF2EF" vertical={false} />
            <XAxis dataKey="lote" tick={{ fontSize: 12, fill: '#5B6B63' }} />
            <YAxis tick={{ fontSize: 12, fill: '#5B6B63' }} />
            <Tooltip formatter={(v) => [`${v} kg`, 'Producción']} />
            <Bar dataKey="kg" radius={[6, 6, 0, 0]}>
              {datos.map((d) => <Cell key={d.lote} fill={d.perdido ? '#DC2626' : '#1F7A4D'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="hint">En rojo, lotes perdidos.</p>
      </div>
    </>
  )
}
