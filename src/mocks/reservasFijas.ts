import { ReservaFija } from "../tipos";

export const RESERVAS_FIJAS: ReservaFija[] = [
  {
    id: "fij-07",
    espacioId: "esp-02",
    titular: "Grupo de los martes",
    dia: 2,
    inicio: "21:00",
    fin: "22:00",
    desde: "2026-03-01",
    hasta: null,
    activa: true,
  },
  {
    id: "fij-08",
    espacioId: "esp-04",
    titular: "Club Central — entrenamiento juvenil",
    dia: 4,
    inicio: "18:00",
    fin: "20:00",
    desde: "2026-04-01",
    hasta: null,
    activa: true,
  },
  {
    id: "fij-09",
    espacioId: "esp-09",
    titular: "Escuela de Tenis Villaguay",
    dia: 6,
    inicio: "09:00",
    fin: "11:00",
    desde: "2026-03-15",
    hasta: "2026-12-15",
    activa: true,
  },
];
