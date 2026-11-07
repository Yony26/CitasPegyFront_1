// Clase Servicio - CitasPeggy
// Servicio que ofrece un Negocio (corte de cabello, masaje, consulta...).

export default class Servicio {

    #serviceId;
    #nombre;
    #descripcion;
    #duracionMinutos;
    #precio;
    #negocioId;
    #activo;

    constructor(serviceId, nombre, descripcion, duracionMinutos, precio, negocioId) {
        if (!nombre || !negocioId) {
            throw new Error("El servicio necesita nombre y negocio");
        }
        if (!(duracionMinutos > 0)) {
            throw new Error("La duración debe ser mayor a cero");
        }
        if (!(precio >= 0)) {
            throw new Error("El precio no puede ser negativo");
        }
        this.#serviceId = serviceId;
        this.#nombre = nombre;
        this.#descripcion = descripcion;
        this.#duracionMinutos = duracionMinutos;
        this.#precio = precio;
        this.#negocioId = negocioId;
        this.#activo = true;
    }

    get serviceId() { return this.#serviceId; }
    get nombre() { return this.#nombre; }
    get descripcion() { return this.#descripcion; }
    get duracionMinutos() { return this.#duracionMinutos; }
    get precio() { return this.#precio; }
    get negocioId() { return this.#negocioId; }
    get activo() { return this.#activo; }

    set nombre(valor) { this.#nombre = valor; }
    set descripcion(valor) { this.#descripcion = valor; }
    set duracionMinutos(valor) { this.#duracionMinutos = valor; }
    set precio(valor) { this.#precio = valor; }

    /** HU08: desactivar sin perder el historial de citas ya agendadas. */
    desactivar() { this.#activo = false; }
    activar() { this.#activo = true; }

    mostrarDatos() {
        return `${this.#nombre} | ${this.#duracionMinutos} min | $${this.#precio.toLocaleString('es-CO')}`;
    }
}
