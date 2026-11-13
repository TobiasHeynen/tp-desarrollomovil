//el id de un turno lo arma la API con la forma "tur-<espacioId>-<AAAAMMDD>-<HH>"
//ejemplo: "tur-esp-02-20260919-19" -> espacio "esp-02", fecha "2026-09-19", hora "19:00"
//(la API lo documenta asi: el turno no se guarda, se arma con esos datos)
//una reserva solo trae el turnoId, de ahi sacamos el dia y la hora del turno

export interface DatosTurno {
    espacioId: string;
    fecha: string; // "AAAA-MM-DD"
    hora: string; // "HH:00" (inicio)
    fin: string; // "HH:00"
}

const FORMATO_ID: RegExp = /^tur-(esp-[A-Za-z0-9_-]+)-(\d{4})(\d{2})(\d{2})-(\d{2})$/;

export function leerTurnoId(turnoId: string): DatosTurno | null {
    const partes = FORMATO_ID.exec(turnoId);
    if (!partes) return null;

    const [, espacioId, anio, mes, dia, hh] = partes;
    const horaFin: string = String(Number(hh) + 1).padStart(2, "0");
    return {
        espacioId: espacioId,
        fecha: `${anio}-${mes}-${dia}`,
        hora: `${hh}:00`,
        fin: `${horaFin}:00`,
    };
}

//devuelve el momento en que empieza el turno
export function inicioDelTurno(turnoId: string): Date | null {
    const datos: DatosTurno | null = leerTurnoId(turnoId);
    if (!datos) return null;

    //se arma con anio/mes/dia por separado (horario local):
    //new Date("AAAA-MM-DD") usa UTC y en Argentina corre la fecha un dia para atras
    const [anio, mes, dia] = datos.fecha.split("-").map(Number);
    const hora: number = Number(datos.hora.split(":")[0]);
    return new Date(anio, mes - 1, dia, hora, 0, 0, 0);
}

//"2026-09-19" -> "19/09"
export function fechaCorta(fecha: string): string {
    const [, mes, dia] = fecha.split("-");
    return `${dia}/${mes}`;
}
