// main.js - Pruebas de CitasPeggy (clases, repositorios y servicios)
// Corre con: node src/main.js
// Se usan fechas fijas ("ahora") para que el resultado sea siempre el mismo.

import assert from 'node:assert/strict';
import Cliente from './classes/cliente.js';
import Administracion from './classes/administracion.js';
import Persona from './classes/persona.js';
import { registrarCliente, iniciarSesion } from './services/usuarioService.js';
import {
    crearNegocio, buscarNegocios, crearServicio, listarServicios, detalleServicio,
    registrarEspecialista, especialistasDelNegocio, desactivarServicio
} from './services/negocioService.js';
import {
    horariosDisponibles, cualquierEspecialistaDisponible, reservarTemporal, confirmarCita,
    historialCliente, agendaDelDia, cancelarCita, reprogramarCita, completarCita,
    marcarNoAsistio, marcarNoAsistidasAutomaticas, metricasNegocio, obtenerComprobante
} from './services/citaService.js';
import { EstadoCita } from './enums/estadoCita.js';
import OrdenDelDia from './classes/ordenDelDia.js';
import { generarIdCita, guardarCita } from './repository/citaRepository.js';

const probarError = (titulo, fn) => {
    assert.throws(fn, undefined, titulo);
    console.log(`Error esperado (${titulo})`);
};

console.log("===== PRUEBA: Persona es abstracta =====");
probarError("instanciar Persona", () => new Persona(1, "CC", "A", "B", "1", "a@a.com", "x", null));

console.log("\n===== PRUEBA: Registro e inicio de sesión (Cliente) =====");
const ana = registrarCliente("CC", "Ana", "Torres", "3001234567", "ana@correo.com", "clave123", "clave123");
console.log(ana.mostrarDatos());
console.log("Login correcto:", iniciarSesion("ana@correo.com", "clave123").nombreCompleto);
probarError("contraseña incorrecta", () => iniciarSesion("ana@correo.com", "otra"));
probarError("contraseñas no coinciden", () => registrarCliente("CC", "Luis", "Pérez", "300", "luis@correo.com", "a", "b"));
probarError("correo repetido", () => registrarCliente("CC", "Ana", "Dos", "300", "ana@correo.com", "a", "a"));

console.log("\n===== PRUEBA: Administración (herencia) =====");
const admin = new Administracion(99, "CC", "Paola", "Durango", "3010000000", "paola@citaspeggy.com", "admin123", null);
console.log(admin.mostrarDatos());

console.log("\n===== PRUEBA: Catálogo (HU01 a HU03, HU08) =====");
const barberia = crearNegocio("Barbería El Corte", "Barbería", "Calle 10 #20-30", "6041234567");
const spa = crearNegocio("Spa Sereno", "Spa", "Carrera 43A #5-10", "6047654321");
const cortar = crearServicio(barberia.businessId, "Corte de cabello", "Corte clásico", 45, 35000);
const barba = crearServicio(barberia.businessId, "Arreglo de barba", "Perfilado y toalla caliente", 30, 20000);
const cejas = crearServicio(barberia.businessId, "Diseño de cejas", "Perfilado de cejas", 15, 12000);
crearServicio(spa.businessId, "Masaje relajante", "Masaje de 60 minutos", 60, 90000);
console.log("Buscar 'barb':", buscarNegocios({ nombre: "barb" }).map(n => n.nombre));
console.log("Filtrar por Spa:", buscarNegocios({ tipo: "Spa" }).map(n => n.nombre));
console.log("Sin coincidencias:", buscarNegocios({ nombre: "zzz" }).length, "resultados");
console.log("Servicios de la barbería:", listarServicios(barberia.businessId).map(s => s.mostrarDatos()));

const laura = registrarEspecialista(barberia.businessId, "CC", "Laura", "Mesa", "3022222222", "laura@correo.com", "e1", "Barbera");
const carlos = registrarEspecialista(barberia.businessId, "CC", "Carlos", "Ríos", "3033333333", "carlos@correo.com", "e2", "Barbero");
console.log("Especialistas:", especialistasDelNegocio(barberia.businessId).map(e => e.nombreCompleto));
console.log("Detalle:", detalleServicio(cortar.serviceId).servicio.mostrarDatos());

console.log("\n===== PRUEBA: Horarios y reserva temporal (HU04 a HU07) =====");
const ahora = new Date("2026-11-10T09:00:00");
const fecha = "2026-11-12";
console.log("Horarios libres de Laura:", horariosDisponibles(laura.id, fecha, cortar.serviceId, ahora).slice(0, 6), "...");
const bloqueo = reservarTemporal(ana.id, laura.id, cortar.serviceId, fecha, "10:15", ahora);
console.log("Bloqueo creado hasta:", bloqueo.expiraEn.toTimeString().slice(0, 5));
assert.equal(bloqueo.expiraEn.getTime(), ahora.getTime() + 5 * 60 * 1000, "el bloqueo debe durar cinco minutos");
assert.equal(horariosDisponibles(laura.id, fecha, cortar.serviceId, ahora).includes("10:15"), false, "el horario bloqueado no debe aparecer disponible");
probarError("reservar un horario bloqueado", () => reservarTemporal(ana.id, laura.id, cortar.serviceId, fecha, "10:15", ahora));
probarError("reservar un horario solapado", () => reservarTemporal(ana.id, laura.id, cejas.serviceId, fecha, "10:30", ahora));
const cita1 = confirmarCita(bloqueo.id, "Sin loción, por favor", new Date("2026-11-10T09:02:00"));
assert.equal(cita1.estado, EstadoCita.CONFIRMADA, "la cita debe quedar confirmada");
assert.match(cita1.bookingCode, /^CP-\d{4}$/u, "la cita debe recibir un código de reserva");
assert.equal(historialCliente(ana.id).some(cita => cita.agendaId === cita1.agendaId), true, "la cita confirmada debe aparecer en el historial");
assert.equal(agendaDelDia(laura.id, fecha).some(cita => cita.agendaId === cita1.agendaId), true, "la cita confirmada debe aparecer en la agenda");
probarError("reservar un horario solapado con una cita confirmada", () => reservarTemporal(ana.id, laura.id, cejas.serviceId, fecha, "10:30", ahora));
console.log(cita1.mostrarDatos());

