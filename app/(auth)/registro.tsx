import { useState } from "react";
import { View, TextInput, Button, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { registrarUsuario } from "../../src/servicios/auth";
import { useAuth } from "../../src/contextos/AuthContext";

// PERSONA A — Autenticación.
export default function Registro() {
  const router = useRouter();
  const { iniciarSesion } = useAuth();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function manejarRegistro() {
    try {
      const { usuario, token } = await registrarUsuario({ nombre, email, telefono });
      iniciarSesion(usuario, token);
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e.message ?? "No pudimos crear la cuenta.");
    }
  }

  return (
    <View style={styles.contenedor}>
      <TextInput style={styles.input} placeholder="Nombre" value={nombre} onChangeText={setNombre} />
      <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="Teléfono" keyboardType="phone-pad" value={telefono} onChangeText={setTelefono} />
      {error && <Text style={styles.error}>{error}</Text>}
      <Button title="Crear cuenta" onPress={manejarRegistro} />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12 },
  error: { color: "#B00020" },
});
