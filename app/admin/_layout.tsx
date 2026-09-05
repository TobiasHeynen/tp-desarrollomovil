import { Stack } from "expo-router";

// PERSONA E — Panel de encargado/administrador + persistencia/red.
// TODO: proteger este grupo de rutas -- si `usuario.rol === "jugador"`,
// redirigir afuera (ver AuthContext). Reusa la misma app y login, "con
// cuenta de encargado o de administrador" (PRD, sección 6).

export default function LayoutAdmin() {
  return (
    <Stack>
      <Stack.Screen name="agenda" options={{ title: "Agenda del día" }} />
      <Stack.Screen name="escanear" options={{ title: "Escanear ingreso" }} />
      <Stack.Screen name="bloqueos" options={{ title: "Bloquear turnos" }} />
      <Stack.Screen name="fijas" options={{ title: "Reservas fijas" }} />
      <Stack.Screen name="precios" options={{ title: "Precios" }} />
    </Stack>
  );
}
