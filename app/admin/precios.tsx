import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Text,
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { listarEspacios } from "../../src/servicios/espacios";
import { cambiarPrecio } from "../../src/servicios/admin";
import { useAuth } from "../../src/contextos/AuthContext";
import { Espacio } from "../../src/tipos";

// PERSONA E — Cambiar el precio por hora de un espacio (PRD, sección 6).
// Solo el administrador (la API responde SIN_PERMISO al encargado).

export default function Precios() {
  const { usuario } = useAuth();
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [edicion, setEdicion] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardandoId, setGuardandoId] = useState<string | null>(null);

  const cargar = useCallback(() => {
    setCargando(true);
    setError(null);
    listarEspacios()
      .then((res) => setEspacios(res.datos))
      .catch((e: any) => setError(e.message ?? "No pudimos cargar los espacios."))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function guardar(id: string) {
    const nuevo = Number(edicion[id]);
    if (!Number.isInteger(nuevo) || nuevo <= 0) {
      Alert.alert("El precio tiene que ser un número entero mayor que cero.");
      return;
    }
    setGuardandoId(id);
    try {
      const actualizado = await cambiarPrecio(id, nuevo);
      setEspacios((prev) => prev.map((e) => (e.id === id ? actualizado : e)));
      setEdicion((prev) => ({ ...prev, [id]: "" }));
    } catch (e: any) {
      Alert.alert("No se pudo cambiar el precio", e.message ?? "Intentá de nuevo.");
    } finally {
      setGuardandoId(null);
    }
  }

  if (usuario?.rol !== "administrador") {
    return (
      <View style={styles.centrado}>
        <Text style={styles.mensaje}>Cambiar precios es tarea del administrador.</Text>
      </View>
    );
  }

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centrado}>
        <Text style={styles.mensaje}>{error}</Text>
        <TouchableOpacity style={styles.boton} onPress={cargar}>
          <Text style={styles.textoBoton}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={styles.lista}
      data={espacios}
      keyExtractor={(e) => e.id}
      renderItem={({ item }) => (
        <View style={styles.fila}>
          <View style={{ flex: 1 }}>
            <Text style={styles.nombre}>{item.nombre.trim()}</Text>
            <Text style={styles.actual}>Ahora: ${item.precioPorHora}/h</Text>
          </View>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder={String(item.precioPorHora)}
            placeholderTextColor="#888"
            value={edicion[item.id] ?? ""}
            onChangeText={(v) => setEdicion((prev) => ({ ...prev, [item.id]: v }))}
          />
          <TouchableOpacity style={styles.boton} onPress={() => guardar(item.id)} disabled={guardandoId === item.id}>
            {guardandoId === item.id ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.textoBoton}>Guardar</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  lista: { padding: 16, gap: 8 },
  centrado: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  mensaje: { textAlign: "center", color: "#555" },
  fila: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, backgroundColor: "#f2f2f2", borderRadius: 8 },
  nombre: { fontWeight: "600", color: "#222" },
  actual: { color: "#666", fontSize: 12 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 6, padding: 6, width: 90, color: "#222", backgroundColor: "#fff" },
  boton: { backgroundColor: "#2E7D32", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, alignItems: "center" },
  textoBoton: { color: "#fff", fontWeight: "700" },
});
