import * as SQLite from "expo-sqlite";
import { Espacio } from "../tipos";

//PERSONA E - copia local del catalogo de espacios con expo-sqlite
//sirve para que la app abra y muestre los espacios sin conexion

let baseAbierta: Promise<SQLite.SQLiteDatabase> | null = null;

//abre la base una sola vez y crea la tabla si no existe
function abrirBase(): Promise<SQLite.SQLiteDatabase> {
    if (!baseAbierta) {
        baseAbierta = SQLite.openDatabaseAsync("catalogo.db").then(async (db) => {
            await db.execAsync("DROP TABLE IF EXISTS espacios_guardados;");
            
            await db.execAsync(
                `CREATE TABLE IF NOT EXISTS espacios_guardados (
                    id TEXT PRIMARY KEY NOT NULL,
                    datos TEXT NOT NULL,
                    guardado_en TEXT NOT NULL
                );`
            );
            return db;
        });
    }
    return baseAbierta;
}

//reemplaza todo el catalogo por la lista nueva
export async function guardarEspaciosLocal(espacios: Espacio[]): Promise<void> {
    const db: SQLite.SQLiteDatabase = await abrirBase();
    const ahora: string = new Date().toISOString();
    
    await db.execAsync("DELETE FROM espacios_guardados"); // borra los viejos
    
    for (const espacio of espacios) {
        await db.runAsync(
            "INSERT INTO espacios_guardados (id, datos, guardado_en) VALUES (?, ?, ?)",
            [espacio.id, JSON.stringify(espacio), ahora]
        );
    }
}

//devuelve todos los espacios guardados
export async function leerEspaciosLocal(): Promise<Espacio[]> {
    const db: SQLite.SQLiteDatabase = await abrirBase();
    const filas = await db.getAllAsync<{ datos: string }>(
        "SELECT datos FROM espacios_guardados ORDER BY id"
    );
    return filas.map((fila) => JSON.parse(fila.datos) as Espacio);
}

export async function leerEspacioLocal(id: string): Promise<Espacio | null> {
    const db: SQLite.SQLiteDatabase = await abrirBase();
    const fila = await db.getFirstAsync<{ datos: string }>(
        "SELECT datos FROM espacios_guardados WHERE id = ?",
        [id]
    );
    if (!fila) return null;
    return JSON.parse(fila.datos) as Espacio;
}