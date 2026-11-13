# Reservas Deportivas — Villaguay

Aplicación móvil para reservar los espacios deportivos municipales de
Villaguay (Entre Ríos), desarrollada para la Dirección de Deportes como
Trabajo Integrador Final de **Desarrollo para Móviles** (Tecnicatura
Universitaria en Desarrollo Web, FCAD – UNER, 2do cuatrimestre 2026).

La app reemplaza el sistema de reservas por WhatsApp y libreta: la gente ve
qué turnos hay libres y reserva sola, recibe un recordatorio, cancela con un
botón y el día del turno muestra un código QR que el encargado escanea en la
puerta.

## Integrantes

| Integrante | Parte |
|---|---|
| Tobias Heynen | Autenticación y perfil |
| _(completar)_ | Espacios y mapa |
| _Cristian Sambrana_ | Disponibilidad y reservas |
| _(completar)_ | Ingreso el día del turno y avisos |
| _(completar)_ | Panel de encargado/administrador y offline |

## Entrega

- **APK (build de preview con EAS):** _(pegar acá el link del build)_
- **Código fuente:** este repositorio (incluye `app.json` y `eas.json`, sin `node_modules`).

El APK se genera con:

```bash
eas build --platform android --profile preview
```

## Tecnologías

| Qué | Con qué |
|---|---|
| Framework | React Native con Expo (SDK 58) |
| Lenguaje | TypeScript |
| Navegación | Expo Router |
| Estilos | `StyleSheet` |
| Íconos | `@react-native-vector-icons/ionicons` |
| Entrega | Build de producción con EAS |

## Cómo correrla

```bash
npm install
npx expo start
```

Escanear el QR con **Expo Go** (Android) o con la cámara (iPhone). El
celular y la computadora tienen que estar en la misma red; si no conecta,
usar `npx expo start --tunnel`.

En Expo Go no funcionan Face ID (iPhone) ni guardar el video para verlo sin
conexión; en el APK sí.

### Cuentas de prueba

La contraseña de las tres es `1234`:

| Email | Rol |
|---|---|
| emiliano@mail.com | Jugador |
| marcelo@villaguay.gob.ar | Encargado |
| nahuel@villaguay.gob.ar | Administrador |

También se puede crear una cuenta nueva desde "Crear cuenta" (siempre queda
con rol jugador).

## Qué hace la app

**Para cualquier persona (sin cuenta)**
- Ver los once espacios con foto, deporte, superficie y si tienen luz, y
  filtrarlos por deporte y por complejo.
- Ver la ficha de cada espacio: fotos, características, precio por hora,
  reglas, video de recorrido y ubicación en el mapa con "Cómo llegar".
- Ver el mapa de complejos. Si se da permiso de ubicación, la app centra el
  complejo más cercano; si se niega, se puede usar igual.
- Ver la grilla de turnos de un espacio para los próximos siete días, de
  8:00 a 24:00, con turnos libres, ocupados, fijos y en mantenimiento.

**Para jugadores (con cuenta)**
- Reservar un turno libre indicando el deporte y la cantidad de personas.
  Máximo tres reservas activas por persona.
- Ver sus reservas, separadas entre próximas y pasadas, y cancelar: hasta
  cuatro horas antes sin aviso; después queda registrada como cancelación
  tardía.
- Mostrar el QR de ingreso, que queda guardado en el teléfono para verse sin
  conexión.
- Recibir avisos: recordatorio dos horas antes del turno, aviso si un turno
  se suspende y aviso cuando se libera un turno en un espacio favorito.
- Ver su perfil con favoritos, cancelaciones tardías y ausencias.

**Para encargados y administradores**
- Ver la agenda del día.
- Escanear el QR en la puerta. La vibración es distinta si el ingreso es
  válido o inválido.
- Bloquear días por mantenimiento o lluvia con un motivo, ver las reservas
  fijas y cambiar el precio por hora de cada espacio.

**Sesión**
- Mirar espacios y disponibilidad no pide cuenta; la cuenta se pide recién
  al reservar.
- El token se guarda en `expo-secure-store` y los datos del usuario y las
  preferencias en `expo-sqlite/kv-store`, así que la sesión sigue después de
  cerrar la app.
