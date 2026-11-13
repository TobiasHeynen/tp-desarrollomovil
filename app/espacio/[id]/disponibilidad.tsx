import { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  obtenerGrilla,
  esTurnoPasado,
  obtenerProximosDias,
  DiaSeleccionable,
} from "../../../src/servicios/turnos";
import { crearReserva } from "../../../src/servicios/reservas";
import { obtenerEspacio, listarDeportes } from "../../../src/servicios/espacios";
import { Turno, Espacio, Deporte } from "../../../src/tipos";
import { useAuth } from "../../../src/contextos/AuthContext";

// PERSONA C — Disponibilidad y reservas.
// Cubre todos los puntos del PRD (secciones 2 y 3):
// - Selector de día entre los próximos 7 días (sin permitir días pasados).
// - Grilla de 8:00 a 24:00 diferenciando libre, ocupado (reservado), fijo y mantenimiento.
// - Turnos cuya hora ya pasó en el día de hoy quedan bloqueados aunque figuren libres.
// - Mirar disponibilidad no pide cuenta; reservar sí la pide.
// - Modal de reserva en dos toques indicando deporte y cantidad de personas.
// - Estados de carga, vacío (sin turnos libres) y error visibles en pantalla.

const COLOR_FONDO_ESTADO: Record<Turno["estado"], string> = {
  libre: "#E8F5E9",
  reservado: "#FFEBEE",
  fijo: "#E3F2FD",
  mantenimiento: "#FFF8E1",
};

const COLOR_BORDE_ESTADO: Record<Turno["estado"], string> = {
  libre: "#2E7D32",
  reservado: "#C62828",
  fijo: "#1565C0",
  mantenimiento: "#F57F17",
};

