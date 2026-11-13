import { Reserva, ReservaFija, ErrorApi } from "../tipos";
import { RESERVAS } from "../mocks/reservas";
import { ESPACIOS } from "../mocks/espacios";
import { BLOQUEOS_MOCK } from "../mocks/turnos";
import { RESERVAS_FIJAS } from "../mocks/reservasFijas";
import { USUARIOS } from "../mocks/usuarios";
import { hoyISO } from "./turnos";

//PERSONA E - servicios del panel de encargado/administrador

function demorar<T>(valor: T, ms = 500): Promise<T> {
    return new Promise((resolve) => setTimeout(() => resolve(valor), ms));
}

const HORA_EN_PUNTO: RegExp = /^([01]\d|2[0-3]):00$/;

function fechaValida(fecha: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
    const [anio, mes, dia] = fecha.split("-").map(Number);
    const f: Date = new Date(anio, mes - 1, dia);
    return f.getFullYear() === anio && f.getMonth() === mes - 1 && f.getDate() === dia;
}

export async function bloquearTurnos(datos: {
    espacioId: string;
    fecha: string;
    horas?: string[]; 
    motivo: string;
}): Promise<void> {
    if (!ESPACIOS.some((e) => e.id === datos.espacioId)) {
        throw new ErrorApi("ESPACIO_NO_ENCONTRADO", "No encontramos ese espacio.");
    }
    if (!fechaValida(datos.fecha)) {
        throw new ErrorApi("FECHA_INVALIDA", "Ingresá una fecha válida con el formato AAAA-MM-DD.");
    }
    if (datos.fecha < hoyISO()) {
        throw new ErrorApi("FECHA_INVALIDA", "No se puede bloquear un día que ya pasó.");
    }
    if (datos.motivo.trim() === "") {
        throw new ErrorApi("MOTIVO_VACIO", "Escribí el motivo del bloqueo.");
    }
    if (datos.horas && !datos.horas.every((h) => HORA_EN_PUNTO.test(h))) {
        throw new ErrorApi("HORARIO_INVALIDO", "Los horarios tienen que ser en punto, por ejemplo 10:00.");
    }
    BLOQUEOS_MOCK.push({ ...datos, motivo: datos.motivo.trim() });
    return demorar(undefined);
}

export async function cambiarPrecio(espacioId: string, precioPorHora: number): Promise<void> {
    const espacio = ESPACIOS.find((e) => e.id === espacioId);
    if (!espacio) throw new ErrorApi("ESPACIO_NO_ENCONTRADO", "No encontramos ese espacio.");
    if (!Number.isFinite(precioPorHora) || precioPorHora <= 0) {
        throw new ErrorApi("PRECIO_INVALIDO", "El precio tiene que ser un número mayor a cero.");
    }
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
    if (reserva.estado !== "confirmada" || reserva.ingresoEn !== null) {
        throw new ErrorApi("RESERVA_NO_VALIDA", "Solo se puede marcar ausente una reserva confirmada que no ingresó.");
    }
    reserva.estado = "ausente";
    //queda en el historial de la persona se visualiza las ausencias en la app del usuario
    const usuario = USUARIOS.find((u) => u.id === reserva.usuarioId);
    if (usuario) usuario.ausencias += 1;
    return demorar(reserva);
}

export async function agendaDelDia(fecha: string): Promise<Reserva[]> {
    return demorar(RESERVAS.filter((r) => r.turnoId.includes(fecha) && r.estado !== "cancelada"));
}

//reservas fijas

export async function listarFijas(): Promise<ReservaFija[]> {
    return demorar([...RESERVAS_FIJAS]);
}

function seSuperpone(a: ReservaFija, b: ReservaFija): boolean {
    if (a.espacioId !== b.espacioId || a.dia !== b.dia) return false;
    const horasSeCruzan: boolean = a.inicio < b.fin && b.inicio < a.fin;
    const fechasSeCruzan: boolean =
        (a.hasta === null || a.hasta >= b.desde) && (b.hasta === null || b.hasta >= a.desde);
    return horasSeCruzan && fechasSeCruzan;
}

