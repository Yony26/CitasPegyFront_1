/** Especialista que puede atender servicios del negocio. */
export default class Especialista {
  constructor({ id, nombre, cargo = "Especialista", activo = true }) {
    if (!nombre) {
      throw new Error("El especialista debe tener nombre.");
    }

    this.id = Number(id);
    this.nombre = String(nombre);
    this.cargo = String(cargo);
    this.activo = Boolean(activo);
  }
}
