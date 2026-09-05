import { Usuario, ErrorApi } from "../tipos";
import { USUARIOS } from "../mocks/usuarios";

function demorar<T>(valor: T, ms = 500): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(valor), ms));
}

// El token real lo guarda quien consuma este servicio, en expo-secure-store
// (nunca en kv-store). Acá solo se simula la validación contra el mock.
export async function iniciarSesion(email: string, _password: string): Promise<{ usuario: Usuario; token: string }> {
  const usuario = USUARIOS.find((u) => u.email === email);
  if (!usuario) throw new ErrorApi("CREDENCIALES_INVALIDAS", "Email o contraseña incorrectos.");
  return demorar({ usuario, token: `token-mock-${usuario.id}` });
}

export async function registrarUsuario(datos: {
  nombre: string;
  email: string;
  telefono: string;
}): Promise<{ usuario: Usuario; token: string }> {
  const nuevo: Usuario = {
    id: `usr-${Math.floor(Math.random() * 900 + 100)}`,
    nombre: datos.nombre,
    email: datos.email,
    telefono: datos.telefono,
    rol: "jugador",
    espaciosFavoritos: [],
    cancelacionesTardias: 0,
    ausencias: 0,
  };
  USUARIOS.push(nuevo);
  return demorar({ usuario: nuevo, token: `token-mock-${nuevo.id}` });
}
