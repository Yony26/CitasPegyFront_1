// Servicio de Usuarios - CitasPegy
// Registro e inicio de sesión (HU01 y HU02 de la plataforma).

import Cliente from '../classes/cliente.js';
import { generarIdPersona, guardarPersona, buscarPersonaPorCorreo, buscarPersonaPorId, correoEnUso } from '../repository/personaRepository.js';

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

/** Actualiza los datos del perfil del usuario autenticado. */
export function actualizarPerfil(usuarioId, { nombre, apellido, telefono, correoElectronico } = {}) {
    const persona = buscarPersonaPorId(usuarioId);
    const datos = {
        nombre: String(nombre ?? "").trim(),
        apellido: String(apellido ?? "").trim(),
        telefono: String(telefono ?? "").trim(),
        correoElectronico: String(correoElectronico ?? "").trim().toLowerCase()
    };
    if (Object.values(datos).some(valor => !valor)) throw new Error("Todos los campos del perfil son obligatorios");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correoElectronico)) throw new Error("Ingresa un correo electrónico válido");
    if (correoEnUso(datos.correoElectronico, usuarioId)) throw new Error("Ya existe otro usuario con ese correo electrónico");
    persona.editarPerfil(datos);
    return persona;
}

/** Cambia la contraseña después de verificar la actual y la confirmación. */
export function cambiarContrasena(usuarioId, actual, nueva, confirmar) {
    const persona = buscarPersonaPorId(usuarioId);
    if (!actual || !nueva || !confirmar) throw new Error("Completa todos los campos de contraseña");
    if (nueva.length < 6) throw new Error("La nueva contraseña debe tener al menos 6 caracteres");
    if (nueva !== confirmar) throw new Error("La nueva contraseña y su confirmación no coinciden");
    if (actual === nueva) throw new Error("La nueva contraseña debe ser diferente a la actual");
    persona.cambiarContrasena(actual, nueva);
}
