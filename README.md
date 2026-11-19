# AgroHidroTech · Plataforma de monitoreo de forraje verde hidropónico

Aplicación web responsiva para productores de forraje verde hidropónico (FVH) en contenedores
con sensores IoT en Valencia, Córdoba. Es el desarrollo modular de la **Fase 2 del examen final**
de *Gestión y Desarrollo de Proyectos Tecnológicos* (Universidad del Sinú, 2026). Sigue el
prototipo de Figma de la Fase 1.

**Autores:** Daniel David Macea León · Esneider Julio Cordero

---

## Módulos implementados

| Módulo | Qué hace | Archivos principales |
|---|---|---|
| **1 · CRUD de cosechas** | Crear, consultar, editar y eliminar lotes de forraje (maíz/sorgo), con búsqueda, filtros por estado y cultivo, confirmación antes de borrar y validaciones en el formulario y en la base de datos. | `src/pages/Cosechas.jsx`, `src/pages/CosechaForm.jsx`, `src/services/cosechasService.js`, `src/utils/validarCosecha.js` |
| **2 · Monitoreo IoT en tiempo real** | Panel con temperatura, humedad, pH y conductividad que se actualiza solo (Supabase Realtime), con gráfica, umbrales configurables y alertas automáticas que crea un *trigger* de PostgreSQL. Incluye un simulador del ESP32. | `src/pages/Panel.jsx`, `src/pages/Alertas.jsx`, `src/context/TelemetriaContext.jsx`, `src/services/telemetriaService.js`, `supabase/schema.sql` |
| **Extra · Autenticación y roles** | Registro e inicio de sesión. El rol **productor** gestiona todo; el rol **ganadero** sólo consulta. Los permisos se aplican en la base de datos con Row Level Security. | `src/context/AuthContext.jsx`, `src/pages/Login.jsx` |
| **Extra · Reportes** | Indicadores de producción, gráfica por lote y exportación a CSV. | `src/pages/Reportes.jsx` |

## Tecnologías

- **React 19 + Vite**: interfaz de una sola página (SPA), con **React Router** para la navegación.
- **Supabase**: PostgreSQL, autenticación, Row Level Security y Realtime.
- **Recharts**: gráficas.
- **node:test**: pruebas unitarias de la lógica de negocio, sin dependencias extra.
- **oxlint**: análisis estático del código.

## Arquitectura

```
Navegador (React)
 ├─ pages/        Pantallas (una por cada pantalla del prototipo de Figma)
 ├─ components/   Layout, iconos, modal de confirmación, avisos
 ├─ context/      Sesión/rol del usuario y estado del módulo IoT (simulador)
 ├─ services/     Acceso a datos: únicas funciones que llaman a Supabase
 └─ utils/        Lógica pura y testeable: validaciones, evaluación de sensores, reportes
        │  supabase-js (HTTPS + WebSocket)
        ▼
Supabase
 ├─ Auth          usuarios → trigger crea su fila en `perfiles` (nombre, rol)
 ├─ PostgreSQL    contenedores · cosechas · lecturas · umbrales · alertas
 │                trigger `evaluar_lectura`: cada lectura nueva → alertas si sale del rango
 ├─ RLS           autenticados leen; sólo el rol productor escribe
 └─ Realtime      envía al panel cada INSERT en `lecturas` y `alertas`
```

En producción, la lectura la enviaría el **ESP32** del contenedor con una petición HTTP a la API
REST de Supabase. Para la demostración, el botón *Iniciar simulación* del panel cumple ese papel:
inserta una lectura cada 3 segundos con variación realista. *Simular falla de ventilación* mete
un pico de temperatura para mostrar cómo se generan las alertas.

## Instalación

