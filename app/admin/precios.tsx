import { useEffect, useState } from "react";
import {
    FlatList,
    Text,
    View,
    StyleSheet,
    TextInput,
    Button,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { listarEspacios } from "../../src/servicios/espacios";
import { cambiarPrecio } from "../../src/servicios/admin";
import { guardarEspaciosLocal, leerEspaciosLocal } from "../../src/servicios/catalogoLocal";
import { Espacio } from "../../src/tipos";

//PERSONA E - cambiar el precio por hora de un espacio (PRD, seccion 6)

export default function Precios() {
    const [espacios, setEspacios] = useState<Espacio[]>([]);
    const [cargando, setCargando] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [guardandoId, setGuardandoId] = useState<string | null>(null);
    const [edicion, setEdicion] = useState<Record<string, string>>({});

    useEffect(() => {
        cargarEspacios();
    }, []);

    async function cargarEspacios(): Promise<void> {
        setCargando(true);
        setError(null);
        try {
            const respuesta = await listarEspacios();
            setEspacios(respuesta.datos);
            // se guarda en la base local para poder mostrarlo aunque no haya conexion
            await guardarEspaciosLocal(respuesta.datos);
        } catch (e: any) {
            // Si falla lee la base local para mostrar algo aunque no haya conexion
            try {
                const cache = await leerEspaciosLocal();
                if (cache.length > 0) {
                    setEspacios(cache);
                } else {
                    setError("No hay conexión y no hay datos guardados en el teléfono.");
                }
            } catch (errCache) {
                setError("No pudimos cargar los espacios ni desde el teléfono.");
            }
        } finally {
            setCargando(false);
        }
    }

    async function guardar(id: string): Promise<void> {
        const nuevo: number = Number((edicion[id] ?? "").trim());
        setGuardandoId(id);
        try {
            await cambiarPrecio(id, nuevo);
            setEspacios((prev) => prev.map((e) => (e.id === id ? { ...e, precioPorHora: nuevo } : e)));
            setEdicion((prev) => ({ ...prev, [id]: "" }));
            Alert.alert("Precio actualizado", `Ahora cuesta $${nuevo} por hora.`);
        } catch (e: any) {
            Alert.alert("No se pudo guardar", e.message ?? "Intentá de nuevo.");
        } finally {
            setGuardandoId(null);
        }
    }

    if (cargando) {
        return (
            <View style={styles.centrado}>
                <ActivityIndicator size="large" color="#2E7D32" />
                <Text>Cargando precios…</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centrado}>
                <Text style={styles.mensaje}>{error}</Text>
                <Button title="Reintentar" onPress={cargarEspacios} />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <FlatList
                contentContainerStyle={styles.lista}
                data={espacios}
                keyExtractor={(espacio) => espacio.id}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={<Text style={styles.vacio}>No hay espacios para mostrar.</Text>}
                renderItem={({ item }) => (
                    <View style={styles.fila}>
                        <View style={styles.datosEspacio}>
                            <Text style={styles.nombre}>{item.nombre.trim()}</Text>
                            <Text style={styles.precioActual}>Precio actual: ${item.precioPorHora}</Text>
                        </View>

                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            placeholder="Nuevo precio"
                            value={edicion[item.id] ?? ""}
                            onChangeText={(valor) => setEdicion((prev) => ({ ...prev, [item.id]: valor }))}
                            editable={guardandoId !== item.id}
                        />

                        <Button
                            title={guardandoId === item.id ? "…" : "Guardar"}
                            onPress={() => guardar(item.id)}
                            disabled={guardandoId !== null}
                        />
                    </View>
                )}
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    centrado: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10, padding: 24 },
    mensaje: { textAlign: "center" },
    lista: { padding: 16, gap: 8 },
    fila: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, backgroundColor: "#f2f2f2", borderRadius: 8 },
    datosEspacio: { flex: 1 },
    nombre: { fontWeight: "bold" },
    precioActual: { color: "#666", fontSize: 11, marginTop: 3 },
    input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 6, padding: 6, width: 95 },
    vacio: { textAlign: "center", padding: 20 },
});