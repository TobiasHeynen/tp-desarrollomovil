import { useEffect, useState } from "react";
import { FlatList, Text, View, StyleSheet, TextInput, Button } from "react-native";
import { listarEspacios } from "../../src/servicios/espacios";
import { cambiarPrecio } from "../../src/servicios/admin";
import { Espacio } from "../../src/tipos";

// PERSONA E — Cambiar el precio por hora de un espacio.
export default function Precios() {
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [edicion, setEdicion] = useState<Record<string, string>>({});

  useEffect(() => {
    listarEspacios().then((res) => setEspacios(res.datos));
  }, []);

  async function guardar(id: string) {
    const nuevo = Number(edicion[id]);
    if (!nuevo) return;
    await cambiarPrecio(id, nuevo);
    setEspacios((prev) => prev.map((e) => (e.id === id ? { ...e, precioPorHora: nuevo } : e)));
  }

  return (
    <FlatList
      contentContainerStyle={styles.lista}
      data={espacios}
      keyExtractor={(e) => e.id}
      renderItem={({ item }) => (
        <View style={styles.fila}>
          <Text style={{ flex: 1 }}>{item.nombre}</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder={String(item.precioPorHora)}
            value={edicion[item.id] ?? ""}
            onChangeText={(v) => setEdicion((prev) => ({ ...prev, [item.id]: v }))}
          />
          <Button title="Guardar" onPress={() => guardar(item.id)} />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  lista: { padding: 16, gap: 8 },
  fila: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, backgroundColor: "#f2f2f2", borderRadius: 8 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 6, padding: 6, width: 90 },
});
