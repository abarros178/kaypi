# PRD — Check-In / Control de Asistencia (V1 · Hackathon)

| | |
|---|---|
| **Estado** | Borrador v1 — listo para arrancar build |
| **Tipo** | Producto nuevo, **standalone** (no parte del monorepo `runa-v2`) |
| **Equipo** | 3 personas, divididas por workstream (ver §11) |
| **Fuente de verdad** | `CHECK - IN especificaciones.md` (lo que el equipo acordó) |
| **Contexto de apoyo** | `Check-in solution.md` + propuestas "Asistencia Verificada" (dominio T&A, fraude, compliance) |
| **Regla de alcance** | Lo que está en la spec = **V1**. Lo que solo aparece en las propuestas = **follow-up** (§12) |

---

## 0. TL;DR

Construir, desde cero, un sistema de **check-in de asistencia** para que un empleado marque entrada/salida por **web, móvil o kiosco**, con **niveles de confianza configurables** (login → login+geo → login+facial nativo), que produzca un **evento de marcaje estandarizado** y lo muestre en un **dashboard** (lista + calendario) con faltas, retrasos y horas extra, más un **reporte PDF mensual**. Incluye **modo offline en kiosco** (réplica local que sincroniza) y un **fallback con código rotativo** + **check-in manual** cuando el checador falla.

El corazón del diseño es **un único evento canónico de check-in** (§7): el contrato que todos los canales producen y del que viven el dashboard, el cálculo de horas y los reportes. Si los tres workstreams se ponen de acuerdo en ese contrato el día 0, pueden trabajar en paralelo sin bloquearse.

---

## 1. Contexto y objetivo

**Qué es un check-in (T&A).** El dominio separa dos capas: **(1) captura** (identidad, ubicación, hora sellada, anti-fraude) y **(2) motor de interpretación** (empata jornada, calcula horas extra, faltas, retrasos). Este V1 cubre **la captura + un motor de interpretación mínimo + reportes**, todo en un sistema propio.

**Objetivo del V1.** Un flujo demostrable de punta a punta: el empleado marca → el sistema valida según la política → guarda un evento canónico → el admin lo ve en el dashboard con métricas y puede descargar el PDF. Demostrable en los 3 canales, con énfasis en **móvil (facial nativo)** y **kiosco offline**.

**Restricción dura.** Es un hackathon: priorizamos un **slice vertical funcional y creíble** sobre completitud. Lo complejo (sync robusto, biometría real) se simula o se difiere de forma explícita (§10, §12).

---

## 2. Alcance

### 2.1 Dentro del V1 (en la spec)

- **Configuración (Admin):** crear **oficinas** (cada una con su config; el empleado se asigna a una), configurar **jornadas** (máx. horas semanales/diarias, fija o flexible, entrada/salida, comida/descanso, timezone de trabajo), configurar **política de check-in** (canales + niveles + fallback).
- **Captura / Check-in:** canales **web / móvil / kiosco**; niveles **solo login**, **login + geo**, **login + facial nativo**; **foto por marcaje**; **fallback con código rotativo**.
- **Reportes / Dashboard:** filtros (oficina / fecha / empleado), **modo lista** (nombre · oficina · faltas · retrasos · horas extra), **modo calendario**, **PDF mensual** resumen por empleado.
- **Utilidades:** validar el código del checador cuando falla y crear un **check-in manual**.
- **Arquitectura:** servidor **Next.js (web + API) + SQLite**; **móvil Expo** con reconocimiento facial nativo; **kiosco offline** (réplica local del servidor en PC fijo) con **QR dinámico / bluetooth / GPS**.

### 2.2 Fuera del V1 (→ follow-up, §12)

Biometría real (plantillas en servidor, consentimiento/retención/borrado), **liveness/anti-spoof**, niveles **"mismo wifi"** y **"mismo dispositivo"** (en la spec marcados "solo mención"), WhatsApp + agente IA, **Trust Score** con IA, copiloto de excepciones, **mock-GPS/VPN detection**, device binding, **REP-P/AFD (Brasil)**, multi-idioma PT.

> **Nota sobre facial (decisión del equipo):** usamos el **reconocimiento facial nativo del dispositivo** (Expo) como factor de identidad/presencia ligero al marcar. **No** construimos un sistema biométrico: no almacenamos plantillas faciales en el servidor (solo la **foto del marcaje** como evidencia), no hay flujo de consentimiento/borrado ni liveness. Limitación conocida y documentada: sin liveness, el facial es un factor débil contra suplantación con foto → se endurece en follow-up.

