/** Datos públicos mínimos de un cliente; no guarda contraseña en el navegador. */
export default class Cliente {
  constructor({ id = null, nombre, correo = "" }) {
    if (!nombre) {
      throw new Error("El cliente debe tener nombre.");
    }

    this.id = id === null ? null : Number(id);
    this.nombre = String(nombre);
    this.correo = String(correo);
  }
}
