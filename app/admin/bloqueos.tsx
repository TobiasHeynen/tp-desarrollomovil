import { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert } from "react-native";
import { bloquearTurnos } from "../../src/servicios/admin";

// PERSONA E — Bloquear turnos o días enteros con un motivo escrito.
// TODO: selector de espacio (traer de listarEspacios) y de fecha real
// (date picker), en vez de estos inputs de texto libre.

export default function Bloqueos() {
  const [espacioId, setEspacioId] = useState("");
  const [fecha, setFecha] = useState("");
  const [motivo, setMotivo] = useState("");

  async function guardar() {
    if (!espacioId || !fecha || !motivo) {
      Alert.alert("Completá espacio, fecha y motivo.");
      return;
    }
    await bloquearTurnos({ espacioId, fecha, motivo });
    Alert.alert("Bloqueo guardado");
    setEspacioId(""); setFecha(""); setMotivo("");
  }

  return (
    <View style={styles.contenedor}>
      <TextInput style={styles.input} placeholder="ID de espacio (ej. esp-02)" value={espacioId} onChangeText={setEspacioId} />
      <TextInput style={styles.input} placeholder="Fecha AAAA-MM-DD" value={fecha} onChangeText={setFecha} />
      <TextInput style={styles.input} placeholder="Motivo (ej. Lluvia)" value={motivo} onChangeText={setMotivo} />
      <Button title="Bloquear día completo" onPress={guardar} />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, padding: 24, gap: 12, justifyContent: "center" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12 },
});