---

## 3. Arquitectura

```mermaid
flowchart LR
  subgraph Clientes
    W[Web check-in<br/>Next.js]
    M[Móvil<br/>Expo · facial nativo + GPS]
    K[Kiosco<br/>réplica local SQLite · QR/BT/GPS]
  end
  subgraph Servidor [Servidor principal · Next.js + SQLite]
    API[API de marcaje<br/>valida política → evento canónico]
    DB[(SQLite)]
    RULES[Motor T&A mínimo<br/>faltas · retrasos · horas extra]
    RPT[Dashboard + PDF]
  end
  W -->|evento canónico| API
  M -->|evento canónico| API
  K -.->|sync diferido al recuperar red| API
  API --> DB
  DB --> RULES --> RPT
```

**Decisiones de arquitectura (y su justificación):**

- **Next.js (App Router) full-stack:** web + API en un solo repo; route handlers como API de marcaje. Rápido para hackathon.
- **SQLite:** una sola DB de archivo para el servidor y **otra réplica local** en el kiosco. ⚠️ *Riesgo a anotar:* SQLite es single-writer; suficiente para demo, no para concurrencia multi-tenant real (en producción → Postgres). Para el kiosco es ideal (cache local cifrable).
- **Timestamp canónico = el del servidor en UTC.** El reloj del dispositivo **no** se confía (se puede adelantar para hacer trampa). El cliente manda su hora local solo como referencia; el servidor sella el `tsServidorUTC` al recibir. En offline, el kiosco sella con su reloj local + marca `origen: KIOSCO_OFFLINE` y el servidor concilia al sincronizar (§10).
- **Contrato primero:** el **evento canónico** (§7) y los endpoints de la API se congelan el día 0 para desbloquear a los 3 workstreams.

---

## 4. Modelo de datos (SQLite)

Entidades mínimas del V1. (Tipos orientativos; ajustar al ORM elegido — Prisma/Drizzle recomendados.)

| Entidad | Campos clave | Notas |
|---|---|---|
| **Empresa** | `id`, `nombre` | Single-tenant para el demo; existe para agrupar oficinas |
| **Oficina** | `id`, `empresaId`, `nombre`, `direccion`, `lat`, `lng`, `geofenceRadiusM`, `timezone` | **Contiene la config**; el empleado se asigna a una |
| **Jornada** | `id`, `oficinaId`, `nombre`, `tipo` (`FIJA`\|`FLEXIBLE`), `maxHorasDiarias`, `maxHorasSemanales`, `horaEntrada`, `horaSalida`, `descansoInicio`, `descansoFin`/`descansoMin`, `timezone?` | Si `FLEXIBLE`, entrada/salida null; excedente sobre máximos = hora extra |
| **PoliticaCheckIn** | `id`, `oficinaId`, `canales` (`["WEB","MOVIL","KIOSCO"]`), `nivel` (`SOLO_LOGIN`\|`LOGIN_GEO`\|`LOGIN_FACIAL`), `enforcement` (`BLOCK`\|`FLAG`), `fallbackHabilitado` | La política vive en la oficina; ver matriz §6.2 |
| **Empleado** | `id`, `empresaId`, `oficinaId`, `jornadaId`, `nombre`, `email`, `passwordHash`, `rol` (`ADMIN`\|`MANAGER`\|`EMPLEADO`), `fotoRefPerfil?` | Foto de perfil opcional como referencia visual (no plantilla biométrica) |
| **CheckInEvent** | `id`, `empleadoId`, `oficinaId`, `tipo` (`IN`\|`OUT`\|`BREAK_START`\|`BREAK_END`), `tsServidorUTC`, `tz`, `canal`, `lat`, `lng`, `accuracyM`, `geofenceOk`, `facialOk`, `fotoRef`, `nivelAplicado`, `flags` (json), `fuente` (`NORMAL`\|`MANUAL`\|`FALLBACK_CODE`\|`KIOSCO_OFFLINE`), `creadoPor?` | El "punch". `flags` lista anomalías (fuera de geofence, facial falló, etc.) |
| **CodigoFallback** | `id`, `oficinaId`, `codigo`, `generadoEn`, `validoHasta`, `usadoPor?`, `usadoEn?` | Código rotativo = `código + hora + día`; ventana corta (ej. 5 min) |
| **AuditLog** | `id`, `entidad`, `entidadId`, `accion`, `actorId`, `ts`, `detalle` (json) | **Append-only**; toda corrección/manual/override se registra, nunca se sobreescribe |

