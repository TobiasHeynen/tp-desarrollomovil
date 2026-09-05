import { Reserva } from "../tipos";

export const RESERVAS: Reserva[] = [
  {
    id: "res-1180",
    turnoId: "tur-esp-02-2026-09-19-19",
    espacioId: "esp-02",
    usuarioId: "usr-207",
    cantidadPersonas: 10,
    codigoQr: "VGY-1180-0219-19",
    estado: "confirmada",
    ingresoEn: null,
    creadaEn: "2026-09-16T21:04:00-03:00",
    cancelableHasta: "2026-09-19T15:00:00-03:00",
  },
  {
    // Caso feo pedido en el PRD: una reserva cancelada.
    id: "res-1099",
    turnoId: "tur-esp-04-2026-09-10-18",
    espacioId: "esp-04",
    usuarioId: "usr-207",
    cantidadPersonas: 6,
    codigoQr: "VGY-1099-0410-18",
    estado: "cancelada",
    ingresoEn: null,
    creadaEn: "2026-09-05T10:00:00-03:00",
    cancelableHasta: "2026-09-10T14:00:00-03:00",
  },
  {
    id: "res-1050",
    turnoId: "tur-esp-11-2026-09-01-20",
    espacioId: "esp-11",
    usuarioId: "usr-207",
    cantidadPersonas: 15,
    codigoQr: "VGY-1050-0111-20",
    estado: "cumplida",
    ingresoEn: "2026-09-01T20:03:00-03:00",
    creadaEn: "2026-08-28T09:00:00-03:00",
    cancelableHasta: "2026-09-01T16:00:00-03:00",
  },
];
