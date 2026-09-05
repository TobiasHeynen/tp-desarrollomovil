import { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, Button } from "react-native";
import { useRouter } from "expo-router";
import { agendaDelDia } from "../../src/servicios/admin";
import { Reserva } from "../../src/tipos";

// PERSONA E — Agenda del día de todos los espacios (PRD, sección 6).
function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function AgendaDelDia() {
  const router = useRouter();
  const [reservas, setReservas] = useState<Reserva[] | null>(null);

  useEffect(() => {
    agendaDelDia(hoyISO()).then(setReservas);
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.acciones}>
        <Button title="Escanear QR" onPress={() => router.push("/admin/escanear")} />
        <Button title="Bloquear turnos" onPress={() => router.push("/admin/bloqueos")} />
        <Button title="Reservas fijas" onPress={() => router.push("/admin/fijas")} />
        <Button title="Precios" onPress={() => router.push("/admin/precios")} />
      </View>
      <FlatList
        contentContainerStyle={styles.lista}
        data={reservas ?? []}
        keyExtractor={(r) => r.id}
        ListEmptyComponent={<Text style={styles.mensaje}>{reservas ? "Sin turnos hoy." : "Cargando…"}</Text>}
        renderItem={({ item }) => (
          <View style={styles.fila}>
            <Text>{item.espacioId} — {item.estado}</Text>
            <Text style={{ color: "#666" }}>{item.ingresoEn ? "Ingresó" : "No ingresó"}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  acciones: { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 12 },
  lista: { padding: 16, gap: 6 },
  fila: { flexDirection: "row", justifyContent: "space-between", padding: 12, backgroundColor: "#f2f2f2", borderRadius: 8 },
  mensaje: { padding: 24, textAlign: "center" },
});
