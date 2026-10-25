import { useEffect, useState } from "react";
import { View, Text, Button, StyleSheet, Alert, ActivityIndicator, Linking } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useLocalSearchParams, useRouter } from "expo-router";
import { obtenerReserva, cancelarReserva } from "../../src/servicios/reservas";
import { obtenerEspacio } from "../../src/servicios/espacios";
import { guardarReservaLocal, leerReservaLocal } from "../../src/servicios/reservasLocal";
import {
    programarRecordatorio,
    cancelarRecordatorio,
    ResultadoRecordatorio,
} from "../../src/servicios/notificaciones";
import { leerTurnoId, DatosTurno } from "../../src/utilidades/turnoId";
import { Reserva, Espacio, ErrorApi } from "../../src/tipos";

//PERSONA D - ingreso el dia del turno + notificaciones
//muestra el QR de la reserva (se guarda en expo-sqlite para verlo sin conexion)
//y programa el recordatorio 2 hs antes

const MENSAJE_RECORDATORIO: Record<ResultadoRecordatorio, string | null> = {
    programado: "Te vamos a avisar 2 horas antes del turno.",
    sin_permiso: "Activá las notificaciones para que te avisemos 2 horas antes.",
    muy_tarde: "El turno empieza en menos de 2 horas: no hay recordatorio previo.",
    no_aplica: null,
};

//busca el espacio para mostrar su nombre, si falla (por ejemplo sin red) sigue sin el
async function cargarEspacio(espacioId: string): Promise<Espacio | null> {
    try {
        return await obtenerEspacio(espacioId);
    } catch (e) {
        return null;
    }
}

