import { useCallback, useState } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    Button,
    ActivityIndicator,
    Alert,
    TouchableOpacity,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { agendaDelDia, listarFijas, marcarAusente, ItemAgenda } from "../../src/servicios/admin";
import { listarEspacios } from "../../src/servicios/espacios";
import { hoyISO, esTurnoPasado } from "../../src/servicios/turnos";
import { extraerInfoTurno } from "../../src/servicios/reservas";

//PERSONA E - agenda del dia de todos los espacios (PRD, seccion 6)
//junta las reservas del dia y las reservas fijas vigentes, ordenadas por hora

const NOMBRE_ESTADO: Record<string, string> = {
    ausente: "No se presentó",
    cumplida: "Cumplida",
};

export default function AgendaDelDia() {
    const router = useRouter();
    const [items, setItems] = useState<ItemAgenda[]>([]);
    const [cargando, setCargando] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    async function cargarAgenda(): Promise<void> {
        setError(null);
        try {
            const fecha: string = hoyISO();
            const [reservas, fijas, espacios] = await Promise.all([
                agendaDelDia(fecha),
                listarFijas(),
                listarEspacios(),
            ]);
            const nombres = new Map(espacios.datos.map((e) => [e.id, e.nombre.trim()]));
            const lista: ItemAgenda[] = [];

            for (const reserva of reservas) {
                const turno = extraerInfoTurno(reserva.turnoId);
                const estado: string =
                    reserva.estado === "confirmada"
                        ? reserva.ingresoEn
                            ? "Ingresó"
                            : "Pendiente"
                        : NOMBRE_ESTADO[reserva.estado] ?? reserva.estado;
                lista.push({
                    id: reserva.id,
                    espacioId: reserva.espacioId,
                    nombreEspacio: nombres.get(reserva.espacioId) ?? reserva.espacioId,
                    hora: turno.inicio,
                    detalle: `${turno.inicio} a ${turno.fin} hs · ${reserva.cantidadPersonas} personas`,
                    tipo: "reserva",
                    estado: estado,
                });
            }

            const diaSemana: number = new Date().getDay();
            for (const fija of fijas) {
                const vigente: boolean =
                    fija.activa &&
                    fija.dia === diaSemana &&
                    fija.desde <= fecha &&
                    (fija.hasta === null || fija.hasta >= fecha);
                if (!vigente) continue;
                lista.push({
                    id: fija.id,
                    espacioId: fija.espacioId,
                    nombreEspacio: nombres.get(fija.espacioId) ?? fija.espacioId,
                    hora: fija.inicio,
                    detalle: `${fija.inicio} a ${fija.fin} hs · ${fija.titular}`,
                    tipo: "fija",
                    estado: "Reserva fija",
                });
            }

            lista.sort((a, b) => a.hora.localeCompare(b.hora) || a.nombreEspacio.localeCompare(b.nombreEspacio));
            setItems(lista);
        } catch (e: any) {
            setError(e.message ?? "No pudimos cargar la agenda.");
        } finally {
            setCargando(false);
        }
    }

    //se recarga cada vez que se entra a la pantalla (por ejemplo al volver de escanear un QR)
    useFocusEffect(
        useCallback(() => {
            cargarAgenda();
        }, [])
    );

    function confirmarAusente(item: ItemAgenda) {
        Alert.alert("No se presentó", `${item.nombreEspacio}, ${item.hora} hs`, [
            { text: "Cancelar", style: "cancel" },
            {
                text: "Marcar ausente",
                style: "destructive",
                onPress: async () => {
                    try {
                        await marcarAusente(item.id);
                        await cargarAgenda();
                    } catch (e: any) {
                        Alert.alert("No se pudo marcar", e.message ?? "Intentá de nuevo.");
                    }
                },
            },
        ]);
    }

    if (cargando) {
        return (
            <View style={styles.centrado}>
                <ActivityIndicator size="large" color="#2E7D32" />
                <Text>Cargando agenda…</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centrado}>
                <Text style={styles.error}>{error}</Text>
                <Button title="Reintentar" onPress={cargarAgenda} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>
            <View style={styles.acciones}>
                <Button title="Escanear QR" onPress={() => router.push("/admin/escanear")} />
                <Button title="Bloquear turnos" onPress={() => router.push("/admin/bloqueos")} />
                <Button title="Reservas fijas" onPress={() => router.push("/admin/fijas")} />
                <Button title="Precios" onPress={() => router.push("/admin/precios")} />
            </View>

            <FlatList
                contentContainerStyle={styles.lista}
                data={items}
                keyExtractor={(item) => `${item.tipo}-${item.id}`}
                ListEmptyComponent={<Text style={styles.mensaje}>No hay turnos para hoy.</Text>}
                renderItem={({ item }) => (
                    <View style={styles.fila}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.titular}>{item.nombreEspacio}</Text>
                            <Text style={styles.detalle}>{item.detalle}</Text>
                            <Text style={styles.estado}>{item.estado}</Text>
                        </View>

                        {/* solo se marca ausente una reserva que no ingreso y cuyo turno ya empezo */}
                        {item.tipo === "reserva" && item.estado === "Pendiente" && esTurnoPasado(hoyISO(), item.hora) && (
                            <TouchableOpacity style={styles.botonAusente} onPress={() => confirmarAusente(item)}>
                                <Text style={styles.textoBoton}>No se presentó</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    centrado: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10, padding: 24 },
    acciones: { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 12 },
    lista: { padding: 16, gap: 6 },
    fila: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, backgroundColor: "#f2f2f2", borderRadius: 8 },
    titular: { fontWeight: "bold", fontSize: 14 },
    detalle: { color: "#444", fontSize: 12 },
    estado: { color: "#666", fontSize: 12, fontStyle: "italic" },
    mensaje: { padding: 24, textAlign: "center" },
    error: { color: "#B00020", textAlign: "center" },
    botonAusente: { backgroundColor: "#B00020", padding: 8, borderRadius: 6 },
    textoBoton: { color: "#fff", fontSize: 12 },
});