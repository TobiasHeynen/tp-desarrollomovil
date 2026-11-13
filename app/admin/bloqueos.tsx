import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from "react-native";
import { bloquearTurnos, listarBloqueos, quitarBloqueo, Bloqueo } from "../../src/servicios/admin";
import { listarEspacios } from "../../src/servicios/espacios";
import { obtenerProximosDias } from "../../src/servicios/turnos";
import SelectorChips, { horasDelDia, OpcionChip } from "../../src/componentes/SelectorChips";
import { fechaCorta } from "../../src/utilidades/turnoId";
import { Espacio } from "../../src/tipos";

// PERSONA E — Bloquear turnos o días enteros por mantenimiento o lluvia, con un
// motivo escrito (PRD, sección 6). Se pueden elegir varios espacios a la vez
// (por ejemplo, todas las canchas descubiertas un día de lluvia).
// La API cancela las reservas de esos turnos; la app de cada jugador lo detecta
// y le avisa con una notificación.

export default function Bloqueos() {
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [elegidos, setElegidos] = useState<string[]>([]);
  const dias = useMemo(() => obtenerProximosDias(7), []);
  const [fecha, setFecha] = useState<string>(dias[0].fecha);
  const [diaEntero, setDiaEntero] = useState<boolean>(true);
  const [inicio, setInicio] = useState<string>("08:00");
  const [fin, setFin] = useState<string>("12:00");
  const [motivo, setMotivo] = useState<string>("");
  const [guardando, setGuardando] = useState<boolean>(false);

  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([]);
  const [cargandoLista, setCargandoLista] = useState<boolean>(true);
  const [errorLista, setErrorLista] = useState<string | null>(null);

  const cargarBloqueos = useCallback(() => {
    setCargandoLista(true);
    setErrorLista(null);
    listarBloqueos()
      .then(setBloqueos)
      .catch((e: any) => setErrorLista(e.message ?? "No pudimos cargar los bloqueos."))
      .finally(() => setCargandoLista(false));
  }, []);

  useEffect(() => {
    listarEspacios()
      .then((r) => setEspacios(r.datos))
      .catch(() => {});
    cargarBloqueos();
  }, [cargarBloqueos]);

  function alternarEspacio(id: string) {
    setElegidos((prev) => (prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]));
  }

  function nombreDe(id: string): string {
    return espacios.find((e) => e.id === id)?.nombre.trim() ?? id;
  }

  async function guardar() {
    if (elegidos.length === 0) {
      Alert.alert("Elegí al menos un espacio.");
      return;
    }
    if (motivo.trim() === "") {
      Alert.alert("Escribí el motivo del bloqueo.");
      return;
    }
    if (!diaEntero && inicio >= fin) {
      Alert.alert("El horario de inicio tiene que ser antes del fin.");
      return;
    }

    setGuardando(true);
    try {
      await bloquearTurnos({
        espacioIds: elegidos,
        fecha,
        inicio: diaEntero ? undefined : inicio,
        fin: diaEntero ? undefined : fin,
        motivo: motivo.trim(),
      });
      Alert.alert(
        "Bloqueo guardado",
        "Las reservas de esos turnos se cancelaron y se les avisa a sus dueños."
      );
      setElegidos([]);
      setMotivo("");
      cargarBloqueos();
    } catch (e: any) {
      Alert.alert("No se pudo bloquear", e.message ?? "Intentá de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  function confirmarQuitar(b: Bloqueo) {
    Alert.alert(
      "Quitar bloqueo",
      "Los turnos vuelven a estar disponibles. Las reservas que se cancelaron siguen canceladas.",
      [
        { text: "Volver", style: "cancel" },
        {
          text: "Quitar",
          style: "destructive",
          onPress: async () => {
            try {
              await quitarBloqueo(b.id);
              cargarBloqueos();
            } catch (e: any) {
              Alert.alert("No se pudo quitar", e.message ?? "Intentá de nuevo.");
            }
          },
        },
      ]
    );
  }

  const opcionesEspacios: OpcionChip[] = espacios.map((e) => ({ valor: e.id, texto: e.nombre.trim() }));
  const opcionesDias: OpcionChip[] = dias.map((d) => ({ valor: d.fecha, texto: d.etiquetaCorta }));

  return (
    <ScrollView contentContainerStyle={styles.contenedor} keyboardShouldPersistTaps="handled">
      <Text style={styles.titulo}>Espacios</Text>
      <SelectorChips opciones={opcionesEspacios} elegidos={elegidos} alElegir={alternarEspacio} />

      <Text style={styles.titulo}>Día</Text>
      <SelectorChips opciones={opcionesDias} elegidos={[fecha]} alElegir={setFecha} />

      <View style={styles.filaSwitch}>
        <Text style={styles.texto}>Bloquear el día entero</Text>
        <Switch value={diaEntero} onValueChange={setDiaEntero} />
      </View>

      {!diaEntero && (
        <>
          <Text style={styles.titulo}>Desde</Text>
          <SelectorChips opciones={horasDelDia(8, 23)} elegidos={[inicio]} alElegir={setInicio} />
          <Text style={styles.titulo}>Hasta</Text>
          <SelectorChips opciones={horasDelDia(9, 24)} elegidos={[fin]} alElegir={setFin} />
        </>
      )}

      <Text style={styles.titulo}>Motivo</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej. Cancha anegada por lluvia"
        placeholderTextColor="#888"
        value={motivo}
        onChangeText={setMotivo}
        maxLength={200}
      />

      <TouchableOpacity style={styles.boton} onPress={guardar} disabled={guardando}>
        {guardando ? <ActivityIndicator color="#fff" /> : <Text style={styles.textoBoton}>Bloquear</Text>}
      </TouchableOpacity>

      <Text style={[styles.titulo, { marginTop: 20 }]}>Bloqueos vigentes</Text>
      {cargandoLista ? (
        <ActivityIndicator color="#2E7D32" />
      ) : errorLista ? (
        <TouchableOpacity onPress={cargarBloqueos}>
          <Text style={styles.error}>{errorLista} Tocá para reintentar.</Text>
        </TouchableOpacity>
      ) : bloqueos.length === 0 ? (
        <Text style={styles.texto}>No hay bloqueos desde hoy en adelante.</Text>
      ) : (
        bloqueos.map((b) => (
          <View key={b.id} style={styles.fila}>
            <View style={{ flex: 1 }}>
              <Text style={styles.nombre}>{nombreDe(b.espacioId)}</Text>
              <Text style={styles.texto}>
                {fechaCorta(b.fecha)} · {b.inicio ? `${b.inicio} a ${b.fin}` : "Día entero"} · {b.motivo}
              </Text>
            </View>
            <TouchableOpacity onPress={() => confirmarQuitar(b)}>
              <Text style={styles.quitar}>Quitar</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenedor: { padding: 16, gap: 8 },
  titulo: { fontSize: 14, fontWeight: "700", color: "#333", marginTop: 6 },
  texto: { color: "#555" },
  filaSwitch: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, color: "#222" },
  boton: { backgroundColor: "#2E7D32", paddingVertical: 12, borderRadius: 10, alignItems: "center", marginTop: 8 },
  textoBoton: { color: "#fff", fontWeight: "700" },
  fila: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, backgroundColor: "#f2f2f2", borderRadius: 8 },
  nombre: { fontWeight: "600", color: "#222" },
  quitar: { color: "#C62828", fontWeight: "700" },
  error: { color: "#B00020" },
});
