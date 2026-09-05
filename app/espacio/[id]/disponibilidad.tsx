import { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { obtenerGrilla, esTurnoPasado } from "../../../src/servicios/turnos";
import { crearReserva } from "../../../src/servicios/reservas";
import { Turno } from "../../../src/tipos";
import { useAuth } from "../../../src/contextos/AuthContext";

// PERSONA C — Disponibilidad y reservas. "Esta es la pantalla más
// importante de todas" (palabras del cliente en el PRD).
//
// Pendiente acá:
// - Selector de día entre los próximos 7 (hoy se deja fijo `hoyISO()`).
// - No dejar tocar un turno "reservado" / "fijo" / "mantenimiento", ni
//   uno que ya pasó aunque el mock lo devuelva como libre (esTurnoPasado).
// - Al reservar: pedir cuenta si no está logueado (PRD: la disponibilidad
//   se mira sin cuenta, reservar sí la pide), pedir deporte y cantidad de
//   personas en un modal, no un simple Alert.
// - Revisar constantemente que "fijo" se pinte distinto a "reservado":
//   para el cliente son casos distintos aunque ambos ocupen el turno.

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const COLOR_POR_ESTADO: Record<Turno["estado"], string> = {
  libre: "#C8E6C9",
  reservado: "#FFCDD2",
  fijo: "#BBDEFB",
  mantenimiento: "#E0E0E0",
};

export default function Disponibilidad() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { usuario } = useAuth();
  const [fecha] = useState(hoyISO());
  const [grilla, setGrilla] = useState<Turno[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    obtenerGrilla(id, fecha)
      .then(setGrilla)
      .catch(() => setError("No pudimos cargar la disponibilidad."));
  }, [id, fecha]);

  async function reservar(turno: Turno) {
    if (!usuario) {
      Alert.alert("Necesitás una cuenta", "Iniciá sesión para reservar.", [
        { text: "Ir a login", onPress: () => router.push("/(auth)/login") },
        { text: "Cancelar", style: "cancel" },
      ]);
      return;
    }
    try {
      const reserva = await crearReserva({
        turnoId: turno.id,
        espacioId: turno.espacioId,
        usuarioId: usuario.id,
        cantidadPersonas: 2, // TODO(Persona C): pedirlo en un modal, no hardcodeado.
      });
      router.push(`/reserva/${reserva.id}`);
    } catch (e: any) {
      Alert.alert("No se pudo reservar", e.message ?? "Intentá de nuevo.");
    }
  }

  if (error) return <Text style={styles.mensaje}>{error}</Text>;
  if (!grilla) return <Text style={styles.mensaje}>Cargando grilla…</Text>;
  if (grilla.length === 0) return <Text style={styles.mensaje}>No hay turnos configurados para este día.</Text>;

  return (
    <FlatList
      contentContainerStyle={styles.lista}
      data={grilla}
      keyExtractor={(t) => t.id}
      renderItem={({ item }) => {
        const pasado = esTurnoPasado(item.fecha, item.inicio);
        const reservable = item.estado === "libre" && !pasado;
        return (
          <TouchableOpacity
            disabled={!reservable}
            onPress={() => reservar(item)}
            style={[styles.fila, { backgroundColor: pasado ? "#EEE" : COLOR_POR_ESTADO[item.estado] }]}
          >
            <Text style={styles.hora}>{item.inicio}</Text>
            <Text>
              {pasado
                ? "Pasado"
                : item.estado === "libre"
                ? `Libre · $${item.precio}`
                : item.estado === "fijo"
                ? "Fijo"
                : item.estado === "mantenimiento"
                ? item.motivoBloqueo ?? "Mantenimiento"
                : "Ocupado"}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  lista: { padding: 16, gap: 6 },
  fila: { flexDirection: "row", justifyContent: "space-between", padding: 14, borderRadius: 10 },
  hora: { fontWeight: "600" },
  mensaje: { padding: 24, textAlign: "center" },
});
