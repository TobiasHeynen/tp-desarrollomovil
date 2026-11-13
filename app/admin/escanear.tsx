import { useEffect, useRef, useState } from "react";
import {
    View,
    Text,
    Button,
    StyleSheet,
    TextInput,
    Linking,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
} from "react-native";
import { CameraView, useCameraPermissions, BarcodeScanningResult } from "expo-camera";
import * as Haptics from "expo-haptics";
import Storage from "expo-sqlite/kv-store";
import { escanearIngreso } from "../../src/servicios/admin";
import { listarEspacios } from "../../src/servicios/espacios";
import { hayBiometria, pedirHuella } from "../../src/servicios/sesion";
import { leerTurnoId } from "../../src/utilidades/turnoId";
import { Reserva, Espacio } from "../../src/tipos";

//PERSONA D - escaneo del QR en la puerta con expo-camera
//el encargado elige en que cancha esta parado: la API valida que la reserva sea de hoy,
//de esa cancha y de ese horario, y si no, dice el motivo (otro dia, otra cancha, fuera de horario)
//vibracion distinta con expo-haptics: exito si el codigo es valido, error si no lo es
//antes de escanear se pide la huella (PRD: "el encargado reingresa con huella antes de escanear")

type Resultado = { ok: true; reserva: Reserva } | { ok: false; mensaje: string };

const CLAVE_CANCHA: string = "preferencias:canchaEscaner";

