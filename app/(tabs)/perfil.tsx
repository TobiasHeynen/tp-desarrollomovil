import { View, Text, Button, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/contextos/AuthContext";

// PERSONA A — Autenticación y perfil.
// TODO: mostrar espaciosFavoritos, cancelacionesTardias y ausencias
// del Usuario. Si es "encargado" o "administrador", ofrecer acceso al
// panel /admin desde acá.

export default function Perfil() {
  const router = useRouter();
  const { usuario, cerrarSesion } = useAuth();

  if (!usuario) {
    return (
      <View style={styles.centro}>
        <Text style={{ marginBottom: 12 }}>No iniciaste sesión.</Text>
        <Button title="Iniciar sesión" onPress={() => router.push("/(auth)/login")} />
      </View>
    );
  }

  return (
    <View style={styles.centro}>
      <Text style={styles.nombre}>{usuario.nombre}</Text>
      <Text>{usuario.email}</Text>
      <Text style={{ marginTop: 8 }}>Rol: {usuario.rol}</Text>
      {usuario.rol !== "jugador" && (
        <Button title="Panel de encargado" onPress={() => router.push("/admin/agenda")} />
      )}
      <View style={{ height: 16 }} />
      <Button title="Cerrar sesión" onPress={cerrarSesion} color="#B00020" />
    </View>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 },
  nombre: { fontSize: 18, fontWeight: "700" },
});
