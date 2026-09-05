import { useEffect, useState } from "react";
import { View, Text, Button, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { cancelarReserva } from "../../src/servicios/reservas";

// PERSONA D — Ingreso el día del turno + notificaciones.
// TODO:
// - Renderizar el QR real (ej. con una lib de qrcode-svg, o generar el
//   código en el backend y traer una imagen). El texto de acá es un
//   placeholder de `codigoQr`.
// - La reserva y su QR tienen que guardarse en expo-sqlite y leerse SIN
//   conexión (PRD: "el QR se muestra en la puerta, donde la señal es mala").
// - Notificación local con expo-notifications: recordatorio 2hs antes,
//   aviso de suspensión, aviso de turno liberado en favoritos.
// - Vibración distinta (expo-haptics) cuando el encargado escanea OK vs mal.
//
// Esta pantalla recibe el `id` de la Reserva recién creada; falta
// cargarla desde el servicio en vez de mostrar solo el id (ver
// src/servicios/reservas.ts, que hoy no tiene un `obtenerReserva(id)`
// -- agregarlo ahí siguiendo el mismo patrón que el resto del servicio).

export default function DetalleReserva() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [cancelando, setCancelando] = useState(false);

  async function manejarCancelar() {
    if (!id) return;
    setCancelando(true);
    try {
      await cancelarReserva(id);
      Alert.alert("Reserva cancelada");
      router.back();
    } catch (e: any) {
      Alert.alert("No se pudo cancelar", e.message ?? "Intentá de nuevo.");
    } finally {
      setCancelando(false);
    }
  }

  return (
    <View style={styles.contenedor}>
      <Text style={styles.titulo}>Reserva confirmada</Text>
      <View style={styles.qrPlaceholder}>
        <Text style={styles.qrTexto}>{id}</Text>
      </View>
      <Text style={styles.ayuda}>Mostráselo al encargado en la puerta.</Text>
      <View style={{ height: 24 }} />
      <Button title="Cómo llegar" onPress={() => {/* TODO(Persona B/D): abrir mapa/deep link */}} />
      <View style={{ height: 8 }} />
      <Button title="Cancelar reserva" color="#B00020" onPress={manejarCancelar} disabled={cancelando} />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  titulo: { fontSize: 18, fontWeight: "700", marginBottom: 24 },
  qrPlaceholder: { width: 200, height: 200, backgroundColor: "#eee", alignItems: "center", justifyContent: "center", borderRadius: 12 },
  qrTexto: { fontFamily: "monospace" },
  ayuda: { marginTop: 12, color: "#666" },
});
