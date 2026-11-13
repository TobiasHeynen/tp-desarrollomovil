import Storage from "expo-sqlite/kv-store";
import { esErrorDeRed } from "./api";

//GENERAL - copia local de lo ultimo que respondio la API, guardada en expo-sqlite/kv-store
//si no hay conexion, los servicios devuelven esa copia: asi la app abre y muestra algo sin señal
//(lo pide la consigna, requisito 7, y el PRD: en la puerta de la cancha la señal es mala)

export function guardarEnCache<T>(clave: string, valor: T): void {
    try {
        Storage.setItemSync(`cache:${clave}`, JSON.stringify(valor));
    } catch (e) {
        console.warn("No se pudo guardar la copia local", clave, e);
    }
}

export function leerDeCache<T>(clave: string): T | null {
    try {
        const crudo: string | null = Storage.getItemSync(`cache:${clave}`);
        return crudo ? (JSON.parse(crudo) as T) : null;
    } catch (e) {
        return null;
    }
}

//pide a la API y guarda la respuesta; si falla por falta de red, devuelve la copia guardada
//si no hay copia (o el error no es de red) se tira el error original, para que la pantalla lo muestre
export async function conCache<T>(clave: string, pedido: () => Promise<T>): Promise<T> {
    try {
        const valor: T = await pedido();
        guardarEnCache(clave, valor);
        return valor;
    } catch (e) {
        if (esErrorDeRed(e)) {
            const guardado: T | null = leerDeCache<T>(clave);
            if (guardado !== null) return guardado;
        }
        throw e;
    }
}
