// Servicio de Negocios - CitasPegy
// Orquesta el catálogo: negocios, servicios y especialistas (EP1).

import Negocio from '../classes/negocio.js';
import Servicio from '../classes/servicio.js';
import Especialista from '../classes/especialista.js';
import {
    generarIdNegocio, generarIdServicio, guardarNegocio, guardarServicio,
    listarNegocios, buscarNegocioPorId, buscarServicioPorId, listarServiciosPorNegocio
} from '../repository/negocioRepository.js';
import { listarPersonasPorTipo, guardarPersona, generarIdPersona } from '../repository/personaRepository.js';

export function crearNegocio(nombre, tipo, direccion, telefono) {
    return guardarNegocio(new Negocio(generarIdNegocio(), nombre, tipo, direccion, telefono));
}

/** HU01: buscar por nombre y/o filtrar por categoría. */
export function buscarNegocios({ nombre = "", tipo = "" } = {}) {
    const texto = nombre.trim().toLowerCase();
    return listarNegocios().filter(n =>
        n.nombre.toLowerCase().includes(texto) &&
        (!tipo || n.tipo.toLowerCase() === tipo.toLowerCase())
    );
}

/** HU08: crear un servicio del negocio. */
export function crearServicio(negocioId, nombre, descripcion, duracionMinutos, precio) {
    buscarNegocioPorId(negocioId); // lanza error si el negocio no existe
    return guardarServicio(new Servicio(generarIdServicio(), nombre, descripcion, duracionMinutos, precio, negocioId));
}

/** HU19: actualizar datos y precio de un servicio existente. */
export function actualizarServicio(servicioId, { nombre, descripcion, duracionMinutos, precio }) {
    const servicio = buscarServicioPorId(servicioId);
    if (!nombre?.trim() || !descripcion?.trim()) throw new Error("El nombre y la descripción son obligatorios");
    if (!Number.isFinite(duracionMinutos) || duracionMinutos <= 0) throw new Error("La duración debe ser mayor a cero");
    if (!Number.isFinite(precio) || precio < 0) throw new Error("El precio no puede ser negativo");
    servicio.nombre = nombre.trim();
    servicio.descripcion = descripcion.trim();
    servicio.duracionMinutos = duracionMinutos;
    servicio.precio = precio;
    return servicio;
}

/** HU02: solo los servicios activos de un negocio. */
export function listarServicios(negocioId) {
    return listarServiciosPorNegocio(negocioId).filter(s => s.activo);
}

/** HU03: detalle del servicio con los especialistas que lo ofrecen (los del negocio). */
export function detalleServicio(servicioId) {
    const servicio = buscarServicioPorId(servicioId);
    if (!servicio.activo) throw new Error("El servicio no está disponible");
    const especialistas = especialistasDelNegocio(servicio.negocioId);
    return { servicio, especialistas };
}

/** HU18: registrar un especialista asociado a un negocio. */
export function registrarEspecialista(negocioId, docType, nombre, apellido, telefono, correo, contrasena, especialidad) {
    buscarNegocioPorId(negocioId);
    const esp = new Especialista(generarIdPersona(), docType, nombre, apellido, telefono, correo, contrasena, null, especialidad, negocioId);
    return guardarPersona(esp);
}

export function especialistasDelNegocio(negocioId) {
    return listarPersonasPorTipo(Especialista).filter(e => e.negocioId === negocioId);
}

/** HU08: desactivar un servicio sin perder el historial. */
export function desactivarServicio(servicioId) {
    buscarServicioPorId(servicioId).desactivar();
}
