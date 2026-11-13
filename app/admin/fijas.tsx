import { useEffect, useState } from "react";
import {
    FlatList,
    Text,
    View,
    StyleSheet,
    ActivityIndicator,
    TextInput,
    Button,
    Alert,
    TouchableOpacity,
} from "react-native";
import { listarFijas, crearFija, editarFija, alternarFija } from "../../src/servicios/admin";
import { listarEspacios } from "../../src/servicios/espacios";
import { hoyISO } from "../../src/servicios/turnos";
import { ReservaFija, Espacio } from "../../src/tipos";

//PERSONA E - cargar y editar las reservas fijas (PRD, seccion 6)
//se pueden dar de alta, editar y activar o desactivar

const DIAS: string[] = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default function ReservasFijas() {
    const [fijas, setFijas] = useState<ReservaFija[]>([]);
    const [espacios, setEspacios] = useState<Espacio[]>([]);
    const [cargando, setCargando] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [guardando, setGuardando] = useState<boolean>(false);

    //formulario: sirve para dar de alta (editandoId = null) y para editar una fija existente
    const [mostrarForm, setMostrarForm] = useState<boolean>(false);
    const [editandoId, setEditandoId] = useState<string | null>(null);
    const [espacioId, setEspacioId] = useState<string>("");
    const [titular, setTitular] = useState<string>("");
    const [dia, setDia] = useState<string>("2");
    const [inicio, setInicio] = useState<string>("21:00");
    const [fin, setFin] = useState<string>("22:00");

    useEffect(() => {
        cargarDatos();
    }, []);

    async function cargarDatos(): Promise<void> {
        setError(null);
        try {
            const [resFijas, resEspacios] = await Promise.all([listarFijas(), listarEspacios()]);
            setFijas(resFijas);
            setEspacios(resEspacios.datos);
        } catch (e: any) {
            setError(e.message ?? "No pudimos cargar las reservas fijas.");
        } finally {
            setCargando(false);
        }
    }

    function cerrarFormulario() {
        setMostrarForm(false);
        setEditandoId(null);
        setEspacioId("");
        setTitular("");
        setDia("2");
        setInicio("21:00");
        setFin("22:00");
    }

    //carga los datos de la fija en el formulario para editarla
    function abrirEdicion(fija: ReservaFija) {
        setEditandoId(fija.id);
        setEspacioId(fija.espacioId);
        setTitular(fija.titular);
        setDia(String(fija.dia));
        setInicio(fija.inicio);
        setFin(fija.fin);
        setMostrarForm(true);
    }

    async function guardarFija(): Promise<void> {
        const diaNumero: number = Number(dia);
        if (!espacioId || !titular.trim() || !inicio.trim() || !fin.trim()) {
            Alert.alert("Datos incompletos", "Completá todos los campos.");
            return;
        }
        if (!Number.isInteger(diaNumero) || diaNumero < 0 || diaNumero > 6) {
            Alert.alert("Día inválido", "Ingresá un número entre 0 (domingo) y 6 (sábado).");
            return;
        }

        setGuardando(true);
        try {
            if (editandoId) {
                await editarFija(editandoId, {
                    titular: titular,
                    dia: diaNumero as ReservaFija["dia"],
                    inicio: inicio.trim(),
                    fin: fin.trim(),
                });
                Alert.alert("Reserva fija actualizada");
            } else {
                await crearFija({
                    espacioId: espacioId,
                    titular: titular,
                    dia: diaNumero as ReservaFija["dia"],
                    inicio: inicio.trim(),
                    fin: fin.trim(),
                    desde: hoyISO(),
                    hasta: null,
                });
                Alert.alert("Reserva fija guardada");
            }
            cerrarFormulario();
            await cargarDatos();
        } catch (e: any) {
            Alert.alert("No se pudo guardar", e.message ?? "Intentá de nuevo.");
        } finally {
            setGuardando(false);
        }
    }

    async function alternar(id: string): Promise<void> {
        try {
            await alternarFija(id);
            await cargarDatos();
        } catch (e: any) {
            Alert.alert("No se pudo cambiar", e.message ?? "Intentá de nuevo.");
        }
    }

    if (cargando) {
        return (
            <View style={styles.centrado}>
                <ActivityIndicator size="large" color="#2E7D32" />
                <Text>Cargando reservas fijas…</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centrado}>
                <Text style={styles.mensaje}>{error}</Text>
                <Button title="Reintentar" onPress={cargarDatos} />
            </View>
        );
    }

    const nombres = new Map(espacios.map((e) => [e.id, e.nombre.trim()]));

    return (
        <View style={{ flex: 1 }}>
            <Button
                title={mostrarForm ? "Cancelar" : "Nueva reserva fija"}
                onPress={() => (mostrarForm ? cerrarFormulario() : setMostrarForm(true))}
                color="#2E7D32"
            />

            {mostrarForm && (
                <View style={styles.formulario}>
                    <Text style={styles.label}>Espacio:</Text>
                    {editandoId ? (
                        //al editar el espacio no se cambia: se muestra solo cual es
                        <Text>{nombres.get(espacioId) ?? espacioId}</Text>
                    ) : (
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
                    )}

                    <Text style={styles.label}>Titular:</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ej. Grupo de los martes"
                        value={titular}
                        onChangeText={setTitular}
                    />

                    <Text style={styles.label}>Horario (en punto):</Text>
                    <View style={styles.fila}>
                        <TextInput
                            style={[styles.input, { flex: 1 }]}
                            placeholder="Inicio (21:00)"
                            value={inicio}
                            onChangeText={setInicio}
                        />
                        <TextInput
                            style={[styles.input, { flex: 1 }]}
                            placeholder="Fin (22:00)"
                            value={fin}
                            onChangeText={setFin}
                        />
                    </View>

                    <Text style={styles.label}>Día de la semana (0 = domingo, 6 = sábado):</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Día (0 a 6)"
                        value={dia}
                        onChangeText={setDia}
                        keyboardType="numeric"
                    />

                    <Button
                        title={guardando ? "Guardando…" : editandoId ? "Guardar cambios" : "Guardar"}
                        onPress={guardarFija}
                        disabled={guardando}
                    />
                </View>
            )}

            <FlatList
                contentContainerStyle={styles.lista}
                data={fijas}
                keyExtractor={(fija) => fija.id}
                ListEmptyComponent={<Text style={styles.vacio}>No hay reservas fijas cargadas.</Text>}
                renderItem={({ item }) => (
                    <View style={styles.filaReserva}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.titular}>{item.titular}</Text>
                            <Text>
                                {nombres.get(item.espacioId) ?? item.espacioId} · {DIAS[item.dia]}
                            </Text>
                            <Text>
                                {item.inicio} - {item.fin}
                            </Text>
                            <Text style={[styles.estado, !item.activa && styles.inactiva]}>
                                {item.activa ? "Vigente" : "Inactiva"}
                            </Text>
                        </View>
                        <View style={styles.botones}>
                            <Button title="Editar" onPress={() => abrirEdicion(item)} />
                            <Button title={item.activa ? "Desactivar" : "Activar"} onPress={() => alternar(item.id)} />
                        </View>
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    centrado: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10, padding: 24 },
    mensaje: { textAlign: "center" },
    formulario: { padding: 16, backgroundColor: "#e8f5e9", gap: 8 },
    label: { fontWeight: "bold", fontSize: 12 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: { padding: 6, borderRadius: 6, backgroundColor: "#fff" },
    chipActivo: { backgroundColor: "#2E7D32" },
    textoChip: { fontSize: 10 },
    textoChipActivo: { color: "#fff", fontWeight: "bold" },
    input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#ccc", borderRadius: 6, padding: 8 },
    fila: { flexDirection: "row", gap: 8 },
    lista: { padding: 16, gap: 8 },
    filaReserva: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, backgroundColor: "#f2f2f2", borderRadius: 10 },
    botones: { gap: 6 },
    titular: { fontWeight: "600" },
    estado: { color: "#2E7D32", fontSize: 12 },
    inactiva: { color: "#B00020" },
    vacio: { textAlign: "center", padding: 24, color: "#666" },
});