const bloqueoEnCarrera = reservarTemporal(ana.id, carlos.id, cortar.serviceId, fecha, "09:30", ahora);
const citaEnCarrera = new OrdenDelDia(generarIdCita(), fecha, "09:30", ana.id, carlos.id, cortar.serviceId, "", cortar.precio, cortar.nombre, cortar.duracionMinutos);
citaEnCarrera.confirmar("CP-9998");
guardarCita(citaEnCarrera);
probarError("revalidar un horario tomado antes de confirmar", () => confirmarCita(bloqueoEnCarrera.id, "", new Date("2026-11-10T09:01:00")));

const bloqueoTarde = reservarTemporal(ana.id, carlos.id, cortar.serviceId, fecha, "08:00", ahora);
probarError("confirmar pasados 5 minutos", () => confirmarCita(bloqueoTarde.id, "", new Date("2026-11-10T09:06:00")));
console.log("08:00 de Carlos libre otra vez:", horariosDisponibles(carlos.id, fecha, cortar.serviceId, new Date("2026-11-10T09:06:00")).includes("08:00"));
probarError("horario ya pasado", () => reservarTemporal(ana.id, laura.id, cortar.serviceId, fecha, "08:00", new Date("2026-11-12T12:00:00")));
console.log("Cualquier especialista a las 10:15:", especialistasDelNegocio(barberia.businessId).find(e => e.id === cualquierEspecialistaDisponible([laura.id, carlos.id], fecha, "10:15", cortar.serviceId, ahora))?.nombreCompleto);

console.log("\n===== PRUEBA: Comprobante (HU16) =====");
console.log(obtenerComprobante(cita1.agendaId));

console.log("\n===== PRUEBA: Cancelar y reprogramar (HU09) =====");
const b2 = reservarTemporal(ana.id, laura.id, barba.serviceId, fecha, "14:00", ahora);
const cita2 = confirmarCita(b2.id, "", ahora);
const nueva = reprogramarCita(cita2.agendaId, "2026-11-13", "15:00", ahora);
console.log("Cita original:", cita2.estado, "| Nueva:", nueva.mostrarDatos());
probarError("cancelar con menos de 2 horas", () => cancelarCita(nueva.agendaId, new Date("2026-11-13T14:00:00")));
cancelarCita(nueva.agendaId, ahora);
console.log("Estado tras cancelar:", nueva.estado);
console.log("15:00 liberado:", horariosDisponibles(laura.id, "2026-11-13", barba.serviceId, ahora).includes("15:00"));

console.log("\n===== PRUEBA: Historial y agenda (HU12, HU14) =====");
console.log("Historial de Ana:", historialCliente(ana.id).map(c => `${c.fecha} ${c.startTime} ${c.estado}`));
console.log("Solo canceladas:", historialCliente(ana.id, EstadoCita.CANCELADA).length);
console.log("Agenda de Laura el 12:", agendaDelDia(laura.id, fecha).map(c => c.mostrarDatos()));

console.log("\n===== PRUEBA: Estados finales y métricas (HU11, HU13) =====");
probarError("completar antes de la hora", () => completarCita(cita1.agendaId, ahora));
completarCita(cita1.agendaId, new Date("2026-11-12T12:00:00"));
console.log("Cita 1:", cita1.estado);
const b3 = reservarTemporal(ana.id, carlos.id, cortar.serviceId, fecha, "11:00", ahora);
const cita3 = confirmarCita(b3.id, "", ahora);
const b4 = reservarTemporal(ana.id, carlos.id, cortar.serviceId, fecha, "13:15", ahora);
const cita4 = confirmarCita(b4.id, "", ahora);
marcarNoAsistio(cita3.agendaId, new Date("2026-11-12T12:00:00"));
console.log("Cita 3:", cita3.estado);
console.log("Marcadas automáticas (plazo 24 h):", marcarNoAsistidasAutomaticas(new Date("2026-11-14T09:00:00")), "->", cita4.estado);
console.log("Métricas de la barbería:", metricasNegocio(barberia.businessId, "2026-11-01", "2026-11-30"));

console.log("\n===== PRUEBA: Desactivar servicio sin perder historial (HU08) =====");
desactivarServicio(barba.serviceId);
console.log("Servicios activos:", listarServicios(barberia.businessId).map(s => s.nombre));
console.log("La cita antigua sigue en el historial:", historialCliente(ana.id).length, "citas");
