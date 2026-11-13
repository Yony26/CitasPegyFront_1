/** Información de un servicio ofrecido por un negocio. */
export default class Servicio {
  constructor({ id, nombre, descripcion, duracionMinutos, precio, icono = "✂", activo = true }) {
    if (!nombre || !descripcion) {
      throw new Error("El servicio debe tener nombre y descripción.");
    }
    if (!Number.isFinite(Number(duracionMinutos)) || Number(duracionMinutos) <= 0) {
      throw new Error("La duración del servicio debe ser mayor que cero.");
    }
    if (!Number.isFinite(Number(precio)) || Number(precio) < 0) {
      throw new Error("El precio del servicio no puede ser negativo.");
    }

    this.id = Number(id);
    this.nombre = String(nombre);
    this.descripcion = String(descripcion);
    this.duracionMinutos = Number(duracionMinutos);
    this.precio = Number(precio);
    this.icono = icono;
    this.activo = Boolean(activo);
  }
}
