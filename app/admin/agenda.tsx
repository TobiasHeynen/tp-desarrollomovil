import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { agendaDelDia, marcarAusente, AgendaDelDia } from "../../src/servicios/admin";
import { listarEspacios } from "../../src/servicios/espacios";
import { obtenerProximosDias, DiaSeleccionable } from "../../src/servicios/turnos";
import { useAuth } from "../../src/contextos/AuthContext";
import { Turno, Reserva, Espacio } from "../../src/tipos";

// PERSONA E — Agenda del día de todos los espacios (PRD, sección 6).
// Muestra los turnos ocupados de cada espacio, quién llegó (cumplida) y permite
// marcar "no se presentó" (la API lo deja desde 15 minutos después del inicio).

const TEXTO_ESTADO: Record<Reserva["estado"], string> = {
  confirmada: "Esperando",
  cumplida: "Llegó",
  ausente: "No se presentó",
  cancelada: "Cancelada",
};

function horaDe(iso: string | null): string {
  if (!iso) return "";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "";
  return `${String(fecha.getHours()).padStart(2, "0")}:${String(fecha.getMinutes()).padStart(2, "0")}`;
}

export default function AgendaDelDiaPantalla() {
  const router = useRouter();
  const { usuario } = useAuth();
  const dias = useMemo<DiaSeleccionable[]>(() => obtenerProximosDias(7), []);
  const [fecha, setFecha] = useState<string>(dias[0].fecha);
  const [agenda, setAgenda] = useState<AgendaDelDia | null>(null);
  const [espacios, setEspacios] = useState<Record<string, Espacio>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marcandoId, setMarcandoId] = useState<string | null>(null);

  const cargar = useCallback(() => {
    setCargando(true);
    setError(null);
    agendaDelDia(fecha)
      .then(setAgenda)
      .catch((e: any) => setError(e.message ?? "No pudimos cargar la agenda."))
      .finally(() => setCargando(false));
  }, [fecha]);

  useEffect(() => {
    listarEspacios()
      .then((r) => {
        const porId: Record<string, Espacio> = {};
        r.datos.forEach((e) => (porId[e.id] = e));
        setEspacios(porId);
      })
      .catch(() => {});
  }, []);

  // Se recarga al volver del escáner, para ver los ingresos nuevos
  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  async function confirmarAusente(reserva: Reserva) {
    Alert.alert("No se presentó", "¿Marcar esta reserva como ausente?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Marcar ausente",
        style: "destructive",
        onPress: async () => {
          setMarcandoId(reserva.id);
          try {
            await marcarAusente(reserva.id);
            cargar();
          } catch (e: any) {
            Alert.alert("No se pudo marcar", e.message ?? "Intentá de nuevo.");
          } finally {
            setMarcandoId(null);
          }
        },
      },
    ]);
  }

  // Una sección por espacio, solo con los turnos que no están libres
  const secciones = useMemo(() => {
    if (!agenda) return [];
    const porEspacio: Record<string, Turno[]> = {};
    agenda.turnos
      .filter((t) => t.estado !== "libre")
      .forEach((t) => {
        if (!porEspacio[t.espacioId]) porEspacio[t.espacioId] = [];
        porEspacio[t.espacioId].push(t);
      });
    return Object.keys(porEspacio).map((espacioId) => ({
      title: espacios[espacioId]?.nombre.trim() ?? espacioId,
      data: porEspacio[espacioId],
    }));
  }, [agenda, espacios]);

  function renderTurno(turno: Turno) {
    const reserva: Reserva | undefined = turno.reservaId ? agenda?.reservas[turno.reservaId] : undefined;

    let detalle = "";
    if (turno.estado === "fijo") detalle = "Reserva fija";
    else if (turno.estado === "mantenimiento") detalle = `Bloqueado · ${turno.motivoBloqueo ?? ""}`;
    else if (reserva) {
      detalle = `${reserva.cantidadPersonas} personas · ${TEXTO_ESTADO[reserva.estado]}`;
      if (reserva.ingresoEn) detalle += ` a las ${horaDe(reserva.ingresoEn)}`;
    } else detalle = "Reservado";

    return (
      <View style={styles.fila}>
        <View style={{ flex: 1 }}>
          <Text style={styles.hora}>{turno.inicio} a {turno.fin}</Text>
          <Text style={styles.detalle}>{detalle}</Text>
        </View>
        {reserva && reserva.estado === "confirmada" && (
          <TouchableOpacity
            style={styles.botonAusente}
            disabled={marcandoId === reserva.id}
            onPress={() => confirmarAusente(reserva)}
          >
            <Text style={styles.textoAusente}>
              {marcandoId === reserva.id ? "…" : "No vino"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.acciones}>
        <TouchableOpacity style={styles.accion} onPress={() => router.push("/admin/escanear")}>
          <Text style={styles.textoAccion}>Escanear QR</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.accion} onPress={() => router.push("/admin/bloqueos")}>
          <Text style={styles.textoAccion}>Bloqueos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.accion} onPress={() => router.push("/admin/fijas")}>
          <Text style={styles.textoAccion}>Reservas fijas</Text>
        </TouchableOpacity>
        {usuario?.rol === "administrador" && (
          <TouchableOpacity style={styles.accion} onPress={() => router.push("/admin/precios")}>
            <Text style={styles.textoAccion}>Precios</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dias}>
        {dias.map((d) => (
          <TouchableOpacity
            key={d.fecha}
            style={[styles.chip, fecha === d.fecha && styles.chipActivo]}
            onPress={() => setFecha(d.fecha)}
          >
            <Text style={[styles.textoChip, fecha === d.fecha && styles.textoChipActivo]}>
              {d.etiquetaCorta}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {cargando && !agenda ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.mensaje}>Cargando la agenda…</Text>
        </View>
      ) : error ? (
        <View style={styles.centrado}>
          <Text style={styles.mensaje}>{error}</Text>
          <TouchableOpacity style={styles.accion} onPress={cargar}>
            <Text style={styles.textoAccion}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          contentContainerStyle={styles.lista}
          sections={secciones}
          keyExtractor={(t) => t.id}
          stickySectionHeadersEnabled={false}
          refreshing={cargando}
          onRefresh={cargar}
          renderSectionHeader={({ section }) => <Text style={styles.titulo}>{section.title}</Text>}
          renderItem={({ item }) => renderTurno(item)}
          ListEmptyComponent={<Text style={styles.mensaje}>No hay turnos ocupados este día.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  acciones: { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 12 },
  accion: { backgroundColor: "#2E7D32", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  textoAccion: { color: "#fff", fontWeight: "700" },
  dias: { gap: 8, paddingHorizontal: 12, paddingBottom: 8 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: "#eee" },
  chipActivo: { backgroundColor: "#2E7D32" },
  textoChip: { fontSize: 13, color: "#333" },
  textoChipActivo: { color: "#fff", fontWeight: "600" },
  lista: { padding: 16, gap: 6 },
  titulo: { fontSize: 15, fontWeight: "700", marginTop: 10, marginBottom: 4, color: "#1B5E20" },
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    backgroundColor: "#f2f2f2",
    borderRadius: 8,
  },
  hora: { fontWeight: "700", color: "#222" },
  detalle: { color: "#555", fontSize: 13 },
  botonAusente: { borderWidth: 1, borderColor: "#C62828", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  textoAusente: { color: "#C62828", fontWeight: "700" },
  centrado: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  mensaje: { padding: 24, textAlign: "center", color: "#555" },
});
