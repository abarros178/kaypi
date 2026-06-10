# Kaypi · Línea de diseño

> *Kaypi* = quechua **"aquí / en este lugar"**. El producto confirma **presencia**:
> estás aquí, llegaste, quedó registrado. Todo lo visual y la animación sirven a ese gesto.

Dirección: **Presencia serena**. Neutra, con aire, un solo acento. Craft sobre adorno
(inspiración: Emil Kowalski · impeccable.style). Documento portable y versionado —
si cambias un token, cámbialo aquí y en `packages/ui/src/tokens.ts` + `theme.css`.

## Cómo se consume
- **Web** (`apps/web`): `@import "tailwindcss"` → `@source` a `packages/ui` → `@import "@kaypi/ui/theme.css"`. Componentes desde `@kaypi/ui`.
- **Móvil** (`apps/mobile`): importa `@kaypi/ui/tokens` y aliméntalo a NativeWind/StyleSheet. Misma paleta y escala que web.
- Fuente de verdad de los valores: **`tokens.ts`** (JS) ↔ **`theme.css`** (CSS vars oklch). Mantenlos en espejo.

## Voz
Calmada, directa, sin hype. Nada de "¡Impulsa tu productividad!". El texto respeta el
contexto: un empleado marca en 5 segundos; un manager lee datos rápido. Verbos claros
("Marcar entrada", "Ver reportes"), no eslóganes.

## Color (oklch)
Neutros casi monocromáticos con matiz frío (H≈250) + **un** acento "confirmado" teal-verde (H≈165).
El color comunica estado, no decora.

| Token | Uso |
|---|---|
| `background` / `foreground` | lienzo y texto base |
| `card` / `border` | superficies y separaciones (no usar sombras pesadas) |
| `primary` | acción principal y presencia confirmada |
| `muted` / `muted-foreground` | texto secundario, fondos sutiles |
| `success` | entrada / marcaje válido |
| `warning` | descansos y `flags` (anomalía revisable, no error) |
| `destructive` | rechazo / acción peligrosa |

Reglas: sin gradientes arbitrarios, sin glassmorphism, sin sombras de colores. El contraste
viene de la jerarquía, no de saturar. Light por defecto; dark con la clase `.dark`.

## Tipografía
- **Geist Sans** para UI. **Geist Mono** para horas, IDs y datos (lo que se escanea en tablas).
- Jerarquía por **escala y peso** (400/500/600), nunca por decoración. Títulos con `tracking-tight`.

## Espaciado y radios
- Escala de **4px**: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64. Respira con whitespace, no con bordes.
- Radios: `sm` 0.375rem · `md` 0.5rem · `lg` 0.75rem.

## Componentes (`@kaypi/ui`)
- `Button` — `primary | secondary | outline | ghost | destructive` × `sm | md | lg | icon`.
- `Input`, `Card` (+ Header/Title/Description/Content/Footer), `Badge`, `Avatar`.
- `EstadoMarcaje` — traduce un `TipoMarcaje` canónico a color + ícono + etiqueta. Úsalo en listas y dashboard para hablar el mismo idioma visual.

## Movimiento
Principio: **animar solo cuando comunica** (confirmación, presencia, ubicación). Si no comunica, no se anima.
- Easing canónico `[0.32, 0.72, 0, 1]`; duraciones **micro 0.18s · base 0.28s · lento 0.4s**.
- Primitivas: `ConfirmCheck` (marcaje confirmado), `PresencePulse` ("aquí/en línea"), `PinDrop` (geo confirmada), `PageTransition` (entrada de página).
- Toasts con **Sonner** y drawers con **Vaul** (de Emil Kowalski) — coherentes con la referencia.
- Respeta `prefers-reduced-motion`. Nada de animaciones en bucle que distraigan de la tarea.

## Anti-patrones (rechazar en review)
Gradientes morados · glassmorphism · sombras de colores · emojis como íconos · animaciones decorativas ·
texto de marketing inflado · inventar valores fuera de los tokens.