export default function Disponibilidad() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { usuario } = useAuth();

  // Lista de los próximos 7 días generada desde el servicio de turnos
  const diasDisponibles = useMemo<DiaSeleccionable[]>(
    () => obtenerProximosDias(7),
    []
  );
  const [indiceDia, setIndiceDia] = useState(0);
  const diaActual = diasDisponibles[indiceDia];

  // Datos del espacio y deportes para el encabezado y el modal
  const [espacio, setEspacio] = useState<Espacio | null>(null);
  const [deportes, setDeportes] = useState<Deporte[]>([]);

  // Estado de la grilla (carga, éxito, error)
  const [grilla, setGrilla] = useState<Turno[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Opciones para demostrar los "casos feos" exigidos en la defensa oral
  const [simularLlena, setSimularLlena] = useState(false);
  const [simularErrorRed, setSimularErrorRed] = useState(false);

  // Estado del Modal de confirmación de reserva y de aviso de login
  const [turnoSeleccionado, setTurnoSeleccionado] = useState<Turno | null>(null);
  const [turnoPendienteLogin, setTurnoPendienteLogin] = useState<Turno | null>(null);
  const [mostrarModalLogin, setMostrarModalLogin] = useState(false);
  const [deporteElegido, setDeporteElegido] = useState<string>("");
  const [cantidadPersonas, setCantidadPersonas] = useState<number>(2);
  const [guardandoReserva, setGuardandoReserva] = useState(false);
  const [errorModalReserva, setErrorModalReserva] = useState<string | null>(null);

  // Cargar datos del espacio y deportes al montar
  useEffect(() => {
    if (!id) return;
    obtenerEspacio(id)
      .then((esp) => {
        setEspacio(esp);
        setDeporteElegido(esp.deporteId);
        setCantidadPersonas(Math.min(esp.capacidad, 4));
      })
      .catch(() => {});

    listarDeportes()
      .then((res) => setDeportes(res.datos))
      .catch(() => {});
  }, [id]);

  // Cargar la grilla cada vez que cambia el espacio, la fecha o los modos de prueba
  function cargarDisponibilidad() {
    if (!id || !diaActual) return;
    setCargando(true);
    setError(null);
    obtenerGrilla(id, diaActual.fecha, {
      simularLlena,
      simularErrorRed,
    })
      .then((datos) => {
        setGrilla(datos);
      })
      .catch((e: any) => {
        setError(e.message ?? "No pudimos cargar la disponibilidad.");
      })
      .finally(() => {
        setCargando(false);
      });
  }

  useEffect(() => {
    cargarDisponibilidad();
  }, [id, diaActual?.fecha, simularLlena, simularErrorRed]);

  // Si el usuario fue a iniciar sesión desde un turno libre y volvió logueado,
  // abrir automáticamente el modal de ese turno
  useEffect(() => {
    if (usuario && turnoPendienteLogin) {
      if (espacio) {
        setDeporteElegido(espacio.deporteId);
        setCantidadPersonas(Math.min(espacio.capacidad, 4));
      }
      setErrorModalReserva(null);
      setTurnoSeleccionado(turnoPendienteLogin);
      setTurnoPendienteLogin(null);
    }
  }, [usuario, turnoPendienteLogin, espacio]);

  // Al tocar un turno libre: verificar sesión y abrir el modal correspondiente
  function iniciarProcesoReserva(turno: Turno) {
    setErrorModalReserva(null);
    if (!usuario) {
      setTurnoPendienteLogin(turno);
      setMostrarModalLogin(true);
      return;
    }

    if (espacio) {
      setDeporteElegido(espacio.deporteId);
      setCantidadPersonas(Math.min(espacio.capacidad, 4));
    }
    setTurnoSeleccionado(turno);
  }

  // Confirmar reserva desde el modal
  async function confirmarReserva() {
    if (!turnoSeleccionado || !usuario) return;
    setGuardandoReserva(true);
    setErrorModalReserva(null);
    try {
      const reserva = await crearReserva({
        turnoId: turnoSeleccionado.id,
        espacioId: turnoSeleccionado.espacioId,
        usuarioId: usuario.id,
        cantidadPersonas,
      });
      setTurnoSeleccionado(null);
      cargarDisponibilidad();
      router.push(`/reserva/${reserva.id}`);
    } catch (e: any) {
      const msg = e.message ?? "Intentá de nuevo.";
      setErrorModalReserva(msg);
      Alert.alert("No se pudo reservar", msg);
    } finally {
      setGuardandoReserva(false);
    }
  }

  const maxCapacidad = espacio?.capacidad ?? 22;

  const turnosLibresCount = useMemo(() => {
    if (!grilla) return 0;
    return grilla.filter(
      (t) => t.estado === "libre" && !esTurnoPasado(t.fecha, t.inicio)
    ).length;
  }, [grilla]);

  return (
    <View style={styles.contenedor}>
      {/* Encabezado del espacio */}
      <View style={styles.encabezadoEspacio}>
        <View style={{ flex: 1 }}>
          <Text style={styles.nombreEspacio}>
            {espacio ? espacio.nombre : `Espacio ${id}`}
          </Text>
          <Text style={styles.subtituloEspacio}>
            {espacio
              ? `${espacio.complejo} · Capacidad máx. ${espacio.capacidad} personas · $${espacio.precioPorHora}/h`
              : "Consultando datos del predio…"}
          </Text>
        </View>
      </View>

      {/* Selector de los próximos 7 días (Flechas + tira rápida) */}
      <View style={styles.selectorDiasCaja}>
        <View style={styles.navegadorFecha}>
          <TouchableOpacity
            disabled={indiceDia === 0}
            onPress={() => setIndiceDia((prev) => Math.max(0, prev - 1))}
            style={[
              styles.botonFlecha,
              indiceDia === 0 && styles.botonFlechaDeshabilitado,
            ]}
          >
            <Text style={styles.textoFlecha}>{"<"}</Text>
          </TouchableOpacity>

          <View style={styles.centroFecha}>
            <Text style={styles.textoFechaLarga}>{diaActual?.etiquetaLarga}</Text>
            <Text style={styles.textoFechaISO}>
              {diaActual?.fecha} · Próximos 7 días ({indiceDia + 1}/7)
            </Text>
          </View>

          <TouchableOpacity
            disabled={indiceDia === diasDisponibles.length - 1}
            onPress={() =>
              setIndiceDia((prev) =>
                Math.min(diasDisponibles.length - 1, prev + 1)
              )
            }
            style={[
              styles.botonFlecha,
              indiceDia === diasDisponibles.length - 1 &&
                styles.botonFlechaDeshabilitado,
            ]}
          >
            <Text style={styles.textoFlecha}>{">"}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tiraDias}
        >
          {diasDisponibles.map((d, idx) => {
            const activo = idx === indiceDia;
            return (
              <TouchableOpacity
                key={d.fecha}
                onPress={() => setIndiceDia(idx)}
                style={[styles.chipDia, activo && styles.chipDiaActivo]}
              >
                <Text
                  style={[
                    styles.chipDiaSemana,
                    activo && styles.chipTextoActivo,
                  ]}
                >
                  {d.diaSemanaCorto}
                </Text>
                <Text
                  style={[
                    styles.chipDiaNumero,
                    activo && styles.chipTextoActivo,
                  ]}
                >
                  {d.numeroDia}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Leyenda de estados + botones para probar casos borde del PRD */}
      <View style={styles.barraInfo}>
        <View style={styles.leyendaFila}>
          <View style={[styles.puntoColor, { backgroundColor: "#2E7D32" }]} />
          <Text style={styles.leyendaTexto}>Libre</Text>
          <View style={[styles.puntoColor, { backgroundColor: "#C62828" }]} />
          <Text style={styles.leyendaTexto}>Ocupado</Text>
          <View style={[styles.puntoColor, { backgroundColor: "#1565C0" }]} />
          <Text style={styles.leyendaTexto}>Fijo (Club/Semanal)</Text>
          <View style={[styles.puntoColor, { backgroundColor: "#F57F17" }]} />
          <Text style={styles.leyendaTexto}>Mantenimiento</Text>
        </View>

        <View style={styles.barraSimulacion}>
          <TouchableOpacity
            onPress={() => {
              setSimularErrorRed(false);
              setSimularLlena((prev) => !prev);
            }}
            style={[
              styles.botonSimular,
              simularLlena && styles.botonSimularActivo,
            ]}
          >
            <Text
              style={[
                styles.textoSimular,
                simularLlena && styles.textoSimularActivo,
              ]}
            >
              {simularLlena ? "✓ Grilla llena (activo)" : "Probar grilla llena"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSimularErrorRed((prev) => !prev)}
            style={[
              styles.botonSimular,
              simularErrorRed && styles.botonSimularError,
            ]}
          >
            <Text
              style={[
                styles.textoSimular,
                simularErrorRed && styles.textoSimularActivo,
              ]}
            >
              {simularErrorRed ? "✓ Error de red (activo)" : "Probar error red"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Estados de Carga, Error y Vacío (Requisito 3 de la cátedra) */}
      {cargando ? (
        <View style={styles.cajaEstado}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.mensajeEstado}>Cargando grilla de turnos…</Text>
        </View>
      ) : error ? (
        <View style={styles.cajaEstado}>
          <Text style={styles.tituloError}>No pudimos cargar la grilla</Text>
          <Text style={styles.mensajeEstado}>{error}</Text>
          <TouchableOpacity
            style={styles.botonPrimario}
            onPress={() => {
              setSimularErrorRed(false);
              cargarDisponibilidad();
            }}
          >
            <Text style={styles.textoBotonPrimario}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : !grilla || grilla.length === 0 ? (
        <View style={styles.cajaEstado}>
          <Text style={styles.mensajeEstado}>
            No hay turnos configurados para este día.
          </Text>
        </View>
      ) : (
        <>
          {/* Banner de estado vacío si no queda ningún turno libre ese día */}
          {turnosLibresCount === 0 && (
            <View style={styles.bannerSinLibres}>
              <Text style={styles.bannerSinLibresTitulo}>
                Sin turnos disponibles para esta fecha
              </Text>
              <Text style={styles.bannerSinLibresSub}>
                Todos los horarios de hoy están ocupados, reservados por grupos
                fijos, en mantenimiento o ya pasaron. Probá eligiendo otro día
                arriba.
              </Text>
            </View>
          )}

          <FlatList
            contentContainerStyle={styles.lista}
            data={grilla}
            keyExtractor={(t) => t.id}
            renderItem={({ item }) => {
              const pasado = esTurnoPasado(item.fecha, item.inicio);
              const reservable = item.estado === "libre" && !pasado;

              const colorFondo = pasado
                ? "#F0F0F0"
                : COLOR_FONDO_ESTADO[item.estado];
              const colorBorde = pasado
                ? "#BDBDBD"
                : COLOR_BORDE_ESTADO[item.estado];

              let etiquetaEstado = "";
              if (pasado && item.estado === "libre") {
                etiquetaEstado = "Horario pasado (No disponible)";
              } else if (item.estado === "libre") {
                etiquetaEstado = `LIBRE · $${item.precio}`;
              } else if (item.estado === "fijo") {
                etiquetaEstado = "RESERVA FIJA (Turno semanal)";
              } else if (item.estado === "mantenimiento") {
                etiquetaEstado = `MANTENIMIENTO · ${
                  item.motivoBloqueo ?? "Cerrado"
                }`;
              } else {
                etiquetaEstado = "OCUPADO";
              }

              return (
                <TouchableOpacity
                  disabled={!reservable}
                  onPress={() => iniciarProcesoReserva(item)}
                  style={[
                    styles.fila,
                    {
                      backgroundColor: colorFondo,
                      borderLeftColor: colorBorde,
                      opacity: pasado ? 0.65 : 1,
                    },
                  ]}
                >
                  <View>
                    <Text style={styles.hora}>
                      {item.inicio} a {item.fin} hs
                    </Text>
                    <Text style={[styles.estadoTexto, { color: colorBorde }]}>
                      {etiquetaEstado}
                    </Text>
                  </View>

                  {reservable && (
                    <View style={styles.badgeReservar}>
                      <Text style={styles.badgeReservarTexto}>RESERVAR</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </>
      )}

      {/* Modal de Reserva en 2 toques (Deporte + Cantidad de personas) */}
      <Modal
        visible={turnoSeleccionado !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setTurnoSeleccionado(null)}
      >
        <View style={styles.modalFondo}>
          <View style={styles.modalCaja}>
            <Text style={styles.modalTitulo}>Confirmar reserva</Text>
            {turnoSeleccionado && (
              <>
                <View style={styles.resumenTurno}>
                  <Text style={styles.resumenLineaPrincipal}>
                    {espacio?.nombre ?? turnoSeleccionado.espacioId}
                  </Text>
                  <Text style={styles.resumenLinea}>
                    📅 {diaActual?.etiquetaLarga} ({turnoSeleccionado.fecha})
                  </Text>
                  <Text style={styles.resumenLinea}>
                    🕒 De {turnoSeleccionado.inicio} a {turnoSeleccionado.fin} hs
                  </Text>
                  <Text style={styles.resumenPrecio}>
                    💵 ${turnoSeleccionado.precio} — Se paga en el lugar
                  </Text>
                </View>

                {/* Selección de Deporte (PRD sección 3: indicando el deporte y cuántos van a ser) */}
                <Text style={styles.etiquetaCampo}>Deporte a practicar:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipsDeporte}
                >
                  {(deportes.length > 0
                    ? deportes
                    : [{ id: espacio?.deporteId ?? "dep-futbol5", nombre: "Deporte del espacio", icono: "", color: "#2E7D32" }]
                  ).map((dep) => {
                    const seleccionado = deporteElegido === dep.id;
                    return (
                      <TouchableOpacity
                        key={dep.id}
                        onPress={() => setDeporteElegido(dep.id)}
                        style={[
                          styles.chipDeporte,
                          seleccionado && styles.chipDeporteActivo,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipDeporteTexto,
                            seleccionado && styles.chipTextoActivo,
                          ]}
                        >
                          {dep.nombre}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Selección de Cantidad de Personas */}
                <Text style={styles.etiquetaCampo}>
                  ¿Cuántas personas van a asistir? (Máx. {maxCapacidad})
                </Text>
                <View style={styles.selectorPersonas}>
                  <TouchableOpacity
                    style={styles.botonMasMenos}
                    onPress={() =>
                      setCantidadPersonas((prev) => Math.max(1, prev - 1))
                    }
                  >
                    <Text style={styles.textoMasMenos}>−</Text>
                  </TouchableOpacity>

                  <Text style={styles.numeroPersonas}>
                    {cantidadPersonas}{" "}
                    {cantidadPersonas === 1 ? "persona" : "personas"}
                  </Text>

                  <TouchableOpacity
                    style={styles.botonMasMenos}
                    onPress={() =>
                      setCantidadPersonas((prev) =>
                        Math.min(maxCapacidad, prev + 1)
                      )
                    }
                  >
                    <Text style={styles.textoMasMenos}>+</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.avisoCancelacion}>
                  ℹ️ Se puede cancelar sin aviso desde la app hasta 4 horas antes
                  del turno.
                </Text>

                {errorModalReserva && (
                  <Text style={styles.tituloError}>{errorModalReserva}</Text>
                )}

                <View style={styles.modalBotones}>
                  <TouchableOpacity
                    style={styles.botonCancelarModal}
                    onPress={() => setTurnoSeleccionado(null)}
                    disabled={guardandoReserva}
                  >
                    <Text style={styles.textoCancelarModal}>Volver</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.botonConfirmarModal}
                    onPress={confirmarReserva}
                    disabled={guardandoReserva}
                  >
                    <Text style={styles.textoConfirmarModal}>
                      {guardandoReserva ? "Reservando…" : "Confirmar reserva"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal de aviso cuando intenta reservar sin haber iniciado sesión */}
      <Modal
        visible={mostrarModalLogin}
        transparent
        animationType="fade"
        onRequestClose={() => setMostrarModalLogin(false)}
      >
        <View style={styles.modalFondo}>
          <View style={styles.modalCaja}>
            <Text style={styles.modalTitulo}>Necesitás una cuenta</Text>
            <Text style={styles.mensajeEstado}>
              La disponibilidad es pública y se puede consultar sin cuenta, pero
              necesitás iniciar sesión para reservar este turno.
            </Text>
            <View style={styles.modalBotones}>
              <TouchableOpacity
                style={styles.botonCancelarModal}
                onPress={() => {
                  setMostrarModalLogin(false);
                  setTurnoPendienteLogin(null);
                }}
              >
                <Text style={styles.textoCancelarModal}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.botonConfirmarModal}
                onPress={() => {
                  setMostrarModalLogin(false);
                  router.push("/(auth)/login");
                }}
              >
                <Text style={styles.textoConfirmarModal}>
                  Ir a iniciar sesión
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: "#FAFAFA" },
  encabezadoEspacio: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  nombreEspacio: { fontSize: 17, fontWeight: "700", color: "#1B5E20" },
  subtituloEspacio: { fontSize: 12, color: "#555", marginTop: 2 },
  selectorDiasCaja: {
    backgroundColor: "#FFFFFF",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  navegadorFecha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  botonFlecha: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
  },
  botonFlechaDeshabilitado: { opacity: 0.35, backgroundColor: "#EEEEEE" },
  textoFlecha: { fontSize: 18, fontWeight: "700", color: "#2E7D32" },
  centroFecha: { alignItems: "center" },
  textoFechaLarga: { fontSize: 15, fontWeight: "700", color: "#222" },
  textoFechaISO: { fontSize: 11, color: "#666", marginTop: 1 },
  tiraDias: { paddingHorizontal: 12, gap: 8, paddingTop: 4 },
  chipDia: {
    width: 56,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#F2F2F2",
    alignItems: "center",
  },
  chipDiaActivo: { backgroundColor: "#2E7D32" },
  chipDiaSemana: { fontSize: 11, color: "#555", fontWeight: "600" },
  chipDiaNumero: { fontSize: 15, fontWeight: "700", color: "#222" },
  chipTextoActivo: { color: "#FFFFFF" },
  barraInfo: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#F5F5F5",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    gap: 6,
  },
  leyendaFila: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  puntoColor: { width: 10, height: 10, borderRadius: 5 },
  leyendaTexto: { fontSize: 11, color: "#444", marginRight: 6 },
  barraSimulacion: { flexDirection: "row", gap: 8 },
  botonSimular: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#E0E0E0",
  },
  botonSimularActivo: { backgroundColor: "#1565C0" },
  botonSimularError: { backgroundColor: "#B00020" },
  textoSimular: { fontSize: 11, color: "#333", fontWeight: "600" },
  textoSimularActivo: { color: "#FFF" },
  lista: { padding: 14, gap: 8 },
  fila: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 10,
    borderLeftWidth: 5,
  },
  hora: { fontSize: 15, fontWeight: "700", color: "#222" },
  estadoTexto: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  badgeReservar: {
    backgroundColor: "#2E7D32",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  badgeReservarTexto: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  cajaEstado: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 10,
  },
  tituloError: { fontSize: 16, fontWeight: "700", color: "#B00020" },
  mensajeEstado: { fontSize: 14, color: "#555", textAlign: "center" },
  botonPrimario: {
    marginTop: 8,
    backgroundColor: "#2E7D32",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  textoBotonPrimario: { color: "#FFF", fontWeight: "700" },
  bannerSinLibres: {
    marginHorizontal: 14,
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#FFF3E0",
    borderLeftWidth: 4,
    borderLeftColor: "#E65100",
  },
  bannerSinLibresTitulo: { fontWeight: "700", color: "#E65100", fontSize: 13 },
  bannerSinLibresSub: { fontSize: 12, color: "#555", marginTop: 2 },
  modalFondo: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 20,
  },
  modalCaja: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  modalTitulo: { fontSize: 18, fontWeight: "700", color: "#1B5E20" },
  resumenTurno: {
    backgroundColor: "#F1F8E9",
    padding: 12,
    borderRadius: 10,
    gap: 4,
  },
  resumenLineaPrincipal: { fontSize: 15, fontWeight: "700", color: "#222" },
  resumenLinea: { fontSize: 13, color: "#444" },
  resumenPrecio: { fontSize: 14, fontWeight: "700", color: "#2E7D32", marginTop: 4 },
  etiquetaCampo: { fontSize: 13, fontWeight: "600", color: "#333", marginTop: 4 },
  chipsDeporte: { gap: 8, paddingVertical: 4 },
  chipDeporte: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#EEEEEE",
  },
  chipDeporteActivo: { backgroundColor: "#2E7D32" },
  chipDeporteTexto: { fontSize: 12, fontWeight: "600", color: "#333" },
  selectorPersonas: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    padding: 8,
  },
  botonMasMenos: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#2E7D32",
    alignItems: "center",
    justifyContent: "center",
  },
  textoMasMenos: { color: "#FFF", fontSize: 20, fontWeight: "700" },
  numeroPersonas: { fontSize: 16, fontWeight: "700", color: "#222" },
  avisoCancelacion: { fontSize: 12, color: "#666", fontStyle: "italic" },
  modalBotones: { flexDirection: "row", gap: 10, marginTop: 8 },
  botonCancelarModal: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#E0E0E0",
    alignItems: "center",
  },
  textoCancelarModal: { fontWeight: "700", color: "#333" },
  botonConfirmarModal: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#2E7D32",
    alignItems: "center",
  },
  textoConfirmarModal: { fontWeight: "700", color: "#FFF" },
});

