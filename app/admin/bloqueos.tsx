import { useEffect, useState } from "react";
import {
    View,
    Text,
    TextInput,
    Button,
    StyleSheet,
    Alert,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { bloquearTurnos } from "../../src/servicios/admin";
import { listarEspacios } from "../../src/servicios/espacios";
import { hoyISO } from "../../src/servicios/turnos";
import { Espacio } from "../../src/tipos";

// PERSONA E — Bloquear turnos o días enteros con un motivo escrito.

export default function Bloqueos() {
    const [espacios, setEspacios] = useState<Espacio[]>([]);
    const [espacioId, setEspacioId] = useState("");
    const [fecha, setFecha] = useState(hoyISO());
    const [horas, setHoras] = useState("");
    const [motivo, setMotivo] = useState("");
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        cargarEspacios();
    }, []);

    async function cargarEspacios(): Promise<void> {
        setCargando(true);
        setError(null);
        try {
            const respuesta = await listarEspacios();
            setEspacios(respuesta.datos);
        } catch (e: any) {
            setError(e.message ?? "No pudimos cargar los espacios.");
        } finally {
            setCargando(false);
        }
    }

    async function guardar(): Promise<void> {
        if (!espacioId || !fecha.trim() || !motivo.trim()) {
            Alert.alert("Datos incompletos", "Completá el espacio, la fecha y el motivo.");
            return;
        }

        const listaHoras: string[] = horas
            .split(",")
            .map((hora) => hora.trim())
            .filter((hora) => hora.length > 0);

        setGuardando(true);
        try {
            await bloquearTurnos({
                espacioId: espacioId,
                fecha: fecha.trim(),
                horas: listaHoras.length > 0 ? listaHoras : undefined,
                motivo: motivo,
            });
            Alert.alert(
                "Bloqueo guardado",
                listaHoras.length > 0
                    ? "Los horarios seleccionados fueron bloqueados."
                    : "El día completo fue bloqueado."
            );
            setHoras("");
            setMotivo("");
        } catch (e: any) {
            Alert.alert("No se pudo guardar", e.message ?? "Intentá de nuevo.");
        } finally {
            setGuardando(false);
        }
    }

    if (cargando) {
        return (
            <View style={styles.centrado}>
                <ActivityIndicator size="large" color="#2E7D32" />
                <Text>Cargando espacios…</Text>
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
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <ScrollView contentContainerStyle={styles.contenedor} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets={true}>
                <Text style={styles.label}>1. Elegí el espacio:</Text>
                <View style={styles.chips}>
                    {espacios.map((espacio) => (
                        <TouchableOpacity
                            key={espacio.id}
                            style={[styles.chip, espacioId === espacio.id && styles.chipActivo]}
                            onPress={() => setEspacioId(espacio.id)}
                        >
                            <Text style={[styles.textoChip, espacioId === espacio.id && styles.textoChipActivo]}>
                                {espacio.nombre.trim()}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.label}>2. Fecha del bloqueo:</Text>
                <View style={styles.filaFecha}>
                    <TextInput
                        style={[styles.input, { flex: 1 }]}
                        placeholder="AAAA-MM-DD"
                        value={fecha}
                        onChangeText={setFecha}
                    />
                    <Button title="Hoy" onPress={() => setFecha(hoyISO())} />
                </View>

                <Text style={styles.label}>3. Horarios (opcional):</Text>
                <Text style={styles.ayuda}>
                    Dejá vacío para bloquear el día completo. Para bloquear turnos puntuales, escribí sus horarios en punto separados por comas.
                </Text>
                <TextInput
                    style={styles.input}
                    placeholder="Ej. 10:00, 11:00, 18:00"
                    value={horas}
                    onChangeText={setHoras}
                />

                <Text style={styles.label}>4. Motivo del bloqueo:</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Ej. Lluvia, mantenimiento de césped…"
                    value={motivo}
                    onChangeText={setMotivo}
                />

                <View style={{ height: 12 }} />
                <Button
                    title={guardando ? "Guardando…" : "Guardar bloqueo"}
                    onPress={guardar}
                    color="#B00020"
                    disabled={guardando}
                />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    centrado: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10, padding: 24 },
    mensaje: { textAlign: "center" },
    contenedor: { flexGrow: 1, justifyContent: "center", padding: 24, gap: 12 },
    label: { fontWeight: "bold", fontSize: 14, color: "#333", marginTop: 8 },
    ayuda: { color: "#666", fontSize: 12 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: { padding: 10, borderRadius: 8, backgroundColor: "#eee" },
    chipActivo: { backgroundColor: "#2E7D32" },
    textoChip: { fontSize: 12, color: "#333" },
    textoChipActivo: { color: "#fff", fontWeight: "bold" },
    input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12 },
    filaFecha: { flexDirection: "row", alignItems: "center", gap: 8 },
});