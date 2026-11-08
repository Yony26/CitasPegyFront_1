// Clase Persona - CitasPegy
// Clase BASE de la que heredan Administracion, Cliente y Especialista.
//
// Los atributos usan "_" (protegido por convención) y no "#", porque las clases
// hijas necesitan acceder a ellos. Con "#" ni las hijas podrían verlos.

export default class Persona {

    _id;
    _docType;
    _nombre;
    _apellido;
    _telefono;
    _correoElectronico;
    _contrasena;
    _fechaNacimiento;

    constructor(id, docType, nombre, apellido, telefono, correoElectronico, contrasena, fechaNacimiento) {
        if (new.target === Persona) {
            throw new Error("Persona es una clase abstracta: use Cliente, Especialista o Administracion");
        }
        this._id = id;
        this._docType = docType;
        this._nombre = nombre;
        this._apellido = apellido;
        this._telefono = telefono;
        this._correoElectronico = correoElectronico;
        this._contrasena = contrasena;
        this._fechaNacimiento = fechaNacimiento;
    }

    // ===== Getters =====
    get id() { return this._id; }
    get docType() { return this._docType; }
    get nombre() { return this._nombre; }
    get apellido() { return this._apellido; }
    get telefono() { return this._telefono; }
    get correoElectronico() { return this._correoElectronico; }
    get fechaNacimiento() { return this._fechaNacimiento; }
    get nombreCompleto() { return `${this._nombre} ${this._apellido}`; }
    // No se expone getter de "contrasena" por seguridad: se valida con login().

    // ===== Setters =====
    set nombre(valor) { this._nombre = valor; }
    set apellido(valor) { this._apellido = valor; }
    set telefono(valor) { this._telefono = valor; }
    set correoElectronico(valor) { this._correoElectronico = valor; }

    // ===== Métodos comunes =====

    /** Valida las credenciales (HU02: iniciar sesión). */
    login(correo, contrasena) {
        return correo === this._correoElectronico && contrasena === this._contrasena;
    }

    /** Actualiza los datos editables del perfil. */
    editarPerfil({ nombre, apellido, telefono, correoElectronico } = {}) {
        if (nombre) this._nombre = nombre;
        if (apellido) this._apellido = apellido;
        if (telefono) this._telefono = telefono;
        if (correoElectronico) this._correoElectronico = correoElectronico;
    }

    cambiarContrasena(actual, nueva) {
        if (actual !== this._contrasena) throw new Error("La contraseña actual es incorrecta");
        this._contrasena = nueva;
    }

    mostrarDatos() {
        return `${this.constructor.name}: ${this.nombreCompleto} | Correo: ${this._correoElectronico} | Tel: ${this._telefono}`;
    }
}
