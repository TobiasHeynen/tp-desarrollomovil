import { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import * as Network from "expo-network";
import { useSafeAreaInsets } from "react-native-safe-area-context";

//PERSONA E - aviso del estado de la red con expo-network
//aparece arriba de la app mientras el telefono no tiene conexion

export default function BannerRed() {
    const [online, setOnline] = useState<boolean>(true);
    const insets = useSafeAreaInsets();

    useEffect(() => {
        Network.getNetworkStateAsync().then((estado) => {
            setOnline(!!estado.isConnected);
        });

        const suscripcion = Network.addNetworkStateListener((estado) => {
            setOnline(!!estado.isConnected);
        });

        return () => suscripcion.remove();
    }, []);

    if (online) {
        return null;
    }

    return (
        <View style={[styles.banner, { paddingTop: insets.top + 6 }]}>
            <Text style={styles.texto}>
                Sin conexión: se muestran los datos guardados en el teléfono.
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    banner: { 
        backgroundColor: "#B00020", 
        paddingBottom: 6, 
        paddingHorizontal: 12 
    },
    texto: { 
        color: "#fff", 
        textAlign: "center", 
        fontSize: 12, 
        fontWeight: "600" 
    },
});