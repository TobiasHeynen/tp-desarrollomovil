import { useState } from "react";
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    ScrollView,
    Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { iniciarSesion as iniciarSesionServicio, esEmailValido } from "../../src/servicios/auth";
import { useAuth } from "../../src/contextos/AuthContext";

//TOBIAS - ingreso con email y contraseña
//al entrar vuelve a la pantalla desde donde se vino (por ejemplo la grilla, para terminar de reservar)

export default function Login() {
    const router = useRouter();
    const { iniciarSesion } = useAuth();
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [enviando, setEnviando] = useState<boolean>(false);

    function validar(): string | null {
        if (!esEmailValido(email)) return "Escribí un email válido.";
        if (password === "") return "Escribí tu contraseña.";
        return null;
    }

    async function manejarLogin(): Promise<void> {
        const problema: string | null = validar();
        if (problema) {
            setError(problema);
            return;
        }

        setError(null);
        setEnviando(true);
        try {
            const { usuario, token } = await iniciarSesionServicio(email, password);
            await iniciarSesion(usuario, token);
            if (router.canGoBack()) {
                router.back();
            } else {
                router.replace("/(tabs)");
            }
        } catch (e: any) {
            setError(e.message ?? "No pudimos iniciar sesión.");
        } finally {
            setEnviando(false);
        }
    }

    return (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <ScrollView contentContainerStyle={styles.contenedor} keyboardShouldPersistTaps="handled">
                <Text style={styles.titulo}>Reservas Deportivas</Text>
                <Text style={styles.subtitulo}>Ingresá para reservar turnos y ver tus reservas.</Text>

                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#888"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    autoComplete="email"
                    value={email}
                    onChangeText={setEmail}
                    editable={!enviando}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Contraseña"
                    placeholderTextColor="#888"
                    secureTextEntry
                    autoComplete="password"
                    value={password}
                    onChangeText={setPassword}
                    onSubmitEditing={manejarLogin}
                    editable={!enviando}
                />

                {error && <Text style={styles.error}>{error}</Text>}

                <TouchableOpacity style={styles.botonPrimario} onPress={manejarLogin} disabled={enviando}>
                    {enviando ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.textoBotonPrimario}>Ingresar</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.botonSecundario}
                    onPress={() => router.push("/(auth)/registro")}
                    disabled={enviando}
                >
                    <Text style={styles.textoBotonSecundario}>No tengo cuenta, crear una</Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    contenedor: { flexGrow: 1, justifyContent: "center", padding: 24, gap: 12 },
    titulo: { fontSize: 24, fontWeight: "700", color: "#1B5E20", textAlign: "center" },
    subtitulo: { color: "#666", textAlign: "center", marginBottom: 8 },
    input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, color: "#222", backgroundColor: "#fff" },
    error: { color: "#B00020" },
    botonPrimario: { backgroundColor: "#2E7D32", paddingVertical: 14, borderRadius: 10, alignItems: "center" },
    textoBotonPrimario: { color: "#fff", fontWeight: "700", fontSize: 15 },
    botonSecundario: { paddingVertical: 10, alignItems: "center" },
    textoBotonSecundario: { color: "#2E7D32", fontWeight: "600" },
});
