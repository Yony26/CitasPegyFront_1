// Clase Negocio - CitasPegy
// Establecimiento que ofrece servicios y emplea especialistas (restaurante, spa, barbería...).

export default class Negocio {

    #businessId;
    #nombre;
    #tipo;
    #direccion;
    #telefono;

    constructor(businessId, nombre, tipo, direccion, telefono) {
        if (!nombre || !tipo || !direccion || !telefono) {
            throw new Error("Todos los datos del negocio son obligatorios");
        }
        this.#businessId = businessId;
        this.#nombre = nombre;
        this.#tipo = tipo;
        this.#direccion = direccion;
        this.#telefono = telefono;
    }

    get businessId() { return this.#businessId; }
    get nombre() { return this.#nombre; }
    get tipo() { return this.#tipo; }
    get direccion() { return this.#direccion; }
    get telefono() { return this.#telefono; }

    set nombre(valor) { this.#nombre = valor; }
    set tipo(valor) { this.#tipo = valor; }
    set direccion(valor) { this.#direccion = valor; }
    set telefono(valor) { this.#telefono = valor; }

    mostrarDatos() {
        return `${this.#nombre} (${this.#tipo}) | ${this.#direccion} | Tel: ${this.#telefono}`;
    }
}
