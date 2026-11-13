import { Redirect, Stack } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "../../src/contextos/AuthContext";
import BannerRed from "../../src/componentes/BannerRed";

//PERSONA E - panel de encargado/administrador
//solo entran encargado y administrador (PRD seccion 6); el resto vuelve a las pestañas

export default function LayoutAdmin() {
    const { usuario, cargando } = useAuth();

    if (cargando) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" color="#2E7D32" />
            </View>
        );
    }

    if (!usuario || (usuario.rol !== "encargado" && usuario.rol !== "administrador")) {
        return <Redirect href="/(tabs)" />;
    }

    return (
        <>
            <BannerRed />
            <Stack>
                <Stack.Screen name="agenda" options={{ title: "Agenda del día" }} />
                <Stack.Screen name="escanear" options={{ title: "Escanear ingreso" }} />
                <Stack.Screen name="bloqueos" options={{ title: "Bloquear turnos" }} />
                <Stack.Screen name="fijas" options={{ title: "Reservas fijas" }} />
                <Stack.Screen name="precios" options={{ title: "Precios" }} />
            </Stack>
        </>
    );
}