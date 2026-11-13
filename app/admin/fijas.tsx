import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { listarFijas, crearFija, editarFija, darDeBajaFija } from "../../src/servicios/admin";
import { listarEspacios } from "../../src/servicios/espacios";
import { hoyISO } from "../../src/servicios/turnos";
import { useAuth } from "../../src/contextos/AuthContext";
import SelectorChips, { horasDelDia, OpcionChip } from "../../src/componentes/SelectorChips";
import { Espacio, ReservaFija } from "../../src/tipos";

// PERSONA E — Cargar y editar las reservas fijas (PRD, sección 6).
// Una fija no es un turno: es una regla que ocupa el mismo horario todas las
// semanas. El encargado las ve; cargarlas, editarlas y darlas de baja es del
// administrador (la API lo controla).

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const OPCIONES_DIAS: OpcionChip[] = DIAS.map((d, i) => ({ valor: String(i), texto: d }));

const FECHA_VALIDA = /^\d{4}-\d{2}-\d{2}$/;

export default function ReservasFijas() {
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === "administrador";

  const [fijas, setFijas] = useState<ReservaFija[]>([]);
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Formulario (alta o edición). editando = id de la fija que se edita, o null si es nueva
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [espacioId, setEspacioId] = useState<string>("");
  const [titular, setTitular] = useState("");
  const [dia, setDia] = useState<string>("2");
  const [inicio, setInicio] = useState("21:00");
  const [fin, setFin] = useState("22:00");
  const [desde, setDesde] = useState(hoyISO());
  const [hasta, setHasta] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(() => {
    setCargando(true);
    setError(null);
    listarFijas()
      .then(setFijas)
      .catch((e: any) => setError(e.message ?? "No pudimos cargar las reservas fijas."))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    listarEspacios()
      .then((r) => setEspacios(r.datos))
      .catch(() => {});
    cargar();
  }, [cargar]);

  function nombreDe(id: string): string {
    return espacios.find((e) => e.id === id)?.nombre.trim() ?? id;
  }

  function abrirNueva() {
    setEditando(null);
    setEspacioId(espacios[0]?.id ?? "");
    setTitular("");
    setDia("2");
    setInicio("21:00");
    setFin("22:00");
    setDesde(hoyISO());
    setHasta("");
    setMostrarForm(true);
  }

  function abrirEdicion(f: ReservaFija) {
    setEditando(f.id);
    setEspacioId(f.espacioId);
    setTitular(f.titular);
    setDia(String(f.dia));
    setInicio(f.inicio);
    setFin(f.fin);
    setDesde(f.desde);
    setHasta(f.hasta ?? "");
    setMostrarForm(true);
  }

  async function guardar() {
    if (titular.trim() === "") return Alert.alert("Escribí el titular (quién tiene el turno).");
    if (inicio >= fin) return Alert.alert("El horario de inicio tiene que ser antes del fin.");
    if (!FECHA_VALIDA.test(desde)) return Alert.alert("La fecha de inicio tiene que ser AAAA-MM-DD.");
    if (hasta !== "" && !FECHA_VALIDA.test(hasta)) return Alert.alert("La fecha de fin tiene que ser AAAA-MM-DD.");

    const datos = {
      titular: titular.trim(),
      dia: Number(dia) as ReservaFija["dia"],
      inicio,
      fin,
      desde,
      hasta: hasta === "" ? null : hasta,
    };

    setGuardando(true);
    try {
      if (editando) {
        await editarFija(editando, datos);
      } else {
        await crearFija({ ...datos, espacioId });
      }
      setMostrarForm(false);
      cargar();
    } catch (e: any) {
      // Ej.: FIJA_SUPERPUESTA o CONFLICTO_CON_RESERVAS, con el mensaje de la API
      Alert.alert("No se pudo guardar", e.message ?? "Intentá de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  function confirmarBaja(f: ReservaFija) {
    Alert.alert("Dar de baja", `¿Dar de baja la fija de "${f.titular}"?`, [
      { text: "Volver", style: "cancel" },
      {
        text: "Dar de baja",
        style: "destructive",
        onPress: async () => {
          try {
            await darDeBajaFija(f.id);
            cargar();
          } catch (e: any) {
            Alert.alert("No se pudo dar de baja", e.message ?? "Intentá de nuevo.");
          }
        },
      },
    ]);
  }

  if (cargando && fijas.length === 0) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centrado}>
        <Text style={styles.texto}>{error}</Text>
        <TouchableOpacity style={styles.boton} onPress={cargar}>
          <Text style={styles.textoBoton}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.contenedor} keyboardShouldPersistTaps="handled">
      {esAdmin && !mostrarForm && (
        <TouchableOpacity style={styles.boton} onPress={abrirNueva}>
          <Text style={styles.textoBoton}>Cargar reserva fija</Text>
        </TouchableOpacity>
      )}
      {!esAdmin && (
        <Text style={styles.ayuda}>Cargar y editar reservas fijas es tarea del administrador.</Text>
      )}

      {mostrarForm && (
        <View style={styles.form}>
          <Text style={styles.tituloForm}>{editando ? "Editar reserva fija" : "Nueva reserva fija"}</Text>

          {editando ? (
            <Text style={styles.texto}>Espacio: {nombreDe(espacioId)}</Text>
          ) : (
            <>
              <Text style={styles.etiqueta}>Espacio</Text>
              <SelectorChips
                opciones={espacios.map((e) => ({ valor: e.id, texto: e.nombre.trim() }))}
                elegidos={[espacioId]}
                alElegir={setEspacioId}
              />
            </>
          )}

          <Text style={styles.etiqueta}>Titular</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej. Grupo de los martes"
            placeholderTextColor="#888"
            value={titular}
            onChangeText={setTitular}
          />

          <Text style={styles.etiqueta}>Día de la semana</Text>
          <SelectorChips opciones={OPCIONES_DIAS} elegidos={[dia]} alElegir={setDia} />

          <Text style={styles.etiqueta}>Desde las</Text>
          <SelectorChips opciones={horasDelDia(8, 23)} elegidos={[inicio]} alElegir={setInicio} />
          <Text style={styles.etiqueta}>Hasta las</Text>
          <SelectorChips opciones={horasDelDia(9, 24)} elegidos={[fin]} alElegir={setFin} />

          <Text style={styles.etiqueta}>Vigente desde (AAAA-MM-DD)</Text>
          <TextInput style={styles.input} value={desde} onChangeText={setDesde} placeholderTextColor="#888" />
          <Text style={styles.etiqueta}>Hasta (vacío si no tiene fin)</Text>
          <TextInput
            style={styles.input}
            value={hasta}
            onChangeText={setHasta}
            placeholder="AAAA-MM-DD"
            placeholderTextColor="#888"
          />

          <View style={styles.filaBotones}>
            <TouchableOpacity style={styles.botonSecundario} onPress={() => setMostrarForm(false)}>
              <Text style={styles.textoSecundario}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.boton, { flex: 1 }]} onPress={guardar} disabled={guardando}>
              {guardando ? <ActivityIndicator color="#fff" /> : <Text style={styles.textoBoton}>Guardar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {fijas.length === 0 ? (
        <Text style={styles.texto}>No hay reservas fijas cargadas.</Text>
      ) : (
        fijas.map((f) => (
          <View key={f.id} style={[styles.fila, !f.activa && styles.inactiva]}>
            <Text style={styles.nombre}>{f.titular}</Text>
            <Text style={styles.texto}>
              {nombreDe(f.espacioId)} · {DIAS[f.dia]} {f.inicio} a {f.fin}
            </Text>
            <Text style={styles.ayuda}>
              Desde {f.desde}{f.hasta ? ` hasta ${f.hasta}` : ", sin fecha de fin"} · {f.activa ? "Vigente" : "De baja"}
            </Text>
            {esAdmin && f.activa && (
              <View style={styles.filaBotones}>
                <TouchableOpacity onPress={() => abrirEdicion(f)}>
                  <Text style={styles.enlace}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmarBaja(f)}>
                  <Text style={styles.quitar}>Dar de baja</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenedor: { padding: 16, gap: 8 },
  centrado: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  form: { backgroundColor: "#F1F8E9", borderRadius: 10, padding: 12, gap: 6, marginBottom: 8 },
  tituloForm: { fontSize: 16, fontWeight: "700", color: "#1B5E20" },
  etiqueta: { fontWeight: "600", color: "#333", marginTop: 4 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, color: "#222", backgroundColor: "#fff" },
  filaBotones: { flexDirection: "row", gap: 16, alignItems: "center", marginTop: 6 },
  boton: { backgroundColor: "#2E7D32", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, alignItems: "center" },
  textoBoton: { color: "#fff", fontWeight: "700" },
  botonSecundario: { paddingVertical: 12, paddingHorizontal: 8 },
  textoSecundario: { color: "#555", fontWeight: "700" },
  fila: { padding: 14, backgroundColor: "#f2f2f2", borderRadius: 10, gap: 2 },
  inactiva: { opacity: 0.55 },
  nombre: { fontWeight: "700", color: "#222" },
  texto: { color: "#444" },
  ayuda: { color: "#777", fontSize: 12 },
  enlace: { color: "#2E7D32", fontWeight: "700" },
  quitar: { color: "#C62828", fontWeight: "700" },
});
