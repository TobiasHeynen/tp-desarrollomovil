import { useEffect, useState } from "react";
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useAuth, ResultadoDesbloqueo } from "../contextos/AuthContext";

//TOBIAS - pantalla de reingreso
//se dibuja encima de toda la app cuando hay una sesion guardada esperando confirmacion
//primero prueba con huella/rostro; si el telefono no tiene, pide la contraseña

export default function PantallaBloqueo() {
    const { usuarioBloqueado, desbloquear, desbloquearConPassword, seguirSinIngresar, cerrarSesion } = useAuth();
    const [conPassword, setConPassword] = useState<boolean>(false);
    const [password, setPassword] = useState<string>("");
    const [mensaje, setMensaje] = useState<string | null>(null);
    const [esperando, setEsperando] = useState<boolean>(false);

    //apenas aparece se pide la huella, sin que haga falta tocar nada
    useEffect(() => {
        probarHuella();
    }, []);

    async function probarHuella(): Promise<void> {
        setMensaje(null);
        setEsperando(true);
        try {
            const resultado: ResultadoDesbloqueo = await desbloquear();
            if (resultado === "sin_biometria") {
                setConPassword(true);
                setMensaje("Tu teléfono no tiene huella ni rostro configurados. Ingresá tu contraseña.");
            } else if (resultado === "fallo") {
                setMensaje("No pudimos reconocerte. Probá de nuevo o usá tu contraseña.");
            }
        } catch (e) {
            setConPassword(true);
            setMensaje("No pudimos usar la huella. Ingresá tu contraseña.");
        } finally {
            setEsperando(false);
        }
    }

    async function entrarConPassword(): Promise<void> {
        if (password === "") {
            setMensaje("Escribí tu contraseña.");
            return;
        }
        setMensaje(null);
        setEsperando(true);
        try {
            await desbloquearConPassword(password);
        } catch (e: any) {
            setMensaje(e.message ?? "No pudimos validar tu contraseña.");
        } finally {
            setEsperando(false);
        }
    }

    return (
        <KeyboardAvoidingView
            style={[StyleSheet.absoluteFill, styles.fondo]}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <View style={styles.caja}>
                <Ionicons name="lock-closed-outline" size={48} color="#2E7D32" />
                <Text style={styles.titulo}>Hola, {usuarioBloqueado?.nombre}</Text>
                <Text style={styles.subtitulo}>{usuarioBloqueado?.email}</Text>

                {conPassword ? (
                    <>
                        <TextInput
                            style={styles.input}
                            placeholder="Contraseña"
                            placeholderTextColor="#888"
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                            onSubmitEditing={entrarConPassword}
                            editable={!esperando}
                        />
                        <TouchableOpacity style={styles.botonPrimario} onPress={entrarConPassword} disabled={esperando}>
                            <Text style={styles.textoBotonPrimario}>Ingresar</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <TouchableOpacity style={styles.botonPrimario} onPress={probarHuella} disabled={esperando}>
                        <Ionicons name="finger-print-outline" size={20} color="#fff" />
                        <Text style={styles.textoBotonPrimario}>Desbloquear</Text>
                    </TouchableOpacity>
                )}

                {esperando && <ActivityIndicator color="#2E7D32" />}
                {mensaje && <Text style={styles.mensaje}>{mensaje}</Text>}

                {!conPassword && (
                    <TouchableOpacity onPress={() => setConPassword(true)}>
                        <Text style={styles.enlace}>Usar mi contraseña</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity onPress={seguirSinIngresar} disabled={esperando}>
                    <Text style={styles.enlace}>Seguir sin ingresar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={cerrarSesion}>
                    <Text style={styles.enlace}>No soy yo, cerrar sesión</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    fondo: { backgroundColor: "#1B5E20", justifyContent: "center", padding: 24 },
    caja: { backgroundColor: "#fff", borderRadius: 16, padding: 24, gap: 12, alignItems: "center" },
    titulo: { fontSize: 20, fontWeight: "700", color: "#222" },
    subtitulo: { color: "#666", marginTop: -8 },
    input: {
        alignSelf: "stretch",
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        padding: 12,
        color: "#222",
    },
    botonPrimario: {
        alignSelf: "stretch",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
        backgroundColor: "#2E7D32",
        paddingVertical: 12,
        borderRadius: 10,
    },
    textoBotonPrimario: { color: "#fff", fontWeight: "700", fontSize: 15 },
    mensaje: { color: "#B00020", textAlign: "center" },
    enlace: { color: "#2E7D32", fontWeight: "600", paddingVertical: 4 },
});
