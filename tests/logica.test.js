// Pruebas unitarias de la lógica de negocio (práctica XP / TDD del plan del proyecto).
// Ejecutar con: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validarCosecha, aRegistroCosecha } from '../src/utils/validarCosecha.js'
import { evaluarValor, siguienteLectura, resumenProduccion } from '../src/utils/telemetria.js'

const valida = {
  lote: 'l-2612', contenedor_id: '1', cultivo: 'maiz', estado: 'crecimiento',
  fecha_siembra: '2026-11-19', fecha_cosecha: '', bandejas: '48', produccion_kg: '', observaciones: '',
}

test('una cosecha válida no tiene errores', () => {
  assert.deepEqual(validarCosecha(valida), {})
})

test('rechaza lote con formato incorrecto', () => {
  assert.match(validarCosecha({ ...valida, lote: 'lote1' }).lote, /Formato/)
})

test('la fecha de cosecha no puede ser anterior a la siembra', () => {
  const e = validarCosecha({ ...valida, fecha_cosecha: '2026-11-15' })
  assert.match(e.fecha_cosecha, /anterior/)
})

test('bandejas debe ser entero entre 1 y 200', () => {
  assert.ok(validarCosecha({ ...valida, bandejas: '0' }).bandejas)
  assert.ok(validarCosecha({ ...valida, bandejas: '201' }).bandejas)
  assert.ok(validarCosecha({ ...valida, bandejas: '4.5' }).bandejas)
})

test('un lote cosechado exige fecha de cosecha y producción', () => {
  const e = validarCosecha({ ...valida, estado: 'cosechado' })
  assert.ok(e.fecha_cosecha)
  assert.ok(e.produccion_kg)
})

test('aRegistroCosecha normaliza tipos y mayúsculas', () => {
  const r = aRegistroCosecha(valida)
  assert.equal(r.lote, 'L-2612')
  assert.equal(r.bandejas, 48)
  assert.equal(r.fecha_cosecha, null)
  assert.equal(r.produccion_kg, null)
})

test('evaluarValor clasifica según el rango 18–28 °C', () => {
  assert.equal(evaluarValor(23, 18, 28), 'ok')
  assert.equal(evaluarValor(27.5, 18, 28), 'cerca')
  assert.equal(evaluarValor(28.5, 18, 28), 'advertencia')
  assert.equal(evaluarValor(30, 18, 28), 'critica')
})

test('siguienteLectura se mantiene dentro de límites físicos', () => {
  let l
  for (let i = 0; i < 1000; i++) l = siguienteLectura(l, () => 1) // siempre empuja hacia arriba
  assert.ok(l.temperatura <= 36 && l.ph <= 7.5 && l.humedad <= 99)
})

test('resumenProduccion calcula totales, rendimiento y pérdidas', () => {
  const r = resumenProduccion([
    { estado: 'cosechado', produccion_kg: 400, bandejas: 50 },
    { estado: 'cosechado', produccion_kg: 300, bandejas: 50 },
    { estado: 'perdido', produccion_kg: 100, bandejas: 50 },
    { estado: 'crecimiento', produccion_kg: null, bandejas: 50 },
  ])
  assert.equal(r.totalKg, 700)
  assert.equal(r.rendimiento, 7)
  assert.equal(r.lotesCosechados, 2)
  assert.equal(r.enCrecimiento, 1)
  assert.equal(r.tasaPerdida, 33)
})
