import { Redirect, Stack } from "expo-router";
import { useAuth } from "../../src/contextos/AuthContext";

// PERSONA E — Panel de encargado/administrador.
// Es la misma app y el mismo login, "con cuenta de encargado o de administrador"
// (PRD, sección 6). Si entra alguien sin sesión o con rol jugador, vuelve a las
// pestañas. Igual la API controla los permisos de cada pedido (SIN_PERMISO).

export default function LayoutAdmin() {
  const { usuario } = useAuth();

  if (!usuario || usuario.rol === "jugador") {
    return <Redirect href="/(tabs)" />;
  }

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
