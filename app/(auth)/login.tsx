import { useState } from "react";
import { View, TextInput, Button, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { iniciarSesion as iniciarSesionServicio } from "../../src/servicios/auth";
import { useAuth } from "../../src/contextos/AuthContext";

// PERSONA A — Autenticación.
// TODO: validaciones de formulario, mostrar error de "CREDENCIALES_INVALIDAS",
// y guardar el token en expo-secure-store desde AuthContext.iniciarSesion.

export default function Login() {
  const router = useRouter();
  const { iniciarSesion } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function manejarLogin() {
    try {
      const { usuario, token } = await iniciarSesionServicio(email, password);
      iniciarSesion(usuario, token);
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e.message ?? "No pudimos iniciar sesión.");
    }
  }

  return (
    <View style={styles.contenedor}>
      <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="Contraseña" secureTextEntry value={password} onChangeText={setPassword} />
      {error && <Text style={styles.error}>{error}</Text>}
      <Button title="Ingresar" onPress={manejarLogin} />
      <Button title="Crear cuenta" onPress={() => router.push("/(auth)/registro")} />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12 },
  error: { color: "#B00020" },
});
