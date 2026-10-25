import { ComponentProps } from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { Espacio, Deporte } from "../tipos";

//PERSONA B - tarjeta de un espacio en el listado
//muestra foto, deporte y si tiene luz para jugar de noche

type NombreIcono = ComponentProps<typeof Ionicons>["name"];

interface PropsTarjeta {
    espacio: Espacio;
    deporte?: Deporte;
    alPresionar: () => void;
}

export default function TarjetaEspacio({ espacio, deporte, alPresionar }: PropsTarjeta) {
    return (
        <TouchableOpacity style={styles.tarjeta} onPress={alPresionar}>
            {espacio.imagenes.length > 0 ? (
                <Image source={{ uri: espacio.imagenes[0] }} style={styles.imagen} />
            ) : (
                <View style={[styles.imagen, styles.sinImagen]}>
                    <Text style={styles.textoSinImagen}>Sin foto</Text>
                </View>
            )}

            <View style={styles.info}>
                <Text style={styles.nombre}>{espacio.nombre.trim()}</Text>

                {deporte && (
                    <View style={styles.fila}>
                        <Ionicons name={deporte.icono as NombreIcono} size={16} color={deporte.color} />
                        <Text style={[styles.deporte, { color: deporte.color }]}>{deporte.nombre}</Text>
                    </View>
                )}

                <Text style={styles.detalle}>{espacio.complejo}</Text>
                <Text style={styles.detalle}>
                    {espacio.superficie} · {espacio.techado ? "Techado" : "A cielo abierto"}
                </Text>

                <View style={styles.filaPrecio}>
                    {espacio.iluminacion ? (
                        <View style={styles.etiqueta}>
                            <Ionicons name="bulb-outline" size={14} color="#F57F17" />
                            <Text style={styles.textoEtiqueta}>Luz para jugar de noche</Text>
                        </View>
                    ) : (
                        <Text style={styles.detalle}>Sin luz artificial</Text>
                    )}
                    <Text style={styles.precio}>${espacio.precioPorHora}/h</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    tarjeta: { borderRadius: 12, backgroundColor: "#f2f2f2", overflow: "hidden" },
    imagen: { width: "100%", height: 140, backgroundColor: "#ddd" },
    sinImagen: { alignItems: "center", justifyContent: "center" },
    textoSinImagen: { color: "#777" },
    info: { padding: 12, gap: 3 },
    nombre: { fontSize: 16, fontWeight: "600" },
    fila: { flexDirection: "row", alignItems: "center", gap: 6 },
    deporte: { fontSize: 13, fontWeight: "600" },
    detalle: { fontSize: 13, color: "#555" },
    filaPrecio: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
    etiqueta: { flexDirection: "row", alignItems: "center", gap: 4 },
    textoEtiqueta: { fontSize: 12, color: "#F57F17" },
    precio: { fontSize: 15, fontWeight: "700" },
});
