/** Entidad del catálogo que agrupa los servicios y especialistas de un local. */
export default class Negocio {
  constructor({ id, nombre, categoria, direccion, telefono = "", calificacion = "4.9", servicios = [], especialistas = [] }) {
    if (!nombre || !categoria) {
      throw new Error("El negocio debe tener nombre y categoría.");
    }

    this.id = Number(id);
    this.nombre = String(nombre);
    this.categoria = String(categoria);
    this.direccion = String(direccion ?? "");
    this.telefono = String(telefono ?? "");
    this.calificacion = String(calificacion);
    this.servicios = [...servicios];
    this.especialistas = [...especialistas];
  }

  /** Actualiza el catálogo cuando se carga desde la API o desde Datos.js. */
  actualizarCatalogo({ servicios = this.servicios, especialistas = this.especialistas } = {}) {
    this.servicios = [...servicios];
    this.especialistas = [...especialistas];
  }

  /** Devuelve true si el negocio coincide con el texto y la categoría elegidos. */
  coincideConFiltro(texto = "", categoria = "") {
    const consulta = texto.trim().toLocaleLowerCase("es");
    const coincideNombre = this.nombre.toLocaleLowerCase("es").includes(consulta);
    const coincideCategoria = !categoria || this.categoria === categoria;
    return coincideNombre && coincideCategoria;
  }
}