export async function crearFija(datos: Omit<ReservaFija, "id" | "activa">): Promise<ReservaFija> {
    if (!ESPACIOS.some((e) => e.id === datos.espacioId)) {
        throw new ErrorApi("ESPACIO_NO_ENCONTRADO", "Elegí un espacio.");
    }
    if (datos.titular.trim() === "") {
        throw new ErrorApi("TITULAR_VACIO", "Escribí quién tiene la reserva fija.");
    }
    //los turnos van de 8:00 a 24:00
    if (!HORA_EN_PUNTO.test(datos.inicio) || datos.inicio < "08:00") {
        throw new ErrorApi("HORARIO_INVALIDO", "El inicio tiene que ser en punto, entre 08:00 y 23:00.");
    }
    if (!(HORA_EN_PUNTO.test(datos.fin) || datos.fin === "24:00") || datos.fin <= datos.inicio) {
        throw new ErrorApi("HORARIO_INVALIDO", "El fin tiene que ser en punto y posterior al inicio (máximo 24:00).");
    }

    const nueva: ReservaFija = {
        ...datos,
        titular: datos.titular.trim(),
        id: `fij-${Date.now()}`,
        activa: true,
    };
    if (RESERVAS_FIJAS.some((f) => f.activa && seSuperpone(f, nueva))) {
        throw new ErrorApi("FIJA_SUPERPUESTA", "Ya hay una reserva fija en ese espacio, día y horario.");
    }
    RESERVAS_FIJAS.push(nueva);
    return demorar(nueva);
}

export async function editarFija(
    id: string,
    datos: Pick<ReservaFija, "titular" | "dia" | "inicio" | "fin">
): Promise<ReservaFija> {
    const fija = RESERVAS_FIJAS.find((f) => f.id === id);
    if (!fija) throw new ErrorApi("FIJA_NO_ENCONTRADA", "No encontramos esa reserva fija.");
    
    if (datos.titular.trim() === "") {
        throw new ErrorApi("TITULAR_VACIO", "Escribí quién tiene la reserva fija.");
    }
    if (!HORA_EN_PUNTO.test(datos.inicio) || datos.inicio < "08:00") {
        throw new ErrorApi("HORARIO_INVALIDO", "El inicio tiene que ser en punto, entre 08:00 y 23:00.");
    }
    if (!(HORA_EN_PUNTO.test(datos.fin) || datos.fin === "24:00") || datos.fin <= datos.inicio) {
        throw new ErrorApi("HORARIO_INVALIDO", "El fin tiene que ser en punto y posterior al inicio (máximo 24:00).");
    }

    const cambiada: ReservaFija = { ...fija, ...datos, titular: datos.titular.trim() };
    if (fija.activa && RESERVAS_FIJAS.some((f) => f.activa && f.id !== id && seSuperpone(f, cambiada))) {
        throw new ErrorApi("FIJA_SUPERPUESTA", "Ya hay una reserva fija en ese espacio, día y horario.");
    }
    Object.assign(fija, cambiada);
    return demorar(fija);
}

//activa o desactiva una fija 
export async function alternarFija(id: string): Promise<ReservaFija> {
    const fija = RESERVAS_FIJAS.find((f) => f.id === id);
    if (!fija) throw new ErrorApi("FIJA_NO_ENCONTRADA", "No encontramos esa reserva fija.");
    if (!fija.activa && RESERVAS_FIJAS.some((f) => f.activa && f.id !== fija.id && seSuperpone(f, fija))) {
        throw new ErrorApi("FIJA_SUPERPUESTA", "No se puede reactivar: otra fija ocupa ese horario.");
    }
    fija.activa = !fija.activa;
    return demorar(fija);
}

//agenda 

export interface ItemAgenda {
    id: string;
    espacioId: string;
    nombreEspacio: string;
    hora: string;
    detalle: string;
    tipo: "reserva" | "fija";
    estado: string;
}