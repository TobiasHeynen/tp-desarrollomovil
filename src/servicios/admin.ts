import { Reserva, Turno, ReservaFija, Espacio } from "../tipos";
import { pedir, pedirDatos } from "./api";

// PERSONA E — Funciones del encargado y del administrador, contra la API de la cátedra.
// La API controla los permisos: un jugador recibe SIN_PERMISO; las fijas y los
// precios son solo del administrador.
//   GET    /agenda?fecha=           turnos de todos los espacios ese día
//   GET    /reservas?fecha=         reservas de ese día (para saber quién tiene cada turno)
//   POST   /ingresos                { codigoQr, espacioId }
//   POST   /reservas/<id>/ausente
//   POST   /bloqueos  GET /bloqueos  DELETE /bloqueos/<id>
//   GET    /fijas  POST /fijas  PATCH /fijas/<id>  DELETE /fijas/<id>
//   PATCH  /espacios/<id>           { precioPorHora }

// La API agrega este tipo (no está en el PRD): un bloqueo sin horas cubre el día entero.
export interface Bloqueo {
  id: string;
  espacioId: string;
  fecha: string; // "AAAA-MM-DD"
  inicio: string | null; // "HH:MM"
  fin: string | null;
  motivo: string;
}

// ---------- agenda e ingreso ----------

export interface AgendaDelDia {
  turnos: Turno[];
  reservas: Record<string, Reserva>; // reservaId -> reserva
}

export async function agendaDelDia(fecha: string): Promise<AgendaDelDia> {
  const [turnos, reservas] = await Promise.all([
    pedir<Turno[]>(`/agenda?fecha=${fecha}&porPagina=500`),
    pedir<Reserva[]>(`/reservas?fecha=${fecha}&porPagina=100`),
  ]);
  const porId: Record<string, Reserva> = {};
  reservas.datos.forEach((r) => {
    porId[r.id] = r;
  });
  return { turnos: turnos.datos, reservas: porId };
}

// Escanea el QR en la puerta. La API valida que la reserva sea de hoy, de esa
// cancha y del horario, y si no, responde con el motivo (CODIGO_DE_OTRO_DIA,
// CODIGO_DE_OTRO_ESPACIO, FUERA_DE_HORARIO, INGRESO_YA_REGISTRADO, ...).
export async function escanearIngreso(codigoQr: string, espacioId: string): Promise<Reserva> {
  return pedirDatos<Reserva>("/ingresos", {
    metodo: "POST",
    cuerpo: { codigoQr: codigoQr.trim(), espacioId },
  });
}

// "No se presentó": la API lo permite desde 15 minutos después del inicio.
export async function marcarAusente(reservaId: string): Promise<Reserva> {
  return pedirDatos<Reserva>(`/reservas/${encodeURIComponent(reservaId)}/ausente`, {
    metodo: "POST",
    cuerpo: {},
  });
}

// ---------- bloqueos ----------

export async function bloquearTurnos(datos: {
  espacioIds: string[];
  fecha: string;
  inicio?: string; // sin horas: el día entero
  fin?: string;
  motivo: string;
}): Promise<Bloqueo[]> {
  const respuesta = await pedir<Bloqueo[]>("/bloqueos", { metodo: "POST", cuerpo: datos });
  return respuesta.datos;
}

export async function listarBloqueos(): Promise<Bloqueo[]> {
  const respuesta = await pedir<Bloqueo[]>("/bloqueos?porPagina=100");
  return respuesta.datos;
}

export async function quitarBloqueo(id: string): Promise<void> {
  await pedir<void>(`/bloqueos/${encodeURIComponent(id)}`, { metodo: "DELETE" });
}

// ---------- reservas fijas ----------

export type DatosFija = Omit<ReservaFija, "id" | "activa">;

export async function listarFijas(): Promise<ReservaFija[]> {
  const respuesta = await pedir<ReservaFija[]>("/fijas?porPagina=100");
  return respuesta.datos;
}

export async function crearFija(datos: DatosFija): Promise<ReservaFija> {
  return pedirDatos<ReservaFija>("/fijas", { metodo: "POST", cuerpo: datos });
}

// El espacio de una fija no se puede cambiar: solo titular, día, horario y fechas.
export async function editarFija(
  id: string,
  cambios: Partial<Omit<DatosFija, "espacioId">>
): Promise<ReservaFija> {
  return pedirDatos<ReservaFija>(`/fijas/${encodeURIComponent(id)}`, {
    metodo: "PATCH",
    cuerpo: cambios,
  });
}

// Da de baja la fija (queda con activa: false).
export async function darDeBajaFija(id: string): Promise<void> {
  await pedir<void>(`/fijas/${encodeURIComponent(id)}`, { metodo: "DELETE" });
}

// ---------- precios ----------

export async function cambiarPrecio(espacioId: string, precioPorHora: number): Promise<Espacio> {
  return pedirDatos<Espacio>(`/espacios/${encodeURIComponent(espacioId)}`, {
    metodo: "PATCH",
    cuerpo: { precioPorHora },
  });
}
