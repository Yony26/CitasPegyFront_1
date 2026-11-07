// Servicio de Citas - CitasPeggy
// Orquesta el agendamiento (EP2 y EP3): horarios libres, bloqueo temporal de 5 minutos,
// validación anti-colisión, confirmación y cambio de estado.
// Las reglas propias de la cita (cancelar, completar...) viven en la clase OrdenDelDia.

import OrdenDelDia from '../classes/ordenDelDia.js';
import { EstadoCita } from '../enums/estadoCita.js';
import { buscarServicioPorId, buscarNegocioPorId } from '../repository/negocioRepository.js';
import { buscarPersonaPorId } from '../repository/personaRepository.js';
import {
    generarIdCita, generarIdBloqueo, guardarCita, listarCitas, buscarCitaPorId,
    listarCitasPorCliente, listarCitasPorEspecialista, guardarBloqueo, listarBloqueos,
    buscarBloqueo, eliminarBloqueo
} from '../repository/citaRepository.js';

const MINUTOS_BLOQUEO = 5;
const JORNADA_INICIO = "08:00";
const JORNADA_FIN = "17:00";
const PASO_MINUTOS = 30; // las citas pueden empezar cada 30 minutos

// ===== Utilidades de hora =====
const aMinutos = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
const aTexto = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const seCruzan = (iniA, finA, iniB, finB) => iniA < finB && iniB < finA;

/** Citas que ocupan agenda: todas menos las canceladas (HU10). */
function citasActivas(especialistaId, fecha) {
    return listarCitasPorEspecialista(especialistaId, fecha).filter(c => c.estado !== EstadoCita.CANCELADA);
}

function bloqueosVigentes(especialistaId, fecha, ahora, ignorarId = null) {
    return listarBloqueos().filter(b =>
        b.especialistaId === especialistaId && b.fecha === fecha && b.expiraEn > ahora && b.id !== ignorarId);
}

/** ¿El intervalo [startTime, startTime + duración) está libre para ese especialista? */
function estaLibre(especialistaId, fecha, startTime, duracion, ahora, ignorarBloqueoId = null) {
    const ini = aMinutos(startTime), fin = ini + duracion;
    const ocupadoPorCita = citasActivas(especialistaId, fecha).some(c => {
        const d = buscarServicioPorId(c.servicioId).duracionMinutos;
        return seCruzan(ini, fin, aMinutos(c.startTime), aMinutos(c.startTime) + d);
    });
    const ocupadoPorBloqueo = bloqueosVigentes(especialistaId, fecha, ahora, ignorarBloqueoId).some(b => {
        const d = buscarServicioPorId(b.servicioId).duracionMinutos;
        return seCruzan(ini, fin, aMinutos(b.startTime), aMinutos(b.startTime) + d);
    });
    return !ocupadoPorCita && !ocupadoPorBloqueo;
}

/** Todas las franjas posibles de un servicio en la jornada (libres u ocupadas). Sirve para dibujar la grilla. */
export function todasLasFranjas(servicioId) {
    const duracion = buscarServicioPorId(servicioId).duracionMinutos;
    const franjas = [];
    for (let t = aMinutos(JORNADA_INICIO); t + duracion <= aMinutos(JORNADA_FIN); t += PASO_MINUTOS) franjas.push(aTexto(t));
    return franjas;
}

/** HU04: franjas libres de un especialista en una fecha (no incluye horas pasadas ni ocupadas). */
export function horariosDisponibles(especialistaId, fecha, servicioId, ahora = new Date()) {
    const duracion = buscarServicioPorId(servicioId).duracionMinutos;
    const libres = [];
    for (let t = aMinutos(JORNADA_INICIO); t + duracion <= aMinutos(JORNADA_FIN); t += PASO_MINUTOS) {
        const hora = aTexto(t);
        const yaPaso = new Date(`${fecha}T${hora}:00`) <= ahora;
        if (!yaPaso && estaLibre(especialistaId, fecha, hora, duracion, ahora)) libres.push(hora);
    }
    return libres;
}

/** HU04: "Cualquier especialista disponible" → el primero con esa hora libre, o null. */
export function cualquierEspecialistaDisponible(especialistasIds, fecha, startTime, servicioId, ahora = new Date()) {
    return especialistasIds.find(id => horariosDisponibles(id, fecha, servicioId, ahora).includes(startTime)) ?? null;
}

/** HU05 y HU06: bloquea el horario 5 minutos mientras el cliente completa la reserva. */
export function reservarTemporal(clienteId, especialistaId, servicioId, fecha, startTime, ahora = new Date()) {
    const duracion = buscarServicioPorId(servicioId).duracionMinutos;
    if (!horariosDisponibles(especialistaId, fecha, servicioId, ahora).includes(startTime)) {
        throw new Error("El horario seleccionado no está disponible");
    }
    return guardarBloqueo({
        id: generarIdBloqueo(), especialistaId, fecha, startTime, clienteId, servicioId,
        expiraEn: new Date(ahora.getTime() + MINUTOS_BLOQUEO * 60 * 1000)
    });
}

