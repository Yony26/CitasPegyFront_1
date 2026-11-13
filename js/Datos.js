// Datos.js centraliza el catálogo demo y las llamadas REST del frontend.
// Ajusta las rutas si el controlador de tu backend Maven usa otros endpoints.
import Negocio from "./models/Negocio.js";
import Servicio from "./models/Servicio.js";
import Especialista from "./models/Especialista.js";
import Cita from "./models/Cita.js";

const API_BASE = (globalThis.CITASPEGY_API_URL ?? "").replace(/\/+$/, "");
const DURACION_RETENCION_MS = 5 * 60 * 1000;
const negociosDemo = [
  new Negocio({
    id: 1,
    nombre: "Barbería El Corte",
    categoria: "Barbería",
    direccion: "Calle 10 #20-30, Medellín",
    telefono: "6041234567",
    calificacion: "4.9",
    servicios: [
      new Servicio({ id: 1, nombre: "Corte de cabello", descripcion: "Corte clásico con lavado y acabado.", duracionMinutos: 45, precio: 35000, icono: "✂" }),
      new Servicio({ id: 2, nombre: "Arreglo de barba", descripcion: "Perfilado preciso y toalla caliente.", duracionMinutos: 30, precio: 20000, icono: "◒" }),
      new Servicio({ id: 3, nombre: "Corte + barba", descripcion: "Un estilo completo en una sola visita.", duracionMinutos: 60, precio: 50000, icono: "✦" }),
      new Servicio({ id: 4, nombre: "Afeitado clásico", descripcion: "Afeitado tradicional con acabado suave.", duracionMinutos: 30, precio: 25000, icono: "⌁" }),
      new Servicio({ id: 5, nombre: "Lavado y peinado", descripcion: "Lavado capilar y peinado profesional.", duracionMinutos: 30, precio: 18000, icono: "〰" }),
      new Servicio({ id: 6, nombre: "Diseño de cejas", descripcion: "Perfilado de cejas con un acabado limpio.", duracionMinutos: 12, precio: 12000, icono: "⌒" })
    ],
    especialistas: [
      new Especialista({ id: 1, nombre: "Yony López", cargo: "Barbero" }),
      new Especialista({ id: 2, nombre: "Paola Ríos", cargo: "Barbera" })
    ]
  })
];

const reservasDemo = [];
const retencionesDemo = new Map();
let consecutivoDemo = 0;
let consecutivoRetenciones = 0;

function obtenerId(dto) {
  return dto.id ?? dto.businessId ?? dto.serviceId ?? dto.specialistId;
}

function mapearServicio(dto) {
  return new Servicio({
    id: obtenerId(dto),
    nombre: dto.nombre ?? dto.name,
    descripcion: dto.descripcion ?? dto.description ?? "Servicio disponible.",
    duracionMinutos: dto.duracionMinutos ?? dto.durationMinutes ?? dto.duration,
    precio: dto.precio ?? dto.price,
    icono: dto.icono ?? dto.icon ?? "✂",
    activo: dto.activo ?? dto.active ?? true
  });
}

function mapearEspecialista(dto) {
  return new Especialista({
    id: obtenerId(dto),
    nombre: dto.nombre ?? dto.nombreCompleto ?? dto.name,
    cargo: dto.cargo ?? dto.especialidad ?? dto.role ?? "Especialista",
    activo: dto.activo ?? dto.active ?? true
  });
}

function mapearNegocio(dto) {
  return new Negocio({
    id: obtenerId(dto),
    nombre: dto.nombre ?? dto.name,
    categoria: dto.categoria ?? dto.tipo ?? dto.category,
    direccion: dto.direccion ?? dto.address ?? "",
    telefono: dto.telefono ?? dto.phone ?? "",
    calificacion: dto.calificacion ?? dto.rating ?? "4.9",
    servicios: (dto.servicios ?? dto.services ?? []).map(mapearServicio).filter(servicio => servicio.activo),
    especialistas: (dto.especialistas ?? dto.specialists ?? []).map(mapearEspecialista).filter(especialista => especialista.activo)
  });
}

