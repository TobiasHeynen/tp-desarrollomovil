import { useEffect, useRef, useState } from "react";
import {
    View,
    Text,
    FlatList,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Button,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { listarEspacios, listarDeportes, listarComplejos } from "../../src/servicios/espacios";
import TarjetaEspacio from "../../src/componentes/TarjetaEspacio";
import { Espacio, Deporte } from "../../src/tipos";

//PERSONA B - listado de espacios con filtro por deporte y por complejo
//tiene estados de carga, vacio y error

interface PropsChip {
    texto: string;
    activo: boolean;
    alPresionar: () => void;
}

//boton chico de filtro
function Chip({ texto, activo, alPresionar }: PropsChip) {
    return (
        <TouchableOpacity
            style={[styles.chip, activo && styles.chipActivo]}
            onPress={alPresionar}
        >
            <Text style={[styles.textoChip, activo && styles.textoChipActivo]}>{texto}</Text>
        </TouchableOpacity>
    );
}

export default function ListadoEspacios() {
    const router = useRouter();
    //el mapa manda el complejo elegido por parametro
    const { complejo: complejoParam } = useLocalSearchParams<{ complejo?: string }>();

    const [espacios, setEspacios] = useState<Espacio[]>([]);
    const [deportes, setDeportes] = useState<Deporte[]>([]);
    const [complejos, setComplejos] = useState<string[]>([]);
    const [deporteElegido, setDeporteElegido] = useState<string | null>(null);
    const [complejoElegido, setComplejoElegido] = useState<string | null>(null);
    const [cargando, setCargando] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    //si el usuario cambia de filtro rapido, una respuesta vieja no tiene que pisar a la nueva
    const ultimoPedido = useRef<number>(0);

    useEffect(() => {
        cargarFiltros();
    }, []);

    useEffect(() => {
        if (complejoParam) setComplejoElegido(complejoParam);
    }, [complejoParam]);

    useEffect(() => {
        cargarEspacios();
    }, [deporteElegido, complejoElegido]);

    async function cargarFiltros(): Promise<void> {
        try {
            const respuesta = await listarDeportes();
            setDeportes(respuesta.datos);
            setComplejos(await listarComplejos());
        } catch (e) {
            //sin filtros la lista igual funciona
            console.warn("No se pudieron cargar los filtros", e);
        }
    }

    async function cargarEspacios(): Promise<void> {
        ultimoPedido.current += 1;
        const numeroDePedido: number = ultimoPedido.current;
        setCargando(true);
        setError(null);
        try {
            const respuesta = await listarEspacios({
                deporteId: deporteElegido ?? undefined,
                complejo: complejoElegido ?? undefined,
            });
            if (numeroDePedido !== ultimoPedido.current) return;
            setEspacios(respuesta.datos);
        } catch (e) {
            if (numeroDePedido !== ultimoPedido.current) return;
            setError("No pudimos cargar los espacios. Probá de nuevo.");
        } finally {
            if (numeroDePedido === ultimoPedido.current) setCargando(false);
        }
    }

    //se mantiene el parametro sincronizado para que el mapa pueda volver a elegir el mismo complejo
    function elegirComplejo(complejo: string | null) {
        setComplejoElegido(complejo);
        router.setParams({ complejo: complejo ?? "" });
    }

    function limpiarFiltros() {
        setDeporteElegido(null);
        elegirComplejo(null);
    }

    const hayFiltros: boolean = deporteElegido !== null || complejoElegido !== null;

    function mostrarContenido() {
        if (cargando) {
            return (
                <View style={styles.centrado}>
                    <ActivityIndicator size="large" />
                    <Text style={styles.mensaje}>Cargando espacios…</Text>
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

        if (espacios.length === 0) {
            return (
                <View style={styles.centrado}>
                    <Text style={styles.mensaje}>No hay espacios para este filtro.</Text>
                    {hayFiltros && <Button title="Limpiar filtros" onPress={limpiarFiltros} />}
                </View>
            );
        }

        return (
            <FlatList
                contentContainerStyle={styles.lista}
                data={espacios}
                keyExtractor={(e) => e.id}
                renderItem={({ item }) => (
                    <TarjetaEspacio
                        espacio={item}
                        deporte={deportes.find((d) => d.id === item.deporteId)}
                        alPresionar={() => router.push(`/espacio/${item.id}`)}
                    />
                )}
            />
        );
    }

    return (
        <View style={styles.contenedor}>
            <View style={styles.filtros}>
                <Text style={styles.tituloFiltro}>Deporte</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                    <Chip texto="Todos" activo={deporteElegido === null} alPresionar={() => setDeporteElegido(null)} />
                    {deportes.map((d) => (
                        <Chip
                            key={d.id}
                            texto={d.nombre}
                            activo={deporteElegido === d.id}
                            alPresionar={() => setDeporteElegido(d.id)}
                        />
                    ))}
                </ScrollView>

                <Text style={styles.tituloFiltro}>Complejo</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                    <Chip texto="Todos" activo={complejoElegido === null} alPresionar={() => elegirComplejo(null)} />
                    {complejos.map((c) => (
                        <Chip
                            key={c}
                            texto={c}
                            activo={complejoElegido === c}
                            alPresionar={() => elegirComplejo(c)}
                        />
                    ))}
                </ScrollView>
            </View>

            {mostrarContenido()}
        </View>
    );
}

const styles = StyleSheet.create({
    contenedor: { flex: 1 },
    filtros: { paddingTop: 12, paddingHorizontal: 16, gap: 6 },
    tituloFiltro: { fontSize: 12, fontWeight: "700", color: "#777" },
    chips: { gap: 8, paddingBottom: 6 },
    chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: "#eee" },
    chipActivo: { backgroundColor: "#2E7D32" },
    textoChip: { fontSize: 13, color: "#333" },
    textoChipActivo: { color: "#fff", fontWeight: "600" },
    lista: { padding: 16, gap: 12 },
    centrado: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
    mensaje: { textAlign: "center" },
});
