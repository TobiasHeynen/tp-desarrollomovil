import { useEffect, useState } from "react";
import { View, Text, Button, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { isRunningInExpoGo } from "expo";
import { Directory, File, Paths } from "expo-file-system/next";

//PERSONA B - recorrido en video del espacio (expo-video)
//se puede guardar en el telefono con expo-file-system (File, Directory, Paths)
//para verlo despues sin datos

interface PropsVideo {
    espacioId: string;
    videoUrl: string;
}

//busca si el video ya se guardo en el telefono, si no esta (o falla) devuelve null
function buscarVideoGuardado(espacioId: string): string | null {
    try {
        const archivo = new File(Paths.document, "videos", `${espacioId}.mp4`);
        return archivo.exists ? archivo.uri : null;
    } catch (e) {
        return null;
    }
}

export default function RecorridoVideo({ espacioId, videoUrl }: PropsVideo) {
    const [guardado, setGuardado] = useState<string | null>(() => buscarVideoGuardado(espacioId));
    const [descargando, setDescargando] = useState<boolean>(false);
    const [fallo, setFallo] = useState<boolean>(false);

    //si hay copia en el telefono se reproduce esa, si no, la de internet
    const fuente: string = guardado ?? videoUrl;
    const player = useVideoPlayer(fuente, (reproductor) => {
        reproductor.loop = false;
    });

    //si el video no se puede reproducir (link roto, sin red) se avisa en pantalla
    useEffect(() => {
        setFallo(false);
        const suscripcion = player.addListener("statusChange", (evento) => {
            if (evento.status === "error") setFallo(true);
        });
        return () => suscripcion.remove();
    }, [player]);

    function confirmarDescarga() {
        Alert.alert(
            "Guardar video",
            "Se va a descargar el video en tu teléfono. Puede usar datos móviles.",
            [
                { text: "Cancelar", style: "cancel" },
                { text: "Guardar", onPress: descargar },
            ]
        );
    }

    async function descargar(): Promise<void> {
        setDescargando(true);
        try {
            const carpeta = new Directory(Paths.document, "videos");
            if (!carpeta.exists) carpeta.create();

            const destino = new File(carpeta, `${espacioId}.mp4`);
            if (destino.exists) destino.delete();

            const archivo = await File.downloadFileAsync(videoUrl, destino);
            setGuardado(archivo.uri);
        } catch (e: any) {
            Alert.alert("No se pudo guardar el video", e.message ?? "Intentá de nuevo.");
        } finally {
            setDescargando(false);
        }
    }

    function borrarCopia() {
        try {
            if (guardado) new File(guardado).delete();
        } catch (e) {
            console.warn("No se pudo borrar el video guardado", e);
        }
        setGuardado(null);
    }

    return (
        <View style={styles.contenedor}>
            <VideoView player={player} style={styles.video} nativeControls contentFit="contain" />

            {fallo && (
                <Text style={styles.error}>
                    No se pudo reproducir el video. Revisá tu conexión e intentá de nuevo.
                </Text>
            )}

            {isRunningInExpoGo() ? (
                <Text style={styles.aviso}>
                    Para guardar el video en el teléfono hace falta la app instalada (APK).
                </Text>
            ) : guardado ? (
                <View style={styles.fila}>
                    <Text style={styles.aviso}>Video guardado en tu teléfono.</Text>
                    <Button title="Borrar copia" onPress={borrarCopia} />
                </View>
            ) : descargando ? (
                <View style={styles.fila}>
                    <ActivityIndicator />
                    <Text style={styles.aviso}>Guardando video…</Text>
                </View>
            ) : (
                <Button title="Guardar para ver sin conexión" onPress={confirmarDescarga} />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    contenedor: { gap: 8 },
    video: { width: "100%", height: 220, backgroundColor: "#000", borderRadius: 12 },
    fila: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    aviso: { fontStyle: "italic", color: "#777" },
    error: { color: "#B00020" },
});