async function solicitar(ruta, opciones = {}) {
  let respuesta;
  try {
    respuesta = await fetch(`${API_BASE}${ruta}`, {
      ...opciones,
      headers: {
        Accept: "application/json",
        ...(opciones.body ? { "Content-Type": "application/json" } : {}),
        ...opciones.headers
      }
    });
  } catch {
    throw new Error("No fue posible conectar con el backend de CitasPegy.");
  }

  if (respuesta.status === 204) return null;
  const tipoContenido = respuesta.headers.get("content-type") ?? "";
  let datos;
  if (tipoContenido.includes("application/json")) {
    try {
      datos = await respuesta.json();
    } catch {
      throw new Error("El backend devolvió una respuesta JSON inválida.");
    }
  } else {
    datos = await respuesta.text();
  }

  if (!respuesta.ok) {
    const detalle = typeof datos === "string" ? datos : datos?.message || datos?.error;
    throw new Error(detalle || `La solicitud al backend falló (${respuesta.status}).`);
  }
  if (!tipoContenido.includes("application/json") || !datos || typeof datos !== "object") {
    throw new Error("El backend devolvió una respuesta incompleta.");
  }
  return datos;
}

function aFechaLocal(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function aMinutos(hora) {
  const [horas, minutos] = hora.split(":").map(Number);
  return horas * 60 + minutos;
}

function seCruzan(inicioA, duracionA, inicioB, duracionB) {
  return inicioA < inicioB + duracionB && inicioB < inicioA + duracionA;
}

/**
 * Devuelve el catálogo. En modo local instancia la barbería demo; con API
 * configurada consulta GET /api/businesses y adapta los DTO a las clases.
 */
export async function listarNegocios() {
  if (!API_BASE) return negociosDemo;
  const respuesta = await solicitar("/api/businesses");
  const lista = Array.isArray(respuesta) ? respuesta : respuesta.businesses;
  if (!Array.isArray(lista)) throw new Error("El backend debe devolver una lista de negocios.");
  return lista.map(mapearNegocio);
}

/** Consulta servicios activos de un negocio. En modo demo usa los datos iniciales. */
export async function listarServicios(negocioId) {
  if (!API_BASE) return negociosDemo.find(negocio => negocio.id === Number(negocioId))?.servicios ?? [];
  const respuesta = await solicitar(`/api/businesses/${encodeURIComponent(negocioId)}/services`);
  const lista = Array.isArray(respuesta) ? respuesta : respuesta.services;
  if (!Array.isArray(lista)) throw new Error("El backend debe devolver una lista de servicios.");
  return lista.map(mapearServicio).filter(servicio => servicio.activo);
}

/** Consulta especialistas activos disponibles para reservar en un negocio. */
export async function listarEspecialistas(negocioId) {
  if (!API_BASE) return negociosDemo.find(negocio => negocio.id === Number(negocioId))?.especialistas ?? [];
  const respuesta = await solicitar(`/api/businesses/${encodeURIComponent(negocioId)}/specialists`);
  const lista = Array.isArray(respuesta) ? respuesta : respuesta.specialists;
  if (!Array.isArray(lista)) throw new Error("El backend debe devolver una lista de especialistas.");
  return lista.map(mapearEspecialista).filter(especialista => especialista.activo);
}

/**
 * Lista horas abiertas. La API puede responder { availableTimes: ["09:00", ...] }.
 * La disponibilidad definitiva siempre se vuelve a revisar al crear la retención.
 */
export async function listarHorariosDisponibles({ servicioId, especialistaId, fecha, duracionMinutos }) {
  if (API_BASE) {
    const params = new URLSearchParams({
      serviceId: String(servicioId),
      specialistId: String(especialistaId),
      date: fecha,
      durationMinutes: String(duracionMinutos)
    });
    const respuesta = await solicitar(`/api/appointments/availability?${params}`);
    const horas = respuesta.availableTimes ?? respuesta.horariosDisponibles;
    if (!Array.isArray(horas)) throw new Error("El backend no devolvió la lista de horarios disponibles.");
    return horas.map(String);
  }

  const horas = [];
  const ahora = new Date();
  const hoy = aFechaLocal(ahora);
  for (let minutos = 8 * 60; minutos + duracionMinutos <= 17 * 60; minutos += duracionMinutos) {
    const hora = `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;
    if (fecha === hoy && new Date(`${fecha}T${hora}:00`) <= ahora) continue;

    const ocupada = reservasDemo.some(reserva =>
      reserva.fecha === fecha &&
      reserva.especialistaId === Number(especialistaId) &&
      seCruzan(minutos, duracionMinutos, aMinutos(reserva.hora), reserva.duracionMinutos)
    ) || [...retencionesDemo.values()].some(({ cita: retencion }) =>
      retencion.estaVigente() &&
      retencion.fecha === fecha &&
      retencion.especialistaId === Number(especialistaId) &&
      seCruzan(minutos, duracionMinutos, aMinutos(retencion.hora), retencion.duracionMinutos)
    );
    if (!ocupada) horas.push(hora);
  }
  return horas;
}

/** Retiene la hora por cinco minutos y devuelve una instancia Cita. */
export async function crearRetencion({ servicioId, especialistaId, fecha, hora, duracionMinutos, notas = "" }) {
  if (!API_BASE) {
    const holdId = `demo-hold-${++consecutivoRetenciones}`;
    const cita = new Cita({
      servicioId,
      especialistaId,
      fecha,
      hora,
      duracionMinutos,
      notas,
      holdId,
      expiraEn: new Date(Date.now() + DURACION_RETENCION_MS)
    });
    retencionesDemo.set(holdId, { cita });
    return cita;
  }

  // El servidor debe validar de forma atómica que no haya citas o retenciones
  // solapadas y asignar una expiración real de cinco minutos.
  const respuesta = await solicitar("/api/appointments/holds", {
    method: "POST",
    body: JSON.stringify({ serviceId: servicioId, specialistId: especialistaId, date: fecha, time: hora, notes: notas })
  });
  const holdId = respuesta.holdId ?? respuesta.id;
  if (holdId === undefined || holdId === null || String(holdId).trim() === "") {
    throw new Error("El backend no devolvió el identificador de la retención.");
  }
  const expiraEn = respuesta.expiresAt
    ? new Date(respuesta.expiresAt)
    : new Date(Date.now() + DURACION_RETENCION_MS);
  if (!Number.isFinite(expiraEn.getTime()) || expiraEn <= new Date()) {
    throw new Error("El backend devolvió una expiración inválida para la retención.");
  }
  return new Cita({ servicioId, especialistaId, fecha, hora, duracionMinutos, notas, holdId, expiraEn });
}

/** Confirma una retención y devuelve el código producido por el backend. */
export async function confirmarRetencion(cita, notas = "", nombreCliente = "") {
  if (!cita?.estaVigente()) {
    throw new Error("La retención venció. Elige nuevamente un horario.");
  }

  if (!API_BASE) {
    if (!retencionesDemo.has(cita.holdId)) {
      throw new Error("La retención ya no existe. Selecciona otro horario.");
    }
    retencionesDemo.delete(cita.holdId);
    reservasDemo.push({ ...cita, nombreCliente, notas, expiraEn: null });
    return `DEMO-${String(++consecutivoDemo).padStart(4, "0")}`;
  }

  cita.nombreCliente = nombreCliente;
  const respuesta = await solicitar(
    `/api/appointments/holds/${encodeURIComponent(cita.holdId)}/confirm`,
    { method: "POST", body: JSON.stringify({ notes: notas, clientName: nombreCliente }) }
  );
  if (typeof respuesta.bookingCode !== "string" || !respuesta.bookingCode.trim()) {
    throw new Error("El backend confirmó la cita sin devolver su código.");
  }
  cita.codigoReserva = respuesta.bookingCode;
  return respuesta.bookingCode;
}

/** Libera la retención al cambiar de horario o cerrar el formulario. */
export async function liberarRetencion(cita) {
  if (!cita?.holdId) return;
  retencionesDemo.delete(cita.holdId);
  if (API_BASE) {
    await solicitar(`/api/appointments/holds/${encodeURIComponent(cita.holdId)}`, { method: "DELETE" });
  }
}
