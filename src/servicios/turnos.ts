import { Turno, ErrorApi } from "../tipos";
import { pedir } from "./api";
import { conCache } from "./cache";

// PERSONA C — Turnos contra la API de la cátedra.
//   GET /espacios/<id>/turnos?fecha=AAAA-MM-DD
// La API ya devuelve la grilla resuelta: cruza reservas, reservas fijas y
// bloqueos, con prioridad mantenimiento > fijo > reservado > libre.

const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DIAS_LARGOS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export function hoyISO(): string {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

export interface DiaSeleccionable {
  fecha: string; // "AAAA-MM-DD"
  diaSemanaCorto: string; // "Mar"
  numeroDia: string; // "20"
  etiquetaCorta: string; // "Hoy" | "Mañana" | "Mar 20"
  etiquetaLarga: string; // "Martes 20 de octubre"
}

/**
 * PRD sección 2: "Poder mirar los próximos siete días."
 * Genera los 7 días contiguos a partir de hoy en horario local.
 */
export function obtenerProximosDias(cantidad = 7): DiaSeleccionable[] {
  const base = new Date();
  base.setHours(0, 0, 0, 0);

  const dias: DiaSeleccionable[] = [];
  for (let i = 0; i < cantidad; i++) {
    const fechaObj = new Date(base);
    fechaObj.setDate(base.getDate() + i);

    const anio = fechaObj.getFullYear();
    const mes = String(fechaObj.getMonth() + 1).padStart(2, "0");
    const dia = String(fechaObj.getDate()).padStart(2, "0");
    const fechaISO = `${anio}-${mes}-${dia}`;

    const diaSem = fechaObj.getDay();
    const nombreCorto = DIAS_CORTOS[diaSem];
    const nombreLargo = DIAS_LARGOS[diaSem];
    const nombreMes = MESES[fechaObj.getMonth()];

    const etiquetaCorta =
      i === 0 ? "Hoy" : i === 1 ? "Mañana" : `${nombreCorto} ${dia}`;
    const etiquetaLarga = `${nombreLargo} ${Number(dia)} de ${nombreMes}`;

    dias.push({
      fecha: fechaISO,
      diaSemanaCorto: i === 0 ? "Hoy" : nombreCorto,
      numeroDia: dia,
      etiquetaCorta,
      etiquetaLarga,
    });
  }
  return dias;
}

export interface OpcionesGrilla {
  // Para la demo: pide a la API que responda con error (cabecera X-Simular).
  simularErrorRed?: boolean;
}

/**
 * Devuelve la grilla de un espacio para un día puntual (16 turnos, de 8 a 24),
 * ya resuelta por la API. Un turno cuya hora ya pasó se valida en la UI con
 * `esTurnoPasado` para impedir reservarlo. Sin conexión devuelve la última
 * grilla guardada de ese día.
 */
export async function obtenerGrilla(
  espacioId: string,
  fecha: string,
  opciones: OpcionesGrilla = {}
): Promise<Turno[]> {
  if (fecha < hoyISO()) {
    throw new ErrorApi("FECHA_INVALIDA", "No se puede consultar un día pasado.");
  }

  return conCache(`grilla:${espacioId}:${fecha}`, async () => {
    const respuesta = await pedir<Turno[]>(
      `/espacios/${encodeURIComponent(espacioId)}/turnos?fecha=${fecha}&porPagina=20`,
      { simular: opciones.simularErrorRed ? "error-500" : undefined }
    );
    return respuesta.datos;
  });
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
