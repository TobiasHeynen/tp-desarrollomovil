import { Turno, ErrorApi } from "../tipos";
import { generarGrillaMock } from "../mocks/turnos";

function demorar<T>(valor: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(valor), ms));
}

function hoyISO(): string {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

/**
 * Devuelve la grilla de un espacio para un día puntual, ya resuelta
 * (turnos + fijas + bloqueos cruzados). Un turno cuya hora ya pasó
 * (si `fecha` es hoy) se marca igual como "reservado" a nivel de UI
 * para impedir reservarlo -- ver componente CeldaTurno.
 */
export async function obtenerGrilla(espacioId: string, fecha: string): Promise<Turno[]> {
  if (fecha < hoyISO()) {
    throw new ErrorApi("FECHA_INVALIDA", "No se puede consultar un día pasado.");
  }
  return demorar(generarGrillaMock(espacioId, fecha));
}

export function esTurnoPasado(fecha: string, inicio: string): boolean {
  const ahora = new Date();
  const [h, m] = inicio.split(":").map(Number);
  // Ojo: "new Date(fecha)" con un string "AAAA-MM-DD" lo interpreta como
  // medianoche UTC, no local -- en Argentina (UTC-3) eso corre la fecha
  // un día para atrás y marcaba todos los turnos como "pasados". Por eso
  // se arma la fecha con año/mes/día por separado, en horario local.
  const [anio, mesNum, diaNum] = fecha.split("-").map(Number);
  const turnoFecha = new Date(anio, mesNum - 1, diaNum, h, m, 0, 0);
  return turnoFecha.getTime() < ahora.getTime();
}