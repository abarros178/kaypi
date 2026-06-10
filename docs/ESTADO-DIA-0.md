# Estado · Día 0 — Kaypi

**Fecha:** 2026-06-10 · **Branch:** main · **Autor:** Andrés Barros

Este commit funda el repo con la **fundación compartida**: el contrato, la base de datos, el
design system y el scaffold de las apps. El objetivo del día 0 **no** eran las features de cada
quien, sino dejar todo listo y **verificado** para trabajar en paralelo sin chocar.

## Qué quedó hecho (y verificado)

| Paquete / App | Contenido | Estado |
|---|---|---|
| **packages/shared** | Contrato: evento canónico (`CheckInInput` → `CheckInEvent`), enums zod, geofence (Haversine), motor T&A, cliente `postCheckIn`. | Tests **11/11** |
| **packages/db** | Schema Drizzle (8 tablas, §4 del PRD) + cliente libSQL/Turso + seed (**31 marcajes** con retrasos, una falta, un fuera-de-geofence y horas extra). | push + seed OK |
| **packages/ui** | Design system **"Presencia serena"**: tokens oklch, componentes (Button/Input/Card/Badge/EstadoMarcaje/Avatar), animaciones (ConfirmCheck/PresencePulse/PinDrop/PageTransition). Doc: `DESIGN.md`. | typecheck OK |
| **apps/web** (Next 16) | `/api/checkin` real (valida política, **sella `servidorUTC`**, calcula geofence/flags, persiste; GET lista), hub, áreas admin/checkin/kiosco/reportes y vitrina **`/diseno`**. | build OK · 6 rutas 200 |
| **apps/mobile** (Expo) | Andamiaje + NativeWind + pantalla demo que consume el contrato. | typecheck OK |

**Verificación global:** tests 11/11 · typecheck limpio en los 5 workspaces · build de Next OK ·
API end-to-end probada (el POST sella la hora del servidor e **ignora el reloj del cliente**).

## Cómo correr / revisar
```bash
npm install
npm run db:push && npm run db:seed   # crea kaypi.db (local, sin credenciales) y carga demo
npm run dev:web                      # http://localhost:3000  ·  vitrina en /diseno
npm test                             # tests del contrato
npm run typecheck                    # los 5 workspaces
npm run db:studio                    # inspeccionar la DB
```

## Decisiones tomadas (defaults del PRD §13)
Enforcement **FLAG** (nunca descarta en silencio) · contrato **input + canónico** (el servidor sella
el UTC) · empleado↔oficina **una** · geofence **configurable** (150 m) · tolerancia **5 min** ·
descansos **se marcan** · **Next 16** (en vez del 14 del PRD; greenfield) · auth hoy **stub**.

## Desde dónde continúa cada quien

### Andrés — plataforma · admin · dashboard/reportes
- **Auth real** (hoy stub): login + sesión + roles sobre `empleado` (`passwordHash`/`rol` ya existen en el schema).
- **Admin CRUD** en `app/(admin)` (hoy placeholder): oficinas/jornadas/políticas/empleados contra `@kaypi/db`.
- **Reportes** en `app/(reportes)`: leer `GET /api/checkin` + motor T&A de `@kaypi/shared` → lista/calendario/PDF.
- Código fallback + check-in manual + AuditLog (tablas ya existen).

### Julián — captura web + kiosco
- `app/(checkin)`: login → tipo de marcaje → `postCheckIn` (ya tipado). Niveles según la política de la oficina.
- Detección de **contexto** (web vs kiosco) y **red** (online/offline).
- `app/(kiosco)`: embedded replica de Turso + cola/sync + QR dinámico / bluetooth.
- Punto de partida: el cliente `postCheckIn`, el evento canónico y la API ya están listos y probados.

### Felipe — móvil (Expo)
- `apps/mobile/App.tsx` ya envía un marcaje `MOVIL` / `LOGIN_FACIAL` de demo a la API.
- Sumar: **facial nativo** (expo-camera), **GPS** (expo-location), foto del marcaje, **cola offline** (idempotencia con `eventId`), código fallback.
- Ver `apps/mobile/README.md`: polyfill de UUID (expo-crypto) y conversión oklch→rgb de tokens.

## Pendiente / decisiones abiertas
- **PDF mensual**: formato con Néstor.
- **Kiosco**: QR/bluetooth reales vs simulados según tiempo.
- Resto de §13 del PRD (tolerancia/descansos finos, geofence obligatorio, etc.).