- Al volver a abrir la app se pide huella o rostro
  (`expo-local-authentication`). Si el teléfono no tiene biometría, se usa
  la contraseña. Se puede desactivar desde Perfil.

## Requisitos mínimos de la consigna

| # | Requisito | Cómo se resuelve |
|---|---|---|
| 1 | Pantallas y navegación | Expo Router: pestañas (Espacios, Mapa, Mis reservas, Perfil), ingreso, ficha, disponibilidad, reserva y panel de encargado |
| 2 | Autenticación | Registro e ingreso; token en `expo-secure-store`; reingreso con `expo-local-authentication` y contraseña como alternativa |
| 3 | Consumo de la API | Capa de servicios propia en `src/servicios/` (hoy contra datos de prueba); estados de carga, vacío y error en cada pantalla |
| 4 | Cámara y sistema de archivos | `expo-camera` para leer el QR; `expo-file-system` (`File`, `Directory`, `Paths`) para guardar el video de cada cancha |
| 5 | Ubicación y mapas | `expo-location` + `react-native-maps`; la app sigue siendo usable si se niega el permiso |
| 6 | Notificaciones locales | `expo-notifications`: recordatorio del turno, suspensión y turno liberado en favoritos |
| 7 | Persistencia y conectividad | `expo-sqlite` (reservas y QR sin conexión), `expo-sqlite/kv-store` (sesión y preferencias), `expo-network` _(pendiente: aviso del estado de la red)_ |
| 8 | Sensores o háptica | `expo-haptics`: vibración distinta para ingreso válido e inválido al escanear |
| 9 | Multimedia | `expo-video` con controles para el recorrido de cada cancha |
| 10 | Identidad de la aplicación | Nombre "Reservas Deportivas", ícono de 1024×1024 y pantalla de presentación propios en `assets/` |

## Cómo está organizado el código

```
app/                     pantallas (Expo Router: carpetas = rutas)
  (tabs)/                Espacios, Mapa, Mis reservas, Perfil
  (auth)/                Ingreso y registro
  espacio/[id]/          Ficha del espacio y disponibilidad
  reserva/[id].tsx       Detalle de la reserva con el QR
  admin/                 Agenda, escanear, bloqueos, fijas y precios
src/
  tipos/                 Tipos del dominio, tal como los define el PRD
  mocks/                 Datos de prueba tipados, incluidos los casos difíciles
  servicios/             Única puerta de entrada a los datos
  contextos/             Sesión (AuthContext)
  componentes/           Componentes compartidos
  utilidades/            Funciones auxiliares (distancias, ids de turnos)
assets/                  Ícono y pantalla de presentación
```

**Ninguna pantalla importa los datos de prueba directamente**: todo pasa por
`src/servicios/`, y todas las funciones son asíncronas. Cuando la cátedra
publique la API, solo cambia el cuerpo de esas funciones (por un `fetch` con
`Authorization: Bearer <token>`); los tipos y las pantallas quedan iguales.

Los datos de prueba incluyen los casos que pide el PRD: un día entero
bloqueado por lluvia, una grilla sin turnos libres, un espacio sin video,
una reserva cancelada, una reserva fija que ocupa todos los martes y un error
de red simulado.

## Decisiones tomadas sobre huecos del PRD

1. **Bloqueos:** el PRD no define una entidad `Bloqueo`. Se resolvió
   marcando cada turno afectado con `estado: "mantenimiento"` y un
   `motivoBloqueo`.
2. **Cancelar después del límite de cuatro horas:** la app deja cancelar,
   pero suma una cancelación tardía y avisa que hay que dar aviso a la
   Dirección de Deportes.
3. **Marca de cancelador tardío:** el PRD no dice a partir de cuántas
   cancelaciones; se tomó **2**.
4. **Cuentas de encargado y administrador:** no se crean desde la app; el
   registro siempre crea jugadores.
5. **Reingreso:** se pide huella al volver a abrir la app, pero también se
   puede seguir como invitado, para respetar que mirar no requiere cuenta.

Quedan para consultar con el cliente: qué pasa si un grupo con reserva fija
no puede venir una semana puntual, y qué espacios están exactamente en cada
complejo.

## Fuera del alcance de esta versión

Según el PRD: pagos y señas online, torneos y tablas de posiciones, armado de
equipos, canchas privadas y alquiler de elementos.
