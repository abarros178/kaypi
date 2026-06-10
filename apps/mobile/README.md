# apps/mobile · Kaypi (Expo)

Cliente móvil Expo para el flujo de check-in de Kaypi. El app permite elegir entre
modo `Employee` para un dispositivo personal y modo `Shared site` para una estación
administrada que registra marcajes de varios empleados.

## Arrancar

```bash
npm install                 # desde la raíz del monorepo
npm run dev:mobile          # = expo start (en apps/mobile)
```

Necesitas un emulador Android, simulador iOS o Expo Go. En Android emulator, el host
local de la computadora es `10.0.2.2`; en device físico usa la IP de tu computadora.
La app infiere el host desde Expo cuando puede y apunta al API de check-in en
puerto `3000` por defecto. Puedes forzarlo con `EXPO_PUBLIC_API_URL`.

## Flujo de Check-In

- La primera pantalla permite escoger `Employee` o `Shared site`.
- `Employee` usa el empleado mock principal (`Felipe Gomez`) como dispositivo
  personal con política `FELIPE_DEVICE_FACEID` (`LOGIN_FACIAL`). Si no ha marcado
  entrada, muestra solo el saludo y el botón redondo `Check in`; después muestra
  reloj, `Check out` y break.
- `Shared site` pide primero un código admin local mock. Para desarrollo, usa
  `0000`.
- Una vez autenticado el admin, la estación pide el `empleadoId`. Para desarrollo,
  `emp_diego` resuelve a `Diego Ramirez`.
- La app identifica en segundo plano la política configurada para el sitio compartido
  (`DIEGO_SHARED_SITE_GEO`, nivel `LOGIN_GEO`), sin identidad de dispositivo.
- En shared site, si el empleado no tiene una jornada abierta, muestra `Check in`.
  Si ya está trabajando, muestra `Check out` y `Lunch break` / `End break`.
- La pantalla de shared site muestra el empleado reconocido, la política cargada y
  la condición detectada antes de permitir el marcaje.
- `Check in`, `Check out` y break ejecutan las validaciones de la política:
  Felipe usa biometría del dispositivo con `expo-local-authentication`; Diego en
  shared site usa GPS con `expo-location`, foto del marcaje con `expo-image-picker`
  y un beacon Bluetooth simulado.
- En shared site no se muestra reloj. Después de confirmar cualquier marcaje, la app
  vuelve al código de empleado para recibir el siguiente marcaje.
- Envío por `postCheckIn()` desde `@kaypi/shared`, validando el mismo contrato que web/kiosco.
- Cola offline en `AsyncStorage` con el mismo `eventId`, sin controles visibles en pantalla.
- `testID` y accessibility labels estables para los controles importantes.

## Validación Con Maestro

Maestro es la herramienta de preview/validación para este app móvil.

Instalar si hace falta:

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
export PATH="$HOME/.maestro/bin:$PATH"
```

Ejecutar el check-in automatizado:

```bash
adb devices

cd apps/mobile
EXPO_PUBLIC_MAESTRO_MODE=1 npx expo start --clear --port 8084
```

En otra terminal, desde la raíz del repo:

```bash
maestro test .maestro/checkin.yml
```

El flujo Maestro abre Expo Go con `exp://10.0.2.2:8084` y asume que Expo Go está
instalado en el emulador Android (`host.exp.exponent`). Cubre el modo personal con
reloj y el modo shared site con admin mock, código de empleado y confirmación sin
reloj. `EXPO_PUBLIC_MAESTRO_MODE=1` simula biometría, GPS, foto, beacon Bluetooth
y respuesta del servidor para evitar diálogos nativos durante la automatización;
la validación manual debe correr sin esa variable.

## Checks Requeridos

```bash
cd apps/mobile
npx expo install --check --json

cd ../..
npm run typecheck --workspace=apps/mobile
maestro test .maestro/checkin.yml
```
