import Storage from "expo-sqlite/kv-store";
import { Usuario, Turno, Reserva } from "../tipos";
import { listarMisReservas, obtenerReserva } from "./reservas";
import { obtenerGrilla, esTurnoPasado } from "./turnos";
import { obtenerEspacio } from "./espacios";
import { avisarSuspension, avisarTurnoLiberado, cancelarRecordatorio } from "./notificaciones";
import { inicioDelTurno, leerTurnoId, DatosTurno } from "../utilidades/turnoId";

//PERSONA D - detecta los hechos que disparan avisos y los notifica
//la app solo tiene notificaciones locales (sin push), asi que mira los datos cada tanto:
//si el encargado bloqueo un turno que reservaste, o si se libero un turno de un favorito, avisa una sola vez
//con una API real con push, esta revision la haria el servidor

const DIAS_A_REVISAR: number = 7;
let revisando: boolean = false; //evita dos revisiones a la vez (y avisos dobles)

function fechaISO(fecha: Date): string {
    const anio: number = fecha.getFullYear();
    const mes: string = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia: string = String(fecha.getDate()).padStart(2, "0");
    return `${anio}-${mes}-${dia}`;
}

//lista de fechas desde hoy, una por dia
function proximosDias(cantidad: number): string[] {
    const dias: string[] = [];
    const hoy: Date = new Date();
    for (let i = 0; i < cantidad; i++) {
        dias.push(fechaISO(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + i)));
    }
    return dias;
}

//lee de kv-store los turnos que estaban ocupados la vez anterior (turnoId -> reservaId)
function leerOcupados(clave: string): Record<string, string> | null {
    try {
        const crudo: string | null = Storage.getItemSync(clave);
        if (!crudo) return null;
        return JSON.parse(crudo);
    } catch (e) {
        return null;
    }
}

//1) suspension: una reserva mia cuyo turno ahora figura en "mantenimiento"
async function revisarSuspensiones(usuario: Usuario): Promise<void> {
    const { proximas } = await listarMisReservas(usuario.id);

    for (const reserva of proximas) {
        const datos: DatosTurno | null = leerTurnoId(reserva.turnoId);
        const inicio: Date | null = inicioDelTurno(reserva.turnoId);
        if (!datos || !inicio || inicio.getTime() < Date.now()) continue;

        //si ya se avisó de esta reserva, no se repite
        const clave: string = `avisos:suspension:${usuario.id}:${reserva.id}`;
        if (Storage.getItemSync(clave)) continue;

        try {
            const grilla: Turno[] = await obtenerGrilla(reserva.espacioId, datos.fecha);
            const turno: Turno | undefined = grilla.find((t) => t.id === reserva.turnoId);
            if (!turno || turno.estado !== "mantenimiento") continue;

            const espacio = await obtenerEspacio(reserva.espacioId);
            await cancelarRecordatorio(reserva.id); //ya no tiene sentido recordar un turno suspendido
            const avisado: boolean = await avisarSuspension(reserva, espacio.nombre, turno.motivoBloqueo);
            if (avisado) Storage.setItemSync(clave, "1");
        } catch (e) {
            console.warn("No se pudo revisar la suspension de", reserva.id, e);
        }
    }
}

//2) turno liberado: en un espacio favorito, un turno que estaba reservado y ahora esta libre
async function revisarLiberados(usuario: Usuario): Promise<void> {
    const fechas: string[] = proximosDias(DIAS_A_REVISAR);

    for (const espacioId of usuario.espaciosFavoritos) {
        for (const fecha of fechas) {
            let grilla: Turno[];
            try {
                grilla = await obtenerGrilla(espacioId, fecha);
            } catch (e) {
                continue; //si fallo la consulta, se conserva lo anterior
            }
            await revisarGrilla(usuario, espacioId, fecha, grilla);
        }
    }
}

//compara la grilla de un dia contra la vez anterior y avisa los turnos que se liberaron
async function revisarGrilla(
    usuario: Usuario,
    espacioId: string,
    fecha: string,
    grilla: Turno[]
): Promise<void> {
    const clave: string = `avisos:ocupados:${usuario.id}:${espacioId}:${fecha}`;
    const anteriores: Record<string, string> | null = leerOcupados(clave);

    //turnos reservados ahora (turnoId -> reservaId)
    const ocupadosAhora: Record<string, string> = {};
    for (const turno of grilla) {
        if (turno.estado === "reservado" && turno.reservaId && !esTurnoPasado(turno.fecha, turno.inicio)) {
            ocupadosAhora[turno.id] = turno.reservaId;
        }
    }

    //la primera vez solo se guarda lo que hay, no hay con que comparar
    if (anteriores) {
        for (const turnoId in anteriores) {
            const turno: Turno | undefined = grilla.find((t) => t.id === turnoId);
            if (!turno || turno.estado !== "libre" || esTurnoPasado(turno.fecha, turno.inicio)) continue;

            //si lo cancelo la propia persona no tiene sentido avisarle
            let reserva: Reserva | null = null;
            try {
                reserva = await obtenerReserva(anteriores[turnoId]);
            } catch (e) {
                reserva = null;
            }
            if (reserva && reserva.usuarioId === usuario.id) continue;

            try {
                const espacio = await obtenerEspacio(espacioId);
                await avisarTurnoLiberado(turno, espacio.nombre);
            } catch (e) {
                console.warn("No se pudo avisar el turno liberado", turnoId, e);
            }
        }
    }

    Storage.setItemSync(clave, JSON.stringify(ocupadosAhora));
}

export async function revisarAvisos(usuario: Usuario): Promise<void> {
    if (revisando) return;
    revisando = true;
    try {
        await revisarSuspensiones(usuario);
        await revisarLiberados(usuario);
    } finally {
        revisando = false;
    }
}
