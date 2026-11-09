import { EstadoCita } from "../enums/estadoCita.js";
import { listarCitas } from "../repository/citaRepository.js";
import { buscarNegocioPorId, buscarServicioPorId } from "../repository/negocioRepository.js";

const API_BASE = (globalThis.CITASPEGY_API_URL ?? "").replace(/\/+$/, "");
const ESTADOS_VALIDOS = new Set(Object.values(EstadoCita));

function mapearCitaLocal(cita) {
    const servicio = buscarServicioPorId(cita.servicioId);
    const negocio = buscarNegocioPorId(servicio.negocioId);
    return {
        codigo: cita.bookingCode,
        estado: cita.estado,
        fecha: cita.fecha,
        hora: cita.startTime,
        negocio: negocio.nombre,
        servicio: cita.nombreServicio || servicio.nombre
    };
}

function validarRespuesta(cita, codigo) {
    if (!cita || typeof cita !== "object" || cita.codigo !== codigo ||
        !ESTADOS_VALIDOS.has(cita.estado) ||
        !["fecha", "hora", "negocio", "servicio"].every(campo => typeof cita[campo] === "string")) {
        throw new Error("El servidor de consulta devolvió una respuesta incompleta o inválida.");
    }
    return cita;
}

/** Busca una cita por su código, usando la demo local o la API configurada. */
export async function consultarCitaPorCodigo(codigo) {
    const codigoNormalizado = String(codigo ?? "").trim().toUpperCase();
    if (!/^CP-\d{4}$/.test(codigoNormalizado)) {
        throw new Error("Escribe un código válido con el formato CP-0007.");
    }

    if (!API_BASE) {
        const cita = listarCitas().find(item => item.bookingCode?.toUpperCase() === codigoNormalizado);
        return cita ? mapearCitaLocal(cita) : null;
    }

    let respuesta;
    try {
        respuesta = await fetch(`${API_BASE}/api/appointments/by-code/${encodeURIComponent(codigoNormalizado)}`, {
            headers: { Accept: "application/json" }
        });
    } catch {
        throw new Error("No fue posible conectar con el servidor de consulta. Inténtalo de nuevo más tarde.");
    }

    if (!(respuesta.headers.get("content-type") ?? "").includes("application/json")) {
        throw new Error("El servidor de consulta no está disponible o no respondió correctamente.");
    }
    if (respuesta.status === 404) return null;

    let contenido;
    try {
        contenido = await respuesta.json();
    } catch {
        throw new Error("El servidor de consulta devolvió una respuesta inválida.");
    }
    if (!respuesta.ok) {
        throw new Error(contenido.error || "No fue posible consultar el estado de la cita.");
    }

    return validarRespuesta(contenido, codigoNormalizado);
}
