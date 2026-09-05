import { View, Text, StyleSheet } from "react-native";

// PERSONA B — Espacios / mapa.
// TODO: react-native-maps con un marcador por complejo (agrupar los 11
// espacios por `complejo`), usando expo-location para centrar en el
// complejo más cercano. Si el usuario niega el permiso de ubicación,
// el mapa igual tiene que mostrarse (PRD: "si niega la ubicación, que
// igual pueda ver todo; la ubicación es sólo para el mapa y para saber
// qué complejo tiene más cerca").

export default function MapaGeneral() {
  return (
    <View style={styles.contenedor}>
      <Text>Mapa de complejos deportivos (pendiente: react-native-maps)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
});
