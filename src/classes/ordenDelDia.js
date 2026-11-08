// Clase OrdenDelDia - CitasPeggy
// Es la CITA: une a un Cliente, un Especialista y un Servicio en una fecha y hora.
// Las reglas de cambio de estado viven aquí; los servicios solo las orquestan.

import { EstadoCita } from '../enums/estadoCita.js';

const HORAS_LIMITE_CANCELACION = 2; // HU09: se puede cancelar hasta 2 horas antes

export default class OrdenDelDia {

    #agendaId;
    #fecha;        // "YYYY-MM-DD"
    #startTime;    // "HH:mm"
    #estado;
    #bookingCode;
    #clienteId;
    #especialistaId;
    #servicioId;
    #notas;
    #precioServicio;
    #nombreServicio;
    #duracionServicio;

    constructor(agendaId, fecha, startTime, clienteId, especialistaId, servicioId, notas = "", precioServicio = null, nombreServicio = "", duracionServicio = null) {
        if (!fecha || !startTime || !clienteId || !especialistaId || !servicioId) {
            throw new Error("La cita necesita fecha, hora, cliente, especialista y servicio");
        }
        this.#agendaId = agendaId;
        this.#fecha = fecha;
        this.#startTime = startTime;
        this.#clienteId = clienteId;
        this.#especialistaId = especialistaId;
        this.#servicioId = servicioId;
        this.#notas = notas;
        this.#precioServicio = precioServicio;
        this.#nombreServicio = nombreServicio;
        this.#duracionServicio = duracionServicio;
        this.#estado = EstadoCita.PENDIENTE;
        this.#bookingCode = null;
    }

    get agendaId() { return this.#agendaId; }
    get fecha() { return this.#fecha; }
    get startTime() { return this.#startTime; }
    get estado() { return this.#estado; }
    get bookingCode() { return this.#bookingCode; }
    get clienteId() { return this.#clienteId; }
    get especialistaId() { return this.#especialistaId; }
    get servicioId() { return this.#servicioId; }
    get notas() { return this.#notas; }
    get precioServicio() { return this.#precioServicio; }
    get nombreServicio() { return this.#nombreServicio; }
    get duracionServicio() { return this.#duracionServicio; }

    /** Fecha y hora de inicio como objeto Date (hora local). */
    get inicio() { return new Date(`${this.#fecha}T${this.#startTime}:00`); }

    /** HU07: confirma la cita y le asigna su código de reserva único. */
    confirmar(bookingCode) {
        if (this.#estado !== EstadoCita.PENDIENTE) {
            throw new Error("Solo se puede confirmar una cita pendiente");
        }
        this.#bookingCode = bookingCode;
        this.#estado = EstadoCita.CONFIRMADA;
    }

    /** HU09: se puede cancelar hasta 2 horas antes del inicio. */
    puedeCancelarse(ahora = new Date()) {
        const limite = new Date(this.inicio.getTime() - HORAS_LIMITE_CANCELACION * 60 * 60 * 1000);
        return this.#estado === EstadoCita.CONFIRMADA && ahora <= limite;
    }

    cancelar(ahora = new Date()) {
        if (this.#estado === EstadoCita.COMPLETADA || this.#estado === EstadoCita.NO_ASISTIO) {
            throw new Error("No se puede cancelar una cita que ya finalizó");
        }
        if (this.#estado === EstadoCita.CANCELADA) {
            throw new Error("La cita ya está cancelada");
        }
        if (!this.puedeCancelarse(ahora)) {
            throw new Error(`Solo se puede cancelar hasta ${HORAS_LIMITE_CANCELACION} horas antes de la cita`);
        }
        this.#estado = EstadoCita.CANCELADA;
    }

    /** HU11: el especialista marca la cita como Atendida (solo después de la hora de inicio). */
    completar(ahora = new Date()) {
        this.#validarFinalizacion(ahora);
        this.#estado = EstadoCita.COMPLETADA;
    }

    /** HU11: el especialista (o el sistema) marca que el cliente no llegó. */
    marcarNoAsistio(ahora = new Date()) {
        this.#validarFinalizacion(ahora);
        this.#estado = EstadoCita.NO_ASISTIO;
    }

    #validarFinalizacion(ahora) {
        if (this.#estado !== EstadoCita.CONFIRMADA) {
            throw new Error("Solo se puede cambiar el estado de una cita confirmada");
        }
        if (ahora < this.inicio) {
            throw new Error("No se puede actualizar el estado antes de la hora de la cita");
        }
    }

    /** HU16: texto del comprobante digital. */
    comprobante(nombreNegocio, nombreServicio, nombreEspecialista) {
        return [
            `--- COMPROBANTE CITASPEGGY ---`,
            `Código de reserva: ${this.#bookingCode}`,
            `Negocio: ${nombreNegocio}`,
            `Servicio: ${nombreServicio}`,
            `Especialista: ${nombreEspecialista}`,
            `Precio: ${this.#precioServicio === null ? "No disponible" : `$${this.#precioServicio.toLocaleString('es-CO')}`}`,
            `Fecha: ${this.#fecha}  Hora: ${this.#startTime}`,
            `Estado: ${this.#estado}`
        ].join("\n");
    }

    mostrarDatos() {
        return `Cita #${this.#agendaId} | ${this.#fecha} ${this.#startTime} | ${this.#estado} | Código: ${this.#bookingCode ?? "-"}`;
    }
}
