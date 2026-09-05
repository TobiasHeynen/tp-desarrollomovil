import { Turno } from "../tipos";
import { ESPACIOS } from "./espacios";
import { RESERVAS_FIJAS } from "./reservasFijas";
import { RESERVAS } from "./reservas";

// PARTE DELICADA DEL PROYECTO (dixit el PRD): la grilla de un día se arma
// cruzando turnos sueltos reservados + reservas fijas vigentes + bloqueos
// de mantenimiento. Esto se resuelve en el servicio (src/servicios/turnos.ts),
// acá solo generamos datos crudos de ejemplo para simular esos tres casos.

// Bloqueos de ejemplo: día de lluvia completo en esp-01, mantenimiento puntual en esp-04.
export const BLOQUEOS_MOCK: {
  espacioId: string;
  fecha: string;
  horas?: string[]; // si no viene, bloquea el día entero
  motivo: string;
}[] = [
  { espacioId: "esp-01", fecha: "2026-09-20", motivo: "Cancha anegada por lluvia" },
  { espacioId: "esp-04", fecha: "2026-09-19", horas: ["20:00"], motivo: "Arreglo de tablero" },
];

function horasDelDia(): string[] {
  const horas: string[] = [];
  for (let h = 8; h < 24; h++) horas.push(`${String(h).padStart(2, "0")}:00`);
  return horas;
}

function diaDeSemana(fecha: string): number {
  // fecha "AAAA-MM-DD" -> 0 (domingo) .. 6 (sábado), en horario local.
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(a, m - 1, d).getDay();
}

/**
 * Genera la grilla completa de un espacio para un día dado, cruzando:
 * 1) reservas fijas vigentes ese día de la semana,
 * 2) bloqueos de mantenimiento/lluvia,
 * 3) reservas sueltas ya cargadas,
 * y dejando el resto como "libre".
 */
export function generarGrillaMock(espacioId: string, fecha: string): Turno[] {
  const espacio = ESPACIOS.find((e) => e.id === espacioId);
  if (!espacio) return [];

  const diaSemana = diaDeSemana(fecha);
  const fijasDelDia = RESERVAS_FIJAS.filter(
    (f) =>
      f.espacioId === espacioId &&
      f.activa &&
      f.dia === diaSemana &&
      f.desde <= fecha &&
      (f.hasta === null || f.hasta >= fecha)
  );

  const bloqueo = BLOQUEOS_MOCK.find((b) => b.espacioId === espacioId && b.fecha === fecha);

  const reservasDelDia = RESERVAS.filter(
    (r) => r.espacioId === espacioId && r.estado !== "cancelada" && r.turnoId.includes(fecha)
  );

  return horasDelDia().map((inicio) => {
    const fin = `${String(Number(inicio.split(":")[0]) + 1).padStart(2, "0")}:00`;
    const id = `tur-${espacioId}-${fecha}-${inicio.slice(0, 2)}`;

    const fija = fijasDelDia.find((f) => f.inicio === inicio);
    if (fija) {
      return {
        id,
        espacioId,
        fecha,
        inicio,
        fin,
        estado: "fijo",
        reservaId: null,
        motivoBloqueo: null,
        precio: espacio.precioPorHora,
      } satisfies Turno;
    }

    const bloqueaEstaHora =
      bloqueo && (!bloqueo.horas || bloqueo.horas.includes(inicio));
    if (bloqueaEstaHora) {
      return {
        id,
        espacioId,
        fecha,
        inicio,
        fin,
        estado: "mantenimiento",
        reservaId: null,
        motivoBloqueo: bloqueo!.motivo,
        precio: espacio.precioPorHora,
      } satisfies Turno;
    }

    const reserva = reservasDelDia.find((r) => r.turnoId === id);
    if (reserva) {
      return {
        id,
        espacioId,
        fecha,
        inicio,
        fin,
        estado: "reservado",
        reservaId: reserva.id,
        motivoBloqueo: null,
        precio: espacio.precioPorHora,
      } satisfies Turno;
    }

    return {
      id,
      espacioId,
      fecha,
      inicio,
      fin,
      estado: "libre",
      reservaId: null,
      motivoBloqueo: null,
      precio: espacio.precioPorHora,
    } satisfies Turno;
  });
}

// Caso feo pedido en el PRD: una grilla completa sin turnos libres,
// para probar el estado vacío de la pantalla de disponibilidad.
export function generarGrillaLlenaMock(espacioId: string, fecha: string): Turno[] {
  return generarGrillaMock(espacioId, fecha).map((t) =>
    t.estado === "libre" ? { ...t, estado: "reservado" as const, reservaId: "res-ficticia" } : t
  );
}
