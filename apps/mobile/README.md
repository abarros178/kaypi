# apps/mobile · Kaypi (Expo)

Andamiaje del día 0 para el workstream **móvil (Felipe)**. Trae lo compartido listo:
el **contrato** (`@kaypi/shared`) y la **línea de diseño** (`@kaypi/ui/tokens` + NativeWind).

## Arrancar
```bash
npm install                 # desde la raíz del monorepo
npm run dev:mobile          # = expo start (en apps/mobile)
```
Necesitas simulador iOS / emulador Android / Expo Go. Apunta la app a tu API en `App.tsx → API_URL`
(localhost en simulador iOS; `10.0.2.2` en emulador Android; la IP de tu PC en un device físico).

## Qué ya está
- `postCheckIn()` del contrato — el mismo flujo y tipos que web/kiosco.
- NativeWind v4 configurado (`tailwind.config.js`, `metro.config.js`, `global.css`) con la paleta de la línea.
- Pantalla demo (`App.tsx`) que envía un marcaje `MOVIL` nivel `LOGIN_FACIAL` a la API.

## Siguiente (tu workstream)
- **Facial nativo** (expo-camera / face detection) + **GPS** (expo-location) + **foto** del marcaje.
- **Cola offline** (reintentos con `eventId` para idempotencia) + **código fallback**.
- Polyfill de UUID criptográfico (`expo-crypto` o `react-native-get-random-values`) — hoy la pantalla usa un uuid de demo.
- Conversión fiel de los tokens **oklch → rgb** (RN no parsea oklch); hoy `tailwind.config.js` usa hex aproximados.
