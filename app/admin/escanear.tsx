import { useRef, useState } from "react";
import { View, Text, Button, StyleSheet, TextInput, Linking } from "react-native";
import { CameraView, useCameraPermissions, BarcodeScanningResult } from "expo-camera";
import * as Haptics from "expo-haptics";
import { escanearIngreso } from "../../src/servicios/admin";
import { Reserva } from "../../src/tipos";

//PERSONA D - escaneo del QR en la puerta con expo-camera
//vibracion distinta con expo-haptics: exito si el codigo es valido, error si no lo es

type Resultado = { ok: true; reserva: Reserva } | { ok: false; mensaje: string };

export default function EscanearIngreso() {
    const [permiso, pedirPermiso] = useCameraPermissions();
    const [resultado, setResultado] = useState<Resultado | null>(null);
    const [procesando, setProcesando] = useState<boolean>(false);
    const [codigoManual, setCodigoManual] = useState<string>("");
    //la camara lee el mismo QR muchas veces por segundo: este candado
    //deja pasar una sola lectura hasta que se toque "Escanear otro"
    const bloqueado = useRef<boolean>(false);

    async function procesarCodigo(codigo: string) {
        if (bloqueado.current) return;
        bloqueado.current = true;
        setProcesando(true);
        try {
            const reserva: Reserva = await escanearIngreso(codigo);
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

    if (resultado) {
        return (
            <View style={styles.contenedor}>
                <Text style={[styles.resultado, { color: resultado.ok ? "#2E7D32" : "#B00020" }]}>
                    {resultado.ok ? "Ingreso válido" : "Código inválido"}
                </Text>
                <Text style={styles.detalle}>
                    {resultado.ok
                        ? `Reserva ${resultado.reserva.id} · ${resultado.reserva.espacioId} · ${resultado.reserva.cantidadPersonas} personas`
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
        <View style={styles.contenedor}>
            {permiso.granted ? (
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
                autoCapitalize="characters"
                autoCorrect={false}
            />
            <Button
                title="Validar código"
                onPress={() => procesarCodigo(codigoManual.trim())}
                disabled={procesando || codigoManual.trim() === ""}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    contenedor: { flex: 1, padding: 24, gap: 12, justifyContent: "center" },
    camara: { height: 300, borderRadius: 12, overflow: "hidden" },
    sinPermiso: { gap: 12, padding: 16, borderRadius: 12, backgroundColor: "#f2f2f2" },
    detalle: { textAlign: "center", color: "#444" },
    resultado: { fontSize: 22, fontWeight: "700", textAlign: "center" },
    entrada: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10 },
});
