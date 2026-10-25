import { useEffect, useRef, useState } from "react";
import { View, Text, Button, StyleSheet, ActivityIndicator, Linking } from "react-native";
import { useRouter } from "expo-router";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { listarEspacios } from "../../src/servicios/espacios";
import { distanciaEnKm } from "../../src/utilidades/distancia";
import { Espacio, Coordenadas } from "../../src/tipos";

//PERSONA B - mapa con un marcador por complejo (react-native-maps)
//expo-location se usa para centrar en el complejo mas cercano
//si el usuario niega la ubicacion el mapa se ve igual, con todos los complejos

interface Complejo {
    nombre: string;
    coordenadas: Coordenadas;
    cantidadEspacios: number;
}

type EstadoPermiso = "pendiente" | "concedido" | "denegado";

//junta los espacios que son del mismo complejo
function agruparPorComplejo(espacios: Espacio[]): Complejo[] {
    const complejos: Complejo[] = [];
    for (const espacio of espacios) {
        const existente: Complejo | undefined = complejos.find((c) => c.nombre === espacio.complejo);
        if (existente) {
            existente.cantidadEspacios += 1;
        } else {
            complejos.push({
                nombre: espacio.complejo,
                coordenadas: espacio.coordenadas,
                cantidadEspacios: 1,
            });
        }
    }
    return complejos;
}

//el complejo con menor distancia al punto dado
function buscarMasCercano(complejos: Complejo[], punto: Coordenadas): Complejo | null {
    let masCercano: Complejo | null = null;
    let menorDistancia: number = Infinity;
    for (const complejo of complejos) {
        const distancia: number = distanciaEnKm(punto, complejo.coordenadas);
        if (distancia < menorDistancia) {
            menorDistancia = distancia;
            masCercano = complejo;
        }
    }
    return masCercano;
}

export default function MapaGeneral() {
    const router = useRouter();
    const mapa = useRef<MapView>(null);
    const [complejos, setComplejos] = useState<Complejo[]>([]);
    const [cargando, setCargando] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [permiso, setPermiso] = useState<EstadoPermiso>("pendiente");
    const [puedePreguntar, setPuedePreguntar] = useState<boolean>(true);
    const [ubicacion, setUbicacion] = useState<Coordenadas | null>(null);
    const [elegido, setElegido] = useState<Complejo | null>(null);
    const [mapaListo, setMapaListo] = useState<boolean>(false);

    useEffect(() => {
        cargarComplejos();
        pedirUbicacion();
    }, []);

    //cuando el mapa esta listo y hay datos se mueve la camara
    useEffect(() => {
        if (!mapaListo || complejos.length === 0) return;

        const cercano: Complejo | null = ubicacion ? buscarMasCercano(complejos, ubicacion) : null;
        if (cercano) {
            setElegido(cercano);
            mapa.current?.animateToRegion(
                {
                    latitude: cercano.coordenadas.latitud,
                    longitude: cercano.coordenadas.longitud,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                },
                600
            );
        } else {
            mapa.current?.fitToCoordinates(
                complejos.map((c) => ({
                    latitude: c.coordenadas.latitud,
                    longitude: c.coordenadas.longitud,
                })),
                { edgePadding: { top: 120, right: 80, bottom: 200, left: 80 }, animated: true }
            );
        }
    }, [mapaListo, complejos, ubicacion]);

    async function cargarComplejos(): Promise<void> {
        setCargando(true);
        setError(null);
        try {
            const respuesta = await listarEspacios();
            setComplejos(agruparPorComplejo(respuesta.datos));
        } catch (e) {
            setError("No pudimos cargar los complejos. Probá de nuevo.");
        } finally {
            setCargando(false);
        }
    }

    //la app no espera a la ubicacion para mostrar el mapa
    async function pedirUbicacion(): Promise<void> {
        try {
            const respuesta = await Location.requestForegroundPermissionsAsync();
            if (!respuesta.granted) {
                setPermiso("denegado");
                setPuedePreguntar(respuesta.canAskAgain);
                return;
            }
            setPermiso("concedido");
            const posicion = await Location.getCurrentPositionAsync({});
            setUbicacion({ latitud: posicion.coords.latitude, longitud: posicion.coords.longitude });
        } catch (e) {
            //por ejemplo el GPS apagado: el mapa sigue mostrando todos los complejos
            console.warn("No se pudo obtener la ubicacion", e);
        }
    }

    function verEspacios(complejo: Complejo) {
        router.push({ pathname: "/", params: { complejo: complejo.nombre } });
    }

    function textoDistancia(complejo: Complejo): string {
        if (!ubicacion) return "";
        const km: number = distanciaEnKm(ubicacion, complejo.coordenadas);
        return ` · a ${km.toFixed(1).replace(".", ",")} km`;
    }

    if (cargando) {
        return (
            <View style={styles.centrado}>
                <ActivityIndicator size="large" />
                <Text style={styles.mensaje}>Cargando mapa…</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centrado}>
                <Text style={styles.mensaje}>{error}</Text>
                <Button title="Reintentar" onPress={cargarComplejos} />
            </View>
        );
    }

    if (complejos.length === 0) {
        return (
            <View style={styles.centrado}>
                <Text style={styles.mensaje}>Todavía no hay complejos para mostrar.</Text>
            </View>
        );
    }

    return (
        <View style={styles.contenedor}>
            <MapView
                ref={mapa}
                style={styles.mapa}
                initialRegion={{
                    latitude: complejos[0].coordenadas.latitud,
                    longitude: complejos[0].coordenadas.longitud,
                    latitudeDelta: 0.5,
                    longitudeDelta: 0.5,
                }}
                showsUserLocation={permiso === "concedido"}
                onMapReady={() => setMapaListo(true)}
            >
                {complejos.map((c) => (
                    <Marker
                        key={c.nombre}
                        coordinate={{ latitude: c.coordenadas.latitud, longitude: c.coordenadas.longitud }}
                        title={c.nombre}
                        description={`${c.cantidadEspacios} espacios`}
                        onPress={() => setElegido(c)}
                    />
                ))}
            </MapView>

            {permiso === "denegado" && (
                <View style={styles.banner}>
                    <Text style={styles.textoBanner}>
                        Sin ubicación: te mostramos todos los complejos.
                    </Text>
                    {puedePreguntar ? (
                        <Button title="Permitir ubicación" onPress={pedirUbicacion} />
                    ) : (
                        <Button title="Abrir ajustes" onPress={() => Linking.openSettings()} />
                    )}
                </View>
            )}

            {elegido && (
                <View style={styles.tarjeta}>
                    <Text style={styles.nombre}>{elegido.nombre}</Text>
                    <Text style={styles.detalle}>
                        {elegido.cantidadEspacios} espacios{textoDistancia(elegido)}
                    </Text>
                    <Button title="Ver espacios" onPress={() => verEspacios(elegido)} />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    contenedor: { flex: 1 },
    mapa: { flex: 1 },
    centrado: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
    mensaje: { textAlign: "center" },
    banner: {
        position: "absolute",
        top: 12,
        left: 12,
        right: 12,
        padding: 12,
        borderRadius: 12,
        backgroundColor: "#fff",
        gap: 6,
    },
    textoBanner: { textAlign: "center", color: "#444" },
    tarjeta: {
        position: "absolute",
        bottom: 16,
        left: 16,
        right: 16,
        padding: 16,
        borderRadius: 12,
        backgroundColor: "#fff",
        gap: 6,
    },
    nombre: { fontSize: 16, fontWeight: "700" },
    detalle: { color: "#555" },
});
