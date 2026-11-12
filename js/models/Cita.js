/** Reserva temporal o confirmada; el backend es la autoridad para su estado. */
export default class Cita {
  constructor({
    servicioId,
    especialistaId,
    fecha,
    hora,
    duracionMinutos = 0,
    nombreCliente = "",
    notas = "",
    holdId = null,
    expiraEn = null,
    codigoReserva = null
  }) {
    this.servicioId = Number(servicioId);
    this.especialistaId = Number(especialistaId);
    this.fecha = String(fecha);
    this.hora = String(hora);
    this.duracionMinutos = Number(duracionMinutos);
    this.nombreCliente = String(nombreCliente);
    this.notas = String(notas);
    this.holdId = holdId === null ? null : String(holdId);
    this.expiraEn = expiraEn ? new Date(expiraEn) : null;
    this.codigoReserva = codigoReserva;
  }

  estaVigente(ahora = new Date()) {
    return this.expiraEn instanceof Date &&
      Number.isFinite(this.expiraEn.getTime()) &&
      this.expiraEn > ahora;
  }
}
