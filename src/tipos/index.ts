// Tipos únicos de la app. Se escriben una sola vez acá y NO se tocan
// cuando llegue la API real de la cátedra: los servicios son los que
// van a cambiar (mock -> fetch), los tipos quedan igual.

export interface Coordenadas {
  latitud: number;
  longitud: number;
}

export interface Deporte {
  id: string;
  nombre: string;
  icono: string; // nombre de ícono de @react-native-vector-icons/ionicons
  color: string;
}

export interface Espacio {
  id: string;
  nombre: string;
  deporteId: string;
  complejo: string;
  superficie: string;
  techado: boolean;
  iluminacion: boolean;
  capacidad: number;
  precioPorHora: number;
  coordenadas: Coordenadas;
  imagenes: string[];
  videoUrl: string | null;
  reglas: string;
  activo: boolean;
}

export type EstadoTurno = "libre" | "reservado" | "fijo" | "mantenimiento";

export interface Turno {
  id: string;
  espacioId: string;
  fecha: string; // "AAAA-MM-DD"
  inicio: string; // "HH:MM"
  fin: string;
  estado: EstadoTurno;
  reservaId: string | null;
  motivoBloqueo: string | null;
  precio: number;
}

export type EstadoReserva = "confirmada" | "cancelada" | "cumplida" | "ausente";

export interface Reserva {
  id: string;
  turnoId: string;
  espacioId: string;
  usuarioId: string;
  cantidadPersonas: number;
  codigoQr: string;
  estado: EstadoReserva;
  ingresoEn: string | null;
  creadaEn: string;
  cancelableHasta: string;
}

export interface ReservaFija {
  id: string;
  espacioId: string;
  titular: string;
  dia: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = domingo
  inicio: string;
  fin: string;
  desde: string;
  hasta: string | null;
  activa: boolean;
}

export type Rol = "jugador" | "encargado" | "administrador";

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  rol: Rol;
  espaciosFavoritos: string[];
  cancelacionesTardias: number;
  ausencias: number;
}

// Sobre de respuesta de la API (ver PRD, sección "Cómo va a venir la
// información"). Todos los servicios devuelven/lanzan esta forma.
export interface RespuestaExito<T> {
  datos: T;
  meta: { total: number; pagina: number; porPagina: number };
}

export interface ErrorApiPayload {
  codigo: string;
  mensaje: string;
}

export class ErrorApi extends Error {
  codigo: string;
  constructor(codigo: string, mensaje: string) {
    super(mensaje);
    this.codigo = codigo;
  }
}

// PENDIENTE DE CONFIRMAR CON EL CLIENTE (ver README, sección "Huecos del
// PRD"): un bloqueo de mantenimiento/lluvia no aparece como entidad propia
// en el documento, solo como acción ("bloquear turnos o días enteros con
// un motivo"). Por ahora se resuelve marcando cada Turno afectado con
// estado:"mantenimiento" + motivoBloqueo, sin entidad Bloqueo separada.