**Resultados T&A (faltas/retrasos/horas extra)** se **calculan al leer** (no se materializan en V1): se derivan de los `CheckInEvent` vs la `Jornada` del empleado para el rango consultado (§8).

---

## 5. Funcionalidades

### 5.1 Configuración (Admin)

- **Oficinas:** CRUD. Cada oficina define ubicación (lat/lng + radio de geofence), timezone y queda como contenedor de config. El empleado pertenece a **una** oficina.
- **Jornadas:** CRUD por oficina. Fija (con entrada/salida + descanso) o flexible (solo máximos). Define los máximos diarios/semanales que disparan hora extra y el bloque de comida.
- **Política de check-in:** por oficina, define canales habilitados + nivel requerido + si falla → bloquea o marca (§6.2) + si el fallback por código está activo.
- **Empleados:** alta/edición, asignación a oficina y jornada, rol.

### 5.2 Captura / Check-in (el flujo del empleado)

Flujo común a los 3 canales (mismo evento canónico de salida):

1. **Login** (usuario/contraseña).
2. **Identidad según nivel** de la política de su oficina:
   - `SOLO_LOGIN`: nada más.
   - `LOGIN_GEO`: captura GPS → valida geofence de la oficina.
   - `LOGIN_FACIAL`: **móvil** dispara el **reconocimiento facial nativo** (Expo) + captura **foto** del marcaje.
3. **Tipo de marcaje:** IN / OUT / BREAK_START / BREAK_END (botón directo, UX ≤5s).
4. **Resultado:** confirmación visual inmediata (estado + hora + nombre). Si algún factor falla → según `enforcement`: bloquea o marca con `flag`.
5. **Fallback:** si el checador/canal falla, el empleado puede usar el **código rotativo** (§5.4).

Detalles por canal:

| Canal | Identidad | Ubicación | Notas |
|---|---|---|---|
| **Móvil (Expo)** | Facial nativo + foto | GPS preciso | Canal principal del nivel facial |
| **Web** | Login (+ foto webcam opcional) | Geolocalización del navegador (imprecisa) | Para oficina/escritorio |
| **Kiosco** | Login / **QR dinámico** / proximidad **bluetooth** | Fija por definición (ubicación del kiosco) | Funciona **offline** (§10) |

### 5.3 Reportes / Dashboard (Admin/Manager)

- **Filtros:** oficina, fecha (rango), empleado, búsqueda por ID/nombre/email.
- **Modo lista:** tabla `nombre · oficina · faltas · retrasos · horas extra` (por rango).
- **Modo calendario:** vista semanal empleados × días (cada celda muestra estado del día: marcajes, retraso, falta, extra).
- **PDF mensual:** resumen por empleado tipo calendario (faltas/retrasos/horas/extra del mes). *Formato a confirmar con Néstor (§11).*

### 5.4 Utilidades — código fallback + check-in manual

- **Generación:** el kiosco/servidor genera un **código rotativo** derivado de `código + hora + día`, válido por una ventana corta (ej. 5 min), mostrado en pantalla.
- **Validación + check-in manual:** sección de Admin para **validar un código** que el empleado reporta (cuando el checador falló) y, si es válido, **registrar el marcaje manualmente** a nombre del empleado.
- **Corrección/override:** el marcaje manual **no** borra ni sobreescribe; se crea un evento con `fuente=MANUAL` + `creadoPor` y entra al **AuditLog**. (Razón obligatoria recomendada.)

---

## 6. Reglas de validación (lo que la spec no detalla — propuesta)

### 6.1 Geofence

`geofenceOk = distancia(marcaje, oficina) ≤ oficina.geofenceRadiusM`. La distancia se calcula con Haversine. Radio configurable por oficina (default sugerido 150 m).

### 6.2 Matriz de enforcement (decisión clave a confirmar)

Qué pasa cuando un factor del nivel **falla**:

| Nivel | Factor que falla | `enforcement=BLOCK` | `enforcement=FLAG` |
|---|---|---|---|
| LOGIN_GEO | Fuera de geofence | Rechaza el marcaje | Acepta + `flag: "fuera_geofence"` |
| LOGIN_FACIAL | Facial no pasa | Rechaza el marcaje | Acepta + `flag: "facial_fallo"` |
| Cualquiera | Sin red (móvil) | Encola y reintenta | Encola y reintenta |

> **Recomendación:** default **FLAG** en V1 (nunca descartar un marcaje en silencio; el manager revisa los `flags` en el dashboard). El dominio T&A es claro: descartar sin auditoría es riesgo legal.

### 6.3 Cálculo T&A (motor mínimo)

- **Retraso:** primer `IN` del día > `horaEntrada` + tolerancia (config, default 0–5 min). Solo aplica a jornada `FIJA`.
- **Falta:** no hay `IN` en un día laborable sin permiso. *(V1: sin integración a permisos — todo "sin IN" cuenta como falta; permisos = follow-up.)*
- **Horas extra:** `horas trabajadas del día > maxHorasDiarias` **o** `horas de la semana > maxHorasSemanales`. Horas trabajadas = suma de pares IN/OUT menos descansos.
- **Timezone:** todo se almacena en UTC; se presenta en el `timezone` de la oficina/jornada.

---

## 7. Evento canónico de check-in (el contrato)

Todos los canales producen **este mismo objeto**. Es lo que se congela el día 0.

```json
{
  "eventId": "uuid",
  "empleadoId": "emp_123",
  "oficinaId": "ofi_1",
  "tipo": "IN | OUT | BREAK_START | BREAK_END",
  "timestamp": { "servidorUTC": "2026-06-12T14:03:00Z", "tz": "America/Mexico_City", "clienteLocal": "2026-06-12T08:03:00-06:00" },
  "canal": "WEB | MOVIL | KIOSCO",
  "nivelAplicado": "SOLO_LOGIN | LOGIN_GEO | LOGIN_FACIAL",
  "ubicacion": { "lat": 19.4326, "lng": -99.1332, "accuracyM": 12, "geofenceOk": true },
  "identidad": { "facialOk": true, "fotoRef": "file://.../punch.jpg" },
  "fuente": "NORMAL | MANUAL | FALLBACK_CODE | KIOSCO_OFFLINE",
  "flags": [],
  "creadoPor": null
}
```

**Flujo:** canal → `POST /api/checkin` (valida política, sella `servidorUTC`, calcula `flags`) → persiste `CheckInEvent` → disponible para dashboard/PDF.

---

## 8. Offline & sync (kiosco)

- **Réplica local:** el kiosco corre su propia SQLite. Los marcajes se guardan local con `fuente=KIOSCO_OFFLINE` y la hora local del kiosco.
- **Cola + sync:** al recuperar red, encola y hace `POST` al servidor. El servidor **no** confía en la hora del kiosco para nómina; la registra como `clienteLocal` y aplica su criterio de conciliación.
- **Conflictos:** política = **conservar ambos** y marcar conflicto para revisión (nunca descartar en silencio).
- **QR dinámico / bluetooth:** el kiosco muestra un **QR que rota** (mismo principio que el código fallback) que el móvil escanea para confirmar presencia física; bluetooth como señal de proximidad. *(En V1 se puede simular si el tiempo aprieta — ver §11.)*

---

## 9. Seguridad, auth y roles

- **Auth:** login usuario/contraseña (hash). Sesión por token.
- **Roles:** `ADMIN` (config + reportes + utilidades), `MANAGER` (reportes de su oficina + correcciones), `EMPLEADO` (solo marcar).
- **Código fallback / QR:** ventana corta + un solo uso para evitar replay.
- **Auditoría:** AuditLog append-only para correcciones y marcajes manuales.

---

## 10. Riesgos y mitigaciones

| Riesgo | Mitigación V1 |
|---|---|
| Sync offline robusto es complejo para 4 días | Slice fino: cola + reintento simple; conciliación "conservar ambos"; demo con un corte de red controlado |
| Facial nativo sin liveness se burla con foto | Documentado como limitación; foto auditable + flag; liveness → follow-up |
| SQLite no concurrente | Aceptable para demo; nota explícita "Postgres en producción" |
| Dependencia del PDF (Néstor) | Definir formato mínimo nosotros; cerrar con Néstor antes de Mié |
| WS bloqueados por el backend | **Contrato (§7) congelado día 0**; B y C mockean la API hasta que A esté viva |

