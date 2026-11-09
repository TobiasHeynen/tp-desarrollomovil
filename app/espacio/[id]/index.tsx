import { useEffect, useState } from "react";
import {
    View,
    Text,
    ScrollView,
    Image,
    Button,
    StyleSheet,
    ActivityIndicator,
    Linking,
    Alert,
    useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import MapView, { Marker } from "react-native-maps";
import { obtenerEspacio, alternarFavorito } from "../../../src/servicios/espacios";
import { useAuth } from "../../../src/contextos/AuthContext";
import RecorridoVideo from "../../../src/componentes/RecorridoVideo";
import { Espacio } from "../../../src/tipos";

//PERSONA B - ficha de un espacio
//fotos, datos, reglas, recorrido en video, ubicacion en el mapa y favorito

export default function FichaEspacio() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { usuario } = useAuth();
    const { width } = useWindowDimensions();
    const [espacio, setEspacio] = useState<Espacio | null>(null);
    const [cargando, setCargando] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [esFavorito, setEsFavorito] = useState<boolean>(false);
    const [guardandoFavorito, setGuardandoFavorito] = useState<boolean>(false);

    useEffect(() => {
        if (!id) return;
        cargar(id);
    }, [id]);

    //cada vez que cambia el usuario o el espacio se vuelve a ver si es favorito
    useEffect(() => {
        if (!usuario || !espacio) {
            setEsFavorito(false);
            return;
        }
        setEsFavorito(usuario.espaciosFavoritos.includes(espacio.id));
    }, [usuario, espacio]);

    async function cargar(espacioId: string): Promise<void> {
        setCargando(true);
        setError(null);
        try {
            const resultado: Espacio = await obtenerEspacio(espacioId);
            setEspacio(resultado);
        } catch (e: any) {
            setError(e.message ?? "No pudimos cargar el espacio. Probá de nuevo.");
        } finally {
            setCargando(false);
        }
    }

    async function manejarFavorito(): Promise<void> {
        if (!espacio) return;
        if (!usuario) {
            Alert.alert("Ingresá a tu cuenta", "Necesitás iniciar sesión para guardar favoritos.", [
                { text: "Ahora no", style: "cancel" },
                { text: "Ingresar", onPress: () => router.push("/(auth)/login") },
            ]);
            return;
        }

        setGuardandoFavorito(true);
        try {
            const favoritos: string[] = await alternarFavorito(usuario.id, espacio.id);
            setEsFavorito(favoritos.includes(espacio.id));
        } catch (e: any) {
            Alert.alert("No se pudo guardar", e.message ?? "Intentá de nuevo.");
        } finally {
            setGuardandoFavorito(false);
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
            <View style={styles.centrado}>
                <ActivityIndicator size="large" />
                <Text style={styles.mensaje}>Cargando espacio…</Text>
            </View>
        );
    }

    if (error || !espacio) {
        return (
            <View style={styles.centrado}>
                <Text style={styles.mensaje}>{error ?? "No encontramos ese espacio."}</Text>
                {id && <Button title="Reintentar" onPress={() => cargar(id)} />}
            </View>
        );
    }

    //las reglas vienen en un solo texto separado por puntos
    const reglas: string[] = espacio.reglas
        .split(".")
        .map((regla) => regla.trim())
        .filter((regla) => regla !== "");

    return (
        <ScrollView contentContainerStyle={styles.contenido}>
            {espacio.imagenes.length > 0 ? (
                <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
                    {espacio.imagenes.map((url, indice) => (
                        <Image
                            key={`${espacio.id}-${indice}`}
                            source={{ uri: url }}
                            style={[styles.foto, { width: width - 32 }]}
                        />
                    ))}
                </ScrollView>
            ) : (
                <View style={[styles.foto, styles.sinFoto, { width: width - 32 }]}>
                    <Text style={styles.textoSecundario}>Este espacio todavía no tiene fotos.</Text>
                </View>
            )}

            <Text style={styles.titulo}>{espacio.nombre.trim()}</Text>
            <Text style={styles.textoSecundario}>{espacio.complejo}</Text>
            <Text style={styles.precio}>${espacio.precioPorHora} por hora</Text>

            <Button
                title={esFavorito ? "Quitar de favoritos" : "Agregar a favoritos"}
                onPress={manejarFavorito}
                disabled={guardandoFavorito}
            />

            <Text style={styles.seccion}>Datos</Text>
            <Text style={styles.dato}>Superficie: {espacio.superficie}</Text>
            <Text style={styles.dato}>{espacio.techado ? "Techado" : "A cielo abierto"}</Text>
            <Text style={styles.dato}>
                {espacio.iluminacion ? "Con luz para jugar de noche" : "Sin luz artificial"}
            </Text>
            <Text style={styles.dato}>Capacidad: {espacio.capacidad} personas</Text>

            <Text style={styles.seccion}>Reglas</Text>
            {reglas.map((regla, indice) => (
                <Text key={indice} style={styles.dato}>
                    • {regla}
                </Text>
            ))}

            <Text style={styles.seccion}>Recorrido</Text>
            {espacio.videoUrl ? (
                <RecorridoVideo espacioId={espacio.id} videoUrl={espacio.videoUrl} />
            ) : (
                <Text style={styles.textoSecundario}>Este espacio todavía no tiene video.</Text>
            )}

            <Text style={styles.seccion}>Ubicación</Text>
            <MapView
                style={styles.mapa}
                initialRegion={{
                    latitude: espacio.coordenadas.latitud,
                    longitude: espacio.coordenadas.longitud,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
            >
                <Marker
                    coordinate={{
                        latitude: espacio.coordenadas.latitud,
                        longitude: espacio.coordenadas.longitud,
                    }}
                    title={espacio.nombre.trim()}
                />
            </MapView>
            <Button title="Cómo llegar" onPress={comoLlegar} />

            <View style={{ height: 8 }} />
            <Button title="Ver disponibilidad" onPress={() => router.push(`/espacio/${espacio.id}/disponibilidad`)} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    contenido: { padding: 16, gap: 8 },
    centrado: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
    mensaje: { textAlign: "center" },
    foto: { height: 200, borderRadius: 12, backgroundColor: "#ddd" },
    sinFoto: { alignItems: "center", justifyContent: "center" },
    titulo: { fontSize: 22, fontWeight: "700", marginTop: 8 },
    textoSecundario: { color: "#666" },
    precio: { fontSize: 18, fontWeight: "700", color: "#2E7D32" },
    seccion: { fontSize: 16, fontWeight: "700", marginTop: 12 },
    dato: { color: "#333" },
    mapa: { height: 180, borderRadius: 12 },
});
