// Servicio de Usuarios - CitasPeggy
// Registro e inicio de sesión (HU01 y HU02 de la plataforma).

import Cliente from '../classes/cliente.js';
import { generarIdPersona, guardarPersona, buscarPersonaPorCorreo } from '../repository/personaRepository.js';

export function registrarCliente(docType, nombre, apellido, telefono, correo, contrasena, confirmar) {
    const cliente = Cliente.registrar(generarIdPersona(), docType, nombre, apellido, telefono, correo, contrasena, confirmar);
    return guardarPersona(cliente);
}

/** Devuelve la persona si las credenciales son correctas. No dice cuál dato falló. */
export function iniciarSesion(correo, contrasena) {
    const persona = buscarPersonaPorCorreo(correo);
    if (!persona || !persona.login(correo, contrasena)) {
        throw new Error("Correo o contraseña incorrectos");
    }
    return persona;
}
