import { Usuario } from "../tipos";
import { pedirDatos } from "./api";

//TOBIAS - servicio de autenticacion contra la API de la catedra
//  POST /auth/ingreso  -> { token, usuario }
//  POST /auth/registro -> { token, usuario }   (siempre crea un jugador)
//  GET  /yo            -> el Usuario dueño del token
//el token NO se guarda aca: lo guarda el AuthContext en expo-secure-store (nunca en kv-store)
//los errores llegan como ErrorApi con el codigo y el mensaje de la API (ej. CREDENCIALES_INVALIDAS)

export interface RespuestaSesion {
    usuario: Usuario;
    token: string;
}

export interface DatosRegistro {
    nombre: string;
    email: string;
    telefono: string;
    password: string;
}

//pasa el email a minusculas y sin espacios, asi "Emiliano@Mail.com " es el mismo usuario
export function normalizarEmail(email: string): string {
    return email.trim().toLowerCase();
}

export function esEmailValido(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizarEmail(email));
}

//mismas reglas que la API, asi el error se ve antes de mandar el formulario
export const LARGO_MINIMO_PASSWORD: number = 8;

export function esTelefonoValido(telefono: string): boolean {
    return /^\+?[0-9][0-9 ()-]{5,28}$/.test(telefono.trim());
}

export async function iniciarSesion(email: string, password: string): Promise<RespuestaSesion> {
    return pedirDatos<RespuestaSesion>("/auth/ingreso", {
        metodo: "POST",
        cuerpo: { email: normalizarEmail(email), contrasena: password },
        token: null,
    });
}

export async function registrarUsuario(datos: DatosRegistro): Promise<RespuestaSesion> {
    return pedirDatos<RespuestaSesion>("/auth/registro", {
        metodo: "POST",
        cuerpo: {
            nombre: datos.nombre.trim(),
            email: normalizarEmail(datos.email),
            contrasena: datos.password,
            telefono: datos.telefono.trim(),
        },
        token: null,
    });
}

//devuelve el usuario dueño del token, con sus datos al dia (favoritos, cancelaciones, ausencias)
//si el token vencio (dura 30 dias) la API responde NO_AUTENTICADO
export async function obtenerUsuarioActual(token: string): Promise<Usuario> {
    return pedirDatos<Usuario>("/yo", { token: token });
}
