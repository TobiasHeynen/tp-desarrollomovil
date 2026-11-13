import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider, useAuth } from "../src/contextos/AuthContext";
import AvisosWatcher from "../src/componentes/AvisosWatcher";
import PantallaBloqueo from "../src/componentes/PantallaBloqueo";
import AvisoSinConexion from "../src/componentes/AvisoSinConexion";

//TOBIAS - layout raiz
//la pantalla de presentacion queda visible hasta que se termina de leer la sesion guardada
//no se obliga a iniciar sesion: el PRD dice "no pidan cuenta para mirar la disponibilidad",
//asi que el listado y la ficha son publicos y la cuenta se pide recien al reservar
//si hay una sesion guardada, se tapa la app con la pantalla de bloqueo hasta poner la huella

SplashScreen.preventAutoHideAsync().catch(() => {});

//la app siempre arranca en las pestañas (listado de espacios), nunca en el login
export const unstable_settings = {
    initialRouteName: "(tabs)",
};

function Navegacion() {
    const { cargando, bloqueada } = useAuth();

    useEffect(() => {
        if (!cargando) SplashScreen.hideAsync().catch(() => {});
    }, [cargando]);

    //mientras carga sigue la pantalla de presentacion del sistema
    if (cargando) return null;

    return (
        <>
            <AvisosWatcher />
            <Stack screenOptions={{ headerShown: true }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="espacio/[id]/index" options={{ title: "Espacio" }} />
                <Stack.Screen name="espacio/[id]/disponibilidad" options={{ title: "Disponibilidad" }} />
                <Stack.Screen name="reserva/[id]" options={{ title: "Mi reserva" }} />
                <Stack.Screen name="admin" options={{ headerShown: false }} />
            </Stack>
            {bloqueada && <PantallaBloqueo />}
            <AvisoSinConexion />
        </>
    );
}

export default function LayoutRaiz() {
    return (
        <AuthProvider>
            <Navegacion />
        </AuthProvider>
    );
}
