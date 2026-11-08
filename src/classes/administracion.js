// Clase Administracion - CitasPegy (hereda de Persona)
// Dueño o administrador del negocio: gestiona servicios, especialistas y métricas.

import Persona from './persona.js';

export default class Administracion extends Persona {

    _rol;

    constructor(id, docType, nombre, apellido, telefono, correoElectronico, contrasena, fechaNacimiento, rol = "Administrador") {
        super(id, docType, nombre, apellido, telefono, correoElectronico, contrasena, fechaNacimiento);
        this._rol = rol;
    }

    get rol() { return this._rol; }
    set rol(valor) { this._rol = valor; }

    mostrarDatos() {
        return `${super.mostrarDatos()} | Rol: ${this._rol}`;
    }
}
