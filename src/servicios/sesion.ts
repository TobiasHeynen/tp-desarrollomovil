import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";
import Storage from "expo-sqlite/kv-store";
import { Usuario } from "../tipos";

//TOBIAS - todo lo que se guarda en el telefono para la sesion
//- el token va en expo-secure-store (cifrado), nunca en kv-store (lo pide el PRD)
//- los datos del usuario y las preferencias van en expo-sqlite/kv-store
//- el reingreso se hace con huella o rostro usando expo-local-authentication

const CLAVE_TOKEN: string = "sesion_token";
const CLAVE_USUARIO: string = "sesion:usuario";
const CLAVE_PEDIR_HUELLA: string = "preferencias:pedirHuella";

// ---------- token (secure-store) ----------

export async function guardarToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(CLAVE_TOKEN, token);
}

export async function leerToken(): Promise<string | null> {
    try {
        return await SecureStore.getItemAsync(CLAVE_TOKEN);
    } catch (e) {
        //si el llavero del telefono falla, se toma como que no hay sesion
        return null;
    }
}

export async function borrarToken(): Promise<void> {
    await SecureStore.deleteItemAsync(CLAVE_TOKEN);
}

// ---------- usuario y preferencias (kv-store) ----------

export function guardarUsuario(usuario: Usuario): void {
    Storage.setItemSync(CLAVE_USUARIO, JSON.stringify(usuario));
}

export function leerUsuario(): Usuario | null {
    try {
        const crudo: string | null = Storage.getItemSync(CLAVE_USUARIO);
        return crudo ? (JSON.parse(crudo) as Usuario) : null;
    } catch (e) {
        return null;
    }
}

export function borrarUsuario(): void {
    Storage.removeItemSync(CLAVE_USUARIO);
}

//preferencia del perfil: pedir huella al volver a abrir la app (por defecto si)
export function leerPedirHuella(): boolean {
    return Storage.getItemSync(CLAVE_PEDIR_HUELLA) !== "no";
}

export function guardarPedirHuella(valor: boolean): void {
    Storage.setItemSync(CLAVE_PEDIR_HUELLA, valor ? "si" : "no");
}

// ---------- huella / rostro (local-authentication) ----------

//true si el telefono tiene sensor y la persona tiene cargada una huella o rostro
export async function hayBiometria(): Promise<boolean> {
    try {
        const tieneSensor: boolean = await LocalAuthentication.hasHardwareAsync();
        if (!tieneSensor) return false;
        return await LocalAuthentication.isEnrolledAsync();
    } catch (e) {
        return false;
    }
}

export type ResultadoHuella = "ok" | "cancelado" | "fallo";

export async function pedirHuella(mensaje: string): Promise<ResultadoHuella> {
    const resultado = await LocalAuthentication.authenticateAsync({
        promptMessage: mensaje,
        cancelLabel: "Cancelar",
        //si la huella falla varias veces el telefono ofrece su PIN o patron
        disableDeviceFallback: false,
    });
    if (resultado.success) return "ok";
    if (
        resultado.error === "user_cancel" ||
        resultado.error === "system_cancel" ||
        resultado.error === "app_cancel"
    ) {
        return "cancelado";
    }
    return "fallo";
}
