import { useEffect } from "react";
import { AppState } from "react-native";
import { useAuth } from "../contextos/AuthContext";
import { revisarAvisos } from "../servicios/avisos";

//PERSONA D - componente sin pantalla
//mientras haya sesion revisa los avisos al iniciar, cada 30 segundos y cuando la app vuelve al frente

const CADA_MS: number = 30 * 1000;

export default function AvisosWatcher() {
    const { usuario } = useAuth();

    useEffect(() => {
        if (!usuario) return;

        function revisar() {
            revisarAvisos(usuario!).catch((e) => console.warn("Error al revisar avisos", e));
        }

        revisar();
        const intervalo = setInterval(revisar, CADA_MS);
        const suscripcion = AppState.addEventListener("change", (estado) => {
            if (estado === "active") revisar();
        });

        return () => {
            clearInterval(intervalo);
            suscripcion.remove();
        };
    }, [usuario]);

    return null;
}
