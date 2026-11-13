import { Espacio, Deporte, RespuestaExito, Usuario } from "../tipos";
import { pedir, pedirDatos } from "./api";
import { conCache } from "./cache";

//PERSONA B - espacios, deportes y favoritos contra la API de la catedra
//  GET /espacios            (filtros: deporteId, complejo)
//  GET /espacios/<id>
//  GET /deportes
//  PUT / DELETE /yo/espacios-favoritos/<espacioId>
//el catalogo se guarda en el telefono para poder verlo sin conexion

export interface FiltrosEspacios {
    deporteId?: string;
    complejo?: string;
}

//son 11 espacios: con una pagina de 100 entran todos
const TODOS: string = "pagina=1&porPagina=100";

//trae todos los espacios activos (con copia local) y filtra en el telefono:
//asi los filtros tambien andan sin conexion
async function todosLosEspacios(): Promise<RespuestaExito<Espacio[]>> {
    return conCache("espacios", async () => {
        const respuesta = await pedir<Espacio[]>(`/espacios?${TODOS}`);
        return {
            datos: respuesta.datos,
            meta: respuesta.meta ?? { total: respuesta.datos.length, pagina: 1, porPagina: 100 },
        };
    });
}

export async function listarEspacios(filtros: FiltrosEspacios = {}): Promise<RespuestaExito<Espacio[]>> {
    const todos = await todosLosEspacios();
    let resultado: Espacio[] = todos.datos;
    if (filtros.deporteId) resultado = resultado.filter((e) => e.deporteId === filtros.deporteId);
    if (filtros.complejo) resultado = resultado.filter((e) => e.complejo === filtros.complejo);
    return {
        datos: resultado,
        meta: { total: resultado.length, pagina: 1, porPagina: resultado.length },
    };
}

export async function obtenerEspacio(id: string): Promise<Espacio> {
    return conCache(`espacio:${id}`, () => pedirDatos<Espacio>(`/espacios/${encodeURIComponent(id)}`));
}

export async function listarDeportes(): Promise<RespuestaExito<Deporte[]>> {
    return conCache("deportes", async () => {
        const respuesta = await pedir<Deporte[]>(`/deportes?${TODOS}`);
        return {
            datos: respuesta.datos,
            meta: respuesta.meta ?? { total: respuesta.datos.length, pagina: 1, porPagina: 100 },
        };
    });
}

export async function listarComplejos(): Promise<string[]> {
    const todos = await todosLosEspacios();
    return Array.from(new Set(todos.datos.map((e) => e.complejo)));
}

//agrega o saca un espacio de los favoritos y devuelve la lista nueva
//(el usuario sale del token de la sesion, no hace falta mandarlo)
export async function alternarFavorito(espacioId: string, esFavoritoAhora: boolean): Promise<string[] | null> {
    const ruta: string = `/yo/espacios-favoritos/${encodeURIComponent(espacioId)}`;
    if (esFavoritoAhora) {
        //DELETE responde 204 sin cuerpo: la lista nueva se pide despues con /yo
        await pedir<void>(ruta, { metodo: "DELETE" });
        return null;
    }
    const usuario: Usuario = await pedirDatos<Usuario>(ruta, { metodo: "PUT" });
    return usuario.espaciosFavoritos;
}
