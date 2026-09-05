import { useEffect, useState } from "react";
import { View, Text, ScrollView, Image, Button, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { obtenerEspacio } from "../../../src/servicios/espacios";
import { Espacio } from "../../../src/tipos";

// PERSONA B — Espacios.
// TODO: reproducir `videoUrl` con expo-video (recorrido de 20-30s) cuando
// no sea null; si es null, no romper -- mostrar solo las fotos (caso feo
// del mock: esp-02 no tiene video). Mapa individual con react-native-maps
// usando `coordenadas` + botón "Cómo llegar".

export default function FichaEspacio() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [espacio, setEspacio] = useState<Espacio | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    obtenerEspacio(id).then(setEspacio).catch(() => setError("No encontramos ese espacio."));
  }, [id]);

  if (error) return <Text style={styles.mensaje}>{error}</Text>;
  if (!espacio) return <Text style={styles.mensaje}>Cargando…</Text>;

  return (
    <ScrollView contentContainerStyle={styles.contenedor}>
      <Image source={{ uri: espacio.imagenes[0] }} style={styles.imagen} />
      <Text style={styles.titulo}>{espacio.nombre}</Text>
      <Text>{espacio.complejo}</Text>
      <Text>{espacio.superficie} · {espacio.techado ? "Techado" : "A cielo abierto"}</Text>
      <Text>{espacio.iluminacion ? "Con iluminación nocturna" : "Sin luz artificial"}</Text>
      <Text style={styles.precio}>${espacio.precioPorHora} / hora</Text>
      <Text style={styles.subtitulo}>Reglas del lugar</Text>
      <Text>{espacio.reglas}</Text>
      {!espacio.videoUrl && <Text style={styles.aviso}>Este espacio todavía no tiene video de recorrido.</Text>}
      <View style={{ height: 16 }} />
      <Button title="Ver disponibilidad" onPress={() => router.push(`/espacio/${espacio.id}/disponibilidad`)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenedor: { padding: 16, gap: 6 },
  imagen: { width: "100%", height: 200, borderRadius: 12, backgroundColor: "#ddd" },
  titulo: { fontSize: 20, fontWeight: "700", marginTop: 8 },
  subtitulo: { fontSize: 15, fontWeight: "600", marginTop: 12 },
  precio: { fontSize: 16, fontWeight: "600", marginTop: 4 },
  aviso: { fontStyle: "italic", color: "#777", marginTop: 8 },
  mensaje: { padding: 24, textAlign: "center" },
});
