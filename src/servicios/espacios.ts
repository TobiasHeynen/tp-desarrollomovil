import { Espacio, Deporte, RespuestaExito, ErrorApi } from "../tipos";
import { ESPACIOS } from "../mocks/espacios";
import { DEPORTES } from "../mocks/deportes";

// Ninguna pantalla debe importar los mocks directamente: todo pasa por acá.
// El día que llegue la API de la cátedra, solo cambia el cuerpo de estas
// funciones (agregar el fetch), las firmas quedan iguales.

function demorar<T>(valor: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(valor), ms));
}

export interface FiltrosEspacios {
  deporteId?: string;
  complejo?: string;
}

export async function listarEspacios(
  filtros: FiltrosEspacios = {}
): Promise<RespuestaExito<Espacio[]>> {
  let resultado = ESPACIOS.filter((e) => e.activo);
  if (filtros.deporteId) resultado = resultado.filter((e) => e.deporteId === filtros.deporteId);
  if (filtros.complejo) resultado = resultado.filter((e) => e.complejo === filtros.complejo);

  return demorar({
    datos: resultado,
    meta: { total: resultado.length, pagina: 1, porPagina: resultado.length },
  });
}

export async function obtenerEspacio(id: string): Promise<Espacio> {
  const espacio = ESPACIOS.find((e) => e.id === id);
  if (!espacio) {
    throw new ErrorApi("ESPACIO_NO_ENCONTRADO", "No encontramos ese espacio.");
  }
  return demorar(espacio);
}

export async function listarDeportes(): Promise<RespuestaExito<Deporte[]>> {
  return demorar({ datos: DEPORTES, meta: { total: DEPORTES.length, pagina: 1, porPagina: DEPORTES.length } });
}

export async function listarComplejos(): Promise<string[]> {
  const complejos = Array.from(new Set(ESPACIOS.map((e) => e.complejo)));
  return demorar(complejos);
}