export default function EscanearIngreso() {
    const [permiso, pedirPermiso] = useCameraPermissions();
    const [resultado, setResultado] = useState<Resultado | null>(null);
    const [procesando, setProcesando] = useState<boolean>(false);
    const [codigoManual, setCodigoManual] = useState<string>("");
    const [espacios, setEspacios] = useState<Espacio[]>([]);
    const [espacioId, setEspacioId] = useState<string | null>(() => Storage.getItemSync(CLAVE_CANCHA));
    const [habilitado, setHabilitado] = useState<boolean>(false);
    const [mensajeHuella, setMensajeHuella] = useState<string | null>(null);
    //la camara lee el mismo QR muchas veces por segundo: este candado
    //deja pasar una sola lectura hasta que se toque "Escanear otro"
    const bloqueado = useRef<boolean>(false);

    useEffect(() => {
        listarEspacios()
            .then((r) => setEspacios(r.datos))
            .catch(() => setEspacios([]));
        confirmarIdentidad();
    }, []);

    async function confirmarIdentidad(): Promise<void> {
        setMensajeHuella(null);
        //si el telefono no tiene huella, alcanza con la sesion del encargado
        if (!(await hayBiometria())) {
            setHabilitado(true);
            return;
        }
        const resultadoHuella = await pedirHuella("Confirmá que sos el encargado para escanear");
        if (resultadoHuella === "ok") {
            setHabilitado(true);
        } else {
            setMensajeHuella("Para escanear ingresos tenés que confirmar tu identidad.");
        }
    }

    function elegirCancha(id: string) {
        setEspacioId(id);
        Storage.setItemSync(CLAVE_CANCHA, id);
    }

    async function procesarCodigo(codigo: string) {
        if (bloqueado.current || !espacioId) return;
        bloqueado.current = true;
        setProcesando(true);
        try {
            const reserva: Reserva = await escanearIngreso(codigo, espacioId);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setResultado({ ok: true, reserva: reserva });
        } catch (e: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setResultado({ ok: false, mensaje: e.message ?? "Ese QR no corresponde a esta reserva." });
        } finally {
            setProcesando(false);
        }
    }

    function manejarLectura(lectura: BarcodeScanningResult) {
        procesarCodigo(lectura.data);
    }

    function escanearOtro() {
        bloqueado.current = false;
        setResultado(null);
        setCodigoManual("");
    }

    function nombreDe(id: string): string {
        const espacio: Espacio | undefined = espacios.find((e) => e.id === id);
        return espacio ? espacio.nombre.trim() : id;
    }

    if (!habilitado) {
        return (
            <View style={styles.contenedor}>
                {mensajeHuella ? (
                    <>
                        <Text style={styles.detalle}>{mensajeHuella}</Text>
                        <Button title="Usar huella" onPress={confirmarIdentidad} />
                    </>
                ) : (
                    <ActivityIndicator size="large" />
                )}
            </View>
        );
    }

    if (resultado) {
        const turno = resultado.ok ? leerTurnoId(resultado.reserva.turnoId) : null;
        return (
            <View style={styles.contenedor}>
                <Text style={[styles.resultado, { color: resultado.ok ? "#2E7D32" : "#B00020" }]}>
                    {resultado.ok ? "Ingreso válido" : "Código inválido"}
                </Text>
                <Text style={styles.detalle}>
                    {resultado.ok
                        ? `${nombreDe(resultado.reserva.espacioId)} · ${turno ? turno.hora + " hs · " : ""}${resultado.reserva.cantidadPersonas} personas`
                        : resultado.mensaje}
                </Text>
                <Button title="Escanear otro" onPress={escanearOtro} />
            </View>
        );
    }

    //todavia se esta consultando si hay permiso
    if (!permiso) {
        return <View style={styles.contenedor} />;
    }

    return (
        <ScrollView contentContainerStyle={styles.contenedor}>
            <Text style={styles.titulo}>¿En qué cancha estás?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {espacios.map((e) => (
                    <TouchableOpacity
                        key={e.id}
                        style={[styles.chip, espacioId === e.id && styles.chipActivo]}
                        onPress={() => elegirCancha(e.id)}
                    >
                        <Text style={[styles.textoChip, espacioId === e.id && styles.textoChipActivo]}>
                            {e.nombre.trim()}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {!espacioId ? (
                <Text style={styles.detalle}>Elegí la cancha para empezar a escanear.</Text>
            ) : permiso.granted ? (
                <CameraView
                    style={styles.camara}
                    facing="back"
                    barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                    onBarcodeScanned={procesando ? undefined : manejarLectura}
                />
            ) : (
                <View style={styles.sinPermiso}>
                    <Text style={styles.detalle}>
                        Necesitamos la cámara para leer el QR. También podés ingresar el código a mano.
                    </Text>
                    {permiso.canAskAgain ? (
                        <Button title="Permitir cámara" onPress={pedirPermiso} />
                    ) : (
                        <Button title="Abrir ajustes" onPress={() => Linking.openSettings()} />
                    )}
                </View>
            )}

            <Text style={styles.detalle}>Si el QR no se lee, escribí el código:</Text>
            <TextInput
                style={styles.entrada}
                value={codigoManual}
                onChangeText={setCodigoManual}
                placeholder="VGY-0000-0000-00"
                placeholderTextColor="#888"
                autoCapitalize="characters"
                autoCorrect={false}
            />
            <Button
                title="Validar código"
                onPress={() => procesarCodigo(codigoManual.trim())}
                disabled={procesando || codigoManual.trim() === "" || !espacioId}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    contenedor: { flexGrow: 1, padding: 24, gap: 12, justifyContent: "center" },
    titulo: { fontSize: 16, fontWeight: "700", textAlign: "center" },
    chips: { gap: 8, paddingVertical: 4 },
    chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: "#eee" },
    chipActivo: { backgroundColor: "#2E7D32" },
    textoChip: { fontSize: 13, color: "#333" },
    textoChipActivo: { color: "#fff", fontWeight: "600" },
    camara: { height: 300, borderRadius: 12, overflow: "hidden" },
    sinPermiso: { gap: 12, padding: 16, borderRadius: 12, backgroundColor: "#f2f2f2" },
    detalle: { textAlign: "center", color: "#444" },
    resultado: { fontSize: 22, fontWeight: "700", textAlign: "center" },
    entrada: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, color: "#222" },
});
