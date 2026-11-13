import { useCallback, useState } from "react";
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Switch,
    Alert,
    ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useAuth } from "../../src/contextos/AuthContext";
import { listarEspacios } from "../../src/servicios/espacios";
import { UMBRAL_CANCELADOR_TARDIO } from "../../src/servicios/reservas";
import { Espacio, Rol } from "../../src/tipos";

//TOBIAS - perfil de la persona
//muestra sus datos, sus espacios favoritos, las cancelaciones tardias y ausencias (el PRD pide que
//quien cancela tarde varias veces "quede marcado"), la preferencia de huella y el acceso al panel

const NOMBRE_ROL: Record<Rol, string> = {
    jugador: "Jugador",
    encargado: "Encargado",
    administrador: "Administrador",
};

export default function Perfil() {
    const router = useRouter();
    const { usuario, cerrarSesion, refrescarUsuario, pedirHuellaAlAbrir, cambiarPedirHuella } = useAuth();
    const [favoritos, setFavoritos] = useState<Espacio[]>([]);
    const [cargandoFavoritos, setCargandoFavoritos] = useState<boolean>(false);
    const [errorFavoritos, setErrorFavoritos] = useState<boolean>(false);

    const idsFavoritos: string = usuario ? usuario.espaciosFavoritos.join(",") : "";

    //cada vez que se entra a la pestaña se traen los datos al dia
    //(por ejemplo si se agrego un favorito o se cancelo tarde una reserva)
    useFocusEffect(
        useCallback(() => {
            refrescarUsuario();
        }, [usuario?.id])
    );

    useFocusEffect(
        useCallback(() => {
            cargarFavoritos();
        }, [idsFavoritos])
    );

    async function cargarFavoritos(): Promise<void> {
        if (!usuario || usuario.espaciosFavoritos.length === 0) {
            setFavoritos([]);
            return;
        }
        setCargandoFavoritos(true);
        setErrorFavoritos(false);
        try {
            const respuesta = await listarEspacios();
            setFavoritos(respuesta.datos.filter((e) => usuario.espaciosFavoritos.includes(e.id)));
        } catch (e) {
            setErrorFavoritos(true);
        } finally {
            setCargandoFavoritos(false);
        }
    }

    function confirmarCierre() {
        Alert.alert("Cerrar sesión", "¿Querés salir de tu cuenta en este teléfono?", [
            { text: "Cancelar", style: "cancel" },
            { text: "Cerrar sesión", style: "destructive", onPress: cerrarSesion },
        ]);
    }

    if (!usuario) {
        return (
            <View style={styles.centro}>
                <Ionicons name="person-circle-outline" size={72} color="#9E9E9E" />
                <Text style={styles.textoSinSesion}>
                    No iniciaste sesión. Podés mirar los espacios y la disponibilidad, pero para reservar
                    necesitás una cuenta.
                </Text>
                <TouchableOpacity style={styles.botonPrimario} onPress={() => router.push("/(auth)/login")}>
                    <Text style={styles.textoBotonPrimario}>Ingresar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/(auth)/registro")}>
                    <Text style={styles.enlace}>Crear una cuenta</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const marcado: boolean = usuario.cancelacionesTardias >= UMBRAL_CANCELADOR_TARDIO;

    return (
        <ScrollView contentContainerStyle={styles.contenido}>
            <View style={styles.encabezado}>
                <Ionicons name="person-circle-outline" size={64} color="#2E7D32" />
                <View style={styles.flex}>
                    <Text style={styles.nombre}>{usuario.nombre}</Text>
                    <Text style={styles.dato}>{usuario.email}</Text>
                    <Text style={styles.dato}>{usuario.telefono}</Text>
                    <Text style={styles.rol}>{NOMBRE_ROL[usuario.rol]}</Text>
                </View>
            </View>

            <Text style={styles.seccion}>Mi historial</Text>
            <View style={styles.fila}>
                <View style={styles.contador}>
                    <Text style={styles.numero}>{usuario.cancelacionesTardias}</Text>
                    <Text style={styles.etiqueta}>Cancelaciones tardías</Text>
                </View>
                <View style={styles.contador}>
                    <Text style={styles.numero}>{usuario.ausencias}</Text>
                    <Text style={styles.etiqueta}>Ausencias</Text>
                </View>
            </View>
            {marcado && (
                <Text style={styles.aviso}>
                    Cancelaste tarde varias veces. Recordá cancelar con más de 4 horas de anticipación
                    para que otro grupo pueda usar la cancha.
                </Text>
            )}

            <Text style={styles.seccion}>Espacios favoritos</Text>
            <Text style={styles.ayuda}>Te avisamos cuando se libera un turno en tus favoritos.</Text>
            {cargandoFavoritos ? (
                <ActivityIndicator color="#2E7D32" />
            ) : errorFavoritos ? (
                <TouchableOpacity onPress={cargarFavoritos}>
                    <Text style={styles.error}>No pudimos cargar tus favoritos. Tocá para reintentar.</Text>
                </TouchableOpacity>
            ) : favoritos.length === 0 ? (
                <Text style={styles.dato}>
                    Todavía no tenés favoritos. Marcalos desde la ficha de cada espacio.
                </Text>
            ) : (
                favoritos.map((espacio) => (
                    <TouchableOpacity
                        key={espacio.id}
                        style={styles.favorito}
                        onPress={() => router.push(`/espacio/${espacio.id}`)}
                    >
                        <Ionicons name="star" size={18} color="#F9A825" />
                        <View style={styles.flex}>
                            <Text style={styles.nombreFavorito}>{espacio.nombre.trim()}</Text>
                            <Text style={styles.dato}>{espacio.complejo}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#999" />
                    </TouchableOpacity>
                ))
            )}

            <Text style={styles.seccion}>Seguridad</Text>
            <View style={styles.filaSwitch}>
                <Text style={[styles.dato, styles.flex]}>Pedir huella o rostro al abrir la app</Text>
                <Switch value={pedirHuellaAlAbrir} onValueChange={cambiarPedirHuella} />
            </View>

            {usuario.rol !== "jugador" && (
                <TouchableOpacity style={styles.botonPrimario} onPress={() => router.push("/admin/agenda")}>
                    <Text style={styles.textoBotonPrimario}>Panel de encargado</Text>
                </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.botonSalir} onPress={confirmarCierre}>
                <Text style={styles.textoBotonSalir}>Cerrar sesión</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    centro: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
    textoSinSesion: { textAlign: "center", color: "#555" },
    contenido: { padding: 16, gap: 10 },
    encabezado: { flexDirection: "row", alignItems: "center", gap: 12 },
    nombre: { fontSize: 20, fontWeight: "700", color: "#222" },
    dato: { color: "#555" },
    rol: { marginTop: 4, alignSelf: "flex-start", color: "#2E7D32", fontWeight: "700" },
    seccion: { fontSize: 16, fontWeight: "700", marginTop: 12, color: "#222" },
    ayuda: { fontSize: 12, color: "#777", marginTop: -6 },
    fila: { flexDirection: "row", gap: 10 },
    contador: { flex: 1, backgroundColor: "#F2F2F2", borderRadius: 10, padding: 12, alignItems: "center" },
    numero: { fontSize: 24, fontWeight: "700", color: "#1B5E20" },
    etiqueta: { fontSize: 12, color: "#555", textAlign: "center" },
    aviso: { backgroundColor: "#FFEBEE", color: "#C62828", padding: 10, borderRadius: 8 },
    error: { color: "#B00020" },
    favorito: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        padding: 12,
        backgroundColor: "#F2F2F2",
        borderRadius: 10,
    },
    nombreFavorito: { fontWeight: "600", color: "#222" },
    filaSwitch: { flexDirection: "row", alignItems: "center", gap: 8 },
    botonPrimario: {
        backgroundColor: "#2E7D32",
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        alignItems: "center",
        marginTop: 12,
    },
    textoBotonPrimario: { color: "#fff", fontWeight: "700" },
    enlace: { color: "#2E7D32", fontWeight: "600" },
    botonSalir: {
        borderWidth: 1,
        borderColor: "#C62828",
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: "center",
        marginTop: 8,
    },
    textoBotonSalir: { color: "#C62828", fontWeight: "700" },
});
