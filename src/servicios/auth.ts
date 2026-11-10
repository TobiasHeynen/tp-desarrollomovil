import Storage from "expo-sqlite/kv-store";
import { Usuario, ErrorApi } from "../tipos";
import { USUARIOS, CONTRASENIAS } from "../mocks/usuarios";

//TOBIAS - servicio de autenticacion
//hoy valida contra el mock, cuando llegue la API de la catedra solo cambia el cuerpo de estas funciones
//el token NO se guarda aca: lo guarda el AuthContext en expo-secure-store (nunca en kv-store)

function demorar<T>(valor: T, ms = 500): Promise<T> {
    return new Promise((resolve) => setTimeout(() => resolve(valor), ms));
}

//SOLO PARA EL MOCK: el mock vive en memoria y se borra al cerrar la app, entonces una cuenta
//creada desde "Crear cuenta" desaparecia y despues no se podia volver a entrar con ella.
//Para simular que el servidor recuerda las cuentas, se guardan en el telefono.
//Cuando llegue la API real esto se borra (las cuentas las guarda el servidor).
const CLAVE_REGISTRADOS: string = "mock:usuariosRegistrados";

interface CuentaRegistrada {
    usuario: Usuario;
    password: string;
}

function leerRegistrados(): CuentaRegistrada[] {
    try {
        const crudo: string | null = Storage.getItemSync(CLAVE_REGISTRADOS);
        return crudo ? (JSON.parse(crudo) as CuentaRegistrada[]) : [];
    } catch (e) {
        return [];
    }
}

//al cargar el servicio se suman al mock las cuentas creadas en usos anteriores
for (const cuenta of leerRegistrados()) {
    if (!USUARIOS.some((u) => u.id === cuenta.usuario.id)) {
        USUARIOS.push(cuenta.usuario);
        CONTRASENIAS[cuenta.usuario.id] = cuenta.password;
    }
}

function guardarRegistrado(usuario: Usuario, password: string): void {
    const cuentas: CuentaRegistrada[] = leerRegistrados();
    cuentas.push({ usuario: usuario, password: password });
    Storage.setItemSync(CLAVE_REGISTRADOS, JSON.stringify(cuentas));
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
    guardarRegistrado(nuevo, datos.password);
    return demorar({ usuario: nuevo, token: PREFIJO_TOKEN + nuevo.id });
}

//devuelve el usuario dueño del token (con la API real seria un GET con "Authorization: Bearer <token>")
//sirve para traer los datos actualizados al volver a abrir la app
export async function obtenerUsuarioActual(token: string): Promise<Usuario> {
    if (!token.startsWith(PREFIJO_TOKEN)) {
        throw new ErrorApi("SESION_INVALIDA", "Tu sesión venció. Ingresá de nuevo.");
    }
    const id: string = token.slice(PREFIJO_TOKEN.length);
    const usuario: Usuario | undefined = USUARIOS.find((u) => u.id === id);

    if (!usuario) {
        throw new ErrorApi("SESION_INVALIDA", "Tu sesión venció. Ingresá de nuevo.");
    }
    return demorar(usuario, 300);
}