/**
 * HU06 y HU07: re-valida y confirma. Si el bloqueo venció o alguien más tomó el horario, falla.
 */
export function confirmarCita(bloqueoId, notas = "", ahora = new Date()) {
    const b = buscarBloqueo(bloqueoId);
    if (!b) throw new Error("La reserva temporal no existe o ya fue usada");
    if (b.expiraEn <= ahora) {
        eliminarBloqueo(bloqueoId);
        throw new Error("El tiempo de reserva (5 minutos) expiró; elige el horario de nuevo");
    }
    const duracion = buscarServicioPorId(b.servicioId).duracionMinutos;
    // Re-validación final (ignorando el propio bloqueo)
    if (!estaLibre(b.especialistaId, b.fecha, b.startTime, duracion, ahora, bloqueoId)) {
        eliminarBloqueo(bloqueoId);
        throw new Error("El horario ya fue tomado por otro cliente");
    }
    const id = generarIdCita();
    const cita = new OrdenDelDia(id, b.fecha, b.startTime, b.clienteId, b.especialistaId, b.servicioId, notas);
    cita.confirmar(`CP-${String(id).padStart(4, "0")}`);
    guardarCita(cita);
    eliminarBloqueo(bloqueoId);
    return cita;
}

/** HU12: historial del cliente, de la más reciente a la más antigua; filtro opcional por estado. */
export function historialCliente(clienteId, estado = null) {
    return listarCitasPorCliente(clienteId)
        .filter(c => !estado || c.estado === estado)
        .sort((a, b) => b.inicio - a.inicio);
}

/** HU14: agenda del especialista en una fecha, ordenada por hora. */
export function agendaDelDia(especialistaId, fecha) {
    return listarCitasPorEspecialista(especialistaId, fecha).sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function cancelarCita(agendaId, ahora = new Date()) {
    buscarCitaPorId(agendaId).cancelar(ahora);
}

/** HU09: reprogramar = nueva reserva validada + cancelar la anterior (conserva el código de reserva). */
export function reprogramarCita(agendaId, nuevaFecha, nuevaHora, ahora = new Date()) {
    const cita = buscarCitaPorId(agendaId);
    if (!cita.puedeCancelarse(ahora)) throw new Error("Solo se puede reprogramar hasta 2 horas antes de la cita");
    if (!horariosDisponibles(cita.especialistaId, nuevaFecha, cita.servicioId, ahora).includes(nuevaHora)) {
        throw new Error("El nuevo horario no está disponible");
    }
    const id = generarIdCita();
    const nueva = new OrdenDelDia(id, nuevaFecha, nuevaHora, cita.clienteId, cita.especialistaId, cita.servicioId, cita.notas);
    nueva.confirmar(cita.bookingCode);
    cita.cancelar(ahora);
    guardarCita(nueva);
    return nueva;
}

export function completarCita(agendaId, ahora = new Date()) { buscarCitaPorId(agendaId).completar(ahora); }
export function marcarNoAsistio(agendaId, ahora = new Date()) { buscarCitaPorId(agendaId).marcarNoAsistio(ahora); }

/** HU11: las citas confirmadas que superan el plazo sin actualizarse pasan a "No asistió". */
export function marcarNoAsistidasAutomaticas(ahora = new Date(), horasPlazo = 24) {
    let marcadas = 0;
    for (const c of listarCitas()) {
        const limite = new Date(c.inicio.getTime() + horasPlazo * 60 * 60 * 1000);
        if (c.estado === EstadoCita.CONFIRMADA && ahora > limite) { c.marcarNoAsistio(ahora); marcadas++; }
    }
    return marcadas;
}

/** HU13: métricas del negocio en un rango de fechas ("YYYY-MM-DD"). */
export function metricasNegocio(negocioId, desde, hasta) {
    const citas = listarCitas().filter(c =>
        buscarServicioPorId(c.servicioId).negocioId === negocioId && c.fecha >= desde && c.fecha <= hasta);
    const cuenta = (e) => citas.filter(c => c.estado === e).length;
    const atendidas = cuenta(EstadoCita.COMPLETADA);
    const noAsistio = cuenta(EstadoCita.NO_ASISTIO);
    const finalizadas = atendidas + noAsistio;
    return {
        total: citas.length,
        confirmadas: cuenta(EstadoCita.CONFIRMADA),
        atendidas,
        canceladas: cuenta(EstadoCita.CANCELADA),
        noAsistio,
        porcentajeInasistencia: finalizadas === 0 ? 0 : Math.round((noAsistio / finalizadas) * 1000) / 10
    };
}

/** HU16: comprobante digital de una cita. */
export function obtenerComprobante(agendaId) {
    const c = buscarCitaPorId(agendaId);
    const servicio = buscarServicioPorId(c.servicioId);
    const esp = buscarPersonaPorId(c.especialistaId);
    return c.comprobante(buscarNegocioPorId(servicio.negocioId).nombre, servicio.nombre, esp.nombreCompleto);
}
