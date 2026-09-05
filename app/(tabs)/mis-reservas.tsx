import { useEffect, useState } from "react";
import { View, Text, SectionList, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { listarMisReservas } from "../../src/servicios/reservas";
import { Reserva } from "../../src/tipos";
import { useAuth } from "../../src/contextos/AuthContext";

// PERSONA C — Disponibilidad y reservas.
// Acá van también, cuando el usuario no está logueado, un estado que lo
// mande a (auth)/login (recordar: reservar sí pide cuenta, mirar disponibilidad no).

export default function MisReservas() {
  const router = useRouter();
  const { usuario } = useAuth();
  const [datos, setDatos] = useState<{ proximas: Reserva[]; pasadas: Reserva[] } | null>(null);

  useEffect(() => {
    if (!usuario) return;
    listarMisReservas(usuario.id).then(setDatos);
  }, [usuario]);

  if (!usuario) {
    return (
      <View style={styles.centro}>
        <Text>Iniciá sesión para ver tus reservas.</Text>
      </View>
    );
  }

  if (!datos) return <Text style={styles.centro}>Cargando…</Text>;

  const secciones = [
    { title: "Próximas", data: datos.proximas },
    { title: "Pasadas", data: datos.pasadas },
  ];

  return (
    <SectionList
      contentContainerStyle={styles.lista}
      sections={secciones}
      keyExtractor={(r) => r.id}
      renderSectionHeader={({ section }) => <Text style={styles.titulo}>{section.title}</Text>}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.tarjeta} onPress={() => router.push(`/reserva/${item.id}`)}>
          <Text>{item.espacioId} — {item.estado}</Text>
        </TouchableOpacity>
      )}
      ListEmptyComponent={<Text style={styles.centro}>Todavía no hiciste ninguna reserva.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  lista: { padding: 16, gap: 8 },
  titulo: { fontSize: 14, fontWeight: "700", marginTop: 12, marginBottom: 4 },
  tarjeta: { padding: 14, borderRadius: 10, backgroundColor: "#f2f2f2" },
  centro: { flex: 1, textAlign: "center", padding: 24 },
});
