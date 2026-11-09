import * as SQLite from "expo-sqlite";
import { Reserva } from "../tipos";

//PERSONA D - copia local de la reserva con expo-sqlite
//sirve para mostrar el QR sin conexion (el PRD dice que se muestra en la puerta, donde la senal es mala)

let baseAbierta: Promise<SQLite.SQLiteDatabase> | null = null;

//abre la base una sola vez y crea la tabla si no existe
function abrirBase(): Promise<SQLite.SQLiteDatabase> {
    if (!baseAbierta) {
        baseAbierta = SQLite.openDatabaseAsync("reservas.db").then(async (db) => {
            await db.execAsync(
                `CREATE TABLE IF NOT EXISTS reservas_guardadas (
                    id TEXT PRIMARY KEY NOT NULL,
                    datos TEXT NOT NULL,
                    guardada_en TEXT NOT NULL
                );`
            );
            return db;
        });
    }
    return baseAbierta;
}

export async function guardarReservaLocal(reserva: Reserva): Promise<void> {
    const db: SQLite.SQLiteDatabase = await abrirBase();
    await db.runAsync(
        "INSERT OR REPLACE INTO reservas_guardadas (id, datos, guardada_en) VALUES (?, ?, ?)",
        [reserva.id, JSON.stringify(reserva), new Date().toISOString()]
    );
}

export async function leerReservaLocal(id: string): Promise<Reserva | null> {
    const db: SQLite.SQLiteDatabase = await abrirBase();
    const fila = await db.getFirstAsync<{ datos: string }>(
        "SELECT datos FROM reservas_guardadas WHERE id = ?",
        [id]
    );
    if (!fila) return null;
    return JSON.parse(fila.datos) as Reserva;
}
