//el id de un turno tiene la forma "tur-<espacioId>-<AAAA-MM-DD>-<HH>"
//ejemplo: "tur-esp-02-2026-09-19-19" -> fecha "2026-09-19", hora "19:00"
//una reserva solo guarda el turnoId, de ahi sacamos cuando empieza

export interface DatosTurno {
    fecha: string;
    hora: string;
}

//lee la fecha y la hora desde las ultimas 4 partes del id
export function leerTurnoId(turnoId: string): DatosTurno | null {
    const partes: string[] = turnoId.split("-");
    if (partes.length < 4) return null;

    const hora: string = partes[partes.length - 1];
    const dia: string = partes[partes.length - 2];
    const mes: string = partes[partes.length - 3];
    const anio: string = partes[partes.length - 4];

    if (isNaN(Number(anio + mes + dia + hora))) return null;
    return { fecha: `${anio}-${mes}-${dia}`, hora: `${hora}:00` };
}

//devuelve el momento en que empieza el turno
export function inicioDelTurno(turnoId: string): Date | null {
    const datos: DatosTurno | null = leerTurnoId(turnoId);
    if (!datos) return null;

    //se arma con anio/mes/dia por separado (horario local), igual que esTurnoPasado:
    //new Date("AAAA-MM-DD") usa UTC y en Argentina corre la fecha un dia para atras
    const [anio, mes, dia] = datos.fecha.split("-").map(Number);
    const hora: number = Number(datos.hora.split(":")[0]);
    return new Date(anio, mes - 1, dia, hora, 0, 0, 0);
}
