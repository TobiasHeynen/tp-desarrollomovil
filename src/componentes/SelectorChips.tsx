import { ScrollView, Text, TouchableOpacity, StyleSheet } from "react-native";

//PERSONA E - fila de opciones para tocar (espacios, dias, horas) que usan las pantallas del panel
//en vez de escribir ids o fechas a mano

export interface OpcionChip {
    valor: string;
    texto: string;
}

interface PropsSelector {
    opciones: OpcionChip[];
    //los valores elegidos: uno solo o varios, segun lo que maneje la pantalla en alElegir
    elegidos: string[];
    alElegir: (valor: string) => void;
}

export default function SelectorChips({ opciones, elegidos, alElegir }: PropsSelector) {
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fila}>
            {opciones.map((o) => {
                const activo: boolean = elegidos.includes(o.valor);
                return (
                    <TouchableOpacity
                        key={o.valor}
                        style={[styles.chip, activo && styles.chipActivo]}
                        onPress={() => alElegir(o.valor)}
                    >
                        <Text style={[styles.texto, activo && styles.textoActivo]}>{o.texto}</Text>
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    );
}

//horas en punto que acepta la API para bloqueos y fijas
export function horasDelDia(desde: number, hasta: number): OpcionChip[] {
    const horas: OpcionChip[] = [];
    for (let h = desde; h <= hasta; h++) {
        const hora: string = `${String(h).padStart(2, "0")}:00`;
        horas.push({ valor: hora, texto: hora });
    }
    return horas;
}

const styles = StyleSheet.create({
    fila: { gap: 8, paddingVertical: 4 },
    chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: "#eee" },
    chipActivo: { backgroundColor: "#2E7D32" },
    texto: { fontSize: 13, color: "#333" },
    textoActivo: { color: "#fff", fontWeight: "600" },
});
