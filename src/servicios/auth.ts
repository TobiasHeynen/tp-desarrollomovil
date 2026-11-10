import { Usuario, ErrorApi } from "../tipos";
import { USUARIOS, CONTRASENIAS } from "../mocks/usuarios";

//TOBIAS - servicio de autenticacion
//hoy valida contra el mock, cuando llegue la API de la catedra solo cambia el cuerpo de estas funciones
//el token NO se guarda aca: lo guarda el AuthContext en expo-secure-store (nunca en kv-store)

function demorar<T>(valor: T, ms = 500): Promise<T> {
    return new Promise((resolve) => setTimeout(() => resolve(valor), ms));
}

const PREFIJO_TOKEN: string = "token-mock-";

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

export const LARGO_MINIMO_PASSWORD: number = 4;

export async function iniciarSesion(email: string, password: string): Promise<RespuestaSesion> {
    const emailNormalizado: string = normalizarEmail(email);
    const usuario: Usuario | undefined = USUARIOS.find((u) => u.email === emailNormalizado);

    //mismo mensaje para email o contraseña mal, asi no se puede adivinar que emails existen
    if (!usuario || CONTRASENIAS[usuario.id] !== password) {
        await demorar(null);
        throw new ErrorApi("CREDENCIALES_INVALIDAS", "Email o contraseña incorrectos.");
    }
    return demorar({ usuario: usuario, token: PREFIJO_TOKEN + usuario.id });
}

export async function registrarUsuario(datos: DatosRegistro): Promise<RespuestaSesion> {
    const email: string = normalizarEmail(datos.email);

    if (USUARIOS.some((u) => u.email === email)) {
        await demorar(null);
        throw new ErrorApi("EMAIL_EN_USO", "Ya existe una cuenta con ese email.");
    }

    const nuevo: Usuario = {
        id: `usr-${Math.floor(Math.random() * 900 + 100)}`,
        nombre: datos.nombre.trim(),
        email: email,
        telefono: datos.telefono.trim(),
        rol: "jugador",
        espaciosFavoritos: [],
        cancelacionesTardias: 0,
        ausencias: 0,
    };
    USUARIOS.push(nuevo);
    CONTRASENIAS[nuevo.id] = datos.password;
    return demorar({ usuario: nuevo, token: PREFIJO_TOKEN + nuevo.id });
}

//devuelve el usuario dueño del token (con la API real seria un GET con "Authorization: Bearer <token>")
//sirve para traer los datos actualizados al volver a abrir la app
export async function obtenerUsuarioActual(token: string, guardado: Usuario | null): Promise<Usuario> {
    if (!token.startsWith(PREFIJO_TOKEN)) {
        throw new ErrorApi("SESION_INVALIDA", "Tu sesión venció. Ingresá de nuevo.");
    }
    const id: string = token.slice(PREFIJO_TOKEN.length);
    let usuario: Usuario | undefined = USUARIOS.find((u) => u.id === id);

    //el mock vive en memoria y se borra al cerrar la app: si la cuenta se creo en una
    //ejecucion anterior, se vuelve a cargar con los datos guardados en el telefono
    //(con la API real esto no hace falta porque el servidor recuerda a los usuarios)
    if (!usuario && guardado && guardado.id === id) {
        usuario = guardado;
        USUARIOS.push(guardado);
    }

    if (!usuario) {
        throw new ErrorApi("SESION_INVALIDA", "Tu sesión venció. Ingresá de nuevo.");
    }
    return demorar(usuario, 300);
}
