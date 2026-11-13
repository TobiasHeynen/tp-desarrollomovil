import { Coordenadas } from "../tipos";

//PERSONA B - distancia entre dos puntos del mapa

function aRadianes(grados: number): number {
    return (grados * Math.PI) / 180;
}

//formula de haversine: distancia en km sobre la superficie de la tierra
export function distanciaEnKm(a: Coordenadas, b: Coordenadas): number {
    const radioTierra: number = 6371;
    const difLatitud: number = aRadianes(b.latitud - a.latitud);
    const difLongitud: number = aRadianes(b.longitud - a.longitud);

    const parte: number =
        Math.sin(difLatitud / 2) * Math.sin(difLatitud / 2) +
        Math.cos(aRadianes(a.latitud)) *
            Math.cos(aRadianes(b.latitud)) *
            Math.sin(difLongitud / 2) *
            Math.sin(difLongitud / 2);

    return radioTierra * 2 * Math.atan2(Math.sqrt(parte), Math.sqrt(1 - parte));
}
