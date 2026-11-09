import { Reserva, ErrorApi } from "../tipos";
import { RESERVAS } from "../mocks/reservas";
import { USUARIOS } from "../mocks/usuarios";

function demorar<T>(valor: T, ms = 500): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(valor), ms));
}

// PRD, sección 3: máximo 3 reservas activas por persona, para que no acaparen los sábados.
export const MAX_RESERVAS_ACTIVAS = 3;

// PRD, sección 3 y README hueco #3: "Que quien cancela tarde repetidas veces quede marcado."
// Se define el umbral en 2 cancelaciones tardías para marcar al jugador como recurrente.
export const UMBRAL_CANCELADOR_TARDIO = 2;

/**
 * Extrae la fecha ("AAAA-MM-DD") y el horario ("HH:00" a "HH+1:00")
 * a partir del identificador del turno (ej. "tur-esp-02-2026-09-19-19").
 */
export function extraerInfoTurno(turnoId: string): {
  fecha: string;
  inicio: string;
  fin: string;
} {
  const match = turnoId.match(/(\d{4}-\d{2}-\d{2})-(\d{2})$/);
  if (match) {
    const fecha = match[1];
    const horaNum = Number(match[2]);
    const inicio = `${String(horaNum).padStart(2, "0")}:00`;
    const fin = `${String(horaNum + 1).padStart(2, "0")}:00`;
    return { fecha, inicio, fin };
  }
  return { fecha: "Fecha asignada", inicio: "--:--", fin: "--:--" };
}

/**
 * Calcula el límite ISO hasta el cual se puede cancelar sin aviso
 * (exactamente 4 horas antes del inicio del turno, según PRD sección 3).
 */
function calcularCancelableHasta(turnoId: string): string {
  const { fecha, inicio } = extraerInfoTurno(turnoId);
  if (fecha !== "Fecha asignada") {
    const [anio, mes, dia] = fecha.split("-").map(Number);
    const [hora, min] = inicio.split(":").map(Number);
    const inicioTurno = new Date(anio, mes - 1, dia, hora, min, 0, 0);
    const limite = new Date(inicioTurno.getTime() - 4 * 60 * 60 * 1000);
    return limite.toISOString();
  }
  return new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
}

/**
 * Determina si cancelar en este instante constituye una cancelación tardía
 * (faltan menos de 4 horas para el inicio del turno).
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
  if (opciones.simularErrorRed) {
    await demorar(null, 300);
    throw new ErrorApi(
      "ERROR_RED",
      "No pudimos cargar tus reservas. Verificá tu conexión e intentá de nuevo."
    );
  }

  const mias = RESERVAS.filter((r) => r.usuarioId === usuarioId);
  return demorar({
    proximas: mias.filter((r) => r.estado === "confirmada"),
    pasadas: mias.filter((r) => r.estado !== "confirmada"),
  });
}

export async function obtenerReserva(id: string): Promise<Reserva> {
  const reserva = RESERVAS.find((r) => r.id === id);
  if (!reserva) {
    throw new ErrorApi("RESERVA_NO_ENCONTRADA", "No encontramos esa reserva.");
  }
  return demorar(reserva, 300);
}

export async function crearReserva(datos: {
  turnoId: string;
  espacioId: string;
  usuarioId: string;
  cantidadPersonas: number;
}): Promise<Reserva> {
  if (!datos.cantidadPersonas || datos.cantidadPersonas < 1) {
    throw new ErrorApi(
      "CANTIDAD_INVALIDA",
      "Indicá cuántas personas van a asistir al turno."
    );
  }

  const activas = RESERVAS.filter(
    (r) => r.usuarioId === datos.usuarioId && r.estado === "confirmada"
  );
  if (activas.length >= MAX_RESERVAS_ACTIVAS) {
    throw new ErrorApi(
      "LIMITE_RESERVAS",
      `Ya tenés ${MAX_RESERVAS_ACTIVAS} reservas activas. Cancelá una para reservar otra.`
    );
  }

  const yaTomado = RESERVAS.some(
    (r) => r.turnoId === datos.turnoId && r.estado === "confirmada"
  );
  if (yaTomado) {
    throw new ErrorApi("TURNO_OCUPADO", "Ese turno ya fue reservado.");
  }

  const numId = Math.floor(Math.random() * 9000 + 1000);
  const { fecha, inicio } = extraerInfoTurno(datos.turnoId);
  const sufijoFecha =
    fecha !== "Fecha asignada"
      ? `${fecha.slice(5, 7)}${fecha.slice(8, 10)}-${inicio.slice(0, 2)}`
      : `${Math.floor(Math.random() * 90 + 10)}`;

  const nueva: Reserva = {
    id: `res-${numId}`,
    turnoId: datos.turnoId,
    espacioId: datos.espacioId,
    usuarioId: datos.usuarioId,
    cantidadPersonas: datos.cantidadPersonas,
    codigoQr: `VGY-${numId}-${sufijoFecha}`,
    estado: "confirmada",
    ingresoEn: null,
    creadaEn: new Date().toISOString(),
    // Regla del PRD: hasta 4 horas antes del turno se cancela sola; después hay que avisar.
    cancelableHasta: calcularCancelableHasta(datos.turnoId),
  };
  RESERVAS.push(nueva);
  return demorar(nueva);
}

export async function cancelarReserva(id: string): Promise<Reserva> {
  const reserva = RESERVAS.find((r) => r.id === id);
  if (!reserva) {
    throw new ErrorApi("RESERVA_NO_ENCONTRADA", "No encontramos esa reserva.");
  }
  if (reserva.estado === "cancelada") {
    throw new ErrorApi("YA_CANCELADA", "Esta reserva ya fue cancelada.");
  }

  // PRD sección 3: "Hasta cuatro horas antes se cancela sola; después hay que avisarnos.
  // Que quien cancela tarde repetidas veces quede marcado."
  if (esCancelacionTardia(reserva.cancelableHasta)) {
    const autor = USUARIOS.find((u) => u.id === reserva.usuarioId);
    if (autor) {
      autor.cancelacionesTardias += 1;
    }
  }

  reserva.estado = "cancelada";
  return demorar(reserva);
}

export async function obtenerReserva(id: string): Promise<Reserva> {
  const reserva = RESERVAS.find((r) => r.id === id);
  if (!reserva) throw new ErrorApi("RESERVA_NO_ENCONTRADA", "No encontramos esa reserva.");
  return demorar({ ...reserva });
}
