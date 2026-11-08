// Clase Cliente - CitasPegy (hereda de Persona)
// Persona que busca un negocio, agenda y gestiona sus citas. No tiene atributos propios.

import Persona from './persona.js';

export default class Cliente extends Persona {

    /**
     * Crea un Cliente validando los datos y que la contraseña coincida con su confirmación.
     * Corresponde a HU01 (registrarse).
     */
    static registrar(id, docType, nombre, apellido, telefono, correoElectronico, contrasena, confirmarContrasena, fechaNacimiento = null) {
        if (!id || !docType || !nombre || !apellido || !telefono || !correoElectronico || !contrasena) {
            throw new Error("Todos los campos son obligatorios");
        }
        if (contrasena !== confirmarContrasena) {
            throw new Error("La contraseña y su confirmación no coinciden");
        }
        return new Cliente(id, docType, nombre, apellido, telefono, correoElectronico, contrasena, fechaNacimiento);
    }
}
