import { Reserva, ErrorApi } from "../tipos";
import { RESERVAS } from "../mocks/reservas";
import { ESPACIOS } from "../mocks/espacios";
import { BLOQUEOS_MOCK } from "../mocks/turnos";

function demorar<T>(valor: T, ms = 500): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(valor), ms));
}

export async function bloquearTurnos(datos: {
  espacioId: string;
  fecha: string;
  horas?: string[]; // si no viene, bloquea el día entero
  motivo: string;
}): Promise<void> {
  BLOQUEOS_MOCK.push(datos);
  return demorar(undefined);
}

export async function cambiarPrecio(espacioId: string, precioPorHora: number): Promise<void> {
  const espacio = ESPACIOS.find((e) => e.id === espacioId);
  if (!espacio) throw new ErrorApi("ESPACIO_NO_ENCONTRADO", "No encontramos ese espacio.");
  espacio.precioPorHora = precioPorHora;
  return demorar(undefined);
}

// Escanea el QR en la puerta: valida que corresponda a ese día/cancha
// y marca el ingreso. `codigoEscaneado` es lo que lee expo-camera.
export async function escanearIngreso(codigoEscaneado: string): Promise<Reserva> {
  const reserva = RESERVAS.find((r) => r.codigoQr === codigoEscaneado);
  if (!reserva) {
    throw new ErrorApi("QR_INVALIDO", "Ese código no corresponde a ninguna reserva.");
  }
  if (reserva.estado !== "confirmada") {
    throw new ErrorApi("RESERVA_NO_VALIDA", "Esa reserva no está confirmada para hoy.");
  }
  reserva.ingresoEn = new Date().toISOString();
  return demorar(reserva);
}

export async function marcarAusente(reservaId: string): Promise<Reserva> {
  const reserva = RESERVAS.find((r) => r.id === reservaId);
  if (!reserva) throw new ErrorApi("RESERVA_NO_ENCONTRADA", "No encontramos esa reserva.");
  reserva.estado = "ausente";
  return demorar(reserva);
}

export async function agendaDelDia(fecha: string): Promise<Reserva[]> {
  return demorar(RESERVAS.filter((r) => r.turnoId.includes(fecha) && r.estado !== "cancelada"));
}