export default function DetalleReserva() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [reserva, setReserva] = useState<Reserva | null>(null);
    const [espacio, setEspacio] = useState<Espacio | null>(null);
    const [cargando, setCargando] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [desdeCopiaLocal, setDesdeCopiaLocal] = useState<boolean>(false);
    const [recordatorio, setRecordatorio] = useState<ResultadoRecordatorio | null>(null);
    const [cancelando, setCancelando] = useState<boolean>(false);

    useEffect(() => {
        if (!id) return;
        cargar(id);
    }, [id]);

    async function guardarCopiaLocal(r: Reserva): Promise<void> {
        try {
            await guardarReservaLocal(r);
        } catch (e) {
            console.warn("No se pudo guardar la reserva local", e);
        }
    }

    async function prepararRecordatorio(r: Reserva, nombreEspacio?: string): Promise<void> {
        try {
            const resultado: ResultadoRecordatorio = await programarRecordatorio(r, nombreEspacio);
            setRecordatorio(resultado);
        } catch (e) {
            console.warn("No se pudo programar el recordatorio", e);
        }
    }

    //sin conexion: se usa la copia guardada en el telefono, si la hay
    async function usarCopiaLocal(reservaId: string): Promise<void> {
        let guardada: Reserva | null = null;
        try {
            guardada = await leerReservaLocal(reservaId);
        } catch (e) {
            guardada = null;
        }

        if (!guardada) {
            setError("Sin conexión, y esta reserva todavía no se guardó en el teléfono.");
            return;
        }
        setReserva(guardada);
        setDesdeCopiaLocal(true);
        setCargando(false);
        await prepararRecordatorio(guardada);
    }

    async function cargar(reservaId: string): Promise<void> {
        setCargando(true);
        setError(null);
        try {
            const r: Reserva = await obtenerReserva(reservaId);
            const espacioCargado: Espacio | null = await cargarEspacio(r.espacioId);
            await guardarCopiaLocal(r);
            setReserva(r);
            setEspacio(espacioCargado);
            setDesdeCopiaLocal(false);
            setCargando(false);
            await prepararRecordatorio(r, espacioCargado?.nombre);
        } catch (e: any) {
            if (e instanceof ErrorApi) {
                //la API dice que la reserva no existe: no tiene sentido mostrar una copia
                setError(e.message);
            } else {
                await usarCopiaLocal(reservaId);
            }
        } finally {
            setCargando(false);
        }
    }

    async function manejarCancelar() {
        if (!id) return;
        setCancelando(true);
        try {
            const cancelada: Reserva = await cancelarReserva(id);
            await cancelarRecordatorio(id);
            await guardarCopiaLocal(cancelada); //asi sin conexion no se ve un QR viejo
            Alert.alert("Reserva cancelada");
            router.back();
        } catch (e: any) {
            Alert.alert("No se pudo cancelar", e.message ?? "Intentá de nuevo.");
        } finally {
            setCancelando(false);
        }
    }

    function comoLlegar() {
        if (!espacio) return;
        const { latitud, longitud } = espacio.coordenadas;
        Linking.openURL(
            `https://www.google.com/maps/dir/?api=1&destination=${latitud},${longitud}`
        ).catch(() => Alert.alert("No se pudo abrir el mapa"));
    }

    if (cargando) {
        return (
            <View style={styles.contenedor}>
                <ActivityIndicator size="large" />
                <Text style={styles.ayuda}>Cargando tu reserva…</Text>
            </View>
        );
    }

    if (error || !reserva) {
        return (
            <View style={styles.contenedor}>
                <Text style={styles.mensaje}>{error ?? "No encontramos esa reserva."}</Text>
                <View style={{ height: 12 }} />
                {id && <Button title="Reintentar" onPress={() => cargar(id)} />}
            </View>
        );
    }

    const turno: DatosTurno | null = leerTurnoId(reserva.turnoId);
    const vigente: boolean = reserva.estado === "confirmada";

    return (
        <View style={styles.contenedor}>
            <Text style={styles.titulo}>
                {vigente ? "Reserva confirmada" : `Reserva ${reserva.estado}`}
            </Text>
            <Text style={styles.detalle}>{espacio?.nombre ?? reserva.espacioId}</Text>
            {turno && (
                <Text style={styles.detalle}>
                    {turno.fecha} · {turno.hora} hs · {reserva.cantidadPersonas} personas
                </Text>
            )}

            <View style={styles.qrMarco}>
                {vigente ? (
                    <QRCode value={reserva.codigoQr} size={200} />
                ) : (
                    <Text style={styles.qrInvalido}>Este QR ya no es válido.</Text>
                )}
            </View>
            {vigente && <Text style={styles.codigo}>{reserva.codigoQr}</Text>}
            {vigente && <Text style={styles.ayuda}>Mostráselo al encargado en la puerta.</Text>}

            {desdeCopiaLocal && (
                <Text style={styles.aviso}>
                    Sin conexión: mostrando la copia guardada en tu teléfono.
                </Text>
            )}
            {vigente && recordatorio && MENSAJE_RECORDATORIO[recordatorio] && (
                <Text style={styles.aviso}>{MENSAJE_RECORDATORIO[recordatorio]}</Text>
            )}

            <View style={{ height: 24 }} />
            <Button title="Cómo llegar" onPress={comoLlegar} disabled={!espacio} />
            {vigente && (
                <>
                    <View style={{ height: 8 }} />
                    <Button
                        title="Cancelar reserva"
                        color="#B00020"
                        onPress={manejarCancelar}
                        disabled={cancelando}
                    />
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    contenedor: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    titulo: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
    detalle: { color: "#444", marginBottom: 2 },
    mensaje: { textAlign: "center" },
    qrMarco: {
        width: 232,
        height: 232,
        marginTop: 20,
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
    },
    qrInvalido: { color: "#777", textAlign: "center" },
    codigo: { marginTop: 10, fontFamily: "monospace" },
    ayuda: { marginTop: 12, color: "#666" },
    aviso: { marginTop: 10, fontStyle: "italic", color: "#777", textAlign: "center" },
});
