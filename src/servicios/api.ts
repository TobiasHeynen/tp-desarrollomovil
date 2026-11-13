import { ErrorApi } from "../tipos";

//GENERAL - cliente de la API de la catedra, lo usan todos los servicios
//se encarga de: la direccion base, el token de sesion, el sobre { datos, meta } de las respuestas,
//los errores { error: { codigo, mensaje } } y los problemas de red (sin señal, servidor dormido)
//
//la direccion se configura en el archivo .env con EXPO_PUBLIC_API_URL (ver .env.example)
//  - con Expo Go: la IP de la computadora donde corre la API, ej. http://192.168.0.10:3000
//  - en el APK: la direccion publica de la API, ej. https://reservas-api.onrender.com

export const URL_API: string = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

//la API publicada en Render (plan gratis) se duerme y tarda cerca de un minuto en despertar
const ESPERA_MAXIMA_MS: number = 60 * 1000;

//token de la sesion actual: lo carga el AuthContext al ingresar y lo borra al cerrar sesion
let tokenSesion: string | null = null;

export function usarToken(token: string | null): void {
    tokenSesion = token;
}

export interface Meta {
    total: number;
    pagina: number;
    porPagina: number;
}

export interface RespuestaApi<T> {
    datos: T;
    meta: Meta | null;
}

export interface OpcionesPedido {
    metodo?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    cuerpo?: unknown;
    //si no viene, se usa el token de la sesion actual (si hay)
    token?: string | null;
    //para probar errores sin apagar el wifi: "error-500" o "demora-3000" (cabecera X-Simular de la API)
    simular?: string;
}

//hace un pedido a la API y devuelve el sobre completo { datos, meta }
//si algo sale mal tira ErrorApi con el codigo de la API, o "ERROR_RED" si no se pudo llegar
export async function pedir<T>(ruta: string, opciones: OpcionesPedido = {}): Promise<RespuestaApi<T>> {
    if (URL_API === "") {
        throw new ErrorApi(
            "API_NO_CONFIGURADA",
            "Falta configurar la dirección de la API (EXPO_PUBLIC_API_URL en el archivo .env)."
        );
    }

    const cabeceras: Record<string, string> = { Accept: "application/json" };
    if (opciones.cuerpo !== undefined) cabeceras["Content-Type"] = "application/json";

    const token: string | null = opciones.token !== undefined ? opciones.token : tokenSesion;
    if (token) cabeceras["Authorization"] = `Bearer ${token}`;
    if (opciones.simular) cabeceras["X-Simular"] = opciones.simular;

    //si la API no contesta en un tiempo razonable se corta el pedido
    const control = new AbortController();
    const temporizador = setTimeout(() => control.abort(), ESPERA_MAXIMA_MS);

    let respuesta: Response;
    try {
        respuesta = await fetch(URL_API + ruta, {
            method: opciones.metodo ?? "GET",
            headers: cabeceras,
            body: opciones.cuerpo !== undefined ? JSON.stringify(opciones.cuerpo) : undefined,
            signal: control.signal,
        });
    } catch (e) {
        throw new ErrorApi(
            "ERROR_RED",
            "No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo."
        );
    } finally {
        clearTimeout(temporizador);
    }

    //204: salio bien y no hay cuerpo (por ejemplo un DELETE)
    if (respuesta.status === 204) {
        return { datos: undefined as T, meta: null };
    }

    let cuerpo: any = null;
    try {
        cuerpo = await respuesta.json();
    } catch (e) {
        cuerpo = null;
    }

    if (!respuesta.ok) {
        //la API siempre manda { error: { codigo, mensaje } }, con un mensaje pensado para mostrarse tal cual
        if (cuerpo && cuerpo.error) {
            throw new ErrorApi(cuerpo.error.codigo, cuerpo.error.mensaje);
        }
        throw new ErrorApi("ERROR_INTERNO", "Algo salió mal en el servidor. Probá de nuevo en un rato.");
    }

    if (!cuerpo || !("datos" in cuerpo)) {
        throw new ErrorApi("RESPUESTA_INVALIDA", "El servidor respondió algo que no esperábamos.");
    }
    return cuerpo as RespuestaApi<T>;
}

//atajo para cuando solo interesan los datos (un recurso, sin paginacion)
export async function pedirDatos<T>(ruta: string, opciones: OpcionesPedido = {}): Promise<T> {
    const respuesta: RespuestaApi<T> = await pedir<T>(ruta, opciones);
    return respuesta.datos;
}

//true si el error es de conexion (sin señal, servidor apagado o dormido), no un rechazo de la API
export function esErrorDeRed(e: unknown): boolean {
    return e instanceof ErrorApi && e.codigo === "ERROR_RED";
}
