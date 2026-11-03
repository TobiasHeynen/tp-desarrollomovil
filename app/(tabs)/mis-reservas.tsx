import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import {
  listarMisReservas,
  cancelarReserva,
  extraerInfoTurno,
  esCancelacionTardia,
  MAX_RESERVAS_ACTIVAS,
  UMBRAL_CANCELADOR_TARDIO,
} from "../../src/servicios/reservas";
import { listarEspacios } from "../../src/servicios/espacios";
import { Reserva, Espacio } from "../../src/tipos";
import { useAuth } from "../../src/contextos/AuthContext";

// PERSONA C — Mis reservas (PRD, sección 3):
// - Separadas entre las que vienen ("Próximas") y las que ya pasaron ("Pasadas").
// - Muestra el contador de reservas activas (máximo 3 por persona).
// - Muestra la marca de cancelaciones tardías repetidas ("Que quien cancela tarde
//   repetidas veces quede marcado").
// - Permite cancelar reserva aplicando la regla de las 4 horas antes.
// - Muestra estados de carga, vacío y error.

function formatearHoraLimite(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  const dia = String(fecha.getDate()).padStart(2, "0");
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const hora = String(fecha.getHours()).padStart(2, "0");
  const min = String(fecha.getMinutes()).padStart(2, "0");
  return `${dia}/${mes} a las ${hora}:${min} hs`;
}

const COLOR_BADGE_ESTADO: Record<Reserva["estado"], { bg: string; fg: string; label: string }> = {
  confirmada: { bg: "#E8F5E9", fg: "#2E7D32", label: "CONFIRMADA" },
  cumplida: { bg: "#E3F2FD", fg: "#1565C0", label: "CUMPLIDA" },
  cancelada: { bg: "#FFEBEE", fg: "#C62828", label: "CANCELADA" },
  ausente: { bg: "#FFF3E0", fg: "#E65100", label: "AUSENTE" },
};