---

## 11. Plan de trabajo — división para 3 personas

Cada quien es **dueño de un workstream**. El acuerdo del día 0 es el **evento canónico (§7) + los endpoints**.

| WS | Dueño | Alcance |
|---|---|---|
| **A · Plataforma & Admin** | Persona 1 | Next server + SQLite (schema/migraciones), **auth + roles**, CRUD de **Oficinas / Jornadas / Políticas / Empleados**, **API de marcaje** (`/api/checkin` con enforcement + flags), generación/validación del **código fallback**, motor T&A mínimo (§6.3). *Es el backbone: bloquea a B y C, por eso congela el contrato primero.* |
| **B · Captura (móvil + web)** | Persona 2 | Cliente **móvil Expo** (facial nativo + GPS + foto + código fallback) y **check-in web**; implementa la matriz de niveles (§6.2) contra la API de A; UX ≤5s + confirmación visual. |
| **C · Kiosco offline + Reportes** | Persona 3 | **Kiosco** (réplica SQLite local + cola/sync + QR dinámico/bluetooth) y **Dashboard** (lista + calendario + filtros) + **PDF mensual** + **Utilidades** (validar código + check-in manual/corrección). |

**Dependencias:** B y C → dependen del schema + API de A. **Mitigación:** A publica el contrato (§7) y un mock/stub el día 0; B y C trabajan contra el mock y conmutan a la API real cuando esté.

**Qué construir vs simular (realismo de hackathon):**

| 🔨 Construir | 🎭 Simular si falta tiempo |
|---|---|
| Flujo IN/OUT real en móvil con facial nativo + GPS + foto | Sync offline → demo con corte de red controlado o "modo offline" botón |
| API de marcaje + evento canónico + dashboard lista/calendario | QR dinámico/bluetooth → QR estático o mock de proximidad |
| Código fallback + check-in manual | PDF → plantilla simple si no se cierra con Néstor |

---

## 12. Follow-up (no entra al V1 — siguiente implementación)

De las propuestas "Asistencia Verificada", fuera del alcance acordado: **WhatsApp + agente IA**, **Trust Score** (scoring anti-fraude con IA), **copiloto de excepciones** para RH, **liveness/anti-spoof** (Truora/Incode), **biometría real** (plantillas + consentimiento + retención/borrado), **mock-GPS/VPN detection**, **device binding**, niveles **"mismo wifi"** y **"mismo dispositivo"**, **REP-P/AFD (Brasil)**, integración a **nómina/turnos/permisos** existentes, **multi-idioma PT**, formalización del trabajador informal.

---

## 13. Decisiones abiertas (cerrar antes/durante el día 0)

1. **PDF mensual:** formato y campos exactos → **hablar con Néstor** (en la spec).
2. **Enforcement default:** ¿`BLOCK` o `FLAG` por nivel? (recomendado `FLAG`, §6.2).
3. **Tolerancia de retraso** y si los descansos se marcan (BREAK_START/END) o se descuentan automático.
4. **Geofence:** ¿obligatorio para todas las oficinas o configurable on/off?
5. **Empleado ↔ oficina:** ¿una sola (como dice la spec) o varias? (V1: una).
6. **Reach del kiosco** (QR/bluetooth reales vs simulados) según tiempo.

---

## Apéndice · Glosario

| Término | Significado |
|---|---|
| **T&A** | Time & Attendance (control de tiempo y asistencia) |
| **Marcaje / punch** | Un evento de check-in (entrada/salida/descanso) |
| **Jornada** | Configuración de horario/horas de un empleado |
| **Oficina** | Sede con su config (ubicación, geofence, timezone, política) |
| **Geofence** | Perímetro virtual alrededor de la oficina |
| **Evento canónico** | El formato único de evento que producen todos los canales |
| **Facial nativo** | Reconocimiento facial del propio dispositivo (Expo), sin plantillas en servidor |
| **Fallback** | Código rotativo (código+hora+día) para confirmación/marcaje manual |
| **Enforcement** | Si un factor falla: bloquear el marcaje (BLOCK) o aceptarlo marcado (FLAG) |
