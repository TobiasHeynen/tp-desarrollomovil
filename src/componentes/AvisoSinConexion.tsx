import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNetworkState } from "expo-network";

//PERSONA E - aviso del estado de la red con expo-network (consigna, requisito 7)
//se muestra arriba de toda la app cuando el telefono se queda sin conexion;
//mientras tanto las pantallas muestran lo ultimo que se guardo en el telefono

export default function AvisoSinConexion() {
    const red = useNetworkState();
    const insets = useSafeAreaInsets();

    //isInternetReachable puede venir sin dato al principio: solo se avisa cuando es false seguro
    const sinConexion: boolean = red.isConnected === false || red.isInternetReachable === false;
    if (!sinConexion) return null;

    return (
        <View style={[styles.banda, { paddingTop: insets.top + 4 }]} pointerEvents="none">
            <Text style={styles.texto}>
                Sin conexión: estás viendo lo último guardado en el teléfono.
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    banda: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: "#B71C1C",
        paddingBottom: 6,
        paddingHorizontal: 12,
    },
    texto: { color: "#fff", textAlign: "center", fontWeight: "600", fontSize: 13 },
});
