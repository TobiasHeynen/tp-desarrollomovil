import { Stack } from "expo-router";
import { AuthProvider } from "../src/contextos/AuthContext";

// PERSONA A: acá es donde, una vez resuelto `cargando` del AuthContext,
// se decide redirigir a (auth)/login o dejar pasar a (tabs).
// Ver PRD: "no pidan cuenta para mirar la disponibilidad" -> el listado
// de espacios y su ficha son públicos; la cuenta hace falta recién para
// reservar (ver app/espacio/[id]/disponibilidad.tsx).

export default function LayoutRaiz() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: true }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="espacio/[id]/index" options={{ title: "Espacio" }} />
        <Stack.Screen name="espacio/[id]/disponibilidad" options={{ title: "Disponibilidad" }} />
        <Stack.Screen name="reserva/[id]" options={{ title: "Mi reserva" }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}
