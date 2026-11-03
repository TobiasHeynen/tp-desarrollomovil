import { Turno, ErrorApi } from "../tipos";
import { generarGrillaMock, generarGrillaLlenaMock } from "../mocks/turnos";

function demorar<T>(valor: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(valor), ms));
}

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
  simularLlena?: boolean;
  simularErrorRed?: boolean;
}

/**
 * Devuelve la grilla de un espacio para un día puntual, ya resuelta
 * (turnos + fijas + bloqueos cruzados). Un turno cuya hora ya pasó
 * (si `fecha` es hoy) se valida en la UI con `esTurnoPasado` para impedir reservarlo.
 */
export async function obtenerGrilla(
  espacioId: string,
  fecha: string,
  opciones: OpcionesGrilla = {}
): Promise<Turno[]> {
  if (opciones.simularErrorRed) {
    await demorar(null, 300);
    throw new ErrorApi(
      "ERROR_RED",
      "No pudimos conectar con el servidor. Verificá tu conexión e intentá de nuevo."
    );
  }

  if (fecha < hoyISO()) {
    throw new ErrorApi("FECHA_INVALIDA", "No se puede consultar un día pasado.");
  }

  if (opciones.simularLlena) {
    return demorar(generarGrillaLlenaMock(espacioId, fecha));
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