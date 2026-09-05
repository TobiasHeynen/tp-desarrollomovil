import { useState } from "react";
import { View, Text, Button, StyleSheet, Alert } from "react-native";
import { escanearIngreso } from "../../src/servicios/admin";

// PERSONA D (cámara/QR) + PERSONA E (encargado).
// TODO: reemplazar el botón de prueba por expo-camera (CameraView) con
// lectura de códigos de barra/QR en vivo. Vibración distinta con
// expo-haptics para código válido vs inválido (PRD, sección 4 y tabla
// de capacidades del dispositivo).

export default function EscanearIngreso() {
  const [resultado, setResultado] = useState<string | null>(null);

  async function simularEscaneo(codigo: string) {
    try {
      const reserva = await escanearIngreso(codigo);
      setResultado(`OK: ingresó a ${reserva.espacioId}`);
    } catch (e: any) {
      Alert.alert("Código inválido", e.message ?? "Ese QR no corresponde a esta reserva.");
    }
  }

  return (
    <View style={styles.contenedor}>
      <Text>Cámara pendiente (expo-camera). Botones de prueba mientras tanto:</Text>
      <Button title="Simular QR válido (VGY-1180-0219-19)" onPress={() => simularEscaneo("VGY-1180-0219-19")} />
      <Button title="Simular QR inválido" onPress={() => simularEscaneo("QR-INEXISTENTE")} />
      {resultado && <Text style={{ marginTop: 12 }}>{resultado}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, padding: 24, gap: 12, justifyContent: "center" },
});
