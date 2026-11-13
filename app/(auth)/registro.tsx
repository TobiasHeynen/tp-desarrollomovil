import { useState } from "react";
import {
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
import {
    registrarUsuario,
    esEmailValido,
    esTelefonoValido,
    LARGO_MINIMO_PASSWORD,
} from "../../src/servicios/auth";
import { useAuth } from "../../src/contextos/AuthContext";

//TOBIAS - registro de una cuenta nueva (siempre con rol jugador)
//los encargados y administradores los da de alta la municipalidad, no se registran desde la app

export default function Registro() {
    const router = useRouter();
    const { iniciarSesion } = useAuth();
    const [nombre, setNombre] = useState<string>("");
    const [email, setEmail] = useState<string>("");
    const [telefono, setTelefono] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [repetir, setRepetir] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [enviando, setEnviando] = useState<boolean>(false);

    function validar(): string | null {
        if (nombre.trim().length < 2) return "Escribí tu nombre.";
        if (!esEmailValido(email)) return "Escribí un email válido.";
        //el telefono sirve para que la Direccion de Deportes pueda avisar si se suspende un turno
        if (!esTelefonoValido(telefono)) return "Escribí un teléfono válido: solo números, espacios o guiones.";
        if (password.length < LARGO_MINIMO_PASSWORD) {
            return `La contraseña tiene que tener al menos ${LARGO_MINIMO_PASSWORD} caracteres.`;
        }
        if (password !== repetir) return "Las contraseñas no coinciden.";
        return null;
    }

    async function manejarRegistro(): Promise<void> {
        const problema: string | null = validar();
        if (problema) {
            setError(problema);
            return;
        }

        setError(null);
        setEnviando(true);
        try {
            const { usuario, token } = await registrarUsuario({ nombre, email, telefono, password });
            await iniciarSesion(usuario, token);
            //se cierran registro y login juntos y se vuelve a donde estaba la persona
            if (router.canDismiss()) {
                router.dismiss(2);
            } else {
                router.replace("/(tabs)");
            }
        } catch (e: any) {
            setError(e.message ?? "No pudimos crear la cuenta.");
        } finally {
            setEnviando(false);
        }
    }

    return (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <ScrollView contentContainerStyle={styles.contenedor} keyboardShouldPersistTaps="handled">
                <TextInput
                    style={styles.input}
                    placeholder="Nombre y apellido"
                    placeholderTextColor="#888"
                    autoComplete="name"
                    value={nombre}
                    onChangeText={setNombre}
                    editable={!enviando}
                />
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
                    placeholder="Teléfono (ej. 3455-401122)"
                    placeholderTextColor="#888"
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    value={telefono}
                    onChangeText={setTelefono}
                    editable={!enviando}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Contraseña"
                    placeholderTextColor="#888"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    editable={!enviando}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Repetí la contraseña"
                    placeholderTextColor="#888"
                    secureTextEntry
                    value={repetir}
                    onChangeText={setRepetir}
                    onSubmitEditing={manejarRegistro}
                    editable={!enviando}
                />

                {error && <Text style={styles.error}>{error}</Text>}

                <TouchableOpacity style={styles.botonPrimario} onPress={manejarRegistro} disabled={enviando}>
                    {enviando ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.textoBotonPrimario}>Crear cuenta</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    contenedor: { flexGrow: 1, justifyContent: "center", padding: 24, gap: 12 },
    input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, color: "#222", backgroundColor: "#fff" },
    error: { color: "#B00020" },
    botonPrimario: { backgroundColor: "#2E7D32", paddingVertical: 14, borderRadius: 10, alignItems: "center" },
    textoBotonPrimario: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
