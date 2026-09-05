import { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { listarEspacios } from "../../src/servicios/espacios";
import { Espacio } from "../../src/tipos";

// PERSONA B — Espacios.
// Pendiente en esta pantalla:
// - Filtro por deporte y por complejo (ver src/servicios/espacios.ts:listarDeportes/listarComplejos).
// - Foto, deporte y "tiene luz para jugar de noche" en cada tarjeta (componente TarjetaEspacio).
// - Estados de carga / vacío / error en pantalla (pedido explícito de la cátedra).

export default function ListadoEspacios() {
  const router = useRouter();
  const [espacios, setEspacios] = useState<Espacio[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listarEspacios()
      .then((res) => setEspacios(res.datos))
      .catch(() => setError("No pudimos cargar los espacios. Probá de nuevo."));
  }, []);

  if (error) return <Text style={styles.mensaje}>{error}</Text>;
  if (!espacios) return <Text style={styles.mensaje}>Cargando espacios…</Text>;
  if (espacios.length === 0) return <Text style={styles.mensaje}>No hay espacios para este filtro.</Text>;

  return (
    <FlatList
      contentContainerStyle={styles.lista}
      data={espacios}
      keyExtractor={(e) => e.id}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.tarjeta}
          onPress={() => router.push(`/espacio/${item.id}`)}
        >
          <Text style={styles.nombre}>{item.nombre}</Text>
          <Text style={styles.detalle}>{item.complejo}</Text>
          <Text style={styles.detalle}>
            {item.superficie} · {item.iluminacion ? "Con luz" : "Sin luz"} · ${item.precioPorHora}/h
          </Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  lista: { padding: 16, gap: 12 },
  tarjeta: { padding: 16, borderRadius: 12, backgroundColor: "#f2f2f2" },
  nombre: { fontSize: 16, fontWeight: "600" },
  detalle: { fontSize: 13, color: "#555" },
  mensaje: { padding: 24, textAlign: "center" },
});