export default function MisReservas() {
  const router = useRouter();
  const { usuario } = useAuth();

  const [datos, setDatos] = useState<{
    proximas: Reserva[];
    pasadas: Reserva[];
  } | null>(null);
  const [mapaEspacios, setMapaEspacios] = useState<Record<string, Espacio>>({});
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelandoId, setCancelandoId] = useState<string | null>(null);

  const cargarDatos = useCallback(
    (simularErrorRed = false) => {
      if (!usuario) return;
      setCargando(true);
      setError(null);

      Promise.all([
        listarMisReservas(usuario.id, { simularErrorRed }),
        listarEspacios(),
      ])
        .then(([resReservas, resEspacios]) => {
          setDatos(resReservas);
          const diccionario: Record<string, Espacio> = {};
          resEspacios.datos.forEach((e) => {
            diccionario[e.id] = e;
          });
          setMapaEspacios(diccionario);
        })
        .catch((e: any) => {
          setError(e.message ?? "No pudimos cargar tus reservas.");
        })
        .finally(() => {
          setCargando(false);
        });
    },
    [usuario]
  );

  // Recargar cada vez que la pantalla gana foco (ej. tras crear o cancelar una reserva)
  useFocusEffect(
    useCallback(() => {
      cargarDatos(false);
    }, [cargarDatos])
  );

  useEffect(() => {
    cargarDatos(false);
  }, [cargarDatos]);

  function pedirConfirmacionCancelacion(reserva: Reserva) {
    const tardia = esCancelacionTardia(reserva.cancelableHasta);
    const titulo = tardia
      ? "⚠️ Cancelación con menos de 4 horas"
      : "Cancelar reserva";
    const mensaje = tardia
      ? "Ya pasó el límite de 4 horas previas al turno. Si cancelás ahora, se registrará una cancelación tardía en tu perfil y tenés que avisar a la Dirección de Deportes."
      : `Podés cancelar sin aviso hasta el ${formatearHoraLimite(
          reserva.cancelableHasta
        )}. ¿Querés cancelar este turno?`;

    Alert.alert(titulo, mensaje, [
      { text: "No, mantener turno", style: "cancel" },
      {
        text: tardia ? "Cancelar igual y registrar" : "Sí, cancelar reserva",
        style: "destructive",
        onPress: () => ejecutarCancelacion(reserva.id, tardia),
      },
    ]);
  }

  async function ejecutarCancelacion(reservaId: string, eraTardia: boolean) {
    setCancelandoId(reservaId);
    try {
      await cancelarReserva(reservaId);
      cargarDatos(false);
      Alert.alert(
        "Reserva cancelada",
        eraTardia
          ? "Tu reserva fue cancelada fuera de término. Recordá dar aviso a la Dirección de Deportes."
          : "El turno quedó liberado correctamente."
      );
    } catch (e: any) {
      Alert.alert("No se pudo cancelar", e.message ?? "Intentá de nuevo.");
    } finally {
      setCancelandoId(null);
    }
  }

  // Si no inició sesión, mostrar invitación a loguearse
  if (!usuario) {
    return (
      <View style={styles.cajaEstado}>
        <Text style={styles.tituloSinSesion}>Iniciá sesión para ver tus reservas</Text>
        <Text style={styles.subtituloEstado}>
          Desde acá vas a poder consultar tus próximos turnos, mostrar el código
          QR en la puerta y cancelar con un toque.
        </Text>
        <TouchableOpacity
          style={styles.botonPrimario}
          onPress={() => router.push("/(auth)/login")}
        >
          <Text style={styles.textoBotonPrimario}>Ir a iniciar sesión</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (cargando && !datos) {
    return (
      <View style={styles.cajaEstado}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.subtituloEstado}>Cargando tus reservas…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.cajaEstado}>
        <Text style={styles.tituloError}>No pudimos cargar tus reservas</Text>
        <Text style={styles.subtituloEstado}>{error}</Text>
        <TouchableOpacity
          style={styles.botonPrimario}
          onPress={() => cargarDatos(false)}
        >
          <Text style={styles.textoBotonPrimario}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const proximas = datos?.proximas ?? [];
  const pasadas = datos?.pasadas ?? [];
  const totalReservas = proximas.length + pasadas.length;

  const secciones = [
    { title: `Próximas (${proximas.length})`, data: proximas },
    { title: `Pasadas y canceladas (${pasadas.length})`, data: pasadas },
  ];

  const esCanceladorRecurrente =
    usuario.cancelacionesTardias >= UMBRAL_CANCELADOR_TARDIO;

  return (
    <View style={styles.contenedor}>
      {/* Resumen de cupo de reservas activas y marca de cancelaciones tardías */}
      <View style={styles.panelSuperior}>
        <View style={styles.filaResumen}>
          <Text style={styles.textoCupo}>
            Reservas activas:{" "}
            <Text style={styles.textoCupoFuerte}>
              {proximas.length} / {MAX_RESERVAS_ACTIVAS}
            </Text>
          </Text>

          <TouchableOpacity
            onPress={() => cargarDatos(true)}
            style={styles.botonProbarError}
          >
            <Text style={styles.textoProbarError}>Probar error red</Text>
          </TouchableOpacity>
        </View>

        {usuario.cancelacionesTardias > 0 && (
          <View
            style={[
              styles.alertaTardias,
              esCanceladorRecurrente && styles.alertaTardiasGrave,
            ]}
          >
            <Text
              style={[
                styles.alertaTardiasTitulo,
                esCanceladorRecurrente && styles.alertaTardiasTituloGrave,
              ]}
            >
              {esCanceladorRecurrente
                ? "⚠️ Usuario marcado por cancelaciones tardías repetidas"
                : "ℹ️ Cancelaciones tardías registradas"}
            </Text>
            <Text style={styles.alertaTardiasSub}>
              Tenés {usuario.cancelacionesTardias}{" "}
              {usuario.cancelacionesTardias === 1
                ? "cancelación tardía"
                : "cancelaciones tardías"}{" "}
              (menos de 4 hs antes del turno). Recordá cancelar con tiempo para
              que otro grupo pueda usar la cancha.
            </Text>
          </View>
        )}
      </View>

      {totalReservas === 0 ? (
        <View style={styles.cajaEstado}>
          <Text style={styles.tituloSinSesion}>
            Todavía no hiciste ninguna reserva
          </Text>
          <Text style={styles.subtituloEstado}>
            Elegí un espacio deportivo en la pestaña "Espacios" y reservá tu
            turno en dos toques.
          </Text>
          <TouchableOpacity
            style={styles.botonPrimario}
            onPress={() => router.push("/(tabs)")}
          >
            <Text style={styles.textoBotonPrimario}>Ver espacios disponibles</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          contentContainerStyle={styles.lista}
          sections={secciones}
          keyExtractor={(r) => r.id}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <View style={styles.encabezadoSeccion}>
              <Text style={styles.tituloSeccion}>{section.title}</Text>
              {section.data.length === 0 && (
                <Text style={styles.vacioSeccion}>
                  No hay reservas en esta sección.
                </Text>
              )}
            </View>
          )}
          renderItem={({ item }) => {
            const espacio = mapaEspacios[item.espacioId];
            const infoTurno = extraerInfoTurno(item.turnoId);
            const badge = COLOR_BADGE_ESTADO[item.estado];
            const tardiaAhora = esCancelacionTardia(item.cancelableHasta);

            return (
              <View style={styles.tarjeta}>
                <View style={styles.tarjetaEncabezado}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nombreEspacio}>
                      {espacio ? espacio.nombre : item.espacioId}
                    </Text>
                    <Text style={styles.complejoTexto}>
                      {espacio ? espacio.complejo : "Predio Municipal"}
                    </Text>
                  </View>

                  <View
                    style={[styles.badgeEstado, { backgroundColor: badge.bg }]}
                  >
                    <Text
                      style={[styles.badgeEstadoTexto, { color: badge.fg }]}
                    >
                      {badge.label}
                    </Text>
                  </View>
                </View>

                <View style={styles.detallesCaja}>
                  <Text style={styles.detalleLinea}>
                    📅 Fecha: <Text style={styles.negrita}>{infoTurno.fecha}</Text> · 🕒{" "}
                    <Text style={styles.negrita}>
                      {infoTurno.inicio} a {infoTurno.fin} hs
                    </Text>
                  </Text>
                  <Text style={styles.detalleLinea}>
                    👥 Asistentes:{" "}
                    <Text style={styles.negrita}>{item.cantidadPersonas} personas</Text>
                    {espacio ? ` · 💵 $${espacio.precioPorHora} (en el lugar)` : ""}
                  </Text>
                  <Text style={styles.detalleQr}>
                    🔑 Código QR: {item.codigoQr}
                  </Text>
                </View>

                {item.estado === "confirmada" && (
                  <>
                    <Text
                      style={[
                        styles.infoCancelacion,
                        tardiaAhora && styles.infoCancelacionTardia,
                      ]}
                    >
                      {tardiaAhora
                        ? "⚠️ Ya dentro de las 4 hs previas: cancelar ahora requiere avisar y suma marca tardía."
                        : `✓ Se puede cancelar sin aviso hasta el ${formatearHoraLimite(
                            item.cancelableHasta
                          )}`}
                    </Text>

                    <View style={styles.botonesTarjeta}>
                      <TouchableOpacity
                        style={styles.botonVerQr}
                        onPress={() => router.push(`/reserva/${item.id}`)}
                      >
                        <Text style={styles.textoBotonVerQr}>
                          Ver QR de ingreso
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.botonCancelar}
                        disabled={cancelandoId === item.id}
                        onPress={() => pedirConfirmacionCancelacion(item)}
                      >
                        <Text style={styles.textoBotonCancelar}>
                          {cancelandoId === item.id
                            ? "Cancelando…"
                            : "Cancelar"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {item.estado !== "confirmada" && (
                  <TouchableOpacity
                    style={styles.botonDetallePasada}
                    onPress={() => router.push(`/reserva/${item.id}`)}
                  >
                    <Text style={styles.textoDetallePasada}>
                      Ver comprobante
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: "#FAFAFA" },
  panelSuperior: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    gap: 8,
  },
  filaResumen: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  textoCupo: { fontSize: 13, color: "#444" },
  textoCupoFuerte: { fontWeight: "700", color: "#1B5E20" },
  botonProbarError: {
    backgroundColor: "#EEEEEE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  textoProbarError: { fontSize: 11, color: "#444", fontWeight: "600" },
  alertaTardias: {
    backgroundColor: "#FFF8E1",
    borderLeftWidth: 4,
    borderLeftColor: "#F57F17",
    padding: 10,
    borderRadius: 8,
  },
  alertaTardiasGrave: {
    backgroundColor: "#FFEBEE",
    borderLeftColor: "#C62828",
  },
  alertaTardiasTitulo: { fontSize: 12, fontWeight: "700", color: "#E65100" },
  alertaTardiasTituloGrave: { color: "#C62828" },
  alertaTardiasSub: { fontSize: 11, color: "#555", marginTop: 2 },
  lista: { padding: 16, gap: 10 },
  encabezadoSeccion: { marginTop: 8, marginBottom: 4 },
  tituloSeccion: { fontSize: 15, fontWeight: "700", color: "#222" },
  vacioSeccion: {
    fontSize: 12,
    color: "#777",
    fontStyle: "italic",
    marginTop: 4,
  },
  tarjeta: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    gap: 10,
  },
  tarjetaEncabezado: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  nombreEspacio: { fontSize: 16, fontWeight: "700", color: "#1B5E20" },
  complejoTexto: { fontSize: 12, color: "#666", marginTop: 1 },
  badgeEstado: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeEstadoTexto: { fontSize: 10, fontWeight: "700" },
  detallesCaja: {
    backgroundColor: "#F7F9F7",
    padding: 10,
    borderRadius: 8,
    gap: 4,
  },
  detalleLinea: { fontSize: 13, color: "#333" },
  negrita: { fontWeight: "700" },
  detalleQr: { fontSize: 12, fontFamily: "monospace", color: "#555", marginTop: 2 },
  infoCancelacion: { fontSize: 11, color: "#2E7D32", fontWeight: "600" },
  infoCancelacionTardia: { color: "#C62828" },
  botonesTarjeta: { flexDirection: "row", gap: 8 },
  botonVerQr: {
    flex: 2,
    backgroundColor: "#2E7D32",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  textoBotonVerQr: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  botonCancelar: {
    flex: 1,
    backgroundColor: "#FFEBEE",
    borderWidth: 1,
    borderColor: "#C62828",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  textoBotonCancelar: { color: "#C62828", fontWeight: "700", fontSize: 13 },
  botonDetallePasada: {
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
  },
  textoDetallePasada: { fontSize: 12, fontWeight: "600", color: "#444" },
  cajaEstado: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    gap: 12,
  },
  tituloSinSesion: {
    fontSize: 17,
    fontWeight: "700",
    color: "#222",
    textAlign: "center",
  },
  tituloError: {
    fontSize: 17,
    fontWeight: "700",
    color: "#B00020",
    textAlign: "center",
  },
  subtituloEstado: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    lineHeight: 19,
  },
  botonPrimario: {
    marginTop: 6,
    backgroundColor: "#2E7D32",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  textoBotonPrimario: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
});

