import React, { createContext, useContext, useEffect, useState } from "react";
import { Usuario, ErrorApi } from "../tipos";
import { obtenerUsuarioActual, iniciarSesion as iniciarSesionServicio } from "../servicios/auth";
import {
    guardarToken,
    leerToken,
    borrarToken,
    guardarUsuario,
    leerUsuario,
    borrarUsuario,
    leerPedirHuella,
    guardarPedirHuella,
    hayBiometria,
    pedirHuella,
    ResultadoHuella,
} from "../servicios/sesion";

//TOBIAS - sesion de toda la app
//al abrir la app: si hay un token guardado, la sesion queda "bloqueada" hasta que la persona
//se identifica con huella/rostro (o con su contraseña si el telefono no tiene biometria)
//sin sesion la app se puede usar igual para mirar (el PRD pide no exigir cuenta para ver disponibilidad)

export type ResultadoDesbloqueo = ResultadoHuella | "sin_biometria";

interface SesionPendiente {
    token: string;
    usuario: Usuario;
}

interface AuthContextValor {
    usuario: Usuario | null;
    token: string | null;
    //true mientras se lee la sesion guardada al abrir la app
    cargando: boolean;
    //hay una sesion guardada esperando huella o contraseña
    bloqueada: boolean;
    usuarioBloqueado: Usuario | null;
    pedirHuellaAlAbrir: boolean;
    iniciarSesion: (usuario: Usuario, token: string) => Promise<void>;
    cerrarSesion: () => Promise<void>;
    desbloquear: () => Promise<ResultadoDesbloqueo>;
    desbloquearConPassword: (password: string) => Promise<void>;
    refrescarUsuario: () => Promise<void>;
    cambiarPedirHuella: (valor: boolean) => void;
}

const AuthContext = createContext<AuthContextValor | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [cargando, setCargando] = useState<boolean>(true);
    const [pendiente, setPendiente] = useState<SesionPendiente | null>(null);
    const [pedirHuellaAlAbrir, setPedirHuellaAlAbrir] = useState<boolean>(true);

    useEffect(() => {
        restaurarSesion();
    }, []);

    //lee lo que quedo guardado la ultima vez que se uso la app
    async function restaurarSesion(): Promise<void> {
        try {
            const preferencia: boolean = leerPedirHuella();
            setPedirHuellaAlAbrir(preferencia);

            const tokenGuardado: string | null = await leerToken();
            if (!tokenGuardado) return;

            const usuarioGuardado: Usuario | null = leerUsuario();
            if (!usuarioGuardado) {
                //quedo un token sin usuario (algo se borro a medias): se empieza de cero
                await borrarToken();
                return;
            }

            if (preferencia) {
                setPendiente({ token: tokenGuardado, usuario: usuarioGuardado });
            } else {
                abrirSesion(tokenGuardado, usuarioGuardado);
            }
        } catch (e) {
            console.warn("No se pudo leer la sesion guardada", e);
        } finally {
            setCargando(false);
        }
    }

    //deja la sesion abierta con lo guardado y despues trae los datos actualizados
    //si no hay conexion se sigue con los datos guardados (el PRD pide que la app funcione sin señal)
    function abrirSesion(t: string, guardado: Usuario): void {
        setToken(t);
        setUsuario(guardado);
        setPendiente(null);

        obtenerUsuarioActual(t, guardado)
            .then((actualizado) => {
                setUsuario(actualizado);
                guardarUsuario(actualizado);
            })
            .catch((e) => {
                if (e instanceof ErrorApi && e.codigo === "SESION_INVALIDA") {
                    cerrarSesion();
                }
            });
    }

    async function iniciarSesion(u: Usuario, t: string): Promise<void> {
        await guardarToken(t);
        guardarUsuario(u);
        setToken(t);
        setUsuario(u);
        setPendiente(null);
    }

    async function cerrarSesion(): Promise<void> {
        setUsuario(null);
        setToken(null);
        setPendiente(null);
        try {
            await borrarToken();
            borrarUsuario();
        } catch (e) {
            console.warn("No se pudo borrar la sesion guardada", e);
        }
    }

    async function desbloquear(): Promise<ResultadoDesbloqueo> {
        if (!pendiente) return "fallo";
        const disponible: boolean = await hayBiometria();
        if (!disponible) return "sin_biometria";

        const resultado: ResultadoHuella = await pedirHuella(`Hola ${pendiente.usuario.nombre}, confirmá que sos vos`);
        if (resultado === "ok") abrirSesion(pendiente.token, pendiente.usuario);
        return resultado;
    }

    //alternativa para el telefono sin huella ni rostro: se vuelve a validar la contraseña
    async function desbloquearConPassword(password: string): Promise<void> {
        if (!pendiente) return;
        const respuesta = await iniciarSesionServicio(pendiente.usuario.email, password);
        await iniciarSesion(respuesta.usuario, respuesta.token);
    }

    async function refrescarUsuario(): Promise<void> {
        if (!token || !usuario) return;
        try {
            const actualizado: Usuario = await obtenerUsuarioActual(token, usuario);
            //copia nueva para que React redibuje aunque el mock devuelva el mismo objeto
            setUsuario({ ...actualizado, espaciosFavoritos: [...actualizado.espaciosFavoritos] });
            guardarUsuario(actualizado);
        } catch (e) {
            if (e instanceof ErrorApi && e.codigo === "SESION_INVALIDA") await cerrarSesion();
        }
    }

    function cambiarPedirHuella(valor: boolean): void {
        guardarPedirHuella(valor);
        setPedirHuellaAlAbrir(valor);
    }

    return (
        <AuthContext.Provider
            value={{
                usuario,
                token,
                cargando,
                bloqueada: pendiente !== null,
                usuarioBloqueado: pendiente ? pendiente.usuario : null,
                pedirHuellaAlAbrir,
                iniciarSesion,
                cerrarSesion,
                desbloquear,
                desbloquearConPassword,
                refrescarUsuario,
                cambiarPedirHuella,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValor {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
    return ctx;
}
