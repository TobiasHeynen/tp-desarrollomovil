<<<<<<< HEAD
# Reservas Deportivas — Villaguay

Base del TP integrador de **Desarrollo para Móviles** (React Native + Expo +
Expo Router + TypeScript), armada a partir del PRD de la Dirección de
Deportes de Villaguay.

## 1. Puesta en marcha

```bash
npm install

# Agregar las capacidades del dispositivo con expo install (resuelve
# automáticamente la versión correcta para el SDK del proyecto):
npx expo install expo-camera expo-image-picker expo-location react-native-maps \
  expo-notifications expo-sqlite expo-secure-store expo-local-authentication \
  expo-haptics expo-sensors expo-file-system expo-video expo-audio expo-network \
  @react-native-vector-icons/ionicons

npm start
```

**Ojo con la documentación vieja** (aclarado en el PRD): `expo-av` no existe
más (es `expo-audio` + `expo-video`), la API vieja de `expo-file-system` tira
error en runtime (usar `File`, `Directory`, `Paths`), y los íconos son
`@react-native-vector-icons/ionicons`, no `@expo/vector-icons`.

Hagan el primer build de preview (`eas build --platform android --profile
preview`) **una semana antes** de la entrega — la consigna avisa que el
primer build siempre falla por algo y el cupo mensual es limitado.

## 2. Cómo está organizado

```
app/                    → pantallas (Expo Router, carpetas = rutas)
  (tabs)/               → Espacios, Mapa, Mis reservas, Perfil
  (auth)/               → Login, Registro
  espacio/[id]/          → Ficha del espacio, Disponibilidad
  reserva/[id].tsx       → Detalle de reserva + QR
  admin/                 → Agenda, Escanear, Bloqueos, Fijas, Precios
src/
  tipos/                 → interfaces del dominio (no se tocan al llegar la API real)
  mocks/                 → datos falsos tipados, incluidos los "casos feos" del PRD
  servicios/             → única puerta de entrada a los datos (mock hoy, fetch mañana)
  contextos/             → AuthContext (sesión)
  componentes/           → para componentes compartidos entre pantallas
```

La regla de oro del PRD: **ninguna pantalla importa un mock directamente**,
todo pasa por `src/servicios/`. Cuando se publique la API real, solo
se edita el cuerpo de esas funciones.

## Iniciar sesión (cualquier contraseña sirve, el mock no la valida): usá alguno de estos emails de prueba:

emiliano@mail.com → rol jugador
marcelo@villaguay.gob.ar → rol encargado
nahuel@villaguay.gob.ar → rol administrador

## 3. División sugerida

Pensada para que cada quien pueda defender su parte de punta a punta
(pantalla + servicio + capacidad del dispositivo que le corresponde).

### Tobias — Autenticación y perfil
- `app/(auth)/login.tsx`, `app/(auth)/registro.tsx`, `app/(tabs)/perfil.tsx`
- `src/contextos/AuthContext.tsx`, `src/servicios/auth.ts`
- Integrar `expo-secure-store` (token) y `expo-local-authentication`
  (reingreso con huella/rostro, con alternativa si el dispositivo no la tiene)
- Redirección en `app/_layout.tsx` según haya o no sesión

### Persona B — Espacios
- `app/(tabs)/index.tsx` (listado + filtros por deporte/complejo)
- `app/espacio/[id]/index.tsx` (ficha: fotos, reglas, precio)
- `app/(tabs)/mapa.tsx` (mapa general de complejos)
- `expo-video` para el recorrido de 20-30s, `expo-image-picker` si se
  suman fotos del estado de una cancha, `react-native-maps` + `expo-location`

### Persona C — Disponibilidad y reservas (la parte más difícil, según el cliente)
- `app/espacio/[id]/disponibilidad.tsx` — cruce turnos/fijas/bloqueos
- `app/(tabs)/mis-reservas.tsx`
- `src/servicios/turnos.ts`, `src/servicios/reservas.ts`
- Selector de los próximos 7 días, máximo de 3 reservas activas, marca de
  cancelaciones tardías repetidas

### Persona D — Ingreso el día del turno y avisos
- `app/reserva/[id].tsx` (QR de la reserva), `app/admin/escanear.tsx`
- `expo-camera` (lectura de QR), `expo-haptics` (vibración distinta en
  ingreso válido/inválido), `expo-notifications` (recordatorio 2hs antes,
  aviso de suspensión, aviso de turno liberado en favoritos)

### Persona E — Panel de encargado/administrador y offline
- `app/admin/agenda.tsx`, `bloqueos.tsx`, `fijas.tsx`, `precios.tsx`
- `src/servicios/admin.ts`
- `expo-sqlite` (reservas y catálogo para verlos sin conexión),
  `expo-sqlite/kv-store` (preferencias/sesión), `expo-network` (avisar
  estado de la red), protección de rutas `/admin` para roles encargado/admin

Los 10 requisitos mínimos de la consigna (auth, API+servicios, cámara,
mapas, notificaciones, persistencia offline, sensores/háptica, multimedia,
ícono/splash) quedan cubiertos entre las 5 partes.

## 4. Huecos del PRD para preguntar a la cátedra o al cliente

El propio documento pide "preguntar a tiempo" en vez de "suponer en
silencio". Estos son los puntos donde este esqueleto tomó una decisión
propia que conviene confirmar:

1. **Bloqueos como entidad**: el PRD no define un tipo `Bloqueo`, solo la
   acción "bloquear turnos o días con un motivo". Acá se resolvió marcando
   cada `Turno` afectado con `estado: "mantenimiento"` — falta confirmar si
   el cliente necesita ver el historial de bloqueos por separado.
2. **Cantidad de personas al reservar**: la pantalla de disponibilidad hoy
   la hardcodea en 2; falta el modal que la pida (PRD sección 3).
3. **Umbral de "cancelador tardío recurrente"**: el PRD dice "que quede
   marcado" sin definir a partir de cuántas cancelaciones tardías.
4. **Reservas fijas con excepciones**: ¿qué pasa si el grupo del martes no
   puede venir una semana puntual? No está contemplado en el PRD.
5. **Rol del video**: el PRD pide 20-30s por espacio pero no dice qué
   pasa si el archivo pesa demasiado para verse sin datos (sección
   "cosas importantes para cómo lo vamos a usar" pide que se guarde en el
   dispositivo con `expo-file-system`).

## 5. Casos feos ya cubiertos en los mocks

`src/mocks/` ya incluye los casos que pide explícitamente la consigna:
un día entero bloqueado por lluvia (`esp-01`, 2026-09-20), un espacio sin
video (`esp-02`), una reserva cancelada (`res-1099`), una fija que ocupa
todos los martes (`fij-07`), y `generarGrillaLlenaMock()` para probar una
grilla sin turnos libres. Falta agregar el caso de error de red simulado
en la capa de servicios (por ejemplo, una función que rechace la promesa
al azar) para probar el estado de error en cada pantalla.
=======
# tp-desarrollomovil
