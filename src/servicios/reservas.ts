import { Reserva, ErrorApi } from "../tipos";
import { RESERVAS } from "../mocks/reservas";

function demorar<T>(valor: T, ms = 500): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(valor), ms));
}

const MAX_RESERVAS_ACTIVAS = 3; // PRD, sección 3: máximo 3 reservas activas por persona.

export async function listarMisReservas(
  usuarioId: string
): Promise<{ proximas: Reserva[]; pasadas: Reserva[] }> {
  const mias = RESERVAS.filter((r) => r.usuarioId === usuarioId);
  const ahora = new Date().toISOString();
  return demorar({
    proximas: mias.filter((r) => r.estado === "confirmada" && r.creadaEn <= ahora),
    pasadas: mias.filter((r) => r.estado !== "confirmada"),
  });
}

export async function crearReserva(datos: {
  turnoId: string;
  espacioId: string;
  usuarioId: string;
  cantidadPersonas: number;
}): Promise<Reserva> {
  const activas = RESERVAS.filter(
    (r) => r.usuarioId === datos.usuarioId && r.estado === "confirmada"
  );
  if (activas.length >= MAX_RESERVAS_ACTIVAS) {
    throw new ErrorApi(
      "LIMITE_RESERVAS",
      `Ya tenés ${MAX_RESERVAS_ACTIVAS} reservas activas. Cancelá una para reservar otra.`
    );
  }

  const yaTomado = RESERVAS.some((r) => r.turnoId === datos.turnoId && r.estado === "confirmada");
  if (yaTomado) {
    throw new ErrorApi("TURNO_OCUPADO", "Ese turno ya fue reservado.");
  }

  const nueva: Reserva = {
    id: `res-${Math.floor(Math.random() * 9000 + 1000)}`,
    turnoId: datos.turnoId,
    espacioId: datos.espacioId,
    usuarioId: datos.usuarioId,
    cantidadPersonas: datos.cantidadPersonas,
    codigoQr: `VGY-${Math.floor(Math.random() * 9000 + 1000)}`,
    estado: "confirmada",
    ingresoEn: null,
    creadaEn: new Date().toISOString(),
    // Regla del PRD: se puede cancelar sola hasta 4 horas antes.
    cancelableHasta: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
  };
  RESERVAS.push(nueva);
  return demorar(nueva);
}

export async function cancelarReserva(id: string): Promise<Reserva> {
  const reserva = RESERVAS.find((r) => r.id === id);
  if (!reserva) throw new ErrorApi("RESERVA_NO_ENCONTRADA", "No encontramos esa reserva.");
  reserva.estado = "cancelada";
  return demorar(reserva);
}
