import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { listarContenedores } from '../services/cosechasService'
import { enviarLectura, ultimasLecturas } from '../services/telemetriaService'
import { siguienteLectura } from '../utils/telemetria'

/**
 * Estado compartido del módulo IoT:
 *  - contenedor seleccionado (lo usan Panel y Alertas)
 *  - simulador de sensores: emula al ESP32 enviando una lectura cada 3 s.
 *    Vive aquí (no en una página) para seguir enviando datos mientras se navega.
 */
const TelemetriaContext = createContext(null)
const INTERVALO_MS = 3000

export function TelemetriaProvider({ children }) {
  const [contenedores, setContenedores] = useState([])
  const [contenedorId, setContenedorId] = useState(null)
  const [simulando, setSimulando] = useState(false)
  const [errorSimulador, setErrorSimulador] = useState('')
  const ultima = useRef(null)
  const fallaPendiente = useRef(false)

  useEffect(() => {
    listarContenedores().then((lista) => {
      setContenedores(lista)
      setContenedorId((actual) => actual ?? lista[0]?.id ?? null)
    })
  }, [])

  // Al cambiar de contenedor, el simulador continúa desde su última lectura real
  useEffect(() => {
    ultima.current = null
    if (contenedorId) ultimasLecturas(contenedorId, 1).then((l) => { ultima.current = l[0] ?? null })
  }, [contenedorId])

  useEffect(() => {
    if (!simulando || !contenedorId) return
    const enviar = async () => {
      let lectura = siguienteLectura(ultima.current && {
        temperatura: Number(ultima.current.temperatura),
        humedad: Number(ultima.current.humedad),
        ph: Number(ultima.current.ph),
        conductividad: Number(ultima.current.conductividad),
      })
      if (fallaPendiente.current) {
        // Falla de ventilación simulada: el contenedor se calienta y se seca
        lectura = { ...lectura, temperatura: 31.2, humedad: 64 }
        fallaPendiente.current = false
      }
      try {
        await enviarLectura(contenedorId, lectura)
        // Tras una falla, el sistema de enfriamiento lleva la temperatura de vuelta a ~25 °C
        ultima.current = lectura.temperatura > 30 ? { ...lectura, temperatura: 25.5, humedad: 80 } : lectura
        setErrorSimulador('')
      } catch (e) {
        setErrorSimulador(e.message)
        setSimulando(false)
      }
    }
    enviar()
    const id = setInterval(enviar, INTERVALO_MS)
    return () => clearInterval(id)
  }, [simulando, contenedorId])

  const inyectarFalla = useCallback(() => { fallaPendiente.current = true }, [])

  const valor = {
    contenedores, contenedorId, setContenedorId,
    simulando, setSimulando, inyectarFalla, errorSimulador,
    contenedorActual: contenedores.find((c) => c.id === contenedorId),
  }
  return <TelemetriaContext.Provider value={valor}>{children}</TelemetriaContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTelemetria = () => useContext(TelemetriaContext)
