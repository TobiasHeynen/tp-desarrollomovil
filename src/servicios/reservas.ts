import Storage from "expo-sqlite/kv-store";
import { Reserva } from "../tipos";
import { pedir, pedirDatos } from "./api";
import { conCache } from "./cache";
import { leerTurnoId, DatosTurno } from "../utilidades/turnoId";

// PERSONA C — Reservas contra la API de la cátedra.
//   POST /reservas                      { turnoId, cantidadPersonas }
//   GET  /yo/reservas?cuando=proximas   confirmadas cuyo turno no terminó
//   GET  /yo/reservas?cuando=pasadas    todas las demás
//   GET  /reservas/<id>
//   POST /reservas/<id>/cancelacion     solo hasta 4 horas antes
// Las reglas (máximo 3 activas, turno ocupado, capacidad, plazo de
// cancelación) las controla la API y responde con un código de error.

// PRD, sección 3: máximo 3 reservas activas por persona, para que no acaparen los sábados.
// La API lo controla (LIMITE_DE_RESERVAS); acá se usa para mostrar el cupo.
export const MAX_RESERVAS_ACTIVAS = 3;

// PRD, sección 3: "Que quien cancela tarde repetidas veces quede marcado."
// El PRD no dice desde cuántas: se tomó 2 para mostrar el aviso.
export const UMBRAL_CANCELADOR_TARDIO = 2;

/**
 * Extrae la fecha ("AAAA-MM-DD") y el horario ("HH:00" a "HH+1:00")
 * a partir del identificador del turno (ej. "tur-esp-02-20260919-19").
 */
export function extraerInfoTurno(turnoId: string): {
  fecha: string;
  inicio: string;
  fin: string;
} {
  const datos: DatosTurno | null = leerTurnoId(turnoId);
  if (datos) {
    return { fecha: datos.fecha, inicio: datos.hora, fin: datos.fin };
  }
  return { fecha: "Fecha asignada", inicio: "--:--", fin: "--:--" };
}

/**
 * true si ya pasó el límite para cancelar desde la app (4 horas antes del
 * turno). Después de eso la API rechaza la cancelación y hay que avisarle
 * al encargado.
 */
export function esCancelacionTardia(cancelableHasta: string): boolean {
  const limiteMs = new Date(cancelableHasta).getTime();
  if (Number.isNaN(limiteMs)) return false;
  return Date.now() > limiteMs;
}

export async function listarMisReservas(
  usuarioId: string,
  opciones: { simularErrorRed?: boolean } = {}
): Promise<{ proximas: Reserva[]; pasadas: Reserva[] }> {
  const simular = opciones.simularErrorRed ? "error-500" : undefined;
  // Se guarda una copia por usuario para poder ver las reservas sin señal.
  return conCache(`misReservas:${usuarioId}`, async () => {
    const [proximas, pasadas] = await Promise.all([
      pedir<Reserva[]>("/yo/reservas?cuando=proximas&porPagina=100", { simular }),
      pedir<Reserva[]>("/yo/reservas?cuando=pasadas&porPagina=100", { simular }),
    ]);
    return { proximas: proximas.datos, pasadas: pasadas.datos };
  });
}

export async function obtenerReserva(id: string): Promise<Reserva> {
  return pedirDatos<Reserva>(`/reservas/${encodeURIComponent(id)}`);
}

export async function crearReserva(datos: {
  turnoId: string;
  cantidadPersonas: number;
}): Promise<Reserva> {
  return pedirDatos<Reserva>("/reservas", {
    metodo: "POST",
    cuerpo: { turnoId: datos.turnoId, cantidadPersonas: datos.cantidadPersonas },
  });
}

// Se anotan las reservas que cancela la propia persona: así el aviso de
// "turno suspendido" no salta por una cancelación que hizo ella misma.
const CLAVE_CANCELADAS_POR_MI = "reservas:canceladasPorMi";

export function canceladasPorMi(): string[] {
  try {
    const crudo = Storage.getItemSync(CLAVE_CANCELADAS_POR_MI);
    return crudo ? (JSON.parse(crudo) as string[]) : [];
  } catch (e) {
    return [];
  }
}

export async function cancelarReserva(id: string): Promise<Reserva> {
  const reserva = await pedirDatos<Reserva>(
    `/reservas/${encodeURIComponent(id)}/cancelacion`,
    { metodo: "POST", cuerpo: {} }
  );
  const lista = canceladasPorMi();
  if (!lista.includes(id)) {
    Storage.setItemSync(CLAVE_CANCELADAS_POR_MI, JSON.stringify([...lista, id]));
  }
  return reserva;
}
