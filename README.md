# Kaypi · Asistencia verificada

Check-in de asistencia **multicanal** (web · móvil · kiosco) con **niveles de confianza
configurables** y **presencia confirmada**. Cada canal produce un único **evento canónico**
del que viven el dashboard, el cálculo de horas y los reportes.

> *Kaypi* = quechua **"aquí / en este lugar"**. El producto confirma presencia: estás aquí, quedó registrado.

## Stack
- **apps/web** — Next.js 16 (App Router): admin · check-in web · kiosco · API de marcaje · dashboard. Tailwind v4 + componentes shadcn-style.
- **apps/mobile** — Expo / React Native: **reconocimiento facial nativo** + GPS + foto + cola offline.
- **packages/shared** — el contrato: evento canónico, validaciones (zod), utilidades (geofence, motor T&A).
- **packages/db** — Drizzle ORM + libSQL/Turso (SQLite distribuido; *embedded replica* para el kiosco offline).
- **packages/ui** — design system **"Presencia serena"**: tokens oklch, componentes y animaciones (ver [DESIGN.md](DESIGN.md)).

El facial es el reconocimiento **nativo del dispositivo** como factor ligero de presencia (solo la
**foto del marcaje** como evidencia; sin plantillas en servidor ni liveness). **Trust Score**, WhatsApp,
agente IA, liveness y biometría real son **follow-up** (visión), **no** V1.

## Equipo (workstreams)
| Quién | Workstream | Carpetas |
|---|---|---|
| **Andrés** | Plataforma, admin, dashboard/reportes, config + contrato/API | `packages/*`, `app/(admin)`, `app/(reportes)`, `app/api` |
| **Julián** | Captura web + kiosco (una sola app que detecta contexto y red) | `app/(checkin)`, `app/(kiosco)` |
| **Felipe** | Móvil (Expo): facial nativo + GPS + offline | `apps/mobile` |

## Estructura
```
packages/shared   contrato (evento canónico · zod · geofence · T&A)
packages/db       schema Drizzle + cliente libSQL + seed
packages/ui       design system (tokens · componentes · animaciones)
apps/web          Next.js 16 — admin · check-in · kiosco · reportes · /api/checkin · /diseno
apps/mobile       Expo — facial nativo + GPS + offline
```

## Comandos
```bash
npm install         # instala todos los workspaces
npm run db:push     # crea el schema en la DB local (kaypi.db en la raíz)
npm run db:seed     # carga datos de demostración
npm run db:studio   # inspecciona la DB (Drizzle Studio)
npm run dev:web     # Next.js → http://localhost:3000  (incluye /diseno, la vitrina del design system)
npm run dev:mobile  # Expo (requiere simulador / Expo Go)
npm test            # tests del contrato (vitest)
npm run typecheck   # typecheck de todos los paquetes
```
En desarrollo se usa un archivo SQLite local (`kaypi.db`), **sin credenciales**. Para Turso, define
`DATABASE_URL` y `DATABASE_AUTH_TOKEN` (ver [`.env.example`](.env.example)).

## El contrato (día 0)
El **evento canónico** vive en `packages/shared`. El servidor **sella el timestamp en UTC** — nunca se
confía en el reloj del cliente. Flujo común a los 3 canales:

```
canal → POST /api/checkin → valida política · sella servidorUTC · calcula geofence/flags → persiste → dashboard/reportes
```

## Documentación
- **Estado / handoff del día 0**: [docs/ESTADO-DIA-0.md](docs/ESTADO-DIA-0.md)
- **PRD** (alcance, modelo de datos, reglas): [docs/PRD-Check-In.md](docs/PRD-Check-In.md)
- **Línea de diseño**: [DESIGN.md](DESIGN.md)
