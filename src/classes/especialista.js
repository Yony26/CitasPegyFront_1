// Clase Especialista - CitasPegy (hereda de Persona)
// Profesional que atiende las citas. Pertenece a un Negocio (negocioId).

import Persona from './persona.js';

export default class Especialista extends Persona {

    _especialidad;
    _negocioId;

    constructor(id, docType, nombre, apellido, telefono, correoElectronico, contrasena, fechaNacimiento, especialidad, negocioId) {
        super(id, docType, nombre, apellido, telefono, correoElectronico, contrasena, fechaNacimiento);
        this._especialidad = especialidad;
        this._negocioId = negocioId;
    }

    get especialidad() { return this._especialidad; }
    get negocioId() { return this._negocioId; }
    set especialidad(valor) { this._especialidad = valor; }

    mostrarDatos() {
        return `${super.mostrarDatos()} | Especialidad: ${this._especialidad}`;
    }
}
