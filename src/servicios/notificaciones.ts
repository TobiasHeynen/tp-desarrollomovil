import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { Reserva, Turno } from "../tipos";
import { inicioDelTurno, leerTurnoId, DatosTurno } from "../utilidades/turnoId";

//PERSONA D - notificaciones locales con expo-notifications
//tres avisos del PRD: recordatorio 2 hs antes, suspension del turno y turno liberado en favoritos

const CANAL: string = "reservas";
const HORAS_ANTES: number = 2;

//si llega una notificacion con la app abierta, se muestra igual
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export type ResultadoRecordatorio = "programado" | "sin_permiso" | "muy_tarde" | "no_aplica";

function idRecordatorio(reservaId: string): string {
    return `recordatorio-${reservaId}`;
}

//en android toda notificacion necesita un canal, y tiene que existir antes de pedir el permiso
async function prepararCanal(): Promise<void> {
    if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync(CANAL, {
            name: "Reservas",
            importance: Notifications.AndroidImportance.HIGH,
        });
    }
}

//pide el permiso, muestra el dialogo del sistema si todavia se puede
export async function pedirPermisoNotificaciones(): Promise<boolean> {
    await prepararCanal();
    const actual = await Notifications.getPermissionsAsync();
    if (actual.granted) return true;
    if (!actual.canAskAgain) return false;
    const pedido = await Notifications.requestPermissionsAsync();
    return pedido.granted;
}

//solo consulta el permiso, sin dialogos (para los avisos que se disparan solos)
async function tienePermiso(): Promise<boolean> {
    await prepararCanal();
    const actual = await Notifications.getPermissionsAsync();
    return actual.granted;
}

//recordatorio 2 hs antes del turno
export async function programarRecordatorio(
    reserva: Reserva,
    nombreEspacio?: string
): Promise<ResultadoRecordatorio> {
    if (reserva.estado !== "confirmada") return "no_aplica";

    const inicio: Date | null = inicioDelTurno(reserva.turnoId);
    if (!inicio) return "no_aplica";

    const disparo: Date = new Date(inicio.getTime() - HORAS_ANTES * 60 * 60 * 1000);
    if (disparo.getTime() <= Date.now()) return "muy_tarde";

    const permitido: boolean = await pedirPermisoNotificaciones();
    if (!permitido) return "sin_permiso";

    const datos: DatosTurno | null = leerTurnoId(reserva.turnoId);
    const lugar: string = nombreEspacio ?? "tu espacio reservado";
    const id: string = idRecordatorio(reserva.id);

    //si ya habia uno para esta reserva se reemplaza, asi no se duplica
    await Notifications.cancelScheduledNotificationAsync(id);
    await Notifications.scheduleNotificationAsync({
        identifier: id,
        content: {
            title: "Tu turno es en 2 horas",
            body: `${lugar}, a las ${datos?.hora} hs. Llevá el QR de tu reserva.`,
            data: { tipo: "recordatorio", reservaId: reserva.id },
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: disparo,
            channelId: CANAL,
        },
    });
    return "programado";
}

export async function cancelarRecordatorio(reservaId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(idRecordatorio(reservaId));
}

//notificacion inmediata (el trigger con solo el canal significa "mostrar ya")
async function avisarAhora(
    titulo: string,
    cuerpo: string,
    data: Record<string, unknown>
): Promise<boolean> {
    const permitido: boolean = await tienePermiso();
    if (!permitido) return false;

    await Notifications.scheduleNotificationAsync({
        content: { title: titulo, body: cuerpo, data: data },
        trigger: { channelId: CANAL },
    });
    return true;
}

export async function avisarSuspension(
    reserva: Reserva,
    nombreEspacio: string,
    motivo: string | null
): Promise<boolean> {
    const datos: DatosTurno | null = leerTurnoId(reserva.turnoId);
    const detalle: string = motivo ? ` Motivo: ${motivo}.` : "";
    return avisarAhora(
        "Tu turno fue suspendido",
        `${nombreEspacio}, ${datos?.fecha} a las ${datos?.hora} hs.${detalle}`,
        { tipo: "suspension", reservaId: reserva.id }
    );
}

export async function avisarTurnoLiberado(turno: Turno, nombreEspacio: string): Promise<boolean> {
    return avisarAhora(
        "Se liberó un turno en tu espacio favorito",
        `${nombreEspacio}, ${turno.fecha} a las ${turno.inicio} hs. Reservalo antes de que se ocupe.`,
        { tipo: "turno_liberado", espacioId: turno.espacioId, turnoId: turno.id }
    );
}