**Requisitos:** Node.js 20 o superior y una cuenta gratuita de [Supabase](https://supabase.com).

1. **Crear el proyecto en Supabase.** En el dashboard, crea un proyecto nuevo y espera a que esté listo.
2. **Crear la base de datos.** Abre *SQL Editor → New query*, pega todo el contenido de
   `supabase/schema.sql` y pulsa **Run**. Esto crea las tablas, reglas, triggers, políticas RLS,
   Realtime y los datos de ejemplo (2 contenedores y 10 cosechas).
3. **(Opcional, para la demo) Quitar la confirmación por correo.** Ve a *Authentication → Sign In / Providers → Email*
   y desactiva *Confirm email*, así las cuentas de prueba funcionan de inmediato.
4. **Configurar las variables de entorno:**
   ```bash
   cp .env.example .env
   ```
   Rellena `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con los datos de *Project Settings → API*.
5. **Instalar y ejecutar:**
   ```bash
   npm install
   npm run dev
   ```
   Abre http://localhost:5173.
6. **Crear usuarios:** en *Registrarse*, crea una cuenta con rol **Productor** y otra con rol **Ganadero**
   para mostrar la diferencia de permisos.

> **Proyecto del equipo:** el proyecto Supabase `agrohidrotech` ya está creado, con el esquema y los datos de ejemplo.
> Su `.env` y las cuentas demo (productor y ganadero) están en `cuentas-demo.local`, que no se sube al repositorio.

### Otros comandos

| Comando | Para qué sirve |
|---|---|
| `npm test` | Ejecuta las 9 pruebas unitarias (validaciones, evaluación de sensores, reportes). |
| `npm run lint` | Revisa el código con oxlint. |
| `npm run build` | Genera la versión de producción en `dist/`. |

### Despliegue (Vercel o Netlify)

Importa el repositorio y añade `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` como variables de entorno.
Usa `npm run build` como comando de build y `dist` como carpeta de salida. Como es una SPA, configura la
reescritura de todas las rutas a `/index.html` (en Vercel funciona sin configurar nada con el preset de Vite).

## Validaciones

Las reglas se aplican **dos veces**: en el formulario, para dar mensajes claros, y en la base de datos
con restricciones `CHECK`, para que nadie pueda saltárselas.

- Código de lote obligatorio, único y con formato `L-0000`.
- Fecha de cosecha mayor o igual que la de siembra.
- Bandejas: número entero entre 1 y 200.
- Producción ≥ 0. Si el estado es *Cosechado*, son obligatorias la fecha de cosecha y la producción.
- Observaciones: máximo 500 caracteres.
- Umbrales: el mínimo debe ser menor que el máximo.
- Login: correo con formato válido y contraseña de al menos 6 caracteres.

## Retos y soluciones

| Reto | Solución |
|---|---|
| Probar el módulo IoT sin tener el hardware en clase | Simulador que inserta lecturas por la misma vía que usaría el ESP32. Reproduce variaciones realistas y fallas a demanda. |
| Que las alertas no dependan de tener la app abierta | La regla de alertas vive en la base de datos (trigger `evaluar_lectura`), no en el navegador. |
| Seguridad de los roles: ocultar botones no basta | Políticas RLS: aunque alguien llame a la API directamente, un ganadero no puede escribir. |
| Panel en tiempo real sin recargar | Suscripción a Supabase Realtime filtrada por contenedor. |
| Mensajes de error de PostgreSQL poco claros | `cosechasService` traduce los códigos (por ejemplo, `23505` → "Ya existe una cosecha con ese código de lote"). |
| Mantener coherencia con el diseño de Figma | Los mismos tokens de color, tipografía e iconos en `src/index.css` y `src/components/Icon.jsx`. |

## Estructura de carpetas

```
agrohidrotech-app/
├─ supabase/schema.sql        Esquema, reglas, triggers, RLS y datos semilla
├─ src/
│  ├─ App.jsx                 Rutas y protección por sesión/rol
│  ├─ index.css               Sistema de diseño
│  ├─ lib/supabase.js         Cliente de Supabase
│  ├─ context/                AuthContext, TelemetriaContext
│  ├─ services/               cosechasService, telemetriaService
│  ├─ utils/                  validarCosecha, telemetria, formato
│  ├─ components/             Layout, Icon, ui (modal, toast, chips)
│  └─ pages/                  Bienvenida, Login, Panel, Cosechas, CosechaForm, Alertas, Reportes
├─ tests/logica.test.js       Pruebas unitarias
└─ docs/                      Entregables de la Fase 1 (documento explicativo y pantallas del prototipo)
```
