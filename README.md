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
| Cristian Sambrana | Disponibilidad y reservas |
| _(completar)_ | Ingreso el día del turno y avisos |
| _(completar)_ | Panel de encargado/administrador y offline |

## Entrega

- **Código fuente:** este repositorio (incluye `app.json` y `eas.json`, sin `node_modules`).
- **Video:** cada integrante muestra su parte de la app funcionando.

## Tecnologías

| Qué | Con qué |
|---|---|
| Framework | React Native con Expo (SDK 58) |
| Lenguaje | TypeScript |
| Navegación | Expo Router |
| Estilos | `StyleSheet` |
| Íconos | `@react-native-vector-icons/ionicons` |
| Datos | API de la cátedra (NestJS), corriendo en la computadora con SQLite |

## Cómo correrla

La app usa la [API de la cátedra](https://github.com/franco-ruisdias-uner/api-proyectos-mobile/tree/main/api-reservas-deportivas),
que hay que tener corriendo.

1. **Levantar la API** en otra carpeta, siguiendo su README. Sin Docker,
   con Node 24 y pnpm:

   ```bash
   pnpm install
   copy .env.example .env
   pnpm db:reiniciar
   pnpm dev
   ```

   Al arrancar muestra la dirección para el teléfono, por ejemplo
   `http://192.168.0.10:3000/salud`. Si el celular no llega, hay que
   permitir el puerto 3000 en el firewall de Windows.
2. **Configurar la dirección en la app**: copiar `.env.example` como `.env`
   y poner esa dirección (sin `/salud`):

   ```
   EXPO_PUBLIC_API_URL=http://192.168.0.10:3000
   ```

3. **Correr la app**:

   ```bash
   npm install
   npx expo start -c
   ```

Escanear el QR con **Expo Go** (Android) o con la cámara (iPhone). El
celular, la computadora y la API tienen que estar en la misma red.

En Expo Go no funcionan Face ID (iPhone) ni guardar el video para verlo sin
conexión.

### Cuentas de prueba

Son las de la base de demo de la API. La contraseña de todas es `villaguay2026`:

| Email | Rol |
|---|---|
| emiliano@mail.com | Jugador (con una cancelación tardía) |
| lleno@demo.ar | Jugador con tres reservas activas |
| nuevo@demo.ar | Jugador sin reservas |
| marcelo@villaguay.demo.ar | Encargado |
| nahuel@villaguay.demo.ar | Administrador |

También se puede crear una cuenta nueva desde "Crear cuenta" (siempre queda
con rol jugador; la contraseña tiene que tener al menos 8 caracteres).

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
- Ver sus reservas, separadas entre próximas y pasadas, y cancelar hasta
  cuatro horas antes del turno. Después, la app indica que hay que avisarle
  al encargado.
- Mostrar el QR de ingreso, que queda guardado en el teléfono para verse sin
  conexión.
- Recibir avisos: recordatorio dos horas antes del turno, aviso si un turno
  se suspende y aviso cuando se libera un turno en un espacio favorito.
- Ver su perfil con favoritos, cancelaciones tardías y ausencias.

**Para encargados y administradores**
- Ver la agenda del día de todos los espacios, quién llegó y a qué hora, y
  marcar "no se presentó".
- Escanear el QR en la puerta, eligiendo la cancha y confirmando la identidad
  con huella. La app dice con claridad si el código es de otro día, de otra
  cancha o de otro horario, y vibra distinto si el ingreso es válido o no.
- Bloquear días enteros u horarios de uno o varios espacios, con un motivo
  (las reservas de esos turnos se cancelan y a sus dueños les llega un aviso),
  y quitar bloqueos.
- Ver las reservas fijas; el administrador además las carga, edita y da de
  baja, y cambia el precio por hora de cada espacio.

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
| 3 | Consumo de la API | Toda la app usa la API de la cátedra a través de una capa de servicios propia (`src/servicios/`) sobre un cliente común (`src/servicios/api.ts`) con el token, el sobre `{ datos, meta }` y los errores de la API; estados de carga, vacío y error en cada pantalla |
| 4 | Cámara y sistema de archivos | `expo-camera` para leer el QR; `expo-file-system` (`File`, `Directory`, `Paths`) para guardar el video de cada cancha |
| 5 | Ubicación y mapas | `expo-location` + `react-native-maps`; la app sigue siendo usable si se niega el permiso |
| 6 | Notificaciones locales | `expo-notifications`: recordatorio del turno, suspensión y turno liberado en favoritos |
| 7 | Persistencia y conectividad | `expo-sqlite` (reservas y QR sin conexión), `expo-sqlite/kv-store` (sesión, preferencias y copia del catálogo, la grilla y las reservas para verlos sin señal), `expo-network` (aviso "Sin conexión" arriba de la app) |
| 8 | Sensores o háptica | `expo-haptics`: vibración distinta para ingreso válido e inválido al escanear |
| 9 | Multimedia | `expo-video` con controles para el recorrido de cada cancha (en la base de demo de la API ningún espacio trae video, así que se ve el aviso "Este espacio todavía no tiene video") |
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
  servicios/             Única puerta de entrada a los datos (API y copia local)
  contextos/             Sesión (AuthContext)
  componentes/           Componentes compartidos
  utilidades/            Funciones auxiliares (distancias, ids de turnos)
assets/                  Ícono y pantalla de presentación
```

**Ninguna pantalla habla directo con la API**: todo pasa por
`src/servicios/`, y todas las funciones son asíncronas. Los servicios usan
`src/servicios/api.ts`, que arma cada pedido con la dirección de la API y la
cabecera `Authorization: Bearer <token>`, y convierte los errores de la API
(`{ error: { codigo, mensaje } }`) y los problemas de red en un `ErrorApi`.
`src/servicios/cache.ts` guarda en el teléfono lo último que respondió la API
y lo devuelve cuando no hay señal.

La base de demo de la API trae los casos que pide el PRD: un día entero
bloqueado por lluvia (pasado mañana, canchas descubiertas), una grilla sin
turnos libres (`esp-04` mañana), espacios sin video, una reserva cancelada,
una fija que ocupa todos los martes (`esp-02`, 21 a 22) y una de dos horas.
Para probar el estado de error, en modo desarrollo las pantallas de
disponibilidad y de mis reservas tienen un botón "Probar error red", que le
pide a la API que responda con error (cabecera `X-Simular`).
