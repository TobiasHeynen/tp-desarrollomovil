import { FlatList, Text, View, StyleSheet } from "react-native";
import { RESERVAS_FIJAS } from "../../src/mocks/reservasFijas";

// PERSONA E — Cargar y editar las reservas fijas.
// TODO: mover esto a un servicio propio (src/servicios/admin.ts ya tiene
// el resto de funciones de encargado; agregar listarFijas/crearFija/
// editarFija ahí en vez de leer el mock directo como está ahora) y
// convertir esta lista de solo lectura en un formulario alta/edición.

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default function ReservasFijas() {
  return (
    <FlatList
      contentContainerStyle={styles.lista}
      data={RESERVAS_FIJAS}
      keyExtractor={(f) => f.id}
      renderItem={({ item }) => (
        <View style={styles.fila}>
          <Text style={styles.titular}>{item.titular}</Text>
          <Text>{item.espacioId} · {DIAS[item.dia]} {item.inicio}-{item.fin}</Text>
          <Text style={{ color: "#666" }}>{item.activa ? "Vigente" : "Inactiva"}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  lista: { padding: 16, gap: 8 },
  fila: { padding: 14, backgroundColor: "#f2f2f2", borderRadius: 10 },
  titular: { fontWeight: "600" },
});
